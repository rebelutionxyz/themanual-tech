import { useState, type ReactNode } from 'react';
import * as Icons from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AdminSection, AdminTier } from './types';
import { TIER_ACCENT, TIER_LABEL } from './types';

interface AdminLayoutProps {
  tier: AdminTier;
  sections: AdminSection[];
  emptyState?: ReactNode;
}

const SIDEBAR_BG = '#0A1628';
const SIDEBAR_LABEL = '#5A7BAA';
const SIDEBAR_INACTIVE = '#6B8AB8';

function rgba(hex: string, alpha: number): string {
  const m = hex.replace('#', '');
  const r = Number.parseInt(m.slice(0, 2), 16);
  const g = Number.parseInt(m.slice(2, 4), 16);
  const b = Number.parseInt(m.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function getIcon(name: string) {
  const Lookup = Icons as unknown as Record<string, Icons.LucideIcon | undefined>;
  return Lookup[name] ?? Icons.Square;
}

export function AdminLayout({ tier, sections, emptyState }: AdminLayoutProps) {
  const accent = TIER_ACCENT[tier];
  const [activeSlug, setActiveSlug] = useState<string | null>(
    sections[0]?.slug ?? null,
  );

  const active = sections.find((s) => s.slug === activeSlug) ?? null;
  const ActiveComponent = active?.component ?? null;

  return (
    <div
      className="grid flex-1 grid-cols-[16rem_1fr]"
      style={{ background: SIDEBAR_BG }}
    >
      <aside
        className="border-r border-white/5 px-4 py-6"
        style={{ background: SIDEBAR_BG }}
      >
        <div
          className="mb-4 px-2 text-[11px] font-semibold uppercase tracking-wider"
          style={{ color: SIDEBAR_LABEL }}
        >
          {TIER_LABEL[tier]}
        </div>

        <nav className="flex flex-col gap-0.5">
          {sections.map((s) => {
            const Icon = getIcon(s.icon);
            const isActive = s.slug === activeSlug;
            return (
              <button
                type="button"
                key={s.slug}
                onClick={() => setActiveSlug(s.slug)}
                className={cn(
                  'flex items-center gap-2.5 px-3 py-2 text-sm transition-colors',
                  'border-l-2',
                )}
                style={{
                  background: isActive ? rgba(accent, 0.12) : 'transparent',
                  borderLeftColor: isActive ? accent : 'transparent',
                  color: isActive ? accent : SIDEBAR_INACTIVE,
                  fontWeight: isActive ? 500 : 400,
                }}
              >
                <Icon size={15} />
                <span>{s.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      <main
        className="px-6 py-8 md:px-10 md:py-10"
        style={{ background: accent }}
      >
        {sections.length === 0
          ? emptyState ?? null
          : ActiveComponent
            ? <ActiveComponent />
            : null}
      </main>
    </div>
  );
}
