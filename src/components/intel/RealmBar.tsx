import { REALM_ORDER, REALM_NAMES } from '@/lib/constants';
import { ScrollRow, RowLabel } from '@/components/ui/ScrollRow';
import { cn } from '@/lib/utils';
import type { RealmId } from '@/types/manual';

interface RealmBarProps {
  selectedRealmId: RealmId | null;
  selectedL2: string | null;
  onSelectRealmId: (realmId: RealmId | null) => void;
  onSelectL2: (l2: string | null) => void;
  /** Reset L3 selection when parent context changes */
  onResetL3?: () => void;
  /** Map of realmId -> array of L2 sub-paths */
  realmSubs?: Partial<Record<RealmId, string[]>>;
}

export function RealmBar({
  selectedRealmId,
  selectedL2,
  onSelectRealmId,
  onSelectL2,
  onResetL3,
  realmSubs = {},
}: RealmBarProps) {
  const l2Options = selectedRealmId ? realmSubs[selectedRealmId] ?? [] : [];
  const hasRealm = selectedRealmId !== null;

  return (
    <div className="sticky top-0 z-30 border-b border-border bg-bg-elevated/95 backdrop-blur-md">
      <div className="safe-pad-x">
      {/* ROW 1 — 14 Realms */}
      <ScrollRow>
        <RealmChip
          label="All"
          active={selectedRealmId === null}
          onClick={() => {
            onSelectRealmId(null);
            onSelectL2(null);
            onResetL3?.();
          }}
        />
        <div className="h-5 w-px flex-shrink-0 bg-border" aria-hidden="true" />
        {REALM_ORDER.map((realmId) => (
          <RealmChip
            key={realmId}
            label={REALM_NAMES[realmId]}
            active={selectedRealmId === realmId}
            onClick={() => {
              onSelectRealmId(selectedRealmId === realmId ? null : realmId);
              onSelectL2(null);
              onResetL3?.();
            }}
          />
        ))}
      </ScrollRow>

      {/* ROW 2 — L2 subs for selected realm */}
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
              onClick={() => {
                onSelectL2(selectedL2 === sub ? null : sub);
                onResetL3?.();
              }}
            />
          ))}
        </ScrollRow>
      )}
      </div>
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
      style={{ fontSize: '13px' }}
    >
      {label}
    </button>
  );
}
