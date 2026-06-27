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
import { formatCount } from '@/lib/utils';
import { cn } from '@/lib/utils';

/** FN / Media accent — the sanctioned red exception. Used for LIVE + active. */
export const FN_RED = '#C94C4C';

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
        background: `linear-gradient(135deg, ${accent}22 0%, ${accent}0A 60%, rgba(0,0,0,0.25) 100%)`,
      }}
    >
      <Radio size={28} style={{ color: `${accent}99` }} aria-hidden="true" />
      {children}
    </div>
  );
}

function LiveBadge({ viewers }: { viewers: number }) {
  return (
    <div className="absolute left-2 top-2 flex items-center gap-2">
      <span
        className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono font-semibold uppercase tracking-wider text-white"
        style={{ fontSize: '10px', background: FN_RED }}
        data-size="meta"
      >
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
        Live
      </span>
      <span
        className="rounded bg-black/55 px-1.5 py-0.5 font-mono text-white/90"
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
      style={{ fontSize: '9px', color: '#FAD15E', background: '#FAD15E1A' }}
      data-size="meta"
    >
      Premium
    </span>
  );
}

function RealmTag({ realm, color }: { realm: string; color: string }) {
  return (
    <span
      className="rounded px-1.5 py-0.5 font-mono"
      style={{ fontSize: '10px', color, background: `${color}15` }}
      data-size="meta"
    >
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
        className="truncate text-text-silver"
        style={{ fontSize: size === 'sm' ? '11px' : '12px' }}
      >
        {channel.name || channel.handle}
      </span>
      {channel.verified && (
        <BadgeCheck
          size={size === 'sm' ? 12 : 13}
          className="flex-shrink-0"
          style={{ color: '#4FC3E8' }}
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
      className="flex flex-shrink-0 items-center justify-center rounded-full bg-bg font-mono text-text-silver"
      style={{ width: size, height: size, fontSize: size * 0.5 }}
      aria-hidden="true"
    >
      {initial}
    </span>
  );
}

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
      className="group block overflow-hidden rounded-lg border border-border bg-bg-elevated transition-all hover:border-border-bright hover:bg-panel-2"
      style={{ borderLeft: `3px solid ${accent}80` }}
    >
      <Thumb accent={accent}>
        <LiveBadge viewers={item.viewerCount} />
      </Thumb>
      <div className="p-3">
        <h3 className="line-clamp-2 font-display text-base leading-tight text-text-silver-bright group-hover:text-text">
          {item.title}
        </h3>
        <div className="mt-2 flex items-center justify-between gap-2">
          <ChannelByline channel={item.channel} />
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {item.primaryRealm && <RealmTag realm={item.primaryRealm} color={accent} />}
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
      className="group flex w-64 flex-shrink-0 flex-col overflow-hidden rounded-lg border border-border bg-bg-elevated transition-all hover:border-border-bright hover:bg-panel-2"
      style={{ borderLeft: `3px solid ${accent}80` }}
    >
      <div className="p-3">
        <div
          className="mb-1.5 font-mono uppercase tracking-wider"
          style={{ fontSize: '10px', color: accent }}
          data-size="meta"
        >
          {formatScheduled(item.scheduledAt)}
        </div>
        <h3 className="line-clamp-2 font-display text-sm leading-tight text-text-silver-bright group-hover:text-text">
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
      className="group block overflow-hidden rounded-lg border border-border bg-bg-elevated transition-all hover:border-border-bright hover:bg-panel-2"
      style={{ borderLeft: `3px solid ${accent}80` }}
    >
      <Thumb accent={accent}>
        {item.durationSec != null && (
          <span
            className="absolute bottom-2 right-2 rounded bg-black/65 px-1.5 py-0.5 font-mono text-white/90"
            style={{ fontSize: '10px' }}
            data-size="meta"
          >
            {formatDuration(item.durationSec)}
          </span>
        )}
      </Thumb>
      <div className="p-3">
        <h3 className="line-clamp-2 font-display text-base leading-tight text-text-silver-bright group-hover:text-text">
          {item.title}
        </h3>
        <div className="mt-2">
          <ChannelByline channel={item.channel} />
        </div>
        <div
          className="mt-1.5 font-mono text-text-muted"
          style={{ fontSize: '11px' }}
          data-size="meta"
        >
          {formatCount(item.viewCount)} views
          {item.publishedAt && <> · {relativeTime(item.publishedAt)}</>}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {item.primaryRealm && <RealmTag realm={item.primaryRealm} color={accent} />}
          {item.isPremium && <PremiumBadge />}
        </div>
      </div>
    </Link>
  );
}
