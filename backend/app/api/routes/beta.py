from fastapi import APIRouter

from app.db.queries import upsert_beta_tester
from app.models.schemas import BetaTesterIn, BetaTesterOut

router = APIRouter()


@router.post("/beta/testers", response_model=BetaTesterOut)
async def create_or_update_beta_tester(payload: BetaTesterIn):
    row = upsert_beta_tester(
        name=payload.name,
        email=payload.email,
        source=payload.source or "beta_onboarding",
    )
    return BetaTesterOut(
        ok=True,
        id=row["id"],
        name=row["name"],
        email=row["email"],
        source=row.get("source") or "beta_onboarding",
    )
