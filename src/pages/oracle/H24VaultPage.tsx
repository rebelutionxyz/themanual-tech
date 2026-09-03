// H24_FIX1 defect 8 — h24's OWN Vault, on its own surface.
//
// Before this pass the sidebar's "Vault" item pointed at /studio (Creator
// Studio), which is a DIFFERENT concept: BRANDoSOPHIC's autofetched content
// vault (CONCEPTS v3.6), backed by media_assets + folders. h24 Vault means
// this Bee's own saved directive OUTPUTS — and h24 has no table for that.
// platform_thesis.md is explicit that h24 "holds directive content only for
// the duration of routing" and h24_directives carries metadata only (no
// directive or response text columns exist — see routingLog.ts). So there is
// currently no real data to show here.
//
// Per the codebase's real-data-only discipline (the same rule the shell's
// "tasks" drawer slot and the DingleBERRY drill screens already follow),
// this page says so honestly instead of silently reusing the Creator Studio
// vault or a fabricated list. Backing this for real is a schema change
// (a saved-artifacts table + an explicit "save to Vault" action on a
// response) — db-lane work, out of scope for a front-end pass.

import { UniversalShell } from '@/components/shell/UniversalShell';
import { buildH24Nav } from '@/lib/atlasoracle/h24Nav';
import { formatTokens } from '@/lib/atlasoracle/tokens';
import { useOracleTokens } from '@/lib/atlasoracle/useOracleTokens';
import { useAuth } from '@/lib/auth';
import { H24_TOKENS } from '@/lib/shell/astraTokens';
import { useH24Storefront } from '@/stores/useH24Storefront';
import { useNavigate } from 'react-router-dom';

export function H24VaultPage() {
  const { bee } = useAuth();
  const navigate = useNavigate();
  const openStore = useH24Storefront((s) => s.openStore);
  const { balance: tokens } = useOracleTokens(bee?.id ?? null);

  const nav = buildH24Nav({
    navigate,
    onNew: () => navigate('/h24'),
    signedIn: Boolean(bee),
    tokenBalance: tokens.balance,
    onOpenWallet: openStore,
    active: 'vault',
  });

  return (
    <UniversalShell
      tokens={H24_TOKENS}
      breadcrumb={
        <span>
          h24 <span style={{ color: 'var(--mute)' }}>/ Vault</span>
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
      <div className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto px-6">
        <div className="flex max-w-md flex-col items-center gap-3 text-center">
          <h1 className="astra-display" style={{ color: 'var(--ink)', fontSize: 28 }}>
            Vault
          </h1>
          {!bee ? (
            <p style={{ color: 'var(--body)', fontSize: 13.5 }}>Sign in to see your Vault.</p>
          ) : (
            <>
              <p style={{ color: 'var(--body)', fontSize: 13.5 }}>
                h24's Vault is for directive outputs you've chosen to keep — nothing lives here yet.
              </p>
              <p style={{ color: 'var(--mute)', fontSize: 12 }}>
                h24 does not store directive or response text by default (see the console's
                sovereignty note), so saving one to a Vault is a feature that has to exist first.
                This page is not the Creator Studio content vault — that one lives at{' '}
                <button
                  type="button"
                  onClick={() => navigate('/studio')}
                  className="underline-offset-2 hover:underline"
                  style={{ color: 'var(--body)' }}
                >
                  Creator Studio
                </button>
                .
              </p>
            </>
          )}
          <button
            type="button"
            onClick={() => navigate('/h24')}
            className="mt-2 rounded-md px-4 py-2 font-semibold transition-colors"
            style={{ background: 'var(--accent)', color: '#000', fontSize: 13 }}
          >
            Back to the console
          </button>
        </div>
      </div>
    </UniversalShell>
  );
}
