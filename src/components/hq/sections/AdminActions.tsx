// HQ §9 — Admin Actions
// Operator actions. Three live (Refresh Matviews / Verify is_admin / Health
// Snapshot) + stubs for future actions that need their own dedicated
// dispatches (especially red-zone economy bootstrap).

import { useState } from 'react';
import { RefreshCw, ShieldCheck, FileText, Copy, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

export function AdminActions() {
  return (
    <div>
      <header className="mb-4">
        <h2 className="font-display text-2xl font-semibold text-text-silver-bright">Admin Actions</h2>
        <p className="mt-1 font-mono text-text-muted" style={{ fontSize: '11px' }}>
          repeated operational actions · 3 live + 5 stubbed
        </p>
      </header>

      <div className="space-y-3">
        <RefreshMatviewsAction />
        <VerifyIsAdminAction />
        <SystemHealthSnapshotAction />

        <StubAction
          title="Bootstrap Economy"
          description="OG HUMAN initial BLiNG! allocation + OPS umbrella seed. Pre-launch ceremony — separate red-zone-gated dispatch (touches @combtreasury + bonding curve)."
        />
        <StubAction
          title="Seed Missing Treasury Pots"
          description="Insert newbee + honeypot bling_pots rows for @combtreasury (production currently has 5 of 7 canon pots). Small migration; lands when needed."
        />
        <StubAction
          title="Toggle Patchboard Switches"
          description="Adjust runtime tunables (rate caps, cache TTLs, feature flags). Post-Swarm — Patchboard runtime infrastructure pending."
        />
        <StubAction
          title="Force Re-Disposition of Atoms"
          description="Rebuild taxonomy paths + parent inference. Used after manual atom edits or canon-driven taxonomy revisions."
        />
        <StubAction
          title="Rate Cap Override"
          description="Temporarily bypass per-Bee rate caps for testing or operator override. Needs audit-log entry on each invocation."
        />
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────
// Action A — Refresh Trending Matviews
// ───────────────────────────────────────────────────────────────────────
function RefreshMatviewsAction() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string; ts: string } | null>(null);

  const run = async () => {
    if (!supabase) {
      setResult({ ok: false, message: 'Supabase not configured', ts: new Date().toISOString() });
      return;
    }
    if (!window.confirm('Refresh atom_trending_24h/_7d/_30d now?')) return;
    setRunning(true);
    const startedAt = Date.now();
    const { error } = await supabase.rpc('refresh_atom_trending');
    const elapsed = Date.now() - startedAt;
    setRunning(false);
    if (error) {
      setResult({ ok: false, message: `Refresh failed: ${error.message}`, ts: new Date().toISOString() });
    } else {
      setResult({ ok: true, message: `Refreshed 3 matviews in ${elapsed}ms`, ts: new Date().toISOString() });
    }
  };

  return (
    <ActionCard
      icon={<RefreshCw size={16} />}
      title="Refresh Trending Matviews"
      description="Manually refresh atom_trending_24h/_7d/_30d. Pending pg_cron extension, this runs the refresh on demand."
    >
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={run}
          disabled={running}
          className={cn(
            'rounded-md border border-text-silver/40 bg-bg-elevated px-3 py-1.5 text-sm font-medium text-text',
            'transition-colors hover:bg-bg hover:text-text-silver-bright',
            'disabled:cursor-not-allowed disabled:opacity-50',
          )}
        >
          {running ? 'Refreshing…' : 'Execute'}
        </button>
        {result && (
          <span
            className={cn('text-sm', result.ok ? 'text-kettle-sourced' : 'text-kettle-unsourced')}
          >
            {result.ok ? '✓' : '✗'} {result.message}
          </span>
        )}
      </div>
    </ActionCard>
  );
}

// ───────────────────────────────────────────────────────────────────────
// Action B — Verify is_admin
// ───────────────────────────────────────────────────────────────────────
function VerifyIsAdminAction() {
  const [result, setResult] = useState<{ id: string; handle: string; is_admin: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  const run = async () => {
    if (!supabase) {
      setError('Supabase not configured');
      return;
    }
    setRunning(true);
    setError(null);
    const { data: u } = await supabase.auth.getUser();
    if (!u?.user) {
      setRunning(false);
      setError('No authenticated session');
      return;
    }
    const { data, error: e } = await supabase
      .from('bees')
      .select('id, handle, is_admin')
      .eq('id', u.user.id)
      .maybeSingle();
    setRunning(false);
    if (e || !data) {
      setError(e?.message ?? 'Bee row not found');
      setResult(null);
      return;
    }
    setResult(data as { id: string; handle: string; is_admin: boolean });
  };

  return (
    <ActionCard
      icon={<ShieldCheck size={16} />}
      title="Verify is_admin Status"
      description="Confirm current Bee has bees.is_admin = true. Diagnostic for HQ access debugging."
    >
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={run}
          disabled={running}
          className={cn(
            'rounded-md border border-text-silver/40 bg-bg-elevated px-3 py-1.5 text-sm font-medium text-text',
            'transition-colors hover:bg-bg hover:text-text-silver-bright',
            'disabled:cursor-not-allowed disabled:opacity-50',
          )}
        >
          {running ? 'Checking…' : 'Check'}
        </button>
        {error && <span className="text-sm text-kettle-unsourced">✗ {error}</span>}
        {result && (
          <div className="font-mono text-sm" style={{ fontSize: '12px' }}>
            <span className={result.is_admin ? 'text-kettle-sourced' : 'text-kettle-unsourced'}>
              {result.is_admin ? '✓ admin' : '✗ not admin'}
            </span>
            <span className="ml-2 text-text-muted">@{result.handle}</span>
            <span className="ml-2 text-text-muted">{result.id.slice(0, 8)}…</span>
          </div>
        )}
      </div>
    </ActionCard>
  );
}

// ───────────────────────────────────────────────────────────────────────
// Action C — System Health Snapshot
// ───────────────────────────────────────────────────────────────────────
interface HealthSnapshot {
  bees_total: number | string;
  atoms_total: number | string;
  votes_total: number | string;
  bling_freed: number | string;
  freedom_price: number | string;
  treasury_pot_count: number | string;
  treasury_total: number | string;
  failed_logins_24h: number | string;
  page_views_24h: number | string;
  generated_at: string;
}

function SystemHealthSnapshotAction() {
  const [snapshot, setSnapshot] = useState<HealthSnapshot | null>(null);
  const [running, setRunning] = useState(false);
  const [copied, setCopied] = useState(false);

  const run = async () => {
    if (!supabase) return;
    setRunning(true);
    setCopied(false);
    const now = Date.now();
    const day_ago = new Date(now - 86400e3).toISOString();
    // supabase-js query/RPC builders are PromiseLike, not native Promise —
    // accept PromiseLike here so this wraps both .from(...).select() chains
    // and .rpc() calls.
    const safe = async <T,>(p: PromiseLike<T>): Promise<T | { __err: string }> => {
      try { return await p; } catch (e) { return { __err: e instanceof Error ? e.message : 'unknown' }; }
    };

    const [bees, atoms, votes, state, treasury, failed, pageviews] = await Promise.all([
      safe(supabase.from('bees_public').select('id', { head: true, count: 'exact' })),
      safe(supabase.from('atoms').select('id', { head: true, count: 'exact' })),
      safe(supabase.from('atom_kettle_votes').select('id', { head: true, count: 'exact' })),
      safe(supabase.from('bling_system_state').select('total_supply, freedom_price').order('updated_at', { ascending: false }).limit(1).maybeSingle()),
      safe(supabase.rpc('get_treasury_pots')),
      safe(supabase.from('failed_login_events').select('id', { head: true, count: 'exact' }).gte('attempted_at', day_ago)),
      safe(supabase.from('page_view_events').select('id', { head: true, count: 'exact' }).gte('viewed_at', day_ago)),
    ]);

    const cnt = (r: unknown): number | string => {
      if (r && typeof r === 'object' && '__err' in r) return `ERR: ${(r as { __err: string }).__err}`;
      const c = (r as { count?: number | null })?.count;
      return c ?? 0;
    };

    const stateData = !state || ('__err' in (state as object))
      ? null
      : (state as { data?: { total_supply: number | string; freedom_price: number | string } }).data ?? null;

    const treasuryRows = !treasury || ('__err' in (treasury as object))
      ? []
      : ((treasury as { data?: Array<{ balance: number | string }> }).data ?? []);
    const treasuryTotal = treasuryRows.reduce((s, r) => s + Number(r.balance), 0);

    setSnapshot({
      bees_total: cnt(bees),
      atoms_total: cnt(atoms),
      votes_total: cnt(votes),
      bling_freed: stateData ? Number(stateData.total_supply) : 'unavailable',
      freedom_price: stateData ? `$${Number(stateData.freedom_price).toFixed(6)}` : 'unavailable',
      treasury_pot_count: treasuryRows.length,
      treasury_total: treasuryRows.length > 0 ? treasuryTotal : 'unavailable',
      failed_logins_24h: cnt(failed),
      page_views_24h: cnt(pageviews),
      generated_at: new Date().toISOString(),
    });
    setRunning(false);
  };

  const textBlock = snapshot
    ? `=== HONEYCOMB System Health Snapshot ===
Generated: ${snapshot.generated_at}

Bees total:          ${snapshot.bees_total}
Atoms total:         ${snapshot.atoms_total}
Kettle votes total:  ${snapshot.votes_total}

BLiNG! freed:        ${snapshot.bling_freed}
Freedom price:       ${snapshot.freedom_price}
Treasury pots:       ${snapshot.treasury_pot_count}
Treasury total:      ${snapshot.treasury_total} BLiNG!

Failed logins (24h): ${snapshot.failed_logins_24h}
Page views (24h):    ${snapshot.page_views_24h}
`
    : '';

  const copy = async () => {
    if (!textBlock) return;
    try {
      await navigator.clipboard.writeText(textBlock);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard API can fail in non-secure contexts; ignore.
    }
  };

  return (
    <ActionCard
      icon={<FileText size={16} />}
      title="System Health Snapshot"
      description="Generate a snapshot of key system metrics for export/sharing."
    >
      <div className="space-y-2">
        <button
          type="button"
          onClick={run}
          disabled={running}
          className={cn(
            'rounded-md border border-text-silver/40 bg-bg-elevated px-3 py-1.5 text-sm font-medium text-text',
            'transition-colors hover:bg-bg hover:text-text-silver-bright',
            'disabled:cursor-not-allowed disabled:opacity-50',
          )}
        >
          {running ? 'Gathering…' : snapshot ? 'Re-generate' : 'Generate'}
        </button>

        {snapshot && (
          <div className="mt-2">
            <pre
              className="overflow-x-auto rounded-md border border-border bg-bg p-3 font-mono text-text"
              style={{ fontSize: '11px' }}
            >
              {textBlock}
            </pre>
            <button
              type="button"
              onClick={copy}
              className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-border bg-bg-elevated px-2 py-1 text-text-silver hover:text-text"
              style={{ fontSize: '11px' }}
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? 'Copied' : 'Copy to clipboard'}
            </button>
          </div>
        )}
      </div>
    </ActionCard>
  );
}

// ───────────────────────────────────────────────────────────────────────
// Reusable action card + stub
// ───────────────────────────────────────────────────────────────────────
function ActionCard({
  icon, title, description, children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-md border border-border bg-bg-elevated/30 px-4 py-3">
      <div className="mb-1 flex items-center gap-2">
        <span className="text-text-silver-bright" aria-hidden>{icon}</span>
        <h3 className="font-display text-base font-semibold text-text-silver-bright">{title}</h3>
      </div>
      <p className="mb-3 text-text-dim" style={{ fontSize: '12px' }}>{description}</p>
      {children}
    </div>
  );
}

function StubAction({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-md border border-border/60 bg-bg-elevated/15 px-4 py-3 opacity-70">
      <div className="mb-1 flex items-center gap-2">
        <h3 className="font-display text-base font-semibold text-text-muted">{title}</h3>
        <span
          className="rounded-sm bg-text-muted/15 px-1.5 py-0.5 font-mono uppercase text-text-muted"
          style={{ fontSize: '9px' }}
        >
          soon
        </span>
      </div>
      <p className="text-text-dim" style={{ fontSize: '12px' }}>{description}</p>
    </div>
  );
}

