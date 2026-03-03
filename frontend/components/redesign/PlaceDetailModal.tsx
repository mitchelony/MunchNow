"use client";

import { useEffect, useMemo } from "react";
import { buildMapsQuery, getPreferredMapsLink } from "../../lib/maps";
import { extractCategoryChips } from "../../lib/tags";
import type { Place, VoteValue } from "../../lib/types";
import { formatCooldown } from "../../lib/voteCooldown";

type PlaceDetailModalProps = {
  place: Place;
  activeVote: VoteValue | null;
  cooldownRemaining: number;
  voteSubmitting: boolean;
  onClose: () => void;
  onVote: (vote: VoteValue) => void;
};

function formatDistance(distance?: number | null) {
  if (typeof distance !== "number" || Number.isNaN(distance)) return "-";
  return distance < 10 ? `${distance.toFixed(1)} mi away` : `${distance.toFixed(0)} mi away`;
}

function formatPrice(price?: number | string | null) {
  if (!price) return "-";
  if (typeof price === "number") return "$".repeat(Math.min(Math.max(price, 1), 4));
  const parsed = Number(price);
  if (Number.isFinite(parsed)) return "$".repeat(Math.min(Math.max(Math.round(parsed), 1), 4));
  return String(price);
}

function getVoteCounts(place: Place) {
  const worth = place.worth_it_count ?? 0;
  const mid = place.mid_count ?? 0;
  const skip = place.skip_count ?? 0;
  const total = place.total_votes ?? worth + mid + skip;
  return { worth, mid, skip, total };
}

