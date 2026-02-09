from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

from fastapi import HTTPException
from app.db.client import get_supabase

def get_current_date_time():
    target_timezone = ZoneInfo('UTC')
    current_dt = datetime.now(target_timezone)
    return current_dt


def fetch_campuses():
    supabase = get_supabase()
    response = supabase.table("campuses").select("*").execute()
    return response.data


def upsert_beta_tester(name: str, email: str, source: str = "beta_onboarding") -> dict:
    supabase = get_supabase()
    payload = {
        "name": name.strip(),
        "email": email.strip().lower(),
        "source": source,
    }
    response = (
        supabase.table("beta_testers")
        .upsert(payload, on_conflict="email")
        .execute()
    )
    rows = response.data or []
    if not rows:
        raise HTTPException(status_code=500, detail="Failed to save beta tester")
    return rows[0]

# Places Queries
def _attach_distance(place: dict) -> dict:
    distances = place.pop("place_distances", None) or []
    if not distances or distances[0].get("distance_miles") is None:
        raise HTTPException(
            status_code=500,
            detail="Missing distance_miles for place/campus"
        )
    distance_miles = distances[0]["distance_miles"]
    place["distance_miles"] = distance_miles
    if "categories" not in place:
        categories = place.get("category") or []
        place["categories"] = categories
    return place


def fetch_places(
    campus_id: int,
    category: str | None = None,
    limit: int = 25,
    city: str = "Huntsville"
):
    supabase = get_supabase()
    query = (
        supabase.table("places")
        .select("*, place_distances!inner(distance_miles)")
        .limit(limit)
        .eq("city", str(city))
        .eq("place_distances.campus_id", campus_id)
        )
    if category:
        query = query.contains("category", [str(category)])
    
    response = query.execute()
    
    return [_attach_distance(place) for place in response.data]

# Fetch Places  By Id Query
def fetch_places_by_id(id: int, campus_id: int):
    supabase = get_supabase()
    query = (
        supabase.table("places")
        .select("*, place_distances!inner(distance_miles)")
        .eq("id", id)
        .eq("place_distances.campus_id", campus_id)
    )
    
    response = query.execute()
    
    if not response.data:
        raise HTTPException(
            status_code=404,
            detail=f"Place with id {id} not found"
        )

    return _attach_distance(response.data[0])

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
        .insert({"place_id": int(place_id), "vote": str(vote), "created_at": created_at.isoformat()})
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
