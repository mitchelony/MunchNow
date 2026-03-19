import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI

from beta.mailer import is_mailer_configured
from beta.scheduler import start_scheduler
from core.database import create_email_log_table, has_supabase_database_config

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    scheduler = None
    app.state.beta_email_enabled = False
    missing = [
        name
        for name in (
            "SUPABASE_URL",
            "SUPABASE_SERVICE_ROLE_KEY",
            "RESEND_API_KEY",
            "FROM_EMAIL",
        )
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
