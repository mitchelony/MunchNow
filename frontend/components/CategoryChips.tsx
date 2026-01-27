type CategoryChipsProps = {
  categories: string[];
  selected: string;
  onSelect: (category: string) => void;
};

export default function CategoryChips({
  categories,
  selected,
  onSelect,
}: CategoryChipsProps) {
  return (
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 md:flex-wrap md:overflow-visible">
      {categories.map((category) => {
        const isActive = category === selected;
        return (
          <button
            key={category}
            type="button"
            onClick={() => onSelect(category)}
            className={`whitespace-nowrap rounded-full border px-4 py-2 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-strong)] ${
              isActive
                ? "border-transparent bg-[var(--accent)] text-white shadow-[var(--shadow-soft)]"
                : "border-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:-translate-y-0.5"
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
