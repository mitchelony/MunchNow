import ThemeToggle from "@/components/ThemeToggle";

export default function TopBar() {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <p className="text-sm font-semibold tracking-[0.24em] text-[var(--text)]">
          MUNCHHSV
        </p>
        <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[var(--text)]">
          Huntsville
        </span>
      </div>
      <ThemeToggle />
    </div>
  );
}
