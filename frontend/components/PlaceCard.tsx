import type { Place } from "@/lib/types";

function formatPriceTier(price?: number | string | null) {
  if (!price) return null;
  if (typeof price === "number") {
    const count = Math.min(Math.max(price, 1), 4);
    return "$".repeat(count);
  }
  if (typeof price === "string" && price.trim().length > 0) {
    return price;
  }
  return null;
}

type PlaceCardProps = {
  place: Place;
  chips?: string[];
  subLabel?: string;
  votesLabel?: string;
  rank?: number;
  size?: "hero" | "stacked" | "compact";
  onSelect: (place: Place) => void;
};

export default function PlaceCard({
  place,
  chips,
  subLabel,
  votesLabel,
  rank,
  size = "compact",
  onSelect,
}: PlaceCardProps) {
  const price = formatPriceTier(place.price_tier);

  const base =
    "w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] text-left shadow-[var(--shadow)] transition active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]";
  const layout =
    size === "hero"
      ? "p-6"
      : size === "stacked"
      ? "p-4"
      : "p-3.5";

  return (
    <button type="button" onClick={() => onSelect(place)} className={`${base} ${layout}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            {rank ? (
              <span className="rounded-full bg-[var(--accent)] px-2 py-1 text-xs font-semibold text-white">
                #{rank}
              </span>
            ) : null}
            {chips?.map((chip) => (
              <span
                key={chip}
                className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1 text-xs font-semibold text-[var(--text-muted)]"
              >
                {chip}
              </span>
            ))}
          </div>
          <h3
            className={`font-semibold leading-snug text-[var(--text)] ${
              size === "hero" ? "text-xl" : "text-base"
            }`}
          >
            {place.name}
          </h3>
          {subLabel ? (
            <p className="text-xs text-[var(--text-muted)]">{subLabel}</p>
          ) : null}
        </div>
        {price ? (
          <span className="rounded-full bg-[var(--text)] px-2 py-1 text-xs font-semibold text-[var(--bg)]">
            {price}
          </span>
        ) : null}
      </div>
      {votesLabel ? (
        <div className="mt-3 text-xs font-semibold text-[var(--accent)]">
          {votesLabel}
        </div>
      ) : null}
    </button>
  );
}
