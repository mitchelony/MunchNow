import argparse
import random
import time
from datetime import datetime, timedelta, timezone

from dotenv import load_dotenv

from app.db.client import get_supabase
from app.db.queries import fetch_places, fetch_vote_counts_grouped
from app.services.ranking import rank_places, parse_time_window


def percentile(values: list[float], p: float) -> float:
    if not values:
        return 0.0
    if p <= 0:
        return min(values)
    if p >= 100:
        return max(values)
    values_sorted = sorted(values)
    k = (len(values_sorted) - 1) * (p / 100)
    f = int(k)
    c = min(f + 1, len(values_sorted) - 1)
    if f == c:
        return values_sorted[f]
    d0 = values_sorted[f] * (c - k)
    d1 = values_sorted[c] * (k - f)
    return d0 + d1


def seed_votes(place_ids: list[int], total_votes: int, days_back: int, batch_size: int) -> int:
    supabase = get_supabase()
    votes = []
    now = datetime.now(timezone.utc)
    vote_types = ["worth_it", "mid", "skip"]

    for _ in range(total_votes):
        place_id = random.choice(place_ids)
        vote = random.choice(vote_types)
        created_at = now - timedelta(days=random.randint(0, days_back))
        votes.append(
            {
                "place_id": place_id,
                "vote": vote,
                "created_at": created_at.isoformat(),
            }
        )

    inserted = 0
    for i in range(0, len(votes), batch_size):
        batch = votes[i : i + batch_size]
        supabase.table("votes").insert(batch).execute()
        inserted += len(batch)

    return inserted


def measure_ranking(iterations: int, time_window: str, limit: int) -> dict:
    durations = []
    window = parse_time_window(time_window)
    range_end = datetime.now(timezone.utc)
    range_start = range_end - window
    places = fetch_places(limit=limit)
    place_ids = [place["id"] for place in places]

    for _ in range(iterations):
        start = time.perf_counter()
        vote_counts = fetch_vote_counts_grouped(range_start, range_end, place_ids)
        rank_places(places, vote_counts, limit)
        durations.append((time.perf_counter() - start) * 1000)

    return {
        "count": len(durations),
        "avg_ms": sum(durations) / len(durations) if durations else 0.0,
        "p95_ms": percentile(durations, 95),
        "min_ms": min(durations) if durations else 0.0,
        "max_ms": max(durations) if durations else 0.0,
    }


def main() -> None:
    load_dotenv()
    parser = argparse.ArgumentParser(description="Seed synthetic votes and measure ranking timing.")
    parser.add_argument("--votes", type=int, default=1000)
    parser.add_argument("--days-back", type=int, default=30)
    parser.add_argument("--batch-size", type=int, default=500)
    parser.add_argument("--rank-iterations", type=int, default=30)
    parser.add_argument("--rank-limit", type=int, default=12)
    parser.add_argument("--time-window", type=str, default="7d")
    args = parser.parse_args()

    places = fetch_places(limit=25)
    place_ids = [place["id"] for place in places]
    if not place_ids:
        raise SystemExit("No places found to seed votes against.")

    inserted = seed_votes(place_ids, args.votes, args.days_back, args.batch_size)
    print(f"Seeded votes: {inserted}")

    stats = measure_ranking(args.rank_iterations, args.time_window, args.rank_limit)
    print(
        "Ranking timing (ms): "
        f"avg={stats['avg_ms']:.2f} p95={stats['p95_ms']:.2f} "
        f"min={stats['min_ms']:.2f} max={stats['max_ms']:.2f}"
    )


if __name__ == "__main__":
    main()
