import { COMPOSER_MEASURE, Composer, type ComposerBand } from '@/components/composer/Composer';
import { ByokKeyEntry } from '@/components/h24/ByokKeyEntry';
import { H24CostPanel } from '@/components/h24/H24CostPanel';
import { H24DrawerPanel } from '@/components/h24/H24DrawerPanel';
import { RoutingLogTable } from '@/components/h24/RoutingLogTable';
import type { PanelKey } from '@/components/shell/UniversalShell';
import { UniversalShell } from '@/components/shell/UniversalShell';
import {
  type ByokProvider,
  type ByokState,
  type ByokSubmitResult,
  MODEL_PROVIDER,
  PROVIDER_LABEL,
  listByokStates,
  revokeByokKey,
  submitByokKey,
} from '@/lib/atlasoracle/byok';
import { FREE_DIRECTIVE_QUOTA, countFreeDirectives } from '@/lib/atlasoracle/byokQuota';
import {
  type DirectiveCategory,
  MODEL_TO_CATALOG_STRING,
  type Tier,
  isMocked,
} from '@/lib/atlasoracle/client';
import { buildH24Nav } from '@/lib/atlasoracle/h24Nav';
import { formatTokensExact } from '@/lib/atlasoracle/reconcile';
import type { ModelRateRow } from '@/lib/atlasoracle/reconcile';
import { type RoutingLogEntry, fetchRoutingLog } from '@/lib/atlasoracle/routingLog';
import { ORACLE_TOKENS_REFRESH_EVENT, formatTokens } from '@/lib/atlasoracle/tokens';
import { useOracleDirective } from '@/lib/atlasoracle/useOracleDirective';
import { useOracleTokens } from '@/lib/atlasoracle/useOracleTokens';
import { useAuth } from '@/lib/auth';
import { uploadToLibrary } from '@/lib/media';
import { H24_TOKENS } from '@/lib/shell/astraTokens';
import { cn } from '@/lib/utils';
import { useH24Storefront } from '@/stores/useH24Storefront';
import { X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

/**
 * THE h24 SURFACE — now wearing the PERFECTED UNIVERSAL SHELL (SHELL v1.5,
 * ops_docs SHELL, owner+lead 2026-08-22). SHELL_PORT1 ports the shell here as
 * the REFERENCE implementation the other astras copy-port.
 *
 * The real machinery is unchanged — directive send/confirm, the live routing
 * log, the cost breakdown (now the CONTENT WINDOW split beside the log), the
 * post-purchase return, the token balance, the CSV export. What changed is the
 * CHROME (UniversalShell) and the COMPOSER SEMANTICS.
 *
 * COMPOSER SEMANTICS (H24_COMPOSER1, COMPOSER v1.1 owner ruling 2026-08-22 —
 * "the composer brain": band / model / effort-behind-the-wheel + BYOK slot):
 *   - BAND = Auto | free ONLY. `free` is the real no-cost tier. `Auto` maps to
 *     the current best REAL tier (frontier) as a PLACEHOLDER — the "router picks
 *     best" intelligence + company-model mapping lands in AUTOTIER1. So Auto
 *     does a real thing today (routes to the frontier model), just not the smart
 *     one yet. Nothing fake ships.
 *   - tokens <= 0 FORCES free: Auto costs tokens, so a Bee at or below zero is
 *     given free only and a green "Get h24 tokens" link. Auto returns to the
 *     band menu the moment the balance is positive again.
 *   - MODEL menu (Auto band only): Auto + COMPANY-NAME models. Display-only this
 *     pass; the rail maps name+band → exact version at AUTOTIER1. NO versions.
 *   - EFFORT chip: NO standing dial. Appears ONLY when the Bee picks a specific
 *     model (model != Auto): low / medium / high[default] / max. Hides on Auto.
 *     Captured state awaiting AUTOTIER1 — the router has no effort field yet.
 *   - BYOK: when a specific model is picked, the Bee may enter their own
 *     provider key. The key goes to the routing PROCESS only (VOTE_APIS v1.2) —
 *     never the model context, never logged, masked at rest; when present the
 *     model chip shows a "your key" marker. Routing through it lands at
 *     AUTOTIER1; today it is captured + marked only (see byok.ts).
 *   - The routing-log "Tier" column is renamed to "Band".
 *
 * HONESTY: model / effort / BYOK are the SELECTION STATE MACHINE; the request
 * that leaves the browser still carries only { directive, tier, category,
 * astra_slug } because that is all the deployed h24-route contract accepts. No
 * un-accepted field is ever sent. AUTOTIER1 turns these captured picks into real
 * routing parameters.
 */

type Band = 'auto' | 'free';
/** Auto → the best real tier (frontier) until AUTOTIER1 wires real routing. */
const bandToTier = (b: Band): Tier => (b === 'free' ? 'free' : 'frontier');

/** Company-name Model menu (Auto band only). NO version strings — SHELL v1.5. */
const MODEL_OPTIONS = ['Auto', 'Claude', 'GPT', 'Grok', 'Llama', 'Mistral', 'DeepSeek'].map(
  (m) => ({ id: m, label: m }),
);

type Effort = 'low' | 'medium' | 'high' | 'max';
/** COMPOSER v1.1 effort levels. `high` is the default (thorough). */
const EFFORT_OPTIONS: { id: Effort; label: string }[] = [
  { id: 'low', label: 'low' },
  { id: 'medium', label: 'medium' },
  { id: 'high', label: 'high' },
  { id: 'max', label: 'max' },
];

export function OraclePage() {
  const { bee } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const openStore = useH24Storefront((s) => s.openStore);

  // POST-PURCHASE RETURN (FRONT81) — unchanged. h24-checkout returns to
  // /h24?tokens=1; the webhook credits asynchronously, so re-read a few times,
  // show an honest banner, strip the flag.
  const [topUpReturn, setTopUpReturn] = useState(false);
  // biome-ignore lint/correctness/useExhaustiveDependencies: run-once return handler.
  useEffect(() => {
    if (new URLSearchParams(location.search).get('tokens') !== '1') return;
    setTopUpReturn(true);
    const fire = () => window.dispatchEvent(new Event(ORACLE_TOKENS_REFRESH_EVENT));
    fire();
    const t1 = setTimeout(fire, 2000);
    const t2 = setTimeout(fire, 5000);
    const t3 = setTimeout(() => setTopUpReturn(false), 12000);
    navigate('/h24', { replace: true });
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  const [directive, setDirective] = useState('');
  const [band, setBand] = useState<Band>('free');
  const [model, setModel] = useState('Auto');
  // EFFORT (COMPOSER v1.1) — captured only when a specific model is picked;
  // default high (thorough). Not yet a routed parameter (see the header note).
  const [effort, setEffort] = useState<Effort>('high');
  // BYOK (H24_BYOK1) — real server round trip now, see byok.ts. `byokStates`
  // holds every provider's MASKED state (never a raw key); `byokOpen` toggles
  // the model-scoped entry panel; `byokDoorOpen` toggles the quota "door 2"
  // entry panel (no model picked yet at that point in the flow).
  const [byokStates, setByokStates] = useState<Record<ByokProvider, ByokState>>(
    () =>
      Object.fromEntries(
        (['anthropic', 'openai', 'xai', 'meta', 'mistral', 'deepseek'] as ByokProvider[]).map(
          (p) => [p, { present: false, last4: null, status: null }],
        ),
      ) as Record<ByokProvider, ByokState>,
  );
  const [byokOpen, setByokOpen] = useState(false);
  const [byokDoorOpen, setByokDoorOpen] = useState(false);
  // COMPOSER v1.2 free-band quota — how many free directives this Bee has
  // already sent, all-time (see byokQuota.ts for why "all-time"). null = not
  // loaded yet, not zero.
  const [freeDirectiveCount, setFreeDirectiveCount] = useState<number | null>(null);

  const loadByok = useCallback(async () => {
    setByokStates(await listByokStates());
  }, []);

  useEffect(() => {
    if (bee) void loadByok();
  }, [bee, loadByok]);

  useEffect(() => {
    if (!bee) {
      setFreeDirectiveCount(null);
      return;
    }
    void countFreeDirectives().then(setFreeDirectiveCount);
  }, [bee]);
  // KIND (category) is a real router param but is NOT on the ruled composer row
  // (SHELL v1.5: [+][add-to-vault][Band][Model][mic][send]). It stays at its
  // default and is still sent to the router; surfacing it returns in a later
  // composer pass. Recorded in REPORT.md.
  const [category] = useState<DirectiveCategory>('suggest');
  const [attachStatus, setAttachStatus] = useState<string | null>(null);
  const [hasSent, setHasSent] = useState(false);
  // H24_FIX1 defect 4 — what the Bee actually asked, captured at send time so it
  // can be echoed above the answer even after the composer input clears.
  const [sentDirective, setSentDirective] = useState<string | null>(null);
  // H24_FIX1 defect 7 — "New" needs a visible effect even when the routing log
  // already has history (which otherwise keeps `docked` permanently true).
  const [forceHome, setForceHome] = useState(false);
  const attachInputRef = useRef<HTMLInputElement>(null);

  const { state, response, preview, failure, send, confirm, cancelConfirm, reset } =
    useOracleDirective();
  const { balance: tokens, rates: tierRates, applyBalanceAfter } = useOracleTokens(bee?.id ?? null);

  const [log, setLog] = useState<{
    loaded: boolean;
    error: string | null;
    entries: RoutingLogEntry[];
    rates: ModelRateRow[];
  }>({ loaded: false, error: null, entries: [], rates: [] });

  const [selectedCostId, setSelectedCostId] = useState<string | null>(null);

  // SHELL v1.7 s1 — the right sidebar is ONE surface; "Recent activity" is
  // the first left-nav entry that addresses it (SHELL_DRAWER2, folding
  // HomeActivityPanel's old second-aside into this shared panel).
  const [shellPanel, setShellPanel] = useState<PanelKey | null>(null);

  const loadLog = useCallback(async () => {
    if (!bee) {
      setLog({ loaded: true, error: null, entries: [], rates: [] });
      return;
    }
    try {
      const { entries, rates } = await fetchRoutingLog();
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

  useEffect(() => {
    if (state !== 'response-ready') return;
    void loadLog();
    if (response) applyBalanceAfter(response.balanceAfterTokens);
    // COMPOSER v1.2 quota — a free-band send may have just crossed N; re-count
    // so the two-doors banner appears the moment it should, not on next reload.
    if (bee) void countFreeDirectives().then(setFreeDirectiveCount);
    // H24_FIX1 defect 3 — clear the composer only on a SUCCESSFUL send. A
    // failure leaves `state` at 'idle' with `failure` set, which this effect
    // never touches, so a directive is never eaten by an error.
    setDirective('');
  }, [state, loadLog, response, applyBalanceAfter, bee]);

  // OUT OF TOKENS — Auto costs tokens; a Bee at or below zero gets free only.
  // `balance === null` means "not loaded / no ledger read", NOT zero, so it does
  // not force anything.
  const noTokens = tokens.balance !== null && tokens.balance <= 0;

  // Force the free band whenever the Bee has no tokens. The band menu also drops
  // Auto in that state (below), so this only ever fires on a stale `auto` pick.
  useEffect(() => {
    if (noTokens) setBand('free');
  }, [noTokens]);

  // BAND picker — Auto | free. H24_FIX1 defect 1 (routing honesty): the sublabel
  // used to name the tier's model from the legacy h24_model_rates row — a
  // NOMINAL model that free-tier routing does not guarantee, since the free
  // ladder falls back off Groq to Haiku under load. That produced exactly the
  // owner's bug report: chip said "free - llama-3.1", the routing log recorded
  // claude-haiku-4-5 for the same directive. The chip now names whatever this
  // Bee's OWN routing log last actually recorded for that band — the same
  // number the log shows, because it IS the log — and falls back to honest,
  // non-committal wording only before any directive has run.
  const lastProviderForTier = useCallback(
    (tier: Tier) => log.entries.find((e) => e.tier === tier && e.provider)?.provider ?? null,
    [log.entries],
  );
  const bands: ComposerBand[] = useMemo(() => {
    const free = {
      id: 'free',
      label: 'free',
      sublabel: lastProviderForTier('free') ?? 'fastest available model',
    };
    if (noTokens) return [free];
    return [
      {
        id: 'auto',
        label: 'Auto',
        sublabel: lastProviderForTier('frontier') ?? 'h24 picks the best model',
      },
      free,
    ];
  }, [lastProviderForTier, noTokens]);

  // SELECTION STATE MACHINE — model menu shows in the Auto (paid) band; a picked
  // company name unlocks the effort chip and the BYOK slot. `provider` is null on
  // Auto, which is exactly when neither surfaces.
  const showModel = band === 'auto';
  const modelPicked = showModel && model !== 'Auto';
  const provider: ByokProvider | null = MODEL_PROVIDER[model] ?? null;
  const byokState: ByokState = provider
    ? byokStates[provider]
    : { present: false, last4: null, status: null };
  // H24_FIX3 — THE REAL FIX. Before this, `model` was captured in state and
  // shown in the composer but never left the browser: send() only ever
  // carried { directive, tier, category, astra_slug }, so every Auto-band
  // directive ran claude-opus-5 (TIER_PROVIDER_MODEL['frontier']) regardless
  // of which company was "selected". `catalogModel` is the exact
  // models.model_string h24-route's existing userTargetCard/loadModelCard
  // path expects; sending it is what actually changes which provider runs.
  const catalogModel = modelPicked ? MODEL_TO_CATALOG_STRING[model] : undefined;
  // Llama has no active frontier-band catalog entry (free-tier only, via
  // Groq) — see MODEL_TO_CATALOG_STRING's comment. Rather than silently
  // falling back to Opus (the exact dishonesty this pass exists to remove),
  // picking it in Auto blocks sending with a visible reason (below).
  const modelUnavailable = modelPicked && !catalogModel;

  const tier = bandToTier(band);
  const currentRate = tierRates.find((r) => r.tier === tier);
  const selectedEntry = selectedCostId
    ? (log.entries.find((e) => e.id === selectedCostId) ?? null)
    : null;
  // COMPOSER v1.2 "TWO DOORS" — at quota (and only then), the out-of-tokens
  // banner offers Get-tokens + Add-your-key instead of staying clean.
  const atFreeQuota = freeDirectiveCount !== null && freeDirectiveCount >= FREE_DIRECTIVE_QUOTA;

  function submitDirective() {
    if (!bee || directive.trim().length === 0 || state === 'working') return;
    if (modelUnavailable) return;
    setHasSent(true);
    setForceHome(false);
    setSentDirective(directive);
    void send(directive, { tier, category, astraSlug: 'themanual', model: catalogModel });
  }

  // H24_FIX1 defects 6 + 7 — one place that resets the directive state, used by
  // both the sidebar "New" (which also needs to visibly leave the docked view)
  // and the inline "new directive" button after a response (which stays docked).
  function startNewDirective(goHome: boolean) {
    reset();
    setDirective('');
    setSentDirective(null);
    setHasSent(false);
    if (goHome) setForceHome(true);
  }

  async function handleAttach(file: File) {
    if (!bee) return;
    setAttachStatus(`Uploading ${file.name}…`);
    try {
      const asset = await uploadToLibrary(bee.id, file, null);
      setAttachStatus(`Added ${asset.fileName} to your vault.`);
    } catch (e) {
      setAttachStatus(e instanceof Error ? e.message : 'Upload failed.');
    }
  }

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

  // SIDEBAR NAV (SHELL v1.5: pure nav) — shared with the /h24/log and /h24/vault
  // pages via buildH24Nav so all three surfaces wire the same items to the same
  // destinations (H24_FIX1 defect 8: a per-page nav array is how Vault drifted).
  const nav = buildH24Nav({
    navigate,
    onNew: () => startNewDirective(true),
    signedIn: Boolean(bee),
    tokenBalance: tokens.balance,
    onOpenWallet: openStore,
    active: 'console',
    onOpenActivity: () => setShellPanel('activity'),
  });

  // HOME vs DOCKED — home is the centered greeting + composer biased above
  // center; the composer docks to the bottom once the first directive is sent
  // (or the log already has history). `forceHome` (H24_FIX1 defect 7) lets
  // "New" return here even when the log has history, so the primary action of
  // the console has a visible effect instead of silently no-opping.
  const docked =
    Boolean(bee) && !forceHome && (hasSent || log.entries.length > 0 || Boolean(response));

  // BYOK save/revoke (H24_BYOK1) — submitByokKey validates live + vaults the
  // key server-side; the raw value passes through this call only and is never
  // written to any local state here. onSaveByok resolves the validation
  // outcome back to ByokKeyEntry so it can show a validation error inline rather
  // than closing on a rejected key.
  function onSaveByok(raw: string): Promise<ByokSubmitResult> {
    if (!provider) return Promise.resolve({ valid: false, error: 'Pick a model first.' });
    return submitByokKey(provider, raw);
  }
  function onByokSaved() {
    setByokOpen(false);
    void loadByok();
  }
  // H24_BYOK2 — revoke a NAMED provider, not necessarily the one currently
  // picked. The Model menu's per-row Delete acts on whatever row it's on;
  // `removeByok` (the existing composer-panel "remove" link) is just this
  // applied to the current selection.
  async function removeByokFor(p: ByokProvider) {
    await revokeByokKey(p);
    void loadByok();
  }
  async function removeByok() {
    if (!provider) return;
    await removeByokFor(provider);
  }
  // H24_BYOK2 — "add in the moment": selects the row's company (so `provider`
  // resolves to it on the next render) and opens the SAME entry panel the
  // composer already shows below itself. Used by both the dropdown's Add and
  // Edit actions — Edit just finds byokState.present already true.
  function openByokEditor(companyName: string) {
    setModel(companyName);
    setByokOpen(true);
  }

  // H24_BYOK2 — the Model menu, with a real per-row Add/Edit/Delete action
  // instead of a plain label list. `Auto` has no provider and stays a plain
  // row. This is what makes "the switcher shows ADD/EDIT/DELETE" true instead
  // of decorative — the SAME real actions the composer's own BYOK panel uses.
  const modelOptionsWithByok = useMemo(
    () =>
      MODEL_OPTIONS.map((o) => {
        const p = MODEL_PROVIDER[o.id];
        if (!p) return o;
        const st = byokStates[p];
        return {
          ...o,
          adornment: st.present ? (
            <span className="flex flex-shrink-0 items-center gap-1.5" style={{ fontSize: 10.5 }}>
              <button
                type="button"
                onClick={() => openByokEditor(o.id)}
                className="underline-offset-2 hover:underline"
                style={{ color: 'var(--body)' }}
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => void removeByokFor(p)}
                className="underline-offset-2 hover:underline"
                style={{ color: 'var(--error)' }}
              >
                Delete
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => openByokEditor(o.id)}
              className="flex-shrink-0 underline-offset-2 hover:underline"
              style={{ fontSize: 10.5, color: 'var(--accent, #ef6c2a)' }}
            >
              Add
            </button>
          ),
        };
      }),
    [byokStates],
  );

  // "your key" marker on the model chip — only when a specific model is picked
  // and a key for its provider is present.
  const optionBadge =
    modelPicked && byokState.present ? (
      <span
        className="rounded px-1.5 py-0.5"
        style={{
          fontSize: '10px',
          color: 'var(--accent, #ef6c2a)',
          border: '1px solid color-mix(in srgb, var(--accent, #ef6c2a) 45%, transparent)',
        }}
      >
        your key
      </span>
    ) : null;

  const composerEl = (
    <>
      <input
        ref={attachInputRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleAttach(f);
          e.target.value = '';
        }}
      />
      {/* COMPOSER v1.2 TWO DOORS — before quota, free stays CLEAN (no nag at
          all); at quota, offer both doors instead of a wall. freeDirectiveCount
          === null (not loaded yet) never triggers this — see byokQuota.ts. */}
      {bee && noTokens && atFreeQuota && (
        <div className="mb-2 flex flex-col gap-1.5" style={{ fontSize: 12 }}>
          <span style={{ color: 'var(--mute)' }}>
            You've used your {FREE_DIRECTIVE_QUOTA} free directives — free band only from here.
          </span>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={openStore}
              className="font-semibold underline-offset-2 hover:underline"
              style={{ color: 'var(--buy-green)' }}
            >
              Get h24 tokens
            </button>
            <button
              type="button"
              onClick={() => setByokDoorOpen((o) => !o)}
              className="font-semibold underline-offset-2 hover:underline"
              style={{ color: 'var(--accent, #ef6c2a)' }}
            >
              Add your provider API key
            </button>
          </div>
          {byokDoorOpen && (
            <ByokDoor
              onSaved={() => {
                setByokDoorOpen(false);
                void loadByok();
              }}
            />
          )}
        </div>
      )}
      <Composer
        value={directive}
        onChange={setDirective}
        onSubmit={submitDirective}
        busy={state === 'working'}
        disabled={!bee}
        // H24_FIX3 — Llama has no live frontier route (see MODEL_TO_CATALOG_STRING);
        // block send rather than silently routing it to Opus.
        submitDisabled={modelUnavailable}
        placeholder={bee ? 'Type a directive…' : 'Sign in to send a directive'}
        onAttach={() => attachInputRef.current?.click()}
        bands={bands}
        bandId={band}
        onBandChange={(id) => setBand(id as Band)}
        // MODEL menu shows only in the Auto (paid) band. H24_FIX3 — picking a
        // company name now genuinely re-routes there (catalogModel, sent as
        // request `model`); this was display-only before this pass. H24_BYOK2 —
        // each row also carries a real Add/Edit/Delete action for that
        // provider's key (modelOptionsWithByok).
        options={showModel ? modelOptionsWithByok : []}
        optionId={model}
        onOptionChange={setModel}
        optionLabel="Model"
        optionBadge={optionBadge}
        // EFFORT chip only once a specific model is picked (COMPOSER v1.1).
        effortOptions={modelPicked ? EFFORT_OPTIONS : []}
        effortId={effort}
        onEffortChange={(id) => setEffort(id as Effort)}
        effortLabel="Effort"
        enableMic
      />
      {/* H24_FIX3 — visible, not silent: Llama has no frontier route today. */}
      {modelUnavailable && (
        <p className="mt-2" style={{ color: 'var(--error)', fontSize: 11.5 }} role="alert">
          {model} has no route in Auto — h24 won't silently send this to a different model instead.
          It only ever runs via the free band's own automatic routing (not selectable there either).
          Pick a different model to send this directive.
        </p>
      )}
      {/* BYOK affordance — only when a specific model is picked. */}
      {modelPicked && provider && (
        <div className="mt-2" style={{ fontSize: 11.5 }}>
          {byokState.present ? (
            <div className="flex flex-wrap items-center gap-2" style={{ color: 'var(--mute)' }}>
              <span>
                Using your {PROVIDER_LABEL[provider]} key
                {byokState.last4 ? ` ···· ${byokState.last4}` : ''}
              </span>
              <button
                type="button"
                onClick={() => setByokOpen((o) => !o)}
                className="underline-offset-2 hover:underline"
                style={{ color: 'var(--body)' }}
              >
                change
              </button>
              <button
                type="button"
                onClick={() => void removeByok()}
                className="underline-offset-2 hover:underline"
                style={{ color: 'var(--body)' }}
              >
                remove
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setByokOpen((o) => !o)}
              className="underline-offset-2 hover:underline"
              style={{ color: 'var(--mute)' }}
            >
              Use your own {PROVIDER_LABEL[provider]} key
            </button>
          )}
          {byokOpen && (
            <ByokKeyEntry
              provider={provider}
              onSubmit={onSaveByok}
              onSaved={onByokSaved}
              onCancel={() => setByokOpen(false)}
            />
          )}
        </div>
      )}
    </>
  );

  return (
    <UniversalShell
      tokens={H24_TOKENS}
      breadcrumb={
        <span>
          h24 <span style={{ color: 'var(--mute)' }}>/ Console</span>
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
      panels={{ activity: { title: 'Recent activity', width: 'table' } }}
      openPanel={shellPanel}
      onOpenPanel={setShellPanel}
      renderPanel={(slot) => {
        if (slot === 'activity') {
          return (
            <RoutingLogTable
              log={log}
              signedIn={Boolean(bee)}
              selectedCostId={null}
              // Quick-Look Law: any cost drill-down exits to the full page,
              // which already owns the H24CostPanel side-by-side breakdown.
              onSelectCost={() => navigate('/h24/log')}
              onRefresh={() => void loadLog()}
              onExport={exportCsv}
              title="Recent"
            />
          );
        }
        if (slot === 'bling') {
          return (
            <div className="flex flex-col gap-3">
              <div>
                <div className="font-mono" style={{ color: 'var(--bling-gold)', fontSize: 22 }}>
                  {tokens.balance === null ? '—' : formatTokens(tokens.balance)}
                </div>
                <div style={{ color: 'var(--mute)', fontSize: 11 }}>
                  {tokens.status === 'live' ? 'h24 tokens' : tokens.reason}
                </div>
              </div>
              {bee && (
                <button
                  type="button"
                  onClick={openStore}
                  className="rounded-md px-3 py-1.5 font-semibold transition-colors"
                  style={{
                    background: 'color-mix(in srgb, var(--buy-green) 16%, transparent)',
                    color: 'var(--buy-green)',
                    fontSize: 12.5,
                  }}
                >
                  Get h24 tokens
                </button>
              )}
            </div>
          );
        }
        if (slot === 'handle') {
          return (
            <div className="flex flex-col gap-2" style={{ fontSize: 12.5 }}>
              <button
                type="button"
                onClick={() => navigate('/profile')}
                className="text-left"
                style={{ color: 'var(--body)' }}
              >
                Profile
              </button>
              <button
                type="button"
                onClick={() => navigate('/account')}
                className="text-left"
                style={{ color: 'var(--body)' }}
              >
                Account
              </button>
              <button
                type="button"
                onClick={() => navigate('/studio')}
                className="text-left"
                style={{ color: 'var(--body)' }}
              >
                Creator Studio
              </button>
              <button
                type="button"
                onClick={() => navigate('/bookmarks')}
                className="text-left"
                style={{ color: 'var(--body)' }}
              >
                Bookmarks
              </button>
            </div>
          );
        }
        // ALERTS slot = the h24 activity quick-look (Routing / Rail / Billing),
        // wired to real data (H24_DRAWER1). The other slots below stay honest
        // stubs / real destinations per the dispatch.
        if (slot === 'alerts') {
          return (
            <H24DrawerPanel
              entries={log.entries}
              signedIn={Boolean(bee)}
              onOpenBoard={() => navigate('/mc')}
              onOpenLog={() => navigate('/h24/log')}
            />
          );
        }
        // tasks / security / notifications — real destinations where they exist;
        // otherwise the shell's honest "backend not live" note.
        if (slot === 'security') {
          return (
            <button
              type="button"
              onClick={() => navigate('/security')}
              style={{ color: 'var(--body)', fontSize: 12.5 }}
            >
              Open the security center →
            </button>
          );
        }
        if (slot === 'notifications') {
          return (
            <button
              type="button"
              onClick={() => navigate('/notifications')}
              style={{ color: 'var(--body)', fontSize: 12.5 }}
            >
              Open notifications →
            </button>
          );
        }
        return null; // tasks — no backend yet; shell shows the honest note
      }}
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {topUpReturn && (
          <div
            className="flex flex-shrink-0 items-center gap-2 px-4 py-2"
            style={{
              borderBottom: '1px solid color-mix(in srgb, var(--bling-gold) 40%, transparent)',
              background: 'color-mix(in srgb, var(--bling-gold) 10%, transparent)',
              color: 'var(--bling-gold)',
              fontSize: 12.5,
            }}
            // biome-ignore lint/a11y/useSemanticElements: a polite status banner is a live region.
            role="status"
          >
            <span>
              Top-up received — your h24 token balance updates here as the payment clears.
            </span>
            <button
              type="button"
              onClick={() => setTopUpReturn(false)}
              aria-label="Dismiss"
              className="ml-auto rounded p-0.5"
              style={{ color: 'var(--bling-gold)' }}
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* SIGNED OUT — membership pitch, no composer/balance/handle (SHELL v1.5). */}
        {!bee ? (
          <div className="flex min-h-0 flex-1 items-center justify-center px-6">
            <div
              className="flex max-w-md flex-col items-center gap-4 text-center"
              style={{ marginTop: '-16vh' }}
            >
              <h1
                className="astra-display"
                style={{ color: 'var(--ink)', fontSize: 40, lineHeight: 1.05 }}
              >
                h24
              </h1>
              <p style={{ color: 'var(--body)', fontSize: 14 }}>
                One directive box, every model, routed against this platform's canon. Membership
                unlocks it.
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => navigate('/premium')}
                  className="rounded-md px-4 py-2 font-semibold transition-colors"
                  style={{ background: 'var(--accent)', color: '#000', fontSize: 13 }}
                >
                  GET membership
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="rounded-md px-4 py-2 transition-colors"
                  style={{ border: '1px solid var(--line)', color: 'var(--body)', fontSize: 13 }}
                >
                  Sign in
                </button>
              </div>
            </div>
          </div>
        ) : !docked ? (
          // HOME — centered greeting + one-line promise + composer, biased ~16vh
          // above center. First send flips `docked`. The routing log's own
          // surface is the "Recent activity" shell panel (left nav), not a
          // second aside here (SHELL_DRAWER2).
          <div className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto px-5 md:px-8">
            <div
              className={cn(COMPOSER_MEASURE, 'flex flex-col items-stretch gap-5')}
              style={{ marginTop: '-16vh' }}
            >
              <div className="text-center">
                <h1
                  className="astra-display"
                  style={{ color: 'var(--ink)', fontSize: 36, lineHeight: 1.05 }}
                >
                  h24
                </h1>
                <p className="mt-2" style={{ color: 'var(--body)', fontSize: 13.5 }}>
                  Send a directive. h24 routes it to a model against this platform's canon and hands
                  the answer back — the directive and the response are never stored.
                </p>
              </div>
              {isMocked() && <MockNote />}
              {failure && <FailureNote failure={failure} />}
              {attachStatus && (
                <p className="text-center" style={{ color: 'var(--mute)', fontSize: 11.5 }}>
                  {attachStatus}
                </p>
              )}
              {composerEl}
            </div>
          </div>
        ) : (
          // DOCKED — conversation scrolls above, composer pinned at the bottom.
          <div className="flex min-h-0 flex-1 overflow-hidden">
            <section className="flex min-h-0 min-w-0 flex-1 flex-col">
              <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 py-6 md:px-8">
                <div className={cn(COMPOSER_MEASURE, 'flex flex-1 flex-col gap-6')}>
                  {isMocked() && <MockNote />}

                  {state === 'awaiting-confirm' && preview && (
                    <div
                      className="flex flex-col gap-3 rounded-md p-4"
                      style={{
                        border: '1px solid color-mix(in srgb, var(--accent) 55%, transparent)',
                        background: 'var(--accent-bg)',
                      }}
                    >
                      <p style={{ color: 'var(--ink)', fontSize: 13 }}>
                        This directive is estimated at{' '}
                        <span className="font-mono font-semibold">
                          {formatTokens(preview.estimatedCostTokens)}
                        </span>{' '}
                        h24 tokens on {preview.provider}. Nothing has been spent yet — confirm to
                        route it.
                      </p>
                      <p style={{ color: 'var(--body)', fontSize: 11.5 }}>
                        est. {preview.estimatedInputTokens.toLocaleString()} in ·{' '}
                        {preview.estimatedOutputTokens.toLocaleString()} out
                        {tokens.balance !== null && (
                          <>
                            {' · '}balance {formatTokens(tokens.balance)} → about{' '}
                            {formatTokens(
                              Math.max(0, tokens.balance - preview.estimatedCostTokens),
                            )}{' '}
                            after
                          </>
                        )}
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => void confirm()}
                          className="rounded-md px-3 py-1 font-semibold transition-colors"
                          style={{ background: 'var(--accent)', color: '#000', fontSize: 12.5 }}
                        >
                          CONFIRM
                        </button>
                        <button
                          type="button"
                          onClick={cancelConfirm}
                          className="rounded-md px-3 py-1 transition-colors"
                          style={{
                            border: '1px solid var(--line)',
                            color: 'var(--body)',
                            fontSize: 12.5,
                          }}
                        >
                          cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {failure && <FailureNote failure={failure} />}

                  {state === 'response-ready' && response && (
                    <div className="flex flex-col gap-2">
                      {/* H24_FIX1 defect 4 — echo the directive above the
                          answer so the transcript reads as a conversation. */}
                      {sentDirective && (
                        <div
                          className="self-end rounded-md px-3 py-2"
                          style={{
                            background: 'var(--accent-bg)',
                            color: 'var(--ink)',
                            fontSize: 13,
                            maxWidth: '85%',
                            whiteSpace: 'pre-wrap',
                          }}
                        >
                          {sentDirective}
                        </div>
                      )}
                      <div
                        className="rounded-md p-4 font-mono"
                        style={{
                          border: '1px solid var(--line)',
                          background: 'var(--raised)',
                          color: 'var(--ink)',
                          fontSize: 13,
                          whiteSpace: 'pre-wrap',
                        }}
                      >
                        {response.response}
                      </div>
                      <div
                        className="flex flex-wrap items-center gap-3"
                        style={{ color: 'var(--body)', fontSize: 11.5 }}
                      >
                        <span>provider · {response.provider}</span>
                        <span>
                          tokens · {response.tokens.input.toLocaleString()} in /{' '}
                          {response.tokens.output.toLocaleString()} out /{' '}
                          {response.tokens.cached.toLocaleString()} cached
                        </span>
                        <span
                          style={{
                            color: response.costTokens > 0 ? 'var(--bling-gold)' : undefined,
                          }}
                        >
                          cost ·{' '}
                          {response.costTokens === 0
                            ? 'FREE'
                            : `${formatTokens(response.costTokens)} h24 tokens`}
                        </span>
                        {response.balanceAfterTokens !== null && (
                          <span>balance · {formatTokens(response.balanceAfterTokens)}</span>
                        )}
                        <button
                          type="button"
                          onClick={() => startNewDirective(false)}
                          className="ml-auto rounded-md px-2 py-0.5 transition-colors"
                          style={{ border: '1px solid var(--line)', color: 'var(--body)' }}
                        >
                          new directive
                        </button>
                      </div>
                    </div>
                  )}

                  {/* H24_FIX1 defect 9 — compact inline log; the full,
                      filterable log lives at /h24/log (also reachable from the
                      Activity sidebar item and the alerts drawer). */}
                  <RoutingLogTable
                    log={log}
                    signedIn={Boolean(bee)}
                    selectedCostId={selectedCostId}
                    onSelectCost={setSelectedCostId}
                    onRefresh={() => void loadLog()}
                    onExport={exportCsv}
                  />
                  {log.entries.length > 0 && (
                    <button
                      type="button"
                      onClick={() => navigate('/h24/log')}
                      className="self-start underline-offset-2 hover:underline"
                      style={{ color: 'var(--body)', fontSize: 12 }}
                    >
                      View the full routing log →
                    </button>
                  )}
                </div>
              </div>

              {/* COMPOSER DOCK */}
              <div
                className="flex-shrink-0 px-5 py-3 md:px-8"
                style={{ borderTop: '1px solid var(--hairline)' }}
              >
                <div className={COMPOSER_MEASURE}>
                  {attachStatus && (
                    <p className="mb-2" style={{ color: 'var(--mute)', fontSize: 11.5 }}>
                      {attachStatus}
                    </p>
                  )}
                  {currentRate && band === 'auto' && (
                    <p className="mb-2" style={{ color: 'var(--mute)', fontSize: 11 }}>
                      {currentRate.model} · {formatTokens(currentRate.inputPerM)} in /{' '}
                      {formatTokens(currentRate.outputPerM)} out per 1M tokens
                    </p>
                  )}
                </div>
                {composerEl}
              </div>
            </section>

            {/* CONTENT WINDOW — the cost breakdown, split beside the log. */}
            {selectedEntry && (
              <H24CostPanel
                entry={selectedEntry}
                rates={log.rates}
                onClose={() => setSelectedCostId(null)}
              />
            )}
          </div>
        )}
      </div>
    </UniversalShell>
  );
}

/**
 * BYOK "door 2" of the COMPOSER v1.2 free-quota two-doors mechanic. Shown
 * before a model is picked (the Bee is on the free band, out of tokens, and
 * at quota), so this owns its own provider choice rather than reusing the
 * model-scoped ByokKeyEntry above.
 */
function ByokDoor({ onSaved }: { onSaved: () => void }) {
  const providers = Object.keys(PROVIDER_LABEL) as ByokProvider[];
  const [provider, setProvider] = useState<ByokProvider>(providers[0]);
  const [val, setVal] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedFor, setSavedFor] = useState<ByokProvider | null>(null);

  async function handleSave() {
    setBusy(true);
    setError(null);
    const result = await submitByokKey(provider, val);
    setBusy(false);
    if (result.valid) {
      setVal('');
      setSavedFor(provider);
      onSaved();
    } else {
      setError(result.error ?? 'Key validation failed.');
    }
  }

  if (savedFor) {
    return (
      <p style={{ color: 'var(--buy-green)', fontSize: 11.5 }}>
        {PROVIDER_LABEL[savedFor]} key saved — pick {PROVIDER_LABEL[savedFor]} under Model to use
        it.
      </p>
    );
  }

  return (
    <div
      className="flex flex-col gap-1.5 rounded-md p-3"
      style={{
        border: '1px solid var(--hairline, rgba(248,249,250,0.14))',
        background: 'var(--input, #10141b)',
      }}
    >
      <select
        value={provider}
        onChange={(e) => setProvider(e.target.value as ByokProvider)}
        disabled={busy}
        className="rounded-md border border-border-bright bg-panel-2 px-2 py-1 text-text"
        style={{ fontSize: 12 }}
      >
        {providers.map((p) => (
          <option key={p} value={p}>
            {PROVIDER_LABEL[p]}
          </option>
        ))}
      </select>
      <input
        type="password"
        autoComplete="off"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        placeholder={`Your ${PROVIDER_LABEL[provider]} API key — validated live, never logged`}
        className="w-full rounded-md border border-border-bright bg-panel-2 px-2 py-1.5 text-text focus:outline-none"
        style={{ fontSize: 12.5 }}
      />
      <div>
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={busy || val.trim().length === 0}
          className="rounded-md px-3 py-1 font-semibold transition-colors disabled:opacity-40"
          style={{ background: 'var(--accent, #ef6c2a)', color: '#000', fontSize: 12 }}
        >
          {busy ? 'Validating…' : 'Save key'}
        </button>
      </div>
      {error && (
        <p style={{ color: 'var(--error)', fontSize: 11.5 }} role="alert">
          {error}
        </p>
      )}
      <p style={{ color: 'var(--mute)', fontSize: 10.5, lineHeight: 1.5 }}>
        Your key is validated live against the provider, then goes to the routing process only —
        never into the model, never logged.
      </p>
    </div>
  );
}

function MockNote() {
  return (
    <div
      className="rounded-md px-3 py-2"
      style={{
        border: '1px solid color-mix(in srgb, var(--bling-gold) 50%, transparent)',
        background: 'color-mix(in srgb, var(--bling-gold) 10%, transparent)',
        color: 'var(--bling-gold)',
        fontSize: 12,
      }}
    >
      MOCK MODE — no provider is called and nothing is spent. Directives beginning{' '}
      <code>!preview</code>, <code>!fund</code>, <code>!cap</code> or <code>!fail</code> exercise
      the other response shapes.
    </div>
  );
}

function FailureNote({
  failure,
}: {
  failure: NonNullable<ReturnType<typeof useOracleDirective>['failure']>;
}) {
  return (
    <div
      className="flex flex-col gap-2 rounded-md p-3"
      style={{
        border: '1px solid color-mix(in srgb, var(--error) 60%, transparent)',
        background: 'color-mix(in srgb, var(--error) 10%, transparent)',
        color: 'var(--ink)',
        fontSize: 12.5,
      }}
      role="alert"
    >
      <span>{failure.message}</span>
      {failure.action === 'get-tokens' &&
        failure.requiredTokens !== undefined &&
        failure.availableTokens !== undefined && (
          <span style={{ color: 'var(--body)', fontSize: 11.5 }}>
            needs {formatTokens(failure.requiredTokens)} · you hold{' '}
            {formatTokens(failure.availableTokens)} · short by{' '}
            {formatTokens(Math.max(0, failure.requiredTokens - failure.availableTokens))}
          </span>
        )}
      {failure.action === 'retry-later' && failure.retryAfterSeconds && (
        <span style={{ color: 'var(--body)', fontSize: 11.5 }}>
          Try again in about {failure.retryAfterSeconds}s.
        </span>
      )}
    </div>
  );
}
