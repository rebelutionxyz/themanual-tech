// H24_BYOK2 — surface (a) of the owner's "two surfaces, ONE store" ruling:
// the canonical BYOK key management home. Add / Edit / Delete per provider,
// all writing through the SAME store as the composer's inline panel and its
// Model-menu Add/Edit/Delete (H24_BYOK1's listByokStates/submitByokKey/
// revokeByokKey, byok.ts — never rebuilt here).
//
// This is what the h24 sidebar's "Customize" item now means — it used to
// point at the generic /account hub, which has nothing BYOK-specific on it.
// Nothing else claimed that nav slot for h24 (buildH24Nav's own history:
// H24_FIX1 introduced it pointing at /account as a placeholder), so giving it
// real, h24-native meaning here doesn't remove anything a Bee could already
// reach — /account is still reachable from the avatar and the handle drawer.

import { ByokKeyEntry } from '@/components/h24/ByokKeyEntry';
import { UniversalShell } from '@/components/shell/UniversalShell';
import {
  type ByokProvider,
  type ByokState,
  PROVIDER_LABEL,
  listByokStates,
  revokeByokKey,
  submitByokKey,
} from '@/lib/atlasoracle/byok';
import { buildH24Nav } from '@/lib/atlasoracle/h24Nav';
import { useOracleTokens } from '@/lib/atlasoracle/useOracleTokens';
import { H24SidebarTop } from '@/components/h24/H24SidebarTop';
import { useAuth } from '@/lib/auth';
import { useBlingBalance } from '@/lib/useBlingBalance';
import { H24_TOKENS } from '@/lib/shell/astraTokens';
import { useH24Storefront } from '@/stores/useH24Storefront';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const ALL_PROVIDERS: ByokProvider[] = ['anthropic', 'openai', 'xai', 'meta', 'mistral', 'deepseek'];

function emptyStates(): Record<ByokProvider, ByokState> {
  return Object.fromEntries(
    ALL_PROVIDERS.map((p) => [p, { present: false, last4: null, status: null }]),
  ) as Record<ByokProvider, ByokState>;
}

export function H24CustomizePage() {
  const { bee } = useAuth();
  // SHELL v1.8: the header BLiNG slot shows BLiNG; h24 tokens go to the sidebar top.
  const { balance: blingBalance } = useBlingBalance(Boolean(bee));
  const navigate = useNavigate();
  const openStore = useH24Storefront((s) => s.openStore);
  const { balance: tokens } = useOracleTokens(bee?.id ?? null);

  const [states, setStates] = useState<Record<ByokProvider, ByokState>>(emptyStates);
  const [loaded, setLoaded] = useState(false);
  // Which provider's entry panel is open — at most one at a time, same
  // discipline as the composer's single `byokOpen` slot.
  const [editing, setEditing] = useState<ByokProvider | null>(null);

  const load = useCallback(async () => {
    if (!bee) {
      setStates(emptyStates());
      setLoaded(true);
      return;
    }
    setStates(await listByokStates());
    setLoaded(true);
  }, [bee]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleRevoke(p: ByokProvider) {
    await revokeByokKey(p);
    void load();
  }

  const nav = buildH24Nav({
    navigate,
    onNew: () => navigate('/h24'),
    signedIn: Boolean(bee),
    tokenBalance: tokens.balance,
    onOpenWallet: openStore,
    active: 'customize',
  });

  return (
    <UniversalShell
      tokens={H24_TOKENS}
      breadcrumb={
        <span>
          h24 <span style={{ color: 'var(--mute)' }}>/ Customize</span>
        </span>
      }
      nav={nav}
      bling={blingBalance}
      onOpenLedger={() => navigate('/bling')}
      sidebarTop={
        <H24SidebarTop balance={tokens.balance} signedIn={Boolean(bee)} onOpen={openStore} />
      }
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
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 md:px-8">
        <div className="mx-auto flex max-w-2xl flex-col gap-5">
          <div>
            <h1 className="astra-display" style={{ color: 'var(--ink)', fontSize: 22 }}>
              Your provider keys
            </h1>
            <p className="mt-1" style={{ color: 'var(--body)', fontSize: 13 }}>
              Bring your own key for any provider. Your key, your bill, your ceiling — it goes to
              the routing process only, never into the model, never logged, masked here. The same
              keys are reachable from the composer's Model menu; add, edit, or delete from either
              place and it's the same store.
            </p>
          </div>

          {!bee ? (
            <p style={{ color: 'var(--body)', fontSize: 13.5 }}>Sign in to manage your keys.</p>
          ) : !loaded ? (
            <p style={{ color: 'var(--body)', fontSize: 12.5 }}>Loading…</p>
          ) : (
            <div className="flex flex-col gap-3">
              {ALL_PROVIDERS.map((p) => {
                const st = states[p];
                return (
                  <div
                    key={p}
                    className="rounded-lg p-3.5"
                    style={{ border: '1px solid var(--line)', background: 'var(--raised)' }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div style={{ color: 'var(--ink)', fontSize: 14, fontWeight: 600 }}>
                          {PROVIDER_LABEL[p]}
                        </div>
                        <div style={{ color: 'var(--mute)', fontSize: 11.5 }}>
                          {st.present
                            ? `Key set${st.last4 ? ` — •••• ${st.last4}` : ''}`
                            : 'No key set'}
                        </div>
                      </div>
                      <div
                        className="flex flex-shrink-0 items-center gap-3"
                        style={{ fontSize: 12 }}
                      >
                        {st.present ? (
                          <>
                            <button
                              type="button"
                              onClick={() => setEditing(editing === p ? null : p)}
                              className="underline-offset-2 hover:underline"
                              style={{ color: 'var(--body)' }}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleRevoke(p)}
                              className="underline-offset-2 hover:underline"
                              style={{ color: 'var(--error)' }}
                            >
                              Delete
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setEditing(editing === p ? null : p)}
                            className="font-semibold underline-offset-2 hover:underline"
                            style={{ color: 'var(--accent, #ef6c2a)' }}
                          >
                            Add
                          </button>
                        )}
                      </div>
                    </div>
                    {editing === p && (
                      <ByokKeyEntry
                        provider={p}
                        onSubmit={(raw) => submitByokKey(p, raw)}
                        onSaved={() => {
                          setEditing(null);
                          void load();
                        }}
                        onCancel={() => setEditing(null)}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </UniversalShell>
  );
}
