import Image from "next/image";
import { useState, type MouseEvent } from "react";
import type { Place, VoteValue } from "../lib/types";

function formatPriceTier(price?: number | string | null) {
  if (!price) return null;
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
  return null;
}

type PlaceCardProps = {
  place: Place;
  chips?: string[];
  statusLabel?: string;
  voteCounts?: {
    worth: number;
    mid: number;
    skip: number;
    total: number;
  };
  scoreWeights?: { popularity: number; distance: number };
  cooldownLabel?: string | null;
  activeVote?: VoteValue | null;
  animateVote?: boolean;
  onCooldownClick?: () => void;
  rank?: number;
  size?: "hero" | "stacked" | "compact";
  showDistanceBubble?: boolean;
  onSelect: (place: Place) => void;
  onVote?: (place: Place, vote: VoteValue) => void;
};

export default function PlaceCard({
  place,
  chips,
  statusLabel,
  voteCounts,
  scoreWeights,
  cooldownLabel,
  activeVote,
  animateVote,
  onCooldownClick,
  rank,
  size = "compact",
  showDistanceBubble = false,
  onSelect,
  onVote,
}: PlaceCardProps) {
  const [imageError, setImageError] = useState(false);
  const price = formatPriceTier(place.price_tier);
  const label = chips?.[0] ?? statusLabel ?? "Local Favorite";
  const meta = [price, place.city].filter(Boolean).join(" • ");
  const summary = place.address ?? "Tap to see why locals love it.";
  const chipClass = (value: string) =>
    ({
      All: "bg-slate-100 text-slate-700",
      American: "bg-red-100 text-red-700",
      Cheap: "bg-emerald-100 text-emerald-700",
      Chinese: "bg-orange-100 text-orange-700",
      Coffee: "bg-amber-100 text-amber-800",
      Dessert: "bg-pink-100 text-pink-700",
      "Fast Food": "bg-yellow-100 text-yellow-700",
      Japanese: "bg-sky-100 text-sky-700",
      Korean: "bg-violet-100 text-violet-700",
      "Late Night": "bg-purple-100 text-purple-700",
      "Local Favorite": "bg-blue-100 text-blue-700",
      Mediterranean: "bg-teal-100 text-teal-700",
      Mexican: "bg-green-100 text-green-700",
      "Middle Eastern": "bg-rose-100 text-rose-700",
      Pizza: "bg-rose-100 text-rose-700",
      "Sit Down": "bg-slate-100 text-slate-700",
      Thai: "bg-cyan-100 text-cyan-700",
      Vietnamese: "bg-lime-100 text-lime-700",
    }[value] ?? "bg-[var(--primary-soft)] text-[var(--primary)]");
  const chipsList = chips && chips.length > 0 ? chips : [label];
  const numericScoreRaw =
    typeof place.score === "number" ? place.score : null;
  const numericScore =
    typeof numericScoreRaw === "number" && Number.isFinite(numericScoreRaw)
      ? numericScoreRaw
      : null;
  const distanceScore =
    typeof place.distance_miles === "number" && !Number.isNaN(place.distance_miles)
      ? Math.exp(-place.distance_miles / 2.5)
      : null;
  const popularityScore = voteCounts
    ? voteCounts.worth - voteCounts.skip + 0.5 * voteCounts.mid
    : null;
  const derivedScore =
    numericScore !== null
      ? numericScore
      : scoreWeights && popularityScore !== null && distanceScore !== null
      ? scoreWeights.popularity * popularityScore +
        scoreWeights.distance * distanceScore
      : popularityScore;
  const scoreLabel =
    typeof derivedScore === "number" ? derivedScore.toFixed(1) : null;
  const distanceLabel =
    typeof place.distance_miles === "number" && !Number.isNaN(place.distance_miles)
      ? `${place.distance_miles < 10 ? place.distance_miles.toFixed(1) : place.distance_miles.toFixed(0)} mi`
      : null;

  const layout = size === "hero" ? "p-5" : size === "stacked" ? "p-4" : "p-4";

  const handleVote = (event: MouseEvent, vote: VoteValue) => {
    event.stopPropagation();
    if (onVote) {
      onVote(place, vote);
    } else {
      onSelect(place);
    }
  };

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => onSelect(place)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(place);
        }
      }}
      className={`group flex flex-col gap-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-soft)] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)] ${layout}`}
    >
      <div className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-2)]">
        {place.image_url && !imageError ? (
          <Image
            src={place.image_url}
            alt={place.name}
            fill
            unoptimized
            sizes="(max-width: 768px) 100vw, 40vw"
            className="h-40 w-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="flex h-40 w-full items-center justify-center bg-gradient-to-br from-slate-900/10 to-slate-500/10">
            <span className="material-symbols-outlined text-[28px] text-[var(--text-muted)]">
              image
            </span>
          </div>
        )}
        <div className="absolute bottom-2 right-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/80">
          Photos via Yelp
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {chipsList.map((chip) => (
              <span
                key={chip}
                className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold tracking-wide ${chipClass(
                  chip
                )}`}
              >
                {chip}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-2">
            {meta ? (
              <span className="whitespace-nowrap text-xs font-medium text-[var(--text-muted)]">
                {meta}
              </span>
            ) : null}
            {scoreLabel ? (
              <div className="flex flex-col items-center">
                <div
                  className={`flex items-center rounded-full border border-[var(--primary)]/30 bg-[var(--primary-soft)] ${
                    size === "hero"
                      ? "px-2.5 py-0.5 text-[11px]"
                      : "px-2 py-0.5 text-[10px]"
                  } font-semibold uppercase tracking-wider text-[var(--primary)]`}
                >
                  <span
                    className={`material-symbols-outlined ${
                      size === "hero" ? "text-[16px]" : "text-[14px]"
                    }`}
                  >
                    trending_up
                  </span>
                  <span className="ml-1">{scoreLabel}</span>
                </div>
                <span
                  className={`mt-0.5 ${
                    size === "hero" ? "text-[10px]" : "text-[9px]"
                  } font-semibold uppercase tracking-wider text-[var(--primary)]/80`}
                >
                  Score
                </span>
                {showDistanceBubble && distanceLabel ? (
                  <div
                    className={`mt-1 flex items-center rounded-full border border-[var(--border)] bg-[var(--surface-2)] ${
                      size === "hero"
                        ? "px-2.5 py-0.5 text-[11px]"
                        : "px-2 py-0.5 text-[10px]"
                    } font-semibold text-[var(--text-muted)]`}
                  >
                    <span
                      className={`material-symbols-outlined ${
                        size === "hero" ? "text-[14px]" : "text-[12px]"
                      }`}
                    >
                      near_me
                    </span>
                    <span className="ml-1">{distanceLabel}</span>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {rank ? (
            <span className="rounded-full bg-[var(--primary)] px-2 py-1 text-xs font-semibold text-white">
              #{rank}
            </span>
          ) : null}
          <h3 className="text-xl font-bold leading-tight text-[var(--text)] transition-colors group-hover:text-[var(--primary)]">
            {place.name}
          </h3>
        </div>
        <div className="relative border-l-2 border-[var(--primary)]/40 py-0.5 pl-3">
          <p className="text-sm font-medium leading-relaxed text-[var(--text-muted)]">
            {summary}
          </p>
        </div>
        {voteCounts ? (
          <div className="flex items-center gap-3 text-xs font-semibold text-[var(--text-muted)]">
            <span className="inline-flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px] text-[var(--success)]">
                thumb_up
              </span>
              {voteCounts.worth}
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px] text-[var(--warning)]">
                sentiment_neutral
              </span>
              {voteCounts.mid}
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px] text-[var(--danger)]">
                thumb_down
              </span>
              {voteCounts.skip}
            </span>
          </div>
        ) : null}
      </div>
      {cooldownLabel && !(animateVote && activeVote) ? (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onCooldownClick?.();
          }}
          className="flex min-h-[58px] items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-center text-xs font-semibold text-[var(--text-muted)]"
        >
          Next vote in {cooldownLabel}
        </button>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={(event) => handleVote(event, "worth_it")}
            className={`relative flex flex-col items-center justify-center gap-0.5 rounded-xl border px-1 py-2 transition active:scale-95 ${
              activeVote === "worth_it"
                ? "border-[var(--success)]/40 bg-[var(--success)] text-white"
                : "border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-muted)] hover:border-[var(--success)]/30 hover:bg-[var(--success)] hover:text-white"
            } ${animateVote && activeVote === "worth_it" ? "animate-pop" : ""}`}
            disabled={!!cooldownLabel}
          >
            <span className="material-symbols-outlined text-[18px]">
              thumb_up
            </span>
            {activeVote === "worth_it" ? (
              <span className="absolute right-1 top-1 text-white">
                <span className="material-symbols-outlined text-[12px]">
                  check
                </span>
              </span>
            ) : null}
            <span className="text-[10px] font-bold uppercase tracking-wider">
              Worth it!
            </span>
          </button>
          <button
            type="button"
            onClick={(event) => handleVote(event, "mid")}
            className={`relative flex flex-col items-center justify-center gap-0.5 rounded-xl border px-1 py-2 transition active:scale-95 ${
              activeVote === "mid"
                ? "border-[var(--warning)]/40 bg-[var(--warning)] text-white"
                : "border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-muted)] hover:border-[var(--warning)]/30 hover:bg-[var(--warning)] hover:text-white"
            } ${animateVote && activeVote === "mid" ? "animate-pop" : ""}`}
            disabled={!!cooldownLabel}
          >
            <span className="material-symbols-outlined text-[18px]">
              sentiment_neutral
            </span>
            {activeVote === "mid" ? (
              <span className="absolute right-1 top-1 text-white">
                <span className="material-symbols-outlined text-[12px]">
                  check
                </span>
              </span>
            ) : null}
            <span className="text-[10px] font-bold uppercase tracking-wider">
              Mid
            </span>
          </button>
          <button
            type="button"
            onClick={(event) => handleVote(event, "skip")}
            className={`relative flex flex-col items-center justify-center gap-0.5 rounded-xl border px-1 py-2 transition active:scale-95 ${
              activeVote === "skip"
                ? "border-[var(--danger)]/40 bg-[var(--danger)] text-white"
                : "border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-muted)] hover:border-[var(--danger)]/30 hover:bg-[var(--danger)] hover:text-white"
            } ${animateVote && activeVote === "skip" ? "animate-pop" : ""}`}
            disabled={!!cooldownLabel}
          >
            <span className="material-symbols-outlined text-[18px]">
              thumb_down
            </span>
            {activeVote === "skip" ? (
              <span className="absolute right-1 top-1 text-white">
                <span className="material-symbols-outlined text-[12px]">
                  check
                </span>
              </span>
            ) : null}
            <span className="text-[10px] font-bold uppercase tracking-wider">
              Skip
            </span>
          </button>
        </div>
      )}
    </article>
  );
}
