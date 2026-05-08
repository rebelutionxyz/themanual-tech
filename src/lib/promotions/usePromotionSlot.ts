// Phase C Component D — reader hook for promotion slots (Code 24).
// Hybrid resolution per MMF §19.7 D-1:
//   1. DB row matching the (slot_key, scope, geo) cascade
//   2. PillarConfig fallbackContent
//   3. nothing (caller hides slot — D-4)

import { useEffect, useRef, useState } from 'react';
import { resolveSlotConfig, type SlotKey } from '@/lib/pillars/pillar.types';
import { usePillar } from '@/lib/pillars/PillarContext';
import { queryPromotionForSlot } from './query';
import type { Promotion, SlotResult } from './types';

/**
 * Reader hook. Returns the winning promotion + effective config for a slot.
 *
 * Inputs are the SlotContext shape — slotKey is required; everything else is
 * optional and defaults to "no scope at this level". Re-runs when any input
 * changes.
 *
 * Note on `astra` defaulting: when the caller does not pass `astra`, the hook
 * substitutes the current PillarContext slug (foundation = no substitution).
 * This matches the common case where slots are mounted in shared layouts and
 * the astra is implicit from the host.
 */
export function usePromotionSlot(input: {
  slotKey: SlotKey;
  astra?: string | null;
  realmSlug?: string | null;
  branchPath?: string | null;
  atomId?: string | null;
  geoCountry?: string | null;
}): SlotResult {
  const pillar = usePillar();
  const slotKey = input.slotKey;
  const config = resolveSlotConfig(pillar, slotKey);

  // Astra substitution: caller-provided wins; otherwise pillar slug; else null.
  const astra = input.astra ?? pillar?.slug ?? null;
  const realmSlug = input.realmSlug ?? null;
  const branchPath = input.branchPath ?? null;
  const atomId = input.atomId ?? null;
  const geoCountry = input.geoCountry ?? null;

  const [promotion, setPromotion] = useState<Promotion | null>(null);
  const [loading, setLoading] = useState<boolean>(config.enabled);
  // Remember the last query key so re-renders that don't change the inputs
  // don't kick off duplicate fetches.
  const lastKey = useRef<string>('');

  useEffect(() => {
    if (!config.enabled) {
      setPromotion(null);
      setLoading(false);
      return;
    }
    const key = [
      slotKey,
      astra ?? '',
      realmSlug ?? '',
      branchPath ?? '',
      atomId ?? '',
      geoCountry ?? '',
    ].join('|');
    if (key === lastKey.current) return;
    lastKey.current = key;

    let cancelled = false;
    setLoading(true);

    queryPromotionForSlot({
      slotKey,
      astra,
      realmSlug,
      branchPath,
      atomId,
      geoCountry,
    })
      .then((row) => {
        if (cancelled) return;
        setPromotion(row);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setPromotion(null);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    config.enabled,
    slotKey,
    astra,
    realmSlug,
    branchPath,
    atomId,
    geoCountry,
  ]);

  const fallbackContent = config.fallbackContent ?? null;

  return {
    enabled: config.enabled,
    promotion,
    fallbackContent,
    behavior: promotion?.behavior ?? config.behavior,
    feedInlinePosition: config.feedInlinePosition,
    loading,
    config,
  };
}
