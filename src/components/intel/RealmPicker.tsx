import { useMemo } from 'react';
import { REALM_ORDER, FRONT_ORDER, FRONT_CLASS, FRONT_COLORS } from '@/lib/constants';
import { useManualData } from '@/lib/useManualData';
import type { Front } from '@/types/manual';
import { cn } from '@/lib/utils';

export interface RealmSelection {
  realm: string | null;
  front: Front | null;
  l2: string | null;
}

interface RealmPickerProps {
  value: RealmSelection;
  onChange: (next: RealmSelection) => void;
  /** Label above the picker */
  label?: string;
  /** Is this auto-derived from linked atoms? */
  autoDerived?: boolean;
  /** Hint shown if auto-derived */
  derivedHint?: string;
  /** Whether a realm is required */
  required?: boolean;
  /** Error message to display */
  error?: string;
}

/**
 * Universal realm/front/L2 picker.
 *
 * Behavior:
 * - Realm selected first (required when not auto-derived)
 * - Once realm chosen, L2 sub-categories auto-populate from atoms
 * - Power realm reveals Fronts alongside L2s
 * - When autoDerived is true, shows the derivation as informational,
 *   but allows manual override
 */
export function RealmPicker({
  value,
  onChange,
  label = 'Realm',
  autoDerived = false,
  derivedHint,
  required,
  error,
}: RealmPickerProps) {
  const { atoms, loaded } = useManualData();

  // Compute L2 categories for currently-selected realm
  const l2Options = useMemo(() => {
    if (!loaded || !value.realm) return [] as string[];
    const set = new Set<string>();
    const frontSet = new Set<string>(FRONT_ORDER);
    for (const a of atoms) {
      if (a.realm !== value.realm) continue;
      if (!a.L2) continue;
      // Skip Front names when realm=Power (Fronts handled separately)
      if (value.realm === 'Power' && frontSet.has(a.L2)) continue;
      set.add(a.L2);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [atoms, loaded, value.realm]);

  const isPower = value.realm === 'Power';

  return (
    <div className="w-full">
      {label && (
        <div className="mb-1.5 flex items-center gap-2">
          <span
            className="font-mono uppercase tracking-wider text-text-muted"
            style={{ fontSize: '11px' }}
            data-size="meta"
          >
            {label}
            {required && !autoDerived && <span className="ml-1 text-kettle-unsourced">*</span>}
          </span>
          {autoDerived && (
            <span
              className="rounded bg-kettle-sourced/15 px-1.5 py-0.5 font-mono text-kettle-sourced"
              style={{ fontSize: '10px' }}
              data-size="meta"
            >
              auto
            </span>
          )}
        </div>
      )}

      {autoDerived && derivedHint && (
        <p
          className="mb-2 font-mono text-text-muted"
          style={{ fontSize: '11px' }}
          data-size="meta"
        >
          {derivedHint}
        </p>
      )}

      {/* Realm chips */}
      <div className="scrollbar-none flex flex-wrap gap-1">
        <RealmChip
          label="— none —"
          active={value.realm === null}
          onClick={() => onChange({ realm: null, front: null, l2: null })}
        />
        {REALM_ORDER.map((r) => (
          <RealmChip
            key={r}
            label={r}
            active={value.realm === r}
            onClick={() =>
              onChange({
                realm: value.realm === r ? null : r,
                front: null,
                l2: null,
              })
            }
          />
        ))}
      </div>

      {/* Power → show Fronts row */}
      {isPower && (
        <div className="mt-2 flex flex-wrap gap-1">
          <span
            className="mr-1 flex items-center font-mono uppercase tracking-wider text-text-muted"
            style={{ fontSize: '10px' }}
            data-size="meta"
          >
            Fronts:
          </span>
          {FRONT_ORDER.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() =>
                onChange({
                  ...value,
                  front: value.front === f ? null : f,
                  l2: null,
                })
              }
              className={cn(
                'rounded-md border px-2 py-0.5 transition-colors',
                'font-display tracking-wide',
                FRONT_CLASS[f],
                value.front === f
                  ? 'border-current bg-current/10'
                  : 'border-transparent hover:border-current/40 hover:bg-bg-elevated',
              )}
              style={{ fontSize: '12px' }}
            >
              {f}
            </button>
          ))}
        </div>
      )}

      {/* L2 row */}
      {l2Options.length > 0 && !value.front && (
        <div className="mt-2 flex flex-wrap gap-1">
          <span
            className="mr-1 flex items-center font-mono uppercase tracking-wider text-text-muted"
            style={{ fontSize: '10px' }}
            data-size="meta"
          >
            Subcategory:
          </span>
          {l2Options.map((sub) => (
            <button
              key={sub}
              type="button"
              onClick={() => onChange({ ...value, l2: value.l2 === sub ? null : sub })}
              className={cn(
                'rounded-md border px-2 py-0.5 text-text-silver transition-colors',
                value.l2 === sub
                  ? 'border-text-silver/40 bg-bg-elevated text-text'
                  : 'border-transparent hover:border-border hover:bg-bg-elevated',
              )}
              style={{ fontSize: '12px' }}
            >
              {sub}
            </button>
          ))}
        </div>
      )}

      {error && (
        <p className="mt-1 text-kettle-unsourced" style={{ fontSize: '11px' }} data-size="meta">
          {error}
        </p>
      )}

      {/* Current selection summary */}
      {value.realm && (
        <div
          className="mt-2 font-mono text-text-dim"
          style={{ fontSize: '11px' }}
          data-size="meta"
        >
          Selected:{' '}
          <span className="text-text-silver">{value.realm}</span>
          {value.front && (
            <>
              {' · '}
              <span style={{ color: FRONT_COLORS[value.front] }}>{value.front}</span>
            </>
          )}
          {value.l2 && (
            <>
              {' · '}
              <span className="text-text-silver">{value.l2}</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function RealmChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-md border px-2.5 py-1 tracking-wide transition-all',
        active
          ? 'border-text-silver/50 bg-bg-elevated text-text'
          : 'border-border bg-bg text-text-dim hover:border-border-bright hover:text-text-silver',
      )}
      style={{ fontSize: '12px' }}
    >
      {label}
    </button>
  );
}
