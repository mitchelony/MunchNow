from fastapi import APIRouter

from app.db.queries import fetch_campuses
from app.models.schemas import CampusesResponse, CampusOut

router = APIRouter()


@router.get("/campuses", response_model=CampusesResponse)
async def get_campuses():
    campuses = fetch_campuses()
    return CampusesResponse(campuses=[CampusOut(**campus) for campus in campuses])
