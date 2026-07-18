import { usePopupScope } from '@/components/shell/PopupShell';
import { type CommunitySurface, popupAccent } from '@/components/shell/popupRegistry';
import { useAuth } from '@/lib/auth';
import { type SavedItem, listMySaves, unsaveById } from '@/lib/bookmarks';
import { relativeTime } from '@/lib/intel';
import { createShareLink } from '@/lib/reactions';
import { cn } from '@/lib/utils';
import { ArrowDownUp, Bookmark, BookmarkMinus, Check, Link2, Search } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const ACCENT = '#D97706'; // honey ink (matches NotificationsPage)
const FILL = '#FAD15E';

/** Friendly chip labels; unknown surfaces fall back to the raw token. */
const SURFACE_LABEL: Record<string, string> = {
  intel: 'INTEL',
  unite: 'Groups',
  rule: 'Events',
  give: 'Give',
  pulse: 'Pulse',
  bazaar: 'Bazaar',
  comms: 'COMMs',
};

/**
 * Bookmarked — the Bee's whole shelf (/bookmarks). Every entity_saves row
 * across every surface, resolved to titles + deep links: search, per-surface
 * filter chips, sort, jump-to, share (tracked link via entity_shares), and
 * unsave. In the popup, PopupShell's All/<surface> toggle presets the chip
 * filter; the chips can still drill anywhere from there. INTEL's own
 * /intel/saved thread view is unchanged — this is the cross-surface shelf.
 */
