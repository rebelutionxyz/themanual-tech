import { Navigate, Link } from 'react-router-dom';
import { LogOut, Crown, Sparkles } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';

const BLING_RANK_NAMES = [
  'Seed', 'Sprout', 'Sapling', 'Ranger', 'Scout', 'Squire', 'Knight', 'Protector',
  'Defender', 'Guardian', 'Champion', 'Hero', 'Paladin', 'Sage', 'Wizard', 'Mystic',
  'Oracle', 'Prophet', 'Luminary', 'Ascendant', 'Exalted', 'Sovereign', 'Radiant',
  'Celestial', 'Divine', 'Archon', 'Demiurge', 'Eternal', 'Infinite', 'Transcendent',
  'Absolute', 'Miraculous', 'Miracle',
];

const RING_NAMES = [
  'Seed', 'Worker', 'Scout', 'Builder', 'Scholar',
  'Sentinel', 'Guardian', 'Elder', 'Queen',
];

const RING_THRESHOLDS = [0, 500, 2000, 6000, 15000, 35000, 75000, 150000, 300000];

export function ProfilePage() {
  const { bee, loading, signOut, configured } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="inline-block h-8 w-8 animate-pulse-slow rounded-full border-2 border-text-silver/30 border-t-text-silver" />
      </div>
    );
  }

  if (!bee) return <Navigate to="/login" replace />;

  const blingRank = bee.blingRank ?? 0;
  const ring = bee.honeycombRing ?? 0;
  const rankName = BLING_RANK_NAMES[Math.min(blingRank, 32)];
  const ringName = RING_NAMES[Math.min(ring, 8)];
  const nextRingThreshold = ring < 8 ? RING_THRESHOLDS[ring + 1] : null;

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 md:px-8">
      {/* Header */}
      <div className="mb-10 flex items-center gap-5">
        <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-text-silver/30 bg-bg-elevated">
          <span className="font-display text-3xl text-text-silver-bright">
            {bee.handle.slice(0, 1).toUpperCase()}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-3xl font-semibold text-text-silver-bright">
            {bee.handle}
          </h1>
          <p
            className="mt-1 font-mono text-text-muted"
            style={{ fontSize: '12px' }}
            data-size="meta"
          >
            Ringbearer · {ringName}
          </p>
        </div>
        <button
          type="button"
          onClick={() => signOut()}
          className={cn(
            'flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm',
            'text-text-dim hover:border-border-bright hover:bg-bg-elevated hover:text-text-silver',
          )}
        >
          <LogOut size={14} />
          <span>Sign out</span>
        </button>
      </div>

      {/* Rank cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <RankCard
          icon={<Sparkles size={16} />}
          title="BLiNG! Rank"
          subtitle="33 levels · 1.0x – 10.0x multiplier"
          level={blingRank}
          max={32}
          name={rankName}
          colorClass="text-honey"
        />
        <RankCard
          icon={<Crown size={16} />}
          title="HoneyComb RiNG"
          subtitle="9 levels · raw action count · cannot be bought"
          level={ring}
          max={8}
          name={ringName}
          colorClass="text-text-silver-bright"
          nextThreshold={nextRingThreshold}
        />
      </div>

      {/* Contributions placeholder */}
      <div className="mt-10 rounded-lg border border-border bg-bg-elevated/40 p-6">
        <h2 className="font-display text-xl font-semibold text-text-silver-bright">
          Your contributions
        </h2>
        <p
          className="mt-2 font-mono text-text-muted"
          style={{ fontSize: '11px' }}
          data-size="meta"
        >
          Sources added · kettle votes · comments — coming soon
        </p>
        <Link
          to="/s/manual"
          className="mt-4 inline-block font-mono text-text-silver hover:text-text-silver-bright"
          style={{ fontSize: '12px' }}
        >
          → Explore the Manual
        </Link>
      </div>

      {!configured && (
        <div className="mt-6 rounded-md border border-kettle-contested/30 bg-kettle-contested/10 p-3">
          <p className="text-kettle-contested" style={{ fontSize: '12px' }}>
            Read-only mode: Supabase not configured.
          </p>
        </div>
      )}
    </main>
  );
}

interface RankCardProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  level: number;
  max: number;
  name: string;
  colorClass: string;
  nextThreshold?: number | null;
}

function RankCard({
  icon,
  title,
  subtitle,
  level,
  max,
  name,
  colorClass,
  nextThreshold,
}: RankCardProps) {
  const progress = (level / max) * 100;
  return (
    <div className="rounded-lg border border-border bg-bg-elevated/40 p-5">
      <div className="flex items-center gap-2 text-text-silver">
        <span className={colorClass}>{icon}</span>
        <span className="font-mono" style={{ fontSize: '11px' }} data-size="meta">
          {title}
        </span>
      </div>
      <p className="mt-3 font-display text-2xl font-semibold text-text-silver-bright">
        {name}
      </p>
      <p
        className="mt-0.5 font-mono text-text-muted"
        style={{ fontSize: '11px' }}
        data-size="meta"
      >
        Level {level} / {max}
      </p>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-bg">
        <div
          className={cn('h-full transition-all', colorClass.replace('text-', 'bg-'))}
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="mt-3 text-text-dim" style={{ fontSize: '12px' }}>
        {subtitle}
      </p>
      {nextThreshold !== null && nextThreshold !== undefined && (
        <p
          className="mt-2 font-mono text-text-muted"
          style={{ fontSize: '11px' }}
          data-size="meta"
        >
          next: {nextThreshold.toLocaleString()} actions
        </p>
      )}
    </div>
  );
}
