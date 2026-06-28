import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Radio, Search, Tv, X } from 'lucide-react';
import { pulseSearch, type PulseSearchResult } from '@/lib/pulse';
import { formatCount } from '@/lib/utils';
import { FollowButton } from './FollowButton';

/**
 * FN search — debounced query against pulse_search. Mixed results branch on
 * `kind`: channels link to the channel route + carry a Follow toggle;
 * broadcasts link to the watch route.
 */
export function PulseSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PulseSearchResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults(null);
      setError(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    const t = window.setTimeout(() => {
      pulseSearch(q)
        .then((res) => {
          if (!cancelled) {
            setResults(res);
            setLoading(false);
          }
        })
        .catch((err: unknown) => {
          if (!cancelled) {
            setError(err instanceof Error ? err.message : 'Search failed');
            setLoading(false);
          }
        });
    }, 300);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [query]);

  return (
    <div>
      <div className="relative">
        <Search
          size={16}
          className="-translate-y-1/2 pointer-events-none absolute top-1/2 left-3 text-zinc-400"
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search channels & broadcasts"
          className="w-full rounded-lg border border-zinc-200 bg-white py-2.5 pr-9 pl-9 text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none"
          style={{ fontSize: '14px' }}
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            aria-label="Clear search"
            className="-translate-y-1/2 absolute top-1/2 right-3 text-zinc-400 hover:text-zinc-600"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {query.trim() && (
        <div className="mt-2 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
          {loading && (
            <div className="px-4 py-3 font-mono text-zinc-500" style={{ fontSize: '12px' }}>
              Searching…
            </div>
          )}
          {error && !loading && (
            <div className="px-4 py-3 font-mono text-red-600" style={{ fontSize: '12px' }}>
              {error}
            </div>
          )}
          {!loading && !error && results && results.length === 0 && (
            <div className="px-4 py-3 font-mono text-zinc-500" style={{ fontSize: '12px' }}>
              No matches for “{query.trim()}”.
            </div>
          )}
          {!loading && !error && results && results.length > 0 && (
            <ul className="divide-y divide-zinc-100">
              {results.map((r) => (
                <SearchRow key={`${r.kind}-${r.id}`} result={r} />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function SearchRow({ result }: { result: PulseSearchResult }) {
  if (result.kind === 'channel') {
    return (
      <li>
        <div className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-zinc-50">
          <Link
            to={`/pulse/c/${result.handle ?? result.id}`}
            className="flex min-w-0 flex-1 items-center gap-3"
          >
            <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-500">
              <Tv size={15} />
            </span>
            <div className="min-w-0">
              <div className="truncate text-zinc-900" style={{ fontSize: '14px' }}>
                {result.channelName || result.title}
              </div>
              <div
                className="truncate font-mono text-zinc-500"
                style={{ fontSize: '11px' }}
                data-size="meta"
              >
                {result.handle ? `@${result.handle}` : 'Channel'} ·{' '}
                {formatCount(result.followerCount)} followers
              </div>
            </div>
          </Link>
          <FollowButton channelId={result.id} />
        </div>
      </li>
    );
  }

  return (
    <li>
      <Link
        to={`/pulse/watch/${result.id}`}
        className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-zinc-50"
      >
        <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-500">
          <Radio size={15} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-zinc-900" style={{ fontSize: '14px' }}>
            {result.title}
          </div>
          <div
            className="truncate font-mono text-zinc-500"
            style={{ fontSize: '11px' }}
            data-size="meta"
          >
            {result.channelName ? `${result.channelName} · ` : ''}
            {result.status || 'broadcast'}
            {result.viewCount > 0 && <> · {formatCount(result.viewCount)} views</>}
          </div>
        </div>
      </Link>
    </li>
  );
}
