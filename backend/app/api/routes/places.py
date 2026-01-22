from fastapi import APIRouter, Query
from app.db.queries import fetch_places, fetch_places_by_id

router = APIRouter()

@router.get("/places")
async def get_places(
    category: str | None = Query(None, description="Filter places by category"),
    limit: int = Query(25, description="Maximum number of places to return", ge=1, le=100),
    city: str = Query("Huntsville", description="City to search for places")
):
    places = fetch_places(category=category, limit=limit, city=city)
    return places

@router.get("/places/{id}")
async def get_place_by_id(
    id: int = Query(..., description="Unique identifier of the place", ge=1)
):
    places = fetch_places_by_id(id)
    return places
