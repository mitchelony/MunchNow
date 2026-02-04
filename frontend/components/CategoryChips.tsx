type CategoryChipsProps = {
  categories: string[];
  selected: string;
  onSelect: (category: string) => void;
};

const CATEGORY_STYLES: Record<string, string> = {
  All: "text-white bg-black border-black",
  American: "text-red-700 bg-red-100 border-red-200",
  Cheap: "text-emerald-700 bg-emerald-100 border-emerald-200",
  Chinese: "text-orange-700 bg-orange-100 border-orange-200",
  Coffee: "text-amber-800 bg-amber-100 border-amber-200",
  Dessert: "text-pink-700 bg-pink-100 border-pink-200",
  "Fast Food": "text-yellow-700 bg-yellow-100 border-yellow-200",
  Japanese: "text-sky-700 bg-sky-100 border-sky-200",
  Korean: "text-violet-700 bg-violet-100 border-violet-200",
  "Late Night": "text-purple-700 bg-purple-100 border-purple-200",
  "Local Favorite": "text-blue-700 bg-blue-100 border-blue-200",
  Mediterranean: "text-teal-700 bg-teal-100 border-teal-200",
  Mexican: "text-green-700 bg-green-100 border-green-200",
  "Middle Eastern": "text-rose-700 bg-rose-100 border-rose-200",
  Pizza: "text-rose-700 bg-rose-100 border-rose-200",
  "Sit Down": "text-slate-700 bg-slate-100 border-slate-200",
  Thai: "text-cyan-700 bg-cyan-100 border-cyan-200",
  Vietnamese: "text-lime-700 bg-lime-100 border-lime-200",
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
        const activeClass = colorClass;
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
