// PATCHBOARD1 — the Bee-scope Patchboard surface (MMF §36, patchboard-pattern §9.3).
//
// This is the user-facing switch panel that lands in Settings (PLATFORM_SLATE
// v1). It shows soft switches the user controls, the four immutable hard
// switches (locked, with the participation-requirement reason), and the
// Connected Accounts panel. Resolution runs through the switch resolver; writes
// are propose-first.
//
// Lexicon: "user", never "Bee". Firewall verbs only.

import { useAuth } from '@/lib/auth';
import {
  HARD_SWITCHES,
  HARD_SWITCH_KEYS,
  isSensitiveCategory,
  setBeeSwitch,
} from '@/lib/patchboard';
import type { HardSwitchKey } from '@/lib/patchboard';
import { cn } from '@/lib/utils';
import { DEFAULT_SOFT_SWITCHES, usePatchboardStore } from '@/stores/usePatchboardStore';
import { Lock, SlidersHorizontal } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ConnectedAccountsPanel } from './ConnectedAccountsPanel';

/** Plain-language labels for the default soft switches. */
const SOFT_LABELS: Record<string, string> = {
  graphic_content: 'Graphic content',
  explicit_content: 'Explicit content (18+)',
  location_sharing: 'Location sharing',
  notification_firehose: 'High-volume notifications',
  cross_astra_data_sharing: 'Cross-Astra data sharing',
  push_notifications: 'Push notifications',
  email_notifications: 'Email notifications',
  recommendations: 'Recommendations',
  social_proof: 'Social proof ("users you may know")',
};

export function PatchboardSettings({ astraId = null }: { astraId?: string | null }) {
  const { bee } = useAuth();
  const { switches, providers, loading, loaded, error, load, isOn } = usePatchboardStore();

  useEffect(() => {
    void load(bee?.id ?? null, astraId);
  }, [bee?.id, astraId, load]);

  const reload = () => void load(bee?.id ?? null, astraId);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <header className="mb-6">
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={18} className="text-text-silver-bright" aria-hidden />
          <h1 className="font-display text-2xl font-semibold text-text-silver-bright">
            Switches &amp; connections
          </h1>
        </div>
        <p className="mt-1 text-text-dim" style={{ fontSize: '13px' }}>
          Control what you see and what you connect. These settings follow you across the whole
          constellation. Per-Astra overrides appear when you are inside an Astra.
        </p>
      </header>

      {error && (
        <div
          className="mb-4 rounded-md border border-border bg-bg-elevated/40 px-3 py-2 text-text-muted"
          style={{ fontSize: '12px' }}
        >
          Showing defaults — live switch data is unavailable right now.
        </div>
      )}

      {loading && !loaded ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <div className="h-6 w-6 animate-pulse-slow rounded-full border-2 border-text-silver/30 border-t-text-silver" />
        </div>
      ) : (
        <div className="space-y-8">
          {/* Soft switches — user preferences. */}
          <section>
            <h2 className="mb-3 font-display text-lg font-semibold text-text-silver-bright">
              Preferences
            </h2>
            <div className="space-y-2">
              {DEFAULT_SOFT_SWITCHES.map((key) => (
                <SoftSwitchRow
                  key={key}
                  switchKey={key}
                  label={SOFT_LABELS[key] ?? key}
                  on={isOn(key)}
                  term={switches[key]?.term ?? 'fallback-on'}
                  astraId={astraId}
                  onChanged={reload}
                />
              ))}
            </div>
          </section>

          {/* Hard switches — participation requirements, locked. */}
          <section>
            <h2 className="mb-1 font-display text-lg font-semibold text-text-silver-bright">
              Required
            </h2>
            <p className="mb-3 text-text-dim" style={{ fontSize: '12px' }}>
              These are platform requirements. They keep the constellation lawful and safe, and
              cannot be turned off.
            </p>
            <div className="space-y-2">
              {HARD_SWITCH_KEYS.map((key) => (
                <HardSwitchRow key={key} switchKey={key} />
              ))}
            </div>
          </section>

          {/* Connected accounts. */}
          <ConnectedAccountsPanel states={providers} astraId={astraId} onChanged={reload} />
        </div>
      )}
    </div>
  );
}

function SoftSwitchRow({
  switchKey,
  label,
  on,
  term,
  astraId,
  onChanged,
}: {
  switchKey: string;
  label: string;
  on: boolean;
  term: string;
  astraId: string | null;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const sensitive = isSensitiveCategory(switchKey);

  const toggle = async () => {
    setBusy(true);
    setNote(null);
    const r = await setBeeSwitch(switchKey, astraId, !on);
    setBusy(false);
    if (r.ok) onChanged();
    else setNote(r.pending ? 'Saving is not deployed yet — coming soon.' : r.error);
  };

  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-bg-elevated/30 px-4 py-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-text">{label}</span>
          {sensitive && (
            <span
              className="rounded-sm bg-text-muted/15 px-1.5 py-0.5 font-mono uppercase text-text-muted"
              style={{ fontSize: '9px' }}
            >
              opt-in
            </span>
          )}
        </div>
        <p className="mt-0.5 font-mono text-text-muted" style={{ fontSize: '10px' }}>
          {termLabel(term)}
        </p>
        {note && (
          <p className="mt-1 text-text-muted" style={{ fontSize: '11px' }}>
            {note}
          </p>
        )}
      </div>
      <Toggle on={on} disabled={busy} onClick={toggle} />
    </div>
  );
}

function HardSwitchRow({ switchKey }: { switchKey: HardSwitchKey }) {
  const meta = HARD_SWITCHES[switchKey];
  return (
    <div className="flex items-start justify-between gap-3 rounded-md border border-border/60 bg-bg-elevated/15 px-4 py-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <Lock size={13} className="text-text-muted" aria-hidden />
          <span className="text-text-silver">{meta.label}</span>
          <span
            className="rounded-sm bg-text-muted/15 px-1.5 py-0.5 font-mono uppercase text-text-muted"
            style={{ fontSize: '9px' }}
          >
            required
          </span>
        </div>
        <p className="mt-1 text-text-dim" style={{ fontSize: '12px' }}>
          {meta.description}
        </p>
      </div>
      {/* Locked ON, non-interactive. */}
      <div className="mt-1 flex-none" aria-hidden>
        <div className="relative h-5 w-9 rounded-full border border-text-silver/40 bg-text-silver/20 opacity-60">
          <span className="absolute left-4 top-0.5 h-3.5 w-3.5 rounded-full bg-text-silver-bright" />
        </div>
      </div>
    </div>
  );
}

function Toggle({
  on,
  disabled,
  onClick,
}: {
  on: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'relative h-5 w-9 flex-none rounded-full border transition-colors',
        on ? 'border-text-silver bg-text-silver/30' : 'border-border bg-bg-elevated',
        disabled && 'cursor-not-allowed opacity-40',
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 h-3.5 w-3.5 rounded-full bg-text-silver-bright transition-all',
          on ? 'left-4' : 'left-0.5',
        )}
      />
    </button>
  );
}

function termLabel(term: string): string {
  switch (term) {
    case 'bee-astra':
      return 'set for this Astra';
    case 'bee-platform':
      return 'your setting';
    case 'astra-default':
      return 'Astra default';
    case 'master-default':
      return 'platform default';
    default:
      return 'default';
  }
}
