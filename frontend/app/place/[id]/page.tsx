"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import { PlaceDetailSkeleton, PullToRefreshIndicator } from "../../../components/Skeleton";
import {
  getCampuses,
  getOrCreateSessionId,
  getPlaceById,
  submitVote,
} from "../../../lib/api";
import { trackEvent } from "../../../lib/analytics";
import { buildMapsQuery, getPreferredMapsLink, isIOS } from "../../../lib/maps";
import { extractCategoryChips } from "../../../lib/tags";
import type { Campus, Place, VoteValue } from "../../../lib/types";
import { usePullToRefresh } from "../../../lib/usePullToRefresh";

const COOLDOWN_MS = 24 * 60 * 60 * 1000;
const COOLDOWN_KEY = "munch_vote_cooldowns";

function formatDistance(distance?: number | null) {
  if (typeof distance !== "number" || Number.isNaN(distance)) return "-";
  return distance < 10 ? `${distance.toFixed(1)} mi away` : `${distance.toFixed(0)} mi away`;
}

function formatPrice(price?: number | string | null) {
  if (!price) return "-";
  if (typeof price === "number") {
    return "$".repeat(Math.min(Math.max(price, 1), 4));
  }
  const parsed = Number(price);
  if (Number.isFinite(parsed)) {
    return "$".repeat(Math.min(Math.max(Math.round(parsed), 1), 4));
  }
  return String(price);
}

function getVoteCounts(place: Place) {
  const worth = place.worth_it_count ?? 0;
  const mid = place.mid_count ?? 0;
  const skip = place.skip_count ?? 0;
  const total = place.total_votes ?? worth + mid + skip;
  return { worth, mid, skip, total };
}

function getRecommendPercent(total: number, worth: number) {
  if (!total) return 0;
  return Math.round((worth / total) * 100);
}

function formatRemaining(ms: number) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (v: number) => String(v).padStart(2, "0");
  return `${pad(hours)}h  ${pad(minutes)}m  ${pad(seconds)}s`;
}

