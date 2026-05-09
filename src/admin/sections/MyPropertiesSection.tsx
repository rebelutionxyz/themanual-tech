import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

const PANEL_BG = '#0A1628';
const TEXT_PRIMARY = '#F0F0F5';
const TEXT_MUTED = '#5A7BAA';
const HEADER_TEXT = '#1F1F25'; // high-contrast on silver

interface PropertyRow {
  id: string;
  slug: string;
  name: string;
  status: string;
  type: 'astra' | 'nova';
  parent_astra_id?: string | null;
}

async function fetchOwnedAstras(beeId: string): Promise<PropertyRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('astra_registry')
    .select('id, slug, name, status')
    .eq('created_by', beeId);
  if (error || !data) return [];
  return (data as unknown as Array<Record<string, unknown>>).map((r) => ({
    id: String(r.id),
    slug: String(r.slug),
    name: String(r.name),
    status: String(r.status ?? 'active'),
    type: 'astra' as const,
    parent_astra_id: null,
  }));
}

async function fetchOwnedNovas(beeId: string): Promise<PropertyRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('nova_registry')
    .select('id, slug, name, status, parent_astra_id')
    .eq('created_by', beeId);
  if (error || !data) return [];
  return (data as unknown as Array<Record<string, unknown>>).map((r) => ({
    id: String(r.id),
    slug: String(r.slug),
    name: String(r.name),
    status: String(r.status ?? 'active'),
    type: 'nova' as const,
    parent_astra_id: (r.parent_astra_id as string | null | undefined) ?? null,
  }));
}

export function MyPropertiesSection() {
  const { bee } = useAuth();
  const [rows, setRows] = useState<PropertyRow[] | null>(null);

  useEffect(() => {
    if (!bee) return;
    let cancelled = false;
    (async () => {
      const [astras, novas] = await Promise.all([
        fetchOwnedAstras(bee.id),
        fetchOwnedNovas(bee.id),
      ]);
      if (cancelled) return;
      setRows([...astras, ...novas]);
    })();
    return () => {
      cancelled = true;
    };
  }, [bee]);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <h1
        className="font-display text-3xl font-semibold"
        style={{ color: HEADER_TEXT }}
      >
        My Properties
      </h1>

      {rows === null ? (
        <div
          className="rounded-lg p-5 text-sm"
          style={{ background: PANEL_BG, color: TEXT_MUTED }}
        >
          Loading…
        </div>
      ) : rows.length === 0 ? (
        <div
          className="rounded-lg p-6"
          style={{ background: PANEL_BG, color: TEXT_PRIMARY }}
        >
          <p className="text-sm">
            You don't own any properties yet. Visit the Workshop to clone an
            Astra into your first Nova.
          </p>
        </div>
      ) : (
        <div
          className="overflow-hidden rounded-lg"
          style={{ background: PANEL_BG }}
        >
          <table className="w-full text-sm">
            <thead>
              <tr
                className="border-b border-white/5 text-left text-xs uppercase tracking-wider"
                style={{ color: TEXT_MUTED }}
              >
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Slug</th>
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-white/5 last:border-b-0"
                  style={{ color: TEXT_PRIMARY }}
                >
                  <td className="px-4 py-3 font-medium">{r.name}</td>
                  <td
                    className="px-4 py-3 font-mono text-xs"
                    style={{ color: TEXT_MUTED }}
                  >
                    {r.slug}
                  </td>
                  <td className="px-4 py-3 capitalize">{r.type}</td>
                  <td className="px-4 py-3 capitalize">{r.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
