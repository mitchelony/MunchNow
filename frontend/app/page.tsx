"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import Image from "next/image";
import ThemeToggle from "../components/ThemeToggle";
import AppNav from "../components/redesign/AppNav";
import CampusPickerModal from "../components/redesign/CampusPickerModal";
import PlaceDetailModal from "../components/redesign/PlaceDetailModal";
import {
  getCampuses,
  getOrCreateSessionId,
  getTrending,
  submitVote,
} from "../lib/api";
import { extractCategoryChips, toApiCategory } from "../lib/tags";
import type { Campus, Place, VoteResponse, VoteValue } from "../lib/types";
import {
  formatCooldown,
  getVoteCooldown,
  getVoteRecords,
  saveVoteRecord,
  type StoredVoteRecord,
} from "../lib/voteCooldown";

const CATEGORIES = [
  "All",
  "Fast Food",
  "Local Faves",
  "Sit Down",
  "Budget",
  "American",
  "Mexican",
  "Chinese",
  "Japanese",
  "Korean",
  "Thai",
  "Vietnamese",
  "Mediterranean",
  "Middle Eastern",
];

const CATEGORY_THEME: Record<string, { primary: string; dark: string; light: string }> = {
  All: { primary: "#6366f1", dark: "#4f46e5", light: "rgba(99,102,241,0.14)" },
  "Fast Food": { primary: "#f59e0b", dark: "#d97706", light: "rgba(245,158,11,0.16)" },
  "Local Faves": { primary: "#10b981", dark: "#059669", light: "rgba(16,185,129,0.16)" },
  "Sit Down": { primary: "#8b5cf6", dark: "#7c3aed", light: "rgba(139,92,246,0.16)" },
  Budget: { primary: "#22c55e", dark: "#16a34a", light: "rgba(34,197,94,0.16)" },
  American: { primary: "#3b82f6", dark: "#2563eb", light: "rgba(59,130,246,0.16)" },
  Mexican: { primary: "#f97316", dark: "#ea580c", light: "rgba(249,115,22,0.16)" },
  Chinese: { primary: "#ef4444", dark: "#dc2626", light: "rgba(239,68,68,0.16)" },
  Japanese: { primary: "#6366f1", dark: "#4f46e5", light: "rgba(99,102,241,0.16)" },
  Korean: { primary: "#e11d48", dark: "#be123c", light: "rgba(225,29,72,0.16)" },
  Thai: { primary: "#f59e0b", dark: "#d97706", light: "rgba(245,158,11,0.16)" },
  Vietnamese: { primary: "#14b8a6", dark: "#0f766e", light: "rgba(20,184,166,0.16)" },
  Mediterranean: { primary: "#0ea5e9", dark: "#0284c7", light: "rgba(14,165,233,0.16)" },
  "Middle Eastern": { primary: "#a855f7", dark: "#9333ea", light: "rgba(168,85,247,0.16)" },
};

function computeVoteCounts(place: Place) {
  const worth = place.worth_it_count ?? 0;
  const mid = place.mid_count ?? 0;
  const skip = place.skip_count ?? 0;
  const total = place.total_votes ?? worth + mid + skip;
  return { worth, mid, skip, total };
}

function formatDistance(distance?: number | null) {
  if (typeof distance !== "number" || Number.isNaN(distance)) return "-";
  return distance < 10 ? `${distance.toFixed(1)} mi` : `${distance.toFixed(0)} mi`;
}

