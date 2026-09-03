// HQ — Patchboard (Master / Astra scope). MMF §36.
//
// The admin face of the Patchboard. Master scope holds the provider registry
// (the closed sanctioned set, §36.5), the Master-default switches (the platform
// baseline that Astras override as exceptions, §36.2), and the four immutable
// hard switches (§36.3). Astra-scope switches are Director-managed and surface
// per-Astra; this section states that boundary rather than owning it.
//
// Reads are floor-safe; writes are PROPOSE-FIRST (patchboard_set_master_switch,
// db lane) — a "pending" result shows an honest note. is_admin gating is done by
// HQControlRoom before this ever renders.

import {
  CRYPTO_GATEWAY_LAW,
  CRYPTO_GATEWAY_NODES,
  CRYPTO_GATEWAY_NODE_COUNT,
  HARD_SWITCHES,
  HARD_SWITCH_KEYS,
  PROVIDER_REGISTRY,
  cryptoSwitchKey,
  offerSwitchKey,
  setMasterSwitch,
} from '@/lib/patchboard';
import type { CryptoNode, HardSwitchKey, Provider } from '@/lib/patchboard';
import { cn } from '@/lib/utils';
import { Coins, Lock, PlugZap, ShieldAlert, ToggleLeft, ToggleRight } from 'lucide-react';
import { useState } from 'react';

export function PatchboardAdmin() {
  return (
    <div>
      <header className="mb-4">
        <h2 className="font-display text-2xl font-semibold text-text-silver-bright">Patchboard</h2>
        <p className="mt-1 font-mono text-text-muted" style={{ fontSize: '11px' }}>
          Master scope · MMF §36 · provider registry + platform defaults
        </p>
      </header>

      <p className="mb-6 max-w-2xl text-text-dim" style={{ fontSize: '13px' }}>
        The Master Patchboard sets the platform baseline. Astras override switches as exceptions
        (Director-managed, per Astra); users override soft switches for themselves. Changes here are
        proposed to the db lane — schema is propose-first until the migration lands.
      </p>

      <div className="space-y-8">
        <HardSwitchesBlock />
        <ProviderRegistryBlock />
        <CryptoNodesBlock />
        <AstraScopeNote />
      </div>
    </div>
  );
}

// ── Crypto payment-method nodes (CRYPTO_NODES1) ──────────────────────────────
function CryptoNodesBlock() {
  const nodes = [...CRYPTO_GATEWAY_NODES].sort((a, b) => a.adoptionRank - b.adoptionRank);
  return (
    <section>
      <h3 className="mb-2 flex items-center gap-2 font-display text-base font-semibold text-text-silver-bright">
        <Coins size={16} className="text-text-muted" aria-hidden />
        Crypto payment methods
        <span
          className="rounded-sm bg-text-muted/15 px-1.5 py-0.5 font-mono uppercase text-text-muted"
          style={{ fontSize: '9px' }}
        >
          {CRYPTO_GATEWAY_NODE_COUNT} nodes · all off
        </span>
      </h3>
      <p className="mb-3 max-w-2xl text-text-dim" style={{ fontSize: '12px' }}>
        Optional external crypto payment rails. Every node is DORMANT until toggled — this is the
        switch surface, not a wallet integration (no custody, no keys, no funds move). Turning one
        on is a separate integration pass.
      </p>
      <div
        className="mb-3 flex flex-wrap items-center gap-2 rounded-md border border-border/60 bg-bg-elevated/15 px-3 py-2 text-text-dim"
        style={{ fontSize: '11px' }}
      >
        <ShieldAlert size={13} className="text-text-muted" aria-hidden />
        <span>
          Architecture law: these are <strong>external, fiat-side gateway methods</strong> —
          KYC-gated under the hard switch, and <strong>never crypto&nbsp;&rarr;&nbsp;BLiNG</strong>.
          {CRYPTO_GATEWAY_LAW.neverAutoCreditBling ? ' No auto-credit, ever.' : ''}
        </span>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {nodes.map((node) => (
          <CryptoNodeRow key={node.id} node={node} />
        ))}
      </div>
    </section>
  );
}

