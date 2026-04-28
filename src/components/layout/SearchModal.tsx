import { useState, useRef, useEffect } from 'react';
import { Search, X, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

type SearchScope = 'everything' | 'threads' | 'atoms' | 'groups' | 'people';

const SCOPE_LABELS: Record<SearchScope, string> = {
  everything: 'Everything',
  threads: 'Threads',
  atoms: 'Atoms',
  groups: 'Groups',
  people: 'People',
};

interface SearchModalProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Search modal — opens from header search icon.
 * Consistent behavior across mobile and desktop:
 * - Icon click opens overlay
 * - Top-center input with scope chip
 * - Esc closes
 * - Click outside closes
 * - Results appear below input (placeholder for now)
 */
export function SearchModal({ open, onClose }: SearchModalProps) {
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<SearchScope>('everything');
  const [scopeOpen, setScopeOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Autofocus input when modal opens
  useEffect(() => {
    if (open) {
      // Small delay so input is mounted
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
      // Reset state on close
      setQuery('');
      setScopeOpen(false);
  }, [open]);

  // ESC closes
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Click outside panel closes
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!panelRef.current?.contains(e.target as Node)) {
        onClose();
      }
    };
    // delay so triggering click doesn't immediately close
    const t = setTimeout(() => {
      document.addEventListener('mousedown', onDown);
    }, 50);
    return () => {
      clearTimeout(t);
      document.removeEventListener('mousedown', onDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center px-4 pt-20 md:pt-24"
      aria-modal="true"
      // biome-ignore lint/a11y/useSemanticElements: keeping div+role=dialog for manual focus management and animation control; native <dialog> would require refactoring focus traps
      role="dialog"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className="relative w-full max-w-xl animate-slide-in-right rounded-lg border border-border bg-bg-elevated shadow-2xl"
      >
        {/* Input row */}
        <div className="flex items-center gap-1 border-b border-border p-3">
          <Search size={16} className="ml-1 flex-shrink-0 text-text-muted" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search threads, atoms, groups, people…"
            className="min-w-0 flex-1 bg-transparent px-2 text-text placeholder:text-text-muted focus:outline-none"
            style={{ fontSize: '15px' }}
          />

          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
              aria-label="Clear"
              className="flex h-7 w-7 items-center justify-center rounded text-text-muted hover:bg-bg hover:text-text"
            >
              <X size={14} />
            </button>
          )}

          {/* Scope chip */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setScopeOpen((o) => !o)}
              className="flex items-center gap-1 rounded bg-bg px-2.5 py-1.5 text-text-silver hover:text-text"
              style={{ fontSize: '12px' }}
              aria-label="Search scope"
            >
              <span>{SCOPE_LABELS[scope]}</span>
              <ChevronDown size={12} />
            </button>

            {scopeOpen && (
              <div className="absolute right-0 top-9 z-10 w-40 overflow-hidden rounded-md border border-border bg-bg shadow-lg">
                {(Object.keys(SCOPE_LABELS) as SearchScope[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      setScope(s);
                      setScopeOpen(false);
                      inputRef.current?.focus();
                    }}
                    className={cn(
                      'block w-full px-3 py-2 text-left text-text-silver hover:bg-bg-elevated hover:text-text',
                      scope === s && 'bg-bg-elevated text-text',
                    )}
                    style={{ fontSize: '12px' }}
                  >
                    {SCOPE_LABELS[s]}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Close */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close search"
            className="flex h-7 w-7 items-center justify-center rounded text-text-muted hover:bg-bg hover:text-text"
          >
            <X size={14} />
          </button>
        </div>

        {/* Results area */}
        <div className="p-4">
          {!query.trim() && (
            <div className="text-center">
              <p
                className="font-mono text-text-muted"
                style={{ fontSize: '11px' }}
                data-size="meta"
              >
                Type to search the {SCOPE_LABELS[scope].toLowerCase()} across HoneyComb
              </p>
              <p
                className="mt-2 font-mono text-text-dim"
                style={{ fontSize: '10.5px' }}
                data-size="meta"
              >
                Press <kbd className="rounded border border-border bg-bg px-1 py-0.5">Esc</kbd> to close
              </p>
            </div>
          )}

          {query.trim().length > 0 && query.trim().length < 2 && (
            <p
              className="text-center font-mono text-text-muted"
              style={{ fontSize: '12px' }}
              data-size="meta"
            >
              Keep typing…
            </p>
          )}

          {query.trim().length >= 2 && (
            <div>
              <p
                className="font-mono text-text-muted"
                style={{ fontSize: '11px' }}
                data-size="meta"
              >
                Search not yet wired — coming soon.
              </p>
              <p
                className="mt-2 text-text-silver"
                style={{ fontSize: '13px' }}
              >
                Scope: <span className="text-text">{SCOPE_LABELS[scope]}</span>{' '}
                · Query: <span className="font-mono text-text">"{query}"</span>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
