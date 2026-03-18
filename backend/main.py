from dotenv import load_dotenv  # type: ignore

# Load environment variables early, before importing any modules that depend on them.
load_dotenv()
load_dotenv(".env.local", override=True)

import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException #type: ignore
from fastapi.middleware.cors import CORSMiddleware #type: ignore

from app.api.routes import trending, health, votes, places, campuses, beta
from beta.mailer import is_mailer_configured
from beta.scheduler import (
    dispatch_interval_emails,
    poll_and_send_acceptance_emails,
    start_scheduler,
)
from core.database import create_email_log_table, has_database_url

logger = logging.getLogger(__name__)


def _beta_email_system_enabled() -> bool:
    return has_database_url() and is_mailer_configured()


@asynccontextmanager
async def lifespan(app: FastAPI):
    scheduler = None
    app.state.beta_email_enabled = False
    missing = [
        name for name in ("DATABASE_URL", "RESEND_API_KEY", "FROM_EMAIL")
        if not os.getenv(name)
    ]
    if missing:
        logger.warning(
            "Beta email automation disabled; missing env vars: %s",
            ", ".join(missing),
        )
    else:
        try:
            create_email_log_table()
            scheduler = start_scheduler()
            app.state.beta_scheduler = scheduler
            app.state.beta_email_enabled = True
        except Exception:
            logger.exception(
                "Beta email automation disabled due to startup failure"
            )
    try:
        yield
    finally:
        if scheduler is not None:
            scheduler.shutdown(wait=False)
            logger.info("Stopped beta email scheduler")


app = FastAPI(lifespan=lifespan)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://munchnow.vercel.app",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "http://10.0.2.2:3000",
    ],
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(trending.router)
app.include_router(health.router)
app.include_router(votes.router)
app.include_router(places.router)
app.include_router(campuses.router)
app.include_router(beta.router)


@app.post("/admin/trigger/acceptance")
async def trigger_acceptance_emails():
    if not _beta_email_system_enabled():
        raise HTTPException(
            status_code=503,
            detail="Beta email automation is not configured",
        )
    poll_and_send_acceptance_emails()
    return {"ok": True, "message": "Acceptance email dispatch completed"}


@app.post("/admin/trigger/intervals")
async def trigger_interval_emails():
    if not _beta_email_system_enabled():
        raise HTTPException(
            status_code=503,
            detail="Beta email automation is not configured",
        )
    dispatch_interval_emails()
    return {"ok": True, "message": "Interval email dispatch completed"}
