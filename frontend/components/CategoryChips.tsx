type CategoryChipsProps = {
  categories: string[];
  selected: string;
  onSelect: (category: string) => void;
};

const CATEGORY_STYLES: Record<string, string> = {
  "Quick Bites": "text-indigo-700 bg-indigo-100 border-indigo-200",
  Cheap: "text-emerald-700 bg-emerald-100 border-emerald-200",
  "Late Night": "text-purple-700 bg-purple-100 border-purple-200",
  "Coffee Spots": "text-yellow-700 bg-yellow-100 border-yellow-200",
  "Local Favorite": "text-blue-700 bg-blue-100 border-blue-200",
};

export default function CategoryChips({
  categories,
  selected,
  onSelect,
}: CategoryChipsProps) {
  return (
    <div className="no-scrollbar -mx-2 flex gap-2 overflow-x-auto px-2 pb-2 md:flex-wrap md:overflow-visible">
      {categories.map((category) => {
        const isActive = category === selected;
        const colorClass =
          CATEGORY_STYLES[category] ??
          "text-[var(--primary)] bg-[var(--primary-soft)] border-[var(--primary)]/20";
        const activeClass =
          {
            "Quick Bites": "bg-indigo-100 text-indigo-700 border-indigo-200",
            Cheap: "bg-emerald-100 text-emerald-700 border-emerald-200",
            "Late Night": "bg-purple-100 text-purple-700 border-purple-200",
            "Coffee Spots": "bg-yellow-100 text-yellow-700 border-yellow-200",
            "Local Favorite": "bg-blue-100 text-blue-700 border-blue-200",
          }[category] ?? "bg-[var(--primary-soft)] text-[var(--primary)] border-[var(--primary)]/20";
        return (
          <button
            key={category}
            type="button"
            onClick={() => onSelect(category)}
            className={`whitespace-nowrap rounded-full border px-4 py-2 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)] ${
              isActive
                ? `${activeClass} shadow-[var(--shadow-soft)]`
                : "border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-muted)] hover:-translate-y-0.5"
            }`}
            aria-pressed={isActive}
          >
            {category}
          </button>
        );
      })}
    </div>
  );
}
