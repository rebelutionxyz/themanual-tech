import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { type ProfileData, ProfileView } from './profile/ProfileView';

/**
 * PUBLIC PROFILE — the /@handle surface. PROFILE3 builds the page itself to
 * PROFILE_SPEC v0.1–v0.4 + SHELL v1.5: cover header + avatar overlap + identity
 * block, the four-state action row, stat strip, the drag-reorderable tab
 * toolbar, nine panes, the Timeline lens, and the quick-look content window.
 *
 * This component only LOADS the Bee and hands a typed `ProfileData` to
 * ProfileView. It reads the hive-public columns (handle, name, bio, avatar_url,
 * ranks, action_count, created_at) plus public location from bee_profiles;
 * email and balances are never selected here.
 *
 * Identity rule (SHELL v1.5): your OWN name shows with NO @; another Bee is
 * ALWAYS @handle. isSelf drives that and the own-view action row.
 *
 * Reached via the SurfacePage `/:slug` catch-all delegating any slug that
 * starts with "@" — react-router 6 cannot match a partial-segment param like
 * `/@:handle`, so the single-segment `@handle` is resolved here instead.
 */

type LoadState = 'loading' | 'ready' | 'missing';

export function PublicProfilePage() {
  const { slug } = useParams<{ slug: string }>();
  const { bee: viewer } = useAuth();
  const handle = (slug ?? '').replace(/^@/, '').toLowerCase();

  const [state, setState] = useState<LoadState>('loading');
  const [profile, setProfile] = useState<ProfileData | null>(null);

  useEffect(() => {
    let cancelled = false;
    setState('loading');
    setProfile(null);

    // Handle format guard (CLAUDE.md: ^[a-z0-9_-]{2,30}$). A malformed slug can
    // never be a Bee, so skip the round-trip.
    if (!supabase || !/^[a-z0-9_-]{2,30}$/.test(handle)) {
      setState('missing');
      return;
    }

    void (async () => {
      const { data } = await supabase
        .from('bees')
        .select(
          'id, handle, name, bio, avatar_url, bling_rank, honeycomb_ring, action_count, created_at',
        )
        .eq('handle', handle)
        .maybeSingle();
      if (cancelled) return;
      if (!data) {
        setState('missing');
        return;
      }

      // Public location (bee_profiles). Best-effort — RLS may withhold it.
      let locationText: string | null = null;
      const { data: loc } = await supabase
        .from('bee_profiles')
        .select('location_city, location_region, location_country')
        .eq('bee_id', data.id)
        .maybeSingle();
      if (loc) {
        locationText =
          [loc.location_city, loc.location_region, loc.location_country]
            .filter(Boolean)
            .join(', ') || null;
      }
      if (cancelled) return;

      setProfile({
        id: data.id,
        handle: data.handle,
        name: data.name ?? null,
        bio: data.bio ?? null,
        avatarUrl: data.avatar_url ?? null,
        blingRank: data.bling_rank ?? 0,
        honeycombRing: data.honeycomb_ring ?? 0,
        actionCount: data.action_count ?? 0,
        createdAt: data.created_at,
        locationText,
      });
      setState('ready');
    })();

    return () => {
      cancelled = true;
    };
  }, [handle]);

  if (state === 'loading') {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="inline-block h-8 w-8 animate-pulse-slow rounded-full border-2 border-text-silver/30 border-t-text-silver" />
      </div>
    );
  }

  if (state === 'missing' || !profile) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16 md:px-8">
        <div className="rounded-lg border border-dashed border-border p-10 text-center">
          <p className="font-display text-2xl font-semibold text-text-silver-bright">No Bee here</p>
          <p
            className="mt-2 font-mono text-text-muted"
            style={{ fontSize: '12px' }}
            data-size="meta"
          >
            @{handle || '—'} hasn’t claimed this handle.
          </p>
          <Link
            to="/manual"
            className="mt-5 inline-block font-mono text-text-silver hover:text-text-silver-bright"
            style={{ fontSize: '12px' }}
          >
            → Explore the Manual
          </Link>
        </div>
      </main>
    );
  }

  const isSelf = viewer?.handle === profile.handle;

  return <ProfileView profile={profile} isSelf={isSelf} />;
}
