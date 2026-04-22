import type { KettleState } from '@/types/manual';
import { KETTLE_ABBREV, KETTLE_DESCRIPTIONS } from '@/lib/constants';
import { cn } from '@/lib/utils';

interface KettlePillProps {
  state: KettleState;
  expanded?: boolean;
  className?: string;
}

export function KettlePill({ state, expanded = false, className }: KettlePillProps) {
  return (
    <span
      title={KETTLE_DESCRIPTIONS[state]}
      className={cn('kettle-pill', `kettle-${state}`, className)}
      data-size="meta"
    >
      {expanded ? state : KETTLE_ABBREV[state]}
    </span>
  );
}
