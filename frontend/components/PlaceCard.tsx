import type { Place } from "../lib/types";

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
  statusLabel?: string;
  votesLabel?: string;
  rank?: number;
  size?: "hero" | "stacked" | "compact";
  onSelect: (place: Place) => void;
};

export default function PlaceCard({
  place,
  chips,
  statusLabel,
  votesLabel,
  rank,
  size = "compact",
  onSelect,
}: PlaceCardProps) {
  const price = formatPriceTier(place.price_tier);

  const base =
    "w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] text-left shadow-[var(--shadow)] transition hover:-translate-y-0.5 active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]";
  const layout =
    size === "hero"
      ? "p-6"
      : size === "stacked"
      ? "p-4"
      : "p-3.5";

  return (
    <button
      type="button"
      onClick={() => onSelect(place)}
      className={`${base} ${layout}`}
    >
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          {rank ? (
            <span className="rounded-full bg-[var(--accent)] px-2 py-1 text-xs font-semibold text-white">
              #{rank}
            </span>
          ) : null}
          <h3
            className={`font-semibold leading-snug text-[var(--text)] ${
              size === "hero" ? "text-xl" : "text-base"
            }`}
          >
            {place.name}
          </h3>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-muted)]">
          {statusLabel ? <span>{statusLabel}</span> : null}
          {price ? (
            <span className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2 py-0.5 font-semibold text-[var(--text)]">
              {price}
            </span>
          ) : null}
        </div>
        {votesLabel ? (
          <div className="text-xs font-semibold text-[var(--accent)]">
            {votesLabel}
          </div>
        ) : null}
        {chips && chips.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            {chips.map((chip) => (
              <span
                key={chip}
                className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1 text-xs font-semibold text-[var(--text-muted)]"
              >
                {chip}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </button>
  );
}
