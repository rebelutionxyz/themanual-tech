import { PLACES_ROOT } from '@/components/shell/LocationPanel';
import { RealmChips } from '@/components/shell/RealmChipsBar';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

/**
 * One-line center header for community surfaces: [icon] Explore {Friendly}
 * + the selected-realm chips right behind the name (same treatment as
 * INTEL's header — Butch 2026-07-18). `action` stays right-aligned.
 */
export function SurfaceHeader({
  friendly,
  icon: Icon,
  accent,
  action,
}: {
  friendly: string;
  icon: LucideIcon;
  accent: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
      <div className="flex min-w-0 flex-wrap items-center gap-3">
        <h1
          className="flex items-center gap-2 font-display tracking-wide text-zinc-900"
          style={{ fontSize: '24px' }}
        >
          <Icon size={24} style={{ color: accent }} />
          Explore {friendly}
        </h1>
        {/* Topic realms only — a place pick shows in the LocationBadge. */}
        <RealmChips excludePrefixes={[PLACES_ROOT]} />
      </div>
      {action}
    </div>
  );
}
