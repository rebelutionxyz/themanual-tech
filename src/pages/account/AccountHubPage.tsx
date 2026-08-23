import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';
import {
  Activity,
  CircleUser,
  Crown,
  Loader2,
  LogOut,
  Package,
  Settings,
  ShieldCheck,
  Tag,
  Wallet,
} from 'lucide-react';
import type { ComponentType } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { ACCOUNT_ACCENT } from './accent';
import { ActivityTab } from './tabs/ActivityTab';
import { MembershipsTab } from './tabs/MembershipsTab';
import { OrdersTab } from './tabs/OrdersTab';
import { ProfileTab } from './tabs/ProfileTab';
import { SalesTab } from './tabs/SalesTab';
import { SecurityTab } from './tabs/SecurityTab';
import { SettingsTab } from './tabs/SettingsTab';
import { WalletTab } from './tabs/WalletTab';

type IconC = ComponentType<{ size?: number | string; className?: string }>;
type TabId =
  | 'profile'
  | 'settings'
  | 'activity'
  | 'orders'
  | 'memberships'
  | 'sales'
  | 'wallet'
  | 'security';

// Order + set are 1:1 with the SHELL v1.5 your-stuff drawer
// (Profile / Settings / Activity / Orders / Memberships / Sales / BLiNG! wallet
// / Security / Sign out). Sign out is the drawer's last item; it is an action,
// not a section, so it renders as the trailing button below rather than a tab.
const TABS: { id: TabId; label: string; icon: IconC }[] = [
  { id: 'profile', label: 'Profile', icon: CircleUser },
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'activity', label: 'Activity', icon: Activity },
  { id: 'orders', label: 'Orders', icon: Package },
  { id: 'memberships', label: 'Memberships', icon: Crown },
  { id: 'sales', label: 'Sales', icon: Tag },
  { id: 'wallet', label: 'BLiNG! wallet', icon: Wallet },
  { id: 'security', label: 'Security', icon: ShieldCheck },
];

const IS_TAB = new Set<string>(TABS.map((t) => t.id));

/**
 * ACCOUNT HUB (PROFILE1) — the @user account home. One legible surface for
 * everything a member is and does: profile, wallet, orders, sales, memberships,
 * activity, settings. Mounted inside the community white shell (see App.tsx +
 * CommunityLayout's `account` surface). READ floor — it presents existing data;
 * every write links out to the surface that already owns it. The toolbar avatar
 * and the sidebar's Account item both open this.
 */
export function AccountHubPage() {
  const { bee, loading, signOut } = useAuth();
  const [params, setParams] = useSearchParams();

  const raw = params.get('tab') ?? 'profile';
  const active: TabId = (IS_TAB.has(raw) ? raw : 'profile') as TabId;

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-zinc-400" />
      </div>
    );
  }
  if (!bee) return <Navigate to="/login" replace />;

  function select(id: TabId) {
    // Preserve a shareable, back-navigable URL per section.
    setParams(id === 'profile' ? {} : { tab: id }, { replace: false });
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-7 md:px-8">
      {/* Header */}
      <div className="mb-5 flex items-center gap-3">
        <div
          className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border-2"
          style={{ borderColor: `${ACCOUNT_ACCENT}40`, background: `${ACCOUNT_ACCENT}0D` }}
        >
          <CircleUser size={22} style={{ color: ACCOUNT_ACCENT }} />
        </div>
        <div className="min-w-0">
          <h1
            className="font-display text-3xl font-semibold tracking-wide"
            style={{ color: ACCOUNT_ACCENT }}
          >
            Your account
          </h1>
          <p className="font-mono text-zinc-500" style={{ fontSize: '12px' }} data-size="meta">
            {bee.handle} · everything you are and do, in one place
          </p>
        </div>
      </div>

      {/* Tab bar — horizontally scrollable on narrow screens */}
      <div className="mb-6 flex gap-1 overflow-x-auto border-b border-zinc-200 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {TABS.map((t) => {
          const on = t.id === active;
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => select(t.id)}
              className={cn(
                '-mb-px flex flex-shrink-0 items-center gap-1.5 border-b-2 px-3 py-2 font-medium transition-colors',
                on ? '' : 'border-transparent text-zinc-500 hover:text-zinc-800',
              )}
              style={
                on
                  ? { borderColor: ACCOUNT_ACCENT, color: ACCOUNT_ACCENT, fontSize: '14px' }
                  : { fontSize: '14px' }
              }
            >
              <Icon size={15} />
              {t.label}
            </button>
          );
        })}

        {/* Sign out — the drawer's last item. An action, not a section: it ends
            the session rather than switching the panel. Pushed to the end and
            tinted like a leave-action so it never reads as another tab. */}
        <button
          type="button"
          onClick={() => void signOut()}
          className="-mb-px ml-auto flex flex-shrink-0 items-center gap-1.5 border-b-2 border-transparent px-3 py-2 font-medium text-zinc-400 transition-colors hover:text-zinc-700"
          style={{ fontSize: '14px' }}
        >
          <LogOut size={15} />
          Sign out
        </button>
      </div>

      {/* Active section */}
      {active === 'profile' && <ProfileTab />}
      {active === 'wallet' && <WalletTab />}
      {active === 'orders' && <OrdersTab />}
      {active === 'sales' && <SalesTab />}
      {active === 'memberships' && <MembershipsTab />}
      {active === 'activity' && <ActivityTab />}
      {active === 'settings' && <SettingsTab />}
      {active === 'security' && <SecurityTab />}
    </div>
  );
}