function CryptoFlag({ label }: { label: string }) {
  return (
    <span
      className="rounded-sm bg-text-muted/15 px-1.5 py-0.5 font-mono uppercase text-text-muted"
      style={{ fontSize: '9px' }}
    >
      {label}
    </span>
  );
}

function CryptoNodeRow({ node }: { node: CryptoNode }) {
  // Default OFF/DORMANT (CRYPTO_GATEWAY_LAW.defaultState === false). The toggle is
  // propose-first — the write RPC records the exception when it is deployed.
  const [on, setOn] = useState<boolean>(CRYPTO_GATEWAY_LAW.defaultState);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const toggle = async () => {
    const next = !on;
    setBusy(true);
    setNote(null);
    const r = await setMasterSwitch(cryptoSwitchKey(node.id), next);
    setBusy(false);
    if (r.ok) setOn(next);
    else setNote(r.pending ? 'Propose-first — write RPC not deployed yet.' : r.error);
  };

  return (
    <div className="rounded-md border border-border bg-bg-elevated/30 px-3 py-2.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-mono font-semibold text-text">{node.symbol}</span>
            <span className="text-text-dim" style={{ fontSize: '12px' }}>
              {node.name}
            </span>
            <span className="text-text-muted" style={{ fontSize: '11px' }}>
              · {node.chain}
            </span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1">
            {node.stablecoin && <CryptoFlag label="stablecoin" />}
            {node.privacyCoin && <CryptoFlag label="privacy" />}
            {node.lightning && <CryptoFlag label="lightning" />}
            {node.smartContract && <CryptoFlag label="contract" />}
            {node.onramp === 'hard' && <CryptoFlag label="on-ramp hard" />}
          </div>
          {note && (
            <p className="mt-1 text-text-muted" style={{ fontSize: '11px' }}>
              {note}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={toggle}
          disabled={busy}
          className={cn(
            'inline-flex flex-none items-center gap-1.5 rounded-md border px-2.5 py-1.5 transition-colors',
            on
              ? 'border-text-silver/40 bg-bg-elevated text-text hover:text-text-silver-bright'
              : 'border-border bg-bg-elevated/50 text-text-muted hover:text-text-silver',
            busy && 'cursor-not-allowed opacity-50',
          )}
          style={{ fontSize: '12px' }}
          aria-pressed={on}
        >
          {on ? <ToggleRight size={15} aria-hidden /> : <ToggleLeft size={15} aria-hidden />}
          {on ? 'On' : 'Off'}
        </button>
      </div>
    </div>
  );
}

// ── Hard switches ────────────────────────────────────────────────────────────
function HardSwitchesBlock() {
  return (
    <section>
      <h3 className="mb-2 font-display text-base font-semibold text-text-silver-bright">
        Hard switches (immutable)
      </h3>
      <p className="mb-3 text-text-dim" style={{ fontSize: '12px' }}>
        The four platform floors. They sit above the cascade and cannot be overridden by any scope,
        including Master.
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {HARD_SWITCH_KEYS.map((key) => (
          <HardCard key={key} switchKey={key} />
        ))}
      </div>
    </section>
  );
}

function HardCard({ switchKey }: { switchKey: HardSwitchKey }) {
  const meta = HARD_SWITCHES[switchKey];
  return (
    <div className="rounded-md border border-border/60 bg-bg-elevated/15 px-4 py-3">
      <div className="flex items-center gap-2">
        <Lock size={13} className="text-text-muted" aria-hidden />
        <span className="text-text-silver">{meta.label}</span>
        <span
          className="rounded-sm bg-text-muted/15 px-1.5 py-0.5 font-mono uppercase text-text-muted"
          style={{ fontSize: '9px' }}
        >
          floor
        </span>
      </div>
      <p className="mt-1 text-text-dim" style={{ fontSize: '12px' }}>
        {meta.description}
      </p>
    </div>
  );
}

// ── Provider registry ────────────────────────────────────────────────────────
function ProviderRegistryBlock() {
  const tier1 = PROVIDER_REGISTRY.filter((p) => p.tier === 1);
  const tier2 = PROVIDER_REGISTRY.filter((p) => p.tier === 2);
  return (
    <section>
      <h3 className="mb-2 font-display text-base font-semibold text-text-silver-bright">
        Provider registry
      </h3>
      <p className="mb-3 text-text-dim" style={{ fontSize: '12px' }}>
        The closed set of integrations that may be connected anywhere. Toggle the Master offer to
        set the platform baseline; Astras narrow it, never widen it.
      </p>
      <div className="space-y-4">
        <RegistryGroup title="Tier 1 — launch" providers={tier1} />
        <RegistryGroup title="Tier 2 — post-launch" providers={tier2} />
      </div>
    </section>
  );
}

function RegistryGroup({ title, providers }: { title: string; providers: Provider[] }) {
  return (
    <div>
      <h4 className="mb-2 font-mono uppercase text-text-muted" style={{ fontSize: '10px' }}>
        {title}
      </h4>
      <div className="space-y-2">
        {providers.map((p) => (
          <RegistryRow key={p.id} provider={p} />
        ))}
      </div>
    </div>
  );
}

function RegistryRow({ provider }: { provider: Provider }) {
  // Registry providers default to OFFERED (ON) at Master until a row says
  // otherwise; the propose-first write records the exception.
  const [offered, setOffered] = useState(true);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const toggle = async () => {
    const next = !offered;
    setBusy(true);
    setNote(null);
    const r = await setMasterSwitch(offerSwitchKey(provider.id), next);
    setBusy(false);
    if (r.ok) setOffered(next);
    else setNote(r.pending ? 'Propose-first — write RPC not deployed yet.' : r.error);
  };

  return (
    <div className="rounded-md border border-border bg-bg-elevated/30 px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <PlugZap size={14} className="text-text-silver" aria-hidden />
            <span className="font-medium text-text">{provider.label}</span>
            <span
              className="rounded-sm bg-text-muted/15 px-1.5 py-0.5 font-mono uppercase text-text-muted"
              style={{ fontSize: '9px' }}
            >
              {provider.category}
            </span>
            <span
              className="rounded-sm bg-text-muted/15 px-1.5 py-0.5 font-mono uppercase text-text-muted"
              style={{ fontSize: '9px' }}
            >
              {provider.costBearer === 'platform' ? 'platform-paid' : 'user-paid'}
            </span>
            {provider.affiliate && (
              <span
                className="rounded-sm bg-text-muted/15 px-1.5 py-0.5 font-mono uppercase text-text-muted"
                style={{ fontSize: '9px' }}
              >
                affiliate
              </span>
            )}
          </div>
          <p className="mt-1 text-text-dim" style={{ fontSize: '12px' }}>
            {provider.description}
          </p>
          {note && (
            <p className="mt-1 text-text-muted" style={{ fontSize: '11px' }}>
              {note}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={toggle}
          disabled={busy}
          className={cn(
            'inline-flex flex-none items-center gap-1.5 rounded-md border px-2.5 py-1.5 transition-colors',
            offered
              ? 'border-text-silver/40 bg-bg-elevated text-text hover:text-text-silver-bright'
              : 'border-border bg-bg-elevated/50 text-text-muted hover:text-text-silver',
            busy && 'cursor-not-allowed opacity-50',
          )}
          style={{ fontSize: '12px' }}
          aria-pressed={offered}
        >
          {offered ? <ToggleRight size={15} aria-hidden /> : <ToggleLeft size={15} aria-hidden />}
          {offered ? 'Offered' : 'Off'}
        </button>
      </div>
    </div>
  );
}

// ── Astra scope note ─────────────────────────────────────────────────────────
function AstraScopeNote() {
  return (
    <section className="rounded-md border border-border/60 bg-bg-elevated/15 px-4 py-3">
      <h3 className="font-display text-base font-semibold text-text-silver-bright">Astra scope</h3>
      <p className="mt-1 text-text-dim" style={{ fontSize: '12px' }}>
        Per-Astra switch inventories are managed by each Astra&apos;s Director / Queen inside that
        Astra&apos;s admin surface. An Astra can narrow what Master offers (tighten-only); it can
        never expose a provider the Master registry has not sanctioned. Nestled Novas inherit their
        parent as the Astra-default term (MMF §36.4.3).
      </p>
    </section>
  );
}