function toDisplayLabel(value: unknown) {
  const raw = typeof value === "string" ? value : value == null ? "" : String(value);
  const cleaned = raw.replace(/[_-]+/g, " ").trim().toLowerCase();
  if (!cleaned) return raw;
  return cleaned.replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function PlacePage() {
  const params = useParams<{ id: string }>();
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [campusId, setCampusId] = useState<number | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [place, setPlace] = useState<Place | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [voteSubmitting, setVoteSubmitting] = useState(false);
  const [activeVote, setActiveVote] = useState<VoteValue | null>(null);
  const [voteCooldowns, setVoteCooldowns] = useState<Record<string, number>>({});
  const [now, setNow] = useState(() => Date.now());
  const [refreshing, setRefreshing] = useState(false);
  const requestIdRef = useRef(0);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const numericPlaceId = useMemo(() => {
    const raw = Array.isArray(params?.id) ? params.id[0] : params?.id;
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }, [params?.id]);

  useEffect(() => {
    setSessionId(getOrCreateSessionId());
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem("munchhsv_campus_id");
    if (!stored) return;
    const parsed = Number(stored);
    if (Number.isFinite(parsed) && parsed > 0) setCampusId(parsed);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(COOLDOWN_KEY);
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored) as Record<string, number>;
      if (parsed && typeof parsed === "object") {
        setVoteCooldowns(parsed);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(COOLDOWN_KEY, JSON.stringify(voteCooldowns));
  }, [voteCooldowns]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let isActive = true;
    getCampuses()
      .then((data) => {
        if (!isActive) return;
        setCampuses(data);
        if (!campusId && data[0]) {
          setCampusId(data[0].id);
        }
      })
      .catch(() => {
        if (isActive) setCampuses([]);
      });
    return () => {
      isActive = false;
    };
  }, [campusId]);

  const selectedCampus = useMemo(
    () => campuses.find((campus) => campus.id === campusId) ?? null,
    [campuses, campusId]
  );

  const refreshPlace = useEffectEvent(async () => {
    if (!numericPlaceId || !campusId) return;
    const requestId = ++requestIdRef.current;
    setRefreshing(true);
    setError(null);
    try {
      const data = await getPlaceById({ id: numericPlaceId, campusId });
      if (requestId !== requestIdRef.current) return;
      setPlace(data);
    } catch {
      if (requestId !== requestIdRef.current) return;
      setError("Could not refresh this place.");
    } finally {
      if (requestId !== requestIdRef.current) return;
      setRefreshing(false);
    }
  });

  useEffect(() => {
    let isActive = true;
    const requestId = ++requestIdRef.current;
    if (!numericPlaceId) {
      setPlace(null);
      setLoading(false);
      setError("Invalid place id.");
      return () => {
        isActive = false;
      };
    }

    if (!campusId) {
      setLoading(true);
      return () => {
        isActive = false;
      };
    }

    setLoading(true);
    setRefreshing(false);
    setPlace(null);
    setError(null);

    getPlaceById({ id: numericPlaceId, campusId })
      .then((data) => {
        if (!isActive || requestId !== requestIdRef.current) return;
        setPlace(data);
        trackEvent("place_clicked", {
          place_id: data.id,
          distance_miles: data.distance_miles ?? undefined,
        });
      })
      .catch(() => {
        if (!isActive || requestId !== requestIdRef.current) return;
        setPlace(null);
        setError("Could not load this place.");
      })
      .finally(() => {
        if (!isActive || requestId !== requestIdRef.current) return;
        setLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [numericPlaceId, campusId]);

  const voteCounts = useMemo(() => (place ? getVoteCounts(place) : null), [place]);
  const chips = useMemo(() => (place ? extractCategoryChips(place, 3) : []), [place]);

  const getCooldownRemaining = (placeId: Place["id"]) => {
    const key = String(placeId);
    const expiresAt = voteCooldowns[key];
    if (!expiresAt) return 0;
    return Math.max(0, expiresAt - now);
  };

  const handleVote = async (vote: VoteValue) => {
    if (!place || !sessionId || voteSubmitting) return;
    const remaining = getCooldownRemaining(place.id);
    if (remaining > 0) return;

    setVoteSubmitting(true);
    try {
      const response = await submitVote({
        place_id: place.id,
        vote,
        session_id: sessionId,
      });
      setActiveVote(vote);
      setVoteCooldowns((prev) => ({
        ...prev,
        [String(place.id)]: Date.now() + COOLDOWN_MS,
      }));
      setPlace((prev) =>
        prev
          ? {
              ...prev,
              worth_it_count: response.worth_it_count,
              mid_count: response.mid_count,
              skip_count: response.skip_count,
              total_votes: response.total_votes,
            }
          : prev
      );
      trackEvent("vote_cast", {
        place_id: place.id,
        distance_miles: place.distance_miles ?? undefined,
        vote,
      });
    } catch {
      setError("Could not submit vote. Please try again.");
    } finally {
      setVoteSubmitting(false);
    }
  };

  const handleOpenMaps = () => {
    if (!place) return;
    const query = buildMapsQuery(place.name, place.address ?? null);
    const link = getPreferredMapsLink(query);
    window.open(link, "_blank", "noopener,noreferrer");
    trackEvent("open_in_maps_clicked", {
      place_id: place.id,
      distance_miles: place.distance_miles ?? undefined,
      provider: isIOS() ? "apple" : "google",
    });
  };
  const { isArmed, isRefreshing, pullDistance } = usePullToRefresh({
    disabled: loading || !place,
    getScrollTop: () => scrollContainerRef.current?.scrollTop ?? window.scrollY,
    onRefresh: refreshPlace,
  });

  if (loading) {
    return <PlaceDetailSkeleton />;
  }

  if (!place || !voteCounts) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="text-2xl font-semibold text-[var(--text)]">{error ?? "Place not found"}</h1>
        <Link
          href="/"
          className="rounded-full border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--text)]"
        >
          Back to Discover
        </Link>
      </div>
    );
  }

  const recommendPercent = getRecommendPercent(voteCounts.total, voteCounts.worth);
  const remaining = getCooldownRemaining(place.id);
  const displayTags = (chips.length ? chips : place.categories.slice(0, 3))
    .map((tag) => (typeof tag === "string" ? tag : tag == null ? "" : String(tag)))
    .filter(Boolean);
  const cuisineLabel = toDisplayLabel(place.category ?? place.categories[0] ?? "local favorite");

  return (
    <div className="min-h-screen bg-[#0b0c10] px-2 py-2 text-white sm:px-4 sm:py-4">
      <PullToRefreshIndicator
        pullDistance={pullDistance}
        isRefreshing={isRefreshing || refreshing}
        isArmed={isArmed}
      />
      <div
        style={{
          transform: pullDistance > 0 ? `translateY(${pullDistance}px)` : undefined,
          transition: pullDistance > 0 ? "none" : "transform 180ms ease-out",
        }}
      >
        <div className="mx-auto flex h-[calc(100vh-0.75rem)] max-h-[860px] w-full max-w-[1320px] flex-col overflow-hidden rounded-[26px] border border-white/10 bg-[#161820] shadow-[0_20px_70px_rgba(0,0,0,0.58)]">
          <div className="flex items-center justify-between border-b border-white/5 px-4 py-3 sm:px-6">
            <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
              {refreshing ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                  Refreshing
                </>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => window.history.back()}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-[#1e2a40] text-slate-300 transition hover:text-white"
              aria-label="Close"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          <div
            ref={scrollContainerRef}
            className="flex-1 overflow-y-auto px-4 pb-4 pt-3 sm:px-5 sm:pt-4 md:px-7"
          >
            <div className="mx-auto max-w-[1160px] text-center">
              {error ? (
                <div className="mb-4 rounded-2xl border border-amber-400/15 bg-amber-500/10 px-4 py-3 text-sm font-semibold text-amber-100">
                  {error}
                </div>
              ) : null}

              <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{place.name}</h1>
              <p className="mt-1 text-sm font-semibold text-slate-400 sm:text-lg">{cuisineLabel}</p>

              <div className="mt-2.5 flex flex-wrap items-center justify-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-600/20 px-2.5 py-1 text-xs font-semibold text-blue-300 sm:text-sm">
                  <span className="material-symbols-outlined text-[14px]">location_on</span>
                  {formatDistance(place.distance_miles)}
                </span>
                <span className="inline-flex items-center rounded-full bg-emerald-600/20 px-3 py-1 text-base font-bold text-emerald-300 sm:text-lg">
                  {formatPrice(place.price_tier)}
                </span>
              </div>

              <div className="mt-2.5 flex flex-wrap justify-center gap-1.5">
                {displayTags.map((chip) => (
                  <span
                    key={chip}
                    className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold text-slate-200 sm:text-sm"
                  >
                    {toDisplayLabel(chip).toLowerCase()}
                  </span>
                ))}
              </div>

              <h2 className="mt-4 text-xl font-extrabold sm:text-3xl">Community Verdict</h2>

              <div className="mt-3 grid grid-cols-1 gap-2.5 md:grid-cols-3">
                <div className="rounded-[18px] bg-gradient-to-br from-emerald-950/55 to-emerald-700/20 p-3.5 md:p-4">
                  <span className="material-symbols-outlined text-[24px] text-emerald-400">thumb_up</span>
                  <p className="mt-1.5 text-3xl font-extrabold leading-none text-emerald-400 md:text-4xl">{voteCounts.worth}</p>
                  <p className="mt-1 text-lg font-bold text-emerald-400 md:text-xl">Worth It</p>
                </div>
                <div className="rounded-[18px] bg-gradient-to-br from-amber-950/55 to-amber-700/20 p-3.5 md:p-4">
                  <span className="material-symbols-outlined text-[24px] text-amber-400">remove</span>
                  <p className="mt-1.5 text-3xl font-extrabold leading-none text-amber-400 md:text-4xl">{voteCounts.mid}</p>
                  <p className="mt-1 text-lg font-bold text-amber-400 md:text-xl">Mid</p>
                </div>
                <div className="rounded-[18px] bg-gradient-to-br from-rose-950/55 to-rose-700/20 p-3.5 md:p-4">
                  <span className="material-symbols-outlined text-[24px] text-rose-400">thumb_down</span>
                  <p className="mt-1.5 text-3xl font-extrabold leading-none text-rose-400 md:text-4xl">{voteCounts.skip}</p>
                  <p className="mt-1 text-lg font-bold text-rose-400 md:text-xl">Skip</p>
                </div>
              </div>

              <div className="mt-3">
                <div className="mb-1.5 flex items-center justify-between text-xs font-semibold text-slate-300 sm:text-sm">
                  <span>{recommendPercent}% recommend</span>
                  <span>{voteCounts.total} total votes</span>
                </div>
                <div className="h-2.5 rounded-full bg-slate-600/50">
                  <div className="h-full rounded-full bg-emerald-500" style={{ width: `${recommendPercent}%` }} />
                </div>
              </div>

              <h3 className="mt-4 text-xl font-extrabold sm:text-2xl">Location</h3>
              <p className="mt-1 text-sm text-slate-300 sm:text-lg">{place.address ?? "Address unavailable"}</p>

              <h3 className="mt-4 text-xl font-extrabold sm:text-2xl">Cast Your Vote</h3>

              {remaining > 0 ? (
                <div className="mt-2.5 rounded-[16px] bg-gradient-to-r from-indigo-950/70 to-blue-950/55 px-3.5 py-2.5 text-left">
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-2xl text-white">check</span>
                    <div>
                      <p className="text-lg font-extrabold text-white sm:text-xl">Vote Recorded!</p>
                      <p className="text-xs font-semibold text-slate-300 sm:text-base">
                        Next vote: <span className="text-blue-400">{formatRemaining(remaining)}</span>
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-2.5 grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    disabled={voteSubmitting}
                    onClick={() => handleVote("worth_it")}
                    className={`flex min-h-[72px] flex-col items-center justify-center gap-1 rounded-xl border px-2 py-1.5 text-[10px] font-bold transition sm:text-xs ${
                      activeVote === "worth_it"
                        ? "border-emerald-500 bg-emerald-500/30 text-white"
                        : "border-white/10 bg-[#181a21] text-slate-100 hover:bg-emerald-500/20"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px] leading-none">thumb_up</span>
                    Worth It
                  </button>
                  <button
                    type="button"
                    disabled={voteSubmitting}
                    onClick={() => handleVote("mid")}
                    className={`flex min-h-[72px] flex-col items-center justify-center gap-1 rounded-xl border px-2 py-1.5 text-[10px] font-bold transition sm:text-xs ${
                      activeVote === "mid"
                        ? "border-amber-500 bg-amber-500/30 text-white"
                        : "border-white/10 bg-[#181a21] text-slate-100 hover:bg-amber-500/20"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px] leading-none">remove</span>
                    Mid
                  </button>
                  <button
                    type="button"
                    disabled={voteSubmitting}
                    onClick={() => handleVote("skip")}
                    className={`flex min-h-[72px] flex-col items-center justify-center gap-1 rounded-xl border px-2 py-1.5 text-[10px] font-bold transition sm:text-xs ${
                      activeVote === "skip"
                        ? "border-rose-500 bg-rose-500/30 text-white"
                        : "border-white/10 bg-[#181a21] text-slate-100 hover:bg-rose-500/20"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px] leading-none">thumb_down</span>
                    Skip
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-white/5 bg-black/20 p-3">
            <button
              type="button"
              onClick={handleOpenMaps}
              className="w-full rounded-[14px] bg-gradient-to-r from-[#2b69ff] to-[#5645ff] px-4 py-2.5 text-base font-bold text-white transition hover:brightness-110 sm:text-xl"
            >
              <span className="inline-flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] sm:text-[20px]">location_on</span>
                Get Directions
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
