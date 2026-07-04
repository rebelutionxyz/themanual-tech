import { Link } from 'react-router-dom';
import { BadgeCheck, Radio } from 'lucide-react';
import { relativeTime } from '@/lib/intel';
import {
  formatDuration,
  formatScheduled,
  type PulseLive,
  type PulseUpcoming,
  type PulseLibraryItem,
  type PulseChannelRef,
} from '@/lib/pulse';
import { CARD_INK, cardChipStyle, realmCardStyle } from '@/lib/realmCardStyle';
import { SURFACE_BY_SLUG } from '@/lib/surfaces';
import { cn, formatCount } from '@/lib/utils';

/**
 * PULSE / media accent — the single sanctioned red, sourced from the surface
 * registry (surfaces.ts) rather than re-hardcoded. Reserved for the PULSE
 * accent + the LIVE badge; everything else stays neutral.
 */
export const PULSE_RED = SURFACE_BY_SLUG.get('pulse')?.color ?? '#DC2626';

/** Conventional verified-channel blue (X-style tick). */
const VERIFIED_BLUE = '#1D9BF0';

type ColorFn = (realmNameOrId: string | null | undefined) => string;

// ─────────────────────────────────────────────────────────────────────────
// Shared bits
// ─────────────────────────────────────────────────────────────────────────

function Thumb({
  accent,
  className,
  children,
}: {
  accent: string;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'relative flex aspect-video w-full items-center justify-center overflow-hidden',
        className,
      )}
      style={{
        backgroundColor: '#18181B',
        backgroundImage: `linear-gradient(135deg, ${accent}59 0%, rgba(0,0,0,0.45) 100%)`,
      }}
    >
      <Radio size={28} style={{ color: 'rgba(255,255,255,0.5)' }} aria-hidden="true" />
      {children}
    </div>
  );
}

function LiveBadge({ viewers }: { viewers: number }) {
  return (
    <div className="absolute left-2 top-2 flex items-center gap-2">
      <span
        className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono font-semibold uppercase tracking-wider text-white"
        style={{ fontSize: '10px', background: PULSE_RED }}
        data-size="meta"
      >
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
        Live
      </span>
      <span
        className="rounded bg-black/55 px-1.5 py-0.5 font-mono text-white"
        style={{ fontSize: '10px' }}
        data-size="meta"
      >
        {formatCount(viewers)} watching
      </span>
    </div>
  );
}

function PremiumBadge() {
  return (
    <span
      className="rounded px-1.5 py-0.5 font-mono uppercase tracking-wider"
      style={{ fontSize: '9px', color: '#FCD34D', background: 'rgba(252,211,77,0.16)' }}
      data-size="meta"
    >
      Premium
    </span>
  );
}

function RealmTag({ realm }: { realm: string }) {
  return (
    <span className="rounded px-1.5 py-0.5 font-mono" style={{ fontSize: '10px', ...cardChipStyle }} data-size="meta">
      {realm}
    </span>
  );
}

function ChannelByline({
  channel,
  size = 'md',
}: {
  channel: PulseChannelRef;
  size?: 'sm' | 'md';
}) {
  const dim = size === 'sm' ? 16 : 20;
  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <Avatar channel={channel} size={dim} />
      <span
        className="truncate"
        style={{ fontSize: size === 'sm' ? '11px' : '12px', color: CARD_INK.body }}
      >
        {channel.name || channel.handle}
      </span>
      {channel.verified && (
        <BadgeCheck
          size={size === 'sm' ? 12 : 13}
          className="flex-shrink-0"
          style={{ color: VERIFIED_BLUE }}
          aria-label="Verified"
        />
      )}
    </div>
  );
}

