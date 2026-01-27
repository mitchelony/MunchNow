"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import CategoryChips from "@/components/CategoryChips";
import PlaceCard from "@/components/PlaceCard";
import TopBar from "@/components/TopBar";
import VoteButtons from "@/components/VoteButtons";
import { getOrCreateSessionId, getTrending, submitVote } from "@/lib/api";
import { buildMapsQuery, getPreferredMapsLink } from "@/lib/maps";
import type { Place, VoteValue } from "@/lib/types";

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

function getCategoryChips(place: Place, max: number) {
  const chips = new Set<string>();
  if (place.categories) {
    place.categories.forEach((value) => {
      if (chips.size < max) chips.add(formatCategoryLabel(value));
    });
  }
  if (chips.size < max && place.category) {
    chips.add(formatCategoryLabel(place.category));
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

function applyVoteToPlace(place: Place, vote: VoteValue) {
  const counts = computeVoteCounts(place);
  const next = { ...place };
  if (vote === "worth_it") next.worth_it_count = counts.worth + 1;
  if (vote === "mid") next.mid_count = counts.mid + 1;
  if (vote === "skip") next.skip_count = counts.skip + 1;
  next.total_votes = counts.total + 1;
  return next;
}

export default function HomePage() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("Quick Bites");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [voteTarget, setVoteTarget] = useState<Place | null>(null);
  const [voteSubmitting, setVoteSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sheetTouchStart = useRef<number | null>(null);

  const [initialLoad, setInitialLoad] = useState(true);

  const categoryParam = useMemo(() => {
    if (initialLoad) return undefined;
    return CATEGORY_TO_API[selectedCategory];
  }, [selectedCategory, initialLoad]);

  useEffect(() => {
    setSessionId(getOrCreateSessionId());
  }, []);

  useEffect(() => {
    let isActive = true;
    setLoading(true);
    setError(null);

    getTrending({
      city: "Huntsville",
      category: categoryParam,
      time_window: "7d",
      limit: 12,
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
  }, [categoryParam, refreshKey]);

  useEffect(() => {
    if (!toast) return;
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2400);
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, [toast]);

  const handleOpenMaps = (place: Place) => {
    const query = buildMapsQuery(place.name, place.address ?? null);
    const link = getPreferredMapsLink(query);
    window.open(link, "_blank", "noopener,noreferrer");
  };

  const handleSelectPlace = (place: Place) => {
    setVoteTarget(place);
  };

  const handleVote = async (vote: VoteValue) => {
    if (!voteTarget) return;
    setVoteSubmitting(true);
    try {
      await submitVote({
        place_id: voteTarget.id,
        vote,
        session_id: sessionId,
      });
      setPlaces((prev) =>
        prev.map((place) =>
          place.id === voteTarget.id ? applyVoteToPlace(place, vote) : place
        )
      );
      setVoteTarget((prev) => (prev ? applyVoteToPlace(prev, vote) : prev));
      setToast("Vote saved");
    } catch {
      setToast("Vote failed. Try again later.");
    } finally {
      setVoteSubmitting(false);
      setVoteTarget(null);
    }
  };

  const handleRefresh = () => {
    setRefreshKey((value) => value + 1);
  };

  const handleSelectCategory = (category: string) => {
    setInitialLoad(false);
    setSelectedCategory(category);
  };

  const handleSheetTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    sheetTouchStart.current = event.touches[0]?.clientY ?? null;
  };

  const handleSheetTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    if (!sheetTouchStart.current) return;
    const current = event.touches[0]?.clientY ?? sheetTouchStart.current;
    if (current - sheetTouchStart.current > 70) {
      setVoteTarget(null);
      sheetTouchStart.current = null;
    }
  };

  const featured = places.slice(0, 3);
  const quickPicks = places.slice(3, 12);

  return (
    <main className="min-h-screen">
      <div className="relative overflow-hidden">
        <div className="absolute -top-36 left-0 right-0 h-72 bg-[radial-gradient(circle_at_top,_var(--accent-soft),_transparent)]" />
        <div className="absolute -top-12 right-0 h-56 w-56 rounded-full bg-[radial-gradient(circle_at_center,_var(--accent-soft),_transparent)]" />
        <div className="relative mx-auto flex max-w-[520px] flex-col gap-6 px-4 pb-14 pt-24 sm:max-w-[760px] sm:px-6 lg:max-w-[1200px] lg:gap-8 lg:px-10 xl:max-w-[1320px]">
          <div className="sticky top-0 z-30 -mx-4 bg-[var(--bg)]/95 px-4 pb-4 pt-4 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10">
            <TopBar />
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-3xl font-semibold text-[var(--text)] sm:text-4xl">
                  What&apos;s worth it right now?
                </h1>
                <div className="mt-2 flex items-center gap-2 text-xs text-[var(--text-muted)]">
                  <span className="h-2 w-2 animate-pulse-slow rounded-full bg-[var(--accent)]" />
                  Updated this week • Live votes
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleRefresh}
                  className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-4 py-2 text-xs font-semibold text-[var(--text)] transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
                >
                  Shuffle picks
                </button>
                <span className="rounded-full bg-[var(--accent-soft)] px-3 py-2 text-xs font-semibold text-[var(--accent)]">
                  {places.length} spots
                </span>
              </div>
            </div>
            <div className="mt-4">
              <CategoryChips
                categories={CATEGORIES}
                selected={selectedCategory}
                onSelect={handleSelectCategory}
              />
            </div>
          </div>

          <div className="grid gap-8 lg:grid-cols-[3fr_2fr] lg:items-start">
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Featured picks</h2>
                <span className="text-xs text-[var(--text-muted)]">
                  Updated recently
                </span>
              </div>
              {loading ? (
                <div className="space-y-3">
                  <div className="h-36 rounded-3xl bg-[var(--surface-2)] animate-pulse" />
                  <div className="h-24 rounded-2xl bg-[var(--surface-2)] animate-pulse" />
                  <div className="h-24 rounded-2xl bg-[var(--surface-2)] animate-pulse" />
                </div>
              ) : error ? (
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-center text-sm text-[var(--text-muted)]">
                  {error}
                </div>
              ) : featured.length === 0 ? (
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-center text-sm text-[var(--text-muted)]">
                  No places yet. Try a different category.
                </div>
              ) : (
                <div className="space-y-3">
                  {featured.map((place, index) => {
                    const votes = computeVoteCounts(place);
                    const chips = getCategoryChips(place, 2);
                    const status = buildStatus(place);
                    return (
                      <PlaceCard
                        key={String(place.id)}
                        place={place}
                        rank={index + 1}
                        chips={chips}
                        statusLabel={status}
                        votesLabel={`${votes.total} votes`}
                        size={index === 0 ? "hero" : "stacked"}
                        onSelect={handleSelectPlace}
                      />
                    );
                  })}
                </div>
              )}
            </section>

            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Quick picks</h2>
                <span className="text-xs text-[var(--text-muted)]">
                  Tap to see more
                </span>
              </div>
              {loading ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <div
                      key={`skeleton-${index}`}
                      className="h-20 rounded-2xl bg-[var(--surface-2)] animate-pulse"
                    />
                  ))}
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
                  {quickPicks.map((place) => {
                    const votes = computeVoteCounts(place);
                    const chips = getCategoryChips(place, 1);
                    const status = buildStatus(place);
                    return (
                      <PlaceCard
                        key={String(place.id)}
                        place={place}
                        chips={chips}
                        statusLabel={status}
                        votesLabel={`${votes.total} votes`}
                        size="compact"
                        onSelect={handleSelectPlace}
                      />
                    );
                  })}
                </div>
              )}
            </section>
          </div>

          <p className="text-center text-xs text-[var(--text-muted)]">
            Tap a place, open maps, then drop a quick vote.
          </p>
        </div>
      </div>

      {voteTarget ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 backdrop-blur-sm md:items-center">
          <div
            className="w-full max-w-md rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow)] md:max-w-lg"
            onTouchStart={handleSheetTouchStart}
            onTouchMove={handleSheetTouchMove}
          >
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-[var(--border)]" />
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
                  {pickCategory(voteTarget)}
                </p>
                <h3 className="text-xl font-semibold">{voteTarget.name}</h3>
                {voteTarget.address ? (
                  <p className="text-xs text-[var(--text-muted)]">
                    {voteTarget.address}
                  </p>
                ) : null}
                <p className="text-xs text-[var(--text-muted)]">
                  Based on votes in the last 7 days
                </p>
              </div>
              <button
                type="button"
                onClick={() => setVoteTarget(null)}
                className="rounded-full border border-[var(--border)] px-3 py-1 text-xs font-semibold text-[var(--text-muted)]"
              >
                Close
              </button>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2 text-xs font-semibold text-[var(--text-muted)]">
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-center">
                Worth it {computeVoteCounts(voteTarget).worth}
              </div>
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-center">
                Mid {computeVoteCounts(voteTarget).mid}
              </div>
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-center">
                Not worth it {computeVoteCounts(voteTarget).skip}
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleOpenMaps(voteTarget)}
              className="mt-4 w-full rounded-2xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-strong)]"
            >
              Open in Maps
            </button>

            <VoteButtons onVote={handleVote} isSubmitting={voteSubmitting} />
          </div>
        </div>
      ) : null}

      {toast ? (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-[var(--text)] px-4 py-2 text-sm font-semibold text-[var(--bg)] shadow-[var(--shadow-soft)]">
          {toast}
        </div>
      ) : null}
    </main>
  );
}
