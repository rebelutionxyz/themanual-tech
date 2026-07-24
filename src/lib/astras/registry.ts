// Astra registry — all Cat 1 (and Cat 2+) astras registered here.
// Created on first Cat 1 astra build (AtlasINTEL.fyi, 2026-04-27).
// To add a new astra: import its config below and append to ASTRA_REGISTRY.

import type { AstraConfig } from './astra.types';
import { atlasintelAstra } from './atlasintel';
import { atlasnationAstra } from './atlasnation';
import { atlasunitedAstra } from './atlasunited';
import { brandosophicAstra } from './brandosophic';
import { miniwavesAstra } from './miniwaves';
import { rebelutionFyiAstra } from './rebelution-fyi';

export const ASTRA_REGISTRY: AstraConfig[] = [
  atlasintelAstra,
  rebelutionFyiAstra,
  atlasunitedAstra,
  atlasnationAstra,
  miniwavesAstra,
  brandosophicAstra,
];

/**
 * Resolve a AstraConfig from a hostname.
 * Returns null when the host doesn't match any registered astra (e.g. themanual.tech itself,
 * which uses the default HomePage flow).
 */
export function resolveAstraByHost(hostname: string): AstraConfig | null {
  const host = hostname.toLowerCase();
  return ASTRA_REGISTRY.find((p) => p.hosts.includes(host)) ?? null;
}
