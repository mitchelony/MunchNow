from fastapi import APIRouter, HTTPException, Query, Request

from beta.scheduler import (
    dispatch_interval_emails,
    force_send_email_to_all_testers,
    poll_and_send_acceptance_emails,
    send_email_to_tester,
)

router = APIRouter()


def _ensure_beta_email_enabled(request: Request) -> None:
    if not getattr(request.app.state, "beta_email_enabled", False):
        raise HTTPException(
            status_code=503,
            detail="Beta email automation is not configured",
        )


@router.post("/admin/trigger/acceptance")
async def trigger_acceptance_emails(request: Request):
    _ensure_beta_email_enabled(request)
    poll_and_send_acceptance_emails()
    return {"ok": True, "message": "Acceptance email dispatch completed"}


@router.post("/admin/trigger/intervals")
async def trigger_interval_emails(request: Request):
    _ensure_beta_email_enabled(request)
    dispatch_interval_emails()
    return {"ok": True, "message": "Interval email dispatch completed"}


@router.post("/admin/trigger/tester/{tester_id}")
async def trigger_tester_email(
    request: Request,
    tester_id: int,
    email_type: str = Query("acceptance"),
    force: bool = Query(False),
):
    _ensure_beta_email_enabled(request)
    try:
        result = send_email_to_tester(
            tester_id=tester_id,
            email_type=email_type,
            force=force,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    if not result.get("ok") and result.get("message") == "Tester not found":
        raise HTTPException(status_code=404, detail="Tester not found")

    if not result.get("ok"):
        raise HTTPException(status_code=500, detail="Email send failed")

    return result


@router.post("/admin/trigger/testers/force")
async def trigger_force_send_to_all_testers(
    request: Request,
    email_type: str = Query("acceptance"),
):
    _ensure_beta_email_enabled(request)
    try:
        result = force_send_email_to_all_testers(email_type=email_type)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return result
