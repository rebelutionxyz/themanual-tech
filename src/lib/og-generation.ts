// OG-generation badge derivation — pure date math, no React, no schema change.
// A Bee's generation is computed from its account creation date (bees.created_at)
// against locked boundary dates. 'OG' (Founder Bee) is the pre-Swarm cohort.

export type OGGeneration = 'OG' | 'OGI' | 'OGII' | 'OGIII' | 'OGIV' | 'OGV';

// Exclusive upper-bound cutoffs: start-of-day UTC of the day AFTER each
// generation's inclusive end date, so `createdAt < cutoff` selects it.
//   OG    : createdAt ≤ 2026-09-10            (Founder Bee — pre-Swarm)
//   OGI   : 2026-09-11 → 2030-06-05
//   OGII  : 2030-06-06 → 2033-06-05
//   OGIII : 2033-06-06 → 2040-06-05
//   OGIV  : 2040-06-06 → 2050-06-05
//   OGV   : 2050-06-06 onward
const OG_CUTOFF = Date.UTC(2026, 8, 11); // 2026-09-11
const OGI_CUTOFF = Date.UTC(2030, 5, 6); // 2030-06-06
const OGII_CUTOFF = Date.UTC(2033, 5, 6); // 2033-06-06
const OGIII_CUTOFF = Date.UTC(2040, 5, 6); // 2040-06-06
const OGIV_CUTOFF = Date.UTC(2050, 5, 6); // 2050-06-06

export function getOGGeneration(createdAt: Date | string): OGGeneration {
  const t = (typeof createdAt === 'string' ? new Date(createdAt) : createdAt).getTime();
  if (t < OG_CUTOFF) return 'OG';
  if (t < OGI_CUTOFF) return 'OGI';
  if (t < OGII_CUTOFF) return 'OGII';
  if (t < OGIII_CUTOFF) return 'OGIII';
  if (t < OGIV_CUTOFF) return 'OGIV';
  return 'OGV';
}

export function getOGDisplayLabel(gen: OGGeneration): string {
  return gen === 'OG' ? 'Founder Bee' : gen;
}
