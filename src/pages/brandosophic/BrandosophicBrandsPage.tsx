import { useAuth } from '@/lib/auth';
import { type SkinRow, fetchMyKits, updateSkin } from '@/lib/skins';
import { Pencil } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

// MY BRANDS — the signed-in Bee's kits (bee-owned skins rows).
// Rename inline via skin_update; deeper editing arrives with the full editor.

export function BrandosophicBrandsPage() {
  const { bee } = useAuth();
  const [kits, setKits] = useState<SkinRow[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

  const load = useCallback(() => {
    if (bee?.id) void fetchMyKits(bee.id).then(setKits);
  }, [bee?.id]);
  useEffect(() => {
    load();
  }, [load]);

  const rename = async (kit: SkinRow) => {
    const name = draft.trim();
    setEditing(null);
    if (!name || name === kit.name) return;
    try {
      await updateSkin(kit.id, { name });
      load();
    } catch {
      // silent; list reload shows truth
      load();
    }
  };

  if (!bee) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 text-sm text-zinc-500">
        Sign in to build brand kits.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="text-xl font-bold text-zinc-900">My Brands</h1>
      <p className="mt-1 text-sm text-zinc-500">
        One kit = one identity: colors, wordmark, logo. Kits skin Novas, storefronts, and merch.
      </p>

      <div className="mt-5 space-y-3">
        {kits.map((k) => {
          const accent = k.branding?.accentHex ?? '#C88A6B';
          return (
            <div
              key={k.id}
              className="flex items-center gap-4 rounded-xl border border-zinc-200 p-4"
            >
              <div className="h-10 w-10 shrink-0 rounded-lg" style={{ background: accent }} />
              <div className="min-w-0 flex-1">
                {editing === k.id ? (
                  <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onBlur={() => void rename(k)}
                    onKeyDown={(e) => e.key === 'Enter' && void rename(k)}
                    className="w-full rounded-md border border-zinc-300 px-2 py-1 text-sm"
                  />
                ) : (
                  <div className="truncate text-sm font-semibold text-zinc-900">{k.name}</div>
                )}
                <div className="text-xs text-zinc-500">
                  {accent}
                  {k.cloned_from ? ' · cloned — lineage kept' : ' · original'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditing(k.id);
                  setDraft(k.name);
                }}
                className="rounded-md p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                aria-label={`Rename ${k.name}`}
              >
                <Pencil size={15} />
              </button>
            </div>
          );
        })}
        {kits.length === 0 && (
          <div className="rounded-xl border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500">
            No kits yet. Head to the Studio and KEEP a preset as your first kit.
          </div>
        )}
      </div>
    </div>
  );
}
