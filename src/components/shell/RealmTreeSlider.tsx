import { type RealmTreeRow, fetchRealmChildren } from '@/lib/realmTree';
import { cn } from '@/lib/utils';
import { useLensStore } from '@/stores/useLensStore';
import { useRealmTreeStore } from '@/stores/useRealmTreeStore';
import { REALM_COLOR_FALLBACK, useRealmColors } from '@/stores/useRealmColors';
import { Check, ChevronRight, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

/**
 * White-Rabbit realm navigator: browses the FULL taxonomy ONE LEVEL AT A
 * TIME (lazy). Root realms load on first open; each node fetches its direct
 * children via realm_children(pathParts) when expanded. A node is
 * expandable iff NOT isLeaf.
 *
 * MULTI-SELECT: clicking a node label toggles it in/out of the lens selection
 * (useLensStore.selectedRealms); the single-prefix feed `path` derives from the
 * FIRST selection (interim), and the full set shows as chips above the bottom
 * toolbar.
 *
 * 2026-07-18 (Butch): the tree now renders in a TOP-TOOLBAR DROPDOWN (LensRow
 * → Popup → RealmTreeContent), matching Location/Time. The right-column
 * slide-over below is retired but kept intact — CommunityShell gates it off.
 */
const keyOf = (parts: string[]) => parts.join('|');

/** Max child rows rendered per node before the "Show all" reveal. */
const CHILD_CAP = 100;

/** Root realms are stable per session — fetched once, shared across opens. */
let rootsCache: RealmTreeRow[] | null = null;

/**
 * The tree itself — store-driven, lazy, host-agnostic. Rendered by the
 * LensRow Realm dropdown (primary) and the retired slide-over (gated off).
 */
export function RealmTreeContent() {
  const colors = useRealmColors((s) => s.colors) as Record<string, string>;
  const selectedRealms = useLensStore((s) => s.selectedRealms);
  const toggleRealm = useLensStore((s) => s.toggleRealm);
  const clearRealms = useLensStore((s) => s.clearRealms);

  const [roots, setRoots] = useState<RealmTreeRow[] | null>(rootsCache);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (rootsCache) return;
    setLoading(true);
    fetchRealmChildren([])
      .then((r) => {
        rootsCache = r;
        setRoots(r);
        setLoading(false);
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : 'Failed to load');
        setLoading(false);
      });
  }, []);

  const selectedKeys = useMemo(
    () => new Set(selectedRealms.map((r) => r.key)),
    [selectedRealms],
  );
  const colorFor = (realmId: string) => colors[realmId] ?? REALM_COLOR_FALLBACK;
  const noneSelected = selectedRealms.length === 0;

  return (
    <div className="py-1">
      {/* Clear / all-realms affordance — resets the whole selection. */}
      <button
        type="button"
        onClick={() => clearRealms()}
        className={cn(
          'flex w-full items-center gap-1.5 py-1.5 pr-2 pl-3 text-left transition-colors hover:bg-zinc-50',
          noneSelected ? 'font-semibold text-zinc-900' : 'text-zinc-600',
        )}
        style={{ fontSize: '13px' }}
      >
        <span className="inline-block w-[13px] flex-shrink-0" aria-hidden="true" />
        All realms
      </button>

      {loading && <Note depth={0}>Loading…</Note>}
      {error && !loading && (
        <Note depth={0} tone="error">
          {error}
        </Note>
      )}
      {!loading && !error && roots?.length === 0 && <Note depth={0}>No realms yet.</Note>}
      {!loading &&
        !error &&
        roots?.map((row) => (
          <TreeRow
            key={row.id}
            row={row}
            depth={0}
            colorFor={colorFor}
            selectedKeys={selectedKeys}
            onToggle={toggleRealm}
          />
        ))}
    </div>
  );
}

/**
 * RETIRED right-column slide-over host (2026-07-18) — kept intact and gated
 * off in CommunityShell; flip its SHOW_REALM_SLIDEOVER to restore.
 */
export function RealmTreeSlider() {
  const open = useRealmTreeStore((s) => s.open);
  const close = useRealmTreeStore((s) => s.close);
  const selectedRealms = useLensStore((s) => s.selectedRealms);

  const panelRef = useRef<HTMLDivElement>(null);
  const leaveTimer = useRef<number | undefined>(undefined);

  // Esc + click-outside — active only while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node | null;
      if (t && panelRef.current?.contains(t)) return;
      if (t instanceof Element && t.closest('[data-rabbit-toggle]')) return;
      close();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDown);
    };
  }, [open, close]);

  // Clear any pending leave-timer on unmount.
  useEffect(() => () => window.clearTimeout(leaveTimer.current), []);

  return (
    <aside
      ref={panelRef}
      aria-hidden={!open}
      aria-label="Realms"
      onMouseLeave={() => {
        if (open) leaveTimer.current = window.setTimeout(close, 150);
      }}
      onMouseEnter={() => window.clearTimeout(leaveTimer.current)}
      className={cn(
        'absolute inset-y-0 right-0 z-30 flex w-72 max-w-[85%] flex-col border-l border-zinc-200 bg-white shadow-xl transition-transform duration-200 ease-out',
        open ? 'translate-x-0' : 'pointer-events-none translate-x-full',
      )}
    >
      <div className="flex flex-shrink-0 items-center justify-between border-b border-zinc-200 px-3 py-2">
        <span
          className="font-mono uppercase tracking-wider text-zinc-500"
          style={{ fontSize: '11px' }}
          data-size="meta"
        >
          Realms{selectedRealms.length > 0 ? ` · ${selectedRealms.length}` : ''}
        </span>
        <button
          type="button"
          onClick={close}
          aria-label="Close realms"
          className="flex h-6 w-6 items-center justify-center rounded text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
        >
          <X size={14} />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">{open && <RealmTreeContent />}</div>
    </aside>
  );
}

