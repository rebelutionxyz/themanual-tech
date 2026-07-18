import {
  COMMUNITY_SURFACES,
  type CommunitySurface,
  SURFACE_LABEL,
  popupAccent,
} from '@/components/shell/popupRegistry';
import { type QuickHit, quickSearch } from '@/lib/quickSearch';
import { cn } from '@/lib/utils';
import { ChevronDown, Search } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Search panel for the top-toolbar dropdown (Butch 2026-07-18): the input
 * AND the results live inside the dropdown — type, see hits across every
 * surface, click one to jump there. Replaces the old inline bar-expanding
 * search (which filtered the feed instead of showing results).
 */
export function SearchPanel({
  standingOn,
  onNavigate,
}: {
  /** Surface the Bee is on — its results sort first. */
  standingOn: string;
  /** Called after a hit is picked (the dropdown closes itself). */
  onNavigate: () => void;
}) {
  const navigate = useNavigate();
  const [term, setTerm] = useState('');
  // Astra filter — 'all' or one surface (like the Saved/Notifications popups).
  const [surf, setSurf] = useState<string>('all');
  const [hits, setHits] = useState<QuickHit[] | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Debounced query — 250ms after the last keystroke, min 2 chars.
  useEffect(() => {
    const q = term.trim();
    if (q.length < 2) {
      setHits(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const t = window.setTimeout(() => {
      quickSearch(q, surf === 'all' ? undefined : surf)
        .then((h) => {
          setHits(h);
          setLoading(false);
        })
        .catch(() => {
          setHits([]);
          setLoading(false);
        });
    }, 250);
    return () => window.clearTimeout(t);
  }, [term, surf]);

  const ordered = (hits ?? []).slice().sort((a, b) => {
    const aHome = a.surface === standingOn ? 0 : 1;
    const bHome = b.surface === standingOn ? 0 : 1;
    return aHome - bHome;
  });

  function pick(hit: QuickHit) {
    navigate(hit.url);
    onNavigate();
  }

  return (
    <div className="w-full rounded-md bg-white">
      <div className="flex items-center gap-2 border-b border-zinc-100 px-3 py-2.5">
        <Search size={15} className="flex-shrink-0 text-zinc-400" />
        <input
          ref={inputRef}
          type="text"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Search anything…"
          aria-label="Search"
          className="w-full bg-transparent text-[13.5px] text-zinc-800 outline-none placeholder:text-zinc-400"
        />
        <AstraFilter value={surf} onChange={setSurf} />
      </div>

      {/* min-height keeps the panel DEEP enough that the Astra filter's menu
          (8 rows, anchored to the input row) never clips against the popup's
          overflow-hidden shell (Butch 2026-07-18). */}
      <div className="max-h-[50vh] min-h-[280px] overflow-y-auto py-1">
        {term.trim().length < 2 ? (
          <Hint>Type at least 2 characters…</Hint>
        ) : loading && hits === null ? (
          <Hint>Searching…</Hint>
        ) : ordered.length === 0 ? (
          <Hint>No matches across the comb.</Hint>
        ) : (
          ordered.map((hit) => {
            const accent = popupAccent(hit.surface as CommunitySurface);
            return (
              <button
                key={`${hit.surface}:${hit.url}`}
                type="button"
                onClick={() => pick(hit)}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left transition-colors hover:bg-zinc-50"
              >
                <span
                  className="flex-shrink-0 rounded px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider"
                  style={{ color: accent, background: `${accent}14` }}
                  data-size="meta"
                >
                  {SURFACE_LABEL[hit.surface as CommunitySurface] ?? hit.surface}
                </span>
                <span className="min-w-0 flex-1 truncate text-[13px] text-zinc-800">
                  {hit.title}
                </span>
              </button>
            );
          })
        )}
        {loading && hits !== null && <Hint>Updating…</Hint>}
      </div>
    </div>
  );
}

/** Compact Astra filter — like the popup scope dropdown, sized for the input row. */
function AstraFilter({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const label = value === 'all' ? 'All' : (SURFACE_LABEL[value as CommunitySurface] ?? value);
  const color = value === 'all' ? '#52525b' : popupAccent(value as CommunitySurface);

  return (
    <div ref={ref} className="relative flex-shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="Search within an Astra"
        className="flex items-center gap-1 rounded-md border border-zinc-200 px-2 py-1 text-[11px] font-semibold transition-colors hover:bg-zinc-50"
      >
        <span style={{ color }}>{label}</span>
        <ChevronDown
          size={12}
          className={cn('text-zinc-400 transition-transform', open && 'rotate-180')}
        />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-30 mt-1 w-36 overflow-hidden rounded-lg border border-zinc-200 bg-white py-1 shadow-lg">
          <FilterRow
            label="All Astras"
            color="#52525b"
            active={value === 'all'}
            onClick={() => {
              onChange('all');
              setOpen(false);
            }}
          />
          {COMMUNITY_SURFACES.map((s) => (
            <FilterRow
              key={s}
              label={SURFACE_LABEL[s]}
              color={popupAccent(s)}
              active={value === s}
              onClick={() => {
                onChange(s);
                setOpen(false);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FilterRow({
  label,
  color,
  active,
  onClick,
}: {
  label: string;
  color: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] transition-colors hover:bg-zinc-50"
      style={{ color, fontWeight: active ? 700 : 500, background: active ? `${color}14` : undefined }}
    >
      <span
        className="h-1.5 w-1.5 flex-shrink-0 rounded-full"
        style={{ background: color }}
        aria-hidden="true"
      />
      <span className="min-w-0 flex-1 truncate">{label}</span>
    </button>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-3 py-2 font-mono text-[11px] text-zinc-400" data-size="meta">
      {children}
    </p>
  );
}