function formatPriceTier(price?: number | string | null) {
  if (!price) return "-";
  if (typeof price === "number") {
    const count = Math.min(Math.max(price, 1), 4);
    return "$".repeat(count);
  }
  const numeric = Number(price);
  if (Number.isFinite(numeric)) {
    const count = Math.min(Math.max(Math.round(numeric), 1), 4);
    return "$".repeat(count);
  }
  return String(price);
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

export default function HomePage() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [campusId, setCampusId] = useState<number | null>(null);
  const [campusPickerOpen, setCampusPickerOpen] = useState(false);
  const [voteSubmitting, setVoteSubmitting] = useState(false);
  const [voteRecords, setVoteRecords] = useState<Record<string, StoredVoteRecord>>({});
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const selectedCampus = useMemo(
    () => campuses.find((campus) => campus.id === campusId) ?? null,
    [campuses, campusId]
  );

  const categoryParam = useMemo(() => toApiCategory(selectedCategory), [selectedCategory]);

  useEffect(() => {
    setSessionId(getOrCreateSessionId());
  }, []);

  useEffect(() => {
    setVoteRecords(getVoteRecords());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem("munchhsv_campus_id");
    if (stored) {
      const parsed = Number(stored);
      if (Number.isFinite(parsed)) setCampusId(parsed);
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
        if (!campusId && data[0]) {
          setCampusId(data[0].id);
        }
      })
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.error("Failed to load campuses", err);
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
      return () => {
        isActive = false;
      };
    }

    setLoading(true);
    setError(null);
    getTrending({
      campusId,
      city: selectedCampus?.city ?? "Huntsville",
      category: categoryParam,
      time_window: "7d",
      limit: 20,
      sort: "trending",
    })
      .then((data) => {
        if (isActive) setPlaces(data);
      })
      .catch(() => {
        if (isActive) setError("Could not load places.");
      })
      .finally(() => {
        if (isActive) setLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [campusId, categoryParam, selectedCampus?.city]);

  const handleVote = async (place: Place, vote: VoteValue) => {
    if (!sessionId || voteSubmitting) return;
    const cooldown = getVoteCooldown(place.id, Date.now(), voteRecords);
    if (!cooldown.canVote) return;
    setVoteSubmitting(true);
    try {
      const response = await submitVote({
        place_id: place.id,
        vote,
        session_id: sessionId,
      });
      setPlaces((prev) =>
        prev.map((item) => (item.id === place.id ? applyVoteToPlace(item, response) : item))
      );
      const timestamp = Date.now();
      saveVoteRecord(place.id, vote, timestamp);
      setVoteRecords((prev) => ({
        ...prev,
        [String(place.id)]: { type: vote, timestamp },
      }));
    } catch {
      setError("Could not submit vote. Please try again.");
    } finally {
      setVoteSubmitting(false);
    }
  };

  const theme = CATEGORY_THEME[selectedCategory] ?? CATEGORY_THEME["All"];
  const selectedPlace = useMemo(
    () => places.find((place) => String(place.id) === selectedPlaceId) ?? null,
    [places, selectedPlaceId]
  );
  const themeStyle: CSSProperties = {
    ["--primary" as string]: theme.primary,
    ["--primary-dark" as string]: theme.dark,
    ["--primary-soft" as string]: theme.light,
  };

  const handleSelectCampus = (id: number) => {
    setCampusId(id);
    setCampusPickerOpen(false);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("munchhsv_campus_id", String(id));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] pb-32" style={themeStyle}>
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-[#1a1a1a]/95 backdrop-blur border-b border-gray-100 dark:border-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight" style={{ color: theme.primary }}>
                MunchNow
              </h1>
              <button
                type="button"
                onClick={() => setCampusPickerOpen(true)}
                className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-gray-600 dark:text-gray-400"
              >
                <span className="material-symbols-outlined text-[16px]">location_on</span>
                {selectedCampus?.short_name ?? selectedCampus?.name ?? "Pick campus"}
                <span className="material-symbols-outlined text-[16px]">expand_more</span>
              </button>
            </div>
            <div className="flex items-center gap-2">
              <AppNav
                active="discover"
                accentFrom={theme.primary}
                accentTo={theme.dark}
                glowColor={theme.primary}
                showMobile={false}
              />
              <ThemeToggle />
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto overflow-y-hidden scrollbar-hide pb-1 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {CATEGORIES.map((category) => {
              const isActive = selectedCategory === category;
              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => setSelectedCategory(category)}
                  className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-bold border transition ${
                    isActive
                      ? "text-white border-transparent"
                      : "bg-white dark:bg-[#222] text-gray-600 dark:text-gray-300 border-gray-200 dark:border-transparent"
                  }`}
                  style={
                    isActive
                      ? {
                          background: `linear-gradient(135deg, ${theme.primary}, ${theme.dark})`,
                          boxShadow: `0 0 30px ${theme.primary}88, 0 0 58px ${theme.primary}38, 0 4px 16px ${theme.primary}33`,
                        }
                      : undefined
                  }
                >
                  {category}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-64 rounded-3xl skeleton-shimmer" />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-3xl bg-white dark:bg-[#1a1a1a] p-5 text-sm text-gray-600 dark:text-gray-300">
            {error}
          </div>
        ) : places.length === 0 ? (
          <div className="rounded-3xl bg-white dark:bg-[#1a1a1a] p-5 text-sm text-gray-600 dark:text-gray-300">
            No places yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {places.map((place, index) => {
              const votes = computeVoteCounts(place);
              const chips = extractCategoryChips(place, 2);
              const cooldown = getVoteCooldown(place.id, now, voteRecords);
              return (
                <article
                  key={String(place.id)}
                  className="group overflow-hidden rounded-[34px] border border-gray-200 bg-white shadow-xl transition-shadow duration-300 dark:border-white/5 dark:bg-[#17181f]"
                  style={{
                    boxShadow: `0 0 12px ${theme.primary}2f, 0 10px 28px -12px ${theme.primary}52, 0 18px 44px -30px ${theme.primary}22`,
                  }}
                >
                  <div className="relative h-48 w-full overflow-hidden bg-gray-200 dark:bg-[#222]">
                    {place.image_url ? (
                      <Image
                        src={place.image_url}
                        alt={place.name}
                        fill
                        unoptimized
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-slate-700 to-slate-900">
                        <span className="material-symbols-outlined text-4xl text-slate-400">image</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                    {index < 3 ? (
                      <span
                        className="absolute top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-bold text-white shadow-md"
                        style={{ background: `linear-gradient(135deg, ${theme.primary}, ${theme.dark})` }}
                      >
                        <span className="material-symbols-outlined text-[14px]">emoji_events</span>
                        #{index + 1}
                      </span>
                    ) : null}
                  </div>

                  <div className="p-3.5 text-center">
                    <button
                      type="button"
                      onClick={() => setSelectedPlaceId(String(place.id))}
                      className="block w-full break-words text-2xl font-black leading-[1] tracking-tight text-gray-900 transition hover:opacity-90 dark:text-white"
                    >
                      {place.name}
                    </button>
                    <div className="mt-2 flex items-center justify-center gap-3 text-gray-500 dark:text-slate-400">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold">
                        <span className="material-symbols-outlined text-[14px]">location_on</span>
                        {formatDistance(place.distance_miles)}
                      </span>
                      <span className="text-[18px] leading-none font-bold text-gray-500 dark:text-slate-400">
                        {formatPriceTier(place.price_tier)}
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-1.5 justify-center">
                      {chips.map((chip) => (
                        <span
                          key={chip}
                          className="rounded-full bg-gray-100 px-3 py-1 text-[11px] font-bold text-gray-700 dark:bg-white/10 dark:text-slate-200"
                        >
                          {chip}
                        </span>
                      ))}
                    </div>

                    <div className="mt-3.5 grid grid-cols-3 gap-2">
                      <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-emerald-100 p-2 text-center dark:from-emerald-900/45 dark:to-emerald-700/20">
                        <p className="text-lg leading-none font-black text-emerald-400">{votes.worth}</p>
                        <p className="mt-1 text-lg font-bold text-emerald-400">Worth It</p>
                      </div>
                      <div className="rounded-2xl bg-gradient-to-br from-amber-50 to-amber-100 p-2 text-center dark:from-amber-900/45 dark:to-amber-700/20">
                        <p className="text-lg leading-none font-black text-amber-400">{votes.mid}</p>
                        <p className="mt-1 text-lg font-bold text-amber-400">Mid</p>
                      </div>
                      <div className="rounded-2xl bg-gradient-to-br from-rose-50 to-rose-100 p-2 text-center dark:from-rose-900/45 dark:to-rose-700/20">
                        <p className="text-lg leading-none font-black text-rose-400">{votes.skip}</p>
                        <p className="mt-1 text-lg font-bold text-rose-400">Skip</p>
                      </div>
                    </div>

                    {cooldown.remainingTime > 0 ? (
                      <div className="mt-3.5 rounded-3xl bg-gradient-to-r from-blue-50 to-indigo-50 px-3.5 py-3 text-left dark:from-indigo-900/45 dark:to-blue-900/35">
                        <div className="flex items-center gap-3">
                          <span className="material-symbols-outlined text-[26px] text-blue-700 dark:text-white">check</span>
                          <div>
                            <p className="text-lg font-black text-gray-900 dark:text-white">Vote Recorded!</p>
                            <p className="text-xs font-semibold text-gray-600 dark:text-slate-300">
                              Next vote:{" "}
                              <span className="font-mono text-blue-700 dark:text-blue-300">
                                {formatCooldown(cooldown.remainingTime)}
                              </span>
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-3.5 grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          disabled={voteSubmitting}
                          onClick={() => handleVote(place, "worth_it")}
                          className="flex min-h-[72px] flex-col items-center justify-center gap-1 rounded-2xl border border-white/10 bg-[#181a21] px-2 py-2 text-[10px] font-bold text-slate-100 transition hover:-translate-y-0.5 hover:bg-emerald-500/20"
                        >
                          <span className="material-symbols-outlined text-[16px] leading-none">thumb_up</span>
                          Worth It
                        </button>
                        <button
                          type="button"
                          disabled={voteSubmitting}
                          onClick={() => handleVote(place, "mid")}
                          className="flex min-h-[72px] flex-col items-center justify-center gap-1 rounded-2xl border border-white/10 bg-[#181a21] px-2 py-2 text-[10px] font-bold text-slate-100 transition hover:-translate-y-0.5 hover:bg-amber-500/20"
                        >
                          <span className="material-symbols-outlined text-[16px] leading-none">remove</span>
                          Mid
                        </button>
                        <button
                          type="button"
                          disabled={voteSubmitting}
                          onClick={() => handleVote(place, "skip")}
                          className="flex min-h-[72px] flex-col items-center justify-center gap-1 rounded-2xl border border-white/10 bg-[#181a21] px-2 py-2 text-[10px] font-bold text-slate-100 transition hover:-translate-y-0.5 hover:bg-rose-500/20"
                        >
                          <span className="material-symbols-outlined text-[16px] leading-none">thumb_down</span>
                          Skip
                        </button>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>

      {campusPickerOpen ? (
        <CampusPickerModal
          campuses={campuses}
          selectedCampusId={campusId}
          onClose={() => setCampusPickerOpen(false)}
          onSelect={handleSelectCampus}
        />
      ) : null}

      {selectedPlace ? (
        (() => {
          const cooldown = getVoteCooldown(selectedPlace.id, now, voteRecords);
          return (
        <PlaceDetailModal
          place={selectedPlace}
          activeVote={cooldown.voteType}
          cooldownRemaining={cooldown.remainingTime}
          voteSubmitting={voteSubmitting}
          onClose={() => setSelectedPlaceId(null)}
          onVote={(vote) => handleVote(selectedPlace, vote)}
        />
          );
        })()
      ) : null}

      <AppNav
        active="discover"
        accentFrom={theme.primary}
        accentTo={theme.dark}
        glowColor={theme.primary}
        showDesktop={false}
      />
    </div>
  );
}
