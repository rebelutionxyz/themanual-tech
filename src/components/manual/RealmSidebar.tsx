import { useMemo } from 'react';
import {
  Heart,
  Brain,
  Sparkles,
  Leaf,
  Home,
  Hammer,
  Gamepad2,
  Wrench,
  Briefcase,
  Coins,
  Cpu,
  Globe2,
  Crown,
} from 'lucide-react';
import { useManualStore } from '@/stores/useManualStore';
import { useManualData } from '@/lib/useManualData';
import { REALM_ORDER } from '@/lib/constants';
import { cn, formatCount } from '@/lib/utils';

const REALM_ICONS = {
  Body: Heart,
  Mind: Brain,
  Spirit: Sparkles,
  Nature: Leaf,
  Home: Home,
  Craft: Hammer,
  Play: Gamepad2,
  Gear: Wrench,
  Work: Briefcase,
  Money: Coins,
  Tech: Cpu,
  World: Globe2,
  Power: Crown,
} as const;

export function RealmSidebar() {
  const { atoms } = useManualData();
  const selectedRealm = useManualStore((s) => s.selectedRealm);
  const setSelectedRealm = useManualStore((s) => s.setSelectedRealm);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const a of atoms) c[a.realm] = (c[a.realm] ?? 0) + 1;
    return c;
  }, [atoms]);

  return (
    <nav className="flex h-full flex-col items-center gap-1 overflow-y-auto border-r border-border bg-bg-elevated py-3">
      <button
        type="button"
        onClick={() => setSelectedRealm(null)}
        className={cn(
          'group relative mb-1 flex h-10 w-10 items-center justify-center rounded-lg border transition-all',
          selectedRealm === null
            ? 'border-text-silver/60 bg-text-silver/10 text-text'
            : 'border-transparent text-text-muted hover:border-border-bright hover:text-text-silver',
        )}
        aria-label="All realms"
        title="All 13 realms"
      >
        <span className="font-display text-lg">∴</span>
      </button>
      <div className="mb-1 h-px w-6 bg-border" />

      {REALM_ORDER.map((realm) => {
        const Icon = REALM_ICONS[realm];
        const isActive = selectedRealm === realm;
        const count = counts[realm] ?? 0;
        return (
          <button
            type="button"
            key={realm}
            onClick={() => setSelectedRealm(isActive ? null : realm)}
            className={cn(
              'group relative flex h-10 w-10 items-center justify-center rounded-lg border transition-all',
              isActive
                ? 'border-text-silver/60 bg-text-silver/10 text-text'
                : 'border-transparent text-text-muted hover:border-border-bright hover:text-text-silver',
            )}
            title={`${realm} · ${count} atoms`}
            aria-label={realm}
          >
            <Icon size={16} strokeWidth={1.75} />
            <span
              className="absolute left-full top-1/2 z-10 ml-2 -translate-y-1/2 whitespace-nowrap rounded bg-bg-elevated px-2 py-1 font-mono text-text-silver opacity-0 shadow-lg ring-1 ring-border transition-opacity group-hover:opacity-100 pointer-events-none"
              style={{ fontSize: '11px' }}
              data-size="meta"
            >
              {realm} · {formatCount(count)}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
