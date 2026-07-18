import { REALM_ID_BY_NAME } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { useLensStore } from '@/stores/useLensStore';
import { REALM_COLOR_FALLBACK, useRealmColors } from '@/stores/useRealmColors';
import { X } from 'lucide-react';

/**
 * Selected-realm chips (closeable buttons — × → removeRealm). The bare
 * RealmChips renders INLINE in a surface header, right behind the Astra
 * name (Butch 2026-07-18 — replaces the breadcrumb trail). Hidden when
 * nothing is selected; full path on hover since leaf names repeat.
 */
export function RealmChips({
  className,
  excludePrefixes = [],
}: {
  className?: string;
  /** Path PREFIXES to hide (e.g. PLACES_ROOT = Geography → Countries — those
   *  picks show in the LocationBadge instead). Academic Geography selections
   *  fall outside the prefix and render like any other topic chip. */
  excludePrefixes?: string[][];
}) {
  const selected = useLensStore((s) => s.selectedRealms);
  const removeRealm = useLensStore((s) => s.removeRealm);
  const colors = useRealmColors((s) => s.colors) as Record<string, string>;

  const visible = selected.filter(
    (r) => !excludePrefixes.some((p) => p.every((seg, i) => r.pathParts[i] === seg)),
  );
  if (visible.length === 0) return null;

  return (
    <div className={cn('flex min-w-0 flex-wrap items-center gap-1.5', className)}>
      {visible.map((r) => {
        const realmId = r.pathParts[0] ? (REALM_ID_BY_NAME[r.pathParts[0]] ?? '') : '';
        const color = colors[realmId] ?? REALM_COLOR_FALLBACK;
        return (
          <span
            key={r.key}
            title={r.pathParts.join(' / ')}
            className="inline-flex flex-shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[12px] text-zinc-700"
            style={{ borderColor: `${color}55`, background: `${color}14` }}
          >
            <span
              className="h-1.5 w-1.5 flex-shrink-0 rounded-full"
              style={{ background: color }}
              aria-hidden="true"
            />
            <span className="max-w-[160px] truncate">{r.name}</span>
            <button
              type="button"
              onClick={() => removeRealm(r.key)}
              aria-label={`Remove ${r.name}`}
              title={`Remove ${r.name}`}
              className="-mr-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-black/10 hover:text-zinc-700"
            >
              <X size={11} />
            </button>
          </span>
        );
      })}
      {visible.length >= 2 && (
        <button
          type="button"
          onClick={() => {
            for (const r of visible) removeRealm(r.key);
          }}
          className="ml-1 flex-shrink-0 rounded-full px-2 py-0.5 font-medium text-[11px] text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
        >
          Clear all
        </button>
      )}
    </div>
  );
}

/**
 * Standalone bar host for the chips — RETIRED as a rendered element
 * (2026-07-18): the chips live inline in surface headers now. Kept for a
 * quick restore if a bar placement ever comes back.
 */
export function RealmChipsBar() {
  return (
    <div className="flex-shrink-0 border-b border-zinc-200 bg-white">
      <div className="flex w-full items-center gap-1.5 overflow-x-auto px-2 py-1.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <RealmChips className="flex-nowrap" />
      </div>
    </div>
  );
}
