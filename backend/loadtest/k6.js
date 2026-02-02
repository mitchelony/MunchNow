import http from "k6/http";
import { check, sleep } from "k6";

const BASE_URL = __ENV.BASE_URL || "http://localhost:8000";

export const options = {
  vus: __ENV.VUS ? parseInt(__ENV.VUS, 10) : 10,
  duration: __ENV.DURATION || "30s",
};

export function setup() {
  const res = http.get(`${BASE_URL}/places?limit=25`);
  const ok = check(res, { "places 200": (r) => r.status === 200 });
  if (!ok) {
    throw new Error(`Failed to fetch places: ${res.status}`);
  }
  const data = res.json();
  return { placeIds: data?.places?.map((p) => p.id) ?? [] };
}

export default function (data) {
  const placeIds = data.placeIds;
  if (!placeIds.length) {
    sleep(1);
    return;
  }

  const placeId = placeIds[Math.floor(Math.random() * placeIds.length)];

  const trending = http.get(`${BASE_URL}/trending?limit=12&time_window=7d`);
  check(trending, { "trending 200": (r) => r.status === 200 });

  const place = http.get(`${BASE_URL}/places/${placeId}`);
  check(place, { "place 200": (r) => r.status === 200 });

  const vote = http.post(
    `${BASE_URL}/votes`,
    JSON.stringify({ place_id: placeId, vote: "worth_it" }),
    { headers: { "Content-Type": "application/json" } }
  );
  check(vote, { "vote 200": (r) => r.status === 200 });

  sleep(1);
}
