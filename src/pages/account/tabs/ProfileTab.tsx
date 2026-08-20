import { useAuth } from '@/lib/auth';
import { useStanding } from '@/lib/freedomblings/standing';
import { getOGDisplayLabel, getOGGeneration } from '@/lib/og-generation';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { Crown, MapPin, Pencil, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ACCOUNT_ACCENT } from '../accent';
import { Card, Field, MetaLabel, SectionHead } from '../ui';

// Rank + Ring name ladders — the same source of truth ProfilePage renders,
// re-declared here for the white-shell hub (they aren't exported there).
const BLING_RANK_NAMES = [
  'Seed',
  'Sprout',
  'Sapling',
  'Ranger',
  'Scout',
  'Squire',
  'Knight',
  'Protector',
  'Defender',
  'Guardian',
  'Champion',
  'Hero',
  'Paladin',
  'Sage',
  'Wizard',
  'Mystic',
  'Oracle',
  'Prophet',
  'Luminary',
  'Ascendant',
  'Exalted',
  'Sovereign',
  'Radiant',
  'Celestial',
  'Divine',
  'Archon',
  'Demiurge',
  'Eternal',
  'Infinite',
  'Transcendent',
  'Absolute',
  'Miraculous',
  'Miracle',
];
const RING_NAMES = [
  'NewBee',
  'Producer',
  'Scout',
  'Builder',
  'Scholar',
  'Sentinel',
  'Guardian',
  'Creator',
  'Queen',
];

interface LocationRow {
  country: string | null;
  region: string | null;
  city: string | null;
  neighborhood: string | null;
}

