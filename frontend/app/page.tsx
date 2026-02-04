"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type TouchEvent,
} from "react";
import Link from "next/link";
import CategoryChips from "../components/CategoryChips";
import PlaceCard from "../components/PlaceCard";
import TopBar from "../components/TopBar";
import VoteButtons from "../components/VoteButtons";
import { getOrCreateSessionId, getTrending, submitVote } from "../lib/api";
import { track } from "../lib/analytics";
import { buildMapsQuery, getPreferredMapsLink, isIOS } from "../lib/maps";
import type { Place, VoteResponse, VoteValue } from "../lib/types";

const CATEGORIES = [
  "Quick Bites",
  "Cheap",
  "Late Night",
  "Coffee Spots",
  "Local Favorite",
];

const FALLBACK_CATEGORY = "Local Favorite";
const CATEGORY_TO_API: Record<string, string> = {
  "Quick Bites": "quick_bites",
  Cheap: "cheap",
  "Late Night": "late_night",
  "Coffee Spots": "coffee_spots",
  "Local Favorite": "local_favorite",
};

const CATEGORY_THEME: Record<string, { primary: string; dark: string; soft: string }> =
  {
    "Quick Bites": {
      primary: "#6366f1",
      dark: "#4f46e5",
      soft: "rgba(99, 102, 241, 0.16)",
    },
    Cheap: {
      primary: "#16a34a",
      dark: "#15803d",
      soft: "rgba(22, 163, 74, 0.16)",
    },
    "Late Night": {
      primary: "#7c3aed",
      dark: "#6d28d9",
      soft: "rgba(124, 58, 237, 0.16)",
    },
    "Coffee Spots": {
      primary: "#eab308",
      dark: "#ca8a04",
      soft: "rgba(234, 179, 8, 0.18)",
    },
    "Local Favorite": {
      primary: "#3b82f6",
      dark: "#2563eb",
      soft: "rgba(59, 130, 246, 0.16)",
    },
  };

function formatCategoryLabel(value?: string | number | null) {
  if (value === null || value === undefined) return FALLBACK_CATEGORY;
  const normalized = String(value).replace(/[_-]+/g, " ").toLowerCase();
  return normalized
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function pickCategory(place: Place) {
  const fromArray = place.categories?.[0];
  return formatCategoryLabel(fromArray ?? place.category ?? FALLBACK_CATEGORY);
}

type PlaceSection = "top_3" | "more_places";

function buildPlaceProps(place: Place, section?: PlaceSection) {
  const distance =
    (place as { distance_miles?: number | null }).distance_miles ?? null;
  return {
    place_id: place.id,
    place_name: place.name,
    section,
    tags: place.categories?.length ? place.categories : undefined,
    price_tier: place.price_tier ?? null,
    distance_miles: distance ?? undefined,
  };
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
        chips.add(formatCategoryLabel(value));
        return;
      }
      parts.forEach((part) => {
        if (chips.size < max) chips.add(formatCategoryLabel(part));
      });
    });
  }
  if (chips.size < max && place.category) {
    const parts = String(place.category)
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
    if (parts.length === 0) {
      chips.add(formatCategoryLabel(place.category));
    } else {
      parts.forEach((part) => {
        if (chips.size < max) chips.add(formatCategoryLabel(part));
      });
    }
  }
  if (chips.size === 0) chips.add(FALLBACK_CATEGORY);
  return Array.from(chips).slice(0, max);
}

function computeVoteCounts(place: Place) {
  const worth = place.worth_it_count ?? 0;
  const mid = place.mid_count ?? 0;
  const skip = place.skip_count ?? 0;
  const total = place.total_votes ?? worth + mid + skip;
  return { worth, mid, skip, total };
}

