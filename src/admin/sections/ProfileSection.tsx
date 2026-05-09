import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

const HEX_CLIP =
  'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)';

const PANEL_BG = '#0A1628';
const TEXT_PRIMARY = '#F0F0F5';
const TEXT_MUTED = '#5A7BAA';
const HEADER_TEXT = '#2C1F0A'; // high-contrast dark on Bee amber

interface BeeRow {
  handle: string;
  name?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
}

export function ProfileSection() {
  const { bee } = useAuth();
  const [row, setRow] = useState<BeeRow | null>(null);
  const [bioSupported, setBioSupported] = useState(true);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    if (!bee || !supabase) return;

    let cancelled = false;
    (async () => {
      // Try to read the optional profile columns. If any column is missing
      // PostgREST returns 42703 — drop bio in that case and retry without it.
      const sb = supabase!;
      const first = await sb
        .from('bees')
        .select('handle, name, avatar_url, bio')
        .eq('id', bee.id)
        .maybeSingle();

      let resolved: BeeRow | null = (first.data as BeeRow | null) ?? null;

      if (first.error?.code === '42703') {
        setBioSupported(false);
        const fallback = await sb
          .from('bees')
          .select('handle, name, avatar_url')
          .eq('id', bee.id)
          .maybeSingle();
        resolved = (fallback.data as BeeRow | null) ?? null;
      }

      if (cancelled || !resolved) return;
      setRow(resolved);
      setDraft(resolved.bio ?? '');
    })();

    return () => {
      cancelled = true;
    };
  }, [bee]);

  if (!bee) return null;

  async function save() {
    if (!supabase || !bee || !bioSupported) return;
    setSaving(true);
    const { error } = await supabase
      .from('bees')
      .update({ bio: draft })
      .eq('id', bee.id);
    setSaving(false);
    if (!error) setSavedAt(Date.now());
  }

  const displayName = row?.name?.trim() || bee.handle;
  const initial = (row?.handle ?? bee.handle).slice(0, 1).toUpperCase();

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <h1
        className="font-display text-3xl font-semibold"
        style={{ color: HEADER_TEXT }}
      >
        Profile
      </h1>

      {/* Identity card */}
      <div
        className="flex items-center gap-5 rounded-lg p-5"
        style={{ background: PANEL_BG }}
      >
        <div
          className="flex h-20 w-20 items-center justify-center"
          style={{
            background: '#1A2A3F',
            clipPath: HEX_CLIP,
          }}
        >
          {row?.avatar_url ? (
            // biome-ignore lint/a11y/useAltText: identity avatar, name in adjacent heading
            <img
              src={row.avatar_url}
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <span
              className="font-display text-3xl"
              style={{ color: TEXT_PRIMARY }}
            >
              {initial}
            </span>
          )}
        </div>
        <div>
          <div
            className="font-display text-2xl font-semibold"
            style={{ color: TEXT_PRIMARY }}
          >
            {displayName}
          </div>
          <div
            className="mt-1 font-mono text-xs"
            style={{ color: TEXT_MUTED }}
          >
            @{bee.handle}
          </div>
        </div>
      </div>

      {/* Bio editor (only if column exists) */}
      {bioSupported && (
        <div
          className="flex flex-col gap-3 rounded-lg p-5"
          style={{ background: PANEL_BG }}
        >
          <label
            htmlFor="bio"
            className="text-xs font-semibold uppercase tracking-wider"
            style={{ color: TEXT_MUTED }}
          >
            Bio
          </label>
          <textarea
            id="bio"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={5}
            className="w-full resize-none rounded-md border border-white/10 px-3 py-2 text-sm focus:border-white/30 focus:outline-none"
            style={{ background: '#0F1B2E', color: TEXT_PRIMARY }}
            placeholder="A few words about you…"
          />
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={save}
              disabled={saving || draft === (row?.bio ?? '')}
              className="px-5 py-2 text-sm font-medium transition-opacity disabled:opacity-40"
              style={{
                background: PANEL_BG,
                color: '#E8B86E',
                border: '1px solid #E8B86E',
                clipPath: HEX_CLIP,
                paddingLeft: '1.75rem',
                paddingRight: '1.75rem',
              }}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
            {savedAt && (
              <span className="text-xs" style={{ color: TEXT_MUTED }}>
                Saved.
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
