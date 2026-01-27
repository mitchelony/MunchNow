import ThemeToggle from "@/components/ThemeToggle";

export default function TopBar() {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.24em] text-[var(--text-muted)]">
          MunchHSV
        </p>
        <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">
          What&apos;s worth it right now?
        </h1>
        <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
          <span className="h-2 w-2 animate-pulse-slow rounded-full bg-[var(--accent)]" />
          Updated this week • Live votes
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[var(--text)]">
          Huntsville
        </span>
        <ThemeToggle />
      </div>
    </div>
  );
}
