import { FollowButton } from '@/components/pulse/FollowButton';
import { PULSE_RED } from '@/components/pulse/cards';
import { useAuth } from '@/lib/auth';
import { relativeTime } from '@/lib/intel';
import {
  type PulseBroadcast,
  type PulseChannel,
  type PulseClaim,
  type PulseComment,
  addClaim,
  addClaimSource,
  disputeClaim,
  formatDuration,
  formatScheduled,
  getBroadcast,
  listClaims,
  listComments,
  postComment,
  registerView,
  removeComment,
} from '@/lib/pulse';
import { cn, formatCount } from '@/lib/utils';
import {
  ArrowLeft,
  BadgeCheck,
  Ban,
  CalendarClock,
  Eye,
  FileCheck2,
  HandCoins,
  Link2,
  MessageSquare,
  Radio,
  ShieldAlert,
  ShieldQuestion,
  Sparkles,
  Tv,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

/**
 * Watch page — the PULSE broadcast surface. VOD playback is live (external
 * recording URLs); live-stream playback stays LiveKit-gated. Carries the
 * claims ledger (the truth layer) + comments. Send Nectar tips stay gated
 * on the BLiNG! tip rail.
 */
export function WatchPage() {
  const { broadcastId } = useParams<{ broadcastId: string }>();
  const { bee } = useAuth();

  const [broadcast, setBroadcast] = useState<PulseBroadcast | null>(null);
  const [channel, setChannel] = useState<PulseChannel | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [claims, setClaims] = useState<PulseClaim[]>([]);
  const [comments, setComments] = useState<PulseComment[]>([]);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!broadcastId) return;
    const res = await getBroadcast(broadcastId);
    if (!res) {
      setNotFound(true);
      return;
    }
    setBroadcast(res.broadcast);
    setChannel(res.channel);
    const [cl, co] = await Promise.all([
      listClaims(res.broadcast.id),
      listComments(res.broadcast.id),
    ]);
    setClaims(cl);
    setComments(co);
  }, [broadcastId]);

  useEffect(() => {
    setBroadcast(null);
    setNotFound(false);
    refresh().catch((e) => setError(e instanceof Error ? e.message : 'Failed to load broadcast'));
    if (broadcastId) registerView(broadcastId);
  }, [refresh, broadcastId]);

  if (notFound) {
    return (
      <div className="mx-auto max-w-3xl bg-white px-5 py-12 text-center">
        <p className="text-zinc-600" style={{ fontSize: '15px' }}>
          This broadcast doesn't exist, or it was removed.
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

  if (!broadcast) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-10 md:px-8">
        <div className="aspect-video animate-pulse-slow rounded-xl bg-zinc-100" />
        <div className="mt-4 h-7 w-2/3 animate-pulse-slow rounded bg-zinc-200" />
        <div className="mt-3 h-4 w-40 animate-pulse-slow rounded bg-zinc-100" />
      </div>
    );
  }

  const isLive = broadcast.status === 'live';
  const isScheduled = !isLive && !broadcast.recordingUrl && broadcast.scheduledAt != null;

  return (
    <div className="min-h-full bg-white">
      <div className="mx-auto max-w-3xl px-5 py-6 md:px-8 md:py-8">
        <Link
          to="/pulse"
          className="inline-flex items-center gap-1.5 font-mono text-zinc-500 hover:text-zinc-700"
          style={{ fontSize: '12px' }}
          data-size="meta"
        >
          <ArrowLeft size={14} /> PULSE
        </Link>

        {/* Player */}
        <div className="mt-4 overflow-hidden rounded-xl border border-zinc-200 bg-black">
          {broadcast.recordingUrl ? (
            <video
              controls
              playsInline
              preload="metadata"
              className="aspect-video w-full"
              src={broadcast.recordingUrl}
            >
              <track kind="captions" />
            </video>
          ) : (
            <div
              className="flex aspect-video w-full items-center justify-center"
              style={{
                background: `linear-gradient(135deg, ${PULSE_RED}22 0%, #18181B 70%)`,
              }}
            >
              <div className="text-center">
                {isLive ? (
                  <>
                    <Radio size={36} style={{ color: PULSE_RED }} className="mx-auto" />
                    <p className="mt-3 font-display text-lg text-white">LIVE</p>
                    <p className="mt-1 font-mono text-zinc-400" style={{ fontSize: '11px' }}>
                      live playback lands with the LiveKit rail — SOON
                    </p>
                  </>
                ) : isScheduled ? (
                  <>
                    <CalendarClock size={36} style={{ color: PULSE_RED }} className="mx-auto" />
                    <p className="mt-3 font-display text-lg text-white">
                      {formatScheduled(broadcast.scheduledAt)}
                    </p>
                    <p className="mt-1 font-mono text-zinc-400" style={{ fontSize: '11px' }}>
                      scheduled broadcast
                    </p>
                  </>
                ) : (
                  <>
                    <Tv size={36} style={{ color: PULSE_RED }} className="mx-auto" />
                    <p className="mt-3 font-display text-lg text-white">No recording</p>
                    <p className="mt-1 font-mono text-zinc-400" style={{ fontSize: '11px' }}>
                      this broadcast ended without a published recording
                    </p>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Title + meta */}
        <h1
          className="mt-4 font-display leading-tight tracking-wide text-zinc-900"
          style={{ fontSize: '22px' }}
        >
          {broadcast.title}
        </h1>
        <div
          className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-zinc-500"
          style={{ fontSize: '11px' }}
          data-size="meta"
        >
          {isLive ? (
            <span className="inline-flex items-center gap-1" style={{ color: PULSE_RED }}>
              <Radio size={11} /> {formatCount(broadcast.viewerCount)} watching
            </span>
          ) : (
            <span className="inline-flex items-center gap-1">
              <Eye size={11} /> {formatCount(broadcast.viewCount)} views
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <MessageSquare size={11} /> {formatCount(broadcast.commentCount)}
          </span>
          {broadcast.durationSec != null && broadcast.durationSec > 0 && (
            <span>{formatDuration(broadcast.durationSec)}</span>
          )}
          {broadcast.claimPosture && (
            <span
              className="rounded px-1.5 py-0.5 uppercase tracking-wider"
              style={{ background: `${PULSE_RED}12`, color: PULSE_RED, fontSize: '9.5px' }}
            >
              {broadcast.claimPosture}
            </span>
          )}
        </div>

        {/* Channel strip */}
        {channel && (
          <div className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white p-3">
            <Link to={`/pulse/c/${channel.handle}`} className="flex min-w-0 items-center gap-3">
              <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-full border border-zinc-200">
                {channel.avatarUrl ? (
                  <img src={channel.avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div
                    className="flex h-full w-full items-center justify-center font-display"
                    style={{ background: `${PULSE_RED}14`, color: PULSE_RED, fontSize: '16px' }}
                  >
                    {channel.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1">
                  <span
                    className="truncate font-semibold text-zinc-900"
                    style={{ fontSize: '13.5px' }}
                  >
                    {channel.name}
                  </span>
                  {channel.isVerified && <BadgeCheck size={14} style={{ color: PULSE_RED }} />}
                </div>
                <span
                  className="font-mono text-zinc-500"
                  style={{ fontSize: '11px' }}
                  data-size="meta"
                >
                  @{channel.handle} · {formatCount(channel.followerCount)} followers
                </span>
              </div>
            </Link>
            <div className="flex flex-shrink-0 items-center gap-2">
              {/* Send Nectar — tips land with the BLiNG! tip rail. */}
              <button
                type="button"
                disabled
                title="Send Nectar — tips open with the BLiNG! rail (SOON)"
                className="inline-flex cursor-not-allowed items-center gap-1 rounded-full border px-2.5 py-1 font-semibold opacity-60"
                style={{ borderColor: `${PULSE_RED}50`, color: PULSE_RED, fontSize: '11.5px' }}
              >
                <HandCoins size={12} /> Nectar
              </button>
              <FollowButton channelId={channel.id} />
            </div>
          </div>
        )}

        {broadcast.summary && (
          <p
            className="mt-3 whitespace-pre-wrap text-zinc-600"
            style={{ fontSize: '13px', lineHeight: 1.6 }}
          >
            {broadcast.summary}
          </p>
        )}

        {error && (
          <p className="mt-3 text-red-600" style={{ fontSize: '12px' }}>
            {error}
          </p>
        )}

        <ClaimsSection
          broadcastId={broadcast.id}
          claims={claims}
          signedIn={!!bee}
          onChanged={refresh}
        />

        <CommentsSection
          broadcastId={broadcast.id}
          comments={comments}
          myBeeId={bee?.id ?? null}
          onChanged={refresh}
        />
      </div>
    </div>
  );
}

// ───────────────────────────── Claims ─────────────────────────────

function ClaimsSection({
  broadcastId,
  claims,
  signedIn,
  onChanged,
}: {
  broadcastId: string;
  claims: PulseClaim[];
  signedIn: boolean;
  onChanged: () => Promise<void> | void;
}) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!text.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      await addClaim(broadcastId, text.trim());
      setText('');
      await onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add claim');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-6">
      <h2
        className="mb-1 inline-flex items-center gap-1.5 font-mono uppercase tracking-widest text-zinc-400"
        style={{ fontSize: '11px' }}
        data-size="meta"
      >
        <FileCheck2 size={12} /> Claims ledger
      </h2>
      <p className="mb-2 text-zinc-500" style={{ fontSize: '12px' }}>
        Claims made in this broadcast, pinned with sources. Dispute what doesn't hold.
      </p>

      {signedIn && (
        <div className="mb-2 flex items-center gap-1.5">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder="Pin a claim made in this broadcast…"
            className="w-full flex-1 rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-zinc-900 outline-none focus:border-zinc-400"
            style={{ fontSize: '13px' }}
          />
          <button
            type="button"
            onClick={submit}
            disabled={!text.trim() || busy}
            className="flex-shrink-0 rounded-md px-3 py-1.5 font-medium text-white transition-colors hover:brightness-110 disabled:opacity-50"
            style={{ background: PULSE_RED, fontSize: '12.5px' }}
          >
            Pin
          </button>
        </div>
      )}

      {error && (
        <p className="mb-2 text-red-600" style={{ fontSize: '12px' }}>
          {error}
        </p>
      )}

      {claims.length === 0 ? (
        <div
          className="rounded-lg border border-zinc-200 border-dashed bg-zinc-50 p-5 text-center text-zinc-500"
          style={{ fontSize: '12.5px' }}
        >
          No claims pinned yet.
        </div>
      ) : (
        <ul className="divide-y divide-zinc-100 overflow-hidden rounded-lg border border-zinc-200 bg-white">
          {claims.map((c) => (
            <ClaimRow key={c.id} claim={c} signedIn={signedIn} onChanged={onChanged} />
          ))}
        </ul>
      )}
    </section>
  );
}

function ClaimRow({
  claim,
  signedIn,
  onChanged,
}: {
  claim: PulseClaim;
  signedIn: boolean;
  onChanged: () => Promise<void> | void;
}) {
  const [sourceOpen, setSourceOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(fn: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await fn();
      await onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setBusy(false);
    }
  }

  const sourced = claim.sourcesNeeded > 0 && claim.sourcesCount >= claim.sourcesNeeded;

  return (
    <li className="px-3 py-2.5">
      <div className="flex items-start justify-between gap-3">
        <p
          className={cn('min-w-0 text-zinc-800', claim.isDisputed && 'text-zinc-400 line-through')}
          style={{ fontSize: '13px', lineHeight: 1.5 }}
        >
          {claim.text}
        </p>
        <div className="flex flex-shrink-0 items-center gap-1">
          {claim.isAiSurfaced && (
            <span title="Surfaced by AtlasOracle">
              <Sparkles size={12} className="text-zinc-400" />
            </span>
          )}
          <span
            className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono uppercase tracking-wider"
            style={{
              fontSize: '9px',
              color: claim.isDisputed ? '#DC2626' : sourced ? '#16A34A' : '#A16207',
              background: claim.isDisputed ? '#DC262615' : sourced ? '#16A34A15' : '#A1620715',
            }}
            data-size="meta"
          >
            {claim.isDisputed ? (
              <>
                <ShieldAlert size={10} /> disputed
              </>
            ) : sourced ? (
              <>
                <FileCheck2 size={10} /> sourced
              </>
            ) : (
              <>
                <ShieldQuestion size={10} /> {claim.sourcesCount}/{claim.sourcesNeeded || '?'}{' '}
                sources
              </>
            )}
          </span>
        </div>
      </div>

      {signedIn && (
        <div
          className="mt-1.5 flex items-center gap-2 font-mono"
          style={{ fontSize: '10.5px' }}
          data-size="meta"
        >
          <button
            type="button"
            onClick={() => setSourceOpen((v) => !v)}
            className="inline-flex items-center gap-1 text-zinc-500 transition-colors hover:text-zinc-800"
          >
            <Link2 size={10} /> add source
          </button>
          <button
            type="button"
            onClick={() => run(() => disputeClaim(claim.id, !claim.isDisputed))}
            disabled={busy}
            className="inline-flex items-center gap-1 text-zinc-500 transition-colors hover:text-red-600 disabled:opacity-50"
          >
            <Ban size={10} /> {claim.isDisputed ? 'withdraw dispute' : 'dispute'}
          </button>
          <span className="ml-auto text-zinc-400">{relativeTime(claim.createdAt)}</span>
        </div>
      )}

      {sourceOpen && (
        <div className="mt-2 space-y-1.5">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://… source link"
            className="w-full rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 font-mono text-zinc-900 outline-none focus:border-zinc-400"
            style={{ fontSize: '12px' }}
          />
          <div className="flex items-center gap-1.5">
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="note (optional)"
              className="w-full flex-1 rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-zinc-900 outline-none focus:border-zinc-400"
              style={{ fontSize: '12px' }}
            />
            <button
              type="button"
              onClick={() =>
                run(async () => {
                  await addClaimSource(claim.id, url.trim(), note.trim());
                  setUrl('');
                  setNote('');
                  setSourceOpen(false);
                })
              }
              disabled={!url.trim() || busy}
              className="flex-shrink-0 rounded-md px-2.5 py-1.5 font-medium text-white transition-colors hover:brightness-110 disabled:opacity-50"
              style={{ background: PULSE_RED, fontSize: '11.5px' }}
            >
              Attach
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="mt-1 text-red-600" style={{ fontSize: '11px' }}>
          {error}
        </p>
      )}
    </li>
  );
}

// ───────────────────────────── Comments ─────────────────────────────

function CommentsSection({
  broadcastId,
  comments,
  myBeeId,
  onChanged,
}: {
  broadcastId: string;
  comments: PulseComment[];
  myBeeId: string | null;
  onChanged: () => Promise<void> | void;
}) {
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const visible = comments.filter((c) => !c.removed);

  async function submit() {
    if (!body.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      await postComment(broadcastId, body.trim());
      setBody('');
      await onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to post');
    } finally {
      setBusy(false);
    }
  }

  async function onRemove(id: string) {
    setError(null);
    try {
      await removeComment(id);
      await onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to remove');
    }
  }

  return (
    <section className="mt-6">
      <h2
        className="mb-2 font-mono uppercase tracking-widest text-zinc-400"
        style={{ fontSize: '11px' }}
        data-size="meta"
      >
        Comments · {visible.length}
      </h2>

      {myBeeId && (
        <div className="mb-2 flex items-center gap-1.5">
          <input
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder="Say something…"
            className="w-full flex-1 rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-zinc-900 outline-none focus:border-zinc-400"
            style={{ fontSize: '13px' }}
          />
          <button
            type="button"
            onClick={submit}
            disabled={!body.trim() || busy}
            className="flex-shrink-0 rounded-md px-3 py-1.5 font-medium text-white transition-colors hover:brightness-110 disabled:opacity-50"
            style={{ background: PULSE_RED, fontSize: '12.5px' }}
          >
            Post
          </button>
        </div>
      )}

      {error && (
        <p className="mb-2 text-red-600" style={{ fontSize: '12px' }}>
          {error}
        </p>
      )}

      {visible.length === 0 ? (
        <div
          className="rounded-lg border border-zinc-200 border-dashed bg-zinc-50 p-5 text-center text-zinc-500"
          style={{ fontSize: '12.5px' }}
        >
          No comments yet.{myBeeId ? ' Say the first thing.' : ''}
        </div>
      ) : (
        <ul className="divide-y divide-zinc-100 overflow-hidden rounded-lg border border-zinc-200 bg-white">
          {visible.map((c) => (
            <li key={c.id} className="group px-3 py-2">
              <div
                className="flex items-center gap-2 font-mono text-zinc-500"
                style={{ fontSize: '10.5px' }}
                data-size="meta"
              >
                <span className="font-semibold text-zinc-700">
                  {c.handle ? `@${c.handle}` : 'Bee'}
                </span>
                {c.isPinned && <span style={{ color: PULSE_RED }}>pinned</span>}
                <span>{relativeTime(c.createdAt)}</span>
                {myBeeId === c.beeId && (
                  <button
                    type="button"
                    onClick={() => void onRemove(c.id)}
                    className="ml-auto text-zinc-300 opacity-0 transition-opacity hover:text-red-600 group-hover:opacity-100"
                    aria-label="Remove comment"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
              <p className="mt-0.5 text-zinc-800" style={{ fontSize: '13px', lineHeight: 1.5 }}>
                {c.body}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
