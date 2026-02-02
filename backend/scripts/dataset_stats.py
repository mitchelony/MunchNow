import argparse
import math
from collections import defaultdict
from datetime import datetime, timedelta, timezone

from dotenv import load_dotenv

from app.db.client import get_supabase
from app.services.ranking import rank_places


CATEGORY_KEYS = {
    "quick_bites": "quick_bites",
    "cheap": "cheap",
    "late_night": "late_night",
    "coffee_spots": "coffee_spots",
    "local_favorite": "local_favorite",
}


def normalize_category(value: str) -> str | None:
    if not value:
        return None
    key = value.strip().lower().replace("-", "_").replace(" ", "_")
    if key in CATEGORY_KEYS:
        return CATEGORY_KEYS[key]
    if key in {"late_night", "latenight"}:
        return "late_night"
    if key in {"coffee", "coffee_spots", "coffee_spot"}:
        return "coffee_spots"
    if key in {"local_favorites", "local_favorite"}:
        return "local_favorite"
    if key in {"quick_bite", "quick_bites"}:
        return "quick_bites"
    if key in {"cheap_eats", "cheap"}:
        return "cheap"
    return None


def get_place_categories(place: dict) -> list[str]:
    categories = []
    if isinstance(place.get("category"), list):
        categories.extend(place.get("category"))
    if isinstance(place.get("categories"), list):
        categories.extend(place.get("categories"))
    if isinstance(place.get("category"), str):
        categories.append(place.get("category"))
    if isinstance(place.get("categories"), str):
        categories.append(place.get("categories"))
    normalized = []
    for value in categories:
        norm = normalize_category(value)
        if norm:
            normalized.append(norm)
    return list(dict.fromkeys(normalized))


def fetch_all(table: str, page_size: int = 1000, **filters) -> list[dict]:
    supabase = get_supabase()
    results: list[dict] = []
    start = 0
    while True:
        query = supabase.table(table).select("*").range(start, start + page_size - 1)
        for key, value in filters.items():
            if key == "gte":
                for field, v in value.items():
                    query = query.gte(field, v)
            elif key == "lte":
                for field, v in value.items():
                    query = query.lte(field, v)
        response = query.execute()
        data = response.data or []
        results.extend(data)
        if len(data) < page_size:
            break
        start += page_size
    return results


