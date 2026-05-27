import { useCallback, useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

// AtlasOracle wallet badge.
//
// Mounts in any Astra spine. Three visual states drive presentation:
//   idle           — ambient, awaits a tap
//   working        — directive is in-flight to the router
//   response-ready — fresh routed response is available
//
// On tap the badge opens a directive surface. On desktop the surface is a
// centered modal; on mobile (< sm) the same surface fills the viewport as
// a slide-up sheet.
//
// Language firewall: copy uses GIVE / SEND / EARN / GET vocabulary only.
// No buy / sell / purchase / trade / market / customer / mint in any string.

type Tier = 'free' | 'standard' | 'frontier';

type DirectiveCategory =
  | 'scaffold' | 'draft' | 'integrate' | 'refactor' | 'analyze'
  | 'classify' | 'translate' | 'estimate' | 'correlate' | 'suggest';

export interface SurfacedAction {
  label: string;
  directive: string;
  category?: DirectiveCategory;
}

export interface AtlasOracleWalletBadgeProps {
  astraSlug: string;
  canonPaths?: string[];
  surfacedActions?: SurfacedAction[];
  novaSlug?: string;
  defaultTier?: Tier;
  className?: string;
}

type BadgeState = 'idle' | 'working' | 'response-ready';

interface RouteResponse {
  response: string;
  provider: string;
  cost_bling: number;
  latency_ms: number;
  directive_id: string;
}

const DEFAULT_TIER: Tier = 'free';

export function AtlasOracleWalletBadge({
  astraSlug,
  canonPaths,
  surfacedActions = [],
  novaSlug,
  defaultTier = DEFAULT_TIER,
  className,
}: AtlasOracleWalletBadgeProps) {
  const { bee } = useAuth();
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<BadgeState>('idle');
  const [directive, setDirective] = useState('');
  const [tier, setTier] = useState<Tier>(defaultTier);
  const [response, setResponse] = useState<RouteResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // TODO: read live BLiNG! balance from ledger when the wallet query is
  // exposed (UtilityChrome currently stubs this at 0). For now we surface
  // a placeholder only when the Bee is signed in.
  const blingBalance = bee ? 0 : null;

  const canSubmit = useMemo(
    () => directive.trim().length > 0 && state !== 'working' && !!supabase,
    [directive, state],
  );

  const submit = useCallback(
    async (text: string, category: DirectiveCategory = 'analyze') => {
      if (!supabase) {
        setError('AtlasOracle is unavailable — Supabase client not configured.');
        return;
      }
      setError(null);
      setResponse(null);
      setState('working');

      const { data, error: invokeErr } = await supabase.functions.invoke<RouteResponse>(
        'atlasoracle-route',
        {
          body: {
            directive: text,
            tier,
            astra_slug: astraSlug,
            nova_slug: novaSlug,
            canon_paths: canonPaths,
            directive_category: category,
          },
        },
      );

      if (invokeErr || !data) {
        setError(invokeErr?.message ?? 'Routing returned no response');
        setState('idle');
        return;
      }

      setResponse(data);
      setState('response-ready');
    },
    [astraSlug, canonPaths, novaSlug, tier],
  );

  const close = useCallback(() => {
    setOpen(false);
    // Reset to idle after the user dismisses a finished directive.
    if (state === 'response-ready') {
      setState('idle');
      setResponse(null);
      setDirective('');
    }
  }, [state]);

  // ESC dismisses the surface.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, close]);

  if (!bee) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="AtlasOracle"
        aria-label="Open AtlasOracle"
        className={cn(
          'flex items-center gap-2 rounded-full border bg-bg-elevated px-2.5 py-1 transition-colors',
          state === 'idle' && 'border-honey/40 hover:border-honey/70',
          state === 'working' && 'border-honey/70 animate-pulse',
          state === 'response-ready' && 'border-kettle-sourced/70',
          className,
        )}
      >
        <span
          className="font-mono font-semibold tracking-tight text-honey"
          style={{ fontSize: '12px' }}
        >
          A⊕O
        </span>
        {blingBalance !== null && (
          <span
            className="bling font-mono tracking-wide text-text-silver"
            style={{ fontSize: '11.5px' }}
          >
            {blingBalance.toLocaleString()}
          </span>
        )}
      </button>

      {open && (
        <>
          <button
            type="button"
            onClick={close}
            aria-label="Close AtlasOracle"
            className="fixed inset-0 z-40 cursor-default bg-black/60"
          />
          <dialog
            open
            aria-label="AtlasOracle directive"
            className={cn(
              'fixed inset-x-0 bottom-0 z-50 m-0 flex w-full flex-col gap-4 border border-border-bright bg-bg-elevated p-5 text-text',
              'rounded-t-2xl sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:max-w-xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl',
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-mono font-semibold text-honey">A⊕O</span>
                <span className="text-text-silver" style={{ fontSize: '12.5px' }}>
                  AtlasOracle · {astraSlug}
                  {novaSlug ? ` / ${novaSlug}` : ''}
                </span>
              </div>
              <button
                type="button"
                onClick={close}
                aria-label="Close"
                className="rounded-md p-1 text-text-silver transition-colors hover:bg-panel-2 hover:text-text"
              >
                <X size={16} />
              </button>
            </div>

            {surfacedActions.length > 0 && state !== 'response-ready' && (
              <div className="flex flex-wrap gap-2">
                {surfacedActions.map((a) => (
                  <button
                    key={a.label}
                    type="button"
                    disabled={state === 'working'}
                    onClick={() => submit(a.directive, a.category ?? 'analyze')}
                    className={cn(
                      'rounded-full border border-border-bright bg-panel-2 px-3 py-1 text-text-silver transition-colors',
                      'hover:border-honey/70 hover:text-text',
                      state === 'working' && 'opacity-50',
                    )}
                    style={{ fontSize: '12.5px' }}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            )}

            {state !== 'response-ready' && (
              <>
                <textarea
                  value={directive}
                  onChange={(e) => setDirective(e.target.value)}
                  placeholder="Type a directive…"
                  rows={4}
                  disabled={state === 'working'}
                  className="w-full rounded-md border border-border-bright bg-bg p-3 font-mono text-text placeholder:text-text-silver/60 focus:border-honey/70 focus:outline-none"
                  style={{ fontSize: '13px' }}
                />

                <div className="flex items-center gap-2">
                  <label
                    htmlFor="atlasoracle-tier"
                    className="text-text-silver"
                    style={{ fontSize: '12px' }}
                  >
                    Tier
                  </label>
                  <select
                    id="atlasoracle-tier"
                    value={tier}
                    onChange={(e) => setTier(e.target.value as Tier)}
                    disabled={state === 'working'}
                    className="rounded-md border border-border-bright bg-panel-2 px-2 py-1 text-text"
                    style={{ fontSize: '12px' }}
                  >
                    <option value="free">free</option>
                    <option value="standard">standard</option>
                    <option value="frontier">frontier</option>
                  </select>

                  <button
                    type="button"
                    disabled={!canSubmit}
                    onClick={() => submit(directive)}
                    className={cn(
                      'ml-auto rounded-md border border-honey/60 bg-honey/10 px-3 py-1 font-semibold text-honey transition-colors',
                      'hover:border-honey/90 hover:bg-honey/20',
                      !canSubmit && 'cursor-not-allowed opacity-40',
                    )}
                    style={{ fontSize: '12.5px' }}
                  >
                    {state === 'working' ? 'Routing…' : 'SEND'}
                  </button>
                </div>
              </>
            )}

            {error && (
              <div
                className="rounded-md border border-kettle-unsourced/60 bg-kettle-unsourced/10 p-3 text-text"
                style={{ fontSize: '12.5px' }}
                role="alert"
              >
                {error}
              </div>
            )}

            {state === 'response-ready' && response && (
              <div className="flex flex-col gap-2">
                <div
                  className="rounded-md border border-border-bright bg-bg p-3 font-mono text-text"
                  style={{ fontSize: '13px', whiteSpace: 'pre-wrap' }}
                >
                  {response.response}
                </div>
                <div
                  className="flex flex-wrap items-center gap-3 text-text-silver"
                  style={{ fontSize: '11.5px' }}
                >
                  <span>provider · {response.provider}</span>
                  <span>cost · {response.cost_bling} BLiNG!</span>
                  <span>latency · {response.latency_ms}ms</span>
                  <button
                    type="button"
                    onClick={() => {
                      setState('idle');
                      setResponse(null);
                      setDirective('');
                    }}
                    className="ml-auto rounded-md border border-border-bright px-2 py-0.5 text-text-silver transition-colors hover:border-honey/70 hover:text-text"
                  >
                    new directive
                  </button>
                </div>
              </div>
            )}
          </dialog>
        </>
      )}
    </>
  );
}