export function ProfileTab() {
  const { bee } = useAuth();
  const st = useStanding();
  const [loc, setLoc] = useState<LocationRow | null>(null);

  useEffect(() => {
    if (!supabase || !bee) return;
    let alive = true;
    void (async () => {
      const { data } = await supabase!
        .from('bee_profiles')
        .select('location_country, location_region, location_city, location_neighborhood')
        .eq('bee_id', bee.id)
        .maybeSingle();
      if (!alive) return;
      setLoc(
        data
          ? {
              country: (data.location_country as string | null) ?? null,
              region: (data.location_region as string | null) ?? null,
              city: (data.location_city as string | null) ?? null,
              neighborhood: (data.location_neighborhood as string | null) ?? null,
            }
          : { country: null, region: null, city: null, neighborhood: null },
      );
    })();
    return () => {
      alive = false;
    };
  }, [bee]);

  if (!bee) return null;

  const blingRank = st.blingRank ?? 1;
  const ring = st.honeycombRing ?? 1;
  const rankName = BLING_RANK_NAMES[Math.min(Math.max(blingRank - 1, 0), 32)];
  const ringName = RING_NAMES[Math.min(Math.max(ring - 1, 0), 8)];
  const ogLabel = getOGDisplayLabel(getOGGeneration(bee.createdAt));
  const displayName = st.name || `@${bee.handle}`;
  const locBits = loc
    ? [loc.neighborhood, loc.city, loc.region, loc.country].filter(Boolean).join(', ')
    : '';

  return (
    <div className="space-y-6">
      {/* Identity header */}
      <Card>
        <div className="flex items-center gap-4">
          <div
            className="flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border border-zinc-200 bg-zinc-100"
            style={{ background: st.avatarUrl ? undefined : `${ACCOUNT_ACCENT}14` }}
          >
            {st.avatarUrl ? (
              <img src={st.avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <span
                className="font-display text-2xl font-semibold"
                style={{ color: ACCOUNT_ACCENT }}
              >
                {bee.handle.slice(0, 1).toUpperCase()}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-display text-2xl font-semibold text-zinc-900">
              {displayName}
            </h1>
            <p className="font-mono text-zinc-500" style={{ fontSize: '12px' }} data-size="meta">
              @{bee.handle}
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <span
                className="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-mono uppercase tracking-wider"
                style={{
                  fontSize: '10.5px',
                  borderColor: `${ACCOUNT_ACCENT}55`,
                  color: ACCOUNT_ACCENT,
                  background: `${ACCOUNT_ACCENT}0D`,
                }}
                data-size="meta"
              >
                <Sparkles size={11} /> {ogLabel}
              </span>
              {st.joinedAt && (
                <span className="text-zinc-400" style={{ fontSize: '11.5px' }}>
                  Joined {st.joinedAt}
                </span>
              )}
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 font-mono uppercase tracking-wider',
                  st.inGoodComb ? 'text-green-700' : 'text-amber-700',
                )}
                style={{
                  fontSize: '10px',
                  background: st.inGoodComb ? '#DCFCE7' : '#FEF3C7',
                }}
                data-size="meta"
              >
                {st.inGoodComb ? 'In good comb' : 'Standing owed'}
              </span>
            </div>
          </div>
          <Link
            to="/profile"
            className="flex flex-shrink-0 items-center gap-1.5 rounded-md border border-zinc-200 px-3 py-1.5 text-zinc-700 transition-colors hover:bg-zinc-50"
            style={{ fontSize: '12.5px' }}
          >
            View public profile
          </Link>
        </div>
        {st.bio && (
          <p className="mt-4 whitespace-pre-line text-zinc-700" style={{ fontSize: '13.5px' }}>
            {st.bio}
          </p>
        )}
      </Card>

      {/* Ranks */}
      <div className="grid gap-4 sm:grid-cols-2">
        <RankCard
          icon={<Sparkles size={15} />}
          title="BLiNG! Rank"
          subtitle="33 levels · earning multiplier 1.0x – 10.0x"
          level={blingRank}
          max={33}
          name={rankName}
          extra={st.currentMultiplier ? `${st.currentMultiplier}x multiplier` : null}
        />
        <RankCard
          icon={<Crown size={15} />}
          title="The RiNG"
          subtitle="9 levels · raw action count · cannot be bought"
          level={ring}
          max={9}
          name={ringName}
          extra={`${st.actionCount.toLocaleString()} actions`}
        />
      </div>

      {/* Location (read-only here; editing lives on the public profile) */}
      <Card>
        <SectionHead
          title="Location"
          hint="Where you appear on the platform. Edit it on your profile."
          right={
            <Link
              to="/profile"
              className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 px-2.5 py-1 text-zinc-600 transition-colors hover:bg-zinc-50"
              style={{ fontSize: '12px' }}
            >
              <Pencil size={12} /> Edit
            </Link>
          }
        />
        <div className="flex items-center gap-2 text-zinc-700" style={{ fontSize: '14px' }}>
          <MapPin size={15} className="flex-shrink-0 text-zinc-400" />
          {loc === null ? (
            <span className="text-zinc-400">Loading…</span>
          ) : locBits ? (
            <span>{locBits}</span>
          ) : (
            <span className="text-zinc-400">Not set yet.</span>
          )}
        </div>
      </Card>

      {/* Identity facts */}
      <Card>
        <SectionHead title="Account" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Handle">@{bee.handle}</Field>
          <Field label="Email">{bee.email}</Field>
        </div>
      </Card>
    </div>
  );
}

function RankCard({
  icon,
  title,
  subtitle,
  level,
  max,
  name,
  extra,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  level: number;
  max: number;
  name: string;
  extra: string | null;
}) {
  const progress = Math.min(100, Math.max(0, (level / max) * 100));
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-5">
      <div className="flex items-center gap-2" style={{ color: ACCOUNT_ACCENT }}>
        {icon}
        <MetaLabel>{title}</MetaLabel>
      </div>
      <p className="mt-3 font-display text-2xl font-semibold text-zinc-900">{name}</p>
      <p className="mt-0.5 font-mono text-zinc-500" style={{ fontSize: '11px' }} data-size="meta">
        Level {level} / {max}
      </p>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-100">
        <div
          className="h-full transition-all"
          style={{ width: `${progress}%`, background: ACCOUNT_ACCENT }}
        />
      </div>
      <p className="mt-3 text-zinc-500" style={{ fontSize: '12px' }}>
        {subtitle}
      </p>
      {extra && (
        <p className="mt-1.5 font-mono text-zinc-400" style={{ fontSize: '11px' }} data-size="meta">
          {extra}
        </p>
      )}
    </div>
  );
}
