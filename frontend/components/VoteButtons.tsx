import type { VoteValue } from "@/lib/types";

type VoteButtonsProps = {
  onVote: (vote: VoteValue) => void;
  isSubmitting?: boolean;
};

export default function VoteButtons({ onVote, isSubmitting }: VoteButtonsProps) {
  return (
    <div className="mt-4 grid grid-cols-3 gap-2">
      <button
        type="button"
        disabled={isSubmitting}
        onClick={() => onVote("worth_it")}
        className="rounded-xl bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-strong)] disabled:opacity-60"
      >
        Worth it
      </button>
      <button
        type="button"
        disabled={isSubmitting}
        onClick={() => onVote("mid")}
        className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm font-semibold text-[var(--text)] transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-strong)] disabled:opacity-60"
      >
        Mid
      </button>
      <button
        type="button"
        disabled={isSubmitting}
        onClick={() => onVote("skip")}
        className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm font-semibold text-[var(--text)] transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-strong)] disabled:opacity-60"
      >
        Not worth it
      </button>
    </div>
  );
}
