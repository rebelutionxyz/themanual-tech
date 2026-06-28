import { SurfaceHeader } from '@/components/shell/SurfaceHeader';
import { SURFACE_FRIENDLY } from '@/components/shell/sidebarNav';
import { useAuth } from '@/lib/auth';
import { type Campaign, type CampaignSort, fundedFraction, listCampaigns } from '@/lib/campaigns';
import { CARD_INK, realmCardStyle } from '@/lib/realmCardStyle';
import { cn, formatCount } from '@/lib/utils';
import type { GiveOutletCtx } from '@/pages/give/GiveLayout';
import { useLensStore } from '@/stores/useLensStore';
import { HeartHandshake } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';

const GIVE_COLOR = '#16A34A';

const SORTS: { id: CampaignSort; label: string }[] = [
  { id: 'recent', label: 'New' },
  { id: 'ending', label: 'Ending' },
  { id: 'most_funded', label: 'Most funded' },
];

export function GivePage() {
  const { bee } = useAuth();
  const { view } = useOutletContext<GiveOutletCtx>();
  const [sort, setSort] = useState<CampaignSort>('recent');
  const [campaigns, setCampaigns] = useState<Campaign[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  // The realm strip narrows Discover (give_campaigns.realm_path).
  const realmPath = useLensStore((s) => s.path);

  const load = useCallback(async () => {
    if (view !== 'discover') return;
    setCampaigns(null);
    setError(null);
    try {
      setCampaigns(await listCampaigns('active', sort, realmPath));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load campaigns');
      setCampaigns([]);
    }
  }, [view, sort, realmPath]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 md:px-8 md:py-8">
      <SurfaceHeader friendly={SURFACE_FRIENDLY.give} icon={HeartHandshake} accent={GIVE_COLOR} />

      {view === 'create' && (
        <InfoPanel
          headline="Campaign creation is coming soon"
          body="The GiVE donation flow lands with the BLiNG! escrow rails. Discover and follow active campaigns in the meantime."
        />
      )}

      {view === 'mine' && (
        <InfoPanel
          headline={bee ? 'No campaigns yet' : 'Sign in to see your campaigns'}
          body={
            bee
              ? 'Campaigns you start will appear here once campaign creation lands.'
              : 'Your campaigns are tied to your Bee account.'
          }
        />
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

          {error && (
            <div
              className="rounded-lg border border-red-200 bg-red-50 p-5 text-red-600"
              style={{ fontSize: '13px' }}
            >
              {error}
            </div>
          )}

          {!error && campaigns === null && <CampaignsSkeleton />}

          {!error && campaigns !== null && campaigns.length === 0 && (
            <InfoPanel
              headline="No active campaigns yet"
              body="Be the first to rally support. Campaign creation lands with the BLiNG! escrow rails."
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

function CampaignCard({ campaign }: { campaign: Campaign }) {
  const pct = Math.round(fundedFraction(campaign) * 100);
  return (
    <li>
      {/* Detail page not built yet — non-navigating card. */}
      <div
        className="block h-full overflow-hidden rounded-lg p-4"
        style={realmCardStyle(GIVE_COLOR)}
      >
        <h3 className="font-display text-lg leading-tight" style={{ color: CARD_INK.title }}>
          {campaign.title}
        </h3>
        {campaign.excerpt && (
          <p
            className="mt-1 line-clamp-2"
            style={{ fontSize: '13px', lineHeight: 1.5, color: CARD_INK.body }}
          >
            {campaign.excerpt}
          </p>
        )}
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
            {formatCount(Math.round(campaign.raisedCents / 100))} /{' '}
            {formatCount(Math.round(campaign.goalCents / 100))} {campaign.currency}
          </span>
          <span style={{ color: CARD_INK.title }}>{pct}% funded</span>
        </div>
      </div>
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
        ...(active ? { color: '#B8932F', background: `${GIVE_COLOR}33`, fontWeight: 600 } : {}),
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

function InfoPanel({ headline, body }: { headline: string; body: string }) {
  return (
    <div
      className="rounded-lg border-2 border-dashed p-8 text-center"
      style={{ borderColor: `${GIVE_COLOR}80`, background: `${GIVE_COLOR}14` }}
    >
      <HeartHandshake size={26} className="mx-auto mb-3" style={{ color: '#B8932F' }} />
      <p className="mb-1 font-display text-zinc-900" style={{ fontSize: '17px', fontWeight: 500 }}>
        {headline}
      </p>
      <p className="mx-auto max-w-md text-zinc-500" style={{ fontSize: '13px', lineHeight: 1.5 }}>
        {body}
      </p>
    </div>
  );
}
