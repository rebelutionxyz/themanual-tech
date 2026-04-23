import { useMemo } from 'react';
import { useManualData } from '@/lib/useManualData';
import { FRONT_ORDER } from '@/lib/constants';
import { ScrollRow, RowLabel } from '@/components/ui/ScrollRow';
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
 * Horizontally scrollable with chevron arrows matching realm/L2/Fronts pattern.
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
      if (FRONT_SET.has(a.L3)) continue; // strip Front names that leak into L3
      set.add(a.L3);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [atoms, selectedRealm, selectedFront, selectedL2]);

  if (l3Options.length === 0) return null;

  return (
    <div className="mb-4 rounded-lg border border-border bg-bg-elevated/40">
      <ScrollRow leading={<RowLabel>Refine: {selectedL2}</RowLabel>}>
        <button
          type="button"
          onClick={() => onSelectL3(null)}
          className={cn(
            'flex-shrink-0 rounded-md border px-2 py-0.5 transition-colors',
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
              'flex-shrink-0 rounded-md border px-2 py-0.5 transition-colors',
              selectedL3 === l3
                ? 'border-text-silver/40 bg-bg text-text'
                : 'border-transparent text-text-silver hover:border-border hover:bg-bg',
            )}
            style={{ fontSize: '11px' }}
          >
            {l3}
          </button>
        ))}
      </ScrollRow>
    </div>
  );
}
