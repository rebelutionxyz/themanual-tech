import { SurfaceHeader } from '@/components/shell/SurfaceHeader';
import { SURFACE_FRIENDLY } from '@/components/shell/sidebarNav';
import { useAuth } from '@/lib/auth';
import {
  type Campaign,
  type CampaignSort,
  createCampaign,
  formatMoney,
  fundedFraction,
  listCampaigns,
  listMyCampaigns,
} from '@/lib/campaigns';
import { CARD_INK, realmCardStyle } from '@/lib/realmCardStyle';
import { cn } from '@/lib/utils';
import type { GiveOutletCtx } from '@/pages/give/GiveLayout';
import { useLensStore } from '@/stores/useLensStore';
import { HeartHandshake, Lock } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';

const GIVE_COLOR = '#16A34A';

const SORTS: { id: CampaignSort; label: string }[] = [
  { id: 'recent', label: 'New' },
  { id: 'ending', label: 'Ending' },
  { id: 'most_funded', label: 'Most funded' },
];

/** Slugify a title → lowercase [a-z0-9-], collapsed, 2–60 (matches the RPC check). */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

export function GivePage() {
  const { bee } = useAuth();
  const { view } = useOutletContext<GiveOutletCtx>();
  const [sort, setSort] = useState<CampaignSort>('recent');
  const [campaigns, setCampaigns] = useState<Campaign[] | null>(null);
  const [mine, setMine] = useState<Campaign[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  // The realm strip narrows Discover (give_campaigns.realm_path).
  const realmPath = useLensStore((s) => s.path);

  const load = useCallback(async () => {
    setError(null);
    try {
      if (view === 'discover') {
        setCampaigns(null);
        setCampaigns(await listCampaigns('active', sort, realmPath));
      } else if (view === 'mine') {
        setMine(null);
        setMine(bee?.id ? await listMyCampaigns(bee.id) : []);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load campaigns');
      if (view === 'discover') setCampaigns([]);
      else setMine([]);
    }
  }, [view, sort, realmPath, bee?.id]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 md:px-8 md:py-8">
      <SurfaceHeader friendly={SURFACE_FRIENDLY.give} icon={HeartHandshake} accent={GIVE_COLOR} />

      {view === 'create' &&
        (bee ? (
          <CreateCampaignForm />
        ) : (
          <InfoPanel
            headline="Sign in to start a campaign"
            body="Campaigns are tied to your Bee account."
          />
        ))}

      {view === 'mine' && (
        <>
          {error && <ErrorPanel msg={error} />}
          {!error && mine === null && <CampaignsSkeleton />}
          {!error && mine !== null && mine.length === 0 && (
            <InfoPanel
              headline={bee ? 'No campaigns yet' : 'Sign in to see your campaigns'}
              body={
                bee
                  ? 'Start one from the Create tab — it takes a minute.'
                  : 'Your campaigns are tied to your Bee account.'
              }
            />
          )}
          {!error && mine && mine.length > 0 && (
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {mine.map((c) => (
                <CampaignCard key={c.id} campaign={c} showStatus />
              ))}
            </ul>
          )}
        </>
      )}

      {view === 'discover' && (
        <>
          <div className="mb-4 inline-flex rounded-md border border-zinc-200 bg-zinc-50 p-0.5">
            {SORTS.map((s) => (
              <SortButton key={s.id} active={sort === s.id} onClick={() => setSort(s.id)}>
                {s.label}
              </SortButton>
            ))}
          </div>

          {error && <ErrorPanel msg={error} />}

          {!error && campaigns === null && <CampaignsSkeleton />}

          {!error && campaigns !== null && campaigns.length === 0 && (
            <InfoPanel
              headline="No active campaigns yet"
              body="Be the first to rally support — start one from the Create tab."
            />
          )}

          {!error && campaigns && campaigns.length > 0 && (
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {campaigns.map((c) => (
                <CampaignCard key={c.id} campaign={c} />
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

// ───────────────────────────── Create ─────────────────────────────

function CreateCampaignForm() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [description, setDescription] = useState('');
  const [endsLocal, setEndsLocal] = useState('');
  const [locationText, setLocationText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const effectiveSlug = slugTouched ? slug : slugify(title);
  const titleOk = title.trim().length >= 2;
  const slugOk = /^[a-z0-9-]{2,60}$/.test(effectiveSlug);
  const canSubmit = titleOk && slugOk && !submitting;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const endsIso = endsLocal ? new Date(endsLocal).toISOString() : null;
      const createdSlug = await createCampaign({
        title: title.trim(),
        slug: effectiveSlug,
        description: description.trim() || undefined,
        endsAt: endsIso,
        locationText: locationText.trim() || null,
      });
      navigate(`/give/${createdSlug}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create campaign');
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <div className="rounded-lg border border-zinc-200 bg-white p-5">
        <h2 className="mb-3 font-display tracking-wide text-zinc-900" style={{ fontSize: '18px' }}>
          Start a campaign
        </h2>

        <div className="space-y-3">
          <Field label="Title" hint={`${title.trim().length}/80`}>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={80}
              placeholder="Community mural on 5th Street"
              className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-zinc-400"
              style={{ fontSize: '14px' }}
            />
          </Field>

          <Field
            label="URL slug"
            hint={slugOk ? `/give/${effectiveSlug}` : 'a–z, 0–9, hyphen · 2–60'}
          >
            <input
              value={effectiveSlug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(slugify(e.target.value));
              }}
              maxLength={60}
              placeholder="community-mural"
              className={cn(
                'w-full rounded-md border bg-white px-3 py-2 font-mono text-zinc-900 outline-none focus:border-zinc-400',
                effectiveSlug && !slugOk ? 'border-red-300' : 'border-zinc-200',
              )}
              style={{ fontSize: '13px' }}
            />
          </Field>

          <Field label="Story" hint="what, why, who it helps">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              placeholder="Tell the Hive what you're rallying support for…"
              className="w-full resize-none rounded-md border border-zinc-200 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-zinc-400"
              style={{ fontSize: '14px', lineHeight: 1.5 }}
            />
          </Field>

          <div className="grid grid-cols-2 gap-2">
            <Field label="Ends" hint="optional">
              <input
                type="datetime-local"
                value={endsLocal}
                onChange={(e) => setEndsLocal(e.target.value)}
                className="w-full rounded-md border border-zinc-200 bg-white px-2 py-2 text-zinc-900 outline-none focus:border-zinc-400"
                style={{ fontSize: '13px' }}
              />
            </Field>
            <Field label="Location" hint="optional">
              <input
                value={locationText}
                onChange={(e) => setLocationText(e.target.value)}
                placeholder="City / area"
                className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-zinc-400"
                style={{ fontSize: '13px' }}
              />
            </Field>
          </div>

          {/* Funding — honestly gated until the fiat rail lands. */}
          <div
            className="rounded-md border border-dashed p-3"
            style={{ borderColor: `${GIVE_COLOR}50`, background: `${GIVE_COLOR}0A` }}
          >
            <div
              className="mb-1 inline-flex items-center gap-1.5 font-mono uppercase tracking-wider"
              style={{ fontSize: '10px', color: GIVE_COLOR }}
              data-size="meta"
            >
              <Lock size={10} /> Funding — SOON
            </div>
            <p className="text-zinc-600" style={{ fontSize: '12px', lineHeight: 1.5 }}>
              Your campaign starts in <strong>awareness mode</strong> — rally support now. The
              funding goal and model (all-or-nothing vs keep-what-you-raise) attach the moment the
              donation rail opens, and lock once the first pledge lands.
            </p>
          </div>

          {error && (
            <p className="text-red-600" style={{ fontSize: '12px' }}>
              {error}
            </p>
          )}

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="rounded-md px-4 py-2 font-medium text-white transition-colors hover:brightness-110 disabled:pointer-events-none disabled:opacity-50"
              style={{ background: GIVE_COLOR, fontSize: '14px' }}
            >
              {submitting ? 'Creating…' : 'Start campaign'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <span
          className="font-mono uppercase tracking-wider text-zinc-500"
          style={{ fontSize: '10px' }}
          data-size="meta"
        >
          {label}
        </span>
        {hint && (
          <span className="font-mono text-zinc-400" style={{ fontSize: '10px' }} data-size="meta">
            {hint}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

// ───────────────────────────── Cards ─────────────────────────────

export function CampaignCard({
  campaign,
  showStatus = false,
}: { campaign: Campaign; showStatus?: boolean }) {
  const pct = Math.round(fundedFraction(campaign) * 100);
  const hasGoal = campaign.goalCents > 0;
  return (
    <li>
      <Link
        to={`/give/${campaign.slug}`}
        className="block h-full overflow-hidden rounded-lg p-4 transition-shadow hover:shadow-md"
        style={realmCardStyle(GIVE_COLOR)}
      >
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display text-lg leading-tight" style={{ color: CARD_INK.title }}>
            {campaign.title}
          </h3>
          {showStatus && campaign.status !== 'active' && (
            <span
              className="flex-shrink-0 rounded bg-white/85 px-1.5 py-0.5 font-mono font-semibold uppercase text-zinc-700"
              style={{ fontSize: '9px' }}
              data-size="meta"
            >
              {campaign.status}
            </span>
          )}
        </div>
        {campaign.excerpt && (
          <p
            className="mt-1 line-clamp-2"
            style={{ fontSize: '13px', lineHeight: 1.5, color: CARD_INK.body }}
          >
            {campaign.excerpt}
          </p>
        )}
        {hasGoal ? (
          <>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/15">
              <div
                className="h-full rounded-full"
                style={{ width: `${pct}%`, background: 'rgba(255,255,255,0.9)' }}
              />
            </div>
            <div
              className="mt-1.5 flex items-center justify-between font-mono text-white/65"
              style={{ fontSize: '11px' }}
              data-size="meta"
            >
              <span>
                {formatMoney(campaign.raisedCents, campaign.currency)} of{' '}
                {formatMoney(campaign.goalCents, campaign.currency)}
              </span>
              <span style={{ color: CARD_INK.title }}>{pct}% funded</span>
            </div>
          </>
        ) : (
          <div
            className="mt-3 font-mono text-white/65"
            style={{ fontSize: '11px' }}
            data-size="meta"
          >
            awareness campaign · funding opens later
          </div>
        )}
      </Link>
    </li>
  );
}

function SortButton({
  active,
  onClick,
  children,
}: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-sm px-3 py-1 font-mono transition-all',
        !active && 'text-zinc-500 hover:text-zinc-800',
      )}
      style={{
        fontSize: '12px',
        ...(active ? { color: GIVE_COLOR, background: `${GIVE_COLOR}1A`, fontWeight: 600 } : {}),
      }}
      data-size="meta"
    >
      {children}
    </button>
  );
}

function CampaignsSkeleton() {
  return (
    <ul
      className="grid grid-cols-1 gap-2 sm:grid-cols-2"
      aria-busy="true"
      aria-label="Loading campaigns"
    >
      {[70, 55, 80, 60].map((w, i) => (
        <li
          // biome-ignore lint/suspicious/noArrayIndexKey: decorative loading skeleton, fixed-length static array
          key={i}
          className="animate-pulse rounded-lg border border-zinc-200 bg-white p-4"
          style={{ borderLeft: `3px solid ${GIVE_COLOR}`, animationDelay: `${i * 100}ms` }}
        >
          <div className="h-5 rounded bg-zinc-100" style={{ width: `${w}%` }} />
          <div className="mt-2 h-3 rounded bg-zinc-100" style={{ width: '90%' }} />
          <div className="mt-3 h-1.5 rounded-full bg-zinc-100" />
        </li>
      ))}
    </ul>
  );
}

function ErrorPanel({ msg }: { msg: string }) {
  return (
    <div
      className="rounded-lg border border-red-200 bg-red-50 p-5 text-red-600"
      style={{ fontSize: '13px' }}
    >
      {msg}
    </div>
  );
}

function InfoPanel({ headline, body }: { headline: string; body: string }) {
  return (
    <div
      className="rounded-lg border-2 border-dashed p-8 text-center"
      style={{ borderColor: `${GIVE_COLOR}80`, background: `${GIVE_COLOR}14` }}
    >
      <HeartHandshake size={26} className="mx-auto mb-3" style={{ color: GIVE_COLOR }} />
      <p className="mb-1 font-display text-zinc-900" style={{ fontSize: '17px', fontWeight: 500 }}>
        {headline}
      </p>
      <p className="mx-auto max-w-md text-zinc-500" style={{ fontSize: '13px', lineHeight: 1.5 }}>
        {body}
      </p>
    </div>
  );
}
