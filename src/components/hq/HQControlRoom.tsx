// HQ Control Room — admin operational dashboard.
//
// Auth gate: requires the authenticated Bee to have bees.is_admin = true.
// Per shared/canon/og-human-v1-authority-canon.md §3: at v1 only one Bee
// (OG HUMAN / Butch) carries is_admin; all other Bees are denied. Director
// roles deferred until post-Swarm.
//
// Section routing: react-router useLocation().hash drives the active panel.
// Reload-safe + deep-linkable via /hq#failed-logins style URLs. Default
// section on entry: 'failed-logins'.
//
// Per shared/canon/manual-spine-api-v1.md §4 (9-section spec). This dispatch
// wires 3 live sections (FailedLogins, PageViews, TrendingAtomsAdmin);
// the other 6 ship as stubs that land in HQ-2 + HQ-3 dispatches.

import { useEffect, useMemo, useRef, useState, type ComponentType } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  AlertOctagon, BarChart3, TrendingUp, Users, Vote,
  Wallet, Activity, ServerCog, Wrench, ShieldAlert,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { FailedLogins } from './sections/FailedLogins';
import { PageViews } from './sections/PageViews';
import { TrendingAtomsAdmin } from './sections/TrendingAtomsAdmin';
import { ActiveBees } from './sections/ActiveBees';
import { RecentKettleVotes } from './sections/RecentKettleVotes';
import { TreasuryBalances } from './sections/TreasuryBalances';
import { EconomySnapshot } from './sections/EconomySnapshot';
import { AstraStatus } from './sections/AstraStatus';
import { AdminActions } from './sections/AdminActions';

interface SectionDef {
  slug: string;
  label: string;
  icon: LucideIcon;
  status: 'live' | 'stub';
  Component: ComponentType;
}

const SECTIONS: SectionDef[] = [
  { slug: 'failed-logins',     label: 'Failed Logins',        icon: AlertOctagon, status: 'live', Component: FailedLogins },
  { slug: 'page-views',        label: 'Page Views',           icon: BarChart3,    status: 'live', Component: PageViews },
  { slug: 'trending-atoms',    label: 'Trending Atoms',       icon: TrendingUp,   status: 'live', Component: TrendingAtomsAdmin },
  { slug: 'active-bees',       label: 'Active Bees',          icon: Users,        status: 'live', Component: ActiveBees },
  { slug: 'recent-votes',      label: 'Recent Kettle Votes',  icon: Vote,         status: 'live', Component: RecentKettleVotes },
  { slug: 'treasury',          label: 'Treasury Balances',    icon: Wallet,       status: 'live', Component: TreasuryBalances },
  { slug: 'economy',           label: 'Economy Snapshot',     icon: Activity,     status: 'live', Component: EconomySnapshot },
  { slug: 'astra-status',      label: 'Astra Status',         icon: ServerCog,    status: 'live', Component: AstraStatus },
  { slug: 'admin-actions',     label: 'Admin Actions',        icon: Wrench,       status: 'live', Component: AdminActions },
];

const DEFAULT_SECTION = SECTIONS[0].slug;

export function HQControlRoom() {
  const { bee, loading: authLoading } = useAuth();
  const [adminCheck, setAdminCheck] = useState<{ checked: boolean; isAdmin: boolean; error: string | null }>({
    checked: false, isAdmin: false, error: null,
  });

  // Query bees.is_admin for the current Bee. useAuth's bee object does not
  // carry the is_admin field, so we look it up directly. RLS allows bees to
  // read their own row.
  useEffect(() => {
    if (authLoading) return;
    if (!bee) {
      setAdminCheck({ checked: true, isAdmin: false, error: null });
      return;
    }
    if (!supabase) {
      setAdminCheck({ checked: true, isAdmin: false, error: 'Supabase not configured' });
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('bees')
        .select('is_admin')
        .eq('id', bee.id)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        setAdminCheck({ checked: true, isAdmin: false, error: error.message });
        return;
      }
      setAdminCheck({ checked: true, isAdmin: !!data?.is_admin, error: null });
    })();
    return () => { cancelled = true; };
  }, [bee, authLoading]);

  if (authLoading || !adminCheck.checked) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-pulse-slow rounded-full border-2 border-text-silver/30 border-t-text-silver" />
      </div>
    );
  }

  if (!bee) return <Gate title="HQ requires Bee authentication" body="Sign in with an admin Bee to access the HQ Control Room." />;
  if (!adminCheck.isAdmin) return <Gate title="HQ Control Room is OG HUMAN only" body="Per og-human-v1 authority canon — Director and Treasury Council roles are deferred until post-Swarm. v1 admin access is restricted to bees.is_admin = true (currently a single OG HUMAN Bee)." />;

  return <HQShell bee={bee} />;
}

