import { Clock } from 'lucide-react';
import { ScrollRow } from '@/components/ui/ScrollRow';
import { cn } from '@/lib/utils';
import type { TimeWindow } from '@/stores/useIntelStore';

interface TimeWindowBarProps {
  value: TimeWindow;
  onChange: (hours: TimeWindow) => void;
  /** Label shown as the leading meta (e.g., "Hot in" or "Breaking in") */
  label?: string;
  /** Accent color for active pill */
  accentColor?: string;
}

interface WindowOption {
  hours: TimeWindow;
  label: string;
}

const WINDOW_OPTIONS: WindowOption[] = [
  { hours: 1, label: '1h' },
  { hours: 4, label: '4h' },
  { hours: 12, label: '12h' },
  { hours: 24, label: '24h' },
  { hours: 48, label: '48h' },
  { hours: 72, label: '72h' },
  { hours: 0, label: 'All' },
];

const INTEL_BLUE = '#6B94C8';

/**
 * Horizontal scroll row for picking a time window.
 * Used on Hot and Breaking views to scope results to a recent window.
 */
export function TimeWindowBar({
  value,
  onChange,
  label,
  accentColor = INTEL_BLUE,
}: TimeWindowBarProps) {
  return (
    <div className="mb-4 rounded-lg border border-border bg-bg-elevated">
      <ScrollRow
        leading={
          label ? (
            <div
              className="flex items-center gap-1.5 pl-1 font-mono uppercase tracking-wider text-text-muted"
              style={{ fontSize: '11px' }}
              data-size="meta"
            >
              <Clock size={11} />
              <span>{label}</span>
            </div>
          ) : undefined
        }
      >
        {WINDOW_OPTIONS.map((opt) => {
          const active = value === opt.hours;
          return (
            <button
              key={opt.hours}
              type="button"
              onClick={() => onChange(opt.hours)}
              className={cn(
                'flex-shrink-0 rounded-md border px-2.5 py-1 transition-colors',
              )}
              style={{
                fontSize: '12px',
                borderColor: active ? `${accentColor}80` : 'transparent',
                background: active ? `${accentColor}20` : 'transparent',
                color: active ? accentColor : '#C8D1DA',
                fontWeight: active ? 500 : 400,
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              {opt.label}
            </button>
          );
        })}
      </ScrollRow>
    </div>
  );
}
