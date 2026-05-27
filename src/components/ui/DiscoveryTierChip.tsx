// DiscoveryTierChip — small inline-styled chip displaying an atom's tier.
//
// Single source of truth for tier visual: src/lib/discovery-ladder/colors.ts.
// Hover tooltip surfaces the tier description (per amendment §2.1).

import {
  DISCOVERY_TIER_COLORS,
  type DiscoveryTier,
} from '@/lib/discovery-ladder/colors';
import { cn } from '@/lib/utils';

interface DiscoveryTierChipProps {
  tier: DiscoveryTier;
  /** Compact mode shows first 3 letters in monospace (e.g. SOU, ACC) */
  compact?: boolean;
  className?: string;
}

export function DiscoveryTierChip({
  tier,
  compact = false,
  className,
}: DiscoveryTierChipProps) {
  const style = DISCOVERY_TIER_COLORS[tier];
  const label = compact ? tier.slice(0, 3).toUpperCase() : tier;

  return (
    <span
      title={`${style.label} — ${style.description}`}
      className={cn(
        'inline-flex items-center rounded font-mono uppercase tracking-wider',
        'px-1.5 py-0.5 text-[11px] font-medium leading-none',
        className,
      )}
      style={{ backgroundColor: style.bg, color: style.text }}
      data-size="meta"
      data-tier={tier}
    >
      {label}
    </span>
  );
}
