import logging

from apscheduler.schedulers.background import BackgroundScheduler

from beta.emails import acceptance_email, feedback_email
from beta.mailer import send_email
from core.database import (
    fetch_testers_due_for_interval,
    fetch_testers_missing_email,
    mark_email_sent,
)

logger = logging.getLogger(__name__)

FEEDBACK_INTERVALS = [("day3", 3), ("day7", 7), ("day30", 30)]


def poll_and_send_acceptance_emails() -> None:
    try:
        testers = fetch_testers_missing_email("acceptance")
    except Exception:
        logger.exception("Acceptance email poll failed before dispatch")
        return

    for tester in testers:
        tester_id = tester["id"]
        email = tester["email"]
        template = acceptance_email(tester.get("name") or "")
        sent = send_email(
            to=email,
            subject=template["subject"],
            html=template["html"],
        )
        if not sent:
            logger.error(
                "Failed to send acceptance email to tester_id=%s email=%s",
                tester_id,
                email,
            )
            continue

        try:
            mark_email_sent(tester_id, email, "acceptance")
            logger.info(
                "Sent acceptance email to tester_id=%s email=%s",
                tester_id,
                email,
            )
        except Exception:
            logger.exception(
                "Acceptance email sent but logging failed for tester_id=%s email=%s",
                tester_id,
                email,
            )


def dispatch_interval_emails() -> None:
    for stage, days in FEEDBACK_INTERVALS:
        try:
            testers = fetch_testers_due_for_interval(stage, days)
        except Exception:
            logger.exception(
                "Interval email query failed for stage=%s days=%s",
                stage,
                days,
            )
            continue

        for tester in testers:
            tester_id = tester["id"]
            email = tester["email"]
            template = feedback_email(tester.get("name") or "", stage)
            sent = send_email(
                to=email,
                subject=template["subject"],
                html=template["html"],
            )
            if not sent:
                logger.error(
                    "Failed to send %s email to tester_id=%s email=%s",
                    stage,
                    tester_id,
                    email,
                )
                continue

            try:
                mark_email_sent(tester_id, email, stage)
                logger.info(
                    "Sent %s email to tester_id=%s email=%s",
                    stage,
                    tester_id,
                    email,
                )
            except Exception:
                logger.exception(
                    "%s email sent but logging failed for tester_id=%s email=%s",
                    stage,
                    tester_id,
                    email,
                )


def start_scheduler() -> BackgroundScheduler:
    scheduler = BackgroundScheduler(timezone="UTC")
    scheduler.add_job(
        poll_and_send_acceptance_emails,
        "interval",
        minutes=5,
        id="beta_acceptance_emails",
        replace_existing=True,
        max_instances=1,
        coalesce=True,
    )
    scheduler.add_job(
        dispatch_interval_emails,
        "interval",
        hours=24,
        id="beta_interval_emails",
        replace_existing=True,
        max_instances=1,
        coalesce=True,
    )
    scheduler.start()
    logger.info("Started beta email scheduler")
    return scheduler
