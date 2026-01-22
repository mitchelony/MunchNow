from fastapi import APIRouter, HTTPException, Query, Path
from datetime import datetime, timedelta
from typing import Optional
from zoneinfo import ZoneInfo
from app.db.queries import place_vote, fetch_votes_for_place, fetch_vote_count

router = APIRouter()

@router.post("/votes")
async def create_vote(
    place_id: int = Query(..., description="ID of the place to vote for", gt=0),
    vote: str = Query(default="skip", description="Vote type: worth_it, mid, or skip")
    ):
    
    # Validate vote value
    allowed_votes = ["worth_it", "mid", "skip"]
    if vote not in allowed_votes:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid vote value. Must be one of: {', '.join(allowed_votes)}"
        )
    
    # Call query function
    result = place_vote(place_id, vote)
    
    # Check for errors
    if isinstance(result, dict) and "error" in result:
        raise HTTPException(
            status_code=404,
            detail=f"error while creating vote"
        )
    
    return {
        "message": "Vote placed successfully",
        "place_id": place_id,
        "vote": vote
    }


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