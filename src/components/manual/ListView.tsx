import { useMemo } from 'react';
import type { Atom } from '@/types/manual';
import { useManualStore } from '@/stores/useManualStore';
import { useManualData } from '@/lib/useManualData';
import { KettlePill } from '@/components/ui/KettlePill';
import { cn, formatCount } from '@/lib/utils';
import { FRONT_CLASS } from '@/lib/constants';

export function ListView() {
  const { atoms } = useManualData();
  const searchQuery = useManualStore((s) => s.searchQuery);
  const selectedRealm = useManualStore((s) => s.selectedRealm);
  const selectedKettle = useManualStore((s) => s.selectedKettle);
  const selectedTags = useManualStore((s) => s.selectedTags);
  const selectAtom = useManualStore((s) => s.selectAtom);

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return atoms
      .filter((a) => {
        if (selectedRealm && a.realm !== selectedRealm) return false;
        if (selectedKettle && a.kettle !== selectedKettle) return false;
        if (
          selectedTags.length > 0 &&
          !selectedTags.every((t) => a.themeTags.includes(t))
        )
          return false;
        if (q) {
          if (
            !a.name.toLowerCase().includes(q) &&
            !a.path.toLowerCase().includes(q) &&
            !a.themeTags.some((t) => t.toLowerCase().includes(q))
          )
            return false;
        }
        return true;
      })
      .slice(0, 500); // cap at 500 for perf; can paginate later
  }, [atoms, searchQuery, selectedRealm, selectedKettle, selectedTags]);

  return (
    <div className="px-4 py-3 md:px-6 md:py-4">
      <p
        className="mb-3 font-mono text-text-muted"
        style={{ fontSize: '12px' }}
        data-size="meta"
      >
        Showing {formatCount(filtered.length)} of {formatCount(atoms.length)} atoms
        {filtered.length === 500 && ' (first 500)'}
      </p>

      <div className="rounded border border-border">
        {filtered.map((atom, i) => (
          <ListRow
            key={atom.id}
            atom={atom}
            onSelect={() => selectAtom(atom.id)}
            even={i % 2 === 0}
          />
        ))}
        {filtered.length === 0 && (
          <div className="p-8 text-center">
            <p className="text-text-dim" style={{ fontSize: '13px' }}>
              No atoms match your filters.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function ListRow({
  atom,
  onSelect,
  even,
}: {
  atom: Atom;
  onSelect: () => void;
  even: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'grid w-full grid-cols-[1fr_auto] items-center gap-3 px-4 py-2 text-left',
        'hover:bg-bg-elevated transition-colors',
        'border-b border-border last:border-b-0',
        even && 'bg-bg',
        !even && 'bg-bg-elevated/30',
      )}
    >
      <div className="min-w-0">
        <div className="flex items-baseline gap-2">
          <span
            className={cn(
              'truncate text-sm font-medium',
              atom.front ? FRONT_CLASS[atom.front] : 'text-text',
            )}
          >
            {atom.name}
          </span>
        </div>
        <div
          className="mt-0.5 truncate font-mono text-text-muted"
          style={{ fontSize: '11px' }}
          data-size="meta"
        >
          {atom.path}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <KettlePill state={atom.kettle} />
      </div>
    </button>
  );
}
