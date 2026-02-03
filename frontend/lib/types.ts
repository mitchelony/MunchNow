export type VoteValue = "worth_it" | "mid" | "skip";

export type PlaceId = string | number;

export type Place = {
  id: PlaceId;
  name: string;
  category?: string;
  categories?: string[];
  price_tier?: number | string | null;
  address?: string | null;
  score_hint?: string | null;
  city?: string | null;
  score?: number | null;
  worth_it_count?: number | null;
  mid_count?: number | null;
  skip_count?: number | null;
  total_votes?: number | null;
};
