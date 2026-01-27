from fastapi import APIRouter, Query, Path
from app.db.queries import fetch_places, fetch_places_by_id
from app.models.schemas import PlacesResponse, PlaceResponse, PlaceOut

router = APIRouter()

@router.get("/places", response_model=PlacesResponse)
async def get_places(
    category: str | None = Query(None, description="Filter places by category"),
    limit: int = Query(25, description="Maximum number of places to return", ge=1, le=100),
    city: str = Query("Huntsville", description="City to search for places")
):
    places = fetch_places(category=category, limit=limit, city=city)
    return PlacesResponse(places=[PlaceOut(**place) for place in places])

@router.get("/places/{id}", response_model=PlaceResponse)
async def get_place_by_id(
    id: int = Path(..., description="Unique identifier of the place", ge=1)
):
    place = fetch_places_by_id(id)
    return PlaceResponse(place=PlaceOut(**place))
