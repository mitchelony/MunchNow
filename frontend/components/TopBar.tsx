import ThemeToggle from "./ThemeToggle";

export default function TopBar() {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-[var(--primary)]">
          location_on
        </span>
        <h2 className="text-lg font-bold tracking-tight text-[var(--text)]">
          MunchHSV
        </h2>
      </div>
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-full text-[var(--text-muted)] transition hover:bg-[var(--surface-2)]"
          aria-label="Search"
        >
          <span className="material-symbols-outlined">search</span>
        </button>
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-full text-[var(--text-muted)] transition hover:bg-[var(--surface-2)]"
          aria-label="Account"
        >
          <span className="material-symbols-outlined">account_circle</span>
        </button>
        <ThemeToggle />
      </div>
    </div>
  );
}
