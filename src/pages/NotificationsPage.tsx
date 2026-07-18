import { usePopupScope } from '@/components/shell/PopupShell';
import { useAuth } from '@/lib/auth';
import { relativeTime } from '@/lib/intel';
import {
  type NotificationItem,
  dismissNotifications,
  listNotifications,
  listUnreadNotifications,
  markNotificationsRead,
} from '@/lib/notifications';
import { cn } from '@/lib/utils';
import { Bell, CheckCheck, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const PAGE_SIZE = 30;
const ACCENT = '#D97706'; // amber ink — honey accent that reads on white
const FILL = '#FAD15E'; // honey fill (dark ink on top)

/**
 * Notification center (universal utility surface, /notifications).
 * Replaces the UniversalPlaceholders stub: live list over the `notifications`
 * table + the deployed mark-read / dismiss RPCs. Rows written by forum
 * reply/mention triggers, comms_send, and notify(). Click follows the row's
 * deep link and marks it read; sidebar badges refresh via the shared
 * `intel-counts-refresh` event.
 */
export function NotificationsPage() {
  const { bee } = useAuth();
  const navigate = useNavigate();
  // Popup scope: a specific Astra picked in the shell dropdown (null = All
  // Astras / full page). Scoped with no mapped Astra → honest empty state.
  const popupScope = usePopupScope();
  const inPopup = popupScope !== null;
  const scoped = Boolean(popupScope?.surface);
  const astraId = popupScope?.astraId ?? null;
  const [rows, setRows] = useState<NotificationItem[] | null>(null);
  // Scoped view only: fresh (unread) notifications from ANY astra, pinned
  // above the surface's own results.
  const [fresh, setFresh] = useState<NotificationItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const load = useCallback(async () => {
    if (!bee?.id) {
      setRows([]);
      setFresh([]);
      setHasMore(false);
      return;
    }
    setError(null);
    try {
      if (scoped) {
        const [unreadAll, scopedRows] = await Promise.all([
          listUnreadNotifications(PAGE_SIZE),
          astraId ? listNotifications(PAGE_SIZE, 0, astraId) : Promise.resolve([]),
        ]);
        const scopedIds = new Set(scopedRows.map((n) => n.id));
        setFresh(unreadAll.filter((n) => !scopedIds.has(n.id)));
        setRows(scopedRows);
        setHasMore(scopedRows.length === PAGE_SIZE);
        return;
      }
      setFresh([]);
      const page = await listNotifications(PAGE_SIZE, 0);
      setRows(page);
      setHasMore(page.length === PAGE_SIZE);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load notifications');
      setRows([]);
      setFresh([]);
    }
  }, [bee?.id, scoped, astraId]);

  useEffect(() => {
    setRows(null);
    void load();
  }, [load]);

  /** Tell the community shell to refresh its unread badge. */
  function pingBadges() {
    window.dispatchEvent(new Event('intel-counts-refresh'));
  }

  async function loadMore() {
    if (!rows || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await listNotifications(PAGE_SIZE, rows.length, astraId);
      setRows([...rows, ...page]);
      setHasMore(page.length === PAGE_SIZE);
    } catch {
      setHasMore(false);
    } finally {
      setLoadingMore(false);
    }
  }

  async function onMarkAllRead() {
    try {
      // Scoped view marks everything VISIBLE (the any-astra fresh strip +
      // the surface's unread); constellation marks all (ids = null → RPC
      // marks every unread row).
      const ids = scoped
        ? [...fresh.map((n) => n.id), ...(rows ?? []).filter((n) => !n.isRead).map((n) => n.id)]
        : null;
      await markNotificationsRead(ids);
      setRows((r) => (r ? r.map((n) => ({ ...n, isRead: true })) : r));
      // Fresh items are read now — they belong to the All view, not the strip.
      setFresh([]);
      pingBadges();
    } catch {
      // non-fatal
    }
  }

  async function onDismiss(id: number) {
    setRows((r) => (r ? r.filter((n) => n.id !== id) : r));
    setFresh((f) => f.filter((n) => n.id !== id));
    try {
      await dismissNotifications([id]);
      pingBadges();
    } catch {
      // row already gone from view; list refetch on next visit reconciles
    }
  }

  async function onOpen(n: NotificationItem) {
    if (!n.isRead) {
      setRows((r) => (r ? r.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)) : r));
      setFresh((f) => f.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)));
      markNotificationsRead([n.id])
        .then(pingBadges)
        .catch(() => {});
    }
    if (!n.url) return;
    if (/^https?:\/\//i.test(n.url)) {
      window.open(n.url, '_blank', 'noopener,noreferrer');
    } else {
      navigate(n.url);
    }
  }

  const unread =
    (rows?.filter((n) => !n.isRead).length ?? 0) + fresh.filter((n) => !n.isRead).length;
  const showMarkAll = Boolean(rows && unread > 0);

  const renderRow = (n: NotificationItem) => (
    <li key={n.id}>
      <div
        className={cn(
          'group flex items-start gap-3 rounded-lg border p-3.5 transition-colors',
          n.isRead ? 'border-zinc-200 bg-white' : 'border-amber-200 bg-amber-50/60',
          n.url && 'cursor-pointer hover:bg-zinc-50',
        )}
        onClick={() => onOpen(n)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            void onOpen(n);
          }
        }}
        role={n.url ? 'button' : undefined}
        tabIndex={n.url ? 0 : undefined}
      >
        <span
          className="mt-1.5 block h-2 w-2 flex-shrink-0 rounded-full"
          style={{ background: n.isRead ? 'transparent' : ACCENT }}
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              'text-[14px] leading-snug',
              n.isRead ? 'text-zinc-600' : 'font-medium text-zinc-900',
            )}
          >
            {n.title}
          </p>
          {n.body && <p className="mt-0.5 line-clamp-2 text-[12.5px] text-zinc-500">{n.body}</p>}
          <p className="mt-1 font-mono text-[11px] text-zinc-500" data-size="meta">
            {n.type && (
              <span className="mr-2 rounded bg-zinc-100 px-1.5 py-0.5 uppercase tracking-wider">
                {n.type.replace(/_/g, ' ')}
              </span>
            )}
            {n.createdAt && relativeTime(n.createdAt)}
          </p>
        </div>
        <button
          type="button"
          aria-label="Dismiss notification"
          title="Dismiss"
          onClick={(e) => {
            e.stopPropagation();
            void onDismiss(n.id);
          }}
          className="flex-shrink-0 rounded p-1 text-zinc-500 opacity-0 transition-opacity hover:bg-zinc-100 hover:text-zinc-900 group-hover:opacity-100"
        >
          <X size={15} />
        </button>
      </div>
    </li>
  );

  return (
    <div
      className={cn(
        'safe-pad-x mx-auto w-full max-w-2xl px-4',
        inPopup ? 'py-4' : 'py-6 md:py-8',
      )}
    >
      {/* In a popup, PopupShell's chrome IS the title — the page renders only
          the actions row (when there is anything to act on). */}
      {(!inPopup || showMarkAll) && (
        <div
          className={cn(
            'mb-5 flex items-center gap-3',
            inPopup ? 'justify-end' : 'justify-between',
          )}
        >
          {!inPopup && (
            <h1 className="flex items-center gap-2.5 font-display text-2xl font-semibold text-zinc-900">
              <Bell size={22} style={{ color: ACCENT }} />
              Notifications
              {unread > 0 && (
                <span
                  className="rounded-full px-2 py-0.5 font-mono text-[11px] font-semibold"
                  style={{ color: '#18181b', background: FILL }}
                  data-size="meta"
                >
                  {unread}
                </span>
              )}
            </h1>
          )}
          {showMarkAll && (
            <button
              type="button"
              onClick={onMarkAllRead}
              className="flex items-center gap-1.5 rounded-md border border-zinc-200 px-2.5 py-1.5 text-[12.5px] text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
            >
              <CheckCheck size={14} />
              Mark all read
            </button>
          )}
        </div>
      )}

      {!bee ? (
        <EmptyCard line="Sign in to see your notifications." />
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-[13px] text-red-600">
          {error}
        </div>
      ) : rows === null ? (
        <EmptyCard line="Loading…" />
      ) : rows.length === 0 && fresh.length === 0 ? (
        <EmptyCard
          line={
            scoped
              ? 'Nothing scoped to this surface yet — notifications land here as they start carrying a surface tag.'
              : 'Nothing yet. Replies, mentions, and messages land here.'
          }
        />
      ) : (
        <>
          {/* Scoped view: new notifications from ANY astra pin above the
              surface's own results — being scoped never hides fresh activity. */}
          {scoped && fresh.length > 0 && (
            <div className="mb-4">
              <SectionLabel text="New · all Astras" />
              <ul className="flex flex-col gap-1.5">{fresh.map(renderRow)}</ul>
            </div>
          )}
          {scoped && fresh.length > 0 && rows.length > 0 && <SectionLabel text="This surface" />}
          {rows.length === 0 ? (
            scoped && (
              <p className="px-1 text-[12.5px] text-zinc-400">
                Nothing scoped to this surface yet.
              </p>
            )
          ) : (
            <ul className="flex flex-col gap-1.5">{rows.map(renderRow)}</ul>
          )}
          {hasMore && (
            <div className="mt-4 flex justify-center">
              <button
                type="button"
                onClick={() => void loadMore()}
                disabled={loadingMore}
                className="rounded-md border border-zinc-200 px-4 py-2 text-[13px] text-zinc-600 transition-colors hover:bg-white hover:text-zinc-900 disabled:opacity-50"
              >
                {loadingMore ? 'Loading…' : 'Load more'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function SectionLabel({ text }: { text: string }) {
  return (
    <p
      className="mb-1.5 px-1 font-mono text-[10px] uppercase tracking-wider text-zinc-500"
      data-size="meta"
    >
      {text}
    </p>
  );
}

function EmptyCard({ line }: { line: string }) {
  return (
    <div className="rounded-lg border-2 border-dashed border-zinc-200 bg-zinc-50/60 p-10 text-center text-[13px] text-zinc-500">
      {line}
    </div>
  );
}
