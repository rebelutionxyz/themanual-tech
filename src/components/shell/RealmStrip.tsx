import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { useLensStore } from '@/stores/useLensStore';
import { REALM_COLOR_FALLBACK, useRealmColors } from '@/stores/useRealmColors';
import type { RealmId } from '@/types/manual';
import { useEffect, useState } from 'react';

interface RealmRow {
  id: RealmId;
  name: string;
}

/**
 * Persistent 14-realm strip under the lens toolbar (pass 18) — replaces the old
 * Realm lens popup. Realms in realms.display_order, each chip tinted with the
 * realm color (realms.color via the store). Clicking sets the realm lens (the
 * shared prefix) that drives the feed; "All" clears it. Active = underlined in
 * its color.
 */
export function RealmStrip() {
  const [realms, setRealms] = useState<RealmRow[]>([]);
  const colors = useRealmColors((s) => s.colors);
  const realmId = useLensStore((s) => s.realmId);
  const setLens = useLensStore((s) => s.setLens);

  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;
    supabase
      .from('realms')
      .select('id, name, display_order')
      .order('display_order', { ascending: true })
      .then(({ data }) => {
        if (cancelled || !data) return;
        setRealms(
          (data as { id: string; name: string }[]).map((r) => ({
            id: r.id as RealmId,
            name: r.name,
          })),
        );
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex h-9 flex-shrink-0 items-center gap-0.5 overflow-x-auto border-b border-zinc-200 bg-white px-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <RealmChip
        label="All"
        color="#71717A"
        active={realmId === null}
        onClick={() => setLens(null, [])}
      />
      {realms.map((r) => (
        <RealmChip
          key={r.id}
          label={r.name}
          color={colors[r.id] ?? REALM_COLOR_FALLBACK}
          active={realmId === r.id}
          onClick={() => setLens(r.id, [r.name])}
        />
      ))}
    </div>
  );
}

function RealmChip({
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
      title={label}
      className={cn(
        'flex-shrink-0 whitespace-nowrap rounded-md px-2.5 py-1 text-[12.5px] transition-colors',
        active ? 'font-semibold' : 'text-zinc-500 hover:bg-zinc-100',
      )}
      style={
        active
          ? { color, background: `${color}14`, boxShadow: `inset 0 -2px 0 ${color}` }
          : undefined
      }
    >
      {label}
    </button>
  );
}
