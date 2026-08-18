/* h24 SIDEBAR — owned state, minimizable to an icon rail.
 *
 * H24_DESIGN_SPEC v1.0 REAL-DATA-ONLY RULE: "a section renders when its backend
 * exists, never before." This sidebar therefore ships SHORT. Three sections
 * have a backend today and appear:
 *
 *   VAULT    — the Creator Studio Media Library (creator_studio_media_v1), read
 *              through `libraryUsage()`. Real per-kind counts and bytes.
 *   ACTIVITY — derived from the routing-log metadata the page already holds
 *              (atlasoracle_directives, metadata only). No second read.
 *   WALLET   — the live token balance the page already holds.
 *
 * ABSENT BY DESIGN, each named in the dispatch as backendless at v1.46:
 * Projects, Automations, Scheduled, Pinned, Access, Recent chats. Rendering an
 * empty "Projects" is a promise the platform cannot keep today, so it is not
 * rendered. When one of them gets a backend, it slots in here.
 *
 * CONSENT CHIPS are likewise absent: the vault is HYBRID and a file's state chip
 * renders only when a consent grant exists, and none can exist yet (no consent
 * ledger is live — DB76 is a proposal). A faked chip would misrepresent the
 * sovereignty state, which is the one thing this surface must never do.
 */

import { type LibraryUsage, type MediaKind, formatBytes, libraryUsage } from '@/lib/media';
import { formatTokens } from '@/lib/atlasoracle/tokens';
import type { OracleTokenBalance } from '@/lib/atlasoracle/tokens';
import type { RoutingLogEntry } from '@/lib/atlasoracle/routingLog';
import { cn } from '@/lib/utils';
import { Activity, FileText, Image, Music, Video, Wallet } from 'lucide-react';
import { type ReactNode, useEffect, useMemo, useState } from 'react';

const VAULT_KINDS: { kind: MediaKind; label: string; icon: ReactNode }[] = [
  { kind: 'image', label: 'Images', icon: <Image size={15} /> },
  { kind: 'video', label: 'Videos', icon: <Video size={15} /> },
  { kind: 'audio', label: 'Audio', icon: <Music size={15} /> },
  { kind: 'document', label: 'Docs', icon: <FileText size={15} /> },
];

export interface H24SidebarProps {
  collapsed: boolean;
  balance: OracleTokenBalance;
  /** Routing-log rows the page already fetched — Activity derives from these. */
  entries: RoutingLogEntry[];
  signedIn: boolean;
}

