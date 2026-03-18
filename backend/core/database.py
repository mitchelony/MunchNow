import logging
import os
from datetime import UTC, datetime, timedelta

from app.db.client import get_supabase

logger = logging.getLogger(__name__)

try:
    from postgrest.exceptions import APIError
except Exception:  # pragma: no cover - local fallback when deps are absent
    APIError = Exception


def has_supabase_database_config() -> bool:
    return bool(os.getenv("SUPABASE_URL")) and bool(
        os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    )


def _parse_created_at(value: str | None) -> datetime | None:
    if not value:
        return None
    normalized = value.replace("Z", "+00:00")
    try:
        return datetime.fromisoformat(normalized)
    except ValueError:
        logger.warning("Unable to parse created_at value: %s", value)
        return None


def create_email_log_table() -> None:
    try:
        supabase = get_supabase()
        supabase.table("beta_email_log").select("id").limit(1).execute()
    except Exception:
        logger.exception("Failed to access beta_email_log via Supabase")
        raise


def fetch_testers_missing_email(email_type: str) -> list[dict]:
    try:
        supabase = get_supabase()
        testers_response = (
            supabase.table("beta_testers")
            .select("id, name, email, source, created_at")
            .order("created_at")
            .order("id")
            .execute()
        )
        email_log_response = (
            supabase.table("beta_email_log")
            .select("tester_id")
            .eq("email_type", email_type)
            .execute()
        )
        sent_tester_ids = {
            row["tester_id"]
            for row in (email_log_response.data or [])
            if row.get("tester_id") is not None
        }
        testers = testers_response.data or []
        return [
            tester for tester in testers if tester.get("id") not in sent_tester_ids
        ]
    except Exception:
        logger.exception(
            "Failed to fetch testers missing email_type=%s",
            email_type,
        )
        raise


def fetch_testers_due_for_interval(email_type: str, days: int) -> list[dict]:
    try:
        cutoff = datetime.now(UTC) - timedelta(days=days)
        testers = fetch_testers_missing_email(email_type)
        due_testers = []
        for tester in testers:
            created_at = _parse_created_at(tester.get("created_at"))
            if created_at is not None and created_at <= cutoff:
                due_testers.append(tester)
        return due_testers
    except Exception:
        logger.exception(
            "Failed to fetch testers due for email_type=%s days=%s",
            email_type,
            days,
        )
        raise


def mark_email_sent(tester_id: int, email: str, email_type: str) -> None:
    payload = {
        "tester_id": tester_id,
        "email": email,
        "email_type": email_type,
    }
    try:
        supabase = get_supabase()
        supabase.table("beta_email_log").insert(payload).execute()
    except APIError as exc:
        message = str(exc).lower()
        if "duplicate key" in message or "23505" in message:
            logger.info(
                "Email log already exists for tester_id=%s email_type=%s",
                tester_id,
                email_type,
            )
            return
        logger.exception(
            "Failed to mark email as sent for tester_id=%s email_type=%s",
            tester_id,
            email_type,
        )
        raise
    except Exception:
        logger.exception(
            "Failed to mark email as sent for tester_id=%s email_type=%s",
            tester_id,
            email_type,
        )
        raise
