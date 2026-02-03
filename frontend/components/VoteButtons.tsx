import type { VoteValue } from "../lib/types";

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
        className="flex flex-col items-center justify-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm font-semibold text-[var(--text-muted)] transition hover:-translate-y-0.5 hover:border-[var(--success)]/30 hover:bg-[var(--success)] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--success)] disabled:opacity-60"
      >
        <span className="material-symbols-outlined text-[18px]">
          thumb_up
        </span>
        Worth it
      </button>
      <button
        type="button"
        disabled={isSubmitting}
        onClick={() => onVote("mid")}
        className="flex flex-col items-center justify-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm font-semibold text-[var(--text-muted)] transition hover:-translate-y-0.5 hover:border-[var(--warning)]/30 hover:bg-[var(--warning)] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--warning)] disabled:opacity-60"
      >
        <span className="material-symbols-outlined text-[18px]">
          sentiment_neutral
        </span>
        Mid
      </button>
      <button
        type="button"
        disabled={isSubmitting}
        onClick={() => onVote("skip")}
        className="flex flex-col items-center justify-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm font-semibold text-[var(--text-muted)] transition hover:-translate-y-0.5 hover:border-[var(--danger)]/30 hover:bg-[var(--danger)] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--danger)] disabled:opacity-60"
      >
        <span className="material-symbols-outlined text-[18px]">
          thumb_down
        </span>
        Not worth it
      </button>
    </div>
  );
}
