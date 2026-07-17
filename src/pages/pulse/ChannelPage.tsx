import { ChannelModal, PublishVodModal, ScheduleModal } from '@/components/pulse/CreatorModals';
import { FollowButton } from '@/components/pulse/FollowButton';
import { PULSE_RED } from '@/components/pulse/cards';
import { useAuth } from '@/lib/auth';
import {
  type PulseBroadcast,
  type PulseChannel,
  formatDuration,
  formatScheduled,
  getChannelByHandle,
  listChannelBroadcasts,
  updateChannel,
  uploadChannelImage,
} from '@/lib/pulse';
import { cn, formatCount } from '@/lib/utils';
import {
  ArrowLeft,
  BadgeCheck,
  CalendarClock,
  CalendarPlus,
  Camera,
  Eye,
  MapPin,
  Pencil,
  Radio,
  Upload,
  Users,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

/**
 * Channel page — banner/avatar profile, follow, and the channel's broadcasts
 * (live / upcoming / videos). Owners get edit, schedule, publish-video and
 * imagery uploads. Going live stays LiveKit-gated.
 */
export function ChannelPage() {
  const { handle } = useParams<{ handle: string }>();
  const { bee } = useAuth();

  const [channel, setChannel] = useState<PulseChannel | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [broadcasts, setBroadcasts] = useState<PulseBroadcast[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [uploading, setUploading] = useState<'avatar' | 'banner' | null>(null);
  const avatarInput = useRef<HTMLInputElement>(null);
  const bannerInput = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    if (!handle) return;
    const ch = await getChannelByHandle(handle);
    if (!ch) {
      setNotFound(true);
      return;
    }
    setChannel(ch);
    setBroadcasts(await listChannelBroadcasts(ch.id));
  }, [handle]);

  useEffect(() => {
    setChannel(null);
    setNotFound(false);
    refresh().catch((e) => setError(e instanceof Error ? e.message : 'Failed to load channel'));
  }, [refresh]);

  const isOwner = !!bee?.id && !!channel && bee.id === channel.ownerBee;

  async function onImagePicked(kind: 'avatar' | 'banner', file: File | undefined) {
    if (!file || !channel || uploading) return;
    setUploading(kind);
    setError(null);
    try {
      const url = await uploadChannelImage(channel.id, kind, file);
      await updateChannel({
        name: channel.name,
        tagline: channel.tagline,
        locationText: channel.locationText,
        avatarUrl: kind === 'avatar' ? url : channel.avatarUrl,
        bannerUrl: kind === 'banner' ? url : channel.bannerUrl,
      });
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(null);
    }
  }

  if (notFound) {
    return (
      <div className="mx-auto max-w-3xl bg-white px-5 py-12 text-center">
        <p className="text-zinc-600" style={{ fontSize: '15px' }}>
          This channel doesn't exist.
        </p>
        <Link
          to="/pulse"
          className="mt-3 inline-block"
          style={{ color: PULSE_RED, fontSize: '13px' }}
        >
          ← Back to PULSE
        </Link>
      </div>
    );
  }

  if (!channel) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-10 md:px-8">
        <div className="h-36 animate-pulse-slow rounded-lg bg-zinc-100 md:h-44" />
        <div className="mt-4 h-7 w-56 animate-pulse-slow rounded bg-zinc-200" />
      </div>
    );
  }

  const live = broadcasts.filter((b) => b.status === 'live');
  const upcoming = broadcasts
    .filter(
      (b) => b.status !== 'live' && !b.recordingUrl && b.scheduledAt != null && !b.publishedAt,
    )
    .sort((a, b) => String(a.scheduledAt).localeCompare(String(b.scheduledAt)));
  const videos = broadcasts.filter((b) => b.recordingUrl != null || b.publishedAt != null);

  return (
    <div className="min-h-full bg-white">
      <div className="mx-auto max-w-3xl px-5 py-6 md:px-8 md:py-8">
        <Link
          to="/pulse"
          className="mb-3 inline-flex items-center gap-1.5 font-mono text-zinc-500 hover:text-zinc-700"
          style={{ fontSize: '12px' }}
          data-size="meta"
        >
          <ArrowLeft size={14} /> PULSE
        </Link>

        {/* Banner + avatar */}
        <div className="relative">
          <div className="h-36 overflow-hidden rounded-lg border border-zinc-200 md:h-44">
            {channel.bannerUrl ? (
              <img src={channel.bannerUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div
                className="h-full w-full"
                style={{
                  background: `linear-gradient(135deg, ${PULSE_RED}14 0%, ${PULSE_RED}50 100%)`,
                }}
              />
            )}
          </div>
          {isOwner && (
            <>
              <button
                type="button"
                onClick={() => bannerInput.current?.click()}
                disabled={uploading !== null}
                className="absolute right-2 bottom-2 inline-flex items-center gap-1.5 rounded-md bg-black/55 px-2.5 py-1 text-white backdrop-blur-sm transition-colors hover:bg-black/70 disabled:opacity-60"
                style={{ fontSize: '11.5px' }}
              >
                <Camera size={12} />
                {uploading === 'banner' ? 'Uploading…' : 'Change banner'}
              </button>
              <input
                ref={bannerInput}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={(e) => onImagePicked('banner', e.target.files?.[0])}
              />
            </>
          )}

          <div className="-bottom-8 absolute left-4 md:left-6">
            <div className="relative">
              <div className="h-20 w-20 overflow-hidden rounded-full border-4 border-white bg-white shadow-md">
                {channel.avatarUrl ? (
                  <img src={channel.avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div
                    className="flex h-full w-full items-center justify-center font-display"
                    style={{ background: `${PULSE_RED}14`, color: PULSE_RED, fontSize: '30px' }}
                  >
                    {channel.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              {isOwner && (
                <>
                  <button
                    type="button"
                    onClick={() => avatarInput.current?.click()}
                    disabled={uploading !== null}
                    className="-right-1 -bottom-1 absolute rounded-full border border-zinc-200 bg-white p-1.5 text-zinc-600 shadow-sm transition-colors hover:text-zinc-900 disabled:opacity-60"
                    aria-label="Change avatar"
                    title={uploading === 'avatar' ? 'Uploading…' : 'Change avatar'}
                  >
                    <Camera size={12} />
                  </button>
                  <input
                    ref={avatarInput}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={(e) => onImagePicked('avatar', e.target.files?.[0])}
                  />
                </>
              )}
            </div>
          </div>
        </div>

        {/* Header */}
        <div className="mt-10 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="font-display tracking-wide text-zinc-900" style={{ fontSize: '22px' }}>
                {channel.name}
              </h1>
              {channel.isVerified && <BadgeCheck size={18} style={{ color: PULSE_RED }} />}
            </div>
            {channel.tagline && (
              <p className="mt-0.5 text-zinc-600" style={{ fontSize: '13.5px' }}>
                {channel.tagline}
              </p>
            )}
            <div
              className="mt-1.5 flex flex-wrap items-center gap-3 font-mono text-zinc-500"
              style={{ fontSize: '11px' }}
              data-size="meta"
            >
              <span>@{channel.handle}</span>
              <span className="inline-flex items-center gap-1">
                <Users size={11} /> {formatCount(channel.followerCount)} followers
              </span>
              {channel.locationText && (
                <span className="inline-flex items-center gap-1">
                  <MapPin size={11} /> {channel.locationText}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-shrink-0 flex-col items-end gap-1.5">
            <FollowButton channelId={channel.id} />
            {isOwner && (
              <>
                <button
                  type="button"
                  onClick={() => setEditOpen(true)}
                  className="inline-flex items-center gap-1 rounded-full border border-zinc-200 px-2.5 py-0.5 font-semibold text-[11.5px] text-zinc-600 transition-colors hover:border-zinc-400 hover:text-zinc-900"
                >
                  <Pencil size={11} /> Edit
                </button>
                <button
                  type="button"
                  onClick={() => setPublishOpen(true)}
                  className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-semibold text-[11.5px] text-white transition-colors hover:brightness-110"
                  style={{ background: PULSE_RED }}
                >
                  <Upload size={11} /> Publish video
                </button>
                <button
                  type="button"
                  onClick={() => setScheduleOpen(true)}
                  className="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-semibold text-[11.5px] transition-colors hover:brightness-110"
                  style={{ borderColor: `${PULSE_RED}60`, color: PULSE_RED }}
                >
                  <CalendarPlus size={11} /> Schedule
                </button>
              </>
            )}
          </div>
        </div>

        {error && (
          <p className="mt-3 text-red-600" style={{ fontSize: '12px' }}>
            {error}
          </p>
        )}

        {/* Live */}
        {live.length > 0 && (
          <BroadcastSection
            title="Live now"
            icon={<Radio size={12} style={{ color: PULSE_RED }} />}
          >
            {live.map((b) => (
              <BroadcastRow key={b.id} b={b} live />
            ))}
          </BroadcastSection>
        )}

        {/* Upcoming */}
        {upcoming.length > 0 && (
          <BroadcastSection title="Upcoming" icon={<CalendarClock size={12} />}>
            {upcoming.map((b) => (
              <BroadcastRow key={b.id} b={b} />
            ))}
          </BroadcastSection>
        )}

        {/* Videos */}
        <BroadcastSection title={`Videos · ${videos.length}`} icon={<Eye size={12} />}>
          {videos.length === 0 ? (
            <li
              className="rounded-lg border border-zinc-200 border-dashed bg-zinc-50 p-5 text-center text-zinc-500"
              style={{ fontSize: '12.5px' }}
            >
              No videos yet.
              {isOwner ? ' Publish your first one — any direct video URL works.' : ''}
            </li>
          ) : (
            videos.map((b) => <BroadcastRow key={b.id} b={b} />)
          )}
        </BroadcastSection>
      </div>

      {editOpen && channel && (
        <ChannelModal
          editing={channel}
          onClose={() => setEditOpen(false)}
          onSaved={() => {
            setEditOpen(false);
            void refresh();
          }}
        />
      )}
      {scheduleOpen && (
        <ScheduleModal
          onClose={() => setScheduleOpen(false)}
          onSaved={() => {
            setScheduleOpen(false);
            void refresh();
          }}
        />
      )}
      {publishOpen && (
        <PublishVodModal
          onClose={() => setPublishOpen(false)}
          onSaved={() => {
            setPublishOpen(false);
            void refresh();
          }}
        />
      )}
    </div>
  );
}

function BroadcastSection({
  title,
  icon,
  children,
}: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h2
        className="mb-2 inline-flex items-center gap-1.5 font-mono uppercase tracking-widest text-zinc-400"
        style={{ fontSize: '11px' }}
        data-size="meta"
      >
        {icon} {title}
      </h2>
      <ul className="space-y-2">{children}</ul>
    </section>
  );
}

function BroadcastRow({ b, live = false }: { b: PulseBroadcast; live?: boolean }) {
  return (
    <li>
      <Link
        to={`/pulse/watch/${b.id}`}
        className={cn(
          'block rounded-lg border bg-white p-3 transition-shadow hover:shadow-md',
          live ? '' : 'border-zinc-200',
        )}
        style={live ? { borderColor: `${PULSE_RED}70`, background: `${PULSE_RED}06` } : undefined}
      >
        <div className="flex items-center justify-between gap-3">
          <h3
            className="min-w-0 truncate font-display leading-tight text-zinc-900"
            style={{ fontSize: '15px' }}
          >
            {b.title}
          </h3>
          {live ? (
            <span
              className="inline-flex flex-shrink-0 items-center gap-1 rounded px-1.5 py-0.5 font-mono font-semibold text-white uppercase"
              style={{ background: PULSE_RED, fontSize: '9px' }}
              data-size="meta"
            >
              <Radio size={9} /> live
            </span>
          ) : b.recordingUrl || b.publishedAt ? (
            <span
              className="flex-shrink-0 font-mono text-zinc-400"
              style={{ fontSize: '10.5px' }}
              data-size="meta"
            >
              {b.durationSec ? formatDuration(b.durationSec) : 'video'}
            </span>
          ) : (
            <span
              className="flex-shrink-0 font-mono"
              style={{ fontSize: '10.5px', color: PULSE_RED }}
              data-size="meta"
            >
              {formatScheduled(b.scheduledAt)}
            </span>
          )}
        </div>
        <div
          className="mt-1.5 flex items-center gap-3 font-mono text-zinc-500"
          style={{ fontSize: '10.5px' }}
          data-size="meta"
        >
          {live ? (
            <span>{formatCount(b.viewerCount)} watching</span>
          ) : (
            <span className="inline-flex items-center gap-1">
              <Eye size={10} /> {formatCount(b.viewCount)}
            </span>
          )}
          {b.commentCount > 0 && <span>{formatCount(b.commentCount)} comments</span>}
        </div>
      </Link>
    </li>
  );
}
