import { useEffect, useMemo, useState } from 'react';
import { ShoppingBag } from 'lucide-react';
import {
  type BazaarCategory,
  type BazaarListing,
  type BazaarSort,
  bazaarBrowse,
  bazaarCategories,
  bazaarSearch,
} from '@/lib/bazaar';
import { useLensStore } from '@/stores/useLensStore';
import { BAZAAR_ACCENT, ListingCard } from '@/components/bazaar/cards';

const CONDITIONS = ['new', 'used', 'service', 'digital'];
const LISTING_TYPES = ['offer']; // Phase-1: offer only
const SORTS: { value: BazaarSort; label: string }[] = [
  { value: 'recent', label: 'Recent' },
  { value: 'price_low', label: 'Price: Low → High' },
  { value: 'price_high', label: 'Price: High → Low' },
];

const SKELETON_KEYS = ['sk0', 'sk1', 'sk2', 'sk3', 'sk4', 'sk5', 'sk6', 'sk7'];

export function BazaarBrowse() {
  // Astra-local search lens (shell Search → bazaar_search), same pattern as INTEL.
  const searchTerm = useLensStore((s) => s.searchTerm);
  const searching = searchTerm.trim().length >= 2;

  const [listingType, setListingType] = useState('');
  const [condition, setCondition] = useState('');
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState<BazaarSort>('recent');

  const [listings, setListings] = useState<BazaarListing[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Category options come from the spine taxonomy (bazaar_categories_list).
  const [categories, setCategories] = useState<BazaarCategory[]>([]);

  // Grouped, leaf-only options preserving the RPC's pre-sorted (first-seen)
  // group order. Group label = department at depth 6, else bucket.
  const categoryGroups = useMemo(() => {
    const groups: { label: string; options: { id: string; name: string }[] }[] = [];
    const byLabel = new Map<string, { label: string; options: { id: string; name: string }[] }>();
    for (const c of categories) {
      if (!c.isLeaf) continue;
      const label = c.depth === 6 ? c.department : c.bucket;
      let group = byLabel.get(label);
      if (!group) {
        group = { label, options: [] };
        byLabel.set(label, group);
        groups.push(group);
      }
      group.options.push({ id: c.id, name: c.name });
    }
    return groups;
  }, [categories]);

  const filterKey = `${listingType}|${condition}|${category}|${sort}`;

  // Load the category taxonomy once.
  useEffect(() => {
    let cancelled = false;
    bazaarCategories()
      .then((c) => !cancelled && setCategories(c))
      .catch(() => {
        /* non-fatal — Category filter just shows "All categories" */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: filterKey serializes the filter state; depending on it avoids refetch churn
  useEffect(() => {
    let cancelled = false;
    setListings(null);
    setError(null);
    const promise = searching
      ? bazaarSearch(searchTerm)
      : bazaarBrowse({
          listingType: listingType || null,
          condition: condition || null,
          category: category || null,
          sort,
        });
    promise
      .then((rows) => {
        if (!cancelled) setListings(rows);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load offers');
      });
    return () => {
      cancelled = true;
    };
  }, [searching, searchTerm, filterKey]);

  return (
    <div className="mx-auto max-w-6xl px-5 py-7 md:px-8">
      <BazaarHeader />

      {searching ? (
        <div
          className="mt-6 flex items-center justify-between gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2"
          style={{ fontSize: '13px' }}
        >
          <span className="min-w-0 truncate text-zinc-700">
            Searching offers: <span className="font-semibold text-zinc-900">“{searchTerm.trim()}”</span>
          </span>
        </div>
      ) : (
        <FilterBar
          listingType={listingType}
          onListingType={setListingType}
          condition={condition}
          onCondition={setCondition}
          category={category}
          onCategory={setCategory}
          categoryGroups={categoryGroups}
          sort={sort}
          onSort={setSort}
        />
      )}

      <div className="mt-5">
        {error ? (
          <EmptyState tone="error">{error}</EmptyState>
        ) : listings === null ? (
          <Grid>
            {SKELETON_KEYS.map((k) => (
              <div
                key={k}
                className="overflow-hidden rounded-lg border border-zinc-200 bg-white"
              >
                <div className="aspect-square w-full animate-pulse bg-zinc-100" />
                <div className="space-y-2 p-3">
                  <div className="h-3.5 w-3/4 animate-pulse rounded bg-zinc-100" />
                  <div className="h-3 w-1/2 animate-pulse rounded bg-zinc-100" />
                </div>
              </div>
            ))}
          </Grid>
        ) : listings.length === 0 ? (
          <EmptyState>
            {searching
              ? `No offers match “${searchTerm.trim()}”.`
              : 'No offers yet. The first Bees to OFFER here will fill the Bazaar.'}
          </EmptyState>
        ) : (
          <Grid>
            {listings.map((l) => (
              <ListingCard key={l.id} listing={l} />
            ))}
          </Grid>
        )}
      </div>
    </div>
  );
}

function BazaarHeader() {
  return (
    <div className="flex items-center gap-3">
      <div
        className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border-2"
        style={{ borderColor: `${BAZAAR_ACCENT}40`, background: `${BAZAAR_ACCENT}0D` }}
      >
        <ShoppingBag size={22} style={{ color: BAZAAR_ACCENT }} />
      </div>
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-wide" style={{ color: BAZAAR_ACCENT }}>
          BAZAAR
        </h1>
        <p className="font-mono text-zinc-500" style={{ fontSize: '12px' }}>
          OFFER goods &amp; services · GET with BLiNG!
        </p>
      </div>
    </div>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">{children}</div>
  );
}

function FilterBar({
  listingType,
  onListingType,
  condition,
  onCondition,
  category,
  onCategory,
  categoryGroups,
  sort,
  onSort,
}: {
  listingType: string;
  onListingType: (v: string) => void;
  condition: string;
  onCondition: (v: string) => void;
  category: string;
  onCategory: (v: string) => void;
  categoryGroups: { label: string; options: { id: string; name: string }[] }[];
  sort: BazaarSort;
  onSort: (v: BazaarSort) => void;
}) {
  return (
    <div className="mt-6 flex flex-wrap items-center gap-2">
      <Select label="Type" value={listingType} onChange={onListingType}>
        <option value="">All types</option>
        {LISTING_TYPES.map((t) => (
          <option key={t} value={t} className="capitalize">
            {t}
          </option>
        ))}
      </Select>
      <Select label="Condition" value={condition} onChange={onCondition}>
        <option value="">All conditions</option>
        {CONDITIONS.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </Select>
      <Select label="Category" value={category} onChange={onCategory}>
        <option value="">All categories</option>
        {categoryGroups.map((g) => (
          <optgroup key={g.label} label={g.label}>
            {g.options.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </optgroup>
        ))}
      </Select>
      <Select label="Sort" value={sort} onChange={(v) => onSort(v as BazaarSort)}>
        {SORTS.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </Select>
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  const active = value !== '' && value !== 'recent';
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-md border bg-white px-2.5 py-1.5 text-[13px] text-zinc-700 outline-none transition-colors focus:border-zinc-400"
      style={{ borderColor: active ? `${BAZAAR_ACCENT}80` : undefined, color: active ? BAZAAR_ACCENT : undefined }}
    >
      {children}
    </select>
  );
}

function EmptyState({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone?: 'error';
}) {
  return (
    <div
      className="rounded-lg border border-dashed px-4 py-10 text-center font-mono"
      style={{
        fontSize: '12px',
        borderColor: `${BAZAAR_ACCENT}40`,
        background: `${BAZAAR_ACCENT}0A`,
      }}
    >
      <span style={{ color: tone === 'error' ? '#b91c1c' : BAZAAR_ACCENT }}>{children}</span>
    </div>
  );
}
