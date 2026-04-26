// Per-rank purchase limits (locked from FreedomBLiNGs spec).
// Used by stripe-create-checkout to gate $-denominated buy amounts by rank.
// Ranks here are 0-indexed to match bees.bling_rank (server.js used 1-indexed
// 1..33; we shifted to 0..32 to match the existing themanual.tech column
// constraint 0..32). Thresholds and limits are otherwise identical.

export interface RankLimit {
  minRank: number;
  maxRank: number;
  txMax: number | null; // null = unlimited (rank 32 / "God")
  dailyMax: number | null;
  weeklyMax: number | null;
}

export const RANK_LIMITS: RankLimit[] = [
  { minRank: 0,  maxRank: 3,  txMax: 1000,   dailyMax: 2500,   weeklyMax: 10000 },
  { minRank: 4,  maxRank: 7,  txMax: 2000,   dailyMax: 5000,   weeklyMax: 20000 },
  { minRank: 8,  maxRank: 11, txMax: 5000,   dailyMax: 12500,  weeklyMax: 50000 },
  { minRank: 12, maxRank: 20, txMax: 10000,  dailyMax: 25000,  weeklyMax: 100000 },
  { minRank: 21, maxRank: 28, txMax: 25000,  dailyMax: 62500,  weeklyMax: 250000 },
  { minRank: 29, maxRank: 31, txMax: 50000,  dailyMax: 125000, weeklyMax: 500000 },
  { minRank: 32, maxRank: 32, txMax: null,   dailyMax: null,   weeklyMax: null },
];

export function getRankLimit(rank: number): RankLimit {
  return (
    RANK_LIMITS.find((r) => rank >= r.minRank && rank <= r.maxRank) ??
    RANK_LIMITS[0]
  );
}
