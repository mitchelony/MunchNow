from fastapi import APIRouter, HTTPException, Query, Path
from datetime import datetime, timedelta
from typing import Optional
from zoneinfo import ZoneInfo
from app.db.queries import place_vote, fetch_votes_for_place, fetch_vote_count, fetch_vote_counts_grouped
from app.services.ranking import parse_time_window
from app.models.schemas import VoteIn, VoteOut

router = APIRouter()

@router.post("/votes", response_model=VoteOut)
async def create_vote(vote_data: VoteIn):
    """Create a new vote for a place. FastAPI automatically validates vote values."""
    
    # Call query function with validated data
    result = place_vote(vote_data.place_id, vote_data.vote.value)
    
    # Check for errors
    if isinstance(result, dict) and "error" in result:
        raise HTTPException(
            status_code=404,
            detail="Place not found or error while creating vote"
        )
    
    range_end = datetime.now(ZoneInfo('UTC'))
    range_start = range_end - parse_time_window("7d")
    vote_counts = fetch_vote_counts_grouped(
        range_start=range_start,
        range_end=range_end,
        place_ids=[vote_data.place_id]
    )
    counts = vote_counts.get(
        vote_data.place_id,
        {"worth_it": 0, "mid": 0, "skip": 0, "total": 0}
    )

    return VoteOut(
        ok=True,
        place_id=vote_data.place_id,
        vote=vote_data.vote,
        created_at=range_end.isoformat(),
        worth_it_count=counts["worth_it"],
        mid_count=counts["mid"],
        skip_count=counts["skip"],
        total_votes=counts["total"]
    )


@router.get("/votes/place/{place_id}")
async def get_votes_for_place(
    place_id: int = Path(..., description="ID of the place to fetch votes for", gt=0),
    range_start: Optional[str] = Query(None, description="Start datetime in ISO format (YYYY-MM-DDTHH:MM:SS)"),
    range_end: Optional[str] = Query(None, description="End datetime in ISO format (YYYY-MM-DDTHH:MM:SS)")
):
    """Fetch all votes for a specific place within a time range"""
    # Parse datetime strings if provided
    try:
        if range_start:
            start_dt = datetime.fromisoformat(range_start)
        if range_end:
            end_dt = datetime.fromisoformat(range_end)
    except ValueError:
        raise HTTPException(
            status_code=400, 
            detail="Invalid datetime format. Use ISO format (YYYY-MM-DDTHH:MM:SS)"
        )
    
    # If no range provided, use default range (last 30 days)
    if not range_start or not range_end:
        target_timezone = ZoneInfo('UTC')
        end_dt = datetime.now(target_timezone)
        start_dt = end_dt - timedelta(days=30)
    
    # Call query function
    votes = await fetch_votes_for_place(place_id, start_dt, end_dt) #type: ignore
    
    return {
        "place_id": place_id,
        "range_start": start_dt.isoformat(),#type: ignore
        "range_end": end_dt.isoformat(),#type: ignore
        "votes": votes,
        "count": len(votes)
    }


@router.get("/votes/count/{place_id}")
async def get_vote_count(
    place_id: int = Path(..., description="ID of the place to get vote count for", gt=0)
):
    """Get total vote count for a specific place"""
    # Call query function
    count = fetch_vote_count(place_id)
    
    return {
        "place_id": place_id,
        "vote_count": count
    }
