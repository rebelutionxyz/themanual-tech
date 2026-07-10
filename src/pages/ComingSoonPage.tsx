import { useAuth } from '@/lib/auth';

/**
 * Blank front door for signed-in Bees outside the management allowlist.
 * Deliberately near-empty — the platform is pre-open. Anonymous visitors
 * never see this (root shows the login module); this is the signed-in,
 * not-yet-invited landing. (Landing gate, 2026-07-10.)
 */
export function ComingSoonPage() {
  const { signOut } = useAuth();
  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center gap-5 px-4 text-center">
      <div className="font-display text-2xl font-bold tracking-[0.3em] text-zinc-200">
        THE MANUAL
      </div>
      <p className="text-sm text-zinc-500">Coming soon.</p>
      <button
        type="button"
        onClick={() => void signOut()}
        className="text-xs text-zinc-600 underline-offset-4 transition-colors hover:text-zinc-400 hover:underline"
      >
        Sign out
      </button>
    </main>
  );
}
