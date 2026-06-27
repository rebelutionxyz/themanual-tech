import { eventsSearch, formatEventWhen } from '@/lib/events';
import { listThreadFeed } from '@/lib/forumFeed';
import { groupsSearch } from '@/lib/groups';
import { cn, formatCount } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

// Cross-Astra discovery rail — identical on every community surface.
const INTEL = '#1D9BF0';
const UNITE = '#7C3AED';
const RULE = '#F97316';
const JUSTICE = '#1E40AF';

type RailMode = 'recent' | 'popular';
type ModuleKey = 'intel' | 'unite' | 'rule' | 'justice';

interface Row {
  id: string;
  to: string;
  primary: string;
  secondary: string;
}

interface ModuleDef {
  key: ModuleKey;
  title: string;
  color: string;
  viewAllTo: string;
  defaultMode: RailMode;
  empty: string;
  placeholder?: string;
}

const MODULES: ModuleDef[] = [
  {
    key: 'intel',
    title: 'INTEL',
    color: INTEL,
    viewAllTo: '/intel',
    defaultMode: 'recent',
    empty: 'No posts yet.',
  },
  {
    key: 'unite',
    title: 'UNITE',
    color: UNITE,
    viewAllTo: '/unite',
    defaultMode: 'popular',
    empty: 'No groups yet.',
  },
  {
    key: 'rule',
    title: 'RULE',
    color: RULE,
    viewAllTo: '/rule',
    defaultMode: 'recent',
    empty: 'Nothing on the calendar.',
  },
  {
    key: 'justice',
    title: 'JUSTICE',
    color: JUSTICE,
    viewAllTo: '/realm/justice',
    defaultMode: 'recent',
    empty: '',
    placeholder:
      'The Justice investigation system is under construction. Track the Justice realm in the meantime.',
  },
];

// Lazy per-module load (p_limit=25). Recent → new/recent/newest; Popular → top/members/popular.
async function loadModule(key: ModuleKey, mode: RailMode): Promise<Row[]> {
  if (key === 'intel') {
    const r = await listThreadFeed([], mode === 'recent' ? 'new' : 'top', 25);
    return r.map((t) => ({
      id: t.id,
      to: `/intel/t/${t.id}`,
      primary: t.title,
      secondary: `${t.authorHandle ? `@${t.authorHandle} · ` : ''}${formatCount(t.replyCount)} ${t.replyCount === 1 ? 'reply' : 'replies'}`,
    }));
  }
  if (key === 'unite') {
    const r = await groupsSearch(mode === 'recent' ? 'recent' : 'members', 25);
    return r.map((g) => ({
      id: g.id,
      to: `/unite/${g.slug}`,
      primary: g.name,
      secondary: `${formatCount(g.memberCount)} ${g.memberCount === 1 ? 'member' : 'members'}`,
    }));
  }
  if (key === 'rule') {
    const r = await eventsSearch(mode === 'recent' ? 'newest' : 'popular', 25);
    return r.map((ev) => ({
      id: ev.id,
      to: `/rule/${ev.id}`,
      primary: ev.title,
      secondary: `${formatEventWhen(ev.startsAt, ev.endsAt)} · ${formatCount(ev.goingCount)} going`,
    }));
  }
  return [];
}

/**
 * Right rail — the cross-Astra Overview accordion (pass 19: rail-level header +
 * collapse removed; always full width). The four modules are an ACCORDION: one
 * open at a time; the open module fills the remaining height and scrolls
 * internally, the rest stay as collapsed headers. Lists fetch lazily (25) on
 * expand. Hidden on mobile (<md); a real side column on tablet + desktop.
 */
export function RightRail() {
  const [open, setOpen] = useState<ModuleKey | null>('intel');

  return (
    <aside className="hidden h-full w-[330px] flex-shrink-0 flex-col border-l border-zinc-200 md:flex">
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden p-2">
        {MODULES.map((def) => (
          <RailModule
            key={def.key}
            def={def}
            open={open === def.key}
            onToggle={() => setOpen(open === def.key ? null : def.key)}
            onHover={() => setOpen(def.key)}
          />
        ))}
      </div>
    </aside>
  );
}

function RailModule({
  def,
  open,
  onToggle,
  onHover,
}: {
  def: ModuleDef;
  open: boolean;
  onToggle: () => void;
  onHover: () => void;
}) {
  const [mode, setMode] = useState<RailMode>(def.defaultMode);
  const [rows, setRows] = useState<Row[] | null>(null);

  // Lazy fetch on expand (and when the Recent/Popular toggle changes while open).
  useEffect(() => {
    if (!open || def.key === 'justice') return;
    let cancelled = false;
    setRows(null);
    loadModule(def.key, mode)
      .then((r) => !cancelled && setRows(r))
      .catch(() => !cancelled && setRows([]));
    return () => {
      cancelled = true;
    };
  }, [open, mode, def.key]);

  return (
    <section
      onMouseEnter={onHover}
      className={cn(
        'flex flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white',
        open ? 'min-h-0 flex-1' : 'flex-shrink-0',
      )}
      style={{ borderLeft: `3px solid ${def.color}` }}
    >
      <header className="flex flex-shrink-0 items-center justify-between gap-2 px-3 py-2">
        <button
          type="button"
          onClick={onToggle}
          className="font-display text-[14px] font-bold tracking-wide"
          style={{ color: def.color }}
        >
          {def.title}
        </button>
        <div className="flex items-center gap-1">
          {def.key !== 'justice' && (
            <>
              <ModeChip
                active={mode === 'recent'}
                color={def.color}
                onClick={() => setMode('recent')}
              >
                Recent
              </ModeChip>
              <ModeChip
                active={mode === 'popular'}
                color={def.color}
                onClick={() => setMode('popular')}
              >
                Popular
              </ModeChip>
            </>
          )}
          <Link
            to={def.viewAllTo}
            className="ml-1 text-[11px] font-medium hover:underline"
            style={{ color: def.color }}
          >
            View all
          </Link>
        </div>
      </header>

      {open && (
        <div className="min-h-0 flex-1 overflow-y-auto border-t border-zinc-100">
          {def.key === 'justice' ? (
            <p className="px-3 py-3 text-[12px] leading-relaxed text-zinc-500">{def.placeholder}</p>
          ) : rows === null ? (
            <p className="px-3 py-3 text-[12px] text-zinc-400">Loading…</p>
          ) : rows.length === 0 ? (
            <p className="px-3 py-3 text-[12px] text-zinc-400">{def.empty}</p>
          ) : (
            rows.map((row) => (
              <Link
                key={row.id}
                to={row.to}
                className="block px-3 py-2 transition-colors hover:bg-zinc-50"
              >
                <p className="line-clamp-2 text-[13px] font-medium leading-snug text-zinc-900">
                  {row.primary}
                </p>
                <p className="mt-0.5 text-[11px] text-zinc-500">{row.secondary}</p>
              </Link>
            ))
          )}
        </div>
      )}
    </section>
  );
}

function ModeChip({
  active,
  color,
  onClick,
  children,
}: {
  active: boolean;
  color: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full px-2 py-0.5 text-[10.5px] font-semibold transition-colors',
        !active && 'text-zinc-500 hover:bg-zinc-100',
      )}
      style={active ? { color, background: `${color}18` } : undefined}
    >
      {children}
    </button>
  );
}
