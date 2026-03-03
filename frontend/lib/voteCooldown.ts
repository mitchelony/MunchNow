import type { VoteValue } from "./types";

const STORAGE_KEY = "munchnow_votes";
const COOLDOWN_MS = 24 * 60 * 60 * 1000;

export type StoredVoteRecord = {
  type: VoteValue;
  timestamp: number;
};

function isVoteType(value: unknown): value is VoteValue {
  return value === "worth_it" || value === "mid" || value === "skip";
}

export function getVoteRecords(): Record<string, StoredVoteRecord> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, { type?: unknown; timestamp?: unknown }>;
    const cleaned: Record<string, StoredVoteRecord> = {};
    Object.entries(parsed ?? {}).forEach(([key, record]) => {
      if (!record || !isVoteType(record.type)) return;
      const timestamp = Number(record.timestamp);
      if (!Number.isFinite(timestamp) || timestamp <= 0) return;
      cleaned[key] = { type: record.type, timestamp };
    });
    return cleaned;
  } catch {
    return {};
  }
}

export function saveVoteRecord(placeId: string | number, vote: VoteValue, timestamp = Date.now()) {
  if (typeof window === "undefined") return;
  const key = String(placeId);
  const records = getVoteRecords();
  records[key] = { type: vote, timestamp };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

export function getVoteCooldown(
  placeId: string | number,
  now = Date.now(),
  records?: Record<string, StoredVoteRecord>
) {
  const key = String(placeId);
  const source = records ?? getVoteRecords();
  const record = source[key];
  if (!record) return { canVote: true, remainingTime: 0, voteType: null as VoteValue | null };
  const elapsed = now - record.timestamp;
  if (elapsed >= COOLDOWN_MS) return { canVote: true, remainingTime: 0, voteType: null as VoteValue | null };
  return {
    canVote: false,
    remainingTime: COOLDOWN_MS - elapsed,
    voteType: record.type,
  };
}

export function formatCooldown(ms: number) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours}h ${minutes}m ${seconds}s`;
}

