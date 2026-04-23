import { useMemo } from 'react';
import { useManualData } from '@/lib/useManualData';
import { FRONT_ORDER } from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { Front } from '@/types/manual';

const FRONT_SET = new Set<string>(FRONT_ORDER);

interface L3RefinementProps {
  selectedRealm: string | null;
  selectedFront: Front | null;
  selectedL2: string | null;
  selectedL3: string | null;
  onSelectL3: (l3: string | null) => void;
}

/**
 * Body-level refinement row. Only visible when a realm + L2 are selected.
 * Shows L3 sub-sub-categories for the selected L2.
 * Sits between page header and thread list, flush with content width.
 *
 * Note: filters out any L3 that matches a Front name — the Manual data has
 * some atoms where Front names leak into L3 positions (taxonomy cleanup TBD).
 */
export function L3Refinement({
  selectedRealm,
  selectedFront,
  selectedL2,
  selectedL3,
  onSelectL3,
}: L3RefinementProps) {
  const { atoms } = useManualData();

  const l3Options = useMemo(() => {
    if (!selectedRealm || !selectedL2) return [] as string[];
    const set = new Set<string>();
    for (const a of atoms) {
      if (a.realm !== selectedRealm) continue;
      if (selectedFront && a.front !== selectedFront) continue;
      if (a.L2 !== selectedL2) continue;
      if (!a.L3) continue;
      // Filter out Front names that leak into L3 positions (data quirk)
      if (FRONT_SET.has(a.L3)) continue;
      set.add(a.L3);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [atoms, selectedRealm, selectedFront, selectedL2]);

  if (l3Options.length === 0) return null;

  return (
    <div className="mb-4 rounded-lg border border-border bg-bg-elevated/40 px-3 py-2">
      <div
        className="mb-1.5 font-mono uppercase tracking-wider text-text-muted"
        style={{ fontSize: '10.5px' }}
        data-size="meta"
      >
        Refine: {selectedL2}
      </div>
      <div className="flex flex-wrap gap-1">
        <button
          type="button"
          onClick={() => onSelectL3(null)}
          className={cn(
            'rounded-md border px-2 py-0.5 transition-colors',
            selectedL3 === null
              ? 'border-text-silver/40 bg-bg text-text'
              : 'border-transparent text-text-dim hover:border-border hover:text-text-silver',
          )}
          style={{ fontSize: '11px' }}
        >
          All
        </button>
        {l3Options.map((l3) => (
          <button
            key={l3}
            type="button"
            onClick={() => onSelectL3(selectedL3 === l3 ? null : l3)}
            className={cn(
              'rounded-md border px-2 py-0.5 transition-colors',
              selectedL3 === l3
                ? 'border-text-silver/40 bg-bg text-text'
                : 'border-transparent text-text-silver hover:border-border hover:bg-bg',
            )}
            style={{ fontSize: '11px' }}
          >
            {l3}
          </button>
        ))}
      </div>
    </div>
  );
}