export function H24Sidebar({ collapsed, balance, entries, signedIn }: H24SidebarProps) {
  const [vault, setVault] = useState<{ loaded: boolean; usage: LibraryUsage[] }>({
    loaded: false,
    usage: [],
  });

  useEffect(() => {
    let cancelled = false;
    if (!signedIn) {
      setVault({ loaded: true, usage: [] });
      return;
    }
    void libraryUsage()
      .then((usage) => {
        if (!cancelled) setVault({ loaded: true, usage });
      })
      .catch(() => {
        if (!cancelled) setVault({ loaded: true, usage: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [signedIn]);

  const usageByKind = useMemo(() => {
    const m = new Map<MediaKind, LibraryUsage>();
    for (const u of vault.usage) m.set(u.kind, u);
    return m;
  }, [vault.usage]);

  // ACTIVITY, derived — total, by kind, and how many in the last 7 days. All
  // from metadata already in hand; nothing here reads content, because the
  // columns that would hold content do not exist.
  const activity = useMemo(() => {
    const byKind = new Map<string, number>();
    let last7 = 0;
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    for (const e of entries) {
      byKind.set(e.category, (byKind.get(e.category) ?? 0) + 1);
      // Date math on a fixed cutoff, not Date.now() per-row — one read of the
      // clock, so the 7-day window is stable across the loop.
      if (new Date(e.createdAt).getTime() >= weekAgo) last7 += 1;
    }
    const kinds = [...byKind.entries()].sort((a, b) => b[1] - a[1]);
    return { total: entries.length, last7, kinds };
  }, [entries]);

  if (collapsed) {
    // Icon rail — one glyph per section, no counts. Tapping the toggle in the
    // toolbar expands it; the rail is a presence cue, not a control surface.
    return (
      <nav
        aria-label="h24 sidebar (collapsed)"
        className="flex w-12 flex-shrink-0 flex-col items-center gap-4 border-r border-border bg-bg-elevated/40 py-4"
      >
        <Image size={17} className="text-text-silver" aria-label="Vault" />
        <Activity size={17} className="text-text-silver" aria-label="Activity" />
        <Wallet size={17} className="text-text-silver" aria-label="Wallet" />
      </nav>
    );
  }

  return (
    <nav
      aria-label="h24 sidebar"
      className="flex w-60 flex-shrink-0 flex-col gap-5 overflow-y-auto border-r border-border bg-bg-elevated/40 px-3 py-4"
    >
      {/* VAULT */}
      <section className="flex flex-col gap-1.5">
        <SectionTitle icon={<Image size={13} />}>Vault</SectionTitle>
        {VAULT_KINDS.map(({ kind, label, icon }) => {
          const u = usageByKind.get(kind);
          const count = u?.assetCount ?? 0;
          return (
            <div
              key={kind}
              className="flex items-center gap-2 rounded-md px-2 py-1.5 text-text-silver"
              style={{ fontSize: '12.5px' }}
            >
              <span className="text-text-muted">{icon}</span>
              <span className="flex-1">{label}</span>
              <span className="font-mono text-text-muted" style={{ fontSize: '11px' }}>
                {vault.loaded ? count : '·'}
                {u && u.totalBytes > 0 && (
                  <span className="ml-1.5 opacity-70">{formatBytes(u.totalBytes)}</span>
                )}
              </span>
            </div>
          );
        })}
        {vault.loaded && vault.usage.length === 0 && (
          <p className="px-2 text-text-muted" style={{ fontSize: '11px' }}>
            {signedIn ? 'Nothing in your library yet.' : 'Sign in to see your library.'}
          </p>
        )}
      </section>

      {/* ACTIVITY */}
      <section className="flex flex-col gap-1.5">
        <SectionTitle icon={<Activity size={13} />}>Activity</SectionTitle>
        {activity.total === 0 ? (
          <p className="px-2 text-text-muted" style={{ fontSize: '11px' }}>
            No directives routed yet.
          </p>
        ) : (
          <>
            <div
              className="flex items-baseline gap-2 px-2 text-text-silver"
              style={{ fontSize: '12.5px' }}
            >
              <span className="font-mono text-text">{activity.total}</span>
              <span>routed</span>
              <span className="ml-auto text-text-muted" style={{ fontSize: '11px' }}>
                {activity.last7} in 7d
              </span>
            </div>
            {activity.kinds.slice(0, 5).map(([kind, n]) => (
              <div
                key={kind}
                className="flex items-center gap-2 px-2 text-text-silver"
                style={{ fontSize: '11.5px' }}
              >
                <span className="flex-1 truncate font-mono text-text-muted">{kind}</span>
                <span className="font-mono">{n}</span>
              </div>
            ))}
          </>
        )}
      </section>

      {/* WALLET */}
      <section className="flex flex-col gap-1.5">
        <SectionTitle icon={<Wallet size={13} />}>Wallet</SectionTitle>
        <div className="rounded-md border border-border-bright bg-panel-2 px-3 py-2.5">
          <div className="font-mono text-lg text-text">
            {balance.balance === null ? '—' : formatTokens(balance.balance)}
          </div>
          <div className="text-text-muted" style={{ fontSize: '11px' }}>
            {balance.status === 'live' ? 'h24 tokens' : balance.reason}
          </div>
        </div>
      </section>
    </nav>
  );
}

function SectionTitle({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <h3
      className={cn(
        'flex items-center gap-1.5 px-2 font-mono uppercase tracking-wider text-text-muted',
      )}
      style={{ fontSize: '10px' }}
    >
      {icon}
      {children}
    </h3>
  );
}