function Avatar({ channel, size }: { channel: PulseChannelRef; size: number }) {
  if (channel.avatarUrl) {
    return (
      <img
        src={channel.avatarUrl}
        alt=""
        width={size}
        height={size}
        className="flex-shrink-0 rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  const initial = (channel.name || channel.handle || '?').charAt(0).toUpperCase();
  return (
    <span
      className="flex flex-shrink-0 items-center justify-center rounded-full bg-white/15 font-mono text-white"
      style={{ width: size, height: size, fontSize: size * 0.5 }}
      aria-hidden="true"
    >
      {initial}
    </span>
  );
}

const CARD_CLASS =
  'group block overflow-hidden rounded-lg transition-shadow hover:shadow-md';

// ─────────────────────────────────────────────────────────────────────────
// Live now (grid card)
// ─────────────────────────────────────────────────────────────────────────

export function LiveNowCard({
  item,
  colorFor,
}: {
  item: PulseLive;
  colorFor: ColorFn;
}) {
  const accent = colorFor(item.primaryRealm);
  return (
    <Link
      to={`/pulse/watch/${item.broadcastId}`}
      className={CARD_CLASS}
      style={realmCardStyle(accent)}
    >
      <Thumb accent={accent}>
        <LiveBadge viewers={item.viewerCount} />
      </Thumb>
      <div className="p-3">
        <h3
          className="line-clamp-2 font-display text-base leading-tight"
          style={{ color: CARD_INK.title }}
        >
          {item.title}
        </h3>
        <div className="mt-2 flex items-center justify-between gap-2">
          <ChannelByline channel={item.channel} />
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {item.primaryRealm && <RealmTag realm={item.primaryRealm} />}
          {item.isPremium && <PremiumBadge />}
        </div>
      </div>
    </Link>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Upcoming (compact rail card)
// ─────────────────────────────────────────────────────────────────────────

export function UpcomingCard({
  item,
  colorFor,
}: {
  item: PulseUpcoming;
  colorFor: ColorFn;
}) {
  const accent = colorFor(item.primaryRealm);
  return (
    <Link
      to={`/pulse/watch/${item.broadcastId}`}
      className={cn(CARD_CLASS, 'flex w-64 flex-shrink-0 flex-col')}
      style={realmCardStyle(accent)}
    >
      <div className="p-3">
        <div
          className="mb-1.5 font-mono uppercase tracking-wider"
          style={{ fontSize: '10px', color: CARD_INK.meta }}
          data-size="meta"
        >
          {formatScheduled(item.scheduledAt)}
        </div>
        <h3
          className="line-clamp-2 font-display text-sm leading-tight"
          style={{ color: CARD_INK.title }}
        >
          {item.title}
        </h3>
        <div className="mt-2">
          <ChannelByline channel={item.channel} size="sm" />
        </div>
        {item.isPremium && (
          <div className="mt-2">
            <PremiumBadge />
          </div>
        )}
      </div>
    </Link>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Library (VOD grid card)
// ─────────────────────────────────────────────────────────────────────────

export function LibraryCard({
  item,
  colorFor,
}: {
  item: PulseLibraryItem;
  colorFor: ColorFn;
}) {
  const accent = colorFor(item.primaryRealm);
  return (
    <Link
      to={`/pulse/watch/${item.broadcastId}`}
      className={CARD_CLASS}
      style={realmCardStyle(accent)}
    >
      <Thumb accent={accent}>
        {item.durationSec != null && (
          <span
            className="absolute bottom-2 right-2 rounded bg-black/60 px-1.5 py-0.5 font-mono text-white"
            style={{ fontSize: '10px' }}
            data-size="meta"
          >
            {formatDuration(item.durationSec)}
          </span>
        )}
      </Thumb>
      <div className="p-3">
        <h3
          className="line-clamp-2 font-display text-base leading-tight"
          style={{ color: CARD_INK.title }}
        >
          {item.title}
        </h3>
        <div className="mt-2">
          <ChannelByline channel={item.channel} />
        </div>
        <div className="mt-1.5 font-mono" style={{ fontSize: '11px', color: CARD_INK.meta }} data-size="meta">
          {formatCount(item.viewCount)} views
          {item.publishedAt && <> · {relativeTime(item.publishedAt)}</>}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {item.primaryRealm && <RealmTag realm={item.primaryRealm} />}
          {item.isPremium && <PremiumBadge />}
        </div>
      </div>
    </Link>
  );
}
