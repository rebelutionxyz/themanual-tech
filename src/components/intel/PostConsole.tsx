import { useAuth } from '@/lib/auth';
import { type AtomHit, createIntelPost, searchAtoms } from '@/lib/intel';
import { cn } from '@/lib/utils';
import { Rabbit, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const INTEL_COLOR = '#1D9BF0';

/**
 * X-style post console (pass 15/17): avatar · "What's happening?" field · Post.
 * Plus the Rabbit — a search-to-tag atom picker: type → atom_search → click a
 * hit to attach it as a tag chip. On submit the first atom anchors the thread
 * and the rest are tagged. Light theme.
 */
export function PostConsole() {
  const { bee } = useAuth();
  const navigate = useNavigate();
  const [text, setText] = useState('');
  const [atoms, setAtoms] = useState<AtomHit[]>([]);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canPost = Boolean(bee) && text.trim().length > 0 && !posting;

  async function submit() {
    if (!canPost) return;
    setPosting(true);
    setError(null);
    try {
      const id = await createIntelPost(
        text,
        atoms.map((a) => a.id),
      );
      window.dispatchEvent(new CustomEvent('intel-counts-refresh'));
      setText('');
      setAtoms([]);
      if (id) navigate(`/intel/t/${id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not post. Try again.');
    } finally {
      setPosting(false);
    }
  }

  function addAtom(a: AtomHit) {
    setAtoms((prev) => (prev.some((x) => x.id === a.id) ? prev : [...prev, a]));
  }
  function removeAtom(id: string) {
    setAtoms((prev) => prev.filter((a) => a.id !== id));
  }

  return (
    <div className="mb-4 rounded-xl border border-zinc-200 bg-white p-3">
      <div className="flex gap-3">
        <span
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full font-display text-sm font-semibold text-white"
          style={{ background: INTEL_COLOR }}
          aria-hidden="true"
        >
          {bee ? bee.handle.slice(0, 1).toUpperCase() : '?'}
        </span>
        <div className="min-w-0 flex-1">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                e.preventDefault();
                void submit();
              }
            }}
            disabled={!bee || posting}
            rows={2}
            placeholder={bee ? "What's happening?" : 'Sign in to post'}
            aria-label="What's happening?"
            className="w-full resize-none bg-transparent text-[15px] leading-relaxed text-zinc-900 placeholder:text-zinc-400 focus:outline-none disabled:cursor-not-allowed"
          />

          {atoms.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1.5">
              {atoms.map((a) => (
                <span
                  key={a.id}
                  className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[12px]"
                  style={{
                    borderColor: `${INTEL_COLOR}55`,
                    color: INTEL_COLOR,
                    background: `${INTEL_COLOR}10`,
                  }}
                >
                  {a.name}
                  <button
                    type="button"
                    onClick={() => removeAtom(a.id)}
                    aria-label={`Remove ${a.name}`}
                    className="rounded-full p-0.5 hover:bg-black/5"
                  >
                    <X size={11} />
                  </button>
                </span>
              ))}
            </div>
          )}

          {error && <p className="mt-1 text-[12.5px] text-red-600">{error}</p>}

          <div className="mt-2 flex items-center justify-between border-t border-zinc-100 pt-2">
            <RabbitPicker onPick={addAtom} disabled={!bee} />
            <button
              type="button"
              onClick={submit}
              disabled={!canPost}
              className="rounded-full px-4 py-1.5 text-[13.5px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              style={{ background: INTEL_COLOR }}
            >
              {posting ? 'Posting…' : 'Post'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** The Rabbit — opens a search field; debounced atom_search; click a hit to tag. */
function RabbitPicker({ onPick, disabled }: { onPick: (a: AtomHit) => void; disabled: boolean }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<AtomHit[]>([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounced search (200ms, min 2 chars).
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    let alive = true;
    const t = setTimeout(async () => {
      const hits = await searchAtoms(q, 20);
      if (!alive) return;
      setResults(hits);
      setLoading(false);
    }, 200);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [query]);

  // Focus the search field when the picker opens.
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={disabled}
        title="Tag a Manual atom"
        aria-label="Tag a Manual atom"
        className={cn(
          'flex h-8 w-8 items-center justify-center rounded-full transition-colors disabled:opacity-40',
          open ? 'bg-zinc-100' : 'hover:bg-zinc-100',
        )}
        style={{ color: INTEL_COLOR }}
      >
        <Rabbit size={18} />
      </button>

      {open && (
        <div className="absolute bottom-full left-0 z-50 mb-2 w-72 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl">
          <div className="border-b border-zinc-100 p-2">
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search atoms to tag…"
              className="w-full rounded-md bg-zinc-50 px-2.5 py-1.5 text-[13px] text-zinc-900 placeholder:text-zinc-400 focus:outline-none"
            />
          </div>
          <div className="max-h-64 overflow-y-auto">
            {query.trim().length < 2 ? (
              <p className="px-3 py-3 text-[12px] text-zinc-400">Type at least 2 characters.</p>
            ) : loading ? (
              <p className="px-3 py-3 text-[12px] text-zinc-400">Searching…</p>
            ) : results.length === 0 ? (
              <p className="px-3 py-3 text-[12px] text-zinc-400">No atoms found.</p>
            ) : (
              results.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => {
                    onPick(a);
                    setQuery('');
                    setOpen(false);
                  }}
                  className="flex w-full flex-col items-start px-3 py-2 text-left transition-colors hover:bg-zinc-50"
                >
                  <span className="text-[13px] font-medium text-zinc-900">{a.name}</span>
                  <span className="text-[11px] text-zinc-500">
                    {a.realmName}
                    {a.pathParts.length > 1 ? ` · ${a.pathParts.slice(0, -1).join(' › ')}` : ''}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
