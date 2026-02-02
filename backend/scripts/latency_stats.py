import argparse
import json
import random
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Any, Dict, List, Tuple
from urllib.request import Request, urlopen


def percentile(values: List[float], p: float) -> float:
    if not values:
        return 0.0
    values_sorted = sorted(values)
    k = (len(values_sorted) - 1) * (p / 100)
    f = int(k)
    c = min(f + 1, len(values_sorted) - 1)
    if f == c:
        return values_sorted[f]
    d0 = values_sorted[f] * (c - k)
    d1 = values_sorted[c] * (k - f)
    return d0 + d1


def fetch_json(url: str) -> Dict[str, Any]:
    with urlopen(url, timeout=10) as resp:
        return json.loads(resp.read().decode("utf-8"))


def do_request(
    method: str,
    url: str,
    body: Dict[str, Any] | None = None,
) -> Tuple[str, float, int, float | None, int | None]:
    payload = None
    headers = {}
    if body is not None:
        payload = json.dumps(body).encode("utf-8")
        headers["Content-Type"] = "application/json"

    req = Request(url, data=payload, method=method, headers=headers)
    start = time.perf_counter()
    with urlopen(req, timeout=10) as resp:
        resp.read()
        duration_ms = (time.perf_counter() - start) * 1000
        server_time = resp.headers.get("X-Response-Time-ms")
        query_count = resp.headers.get("X-Query-Count")
        return (
            url,
            duration_ms,
            resp.status,
            float(server_time) if server_time else None,
            int(query_count) if query_count else None,
        )


def main() -> None:
    parser = argparse.ArgumentParser(description="Basic API latency stats.")
    parser.add_argument("--base-url", type=str, default="http://127.0.0.1:8000")
    parser.add_argument("--requests-per-endpoint", type=int, default=50)
    parser.add_argument("--concurrency", type=int, default=10)
    args = parser.parse_args()

    places = fetch_json(f"{args.base_url}/places?limit=25")
    place_ids = [p["id"] for p in places.get("places", [])]
    if not place_ids:
        raise SystemExit("No places returned from /places.")

    endpoints = []
    for _ in range(args.requests_per_endpoint):
        endpoints.append(("GET", f"{args.base_url}/trending?limit=12&time_window=7d", None))
        endpoints.append(("GET", f"{args.base_url}/places/{random.choice(place_ids)}", None))
        endpoints.append(("POST", f"{args.base_url}/votes", {"place_id": random.choice(place_ids), "vote": "worth_it"}))

    cold_start_start = time.perf_counter()
    _ = fetch_json(f"{args.base_url}/health")
    cold_start_ms = (time.perf_counter() - cold_start_start) * 1000

    results: Dict[str, List[Tuple[float, int, float | None, int | None]]] = {
        "trending": [],
        "place": [],
        "vote": [],
    }
    errors = {"4xx": 0, "5xx": 0}

    start_run = time.perf_counter()
    with ThreadPoolExecutor(max_workers=args.concurrency) as pool:
        futures = [
            pool.submit(do_request, method, url, body) for method, url, body in endpoints
        ]
        for future in as_completed(futures):
            url, duration_ms, status, server_ms, query_count = future.result()
            key = "trending" if "/trending" in url else "vote" if "/votes" in url else "place"
            results[key].append((duration_ms, status, server_ms, query_count))
            if 400 <= status < 500:
                errors["4xx"] += 1
            if 500 <= status < 600:
                errors["5xx"] += 1

    total_duration = time.perf_counter() - start_run
    total_requests = len(endpoints)

    def summarize(name: str, rows: List[Tuple[float, int, float | None, int | None]]) -> None:
        latencies = [r[0] for r in rows]
        server_latencies = [r[2] for r in rows if r[2] is not None]
        query_counts = [r[3] for r in rows if r[3] is not None]
        print(f"\n{name.upper()}")
        print(f"count={len(rows)}")
        print(f"p50_ms={percentile(latencies, 50):.2f} p95_ms={percentile(latencies, 95):.2f}")
        if server_latencies:
            print(
                f"server_p50_ms={percentile(server_latencies, 50):.2f} "
                f"server_p95_ms={percentile(server_latencies, 95):.2f}"
            )
        if query_counts:
            print(
                f"avg_queries={sum(query_counts)/len(query_counts):.2f} "
                f"max_queries={max(query_counts)}"
            )

    print(f"Cold start (health): {cold_start_ms:.2f} ms")
    print(f"Throughput: {total_requests / total_duration:.2f} req/sec")
    print(f"Errors: 4xx={errors['4xx']} 5xx={errors['5xx']}")

    summarize("trending", results["trending"])
    summarize("place", results["place"])
    summarize("vote", results["vote"])


if __name__ == "__main__":
    main()