function buildStatus(place: Place) {
  if (place.score_hint) return place.score_hint;
  const votes = computeVoteCounts(place);
  return votes.total > 0 ? "Trending" : "Fresh";
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

function shufflePlaces(items: Place[]) {
  const copy = items.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export default function HomePage() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("Quick Bites");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [voteTarget, setVoteTarget] = useState<Place | null>(null);
  const [voteSubmitting, setVoteSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [shuffleActive, setShuffleActive] = useState(false);
  const [voteCooldowns, setVoteCooldowns] = useState<Record<string, number>>({});
  const [now, setNow] = useState(() => Date.now());
  const [voteFeedback, setVoteFeedback] = useState<
    Record<string, { vote: VoteValue; at: number }>
  >({});
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shuffleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sheetTouchStart = useRef<number | null>(null);
  const impressionsRef = useRef<
    Record<string, { key: string; seen: Set<string> }>
  >({});

  const COOLDOWN_MS = 24 * 60 * 60 * 1000;
  const COOLDOWN_KEY = "munch_vote_cooldowns";
  const FEEDBACK_WINDOW_MS = 1200;

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

  const [initialLoad, setInitialLoad] = useState(true);

  const categoryParam = useMemo(() => {
    if (initialLoad) return undefined;
    return CATEGORY_TO_API[selectedCategory];
  }, [selectedCategory, initialLoad]);

  useEffect(() => {
    setSessionId(getOrCreateSessionId());
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(COOLDOWN_KEY);
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored) as Record<string, number>;
      const cleaned: Record<string, number> = {};
      Object.entries(parsed).forEach(([key, value]) => {
        if (typeof value === "number" && value > Date.now()) {
          cleaned[key] = value;
        }
      });
      setVoteCooldowns(cleaned);
    } catch {
      window.localStorage.removeItem(COOLDOWN_KEY);
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
    setLoading(true);
    setError(null);

    getTrending({
      city: "Huntsville",
      category: categoryParam,
      time_window: "7d",
      limit: 10,
      sort: "trending",
    })
      .then((data) => {
        if (isActive) setPlaces(data);
      })
      .catch(() => {
        if (isActive) setError("Could not load trending spots.");
      })
      .finally(() => {
        if (isActive) setLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [categoryParam]);

  useEffect(() => {
    if (!toast) return;
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2400);
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, [toast]);

  useEffect(() => {
    return () => {
      if (shuffleTimer.current) clearTimeout(shuffleTimer.current);
    };
  }, []);

  // Sticky shuffle now handled by CSS on the button container.

  const handleOpenMaps = (place: Place) => {
    const query = buildMapsQuery(place.name, place.address ?? null);
    const link = getPreferredMapsLink(query);
    track("open_in_maps", {
      ...buildPlaceProps(place),
      provider: isIOS() ? "apple" : "google",
    });
    window.open(link, "_blank", "noopener,noreferrer");
  };

  const handleSelectPlace = (place: Place, rankPosition?: number) => {
    track("place_open_modal", {
      ...buildPlaceProps(
        place,
        rankPosition && rankPosition <= 3 ? "top_3" : "more_places"
      ),
    });
    setVoteTarget(place);
  };

  const handleVoteForPlace = async (
    place: Place,
    vote: VoteValue,
    surface: "card" | "modal"
  ) => {
    if (!sessionId) {
      setToast("Try again in a moment.");
      return;
    }
    const remaining = getCooldownRemaining(place.id);
    if (remaining > 0) {
      setToast("You can vote again tomorrow.");
      return;
    }
    setVoteSubmitting(true);
    try {
      const voteResponse = await submitVote({
        place_id: place.id,
        vote,
        session_id: sessionId,
      });
      track("vote_cast", {
        ...buildPlaceProps(place),
        verdict: vote,
        surface,
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
      setToast("Vote saved");
    } catch {
      setToast("Vote failed. Try again later.");
    } finally {
      setVoteSubmitting(false);
    }
  };

  const handleVote = async (vote: VoteValue) => {
    if (!voteTarget) return;
    await handleVoteForPlace(voteTarget, vote, "modal");
    setVoteTarget(null);
  };

  const handleRefresh = () => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(20);
    }
    setShuffleActive(true);
    if (shuffleTimer.current) clearTimeout(shuffleTimer.current);
    shuffleTimer.current = setTimeout(() => setShuffleActive(false), 220);
    setPlaces((prev) =>
      prev.length > 3
        ? [...prev.slice(0, 3), ...shufflePlaces(prev.slice(3))]
        : prev
    );
    track("shuffle_click", { surface: "discover" });
  };

  const handleSelectCategory = (category: string) => {
    setInitialLoad(false);
    setSelectedCategory(category);
  };

  const handleSheetTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    sheetTouchStart.current = event.touches[0]?.clientY ?? null;
  };

  const handleSheetTouchMove = (event: TouchEvent<HTMLDivElement>) => {
    if (!sheetTouchStart.current) return;
    const current = event.touches[0]?.clientY ?? sheetTouchStart.current;
    if (current - sheetTouchStart.current > 70) {
      setVoteTarget(null);
      sheetTouchStart.current = null;
    }
  };

  const displayPlaces = places.slice(0, 10);
  const topPlaces = displayPlaces.slice(0, 3);
  const morePlaces = displayPlaces.slice(3);
  const topKey = useMemo(
    () => topPlaces.map((place) => String(place.id)).join("|"),
    [topPlaces]
  );
  const moreKey = useMemo(
    () => morePlaces.map((place) => String(place.id)).join("|"),
    [morePlaces]
  );

  useEffect(() => {
    const trackSection = (
      section: PlaceSection,
      list: Place[],
      key: string
    ) => {
      if (list.length === 0) return;
      const current = impressionsRef.current[section];
      if (!current || current.key !== key) {
        impressionsRef.current[section] = { key, seen: new Set() };
      }
      const state = impressionsRef.current[section];
      list.forEach((place) => {
        const id = String(place.id);
        if (state.seen.has(id)) return;
        state.seen.add(id);
        track("places_impression", buildPlaceProps(place, section));
      });
    };

    trackSection("top_3", topPlaces, topKey);
    trackSection("more_places", morePlaces, moreKey);
  }, [topPlaces, morePlaces, topKey, moreKey]);

  const theme =
    CATEGORY_THEME[selectedCategory] ?? CATEGORY_THEME["Local Favorite"];
  const themeStyle: CSSProperties = {
    ["--primary" as string]: theme.primary,
    ["--primary-dark" as string]: theme.dark,
    ["--primary-soft" as string]: theme.soft,
  };

  return (
    <div
      className="relative flex min-h-screen w-full flex-col overflow-x-hidden pb-28"
      style={themeStyle}
    >
      <header className="fixed top-0 left-0 z-50 w-full border-b border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur-md transition-all">
        <div className="mx-auto flex w-full max-w-none flex-col gap-3 px-4 py-4 sm:px-6 lg:px-10 2xl:px-16">
          <TopBar />
        </div>
      </header>

      <main className="flex w-full flex-1 flex-col pt-[96px]">
        <div className="mx-auto w-full max-w-none px-4 pt-8 pb-4 sm:px-6 lg:px-10 2xl:px-16">
          <h1 className="font-display text-[34px] font-extrabold leading-[1.1] tracking-tight text-[var(--text)]">
            Hungry in
            <br />
            Huntsville?
          </h1>
          <p className="mt-2 text-[15px] font-medium text-[var(--text-muted)]">
            Curated picks for the indecisive eater.
          </p>
        </div>

        <div className="sticky top-[96px] z-20 w-full">
          <div className="mx-auto flex w-full max-w-none flex-col gap-4 px-4 pb-4 sm:px-6 lg:px-10 2xl:px-16">
            <CategoryChips
              categories={CATEGORIES}
              selected={selectedCategory}
              onSelect={handleSelectCategory}
            />
          </div>
        </div>

        <div className="mx-auto flex w-full max-w-none flex-col gap-4 px-4 pb-8 sm:px-6 lg:px-10 2xl:px-16">
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, index) => (
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
          ) : displayPlaces.length === 0 ? (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-center text-sm text-[var(--text-muted)]">
              No places yet. Try a different category.
            </div>
          ) : (
            <div className="space-y-6">
              <div className="sticky top-[96px] z-30 -mx-2 flex items-center justify-between rounded-2xl bg-[var(--bg)]/90 px-2 py-2 backdrop-blur">
                <h2 className="text-lg font-semibold text-[var(--text)]">
                  {displayPlaces.length < 3
                    ? "Top Picks This Week"
                    : "Top 3 Places This Week"}
                </h2>
                <span className="text-xs text-[var(--text-muted)]">
                  Updated recently
                </span>
              </div>
              <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(260px,1fr))]">
              {topPlaces.map((place, index) => {
                const votes = computeVoteCounts(place);
                const chips = getCategoryChips(place, 3);
                const status = buildStatus(place);
                const remaining = getCooldownRemaining(place.id);
                const cooldownLabel =
                  remaining > 0 ? formatRemaining(remaining) : null;
                const feedback = voteFeedback[String(place.id)];
                const activeVote = feedback?.vote ?? null;
                const animateVote =
                  !!feedback && now - feedback.at < FEEDBACK_WINDOW_MS;
                const span =
                  index === 0 ? "md:col-span-2 xl:col-span-2" : "";
                return (
                  <div key={String(place.id)} className={span}>
                    <PlaceCard
                      place={place}
                      rank={index + 1}
                      chips={chips}
                      statusLabel={status}
                      voteCounts={votes}
                      cooldownLabel={cooldownLabel}
                      activeVote={activeVote}
                      animateVote={animateVote}
                      onCooldownClick={() =>
                        setToast(`Next vote in ${formatRemaining(remaining)}`)
                      }
                      size={index === 0 ? "hero" : "stacked"}
                      onSelect={(value) => handleSelectPlace(value, index + 1)}
                      onVote={(place, vote) =>
                        handleVoteForPlace(place, vote, "card")
                      }
                    />
                  </div>
                );
                })}
              </div>

              {displayPlaces.length > 3 ? (
                <div className="space-y-4">
                  <div className="sticky top-[96px] z-30 -mx-2 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[var(--bg)]/90 px-2 py-2 backdrop-blur">
                    <h2 className="text-lg font-semibold text-[var(--text)]">
                      More Places Worth Trying
                    </h2>
                    <div className="sticky top-[96px] z-40">
                      <button
                        type="button"
                        onClick={handleRefresh}
                        className={`group relative flex h-11 items-center justify-center overflow-hidden rounded-2xl bg-[var(--primary)] px-4 text-sm font-semibold text-white shadow-[var(--shadow-soft)] transition-all duration-200 hover:bg-[var(--primary-dark)] active:scale-[0.98] ${
                          shuffleActive ? "scale-[0.99]" : ""
                        }`}
                        aria-pressed={shuffleActive}
                      >
                        <span
                          className={`material-symbols-outlined mr-2 text-lg transition-transform duration-500 ${
                            shuffleActive ? "rotate-180" : "group-hover:rotate-180"
                          }`}
                        >
                          shuffle
                        </span>
                        Shuffle
                      </button>
                    </div>
                  </div>
                  <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(260px,1fr))]">
                    {morePlaces.map((place, index) => {
                      const votes = computeVoteCounts(place);
                      const chips = getCategoryChips(place, 3);
                      const status = buildStatus(place);
                      const remaining = getCooldownRemaining(place.id);
                      const cooldownLabel =
                        remaining > 0 ? formatRemaining(remaining) : null;
                      const feedback = voteFeedback[String(place.id)];
                      const activeVote = feedback?.vote ?? null;
                      const animateVote =
                        !!feedback && now - feedback.at < FEEDBACK_WINDOW_MS;
                      return (
                        <div key={String(place.id)}>
                          <PlaceCard
                            place={place}
                            rank={index + 4}
                            chips={chips}
                            statusLabel={status}
                            voteCounts={votes}
                            cooldownLabel={cooldownLabel}
                            activeVote={activeVote}
                            animateVote={animateVote}
                            onCooldownClick={() =>
                              setToast(
                                `Next vote in ${formatRemaining(remaining)}`
                              )
                            }
                            size="stacked"
                            onSelect={(value) =>
                              handleSelectPlace(value, index + 4)
                            }
                            onVote={(place, vote) =>
                              handleVoteForPlace(place, vote, "card")
                            }
                        />
                      </div>
                    );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </main>

      <nav className="fixed bottom-0 left-0 z-50 w-full border-t border-slate-100 bg-[var(--surface)]/95 backdrop-blur-md shadow-[var(--shadow-nav)]">
        <div className="mx-auto flex h-[84px] max-w-none items-start justify-around px-4 pt-3 pb-8 sm:px-6 lg:px-10 2xl:px-16">
          <button
            type="button"
            className="group flex flex-1 flex-col items-center gap-1.5"
            aria-current="page"
          >
            <div className="rounded-full bg-[var(--primary-soft)] p-1 transition-colors">
              <span className="material-symbols-outlined filled text-[26px] text-[var(--primary)]">
                explore
              </span>
            </div>
            <span className="text-[11px] font-bold text-[var(--primary)]">
              Discover
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
          <Link
            href="/info"
            className="group flex flex-1 flex-col items-center gap-1.5 text-slate-400 transition-colors hover:text-slate-600"
          >
            <div className="rounded-full p-1 transition-colors group-hover:bg-[var(--surface-2)]">
              <span className="material-symbols-outlined text-[26px]">
                info
              </span>
            </div>
            <span className="text-[11px] font-medium">Info</span>
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
            onTouchStart={handleSheetTouchStart}
            onTouchMove={handleSheetTouchMove}
          >
            <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
                  {pickCategory(voteTarget)}
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

            <div className="grid gap-6 px-6 py-6 lg:grid-cols-[1.2fr_1fr]">
              <div className="space-y-6">
                <div>
                  <p className="text-base font-medium text-[var(--text-muted)]">
                    Classic Dive & Slices in Downtown Huntsville
                  </p>
                  {voteTarget.address ? (
                    <p className="mt-2 text-sm text-[var(--text-muted)]">
                      {voteTarget.address}
                    </p>
                  ) : null}
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-3 text-center">
                    <p className="text-xs font-semibold text-[var(--text-muted)]">
                      Distance
                    </p>
                    <p className="text-sm font-bold text-[var(--text)]">
                      1.2 mi
                    </p>
                  </div>
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-3 text-center">
                    <p className="text-xs font-semibold text-[var(--text-muted)]">
                      Hours
                    </p>
                    <p className="text-sm font-bold text-[var(--text)]">
                      Until 2 AM
                    </p>
                  </div>
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-3 text-center">
                    <p className="text-xs font-semibold text-[var(--text-muted)]">
                      Price
                    </p>
                    <p className="text-sm font-bold text-[var(--text)]">$$</p>
                  </div>
                </div>

              </div>

              <div className="space-y-5">
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-lg font-bold text-[var(--text)]">
                        Verdict
                      </h4>
                      <p className="text-sm text-[var(--text-muted)]">
                        {computeVoteCounts(voteTarget).total} student votes
                      </p>
                    </div>
                    <div className="flex -space-x-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700 ring-2 ring-[var(--surface-2)]">
                        JD
                      </div>
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-700 ring-2 ring-[var(--surface-2)]">
                        MK
                      </div>
                      <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-xs font-bold text-[var(--text-muted)] ring-2 ring-[var(--surface-2)]">
                        +
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-4 text-sm font-semibold text-[var(--text-muted)]">
                    <span className="inline-flex items-center gap-2">
                      <span className="flex h-8 w-8 items-center justify-center text-[var(--success)]">
                        <span className="material-symbols-outlined text-[18px]">
                          thumb_up
                        </span>
                      </span>
                      {computeVoteCounts(voteTarget).worth}
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <span className="flex h-8 w-8 items-center justify-center text-[var(--warning)]">
                        <span className="material-symbols-outlined text-[18px]">
                          sentiment_neutral
                        </span>
                      </span>
                      {computeVoteCounts(voteTarget).mid}
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <span className="flex h-8 w-8 items-center justify-center text-[var(--danger)]">
                        <span className="material-symbols-outlined text-[18px]">
                          thumb_down
                        </span>
                      </span>
                      {computeVoteCounts(voteTarget).skip}
                    </span>
                  </div>

                  <div className="mt-4">
                    {voteTarget &&
                    getCooldownRemaining(voteTarget.id) > 0 &&
                    !(
                      voteFeedback[String(voteTarget.id)] &&
                      now - (voteFeedback[String(voteTarget.id)]?.at ?? 0) <
                        FEEDBACK_WINDOW_MS
                    ) ? (
                      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-center text-xs font-semibold text-[var(--text-muted)]">
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

      {toast ? (
        <div className="fixed bottom-[104px] left-1/2 z-50 -translate-x-1/2 rounded-full bg-[var(--text)] px-4 py-2 text-sm font-semibold text-[var(--bg)] shadow-[var(--shadow-soft)]">
          {toast}
        </div>
      ) : null}
    </div>
  );
}
