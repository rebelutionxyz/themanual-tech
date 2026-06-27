import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

/**
 * One-line center header for community surfaces: [icon] Explore {Friendly}.
 * No eyebrow, no tagline. `action` (e.g. a Create button) is right-aligned on
 * the same row so the create entry point survives the trim.
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
    <div className="mb-5 flex items-center justify-between gap-4">
      <h1
        className="flex items-center gap-2 font-display tracking-wide text-zinc-900"
        style={{ fontSize: '24px' }}
      >
        <Icon size={24} style={{ color: accent }} />
        Explore {friendly}
      </h1>
      {action}
    </div>
  );
}
