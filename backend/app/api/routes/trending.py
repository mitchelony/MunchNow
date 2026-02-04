from fastapi import APIRouter, Query, HTTPException
from datetime import datetime
from zoneinfo import ZoneInfo

from app.db.queries import fetch_places, fetch_vote_counts_grouped
from app.services.ranking import parse_time_window, rank_places, distance_score, blended_score
from app.models.schemas import TrendingResponse, TrendingPlaceOut

router = APIRouter()

@router.get("/trending", response_model=TrendingResponse)
async def get_trending(
    campus_id: int | None = Query(None, description="Campus identifier for place lookup"),
    city: str = Query(default="Huntsville", description="City to filter places"),
    category: str = Query(default=None, description="Category to filter places"),
    time_window: str = Query(default="7d", description="Time window: 24h, 7d, 30d"),
    limit: int = Query(default=12, ge=1, le=100, description="Maximum number of results"),
    sort: str = Query(
        default="trending",
        description="Sort mode: trending, best, closest"
    )
):
    """Get trending places based on vote scores within a time window"""
    if campus_id is None:
        raise HTTPException(status_code=400, detail="campus_id is required")
    if sort not in {"trending", "best", "closest"}:
        raise HTTPException(status_code=400, detail="sort must be one of: trending, best, closest")
    
    # Parse time window using ranking service
    delta = parse_time_window(time_window)
    
    # Calculate time range
    timezone = ZoneInfo('UTC')
    range_end = datetime.now(timezone)
    range_start = range_end - delta
    
    # Fetch places from database
    places = fetch_places(campus_id=campus_id, category=category, city=city, limit=1000)
    
    if not places:
        return {
            "places": [],
            "time_window": time_window,
            "city": city,
            "category": category
        }
    
    # Get all place IDs
    place_ids = [place["id"] for place in places]
    
    # Fetch aggregated vote counts
    vote_counts = fetch_vote_counts_grouped(
        range_start=range_start,
        range_end=range_end,
        place_ids=place_ids
    )
    
    # Rank places using ranking service
    trending_places = rank_places(places, vote_counts, None)

    def blended_key(place: dict, w_pop: float, w_dist: float) -> tuple[float, float, int]:
        combined = blended_score(
            popularity_score=place["score"],
            distance_score_value=distance_score(place["distance_miles"]),
            weight_popularity=w_pop,
            weight_distance=w_dist
        )
        place["score"] = combined
        return (-combined, place["distance_miles"], place["id"])

    if sort == "closest":
        trending_places.sort(key=lambda p: blended_key(p, 0.25, 0.75))
    elif sort == "best":
        trending_places.sort(key=lambda p: blended_key(p, 0.65, 0.35))
    else:
        trending_places.sort(key=lambda p: blended_key(p, 0.85, 0.15))
    trending_places = trending_places[:limit]
    
    # Convert to TrendingPlaceOut schema
    trending_places_out = [TrendingPlaceOut(**place) for place in trending_places]
    
    return TrendingResponse(places=trending_places_out)
