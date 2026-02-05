import argparse
import csv
import json
import os
import re
import time
import urllib.parse
import urllib.request
from urllib.error import HTTPError, URLError

try:
    from dotenv import load_dotenv
except ImportError:  # pragma: no cover
    def load_dotenv() -> None:
        env_path = os.path.join(os.getcwd(), ".env")
        if not os.path.exists(env_path):
            return
        with open(env_path, "r", encoding="utf-8") as handle:
            for line in handle:
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                key, value = line.split("=", 1)
                if key and key not in os.environ:
                    os.environ[key] = value.strip().strip('"').strip("'")

from app.db.client import get_supabase


YELP_BASE = "https://api.yelp.com/v3"


def yelp_request(path: str, params: dict | None = None, retries: int = 3) -> dict:
    api_key = os.getenv("YELP_API_KEY")
    if not api_key:
        raise SystemExit("YELP_API_KEY is not set")

    url = f"{YELP_BASE}{path}"
    if params:
        url = f"{url}?{urllib.parse.urlencode(params)}"
    req = urllib.request.Request(url)
    req.add_header("Authorization", f"Bearer {api_key}")
    req.add_header("Accept", "application/json")

    for attempt in range(retries + 1):
        try:
            with urllib.request.urlopen(req) as resp:
                payload = resp.read().decode("utf-8")
                return json.loads(payload)
        except HTTPError as exc:
            if exc.code in {429, 500, 502, 503, 504} and attempt < retries:
                time.sleep(0.5 * (2 ** attempt))
                continue
            raise
        except URLError:
            if attempt < retries:
                time.sleep(0.5 * (2 ** attempt))
                continue
            raise


def normalize_text(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", value.lower()).strip()


def score_candidate(
    name: str,
    address: str,
    candidate: dict,
    max_distance_m: float | None,
) -> float:
    score = 0.0
    candidate_name = normalize_text(candidate.get("name") or "")
    target_name = normalize_text(name)
    if candidate_name and target_name:
        if candidate_name == target_name:
            score += 3.0
        elif target_name in candidate_name or candidate_name in target_name:
            score += 2.0
        else:
            score += 1.0

    if address:
        candidate_address = normalize_text(
            " ".join(candidate.get("location", {}).get("display_address", []) or [])
        )
        target_address = normalize_text(address)
        if candidate_address and target_address:
            if target_address in candidate_address or candidate_address in target_address:
                score += 2.0
            else:
                score += 0.5

    distance = candidate.get("distance")
    if isinstance(distance, (int, float)) and max_distance_m:
        closeness = max(0.0, 1.0 - (distance / max_distance_m))
        score += closeness

    return score


def search_business(
    name: str,
    address: str,
    city: str,
    state: str | None,
    latitude: float | None,
    longitude: float | None,
) -> dict | None:
    location = ", ".join([part for part in [city, state] if part])
    term_parts = [name]
    if address:
        term_parts.append(address)
    params: dict[str, str | int | float] = {
        "term": " ".join(term_parts).strip(),
        "location": location,
        "limit": 5,
    }
    max_distance_m = None
    if latitude is not None and longitude is not None:
        params["latitude"] = latitude
        params["longitude"] = longitude
        params["radius"] = 2000
        max_distance_m = 2000

    data = yelp_request("/businesses/search", params=params)
    businesses = data.get("businesses") or []
    if not businesses:
        return None

    scored = [
        (score_candidate(name, address, candidate, max_distance_m), candidate)
        for candidate in businesses
    ]
    scored.sort(key=lambda item: item[0], reverse=True)
    return scored[0][1]


def fetch_business_image(business_id: str) -> str | None:
    data = yelp_request(f"/businesses/{business_id}")
    return data.get("image_url")


def fetch_places(limit: int, only_missing: bool) -> list[dict]:
    supabase = get_supabase()
    query = supabase.table("places").select(
        "id,name,address,city,lat,lng,image_url,image_source"
    )
    if only_missing:
        query = query.is_("image_url", "null")
    response = query.limit(limit).execute()
    return response.data or []


def main() -> None:
    load_dotenv()
    supabase_url = os.getenv("SUPABASE_URL", "")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    yelp_key = os.getenv("YELP_API_KEY", "")
    print(
        "[debug] env SUPABASE_URL set:",
        bool(supabase_url),
        "value:",
        supabase_url[:12] + "..." if supabase_url else "<empty>",
    )
    print(
        "[debug] env SUPABASE_SERVICE_ROLE_KEY set:",
        bool(supabase_key),
    )
    print(
        "[debug] env YELP_API_KEY set:",
        bool(yelp_key),
    )
    parser = argparse.ArgumentParser(description="Enrich places with Yelp image_url")
    parser.add_argument("--limit", type=int, default=500)
    parser.add_argument("--sleep", type=float, default=0.2)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--include-existing", action="store_true")
    parser.add_argument("--city", type=str, default="Huntsville")
    parser.add_argument("--state", type=str, default="AL")
    parser.add_argument("--output-csv", type=str, default="")
    args = parser.parse_args()

    only_missing = not args.include_existing
    places = fetch_places(args.limit, only_missing)
    if not places:
        print("No places found to process.")
        return

    updated = 0
    skipped = 0
    failed = 0

    supabase = get_supabase()
    csv_writer = None
    csv_file = None
    if args.output_csv:
        csv_file = open(args.output_csv, "w", newline="", encoding="utf-8")
        csv_writer = csv.DictWriter(
            csv_file, fieldnames=["place_id", "image_url", "image_source"]
        )
        csv_writer.writeheader()

    for place in places:
        place_id = place["id"]
        name = place.get("name") or ""
        address = place.get("address") or ""
        city = place.get("city") or args.city
        state = args.state
        latitude = place.get("lat")
        longitude = place.get("lng")

        if not name:
            skipped += 1
            continue

        try:
            business = search_business(
                name=name,
                address=address,
                city=city,
                state=state,
                latitude=latitude,
                longitude=longitude,
            )
            if not business:
                skipped += 1
                continue
            business_id = business.get("id")
            if not business_id:
                skipped += 1
                continue
            image_url = fetch_business_image(business_id)
            if not image_url:
                skipped += 1
                continue

            if args.dry_run:
                print(f"[dry-run] {place_id} -> {image_url}")
            else:
                if place.get("image_url") != image_url or place.get("image_source") != "yelp":
                    supabase.table("places").update(
                        {"image_url": image_url, "image_source": "yelp"}
                    ).eq("id", place_id).execute()
            if csv_writer:
                csv_writer.writerow(
                    {
                        "place_id": place_id,
                        "image_url": image_url,
                        "image_source": "yelp",
                    }
                )
            updated += 1
        except Exception as exc:
            failed += 1
            print(f"[error] place_id={place_id}: {exc}")

        time.sleep(args.sleep)

    if csv_file:
        csv_file.close()

    print(
        f"Done. total={len(places)} updated={updated} skipped={skipped} failed={failed}"
    )


if __name__ == "__main__":
    main()
