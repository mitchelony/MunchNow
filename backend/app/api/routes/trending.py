from fastapi import APIRouter, Query
from datetime import datetime
from zoneinfo import ZoneInfo

from app.db.queries import fetch_places, fetch_vote_counts_grouped
from app.services.ranking import parse_time_window, rank_places
from app.models.schemas import TrendingResponse, TrendingPlaceOut

router = APIRouter()

@router.get("/trending", response_model=TrendingResponse)
async def get_trending(
    city: str = Query(default="Huntsville", description="City to filter places"),
    category: str = Query(default=None, description="Category to filter places"),
    time_window: str = Query(default="7d", description="Time window: 24h, 7d, 30d"),
    limit: int = Query(default=12, ge=1, le=100, description="Maximum number of results")
):
    """Get trending places based on vote scores within a time window"""
    
    # Parse time window using ranking service
    delta = parse_time_window(time_window)
    
    # Calculate time range
    timezone = ZoneInfo('UTC')
    range_end = datetime.now(timezone)
    range_start = range_end - delta
    
    # Fetch places from database
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
    
    # Fetch aggregated vote counts
    vote_counts = fetch_vote_counts_grouped(
        range_start=range_start,
        range_end=range_end,
        place_ids=place_ids
    )
    
    # Rank places using ranking service
    trending_places = rank_places(places, vote_counts, limit)
    
    # Convert to TrendingPlaceOut schema
    trending_places_out = [TrendingPlaceOut(**place) for place in trending_places]
    
    return TrendingResponse(places=trending_places_out)