from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

from fastapi import HTTPException
from app.db.client import get_supabase

def get_current_date_time():
    target_timezone = ZoneInfo('UTC')
    current_dt = datetime.now(target_timezone)
    return current_dt

# Places Queries
def fetch_places(category: str | None = None, limit: int = 25, city: str = "Huntsville"):
    supabase = get_supabase()
    query = (
        supabase.table("places")
        .select("*")
        .limit(limit)
        .eq("city", str(city))
        )
    if category:
        query = query.contains("category", [str(category)])
    
    response = query.execute()
    
    return response.data

# Fetch Places  By Id Query
def fetch_places_by_id (id: int):
    supabase = get_supabase()
    query = (
        supabase.table("places")
        .select("*")
        .eq("id", id))
    
    response = query.execute()
    
    if not response.data:
        raise HTTPException(
            status_code=404,
            detail=f"Place with id {id} not found"
        )

    return response.data[0]

# Votes Queries

# Insert Vote Query
def place_vote(place_id: int, vote: str = "skip"):
    created_at = get_current_date_time()
    
    supabase = get_supabase()
    place_check = (
        supabase.table("places")
        .select("id")
        .eq("id", place_id)
        .execute()
        )
    if not place_check.data:
        return {"error": "Invalid place_id"}
    
    query = (
        supabase.table("votes")
        .insert({"place_id": int(place_id), "vote": str(vote), "created_at": created_at})
    )
    query.execute()
    return "Placed Vote Successfully!"

# Fetch Votes For Place
def fetch_votes_for_place(place_id: int, range_start: datetime, range_end: datetime):
    supabase = get_supabase()
    query = (
        supabase.table("votes")
        .select("*")
        .eq("place_id", place_id)
        .gte("created_at", range_start.isoformat())
        .lte("created_at", range_end.isoformat())
    )
    response = query.execute()
    return response.data

# Fetch Vote Count By Id
def fetch_vote_count(place_id: int):
    supabase = get_supabase()
    see_votes = (
        supabase.table("votes")
        .select("*", count="exact")
        .eq("place_id", place_id)
        .execute()
        )
    return see_votes.count



# Support Functions For trending.py
def fetch_votes_in_window(
    range_start: datetime,
    range_end: datetime,
    place_id: int | None = None
):
    """Fetch all votes within a time window, optionally filtered by place_id."""
    supabase = get_supabase()
    query = (
        supabase.table("votes")
        .select("*")
        .gte("created_at", range_start.isoformat())
        .lte("created_at", range_end.isoformat())
    )
    if place_id is not None:
        query = query.eq("place_id", place_id)
    
    response = query.execute()
    return response.data


def fetch_vote_counts_grouped(
    range_start: datetime,
    range_end: datetime,
    place_ids: list[int] | None = None
):
    """Returns aggregated vote counts by place_id within a time window."""
    supabase = get_supabase()
    query = (
        supabase.table("votes")
        .select("place_id, vote")
        .gte("created_at", range_start.isoformat())
        .lte("created_at", range_end.isoformat())
    )
    if place_ids:
        query = query.in_("place_id", place_ids)
    
    response = query.execute()
    
    # Aggregate counts by place_id
    vote_counts = {}
    for vote in response.data:
        place_id = vote["place_id"]
        if place_id not in vote_counts:
            vote_counts[place_id] = {"worth_it": 0, "mid": 0, "skip": 0, "total": 0}
        vote_type = vote["vote"]
        if vote_type in vote_counts[place_id]:
            vote_counts[place_id][vote_type] += 1
        vote_counts[place_id]["total"] += 1
    
    return vote_counts