export function BookmarksPage() {
  const { bee } = useAuth();
  const navigate = useNavigate();
  const popupScope = usePopupScope();
  const inPopup = popupScope !== null;

  const [items, setItems] = useState<SavedItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [surfaceFilter, setSurfaceFilter] = useState<string>('all');
  const [oldestFirst, setOldestFirst] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // The shell scope toggle presets the filter: This-surface → that chip,
  // All → every surface. Chips remain live for drilling past the preset.
  const scopeMode = popupScope?.scope ?? null;
  const scopeSurface = popupScope?.surface ?? null;
  useEffect(() => {
    if (!scopeMode) return;
    setSurfaceFilter(scopeMode === 'surface' && scopeSurface ? scopeSurface : 'all');
  }, [scopeMode, scopeSurface]);

  const load = useCallback(async () => {
    if (!bee?.id) {
      setItems([]);
      return;
    }
    setError(null);
    try {
      setItems(await listMySaves(bee.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load your shelf');
      setItems([]);
    }
  }, [bee?.id]);

  useEffect(() => {
    setItems(null);
    void load();
  }, [load]);

  /** Tell the community shell to refresh the Bookmarked badge. */
  function pingBadges() {
    window.dispatchEvent(new Event('intel-counts-refresh'));
  }

  async function onUnsave(item: SavedItem) {
    setItems((xs) => (xs ? xs.filter((x) => x.saveId !== item.saveId) : xs));
    try {
      await unsaveById(item.saveId);
      pingBadges();
    } catch {
      // row already gone from view; refetch on next visit reconciles
    }
  }

  async function onShare(item: SavedItem) {
    if (!bee?.id || !item.url) return;
    try {
      const link = await createShareLink(
        item.surface,
        item.sourceId,
        bee.id,
        `${window.location.origin}${item.url}`,
      );
      await navigator.clipboard.writeText(link);
      setCopiedId(item.saveId);
      window.setTimeout(() => setCopiedId((c) => (c === item.saveId ? null : c)), 1600);
    } catch {
      // clipboard denied — non-fatal
    }
  }

  function onOpen(item: SavedItem) {
    if (item.url) navigate(item.url);
  }

  const surfacesOnShelf = useMemo(
    () => Array.from(new Set((items ?? []).map((i) => i.surface))).sort(),
    [items],
  );

  const visible = useMemo(() => {
    let xs = items ?? [];
    if (surfaceFilter !== 'all') xs = xs.filter((i) => i.surface === surfaceFilter);
    const q = query.trim().toLowerCase();
    if (q) xs = xs.filter((i) => i.title.toLowerCase().includes(q));
    return [...xs].sort((a, b) =>
      oldestFirst ? a.savedAt.localeCompare(b.savedAt) : b.savedAt.localeCompare(a.savedAt),
    );
  }, [items, surfaceFilter, query, oldestFirst]);

  const total = items?.length ?? 0;

  return (
    <div
      className={cn('safe-pad-x mx-auto w-full max-w-2xl px-4', inPopup ? 'py-4' : 'py-6 md:py-8')}
    >
      {!inPopup && (
        <div className="mb-5 flex items-center justify-between gap-3">
          <h1 className="flex items-center gap-2.5 font-display text-2xl font-semibold text-zinc-900">
            <Bookmark size={22} style={{ color: ACCENT }} />
            Bookmarked
            {total > 0 && (
              <span
                className="rounded-full px-2 py-0.5 font-mono text-[11px] font-semibold"
                style={{ color: '#18181b', background: FILL }}
                data-size="meta"
              >
                {total}
              </span>
            )}
          </h1>
        </div>
      )}

      {/* Toolbar: search · sort. */}
      <div className="mb-3 flex items-center gap-2">
        <label className="flex min-w-0 flex-1 items-center gap-2 rounded-md border border-zinc-200 bg-white px-2.5 py-1.5">
          <Search size={14} className="flex-shrink-0 text-zinc-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your shelf"
            className="w-full bg-transparent text-[13px] text-zinc-800 outline-none placeholder:text-zinc-400"
          />
        </label>
        <button
          type="button"
          onClick={() => setOldestFirst((v) => !v)}
          title={oldestFirst ? 'Oldest saves first' : 'Newest saves first'}
          className="flex flex-shrink-0 items-center gap-1.5 rounded-md border border-zinc-200 px-2.5 py-1.5 text-[12.5px] text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
        >
          <ArrowDownUp size={13} />
          {oldestFirst ? 'Oldest' : 'Newest'}
        </button>
      </div>

      {/* Surface filter chips — built from what's actually on the shelf. */}
      {surfacesOnShelf.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-1.5">
          <FilterChip
            label="All"
            active={surfaceFilter === 'all'}
            color="#52525b"
            onClick={() => setSurfaceFilter('all')}
          />
          {surfacesOnShelf.map((s) => (
            <FilterChip
              key={s}
              label={SURFACE_LABEL[s] ?? s}
              active={surfaceFilter === s}
              color={popupAccent(s as CommunitySurface)}
              onClick={() => setSurfaceFilter(s)}
            />
          ))}
        </div>
      )}

      {!bee ? (
        <EmptyCard line="Sign in to see your shelf." />
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-[13px] text-red-600">
          {error}
        </div>
      ) : items === null ? (
        <EmptyCard line="Loading…" />
      ) : items.length === 0 ? (
        <EmptyCard line="Nothing saved yet. The bookmark button on threads, groups, events, and more lands things here." />
      ) : visible.length === 0 ? (
        <EmptyCard line="No saves match — clear the search or pick another surface." />
      ) : (
        <ul className="flex flex-col gap-1.5">
          {visible.map((item) => (
            <li key={item.saveId}>
              <div
                className={cn(
                  'group flex items-start gap-3 rounded-lg border border-zinc-200 bg-white p-3.5 transition-colors',
                  item.url && 'cursor-pointer hover:bg-zinc-50',
                )}
                onClick={() => onOpen(item)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onOpen(item);
                  }
                }}
                role={item.url ? 'button' : undefined}
                tabIndex={item.url ? 0 : undefined}
              >
                <span
                  className="mt-0.5 flex-shrink-0 rounded px-1.5 py-0.5 font-mono text-[9.5px] font-bold uppercase tracking-wider"
                  style={{
                    color: popupAccent(item.surface as CommunitySurface),
                    background: `${popupAccent(item.surface as CommunitySurface)}14`,
                  }}
                  data-size="meta"
                >
                  {SURFACE_LABEL[item.surface] ?? item.surface}
                </span>
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      'text-[14px] leading-snug',
                      item.resolved ? 'text-zinc-900' : 'text-zinc-500',
                    )}
                  >
                    {item.title}
                  </p>
                  <p className="mt-1 font-mono text-[11px] text-zinc-500" data-size="meta">
                    saved {relativeTime(item.savedAt)}
                    {!item.resolved && <span className="ml-2 text-zinc-400">source unavailable</span>}
                  </p>
                </div>
                <span className="flex flex-shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                  {item.url && (
                    <button
                      type="button"
                      aria-label="Copy share link"
                      title={copiedId === item.saveId ? 'Copied!' : 'Copy share link'}
                      onClick={(e) => {
                        e.stopPropagation();
                        void onShare(item);
                      }}
                      className="rounded p-1 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
                    >
                      {copiedId === item.saveId ? (
                        <Check size={15} style={{ color: '#16A34A' }} />
                      ) : (
                        <Link2 size={15} />
                      )}
                    </button>
                  )}
                  <button
                    type="button"
                    aria-label="Remove from shelf"
                    title="Unsave"
                    onClick={(e) => {
                      e.stopPropagation();
                      void onUnsave(item);
                    }}
                    className="rounded p-1 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
                  >
                    <BookmarkMinus size={15} />
                  </button>
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FilterChip({
  label,
  active,
  color,
  onClick,
}: {
  label: string;
  active: boolean;
  color: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className="rounded-full border px-2.5 py-1 text-[11.5px] font-semibold transition-colors"
      style={
        active
          ? { color: '#ffffff', background: color, borderColor: color }
          : { color, borderColor: `${color}55` }
      }
    >
      {label}
    </button>
  );
}

function EmptyCard({ line }: { line: string }) {
  return (
    <div className="rounded-lg border-2 border-dashed border-zinc-200 bg-zinc-50/60 p-10 text-center text-[13px] text-zinc-500">
      {line}
    </div>
  );
}
