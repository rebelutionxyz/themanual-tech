import { REALM_ORDER, FRONT_ORDER, FRONT_CLASS } from '@/lib/constants';
import { ScrollRow, RowLabel } from '@/components/ui/ScrollRow';
import { cn } from '@/lib/utils';
import type { Front } from '@/types/manual';

interface RealmBarProps {
  selectedRealm: string | null;
  selectedFront: Front | null;
  selectedL2: string | null;
  onSelectRealm: (realm: string | null) => void;
  onSelectFront: (front: Front | null) => void;
  onSelectL2: (l2: string | null) => void;
  realmSubs?: Record<string, string[]>;
}

const FRONT_SET = new Set<string>(FRONT_ORDER);

export function RealmBar({
  selectedRealm,
  selectedFront,
  selectedL2,
  onSelectRealm,
  onSelectFront,
  onSelectL2,
  realmSubs = {},
}: RealmBarProps) {
  // L2s for current realm, stripped of any Front names
  const subsForRealm = selectedRealm ? realmSubs[selectedRealm] ?? [] : [];
  const l2Options = subsForRealm.filter((s) => !FRONT_SET.has(s));

  const hasRealm = selectedRealm !== null;
  const isPower = selectedRealm === 'Power';

  return (
    <div className="sticky top-0 z-30 border-b border-border bg-bg-elevated/95 backdrop-blur-md">
      {/* ROW 1 — 13 Realms */}
      <ScrollRow>
        <RealmChip
          label="All"
          active={selectedRealm === null}
          onClick={() => {
            onSelectRealm(null);
            onSelectFront(null);
            onSelectL2(null);
          }}
        />
        <div className="h-5 w-px flex-shrink-0 bg-border" aria-hidden="true" />
        {REALM_ORDER.map((realm) => (
          <RealmChip
            key={realm}
            label={realm}
            active={selectedRealm === realm}
            onClick={() => {
              onSelectRealm(selectedRealm === realm ? null : realm);
              onSelectFront(null);
              onSelectL2(null);
            }}
          />
        ))}
      </ScrollRow>

      {/* ROW 2 — L2 subs (shown for any selected realm, INCLUDING Power) */}
      {hasRealm && l2Options.length > 0 && (
        <ScrollRow
          className="border-t border-border bg-bg/40"
          leading={<RowLabel>Subs</RowLabel>}
        >
          {l2Options.map((sub) => (
            <L2Chip
              key={sub}
              label={sub}
              active={selectedL2 === sub}
              onClick={() => onSelectL2(selectedL2 === sub ? null : sub)}
            />
          ))}
        </ScrollRow>
      )}

      {/* ROW 3 — Fronts (Power realm only) */}
      {isPower && (
        <ScrollRow
          className="border-t border-border bg-bg/40"
          leading={<RowLabel>Fronts</RowLabel>}
        >
          {FRONT_ORDER.map((front) => (
            <button
              key={front}
              type="button"
              onClick={() =>
                onSelectFront(selectedFront === front ? null : front)
              }
              className={cn(
                'flex-shrink-0 rounded-md border px-2.5 py-1 transition-colors',
                'font-display tracking-wide',
                FRONT_CLASS[front],
                selectedFront === front
                  ? 'border-current bg-current/10'
                  : 'border-transparent hover:border-current/40 hover:bg-bg-elevated',
              )}
              style={{ fontSize: '13px' }}
            >
              {front}
            </button>
          ))}
        </ScrollRow>
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
        'flex-shrink-0 rounded-md border px-3 py-1.5 font-medium tracking-wide transition-all',
        active
          ? 'border-text-silver/50 bg-bg text-text'
          : 'border-transparent text-text-dim hover:bg-bg hover:text-text-silver',
      )}
      style={{ fontSize: '13px' }}
    >
      {label}
    </button>
  );
}

function L2Chip({
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
        'flex-shrink-0 rounded-md border px-2.5 py-1 text-text-silver transition-colors',
        active
          ? 'border-text-silver/40 bg-bg-elevated text-text'
          : 'border-transparent hover:border-border hover:bg-bg-elevated',
      )}
      style={{ fontSize: '12px' }}
    >
      {label}
    </button>
  );
}
