// H24_FIX1 defect 9 — the routing log promoted to its own page + route, with
// its own sidebar entry (Activity), filterable by band/kind/provider/status.
// The console still shows a compact inline log as a "last directive" summary
// linking here; this is the full record, same data (fetchRoutingLog), just a
// larger page and a bigger fetch limit.

import { H24CostPanel } from '@/components/h24/H24CostPanel';
import { RoutingLogTable } from '@/components/h24/RoutingLogTable';
import { UniversalShell } from '@/components/shell/UniversalShell';
import { buildH24Nav } from '@/lib/atlasoracle/h24Nav';
import type { ModelRateRow } from '@/lib/atlasoracle/reconcile';
import { formatTokensExact } from '@/lib/atlasoracle/reconcile';
import { type RoutingLogEntry, fetchRoutingLog } from '@/lib/atlasoracle/routingLog';
import { formatTokens } from '@/lib/atlasoracle/tokens';
import { useOracleTokens } from '@/lib/atlasoracle/useOracleTokens';
import { useAuth } from '@/lib/auth';
import { H24_TOKENS } from '@/lib/shell/astraTokens';
import { useH24Storefront } from '@/stores/useH24Storefront';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

// Larger than the console's default (25) — this page's whole reason to exist
// is seeing more history than the inline compact view can hold.
const FULL_LOG_LIMIT = 200;

export function H24RoutingLogPage() {
  const { bee } = useAuth();
  const navigate = useNavigate();
  const openStore = useH24Storefront((s) => s.openStore);
  const { balance: tokens } = useOracleTokens(bee?.id ?? null);

  const [log, setLog] = useState<{
    loaded: boolean;
    error: string | null;
    entries: RoutingLogEntry[];
    rates: ModelRateRow[];
  }>({ loaded: false, error: null, entries: [], rates: [] });
  const [selectedCostId, setSelectedCostId] = useState<string | null>(null);
  const selectedEntry = selectedCostId
    ? (log.entries.find((e) => e.id === selectedCostId) ?? null)
    : null;

  const loadLog = useCallback(async () => {
    if (!bee) {
      setLog({ loaded: true, error: null, entries: [], rates: [] });
      return;
    }
    try {
      const { entries, rates } = await fetchRoutingLog(FULL_LOG_LIMIT);
      setLog({ loaded: true, error: null, entries, rates });
    } catch (e) {
      setLog({
        loaded: true,
        error: e instanceof Error ? e.message : String(e),
        entries: [],
        rates: [],
      });
    }
  }, [bee]);

  useEffect(() => {
    void loadLog();
  }, [loadLog]);

  const nav = buildH24Nav({
    navigate,
    onNew: () => navigate('/h24'),
    signedIn: Boolean(bee),
    tokenBalance: tokens.balance,
    onOpenWallet: openStore,
    active: 'log',
  });

  function exportCsv() {
    const header = [
      'when',
      'band',
      'kind',
      'provider',
      'status',
      'input_tokens',
      'output_tokens',
      'cached_tokens',
      'cost_h24_tokens',
      'latency_ms',
    ];
    const rows = log.entries.map((e) => [
      new Date(e.createdAt).toISOString(),
      e.tier === 'free' ? 'free' : 'Auto',
      e.category,
      e.provider ?? '',
      e.status,
      e.inputTokens ?? '',
      e.outputTokens ?? '',
      e.cachedTokens ?? '',
      e.costTokens === null ? '' : formatTokensExact(e.costTokens),
      e.latencyMs ?? '',
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'h24-routing-log.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <UniversalShell
      tokens={H24_TOKENS}
      breadcrumb={
        <span>
          h24 <span style={{ color: 'var(--mute)' }}>/ Routing log</span>
        </span>
      }
      nav={nav}
      bling={tokens.balance}
      blingDisplay={tokens.balance === null ? undefined : formatTokens(tokens.balance)}
      blingUnit="h24"
      handle={bee?.handle ?? null}
      onBack={() => navigate(-1)}
      onForward={() => navigate(1)}
      onSearch={() => navigate('/manual')}
      onAvatar={() => navigate('/profile')}
      onSelectAstra={(k) => {
        if (k === 'h24') navigate('/h24');
        else navigate(`/${k}`);
      }}
    >
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 md:px-8">
          <div className="mx-auto flex max-w-4xl flex-col gap-4">
            <RoutingLogTable
              log={log}
              signedIn={Boolean(bee)}
              selectedCostId={selectedCostId}
              onSelectCost={setSelectedCostId}
              onRefresh={() => void loadLog()}
              onExport={exportCsv}
              showFilters
              title="Routing log"
            />
          </div>
        </div>
        {selectedEntry && (
          <H24CostPanel
            entry={selectedEntry}
            rates={log.rates}
            onClose={() => setSelectedCostId(null)}
          />
        )}
      </div>
    </UniversalShell>
  );
}
