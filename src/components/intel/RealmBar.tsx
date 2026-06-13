import type { ReactNode } from 'react';
import { REALM_ORDER, REALM_NAMES } from '@/lib/constants';
import { ScrollRow } from '@/components/ui/ScrollRow';
import { cn } from '@/lib/utils';
import type { RealmId } from '@/types/manual';

interface RealmBarProps {
  selectedRealmId: RealmId | null;
  selectedL2: string | null;
  selectedL3: string | null;
  onSelectRealmId: (realmId: RealmId | null) => void;
  onSelectL2: (l2: string | null) => void;
  onSelectL3: (l3: string | null) => void;
  /** Reset L3 selection when parent context changes */
  onResetL3?: () => void;
  /** Map of realmId -> array of L2 sub-paths */
  realmSubs?: Partial<Record<RealmId, string[]>>;
  /** L3 options under the currently selected realm + L2 */
  l3Options?: string[];
}

/**
 * Locked stacked-shade taxonomy toolbar.
 *
 * All level bars stack vertically, contiguous + full-width, ABOVE the search
 * input / content area. Bars render progressively L1 → deepest-selected.
 * Background darkens-to-lightens by depth (the locked shade ramp); active item
 * is a honey pill; inactive text crosses light→dark between L3 and L4.
 */

/** Bar background by level depth (locked ramp) */
const LEVEL_BG = ['#0B0B0D', '#2A2A30', '#494951', '#74747D', '#A0A0A8'];
/** Inactive item text by level (crossover light→dark between L3 and L4) */
const LEVEL_INACTIVE_TEXT = ['#9A9BA2', '#C4C5CC', '#DDDEE2', '#2C2C31', '#26262B'];
/** 1px separator between stacked bars */
const BAR_SEPARATOR = '1px solid rgba(255, 255, 255, 0.05)';

export function RealmBar({
  selectedRealmId,
  selectedL2,
  selectedL3,
  onSelectRealmId,
  onSelectL2,
  onSelectL3,
  onResetL3,
  realmSubs = {},
  l3Options = [],
}: RealmBarProps) {
  const l2Options = selectedRealmId ? realmSubs[selectedRealmId] ?? [] : [];
  const hasRealm = selectedRealmId !== null;

  return (
    <div className="sticky top-0 z-30 border-b border-border">
      {/* L1 — 14 Realms */}
      <LevelBar level={0} label="L1 · realm">
        <LevelChip
          level={0}
          label="All"
          active={selectedRealmId === null}
          onClick={() => {
            onSelectRealmId(null);
            onSelectL2(null);
            onResetL3?.();
          }}
        />
        <div
          className="h-5 w-px flex-shrink-0"
          style={{ background: 'rgba(255, 255, 255, 0.08)' }}
          aria-hidden="true"
        />
        {REALM_ORDER.map((realmId) => (
          <LevelChip
            key={realmId}
            level={0}
            label={REALM_NAMES[realmId]}
            active={selectedRealmId === realmId}
            onClick={() => {
              onSelectRealmId(selectedRealmId === realmId ? null : realmId);
              onSelectL2(null);
              onResetL3?.();
            }}
          />
        ))}
      </LevelBar>

      {/* L2 — subs for selected realm */}
      {hasRealm && l2Options.length > 0 && (
        <LevelBar level={1} label="L2 · sub">
          <LevelChip
            level={1}
            label="All"
            active={selectedL2 === null}
            onClick={() => {
              onSelectL2(null);
              onResetL3?.();
            }}
          />
          {l2Options.map((sub) => (
            <LevelChip
              key={sub}
              level={1}
              label={sub}
              active={selectedL2 === sub}
              onClick={() => {
                onSelectL2(selectedL2 === sub ? null : sub);
                onResetL3?.();
              }}
            />
          ))}
        </LevelBar>
      )}

      {/* L3 — refinement under selected realm + L2 */}
      {hasRealm && selectedL2 && l3Options.length > 0 && (
        <LevelBar level={2} label="L3 · topic">
          <LevelChip
            level={2}
            label="All"
            active={selectedL3 === null}
            onClick={() => onSelectL3(null)}
          />
          {l3Options.map((l3) => (
            <LevelChip
              key={l3}
              level={2}
              label={l3}
              active={selectedL3 === l3}
              onClick={() => onSelectL3(selectedL3 === l3 ? null : l3)}
            />
          ))}
        </LevelBar>
      )}
    </div>
  );
}

/** One full-width level bar: shade-ramp background + overflow-x scroll row */
function LevelBar({
  level,
  label,
  children,
}: {
  level: number;
  label?: string;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        background: LEVEL_BG[level],
        borderTop: level > 0 ? BAR_SEPARATOR : undefined,
      }}
    >
      <ScrollRow leading={label ? <LevelLabel level={level}>{label}</LevelLabel> : undefined}>
        {children}
      </ScrollRow>
    </div>
  );
}

/** Muted left-aligned level label (optional polish) */
function LevelLabel({ level, children }: { level: number; children: ReactNode }) {
  return (
    <span
      className="font-mono uppercase tracking-wider"
      style={{ fontSize: '10px', color: LEVEL_INACTIVE_TEXT[level], opacity: 0.6 }}
      data-size="meta"
    >
      {children}
    </span>
  );
}

/** Taxonomy chip: honey pill when active, level-shaded text when inactive */
function LevelChip({
  level,
  label,
  active,
  onClick,
}: {
  level: number;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex-shrink-0 whitespace-nowrap tracking-wide transition-all',
        !active && 'hover:bg-white/[0.06]',
      )}
      style={{
        borderRadius: '6px',
        padding: '4px 11px',
        fontSize: '13px',
        fontWeight: active ? 500 : 400,
        background: active ? '#FAD15E' : 'transparent',
        color: active ? '#0B0B0D' : LEVEL_INACTIVE_TEXT[level],
      }}
    >
      {label}
    </button>
  );
}