function Note({
  depth,
  tone,
  children,
}: {
  depth: number;
  tone?: 'error';
  children: React.ReactNode;
}) {
  return (
    <p
      className={cn('py-1.5 font-mono', tone === 'error' ? 'text-red-600' : 'text-zinc-400')}
      style={{ fontSize: '12px', paddingLeft: 12 + depth * 14, paddingRight: 8 }}
      data-size="meta"
    >
      {children}
    </p>
  );
}

function TreeRow({
  row,
  depth,
  colorFor,
  selectedKeys,
  onToggle,
}: {
  row: RealmTreeRow;
  depth: number;
  colorFor: (realmId: string) => string;
  selectedKeys: Set<string>;
  onToggle: (pathParts: string[]) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [children, setChildren] = useState<RealmTreeRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Cap rows per node — some branches have 1,000+ direct children (e.g. a
  // state's cities). Render the first CAP, reveal the rest on demand. Per-node
  // so each expanded branch caps independently.
  const [showAll, setShowAll] = useState(false);

  const expandable = !row.isLeaf; // full taxonomy → is_leaf is authoritative
  const color = colorFor(row.realmId);
  const selected = selectedKeys.has(keyOf(row.pathParts));

  // Lazy-load this node's direct children once (idempotent).
  function loadChildren() {
    if (children !== null || loading) return;
    setLoading(true);
    fetchRealmChildren(row.pathParts)
      .then((kids) => {
        setChildren(kids);
        setLoading(false);
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : 'Failed to load');
        setLoading(false);
      });
  }

  function toggleExpand() {
    const next = !expanded;
    setExpanded(next);
    if (next) loadChildren();
  }

  return (
    <>
      <div
        className={cn(
          'flex items-stretch transition-colors hover:bg-zinc-50',
          selected && 'bg-zinc-100',
        )}
        style={{ borderLeft: `2px solid ${color}40` }}
      >
        {expandable ? (
          <button
            type="button"
            onClick={toggleExpand}
            aria-label={expanded ? 'Collapse' : 'Expand'}
            aria-expanded={expanded}
            className="flex flex-shrink-0 items-center justify-center py-1.5 pl-1 text-zinc-400 hover:text-zinc-700"
            style={{ marginLeft: depth * 14 }}
          >
            <ChevronRight
              size={13}
              className={cn('transition-transform', expanded && 'rotate-90')}
            />
          </button>
        ) : (
          <span
            className="inline-block flex-shrink-0"
            style={{ width: 13, marginLeft: depth * 14 + 4 }}
            aria-hidden="true"
          />
        )}
        {/* Label = TOGGLE this node in/out of the realm selection (multi-select).
            Expandable nodes also reveal their children on select. */}
        <button
          type="button"
          onClick={() => {
            onToggle(row.pathParts);
            if (expandable && !expanded) {
              setExpanded(true);
              loadChildren();
            }
          }}
          className="flex min-w-0 flex-1 items-center gap-1.5 py-1.5 pr-2 pl-1.5 text-left"
          style={{ fontSize: '13px' }}
          aria-pressed={selected}
        >
          <span
            className={cn(
              'min-w-0 flex-1 truncate',
              selected
                ? 'font-semibold text-zinc-900'
                : depth === 0
                  ? 'font-medium text-zinc-800'
                  : 'text-zinc-600',
            )}
          >
            {row.name}
          </span>
          {selected && (
            <Check size={13} className="flex-shrink-0" style={{ color }} aria-hidden="true" />
          )}
        </button>
      </div>

      {expanded && (
        <>
          {loading && <Note depth={depth + 1}>Loading…</Note>}
          {error && !loading && (
            <Note depth={depth + 1} tone="error">
              {error}
            </Note>
          )}
          {!loading &&
            !error &&
            (showAll ? children : children?.slice(0, CHILD_CAP))?.map((child) => (
              <TreeRow
                key={child.id}
                row={child}
                depth={depth + 1}
                colorFor={colorFor}
                selectedKeys={selectedKeys}
                onToggle={onToggle}
              />
            ))}
          {!loading && !error && !showAll && (children?.length ?? 0) > CHILD_CAP && (
            <button
              type="button"
              onClick={() => setShowAll(true)}
              className="w-full py-1.5 pr-2 text-left font-medium text-zinc-500 transition-colors hover:bg-zinc-50 hover:text-zinc-700"
              style={{ fontSize: '12px', paddingLeft: 12 + (depth + 1) * 14 }}
            >
              Show all {children?.length}
            </button>
          )}
        </>
      )}
    </>
  );
}
