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
import { getCampuses, getOrCreateSessionId, getTrending, submitVote } from "../lib/api";
import { track } from "../lib/analytics";
import { buildMapsQuery, getPreferredMapsLink, isIOS } from "../lib/maps";
import type { Campus, Place, VoteResponse, VoteValue } from "../lib/types";

const CATEGORIES = [
  "All",
  "Fast Food",
  "Cheap",
  "Late Night",
  "Coffee",
  "Local Favorite",
  "Pizza",
  "Sit Down",
  "American",
  "Chinese",
  "Dessert",
  "Japanese",
  "Korean",
  "Mediterranean",
  "Mexican",
  "Middle Eastern",
  "Thai",
  "Vietnamese",
];

const FALLBACK_CATEGORY = "Local Favorite";
const CATEGORY_TO_API: Record<string, string> = {
  American: "american",
  Cheap: "cheap",
  Chinese: "chinese",
  Coffee: "coffee",
  Dessert: "dessert",
  "Fast Food": "fast_food",
  Japanese: "japanese",
  Korean: "korean",
  "Late Night": "late_night",
  "Local Favorite": "local_favorite",
  Mediterranean: "mediterranean",
  Mexican: "mexican",
  "Middle Eastern": "middle_eastern",
  Pizza: "pizza",
  "Sit Down": "sit_down",
  Thai: "thai",
  Vietnamese: "vietnamese",
};

const CATEGORY_THEME: Record<string, { primary: string; dark: string; soft: string }> =
  {
    All: {
      primary: "#64748b",
      dark: "#475569",
      soft: "rgba(100, 116, 139, 0.18)",
    },
    American: {
      primary: "#ef4444",
      dark: "#dc2626",
      soft: "rgba(239, 68, 68, 0.16)",
    },
    Cheap: {
      primary: "#10b981",
      dark: "#059669",
      soft: "rgba(16, 185, 129, 0.16)",
    },
    Chinese: {
      primary: "#f97316",
      dark: "#ea580c",
      soft: "rgba(249, 115, 22, 0.16)",
    },
    Coffee: {
      primary: "#a16207",
      dark: "#854d0e",
      soft: "rgba(161, 98, 7, 0.18)",
    },
    Dessert: {
      primary: "#ec4899",
      dark: "#db2777",
      soft: "rgba(236, 72, 153, 0.16)",
    },
    "Fast Food": {
      primary: "#f59e0b",
      dark: "#d97706",
      soft: "rgba(245, 158, 11, 0.16)",
    },
    Japanese: {
      primary: "#0ea5e9",
      dark: "#0284c7",
      soft: "rgba(14, 165, 233, 0.16)",
    },
    Korean: {
      primary: "#7c3aed",
      dark: "#6d28d9",
      soft: "rgba(124, 58, 237, 0.16)",
    },
    "Late Night": {
      primary: "#8b5cf6",
      dark: "#7c3aed",
      soft: "rgba(139, 92, 246, 0.16)",
    },
    "Local Favorite": {
      primary: "#3b82f6",
      dark: "#2563eb",
      soft: "rgba(59, 130, 246, 0.16)",
    },
    Mediterranean: {
      primary: "#14b8a6",
      dark: "#0d9488",
      soft: "rgba(20, 184, 166, 0.16)",
    },
    Mexican: {
      primary: "#22c55e",
      dark: "#16a34a",
      soft: "rgba(34, 197, 94, 0.16)",
    },
    "Middle Eastern": {
      primary: "#f472b6",
      dark: "#ec4899",
      soft: "rgba(244, 114, 182, 0.16)",
    },
    Pizza: {
      primary: "#fb7185",
      dark: "#f43f5e",
      soft: "rgba(251, 113, 133, 0.16)",
    },
    "Sit Down": {
      primary: "#64748b",
      dark: "#475569",
      soft: "rgba(100, 116, 139, 0.18)",
    },
    Thai: {
      primary: "#06b6d4",
      dark: "#0891b2",
      soft: "rgba(6, 182, 212, 0.16)",
    },
    Vietnamese: {
      primary: "#84cc16",
      dark: "#65a30d",
      soft: "rgba(132, 204, 22, 0.16)",
    },
  };

const UNCATEGORIZED_LABEL = "Uncategorized";

