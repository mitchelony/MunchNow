import logging
import os

import resend

logger = logging.getLogger(__name__)


def send_email(to: str, subject: str, html: str) -> bool:
    api_key = os.getenv("RESEND_API_KEY")
    from_email = os.getenv("FROM_EMAIL")

    if not api_key:
        logger.error("RESEND_API_KEY is not set")
        return False

    if not from_email:
        logger.error("FROM_EMAIL is not set")
        return False

    resend.api_key = api_key
    params = {
        "from": f"MunchNow <{from_email}>",
        "to": [to],
        "subject": subject,
        "html": html,
    }

    try:
        resend.Emails.send(params)
        return True
    except Exception:
        logger.exception("Failed to send email to %s", to)
        return False