def haversine_miles(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 3958.8
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return 2 * r * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def gini(values: list[int]) -> float:
    if not values:
        return 0.0
    sorted_vals = sorted(values)
    n = len(sorted_vals)
    total = sum(sorted_vals)
    if total == 0:
        return 0.0
    cumulative = 0
    for i, v in enumerate(sorted_vals, start=1):
        cumulative += i * v
    return (2 * cumulative) / (n * total) - (n + 1) / n


def main() -> None:
    load_dotenv()
    parser = argparse.ArgumentParser(description="Dataset shape/quality stats.")
    parser.add_argument("--radius-miles", type=float, default=5.0)
    parser.add_argument("--aamu-lat", type=float, default=34.7826)
    parser.add_argument("--aamu-lon", type=float, default=-86.5687)
    parser.add_argument("--vote-window-days", type=int, default=30)
    parser.add_argument("--rank-limit", type=int, default=12)
    args = parser.parse_args()

    places = fetch_all("places")
    total_places = len(places)

    category_counts = defaultdict(int)
    place_category = {}
    address_count = 0
    category_tag_count = 0
    price_tier_count = 0
    with_geo = 0
    within_radius = 0

    for place in places:
        address = place.get("address")
        if address:
            address_count += 1

        cats = get_place_categories(place)
        if cats:
            category_tag_count += 1
            for cat in cats:
                category_counts[cat] += 1
        place_category[place.get("id")] = cats[0] if cats else None

        if place.get("price_tier") is not None:
            price_tier_count += 1

        lat = place.get("latitude") or place.get("lat")
        lon = place.get("longitude") or place.get("lng") or place.get("lon")
        if isinstance(lat, (int, float)) and isinstance(lon, (int, float)):
            with_geo += 1
            if (
                haversine_miles(args.aamu_lat, args.aamu_lon, float(lat), float(lon))
                <= args.radius_miles
            ):
                within_radius += 1

    now = datetime.now(timezone.utc)
    range_start = now - timedelta(days=args.vote_window_days)
    votes = fetch_all(
        "votes",
        gte={"created_at": range_start.isoformat()},
        lte={"created_at": now.isoformat()},
    )

    votes_by_place = defaultdict(int)
    votes_by_category = defaultdict(int)
    for vote in votes:
        place_id = vote.get("place_id")
        if place_id is None:
            continue
        votes_by_place[place_id] += 1
        cat = place_category.get(place_id)
        if cat:
            votes_by_category[cat] += 1

    vote_counts = list(votes_by_place.values())
    total_votes = sum(vote_counts)
    top10 = sorted(vote_counts, reverse=True)[:10]
    top10_share = (sum(top10) / total_votes * 100) if total_votes else 0.0
    avg_votes = (total_votes / len(votes_by_place)) if votes_by_place else 0.0

    places_with_votes = sum(1 for place_id in place_category if votes_by_place.get(place_id, 0) > 0)
    places_without_votes = total_places - places_with_votes

    cold_rank = rank_places(places, {}, args.rank_limit)
    warm_rank = rank_places(
        places,
        {
            pid: {"worth_it": 0, "mid": 0, "skip": 0, "total": count}
            for pid, count in votes_by_place.items()
        },
        args.rank_limit,
    )
    cold_ids = [p["id"] for p in cold_rank]
    warm_ids = [p["id"] for p in warm_rank]
    overlap = len(set(cold_ids) & set(warm_ids))
    warm_zero_votes = sum(1 for pid in warm_ids if votes_by_place.get(pid, 0) == 0)

    print("DATASET")
    print(f"total_places={total_places}")
    print("category_distribution:")
    for key in CATEGORY_KEYS:
        print(f"  {key}={category_counts.get(key, 0)}")
    print(f"address_pct={(address_count/total_places*100) if total_places else 0:.2f}")
    print(f"category_tags_pct={(category_tag_count/total_places*100) if total_places else 0:.2f}")
    print(f"price_tier_pct={(price_tier_count/total_places*100) if total_places else 0:.2f}")
    if with_geo:
        print(f"geo_coverage_pct={(with_geo/total_places*100) if total_places else 0:.2f}")
        print(
            f"within_{args.radius_miles:.0f}_miles_of_aamu_pct={(within_radius/with_geo*100) if with_geo else 0:.2f}"
        )
    else:
        print("geo_coverage_pct=0.00")
        print(f"within_{args.radius_miles:.0f}_miles_of_aamu_pct=0.00")

    print("\nVOTES (window)")
    print(f"window_days={args.vote_window_days}")
    print(f"total_votes={total_votes}")
    print(f"votes_per_place_min={(min(vote_counts) if vote_counts else 0)}")
    print(f"votes_per_place_avg={avg_votes:.2f}")
    print(f"votes_per_place_max={(max(vote_counts) if vote_counts else 0)}")
    print(f"votes_gini={gini(vote_counts):.3f}")
    print(f"top10_share_pct={top10_share:.2f}")
    print(f"places_with_votes={places_with_votes}")
    print(f"places_without_votes={places_without_votes}")
    print("avg_votes_per_category:")
    for key in CATEGORY_KEYS:
        places_in_cat = category_counts.get(key, 0)
        votes_in_cat = votes_by_category.get(key, 0)
        avg_cat = (votes_in_cat / places_in_cat) if places_in_cat else 0.0
        print(f"  {key}={avg_cat:.2f}")

    print("\nRANKING")
    print(f"rank_limit={args.rank_limit}")
    print(f"cold_vs_warm_overlap={overlap}")
    print(f"warm_top_with_zero_votes={warm_zero_votes}")


if __name__ == "__main__":
    main()
