/* H24SidebarTop — the h24 token balance at the top of the left sidebar.
 *
 * SHELL v1.8 (owner 2026-09-03): "We can add the h24 token amount to the top of
 * the left sidebar. The bling amount and icon are in the top utility bar."
 *
 * So the two balances stop sharing a slot. The header shows BLiNG! (the
 * constellation currency, gold, every astra). This shows h24 tokens (this
 * astra's own account) where this astra's own nav lives. They are never
 * adjacent, which is what CURRENCY_LAW v1.6 s1 actually wants — not the absence
 * of BLiNG from the header, but the absence of an implied exchange rate.
 *
 * One component, mounted by all four h24 surfaces via the shell's `sidebarTop`
 * slot — the same reason h24Nav.ts exists: four pages must not re-type it.
 */

import { ButterflyMark } from '@/components/shell/marks/AstraMark';
import { formatTokens } from '@/lib/atlasoracle/tokens';

export function H24SidebarTop({
  balance,
  signedIn,
  onOpen,
}: {
  /** h24 token balance; null = not loaded / signed out. */
  balance: number | null;
  signedIn: boolean;
  /** Opens the token store / wallet — the same action as the Wallet nav entry. */
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={!signedIn}
      title={signedIn ? 'h24 tokens — open wallet' : 'Sign in to see your h24 balance'}
      className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors disabled:cursor-default"
      style={{
        background: 'var(--accent-bg)',
        border: '1px solid color-mix(in srgb, var(--accent) 22%, transparent)',
      }}
      onMouseEnter={(e) => {
        if (signedIn) e.currentTarget.style.borderColor = 'var(--accent-dim)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--accent) 22%, transparent)';
      }}
    >
      <span style={{ color: 'var(--accent)' }}>
        <ButterflyMark size={16} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col leading-tight">
        <span
          className="font-mono uppercase tracking-wider"
          style={{ color: 'var(--mute)', fontSize: 10 }}
        >
          h24 tokens
        </span>
        <span
          className="truncate font-mono font-semibold tabular-nums"
          style={{ color: 'var(--ink)', fontSize: 15 }}
        >
          {balance === null ? '—' : formatTokens(balance)}
        </span>
      </span>
    </button>
  );
}
