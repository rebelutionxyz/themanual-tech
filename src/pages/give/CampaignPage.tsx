import { MediaPicker } from '@/components/studio/MediaPicker';
import { useAuth } from '@/lib/auth';
import {
  type Campaign,
  type CampaignThread,
  cancelCampaign,
  createCampaignThread,
  formatMoney,
  fundedFraction,
  getCampaignBySlug,
  listCampaignThreads,
  uploadCampaignCover,
} from '@/lib/campaigns';
import { getBeeHandle } from '@/lib/events';
import { relativeTime } from '@/lib/intel';
import { copyAssetToFile } from '@/lib/media';
import { cn, formatCount } from '@/lib/utils';
import {
  ArrowLeft,
  Ban,
  Camera,
  Clock,
  FolderOpen,
  HandCoins,
  HeartHandshake,
  Hourglass,
  MapPin,
  MessageSquare,
  PartyPopper,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

// GIVE green — canonical accent (matches GivePage + CommunityLayout).
const GIVE_COLOR = '#16A34A';

const MODEL_LABEL: Record<string, string> = {
  aon: 'All-or-nothing',
  kwyr: 'Keep-what-you-raise',
};

function daysLeft(endsAt: string | null): number | null {
  if (!endsAt) return null;
  const ms = new Date(endsAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86_400_000));
}

