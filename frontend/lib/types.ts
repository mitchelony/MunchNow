export type VoteValue = "worth_it" | "mid" | "skip";

export type PlaceId = string | number;

export type VoteResponse = {
  ok: boolean;
  place_id: PlaceId;
  vote: VoteValue;
  created_at: string;
  worth_it_count: number;
  mid_count: number;
  skip_count: number;
  total_votes: number;
};

export type VoteSummary = {
  worth_it: number;
  mid: number;
  skip: number;
  total: number;
};

export type Campus = {
  id: number;
  name: string;
  short_name?: string | null;
  city?: string | null;
  state?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

export type PlaceDistance = {
  place_id: PlaceId;
  campus_id: number;
  distance_miles: number;
};

export type Place = {
  id: PlaceId;
  name: string;
  category?: string;
  categories: string[];
  price_tier?: number | string | null;
  address?: string | null;
  city?: string | null;
  score: number;
  distance_miles: number;
  score_hint?: string | null;
  worth_it_count?: number | null;
  mid_count?: number | null;
  skip_count?: number | null;
  total_votes?: number | null;
  vote_summary?: VoteSummary | null;
};
