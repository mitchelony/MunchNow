import ThemeToggle from "./ThemeToggle";

type TopBarProps = {
  campusName?: string | null;
  onChangeCampus?: () => void;
};

export default function TopBar({ campusName, onChangeCampus }: TopBarProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-[var(--primary)]">
          location_on
        </span>
        <h2 className="text-lg font-bold tracking-tight text-[var(--text)]">
          MunchHSV
        </h2>
        {campusName && onChangeCampus && (
          <button
            type="button"
            onClick={onChangeCampus}
            className="ml-2 rounded-full border border-[var(--border)] px-3 py-1 text-xs font-medium text-[var(--text)] transition hover:bg-[var(--surface-2)]"
          >
            Campus: {campusName}
          </button>
        )}
      </div>
      <div className="flex items-center justify-end gap-2">
        <ThemeToggle />
      </div>
    </div>
  );
}
