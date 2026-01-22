import os
from typing import Optional

from supabase.client import Client, create_client  # type: ignore

_supabase_client: Optional[Client] = None


def create_supabase_client() -> Client:

    url = os.getenv("SUPABASE_URL")
    if not url:
        raise ValueError("SUPABASE_URL is not set")

    service_role_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not service_role_key:
        raise ValueError("SUPABASE_SERVICE_ROLE_KEY is not set")

    return create_client(url, service_role_key)


def get_supabase() -> Client:

    global _supabase_client
    if _supabase_client is None:
        _supabase_client = create_supabase_client()
    return _supabase_client


def test_supabase_connection() -> bool:

    try:
        client = get_supabase()
        client.table("places").select("id").limit(1).execute()
        return True
    except Exception:
        # Avoid printing exceptions here; let the caller log if needed.
        return False