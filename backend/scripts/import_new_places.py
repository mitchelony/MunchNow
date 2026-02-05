import argparse
import math
import os
from dataclasses import dataclass
from typing import Iterable

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


@dataclass
class NewPlace:
    name: str
    address: str
    city: str
    lat: float
    lng: float
    price_tier: str
    category: list[str]


def parse_pg_array_literal(value: str) -> list[str]:
    value = (value or "").strip()
    if not (value.startswith("{") and value.endswith("}")):
        raise ValueError(f"Not a Postgres array literal: {value}")
    inner = value[1:-1].strip()
    if not inner:
        return []
    parts: list[str] = []
    cur = ""
    in_quotes = False
    for ch in inner:
        if ch == '"':
            in_quotes = not in_quotes
            continue
        if ch == "," and not in_quotes:
            parts.append(cur.strip())
            cur = ""
        else:
            cur += ch
    parts.append(cur.strip())
    return [p.strip().strip('"').strip() for p in parts if p.strip()]


def split_line(line: str) -> list[str]:
    parts: list[str] = []
    cur = ""
    depth = 0
    for ch in line:
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth = max(0, depth - 1)
        if ch == "," and depth == 0:
            parts.append(cur.strip())
            cur = ""
        else:
            cur += ch
    if cur:
        parts.append(cur.strip())
    return parts


def normalize_price_tier(value: str) -> str:
    value = (value or "").strip()
    if not value:
        return "$"
    if value.isdigit():
        count = max(1, min(4, int(value)))
        return "$" * count
    return value


def parse_lines(text: str, default_city: str = "Huntsville") -> list[NewPlace]:
    places: list[NewPlace] = []
    for raw in text.splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        parts = split_line(line)
        if len(parts) < 8:
            raise ValueError(f"Line has <8 fields: {line}")

        name = parts[0]
        address = parts[1]
        city = parts[2] or default_city
        lat = float(parts[3])
        lng = float(parts[4])
        price_tier = normalize_price_tier(parts[5])
        category = parse_pg_array_literal(parts[6])
        cultural_rep = parse_pg_array_literal(parts[7])
        combined = sorted(set(category + cultural_rep))

        places.append(
            NewPlace(
                name=name,
                address=address,
                city=city,
                lat=lat,
                lng=lng,
                price_tier=price_tier,
                category=combined,
            )
        )
    return places


def haversine_miles(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 3959.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


def get_campuses() -> list[dict]:
    supabase = get_supabase()
    resp = supabase.table("campuses").select("*").execute()
    return resp.data or []


def campus_lat_lng(campus: dict) -> tuple[float, float] | None:
    lat = campus.get("lat") or campus.get("latitude")
    lng = campus.get("lng") or campus.get("longitude")
    if lat is None or lng is None:
        return None
    return float(lat), float(lng)


def find_existing_place_id(name: str, address: str) -> int | None:
    supabase = get_supabase()
    resp = (
        supabase.table("places")
        .select("id")
        .ilike("name", name)
        .ilike("address", address)
        .limit(1)
        .execute()
    )
    rows = resp.data or []
    return rows[0]["id"] if rows else None


def insert_place(p: NewPlace) -> int | None:
    supabase = get_supabase()
    payload = {
        "name": p.name,
        "address": p.address,
        "city": p.city,
        "lat": p.lat,
        "lng": p.lng,
        "price_tier": p.price_tier,
        "category": p.category,
    }
    resp = supabase.table("places").insert(payload).execute()
    data = resp.data or []
    return data[0]["id"] if data else None


def upsert_distances(place_id: int, lat: float, lng: float, campuses: Iterable[dict], dry_run: bool) -> int:
    rows = []
    for campus in campuses:
        coords = campus_lat_lng(campus)
        if not coords:
            continue
        dist = haversine_miles(lat, lng, coords[0], coords[1])
        rows.append({"place_id": place_id, "campus_id": campus["id"], "distance_miles": dist})

    if dry_run:
        return len(rows)

    if rows:
        get_supabase().table("place_distances").upsert(
            rows, on_conflict="place_id,campus_id"
        ).execute()
    return len(rows)


def main() -> None:
    load_dotenv()
    parser = argparse.ArgumentParser(
        description="Insert new places and compute place_distances for AAMU + UAH"
    )
    parser.add_argument("--input", type=str, help="Multiline text of places")
    parser.add_argument("--file", type=str, help="Path to a text file with places block")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    text = args.input
    if args.file:
        with open(args.file, "r", encoding="utf-8") as handle:
            text = handle.read()
    if not text:
        raise SystemExit("Provide --input or --file with the places block.")

    campuses = get_campuses()
    if len(campuses) < 2:
        raise SystemExit("campuses table must be seeded (AAMU + UAH).")

    new_places = parse_lines(text)
    added = 0
    skipped = 0
    dist_rows = 0
    errors = 0

    for place in new_places:
        existing_id = find_existing_place_id(place.name, place.address)
        if existing_id:
            skipped += 1
            continue

        if args.dry_run:
            print(f"[dry-run] would insert: {place.name} @ {place.address}")
            added += 1
            dist_rows += upsert_distances(0, place.lat, place.lng, campuses, dry_run=True)
            continue

        place_id = insert_place(place)
        if not place_id:
            errors += 1
            print(f"[error] failed to insert place: {place.name}")
            continue

        dist_rows += upsert_distances(place_id, place.lat, place.lng, campuses, dry_run=False)
        added += 1

    print(
        "Done. "
        f"places_added={added} "
        f"skipped_existing={skipped} "
        f"distance_rows_inserted={dist_rows} "
        f"errors={errors}"
    )


if __name__ == "__main__":
    main()
