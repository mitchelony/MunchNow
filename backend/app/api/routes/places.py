from fastapi import APIRouter, Query, Path, HTTPException
from datetime import datetime
from zoneinfo import ZoneInfo

from app.db.queries import (
    fetch_vote_counts_grouped,
    fetch_places,
    fetch_places_by_id
)
from app.services.ranking import (
    parse_time_window,
    compute_score,
    distance_score,
    blended_score
)
from app.models.schemas import PlacesResponse, PlaceResponse, PlaceOut

router = APIRouter()

@router.get("/places", response_model=PlacesResponse)
async def get_places(
    campus_id: int | None = Query(None, description="Campus identifier for place lookup"),
    category: str | None = Query(None, description="Filter places by category"),
    limit: int = Query(25, description="Maximum number of places to return", ge=1, le=100),
    city: str = Query("Huntsville", description="City to search for places"),
    sort: str = Query(
        default="best",
        description="Sort mode: best, closest, trending"
    )
):
    if campus_id is None:
        raise HTTPException(status_code=400, detail="campus_id is required")
    if sort not in {"best", "closest", "trending"}:
        raise HTTPException(status_code=400, detail="sort must be one of: best, closest, trending")
    places = fetch_places(campus_id=campus_id, category=category, limit=1000, city=city)
    if not places:
        return PlacesResponse(places=[])

    timezone = ZoneInfo("UTC")
    range_end = datetime.now(timezone)
    range_start = range_end - parse_time_window("7d")
    place_ids = [place["id"] for place in places]
    vote_counts = fetch_vote_counts_grouped(
        range_start=range_start,
        range_end=range_end,
        place_ids=place_ids
    )

    scores: dict[int, float] = {}
    def popularity_for(place_id: int) -> float:
        if place_id in scores:
            return scores[place_id]
        votes = vote_counts.get(
            place_id,
            {"worth_it": 0, "mid": 0, "skip": 0, "total": 0}
        )
        score = compute_score(
            worth_it=votes["worth_it"],
            mid=votes["mid"],
            skip=votes["skip"]
        )
        scores[place_id] = score
        return scores[place_id]

    def blended_key(place: dict, w_pop: float, w_dist: float) -> tuple[float, float, int]:
        vote_score = popularity_for(place["id"])
        combined = blended_score(
            popularity_score=vote_score,
            distance_score_value=distance_score(place["distance_miles"]),
            weight_popularity=w_pop,
            weight_distance=w_dist
        )
        place["score"] = combined
        return (-combined, place["distance_miles"], place["id"])

    if sort == "trending":
        places.sort(key=lambda p: blended_key(p, 0.85, 0.15))
    elif sort == "best":
        places.sort(key=lambda p: blended_key(p, 0.65, 0.35))
    else:
        places.sort(key=lambda p: blended_key(p, 0.25, 0.75))
    return PlacesResponse(places=[PlaceOut(**place) for place in places[:limit]])

@router.get("/places/{id}", response_model=PlaceResponse)
async def get_place_by_id(
    id: int = Path(..., description="Unique identifier of the place", ge=1),
    campus_id: int | None = Query(None, description="Campus identifier for place lookup")
):
    if campus_id is None:
        raise HTTPException(status_code=400, detail="campus_id is required")
    place = fetch_places_by_id(id, campus_id)
    timezone = ZoneInfo("UTC")
    range_end = datetime.now(timezone)
    range_start = range_end - parse_time_window("7d")
    vote_counts = fetch_vote_counts_grouped(
        range_start=range_start,
        range_end=range_end,
        place_ids=[place["id"]]
    )
    votes = vote_counts.get(place["id"], {"worth_it": 0, "mid": 0, "skip": 0, "total": 0})
    popularity_score = compute_score(
        worth_it=votes["worth_it"],
        mid=votes["mid"],
        skip=votes["skip"]
    )
    place["score"] = blended_score(
        popularity_score=popularity_score,
        distance_score_value=distance_score(place["distance_miles"]),
        weight_popularity=0.65,
        weight_distance=0.35
    )
    return PlaceResponse(place=PlaceOut(**place))
