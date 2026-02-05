"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import Link from "next/link";
import TopBar from "../../components/TopBar";
import PlaceCard from "../../components/PlaceCard";
import VoteButtons from "../../components/VoteButtons";
import { getCampuses, getOrCreateSessionId, getTrending, submitVote } from "../../lib/api";
import { setAnalyticsContext, trackEvent } from "../../lib/analytics";
import { buildMapsQuery, getPreferredMapsLink, isIOS } from "../../lib/maps";
import type { Campus, Place, VoteResponse, VoteValue } from "../../lib/types";

function computeVoteCounts(place: Place) {
  const worth = place.worth_it_count ?? 0;
  const mid = place.mid_count ?? 0;
  const skip = place.skip_count ?? 0;
  const total = place.total_votes ?? worth + mid + skip;
  return { worth, mid, skip, total };
}

function applyVoteToPlace(place: Place, response: VoteResponse) {
  return {
    ...place,
    worth_it_count: response.worth_it_count,
    mid_count: response.mid_count,
    skip_count: response.skip_count,
    total_votes: response.total_votes,
  };
}

function formatCategoryLabel(value?: string | number | null) {
  if (value === null || value === undefined) return "";
  const normalized = String(value).replace(/[_-]+/g, " ").toLowerCase();
  return normalized
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatPriceTier(price?: number | string | null) {
  if (!price) return "—";
  if (typeof price === "number") {
    const count = Math.min(Math.max(price, 1), 4);
    return "$".repeat(count);
  }
  if (typeof price === "string" && price.trim().length > 0) {
    const numeric = Number(price);
    if (Number.isFinite(numeric)) {
      const count = Math.min(Math.max(Math.round(numeric), 1), 4);
      return "$".repeat(count);
    }
    return price;
  }
  return "—";
}

function getCategoryChips(place: Place, max: number) {
  const chips = new Set<string>();
  if (place.categories) {
    place.categories.forEach((value) => {
      if (chips.size >= max) return;
      const text = String(value);
      const parts = text
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean);
      if (parts.length === 0) {
        const label = formatCategoryLabel(value);
        if (label) chips.add(label);
        return;
      }
      parts.forEach((part) => {
        if (chips.size < max) {
          const label = formatCategoryLabel(part);
          if (label) chips.add(label);
        }
      });
    });
  }
  if (chips.size === 0) chips.add("Uncategorized");
  return Array.from(chips).slice(0, max);
}

