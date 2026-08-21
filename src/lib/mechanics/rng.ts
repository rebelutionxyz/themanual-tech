/* ============================================================
   DEPTH SHARED MECHANICS — DETERMINISTIC RNG.

   A raffle draw must be reproducible and auditable: given the same entrant set and
   the same published seed, every party recomputes the same winner. So the draw
   never touches `Math.random()` — it runs a small, fully deterministic PRNG keyed
   by a seed string (a block hash, a close timestamp, a committed nonce — the
   mechanic decides). Pure, dependency-free, and stable across environments.
   ============================================================ */

/** FNV-1a 32-bit hash of a string → a well-mixed uint32 seed. */
export function hashSeed(seed: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * mulberry32 — a compact, well-distributed 32-bit PRNG. Returns a function that
 * yields floats in [0, 1). Seed with `hashSeed(...)`.
 */
export function mulberry32(seedInt: number): () => number {
  let a = seedInt >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A ready-to-use float stream in [0, 1) from a seed string. */
export function seededRandom(seed: string): () => number {
  return mulberry32(hashSeed(seed));
}

/**
 * Weighted pick without replacement: draw `count` distinct indices from `weights`,
 * each index's chance proportional to its weight. Deterministic given `rand`.
 * Returns fewer than `count` only when fewer positive-weight entries exist.
 */
export function weightedDrawWithoutReplacement(
  weights: number[],
  count: number,
  rand: () => number,
): number[] {
  const pool = weights.map((w, i) => ({ i, w: Math.max(0, w) })).filter((e) => e.w > 0);
  const picks: number[] = [];
  const want = Math.min(count, pool.length);

  for (let n = 0; n < want; n++) {
    const total = pool.reduce((s, e) => s + e.w, 0);
    if (total <= 0) break;
    let r = rand() * total;
    let chosen = 0;
    for (let k = 0; k < pool.length; k++) {
      r -= pool[k].w;
      if (r <= 0) {
        chosen = k;
        break;
      }
    }
    picks.push(pool[chosen].i);
    pool.splice(chosen, 1);
  }
  return picks;
}
