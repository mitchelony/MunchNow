import type { VoteValue } from "../lib/types";

type VoteButtonsProps = {
  onVote: (vote: VoteValue) => void;
  isSubmitting?: boolean;
  activeVote?: VoteValue | null;
  animateVote?: boolean;
};

export default function VoteButtons({
  onVote,
  isSubmitting,
  activeVote,
  animateVote,
}: VoteButtonsProps) {
  return (
    <div className="mt-4 grid grid-cols-3 gap-2">
      <button
        type="button"
        disabled={isSubmitting}
        onClick={() => onVote("worth_it")}
        className={`flex min-h-[64px] flex-col items-center justify-center gap-0.5 rounded-xl border px-2 py-1.5 text-xs font-semibold transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--success)] disabled:opacity-60 ${
          activeVote === "worth_it"
            ? "border-[var(--success)]/40 bg-[var(--success)] text-white"
            : "border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-muted)] hover:border-[var(--success)]/30 hover:bg-[var(--success)] hover:text-white"
        } ${animateVote && activeVote === "worth_it" ? "animate-pop" : ""}`}
      >
        <span className="material-symbols-outlined text-[16px]">
          thumb_up
        </span>
        Worth it
      </button>
      <button
        type="button"
        disabled={isSubmitting}
        onClick={() => onVote("mid")}
        className={`flex min-h-[64px] flex-col items-center justify-center gap-0.5 rounded-xl border px-2 py-1.5 text-xs font-semibold transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--warning)] disabled:opacity-60 ${
          activeVote === "mid"
            ? "border-[var(--warning)]/40 bg-[var(--warning)] text-white"
            : "border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-muted)] hover:border-[var(--warning)]/30 hover:bg-[var(--warning)] hover:text-white"
        } ${animateVote && activeVote === "mid" ? "animate-pop" : ""}`}
      >
        <span className="material-symbols-outlined text-[16px]">
          sentiment_neutral
        </span>
        Mid
      </button>
      <button
        type="button"
        disabled={isSubmitting}
        onClick={() => onVote("skip")}
        className={`flex min-h-[64px] flex-col items-center justify-center gap-0.5 rounded-xl border px-2 py-1.5 text-xs font-semibold transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--danger)] disabled:opacity-60 ${
          activeVote === "skip"
            ? "border-[var(--danger)]/40 bg-[var(--danger)] text-white"
            : "border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-muted)] hover:border-[var(--danger)]/30 hover:bg-[var(--danger)] hover:text-white"
        } ${animateVote && activeVote === "skip" ? "animate-pop" : ""}`}
      >
        <span className="material-symbols-outlined text-[16px]">
          thumb_down
        </span>
        Not worth it
      </button>
    </div>
  );
}
