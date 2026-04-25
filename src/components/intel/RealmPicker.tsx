import { useMemo } from 'react';
import { REALM_ORDER, REALM_NAMES } from '@/lib/constants';
import { useManualData } from '@/lib/useManualData';
import type { RealmId } from '@/types/manual';
import { cn } from '@/lib/utils';

export interface RealmSelection {
  realmId: RealmId | null;
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
 * Universal realm/L2 picker.
 *
 * - Realm selected first (required when not auto-derived)
 * - Once realm chosen, L2 sub-categories auto-populate from atoms in that realm
 * - When autoDerived is true, the derivation is shown but manually overridable
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

  const l2Options = useMemo(() => {
    if (!loaded || !value.realmId) return [] as string[];
    const set = new Set<string>();
    for (const a of atoms) {
      if (a.realmId !== value.realmId) continue;
      const l2 = a.pathParts[1];
      if (l2) set.add(l2);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [atoms, loaded, value.realmId]);

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
          active={value.realmId === null}
          onClick={() => onChange({ realmId: null, l2: null })}
        />
        {REALM_ORDER.map((r) => (
          <RealmChip
            key={r}
            label={REALM_NAMES[r]}
            active={value.realmId === r}
            onClick={() =>
              onChange({
                realmId: value.realmId === r ? null : r,
                l2: null,
              })
            }
          />
        ))}
      </div>

      {/* L2 row */}
      {l2Options.length > 0 && (
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
      {value.realmId && (
        <div
          className="mt-2 font-mono text-text-dim"
          style={{ fontSize: '11px' }}
          data-size="meta"
        >
          Selected:{' '}
          <span className="text-text-silver">{REALM_NAMES[value.realmId]}</span>
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
