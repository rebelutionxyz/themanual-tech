// Pillar registry — all Cat 1 (and Cat 2+) pillars registered here.
// Created on first Cat 1 pillar build (AtlasINTEL.fyi, 2026-04-27).
// To add a new pillar: import its config below and append to PILLAR_REGISTRY.

import type { PillarConfig } from './pillar.types';
import { atlasintelPillar } from './atlasintel';
import { rebelutionFyiPillar } from './rebelution-fyi';
import { atlasunitedPillar } from './atlasunited';

export const PILLAR_REGISTRY: PillarConfig[] = [
  atlasintelPillar,
  rebelutionFyiPillar,
  atlasunitedPillar,
];

/**
 * Resolve a PillarConfig from a hostname.
 * Returns null when the host doesn't match any registered pillar (e.g. themanual.tech itself,
 * which uses the default HomePage flow).
 */
export function resolvePillarByHost(hostname: string): PillarConfig | null {
  const host = hostname.toLowerCase();
  return PILLAR_REGISTRY.find((p) => p.hosts.includes(host)) ?? null;
}
