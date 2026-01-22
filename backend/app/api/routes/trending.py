from fastapi import APIRouter, Query, HTTPException
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from app.db.queries import fetch_places, fetch_vote_counts_grouped

router = APIRouter()

@router.get("/trending")
async def get_trending(
    city: str = Query(default="Huntsville", description="City to filter places"),
    category: str = Query(default=None, description="Category to filter places"),
    time_window: str = Query(default="7d", description="Time window: 24h, 7d, 30d"),
    limit: int = Query(default=12, ge=1, le=100, description="Maximum number of results")
):
    """Get trending places based on vote scores within a time window"""
    
    # Validate and parse time window
    time_windows = {
        "24h": 1,
        "7d": 7,
        "30d": 30
    }
    
    if time_window not in time_windows:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid time_window. Must be one of: {', '.join(time_windows.keys())}"
        )
    
    days = time_windows[time_window]
    
    # Calculate time range
    timezone = ZoneInfo('UTC')
    range_end = datetime.now(timezone)
    range_start = range_end - timedelta(days=days)
    
    # Call query function to get places
    places = fetch_places(category=category, city=city, limit=1000)
    
    if not places:
        return {
            "places": [],
            "time_window": time_window,
            "city": city,
            "category": category
        }
    
    # Get all place IDs
    place_ids = [place["id"] for place in places]
    
    # Call query function to get aggregated vote counts
    vote_counts = fetch_vote_counts_grouped(
        range_start=range_start,
        range_end=range_end,
        place_ids=place_ids
    )
    
    # Calculate scores for each place
    trending_places = []
    for place in places:
        place_id = place["id"]
        votes = vote_counts.get(place_id, {"worth_it": 0, "mid": 0, "skip": 0, "total": 0})
        
        # Calculate score: likes - dislikes
        score = (2*votes["worth_it"]) - votes["skip"] + votes["mid"]
        
        trending_places.append({
            **place,
            "score": score,
            "worth_it_count": votes["worth_it"],
            "mid_count": votes["mid"],
            "skip_count": votes["skip"],
            "total_votes": votes["total"]
        })
    
    # Sort by score (desc), then total votes (desc), then name (asc)
    trending_places.sort(key=lambda x: (-x["score"], -x["total_votes"], x["name"]))
    
    # Apply limit
    trending_places = trending_places[:limit]
    
    return {
        "places": trending_places,
        "time_window": time_window,
        "city": city,
        "category": category,
        "count": len(trending_places)
    }