function toDisplayLabel(value: unknown) {
  const raw = typeof value === "string" ? value : value == null ? "" : String(value);
  const cleaned = raw.replace(/[_-]+/g, " ").trim().toLowerCase();
  if (!cleaned) return raw;
  return cleaned.replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function PlaceDetailModal({
  place,
  activeVote,
  cooldownRemaining,
  voteSubmitting,
  onClose,
  onVote,
}: PlaceDetailModalProps) {
  const votes = useMemo(() => getVoteCounts(place), [place]);
  const chips = useMemo(() => extractCategoryChips(place, 3), [place]);
  const displayTags = (chips.length ? chips : place.categories.slice(0, 3))
    .map((tag) => (typeof tag === "string" ? tag : tag == null ? "" : String(tag)))
    .filter(Boolean);
  const cuisineLabel = toDisplayLabel(place.category ?? place.categories[0] ?? "local favorite");
  const recommendPercent = votes.total ? Math.round((votes.worth / votes.total) * 100) : 0;

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="fixed inset-4 top-16 z-[71] flex flex-col overflow-hidden rounded-[32px] bg-white shadow-2xl dark:bg-[#1a1a1a]"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 shadow-lg transition-colors hover:bg-white dark:bg-gray-800/90 dark:hover:bg-gray-700"
          aria-label="Close"
        >
          <span className="material-symbols-outlined text-gray-700 dark:text-gray-300">close</span>
        </button>

        <div className="flex-1 overflow-y-auto scrollbar-hide">
          <div className="space-y-6 p-6 text-center">
            <div className="space-y-3">
              <div>
                <h2 className="mb-2 text-4xl font-black leading-tight text-gray-900 dark:text-white">
                  {place.name}
                </h2>
                <p className="text-xl font-medium text-gray-600 dark:text-gray-400">{cuisineLabel}</p>
              </div>

              <div className="flex flex-wrap justify-center gap-2">
                <div className="flex items-center gap-2 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 px-4 py-2 dark:from-blue-950/30 dark:to-indigo-950/30">
                  <span className="material-symbols-outlined text-[16px] text-blue-600 dark:text-blue-400">
                    location_on
                  </span>
                  <span className="text-sm font-bold text-blue-700 dark:text-blue-300">
                    {formatDistance(place.distance_miles)}
                  </span>
                </div>
                <div className="flex items-center gap-1 rounded-2xl bg-gradient-to-br from-green-50 to-emerald-50 px-4 py-2 dark:from-green-950/30 dark:to-emerald-950/30">
                  <span className="text-base font-black text-green-700 dark:text-green-300">{formatPrice(place.price_tier)}</span>
                </div>
              </div>

              <div className="flex flex-wrap justify-center gap-2">
                {displayTags.map((chip) => (
                  <span
                    key={chip}
                    className="rounded-full bg-gray-100 px-4 py-2 text-sm font-bold text-gray-700 dark:bg-[#2a2a2a] dark:text-gray-300"
                  >
                    {toDisplayLabel(chip).toLowerCase()}
                  </span>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Community Verdict</h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="rounded-3xl bg-gradient-to-br from-green-50 to-emerald-50 p-6 text-center dark:from-green-950/30 dark:to-emerald-950/30">
                  <span className="material-symbols-outlined mb-3 text-[30px] text-green-600 dark:text-green-400">thumb_up</span>
                  <div className="mb-2 text-xl font-black text-green-600 dark:text-green-400">{votes.worth}</div>
                  <div className="text-sm font-bold text-green-700 dark:text-green-500">Worth It</div>
                </div>
                <div className="rounded-3xl bg-gradient-to-br from-amber-50 to-yellow-50 p-6 text-center dark:from-amber-950/30 dark:to-yellow-950/30">
                  <span className="material-symbols-outlined mb-3 text-[30px] text-amber-600 dark:text-amber-400">remove</span>
                  <div className="mb-2 text-xl font-black text-amber-600 dark:text-amber-400">{votes.mid}</div>
                  <div className="text-sm font-bold text-amber-700 dark:text-amber-500">Mid</div>
                </div>
                <div className="rounded-3xl bg-gradient-to-br from-red-50 to-rose-50 p-6 text-center dark:from-red-950/30 dark:to-rose-950/30">
                  <span className="material-symbols-outlined mb-3 text-[30px] text-red-600 dark:text-red-400">thumb_down</span>
                  <div className="mb-2 text-xl font-black text-red-600 dark:text-red-400">{votes.skip}</div>
                  <div className="text-sm font-bold text-red-700 dark:text-red-500">Skip</div>
                </div>
              </div>

              {votes.total > 0 ? (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-bold text-gray-700 dark:text-gray-300">{recommendPercent}% recommend</span>
                    <span className="text-gray-500 dark:text-gray-500">{votes.total} total votes</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                    <div
                      className="h-full bg-gradient-to-r from-green-500 to-emerald-600 transition-all"
                      style={{ width: `${recommendPercent}%` }}
                    />
                  </div>
                </div>
              ) : null}
            </div>

            <div className="space-y-3">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Location</h3>
              <p className="text-base leading-relaxed text-gray-700 dark:text-gray-300">
                {place.address ?? "Address unavailable"}
              </p>
            </div>

            <div className="space-y-4">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Cast Your Vote</h3>
              {cooldownRemaining > 0 ? (
                <div className="w-full rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 p-4 dark:from-blue-950/30 dark:to-indigo-950/30">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">✓</div>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-bold text-gray-900 dark:text-white">Vote Recorded!</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Next vote:{" "}
                        <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                          {formatCooldown(cooldownRemaining)}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    disabled={voteSubmitting}
                    onClick={() => onVote("worth_it")}
                    className="flex min-h-[76px] flex-col items-center justify-center gap-1 rounded-2xl border border-white/10 bg-[#181a21] px-2 py-2 text-xs font-bold text-slate-100 shadow-md transition-all hover:-translate-y-0.5 hover:bg-emerald-500/20 hover:shadow-lg disabled:opacity-60"
                  >
                    <span className="material-symbols-outlined text-[17px] leading-none">thumb_up</span>
                    Worth It
                  </button>
                  <button
                    type="button"
                    disabled={voteSubmitting}
                    onClick={() => onVote("mid")}
                    className="flex min-h-[76px] flex-col items-center justify-center gap-1 rounded-2xl border border-white/10 bg-[#181a21] px-2 py-2 text-xs font-bold text-slate-100 shadow-md transition-all hover:-translate-y-0.5 hover:bg-amber-500/20 hover:shadow-lg disabled:opacity-60"
                  >
                    <span className="material-symbols-outlined text-[17px] leading-none">remove</span>
                    Mid
                  </button>
                  <button
                    type="button"
                    disabled={voteSubmitting}
                    onClick={() => onVote("skip")}
                    className="flex min-h-[76px] flex-col items-center justify-center gap-1 rounded-2xl border border-white/10 bg-[#181a21] px-2 py-2 text-xs font-bold text-slate-100 shadow-md transition-all hover:-translate-y-0.5 hover:bg-rose-500/20 hover:shadow-lg disabled:opacity-60"
                  >
                    <span className="material-symbols-outlined text-[17px] leading-none">thumb_down</span>
                    Skip
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 bg-gray-50 p-6 dark:border-white/5 dark:bg-[#0a0a0a]">
          <button
            type="button"
            onClick={() => {
              const query = buildMapsQuery(place.name, place.address ?? null);
              const link = getPreferredMapsLink(query);
              window.open(link, "_blank", "noopener,noreferrer");
            }}
            className="w-full rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 py-5 text-lg font-bold text-white shadow-lg transition-all hover:from-blue-700 hover:to-indigo-700 hover:shadow-xl"
          >
            <span className="inline-flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px]">location_on</span>
              Get Directions
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
