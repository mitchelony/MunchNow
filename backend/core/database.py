import logging
import os

import psycopg2
from psycopg2.extras import RealDictCursor

logger = logging.getLogger(__name__)


CREATE_BETA_EMAIL_LOG_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS beta_email_log (
    id          SERIAL PRIMARY KEY,
    tester_id   INTEGER NOT NULL,
    email       TEXT NOT NULL,
    email_type  TEXT NOT NULL,
    sent_at     TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (tester_id, email_type)
);
"""


def has_database_url() -> bool:
    return bool(os.getenv("DATABASE_URL"))


def get_connection():
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        message = "DATABASE_URL is not set"
        logger.error(message)
        raise ValueError(message)

    try:
        return psycopg2.connect(database_url, cursor_factory=RealDictCursor)
    except Exception as exc:
        logger.exception("Failed to connect to PostgreSQL using DATABASE_URL")
        raise RuntimeError("Failed to connect to PostgreSQL") from exc


def create_email_log_table() -> None:
    connection = None
    cursor = None
    try:
        connection = get_connection()
        cursor = connection.cursor()
        cursor.execute(CREATE_BETA_EMAIL_LOG_TABLE_SQL)
        connection.commit()
    except Exception:
        if connection is not None:
            connection.rollback()
        logger.exception("Failed to create beta_email_log table")
        raise
    finally:
        if cursor is not None:
            cursor.close()
        if connection is not None:
            connection.close()


def fetch_testers_missing_email(email_type: str) -> list[dict]:
    connection = None
    cursor = None
    query = """
        SELECT
            bt.id,
            bt.name,
            bt.email,
            bt.source,
            bt.created_at
        FROM beta_testers bt
        LEFT JOIN beta_email_log bel
            ON bel.tester_id = bt.id
           AND bel.email_type = %s
        WHERE bel.id IS NULL
        ORDER BY bt.created_at ASC, bt.id ASC;
    """
    try:
        connection = get_connection()
        cursor = connection.cursor()
        cursor.execute(query, (email_type,))
        rows = cursor.fetchall()
        return [dict(row) for row in rows]
    except Exception:
        logger.exception(
            "Failed to fetch testers missing email_type=%s",
            email_type,
        )
        raise
    finally:
        if cursor is not None:
            cursor.close()
        if connection is not None:
            connection.close()


def fetch_testers_due_for_interval(email_type: str, days: int) -> list[dict]:
    connection = None
    cursor = None
    query = """
        SELECT
            bt.id,
            bt.name,
            bt.email,
            bt.source,
            bt.created_at
        FROM beta_testers bt
        LEFT JOIN beta_email_log bel
            ON bel.tester_id = bt.id
           AND bel.email_type = %s
        WHERE bel.id IS NULL
          AND bt.created_at <= NOW() - (%s * INTERVAL '1 day')
        ORDER BY bt.created_at ASC, bt.id ASC;
    """
    try:
        connection = get_connection()
        cursor = connection.cursor()
        cursor.execute(query, (email_type, days))
        rows = cursor.fetchall()
        return [dict(row) for row in rows]
    except Exception:
        logger.exception(
            "Failed to fetch testers due for email_type=%s days=%s",
            email_type,
            days,
        )
        raise
    finally:
        if cursor is not None:
            cursor.close()
        if connection is not None:
            connection.close()


def mark_email_sent(tester_id: int, email: str, email_type: str) -> None:
    connection = None
    cursor = None
    query = """
        INSERT INTO beta_email_log (tester_id, email, email_type)
        VALUES (%s, %s, %s)
        ON CONFLICT (tester_id, email_type) DO NOTHING;
    """
    try:
        connection = get_connection()
        cursor = connection.cursor()
        cursor.execute(query, (tester_id, email, email_type))
        connection.commit()
    except Exception:
        if connection is not None:
            connection.rollback()
        logger.exception(
            "Failed to mark email as sent for tester_id=%s email_type=%s",
            tester_id,
            email_type,
        )
        raise
    finally:
        if cursor is not None:
            cursor.close()
        if connection is not None:
            connection.close()
