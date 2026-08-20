// HQ — section manifest (HQ1). Registers the shipped HQ sections into the
// self-assembling registry. HQControlRoom imports this module for its side
// effects, then renders getHQSections() — the shell never names a section.
//
// TO ADD A SECTION AS AN ASTRA SHIPS ITS ADMIN FACE:
//   • simplest — import the component here and add one registerHQSection({...})
//     line below, choosing an `order` that slots it where you want in the rail;
//   • or self-register in the Astra's own module and add a side-effect
//     `import '@/…/that-module'` here so it loads (see registry.ts header).
//
// `order` leaves gaps (10s) so new sections drop in without renumbering.

import { registerHQSection } from '@/lib/hq/registry';
import {
  Activity,
  AlertOctagon,
  Atom,
  BarChart3,
  LayoutGrid,
  Megaphone,
  Palette,
  Radio,
  ServerCog,
  SlidersHorizontal,
  TrendingUp,
  UserSearch,
  Users,
  Vote,
  Wallet,
  Wrench,
} from 'lucide-react';

import { ActiveBees } from './ActiveBees';
import { AdminActions } from './AdminActions';
import { AstraQuickAccess } from './AstraQuickAccess';
import { AstraStatus } from './AstraStatus';
import { AtomsAdmin } from './AtomsAdmin';
import { BrandingSection } from './BrandingSection';
import { DispatchBoard } from './DispatchBoard';
import { EconomySnapshot } from './EconomySnapshot';
import { FailedLogins } from './FailedLogins';
import { PageViews } from './PageViews';
import { PatchboardAdmin } from './PatchboardAdmin';
import { PromotionsAdmin } from './PromotionsAdmin';
import { RecentKettleVotes } from './RecentKettleVotes';
import { TreasuryBalances } from './TreasuryBalances';
import { TrendingAtomsAdmin } from './TrendingAtomsAdmin';
import { UsersAdmin } from './UsersAdmin';

registerHQSection({
  order: 10,
  slug: 'dispatch-board',
  label: 'Dispatch Board',
  icon: Radio,
  status: 'live',
  Component: DispatchBoard,
});
registerHQSection({
  order: 20,
  slug: 'failed-logins',
  label: 'Failed Logins',
  icon: AlertOctagon,
  status: 'live',
  Component: FailedLogins,
});
registerHQSection({
  order: 30,
  slug: 'page-views',
  label: 'Page Views',
  icon: BarChart3,
  status: 'live',
  Component: PageViews,
});
registerHQSection({
  order: 40,
  slug: 'active-bees',
  label: 'Active Bees',
  icon: Users,
  status: 'live',
  Component: ActiveBees,
});
registerHQSection({
  order: 45,
  slug: 'users',
  label: 'Users',
  icon: UserSearch,
  status: 'live',
  Component: UsersAdmin,
});
registerHQSection({
  order: 50,
  slug: 'trending-atoms',
  label: 'Trending Atoms',
  icon: TrendingUp,
  status: 'live',
  Component: TrendingAtomsAdmin,
});
registerHQSection({
  order: 55,
  slug: 'atoms',
  label: 'Atoms',
  icon: Atom,
  status: 'live',
  Component: AtomsAdmin,
});
registerHQSection({
  order: 60,
  slug: 'recent-votes',
  label: 'Recent Kettle Votes',
  icon: Vote,
  status: 'live',
  Component: RecentKettleVotes,
});
registerHQSection({
  order: 70,
  slug: 'treasury',
  label: 'Treasury Balances',
  icon: Wallet,
  status: 'live',
  Component: TreasuryBalances,
});
registerHQSection({
  order: 80,
  slug: 'economy',
  label: 'Economy Snapshot',
  icon: Activity,
  status: 'live',
  Component: EconomySnapshot,
});
registerHQSection({
  order: 85,
  slug: 'promotions',
  label: 'Promotions',
  icon: Megaphone,
  status: 'live',
  Component: PromotionsAdmin,
});
registerHQSection({
  order: 90,
  slug: 'astra-status',
  label: 'Astra Status',
  icon: ServerCog,
  status: 'live',
  Component: AstraStatus,
});
registerHQSection({
  order: 100,
  slug: 'quick-access',
  label: 'Quick Access',
  icon: LayoutGrid,
  status: 'live',
  Component: AstraQuickAccess,
});
registerHQSection({
  order: 110,
  slug: 'admin-actions',
  label: 'Admin Actions',
  icon: Wrench,
  status: 'live',
  Component: AdminActions,
});
registerHQSection({
  order: 120,
  slug: 'branding',
  label: 'Branding',
  icon: Palette,
  status: 'live',
  Component: BrandingSection,
});
registerHQSection({
  order: 130,
  slug: 'patchboard',
  label: 'Patchboard',
  icon: SlidersHorizontal,
  status: 'live',
  Component: PatchboardAdmin,
});
