import { useMemo } from 'react';
import {
  Scale,
  BookOpen,
  Hammer,
  User,
  Globe2,
  HeartPulse,
  Users,
  Sigma,
  FlaskConical,
  Brain,
  Cpu,
  Hourglass,
  Palette,
  Sparkles,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { RealmId } from '@/types/manual';
import { useManualStore } from '@/stores/useManualStore';
import { useManualData } from '@/lib/useManualData';
import { REALM_ORDER, REALM_NAMES } from '@/lib/constants';
import { cn, formatCount } from '@/lib/utils';

const REALM_ICONS: Record<RealmId, LucideIcon> = {
  justice: Scale,
  reference: BookOpen,
  human_activities: Hammer,
  self: User,
  geography: Globe2,
  health: HeartPulse,
  society: Users,
  math: Sigma,
  science: FlaskConical,
  philosophy: Brain,
  tech: Cpu,
  history: Hourglass,
  culture: Palette,
  religion: Sparkles,
};

export function RealmSidebar() {
  const { atoms } = useManualData();
  const selectedRealmId = useManualStore((s) => s.selectedRealmId);
  const setSelectedRealmId = useManualStore((s) => s.setSelectedRealmId);

  const counts = useMemo(() => {
    const c: Partial<Record<RealmId, number>> = {};
    for (const a of atoms) c[a.realmId] = (c[a.realmId] ?? 0) + 1;
    return c;
  }, [atoms]);

  return (
    <nav className="flex h-full flex-col items-center gap-1 overflow-y-auto border-r border-border bg-bg-elevated py-3">
      <button
        type="button"
        onClick={() => setSelectedRealmId(null)}
        className={cn(
          'group relative mb-1 flex h-10 w-10 items-center justify-center rounded-lg border transition-all',
          selectedRealmId === null
            ? 'border-text-silver/60 bg-text-silver/10 text-text'
            : 'border-transparent text-text-muted hover:border-border-bright hover:text-text-silver',
        )}
        aria-label="All realms"
        title="All 14 realms"
      >
        <span className="font-display text-lg">∴</span>
      </button>
      <div className="mb-1 h-px w-6 bg-border" />

      {REALM_ORDER.map((realmId) => {
        const Icon = REALM_ICONS[realmId];
        const name = REALM_NAMES[realmId];
        const isActive = selectedRealmId === realmId;
        const count = counts[realmId] ?? 0;
        return (
          <button
            type="button"
            key={realmId}
            onClick={() => setSelectedRealmId(isActive ? null : realmId)}
            className={cn(
              'group relative flex h-10 w-10 items-center justify-center rounded-lg border transition-all',
              isActive
                ? 'border-text-silver/60 bg-text-silver/10 text-text'
                : 'border-transparent text-text-muted hover:border-border-bright hover:text-text-silver',
            )}
            title={`${name} · ${count} atoms`}
            aria-label={name}
          >
            <Icon size={16} strokeWidth={1.75} />
            <span
              className="absolute left-full top-1/2 z-10 ml-2 -translate-y-1/2 whitespace-nowrap rounded bg-bg-elevated px-2 py-1 font-mono text-text-silver opacity-0 shadow-lg ring-1 ring-border transition-opacity group-hover:opacity-100 pointer-events-none"
              style={{ fontSize: '11px' }}
              data-size="meta"
            >
              {name} · {formatCount(count)}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