export function CampaignPage() {
  const { slug } = useParams<{ slug: string }>();
  const { bee } = useAuth();

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [threads, setThreads] = useState<CampaignThread[]>([]);
  const [creatorHandle, setCreatorHandle] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [cancelArmed, setCancelArmed] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const coverInput = useRef<HTMLInputElement>(null);
  const [libraryOpen, setLibraryOpen] = useState(false);

  const refresh = useCallback(async () => {
    if (!slug) return;
    const c = await getCampaignBySlug(slug);
    if (!c) {
      setNotFound(true);
      return;
    }
    setCampaign(c);
    const [thr, handle] = await Promise.all([listCampaignThreads(c.id), getBeeHandle(c.createdBy)]);
    setThreads(thr);
    setCreatorHandle(handle);
  }, [slug]);

  useEffect(() => {
    setCampaign(null);
    setNotFound(false);
    setCancelArmed(false);
    refresh().catch((e) => setError(e instanceof Error ? e.message : 'Failed to load campaign'));
  }, [refresh]);

  const isCreator = !!bee?.id && !!campaign && bee.id === campaign.createdBy;
  const isActive = campaign?.status === 'active';

  async function onCancel() {
    if (!campaign || busy) return;
    setBusy(true);
    setError(null);
    try {
      await cancelCampaign(campaign.id);
      setCancelArmed(false);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Cancel failed');
    } finally {
      setBusy(false);
    }
  }

  async function onCoverPicked(file: File | undefined) {
    if (!file || !campaign || uploadingCover) return;
    setUploadingCover(true);
    setError(null);
    try {
      await uploadCampaignCover(campaign.id, file);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploadingCover(false);
    }
  }

  if (notFound) {
    return (
      <div className="safe-pad-x mx-auto max-w-3xl bg-white px-4 py-12 text-center">
        <p className="text-zinc-600" style={{ fontSize: '15px' }}>
          This campaign doesn't exist.
        </p>
        <Link
          to="/give"
          className="mt-3 inline-block"
          style={{ color: GIVE_COLOR, fontSize: '13px' }}
        >
          ← Back to GIVE
        </Link>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="safe-pad-x mx-auto max-w-3xl px-4 py-10">
        <div className="h-40 animate-pulse-slow rounded-lg bg-zinc-100 md:h-56" />
        <div className="mt-4 h-7 w-64 animate-pulse-slow rounded bg-zinc-200" />
        <div className="mt-3 h-4 w-40 animate-pulse-slow rounded bg-zinc-100" />
      </div>
    );
  }

  const pct = Math.round(fundedFraction(campaign) * 100);
  const hasGoal = campaign.goalCents > 0;
  const remaining = daysLeft(campaign.endsAt);

  return (
    <div className="min-h-full bg-white">
      <div className="safe-pad-x mx-auto max-w-3xl px-4 py-6 md:px-8 md:py-8">
        <Link
          to="/give"
          className="mb-3 inline-flex items-center gap-1 font-mono text-zinc-500 transition-colors hover:text-zinc-800"
          style={{ fontSize: '11px' }}
          data-size="meta"
        >
          <ArrowLeft size={11} /> GIVE
        </Link>

        {/* Cover */}
        <div className="relative">
          <div
            className={cn(
              'h-40 overflow-hidden rounded-lg border border-zinc-200 md:h-56',
              campaign.status === 'cancelled' && 'opacity-60 grayscale',
            )}
          >
            {campaign.coverUrl ? (
              <img src={campaign.coverUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div
                className="flex h-full w-full items-center justify-center"
                style={{
                  background: `linear-gradient(135deg, ${GIVE_COLOR}12 0%, ${GIVE_COLOR}55 100%)`,
                }}
              >
                <HeartHandshake size={40} style={{ color: GIVE_COLOR, opacity: 0.5 }} />
              </div>
            )}
          </div>
          {isCreator && isActive && (
            <>
              <button
                type="button"
                onClick={() => setLibraryOpen(true)}
                disabled={uploadingCover}
                className="absolute right-28 bottom-2 inline-flex items-center gap-1.5 rounded-md bg-black/55 px-2.5 py-1 text-white backdrop-blur-sm transition-colors hover:bg-black/70 disabled:opacity-60"
                style={{ fontSize: '11.5px' }}
              >
                <FolderOpen size={12} />
                Library
              </button>
              <button
                type="button"
                onClick={() => coverInput.current?.click()}
                disabled={uploadingCover}
                className="absolute right-2 bottom-2 inline-flex items-center gap-1.5 rounded-md bg-black/55 px-2.5 py-1 text-white backdrop-blur-sm transition-colors hover:bg-black/70 disabled:opacity-60"
                style={{ fontSize: '11.5px' }}
              >
                <Camera size={12} />
                {uploadingCover ? 'Uploading…' : campaign.coverUrl ? 'Change cover' : 'Add cover'}
              </button>
              <input
                ref={coverInput}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={(e) => onCoverPicked(e.target.files?.[0])}
              />
              {libraryOpen && (
                <MediaPicker
                  kinds={['image']}
                  title="Event cover from your Library"
                  onClose={() => setLibraryOpen(false)}
                  onPick={(a) => {
                    setLibraryOpen(false);
                    void copyAssetToFile(a).then((f) => onCoverPicked(f));
                  }}
                />
              )}
            </>
          )}
        </div>

        {/* Status banners */}
        {campaign.status === 'cancelled' && (
          <div
            className="mt-3 inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2.5 font-medium text-zinc-600"
            style={{ fontSize: '13px' }}
            role="status"
          >
            <Ban size={15} /> This campaign was cancelled by its manager.
          </div>
        )}
        {campaign.status === 'funded' && (
          <div
            className="mt-3 inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 font-medium"
            style={{
              fontSize: '13px',
              borderColor: `${GIVE_COLOR}50`,
              background: `${GIVE_COLOR}12`,
              color: GIVE_COLOR,
            }}
            role="status"
          >
            <PartyPopper size={15} /> Funded — this campaign reached its goal.
          </div>
        )}

        {/* Header */}
        <div className="mt-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="font-display tracking-wide text-zinc-900" style={{ fontSize: '24px' }}>
              {campaign.title}
            </h1>
            <div
              className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-zinc-500"
              style={{ fontSize: '12.5px' }}
            >
              {creatorHandle && (
                <span>
                  Managed by{' '}
                  <strong className="font-semibold text-zinc-700">@{creatorHandle}</strong>
                </span>
              )}
              <span
                className="rounded-full border px-2 py-0.5 font-medium"
                style={{ borderColor: `${GIVE_COLOR}50`, color: GIVE_COLOR, fontSize: '11px' }}
              >
                {campaign.fundingModel
                  ? (MODEL_LABEL[campaign.fundingModel] ?? campaign.fundingModel)
                  : 'Awareness campaign'}
              </span>
              {campaign.locationText && (
                <span className="inline-flex items-center gap-1">
                  <MapPin size={11} /> {campaign.locationText}
                </span>
              )}
              {remaining !== null && isActive && (
                <span className="inline-flex items-center gap-1">
                  <Hourglass size={11} />
                  {remaining === 0 ? 'ends today' : `${remaining}d left`}
                </span>
              )}
            </div>
          </div>

          {/* Manager controls */}
          {isCreator && isActive && (
            <div className="flex flex-shrink-0 flex-col items-end gap-1.5">
              {cancelArmed ? (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={onCancel}
                    disabled={busy}
                    className="rounded-full bg-red-600 px-2.5 py-0.5 font-semibold text-[11.5px] text-white transition-colors hover:bg-red-700 disabled:opacity-50"
                  >
                    Confirm cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => setCancelArmed(false)}
                    className="rounded-full border border-zinc-200 px-2 py-0.5 font-semibold text-[11.5px] text-zinc-500 hover:text-zinc-800"
                  >
                    Keep
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setCancelArmed(true)}
                  className="inline-flex items-center gap-1 rounded-full border border-red-200 px-2.5 py-0.5 font-semibold text-[11.5px] text-red-600 transition-colors hover:bg-red-50"
                  title="Only possible while the campaign has no pledges"
                >
                  <Ban size={11} /> Cancel campaign
                </button>
              )}
            </div>
          )}
        </div>

        {/* Progress */}
        {hasGoal ? (
          <div className="mt-4 rounded-lg border border-zinc-200 bg-white p-4">
            <div className="h-2 overflow-hidden rounded-full bg-zinc-100">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${pct}%`, background: GIVE_COLOR }}
              />
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-zinc-900" style={{ fontSize: '15px' }}>
                <strong className="font-display" style={{ fontSize: '20px', color: GIVE_COLOR }}>
                  {formatMoney(campaign.raisedCents, campaign.currency)}
                </strong>{' '}
                raised of {formatMoney(campaign.goalCents, campaign.currency)} goal
              </span>
              <span
                className="font-mono text-zinc-500"
                style={{ fontSize: '11.5px' }}
                data-size="meta"
              >
                {pct}% funded
              </span>
            </div>
          </div>
        ) : (
          isActive && (
            <div
              className="mt-4 rounded-lg border border-dashed p-4 text-zinc-600"
              style={{
                borderColor: `${GIVE_COLOR}50`,
                background: `${GIVE_COLOR}08`,
                fontSize: '13px',
              }}
            >
              This campaign is rallying support in <strong>awareness mode</strong> — its funding
              goal attaches when the donation rail opens.
            </div>
          )
        )}

        {/* Donate — honestly gated until the fiat rail lands. */}
        {isActive && (
          <div className="mt-3 flex items-center gap-3">
            <button
              type="button"
              disabled
              className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-md px-4 py-2 font-medium text-white opacity-60"
              style={{ background: GIVE_COLOR, fontSize: '14px' }}
              title="Donations open with the fiat rail"
            >
              <HandCoins size={15} /> Donate
            </button>
            <span
              className="font-mono uppercase tracking-wider"
              style={{ fontSize: '10px', color: GIVE_COLOR }}
              data-size="meta"
            >
              SOON — donations open with the fiat rail
            </span>
          </div>
        )}

        {error && (
          <p className="mt-3 text-red-600" style={{ fontSize: '12px' }}>
            {error}
          </p>
        )}

        {/* Story */}
        {campaign.description && (
          <p
            className="mt-4 whitespace-pre-wrap border-zinc-100 border-t pt-4 text-zinc-600"
            style={{ fontSize: '13.5px', lineHeight: 1.65 }}
          >
            {campaign.description}
          </p>
        )}

        {/* Discussion */}
        <section className="mt-6">
          <h2
            className="mb-2 font-mono uppercase tracking-widest text-zinc-400"
            style={{ fontSize: '11px' }}
            data-size="meta"
          >
            Discussion
          </h2>
          {bee && <CampaignThreadComposer campaignId={campaign.id} onPosted={refresh} />}
          {threads.length === 0 ? (
            <div
              className="rounded-lg border border-zinc-200 border-dashed bg-zinc-50 p-6 text-center text-zinc-500"
              style={{ fontSize: '13px' }}
            >
              No discussion yet.{bee ? ' Start the first thread.' : ''}
            </div>
          ) : (
            <ul className="space-y-2">
              {threads.map((t) => (
                <li key={t.id}>
                  <Link
                    to={`/intel/t/${t.id}`}
                    className="group block rounded-lg border border-zinc-200 bg-white p-3 transition-shadow hover:shadow-md"
                  >
                    <h3
                      className="font-display leading-tight text-zinc-900"
                      style={{ fontSize: '15px' }}
                    >
                      {t.title}
                    </h3>
                    <div
                      className="mt-2 flex items-center gap-3 font-mono text-zinc-500"
                      style={{ fontSize: '10.5px' }}
                      data-size="meta"
                    >
                      <span className="inline-flex items-center gap-1">
                        <MessageSquare size={10} /> {formatCount(t.replyCount)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock size={10} /> {relativeTime(t.lastActivityAt)}
                      </span>
                      {t.authorHandle && <span>@{t.authorHandle}</span>}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function CampaignThreadComposer({
  campaignId,
  onPosted,
}: { campaignId: string; onPosted: () => Promise<void> | void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function post() {
    if (!title.trim() || posting) return;
    setPosting(true);
    setError(null);
    try {
      await createCampaignThread(campaignId, title.trim(), body.trim());
      setTitle('');
      setBody('');
      setOpen(false);
      await onPosted();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to post');
    } finally {
      setPosting(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mb-2 w-full rounded-lg border border-zinc-200 border-dashed bg-zinc-50 px-4 py-2.5 text-left text-zinc-500 transition-colors hover:border-zinc-300 hover:text-zinc-700"
        style={{ fontSize: '13px' }}
      >
        Start a discussion thread…
      </button>
    );
  }

  return (
    <div className="mb-2 rounded-lg border border-zinc-200 bg-white p-3">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Thread title"
        className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-zinc-400"
        style={{ fontSize: '14px' }}
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        placeholder="Say something…"
        className="mt-2 w-full resize-none rounded-md border border-zinc-200 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-zinc-400"
        style={{ fontSize: '14px', lineHeight: 1.5 }}
      />
      {error && (
        <p className="mt-1 text-red-600" style={{ fontSize: '12px' }}>
          {error}
        </p>
      )}
      <div className="mt-2 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-md px-3 py-1.5 text-zinc-500 hover:text-zinc-800"
          style={{ fontSize: '13px' }}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={post}
          disabled={!title.trim() || posting}
          className="rounded-md px-4 py-1.5 font-medium text-white transition-colors hover:brightness-110 disabled:opacity-50"
          style={{ background: GIVE_COLOR, fontSize: '13px' }}
        >
          {posting ? 'Posting…' : 'Post'}
        </button>
      </div>
    </div>
  );
}