export default function ClosePage() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [campusId, setCampusId] = useState<number | null>(null);
  const [campusPickerOpen, setCampusPickerOpen] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [voteTarget, setVoteTarget] = useState<Place | null>(null);
  const [voteSubmitting, setVoteSubmitting] = useState(false);
  const [voteCooldowns, setVoteCooldowns] = useState<Record<string, number>>({});
  const [now, setNow] = useState(() => Date.now());
  const [voteFeedback, setVoteFeedback] = useState<
    Record<string, { vote: VoteValue; at: number }>
  >({});
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const impressionsRef = useRef<Set<string>>(new Set());
  const previousSortMode = useRef<"best" | "closest" | "trending" | null>(null);

  const COOLDOWN_MS = 24 * 60 * 60 * 1000;
  const COOLDOWN_KEY = "munch_vote_cooldowns";
  const FEEDBACK_WINDOW_MS = 1200;

  const selectedCampus = useMemo(
    () => campuses.find((campus) => campus.id === campusId) ?? null,
    [campuses, campusId]
  );
  const sortMode: "best" | "closest" | "trending" = "closest";

  const formatRemaining = (ms: number) => {
    const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const pad = (value: number) => String(value).padStart(2, "0");
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  };

  const getCooldownRemaining = (placeId: Place["id"]) => {
    const key = String(placeId);
    const expiresAt = voteCooldowns[key];
    if (!expiresAt) return 0;
    return Math.max(0, expiresAt - now);
  };

  useEffect(() => {
    setSessionId(getOrCreateSessionId());
  }, []);

  useEffect(() => {
    setAnalyticsContext({
      campus: selectedCampus?.short_name ?? selectedCampus?.name ?? undefined,
      campus_id: campusId ?? undefined,
      sort_mode: sortMode,
      category: null,
      session_id: sessionId,
      app_version: process.env.NEXT_PUBLIC_APP_VERSION,
    });
  }, [selectedCampus, campusId, sortMode, sessionId]);

  useEffect(() => {
    if (!previousSortMode.current) {
      trackEvent("sort_mode_selected", { sort_mode: sortMode });
      previousSortMode.current = sortMode;
      return;
    }
    if (previousSortMode.current !== sortMode) {
      trackEvent("sort_mode_selected", {
        sort_mode: sortMode,
        previous_sort_mode: previousSortMode.current,
      });
      previousSortMode.current = sortMode;
    }
  }, [sortMode]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem("munchhsv_campus_id");
    if (stored) {
      const parsed = Number(stored);
      if (Number.isFinite(parsed)) {
        setCampusId(parsed);
      }
    } else {
      setCampusPickerOpen(true);
    }
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
      // ignore invalid storage
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(COOLDOWN_KEY, JSON.stringify(voteCooldowns));
  }, [voteCooldowns]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!Object.keys(voteFeedback).length) return;
    setVoteFeedback((prev) => {
      let changed = false;
      const next: Record<string, { vote: VoteValue; at: number }> = {};
      Object.entries(prev).forEach(([key, value]) => {
        if (now - value.at < FEEDBACK_WINDOW_MS) {
          next[key] = value;
        } else {
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [now, voteFeedback, FEEDBACK_WINDOW_MS]);

  useEffect(() => {
    let isActive = true;
    getCampuses()
      .then((data) => {
        if (!isActive) return;
        setCampuses(data);
        if (campusId && !data.some((campus) => campus.id === campusId)) {
          setCampusId(null);
          setCampusPickerOpen(true);
        }
      })
      .catch(() => {
        if (isActive) setCampuses([]);
      });
    return () => {
      isActive = false;
    };
  }, [campusId]);

  useEffect(() => {
    let isActive = true;
    if (!campusId) {
      setLoading(false);
      setPlaces([]);
      setError(null);
      return () => {
        isActive = false;
      };
    }

    setLoading(true);
    setError(null);
    getTrending({
      campusId,
      city: selectedCampus?.city ?? "Huntsville",
      time_window: "7d",
      limit: 20,
      sort: "closest",
    })
      .then((data) => {
        if (!isActive) return;
        const sorted = data
          .slice()
          .sort(
            (a, b) =>
              (a.distance_miles ?? Infinity) -
                (b.distance_miles ?? Infinity) ||
              Number(a.id) - Number(b.id)
          );
        setPlaces(sorted);
      })
      .catch(() => {
        if (isActive) setError("Could not load nearby places.");
      })
      .finally(() => {
        if (isActive) setLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [campusId, selectedCampus?.city]);

  useEffect(() => {
    places.forEach((place, index) => {
      const id = String(place.id);
      if (impressionsRef.current.has(id)) return;
      if (index >= 20) return;
      impressionsRef.current.add(id);
      trackEvent("place_card_viewed", {
        place_id: place.id,
        distance_miles: place.distance_miles ?? undefined,
        rank_position: index + 1,
      });
    });
  }, [places]);

  useEffect(() => {
    if (!toastTimer.current) return;
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  const handleOpenMaps = (place: Place) => {
    const query = buildMapsQuery(place.name, place.address ?? null);
    const link = getPreferredMapsLink(query);
    trackEvent("open_in_maps_clicked", {
      place_id: place.id,
      distance_miles: place.distance_miles ?? undefined,
      provider: isIOS() ? "apple" : "google",
    });
    window.open(link, "_blank", "noopener,noreferrer");
  };

  const handleSelectPlace = (place: Place, rankPosition?: number) => {
    trackEvent("place_clicked", {
      place_id: place.id,
      distance_miles: place.distance_miles ?? undefined,
      rank_position: rankPosition,
    });
    setVoteTarget(place);
  };

  const handleVoteForPlace = async (
    place: Place,
    vote: VoteValue,
    surface: "card" | "modal"
  ) => {
    if (!sessionId) return;
    const remaining = getCooldownRemaining(place.id);
    if (remaining > 0) return;
    setVoteSubmitting(true);
    try {
      const voteResponse = await submitVote({
        place_id: place.id,
        vote,
        session_id: sessionId,
      });
      trackEvent("vote_cast", {
        place_id: place.id,
        distance_miles: place.distance_miles ?? undefined,
        vote,
      });
      setPlaces((prev) =>
        prev.map((item) =>
          item.id === place.id ? applyVoteToPlace(item, voteResponse) : item
        )
      );
      if (voteTarget?.id === place.id) {
        setVoteTarget((prev) =>
          prev ? applyVoteToPlace(prev, voteResponse) : prev
        );
      }
      setVoteFeedback((prev) => ({
        ...prev,
        [String(place.id)]: { vote, at: Date.now() },
      }));
      setVoteCooldowns((prev) => ({
        ...prev,
        [String(place.id)]: Date.now() + COOLDOWN_MS,
      }));
    } finally {
      setVoteSubmitting(false);
    }
  };

  const handleVote = async (vote: VoteValue) => {
    if (!voteTarget) return;
    await handleVoteForPlace(voteTarget, vote, "modal");
    setVoteTarget(null);
  };

  const campusName = (selectedCampus?.short_name ?? selectedCampus?.name ?? "")
    .toLowerCase();
  const isAamu = campusName.includes("aamu") || campusName.includes("alabama a&m");
  const themeStyle: CSSProperties = {
    ["--primary" as string]: isAamu ? "#7f1d1d" : "#3b82f6",
    ["--primary-dark" as string]: isAamu ? "#6b1b1b" : "#2563eb",
    ["--primary-soft" as string]: isAamu
      ? "rgba(127, 29, 29, 0.16)"
      : "rgba(59, 130, 246, 0.16)",
  };

  return (
    <div
      className="relative flex min-h-screen w-full flex-col overflow-x-hidden pb-28"
      style={themeStyle}
    >
      <header className="fixed top-0 left-0 z-50 w-full border-b border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur-md transition-all">
        <div className="mx-auto flex w-full max-w-none flex-col gap-3 px-4 py-4 sm:px-6 lg:px-10 2xl:px-16">
          <TopBar
            campusName={selectedCampus?.short_name ?? selectedCampus?.name ?? null}
            onChangeCampus={() => setCampusPickerOpen(true)}
          />
        </div>
      </header>

      <main className="flex w-full flex-1 flex-col pt-[96px]">
        {campusPickerOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4">
            <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-[var(--text)] shadow-lg">
              <h2 className="text-lg font-semibold">
                Pick your campus for better picks
              </h2>
              <p className="mt-2 text-sm text-[var(--text-muted)]">
                We use this to sort places by distance.
              </p>
              <div className="mt-4 flex flex-col gap-2">
                {campuses.map((campus) => (
                  <button
                    key={campus.id}
                    type="button"
                    className="rounded-xl border border-[var(--border)] px-4 py-3 text-left text-sm font-medium hover:bg-[var(--surface-2)]"
                    onClick={() => {
                      const hadCampus = !!window.localStorage.getItem(
                        "munchhsv_campus_id"
                      );
                      setCampusId(campus.id);
                      setCampusPickerOpen(false);
                      if (typeof window !== "undefined") {
                        window.localStorage.setItem(
                          "munchhsv_campus_id",
                          String(campus.id)
                        );
                      }
                      trackEvent("campus_selected", {
                        campus: campus.short_name ?? campus.name,
                        campus_id: campus.id,
                        source: hadCampus ? "settings" : "onboarding",
                        is_first_time: !hadCampus,
                      });
                    }}
                  >
                    {campus.short_name ?? campus.name}
                  </button>
                ))}
              </div>
              {campuses.length === 0 && (
                <p className="mt-4 text-sm text-[var(--text-muted)]">
                  Loading campuses…
                </p>
              )}
            </div>
          </div>
        )}

        <div className="mx-auto w-full max-w-none px-4 pt-8 pb-4 sm:px-6 lg:px-10 2xl:px-16">
          <h1 className="font-display text-[34px] font-extrabold leading-[1.1] tracking-tight text-[var(--text)]">
            Close to {selectedCampus?.short_name ?? selectedCampus?.name ?? "campus"}
          </h1>
          <p className="mt-2 text-[15px] font-medium text-[var(--text-muted)]">
            Sorted purely by distance from your campus.
          </p>
        </div>

        <div className="mx-auto flex w-full max-w-none flex-col gap-4 px-4 pb-8 sm:px-6 lg:px-10 2xl:px-16">
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={`skeleton-${index}`}
                  className="h-48 rounded-2xl skeleton-shimmer"
                />
              ))}
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-center text-sm text-[var(--text-muted)]">
              {error}
            </div>
          ) : places.length === 0 ? (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-center text-sm text-[var(--text-muted)]">
              No places yet.
            </div>
          ) : (
            <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(260px,1fr))]">
              {places.map((place, index) => {
                const votes = computeVoteCounts(place);
                const chips = getCategoryChips(place, 3);
                const remaining = getCooldownRemaining(place.id);
                const cooldownLabel =
                  remaining > 0 ? formatRemaining(remaining) : null;
                const feedback = voteFeedback[String(place.id)];
                const activeVote = feedback?.vote ?? null;
                const animateVote =
                  !!feedback && now - feedback.at < FEEDBACK_WINDOW_MS;
                return (
                  <PlaceCard
                    key={String(place.id)}
                    place={place}
                    rank={index + 1}
                    chips={chips}
                    voteCounts={votes}
                    scoreWeights={{ popularity: 0.25, distance: 0.75 }}
                    cooldownLabel={cooldownLabel}
                    activeVote={activeVote}
                    animateVote={animateVote}
                    size="stacked"
                    showDistanceBubble
                    onSelect={(value) => handleSelectPlace(value, index + 1)}
                    onVote={(value, vote) =>
                      handleVoteForPlace(value, vote, "card")
                    }
                  />
                );
              })}
            </div>
          )}
        </div>
      </main>

      <nav className="fixed bottom-0 left-0 z-50 w-full border-t border-slate-100 bg-[var(--surface)]/95 backdrop-blur-md shadow-[var(--shadow-nav)]">
        <div className="mx-auto flex h-[84px] max-w-none items-start justify-around px-4 pt-3 pb-8 sm:px-6 lg:px-10 2xl:px-16">
          <Link
            href="/"
            className="group flex flex-1 flex-col items-center gap-1.5 text-slate-400 transition-colors hover:text-slate-600"
          >
            <div className="rounded-full p-1 transition-colors group-hover:bg-[var(--surface-2)]">
              <span className="material-symbols-outlined text-[26px]">
                explore
              </span>
            </div>
            <span className="text-[11px] font-medium">Discover</span>
          </Link>
          <button
            type="button"
            className="group flex flex-1 flex-col items-center gap-1.5"
            aria-current="page"
          >
            <div className="rounded-full bg-[var(--primary-soft)] p-1 transition-colors">
              <span className="material-symbols-outlined filled text-[26px] text-[var(--primary)]">
                near_me
              </span>
            </div>
            <span className="text-[11px] font-bold text-[var(--primary)]">
              Close to you
            </span>
          </button>
          <Link
            href="/saved"
            className="group flex flex-1 flex-col items-center gap-1.5 text-slate-400 transition-colors hover:text-slate-600"
          >
            <div className="rounded-full p-1 transition-colors group-hover:bg-[var(--surface-2)]">
              <span className="material-symbols-outlined text-[26px]">
                bookmark
              </span>
            </div>
            <span className="text-[11px] font-medium">Saved</span>
          </Link>
        </div>
      </nav>
      {voteTarget ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onClick={() => setVoteTarget(null)}
        >
          <div
            className="w-full max-w-4xl overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-soft)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
                  {selectedCampus?.short_name ?? selectedCampus?.name ?? "Campus"}
                </p>
                <h3 className="text-2xl font-semibold text-[var(--text)]">
                  {voteTarget.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setVoteTarget(null)}
                className="rounded-full border border-[var(--border)] px-3 py-1 text-xs font-semibold text-[var(--text-muted)]"
              >
                Close
              </button>
            </div>

            <div className="px-6 pt-6">
              <div className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-2)]">
                {voteTarget.image_url ? (
                  <img
                    src={voteTarget.image_url}
                    alt={voteTarget.name}
                    className="h-48 w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-48 w-full items-center justify-center bg-gradient-to-br from-slate-900/10 to-slate-500/10">
                    <span className="material-symbols-outlined text-[28px] text-[var(--text-muted)]">
                      image
                    </span>
                  </div>
                )}
                <div className="absolute bottom-2 right-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/80">
                  Photos via Yelp
                </div>
              </div>
            </div>

            <div className="grid gap-6 px-6 py-6 lg:grid-cols-[1.2fr_1fr]">
              <div className="space-y-6">
                <div>
                  <p className="text-base font-medium text-[var(--text-muted)]">
                    {voteTarget.categories
                      ?.slice(0, 3)
                      .map((value) => formatCategoryLabel(value))
                      .join(" • ")}
                  </p>
                  {voteTarget.address ? (
                    <p className="mt-2 text-sm text-[var(--text-muted)]">
                      {voteTarget.address}
                    </p>
                  ) : null}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-3 text-center">
                    <p className="text-xs font-semibold text-[var(--text-muted)]">
                      Distance from campus
                    </p>
                    <p className="text-sm font-bold text-[var(--text)]">
                      {voteTarget.distance_miles < 10
                        ? `${voteTarget.distance_miles.toFixed(1)} mi`
                        : `${voteTarget.distance_miles.toFixed(0)} mi`}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-3 text-center">
                    <p className="text-xs font-semibold text-[var(--text-muted)]">
                      Price
                    </p>
                    <p className="text-sm font-bold text-[var(--text)]">
                      {formatPriceTier(voteTarget.price_tier)}
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-base font-semibold text-[var(--text)]">
                        Votes
                      </h4>
                      <p className="text-sm text-[var(--text-muted)]">
                        {computeVoteCounts(voteTarget).total} total
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-4 text-sm font-semibold text-[var(--text-muted)]">
                    <span className="inline-flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center text-[var(--success)]">
                        <span className="material-symbols-outlined text-[16px]">
                          thumb_up
                        </span>
                      </span>
                      {computeVoteCounts(voteTarget).worth}
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center text-[var(--warning)]">
                        <span className="material-symbols-outlined text-[16px]">
                          sentiment_neutral
                        </span>
                      </span>
                      {computeVoteCounts(voteTarget).mid}
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center text-[var(--danger)]">
                        <span className="material-symbols-outlined text-[16px]">
                          thumb_down
                        </span>
                      </span>
                      {computeVoteCounts(voteTarget).skip}
                    </span>
                  </div>
                </div>

                <div className="mt-4">
                  {voteTarget &&
                  getCooldownRemaining(voteTarget.id) > 0 &&
                  !(
                    voteFeedback[String(voteTarget.id)] &&
                    now - (voteFeedback[String(voteTarget.id)]?.at ?? 0) <
                      FEEDBACK_WINDOW_MS
                  ) ? (
                    <div className="flex min-h-[58px] items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-center text-xs font-semibold text-[var(--text-muted)]">
                      Next vote in {formatRemaining(
                        getCooldownRemaining(voteTarget.id)
                      )}
                    </div>
                  ) : (
                    <VoteButtons
                      onVote={handleVote}
                      isSubmitting={voteSubmitting}
                      activeVote={
                        voteTarget
                          ? voteFeedback[String(voteTarget.id)]?.vote ?? null
                          : null
                      }
                      animateVote={
                        voteTarget
                          ? now - (voteFeedback[String(voteTarget.id)]?.at ?? 0) <
                            FEEDBACK_WINDOW_MS
                          : false
                      }
                    />
                  )}
                </div>
              </div>

              <div className="space-y-5">
                <button
                  type="button"
                  onClick={() => handleOpenMaps(voteTarget)}
                  className="w-full rounded-2xl bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-white shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary-dark)]"
                >
                  Open in Maps
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
