import type { Campus, Place, PlaceId, VoteResponse, VoteValue } from "./types";

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "");
const DEFAULT_CAMPUS_ID = Number(process.env.NEXT_PUBLIC_CAMPUS_ID ?? "");

function resolveCampusId(explicit?: number) {
  const campusId = explicit ?? DEFAULT_CAMPUS_ID;
  if (!Number.isFinite(campusId) || campusId <= 0) {
    throw new Error("NEXT_PUBLIC_CAMPUS_ID is not set or invalid");
  }
  return campusId;
}

type TrendingParams = {
  city: string;
  category?: string;
  time_window: string;
  limit?: number;
  sort?: "best" | "closest" | "trending";
  campusId?: number;
};

type VotePayload = {
  place_id: PlaceId;
  vote: VoteValue;
  session_id?: string | null;
};

type BetaTesterPayload = {
  name: string;
  email: string;
  source?: "beta_onboarding" | "settings" | "prompt";
};

type BetaTesterResponse = {
  ok: boolean;
  id: number;
  name: string;
  email: string;
  source: string;
};

function buildUrl(baseUrl: string, path: string, params?: Record<string, string | number | undefined>) {
  if (!BASE_URL) {
    throw new Error("NEXT_PUBLIC_API_BASE_URL is not set");
  }
  const url = new URL(path, baseUrl);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}

function buildCandidateBaseUrls() {
  if (!BASE_URL) {
    throw new Error("NEXT_PUBLIC_API_BASE_URL is not set");
  }
  const candidates = [BASE_URL];
  try {
    const parsed = new URL(BASE_URL);
    if (parsed.hostname === "127.0.0.1") {
      parsed.hostname = "localhost";
      candidates.push(parsed.toString().replace(/\/$/, ""));
    } else if (parsed.hostname === "localhost") {
      parsed.hostname = "127.0.0.1";
      candidates.push(parsed.toString().replace(/\/$/, ""));
    }
  } catch {
    // Keep original BASE_URL candidate only.
  }
  return Array.from(new Set(candidates));
}

function buildCandidateUrls(
  path: string,
  params?: Record<string, string | number | undefined>
) {
  return buildCandidateBaseUrls().map((baseUrl) => buildUrl(baseUrl, path, params));
}

async function fetchWithHostFallback(
  path: string,
  init: RequestInit,
  params?: Record<string, string | number | undefined>
) {
  const urls = buildCandidateUrls(path, params);
  let lastError: unknown = null;

  for (const url of urls) {
    try {
      return await fetch(url, init);
    } catch (error) {
      lastError = error;
    }
  }

  throw new Error(
    `Network request failed for ${path} via ${urls.join(" | ")}${lastError ? `: ${String(lastError)}` : ""}`
  );
}

function normalizePlaces(data: unknown): Place[] {
  if (Array.isArray(data)) {
    return assertPlacesShape(data as Place[]);
  }
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    if (Array.isArray(obj.places)) return assertPlacesShape(obj.places as Place[]);
    if (Array.isArray(obj.results)) return assertPlacesShape(obj.results as Place[]);
  }
  return [];
}

function normalizeCampuses(data: unknown): Campus[] {
  if (Array.isArray(data)) return data as Campus[];
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    if (Array.isArray(obj.campuses)) return obj.campuses as Campus[];
    if (Array.isArray(obj.campus)) return obj.campus as Campus[];
    if (Array.isArray(obj.results)) return obj.results as Campus[];
    if (Array.isArray(obj.data)) return obj.data as Campus[];
  }
  return [];
}

function assertPlacesShape(places: Place[]): Place[] {
  if (process.env.NODE_ENV === "production") return places;
  for (const place of places) {
    if (!place) {
      throw new Error("Invalid place payload: empty item");
    }
    if (!Array.isArray(place.categories)) {
      throw new Error(`Invalid place payload: categories missing for place ${String(place.id)}`);
    }
    if (typeof place.distance_miles !== "number") {
      throw new Error(`Invalid place payload: distance_miles missing for place ${String(place.id)}`);
    }
    if (typeof place.score !== "number") {
      throw new Error(`Invalid place payload: score missing for place ${String(place.id)}`);
    }
  }
  return places;
}

export async function getCampuses(): Promise<Campus[]> {
  const res = await fetchWithHostFallback("/campuses", { method: "GET" });
  if (!res.ok) {
    throw new Error("Failed to load campuses");
  }
  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new Error(`Invalid campuses response type: ${contentType || "unknown"}`);
  }
  const data = await res.json();
  return normalizeCampuses(data);
}

export async function getTrending(params: TrendingParams): Promise<Place[]> {
  const res = await fetchWithHostFallback(
    "/trending",
    { method: "GET" },
    {
      campus_id: resolveCampusId(params.campusId),
      city: params.city,
      category: params.category,
      time_window: params.time_window,
      limit: params.limit,
      sort: params.sort,
    }
  );
  if (!res.ok) {
    throw new Error("Failed to load trending places");
  }
  const data = await res.json();
  return normalizePlaces(data);
}

export async function getPlaces(params: {
  city: string;
  category?: string;
  limit?: number;
  sort?: "best" | "closest" | "trending";
  campusId?: number;
}): Promise<Place[]> {
  const res = await fetchWithHostFallback(
    "/places",
    { method: "GET" },
    {
      campus_id: resolveCampusId(params.campusId),
      city: params.city,
      category: params.category,
      limit: params.limit,
      sort: params.sort,
    }
  );
  if (!res.ok) {
    throw new Error("Failed to load places");
  }
  const data = await res.json();
  return normalizePlaces(data);
}

export async function getPlaceById(params: {
  id: PlaceId;
  campusId?: number;
}): Promise<Place> {
  const res = await fetchWithHostFallback(
    `/places/${params.id}`,
    { method: "GET" },
    {
      campus_id: resolveCampusId(params.campusId),
    }
  );
  if (!res.ok) {
    throw new Error("Failed to load place");
  }
  const data = (await res.json()) as unknown;
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    if (obj.place && typeof obj.place === "object") {
      const places = assertPlacesShape([obj.place as Place]);
      if (places[0]) return places[0];
    }
  }
  throw new Error("Invalid place payload");
}

export async function submitVote(payload: VotePayload): Promise<VoteResponse> {
  const res = await fetchWithHostFallback("/votes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      place_id: payload.place_id,
      vote: payload.vote,
      session_id: payload.session_id ?? undefined,
    }),
  });

  if (!res.ok) {
    throw new Error("Failed to submit vote");
  }

  return res.json();
}

export async function submitBetaTester(
  payload: BetaTesterPayload
): Promise<BetaTesterResponse> {
  const res = await fetchWithHostFallback("/beta/testers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: payload.name,
      email: payload.email,
      source: payload.source ?? "beta_onboarding",
    }),
  });

  if (!res.ok) {
    throw new Error("Failed to save beta tester");
  }

  return res.json();
}

export function getOrCreateSessionId() {
  if (typeof window === "undefined") return null;
  const key = "munchhsv_session_id";
  const existing = window.localStorage.getItem(key);
  if (existing) return existing;

  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  window.localStorage.setItem(key, id);
  return id;
}