function Gate({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="max-w-lg rounded-lg border border-border bg-bg-elevated p-8 text-center">
        <ShieldAlert size={28} className="mx-auto mb-4 text-text-silver/60" aria-hidden />
        <h1 className="font-display text-xl font-semibold text-text-silver-bright">{title}</h1>
        <p className="mt-3 text-text-dim" style={{ fontSize: '13px' }}>{body}</p>
      </div>
    </div>
  );
}

function HQShell({ bee }: { bee: { handle: string } }) {
  const location = useLocation();
  const navigate = useNavigate();

  const activeSlug = useMemo(() => {
    const h = location.hash.replace(/^#/, '');
    return SECTIONS.find((s) => s.slug === h) ? h : DEFAULT_SECTION;
  }, [location.hash]);

  const active = SECTIONS.find((s) => s.slug === activeSlug) ?? SECTIONS[0];
  const ActiveComponent = active.Component;

  // Section pane scrolls internally; reset it to the top when the active
  // section changes so the title lands just under the HQ header, not scrolled.
  const sectionRef = useRef<HTMLElement>(null);
  // biome-ignore lint/correctness/useExhaustiveDependencies: activeSlug is the trigger — reset the section scroll whenever the active section changes
  useEffect(() => {
    sectionRef.current?.scrollTo({ top: 0 });
  }, [activeSlug]);

  // Self-contained layout (matches Intel/Manual/Dingleberry): HQ fills its pane
  // below the global chrome and scrolls internally, so the sticky SiteHeader +
  // TopToolbar never clip its top. The HQ header is static at the top of this
  // pane (which already sits below the global chrome) — no header-height math.
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      {/* HQ header — static at the top of the self-contained pane */}
      <header className="flex-none border-b border-border bg-bg-elevated/95 px-4 py-3 backdrop-blur md:px-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-lg font-semibold text-text-silver-bright">HQ Control Room</h1>
            <p className="font-mono text-text-muted" style={{ fontSize: '11px' }}>
              admin: @{bee.handle}
            </p>
          </div>
          <span className="font-mono uppercase tracking-wider text-text-muted" style={{ fontSize: '10px' }}>
            v1 · OG HUMAN gate
          </span>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col md:grid md:grid-cols-[16rem_1fr]">
        {/* Sidebar */}
        <aside className="flex-none overflow-y-auto border-b border-border bg-bg-elevated/30 px-3 py-4 md:border-b-0 md:border-r md:py-6">
          <nav className="flex flex-col gap-0.5">
            {SECTIONS.map((s, i) => {
              const Icon = s.icon;
              const isActive = s.slug === activeSlug;
              return (
                <button
                  type="button"
                  key={s.slug}
                  onClick={() => navigate(`/hq#${s.slug}`)}
                  className={cn(
                    'flex items-center gap-2.5 rounded-md border-l-2 px-3 py-2 text-sm transition-colors',
                    isActive
                      ? 'border-text-silver bg-bg-elevated text-text'
                      : 'border-transparent text-text-muted hover:bg-bg-elevated/50 hover:text-text-silver',
                  )}
                >
                  <span className="font-mono text-text-muted" style={{ fontSize: '10px', minWidth: '1.25em' }}>
                    {i + 1}
                  </span>
                  <Icon size={15} aria-hidden />
                  <span className="flex-1 text-left">{s.label}</span>
                  {s.status === 'stub' && (
                    <span
                      className="rounded-sm bg-text-muted/15 px-1.5 py-0.5 font-mono uppercase text-text-muted"
                      style={{ fontSize: '9px' }}
                    >
                      soon
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Active section — scrolls internally within the pane */}
        <main ref={sectionRef} className="min-w-0 flex-1 overflow-y-auto px-4 py-6 md:px-8 md:py-8">
          <ActiveComponent />
        </main>
      </div>
    </div>
  );
}
