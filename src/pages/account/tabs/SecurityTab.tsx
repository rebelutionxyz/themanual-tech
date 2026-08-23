import { useAuth } from '@/lib/auth';
import { KeyRound, LogOut, ShieldCheck } from 'lucide-react';
import type { ReactNode } from 'react';
import { Card, MetaLabel, SectionHead } from '../ui';

/**
 * SECURITY — the account-security panel (PROFILE2). A top-level peer of the
 * SHELL v1.5 your-stuff drawer, lifted out of the old Settings tab so the hub's
 * sections are 1:1 with the drawer items. READ floor: password / 2FA arrive
 * with the auth build and are named honestly rather than faked; Sign out is the
 * one live control here (the drawer's own Sign out is the same action).
 */
export function SecurityTab() {
  const { bee, signOut } = useAuth();
  if (!bee) return null;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <SectionHead title="Sign-in & security" />
        <Row
          icon={<KeyRound size={16} />}
          label="Password & sign-in"
          sub="Change your password, add a second factor"
          right={<Soon />}
        />
        <Row
          icon={<ShieldCheck size={16} />}
          label="Active sessions"
          sub="See where you’re signed in and sign out everywhere"
          right={<Soon />}
        />
      </div>

      <div className="space-y-2">
        <SectionHead title="This device" />
        <Card className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-zinc-100 text-zinc-500">
              <LogOut size={16} />
            </span>
            <div>
              <p className="font-medium text-zinc-900" style={{ fontSize: '14px' }}>
                Sign out
              </p>
              <MetaLabel>End this session on this device</MetaLabel>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void signOut()}
            className="rounded-md border border-zinc-200 px-3 py-1.5 text-zinc-700 transition-colors hover:bg-zinc-50"
            style={{ fontSize: '13px' }}
          >
            Sign out
          </button>
        </Card>
      </div>
    </div>
  );
}

function Row({
  icon,
  label,
  sub,
  right,
}: {
  icon: ReactNode;
  label: string;
  sub: string;
  right: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white p-4">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-md bg-zinc-100 text-zinc-500">
          {icon}
        </span>
        <div>
          <p className="font-medium text-zinc-900" style={{ fontSize: '14px' }}>
            {label}
          </p>
          <MetaLabel>{sub}</MetaLabel>
        </div>
      </div>
      {right}
    </div>
  );
}

function Soon() {
  return (
    <span
      className="font-mono uppercase tracking-wider text-zinc-400"
      style={{ fontSize: '9px' }}
      data-size="meta"
    >
      soon
    </span>
  );
}
