import { useState, useEffect, useRef } from 'react';
import { Clock, ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TimeWindow } from '@/stores/useIntelStore';

interface TimeWindowBarProps {
  value: TimeWindow;
  onChange: (hours: TimeWindow) => void;
  /** Verb/mode label: "Hot" or "Breaking" */
  mode: 'hot' | 'breaking';
  /** Accent color */
  accentColor?: string;
}

interface WindowOption {
  hours: TimeWindow;
  label: string;
}

const WINDOW_OPTIONS: WindowOption[] = [
  { hours: 1, label: 'Past hour' },
  { hours: 4, label: 'Past 4 hours' },
  { hours: 12, label: 'Past 12 hours' },
  { hours: 24, label: 'Past 24 hours' },
  { hours: 48, label: 'Past 48 hours' },
  { hours: 72, label: 'Past 72 hours' },
  { hours: 0, label: 'All time' },
];

const INTEL_BLUE = '#6B94C8';

/**
 * Dropdown for picking a time window, reads as natural language.
 * "Hot in past hour" / "Breaking in past 12 hours"
 */
export function TimeWindowBar({
  value,
  onChange,
  mode,
  accentColor = INTEL_BLUE,
}: TimeWindowBarProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const current = WINDOW_OPTIONS.find((o) => o.hours === value) ?? WINDOW_OPTIONS[3];
  const verb = mode === 'hot' ? 'Hot' : 'Breaking';

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <div className="relative mb-3" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-md border bg-bg-elevated px-3 py-1.5 transition-colors hover:bg-bg"
        style={{
          fontSize: '12px',
          borderColor: `${accentColor}60`,
          color: '#C8D1DA',
        }}
      >
        <Clock size={12} style={{ color: accentColor }} />
        <span>
          <span style={{ color: accentColor, fontWeight: 500 }}>{verb}</span>
          <span className="text-text-dim"> in </span>
          <span style={{ color: '#E8ECF1' }}>{current.label.toLowerCase()}</span>
        </span>
        <ChevronDown
          size={12}
          className={cn(
            'text-text-muted transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>

      {open && (
        <div
          className="absolute left-0 top-full z-20 mt-1 min-w-[200px] overflow-hidden rounded-md border bg-bg-elevated shadow-lg"
          style={{ borderColor: `${accentColor}50` }}
        >
          {WINDOW_OPTIONS.map((opt) => {
            const active = value === opt.hours;
            return (
              <button
                key={opt.hours}
                type="button"
                onClick={() => {
                  onChange(opt.hours);
                  setOpen(false);
                }}
                className={cn(
                  'flex w-full items-center justify-between gap-2 px-3 py-2 text-left transition-colors',
                  active
                    ? 'bg-bg text-text'
                    : 'text-text-silver hover:bg-bg',
                )}
                style={{ fontSize: '12px' }}
              >
                <span>
                  <span className="text-text-dim">{verb} in </span>
                  <span style={active ? { color: accentColor, fontWeight: 500 } : undefined}>
                    {opt.label.toLowerCase()}
                  </span>
                </span>
                {active && (
                  <Check size={12} style={{ color: accentColor }} />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
