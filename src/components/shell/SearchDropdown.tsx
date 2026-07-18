import {
  type CommunitySurface,
  SURFACE_LABEL,
  popupAccent,
} from '@/components/shell/popupRegistry';
import { type QuickHit, quickSearch } from '@/lib/quickSearch';
import { Search } from 'lucide-react';
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
      quickSearch(q)
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
  }, [term]);

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
      <label className="flex items-center gap-2 border-b border-zinc-100 px-3 py-2.5">
        <Search size={15} className="flex-shrink-0 text-zinc-400" />
        <input
          ref={inputRef}
          type="text"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Search the comb…"
          aria-label="Search"
          className="w-full bg-transparent text-[13.5px] text-zinc-800 outline-none placeholder:text-zinc-400"
        />
      </label>

      <div className="max-h-[50vh] overflow-y-auto py-1">
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

function Hint({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-3 py-2 font-mono text-[11px] text-zinc-400" data-size="meta">
      {children}
    </p>
  );
}