function formatCategoryLabel(value?: string | number | null) {
  if (value === null || value === undefined) return "";
  const normalized = String(value).replace(/[_-]+/g, " ").toLowerCase();
  return normalized
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function pickCategory(place: Place) {
  const fromArray = place.categories?.[0];
  const candidate = fromArray ?? place.category ?? null;
  const label = formatCategoryLabel(candidate);
  return label || UNCATEGORIZED_LABEL;
}

type PlaceSection = "top_3" | "more_places";

function buildPlaceProps(
  place: Place,
  section?: PlaceSection,
  campusId?: number | null
) {
  const distance =
    (place as { distance_miles?: number | null }).distance_miles ?? null;
  return {
    place_id: place.id,
    place_name: place.name,
    section,
    tags: place.categories?.length ? place.categories : undefined,
    price_tier: place.price_tier ?? null,
    distance_miles: distance ?? undefined,
    campus_id: campusId ?? undefined,
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
  if (chips.size === 0) chips.add(UNCATEGORIZED_LABEL);
  return Array.from(chips).slice(0, max);
}

function computeVoteCounts(place: Place) {
  const worth = place.worth_it_count ?? 0;
  const mid = place.mid_count ?? 0;
  const skip = place.skip_count ?? 0;
  const total = place.total_votes ?? worth + mid + skip;
  return { worth, mid, skip, total };
}

function formatDistanceMiles(distance?: number | null) {
  if (typeof distance !== "number" || Number.isNaN(distance)) return "—";
  const rounded = distance < 10 ? distance.toFixed(1) : distance.toFixed(0);
  return `${rounded} mi`;
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
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [campusId, setCampusId] = useState<number | null>(null);
  const [campusPickerOpen, setCampusPickerOpen] = useState(false);
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
  const selectedCampus = useMemo(
    () => campuses.find((campus) => campus.id === campusId) ?? null,
    [campuses, campusId]
  );

  const categoryParam = useMemo(() => {
    if (initialLoad) return undefined;
    return CATEGORY_TO_API[selectedCategory];
  }, [selectedCategory, initialLoad]);

  useEffect(() => {
    setSessionId(getOrCreateSessionId());
  }, []);

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
      city: "Huntsville",
      category: categoryParam,
      time_window: "7d",
      limit: 20,
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
  }, [categoryParam, campusId]);

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
      ...buildPlaceProps(place, undefined, campusId),
      provider: isIOS() ? "apple" : "google",
    });
    window.open(link, "_blank", "noopener,noreferrer");
  };

  const handleSelectPlace = (place: Place, rankPosition?: number) => {
    track("place_open_modal", {
      ...buildPlaceProps(
        place,
        rankPosition && rankPosition <= 3 ? "top_3" : "more_places",
        campusId
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
        ...buildPlaceProps(place, undefined, campusId),
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
    if (!campusId) return;
    const pinned = places.slice(0, 3);
    const pinnedIds = new Set(pinned.map((place) => String(place.id)));
    getTrending({
      campusId,
      city: "Huntsville",
      category: categoryParam,
      time_window: "7d",
      limit: 40,
      sort: "trending",
    })
      .then((data) => {
        const pool = data.filter(
          (place) => !pinnedIds.has(String(place.id))
        );
        const next = shufflePlaces(pool).slice(0, 37);
        setPlaces([...pinned, ...next]);
      })
      .catch(() => {
        setPlaces((prev) =>
          prev.length > 3
            ? [...prev.slice(0, 3), ...shufflePlaces(prev.slice(3))]
            : prev
        );
      });
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

  const displayPlaces = places.slice(0, 20);
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
        track("places_impression", buildPlaceProps(place, section, campusId));
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
          <TopBar
            campusName={
              selectedCampus?.short_name ?? selectedCampus?.name ?? null
            }
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
                      setCampusId(campus.id);
                      setCampusPickerOpen(false);
                      if (typeof window !== "undefined") {
                        window.localStorage.setItem(
                          "munchhsv_campus_id",
                          String(campus.id)
                        );
                      }
                      track("campus_selected", {
                        campus_id: campus.id,
                        campus_name: campus.name,
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
            Hungry in
            <br />
            Huntsville?
          </h1>
          <p className="mt-2 text-[15px] font-medium text-[var(--text-muted)]">
            Curated picks for the indecisive eater.
          </p>
          {selectedCampus ? (
            <button
              type="button"
              onClick={() => setCampusPickerOpen(true)}
              className="mt-3 inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-xs font-semibold text-[var(--text)] transition hover:bg-[var(--surface-2)]"
            >
              <span className="material-symbols-outlined text-[16px] text-[var(--primary)]">
                school
              </span>
              Campus: {selectedCampus.short_name ?? selectedCampus.name}
            </button>
          ) : null}
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
                      scoreWeights={{ popularity: 0.85, distance: 0.15 }}
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
                          className={`material-symbols-outlined mr-2 text-lg transition-transform duration-700 ${
                            shuffleActive
                              ? "rotate-[540deg]"
                              : "group-hover:rotate-[360deg]"
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
                            scoreWeights={{ popularity: 0.85, distance: 0.15 }}
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
            href="/close"
            className="group flex flex-1 flex-col items-center gap-1.5 text-slate-400 transition-colors hover:text-slate-600"
          >
            <div className="rounded-full p-1 transition-colors group-hover:bg-[var(--surface-2)]">
              <span className="material-symbols-outlined text-[26px]">
                near_me
              </span>
            </div>
            <span className="text-[11px] font-medium">Close to you</span>
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
                      {formatDistanceMiles(voteTarget.distance_miles ?? null)}
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

              </div>

              <div className="space-y-5">
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
