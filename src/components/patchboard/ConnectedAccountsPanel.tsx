// PATCHBOARD1 — Connected Accounts panel (Bee scope, MMF §36.4).
//
// Renders the sanctioned provider registry as the connections the current user
// can turn on. Each row carries the Use switch (surface my connection here) and
// a Connect / Disconnect action. Writes are PROPOSE-FIRST — a "pending" result
// (RPC not yet deployed) shows an honest note instead of a fake success.
//
// Lexicon: "user", never "Bee" (MMF_GIST v2.8-r2). Firewall verbs only.

import { PROVIDER_REGISTRY, beginConnect, disconnect, setUse } from '@/lib/patchboard';
import type { Provider, ProviderSwitchState } from '@/lib/patchboard';
import { cn } from '@/lib/utils';
import { Link2, Link2Off, Lock, PlugZap } from 'lucide-react';
import { useState } from 'react';

interface Props {
  states: ProviderSwitchState[];
  astraId: string | null;
  onChanged: () => void;
}

const stateById = (states: ProviderSwitchState[]) => new Map(states.map((s) => [s.providerId, s]));

export function ConnectedAccountsPanel({ states, astraId, onChanged }: Props) {
  const byId = stateById(states);
  const tier1 = PROVIDER_REGISTRY.filter((p) => p.tier === 1);
  const tier2 = PROVIDER_REGISTRY.filter((p) => p.tier === 2);

  return (
    <section>
      <header className="mb-3">
        <h2 className="font-display text-lg font-semibold text-text-silver-bright">
          Connected accounts
        </h2>
        <p className="mt-1 text-text-dim" style={{ fontSize: '12px' }}>
          Link an outside account to use it here. Turning a connection off makes it dormant — it is
          never deleted, and comes back if you turn it on again.
        </p>
      </header>

      <div className="space-y-4">
        <ProviderGroup
          title="Launch integrations"
          providers={tier1}
          byId={byId}
          astraId={astraId}
          onChanged={onChanged}
        />
        <ProviderGroup
          title="More (post-launch)"
          providers={tier2}
          byId={byId}
          astraId={astraId}
          onChanged={onChanged}
        />
      </div>
    </section>
  );
}

function ProviderGroup({
  title,
  providers,
  byId,
  astraId,
  onChanged,
}: {
  title: string;
  providers: Provider[];
  byId: Map<string, ProviderSwitchState>;
  astraId: string | null;
  onChanged: () => void;
}) {
  return (
    <div>
      <h3 className="mb-2 font-mono uppercase text-text-muted" style={{ fontSize: '10px' }}>
        {title}
      </h3>
      <div className="space-y-2">
        {providers.map((p) => (
          <ProviderRow
            key={p.id}
            provider={p}
            state={
              byId.get(p.id) ?? { providerId: p.id, offered: true, used: true, connection: null }
            }
            astraId={astraId}
            onChanged={onChanged}
          />
        ))}
      </div>
    </div>
  );
}

function ProviderRow({
  provider,
  state,
  astraId,
  onChanged,
}: {
  provider: Provider;
  state: ProviderSwitchState;
  astraId: string | null;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const connected = state.connection?.status === 'active';
  const dormant = state.connection?.status === 'dormant';
  // If the Astra does not OFFER a provider, the user cannot connect it here.
  const offered = state.offered;

  const runConnect = async () => {
    setBusy(true);
    setNote(null);
    const r = await beginConnect(provider.id);
    setBusy(false);
    if (r.ok) {
      if (r.redirectUrl) window.location.assign(r.redirectUrl);
      else onChanged();
    } else {
      setNote(r.pending ? 'Connecting is not deployed yet — coming soon.' : r.error);
    }
  };

  const runDisconnect = async () => {
    setBusy(true);
    setNote(null);
    const r = await disconnect(provider.id);
    setBusy(false);
    if (r.ok) onChanged();
    else setNote(r.pending ? 'Not deployed yet — coming soon.' : r.error);
  };

  const toggleUse = async () => {
    setBusy(true);
    setNote(null);
    const r = await setUse(provider.id, astraId, !state.used);
    setBusy(false);
    if (r.ok) onChanged();
    else setNote(r.pending ? 'Not deployed yet — coming soon.' : r.error);
  };

  return (
    <div className="rounded-md border border-border bg-bg-elevated/30 px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <PlugZap size={15} className="text-text-silver" aria-hidden />
            <span className="font-medium text-text">{provider.label}</span>
            <CostBadge bearer={provider.costBearer} />
            {provider.affiliate && (
              <span
                className="rounded-sm bg-text-muted/15 px-1.5 py-0.5 font-mono uppercase text-text-muted"
                style={{ fontSize: '9px' }}
              >
                referral
              </span>
            )}
            {connected && <StatusBadge kind="active" />}
            {dormant && <StatusBadge kind="dormant" />}
          </div>
          <p className="mt-1 text-text-dim" style={{ fontSize: '12px' }}>
            {provider.description}
          </p>
          {note && (
            <p className="mt-1.5 text-text-muted" style={{ fontSize: '11px' }}>
              {note}
            </p>
          )}
        </div>

        <div className="flex flex-none items-center gap-3">
          {/* Use switch — only meaningful once offered. */}
          <UseToggle on={state.used} disabled={busy || !offered} onClick={toggleUse} />
          {connected || dormant ? (
            <button
              type="button"
              onClick={runDisconnect}
              disabled={busy}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md border border-border bg-bg-elevated px-2.5 py-1.5 text-text-silver',
                'transition-colors hover:text-text disabled:cursor-not-allowed disabled:opacity-50',
              )}
              style={{ fontSize: '12px' }}
            >
              <Link2Off size={13} aria-hidden /> Disconnect
            </button>
          ) : (
            <button
              type="button"
              onClick={runConnect}
              disabled={busy || !offered}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md border border-text-silver/40 bg-bg-elevated px-2.5 py-1.5 text-text',
                'transition-colors hover:bg-bg hover:text-text-silver-bright disabled:cursor-not-allowed disabled:opacity-50',
              )}
              style={{ fontSize: '12px' }}
            >
              <Link2 size={13} aria-hidden /> {offered ? 'Connect' : 'Not offered here'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function CostBadge({ bearer }: { bearer: Provider['costBearer'] }) {
  return (
    <span
      className="rounded-sm bg-text-muted/15 px-1.5 py-0.5 font-mono uppercase text-text-muted"
      style={{ fontSize: '9px' }}
      title={bearer === 'platform' ? 'HONEYCOMB covers the usage cost' : 'You cover the usage cost'}
    >
      {bearer === 'platform' ? 'free to you' : 'your cost'}
    </span>
  );
}

function StatusBadge({ kind }: { kind: 'active' | 'dormant' }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 font-mono uppercase',
        kind === 'active'
          ? 'bg-kettle-sourced/15 text-kettle-sourced'
          : 'bg-text-muted/15 text-text-muted',
      )}
      style={{ fontSize: '9px' }}
    >
      {kind === 'dormant' && <Lock size={9} aria-hidden />}
      {kind}
    </span>
  );
}

function UseToggle({
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
      aria-label="Use here"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'relative h-5 w-9 flex-none rounded-full border transition-colors',
        on ? 'border-text-silver bg-text-silver/30' : 'border-border bg-bg-elevated',
        disabled && 'cursor-not-allowed opacity-40',
      )}
      title="Surface my connection here"
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
