import type { Place } from "./types";

const CANONICAL_LABELS: Record<string, string> = {
  all: "All",
  american: "American",
  cheap: "Cheap",
  chinese: "Chinese",
  coffee: "Coffee",
  dessert: "Dessert",
  fast_food: "Fast Food",
  japanese: "Japanese",
  korean: "Korean",
  late_night: "Late Night",
  local_favorite: "Local Favorite",
  mediterranean: "Mediterranean",
  mexican: "Mexican",
  middle_eastern: "Middle Eastern",
  pizza: "Pizza",
  sit_down: "Sit Down",
  thai: "Thai",
  vietnamese: "Vietnamese",
};

const ALIAS_TO_CANONICAL: Record<string, string> = {
  all: "all",
  american: "american",
  budget: "cheap",
  cheap: "cheap",
  chinese: "chinese",
  coffee: "coffee",
  coffee_spots: "coffee",
  cultural: "local_favorite",
  cultural_rep: "local_favorite",
  dessert: "dessert",
  fast_food: "fast_food",
  japanese: "japanese",
  korean: "korean",
  late_night: "late_night",
  local_fave: "local_favorite",
  local_faves: "local_favorite",
  local_favorite: "local_favorite",
  mediterranean: "mediterranean",
  mexican: "mexican",
  middle_eastern: "middle_eastern",
  pizza: "pizza",
  quick_bites: "fast_food",
  sit_down: "sit_down",
  thai: "thai",
  vietnamese: "vietnamese",
};

function toKey(value?: string | number | null) {
  if (value === null || value === undefined) return "";
  return String(value).trim().replace(/[\s-]+/g, "_").toLowerCase();
}

function toTitleCase(raw: string) {
  return raw
    .replace(/[_-]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function normalizeTagKey(value?: string | number | null) {
  const key = toKey(value);
  if (!key) return "";
  return ALIAS_TO_CANONICAL[key] ?? key;
}

export function formatTagLabel(value?: string | number | null) {
  const normalized = normalizeTagKey(value);
  if (!normalized) return "";
  return CANONICAL_LABELS[normalized] ?? toTitleCase(normalized);
}

export function toApiCategory(value?: string | number | null) {
  const normalized = normalizeTagKey(value);
  if (!normalized || normalized === "all") return undefined;
  return normalized;
}

export function extractCategoryChips(place: Place, max: number) {
  const chips = new Set<string>();
  const add = (value?: string | number | null) => {
    const label = formatTagLabel(value);
    if (label) chips.add(label);
  };

  place.categories?.forEach((value) => {
    if (chips.size >= max) return;
    String(value)
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean)
      .forEach((part) => {
        if (chips.size < max) add(part);
      });
  });

  if (chips.size < max && place.category) {
    String(place.category)
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean)
      .forEach((part) => {
        if (chips.size < max) add(part);
      });
  }

  if (chips.size === 0) chips.add("Uncategorized");
  return Array.from(chips).slice(0, max);
}
