import os
from supabase.client import create_client, Client

url: str = os.environ.get("SUPABASE_URL", "https://dzjxgkzmxpdbqwarqzsa.supabase.co")
key: str = os.environ.get("SUPABASE_KEY", "sb_secret_vZUZZV53VqbWIs_14rBpyw_VtICv7-w")
supabase: Client = create_client(url, key)

def get_by_category(category):
    get_by_category = (
            supabase.table("places")
            .select("*")
            .contains("category", [str(category)])
            .execute()
            )
    return get_by_category

def get_all():
    get_all_places = (
            supabase.table("places")
            .select("*")
            .execute()
            )
    return get_all_places

def place_vote(place_id, vote):
    place_a_vote = (
        supabase.table("votes")
        .insert({"place_id": int(place_id), "vote": str(vote)})
        .execute()
        )
    
    see_votes = (
        supabase.table("votes")
        .select("*", count="exact")
        .execute()
        )
    
    return f"Vote Placed Successfully. No Of Votes is Now: {str(see_votes)[-1]}"