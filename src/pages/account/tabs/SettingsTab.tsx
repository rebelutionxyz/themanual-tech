import { useAuth } from '@/lib/auth';
import { Bell, ChevronRight, Hash, LogOut, MapPin, Plug, ShieldCheck, UserCog } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Card, MetaLabel, SectionHead } from '../ui';

/**
 * SETTINGS — the plain-language control page. READ floor: every editable
 * setting links out to the surface that already owns the write (handle claim,
 * profile). Patchboard-backed toggles (privacy, notifications, connected
 * accounts) are named honestly as arriving with Patchboard rather than faked.
 */
export function SettingsTab() {
  const { bee, signOut } = useAuth();
  if (!bee) return null;

  return (
    <div className="space-y-6">
      {/* Profile + identity */}
      <div className="space-y-2">
        <SectionHead title="Profile & identity" />
        <SettingLink
          to="/profile"
          icon={<UserCog size={16} />}
          label="Edit profile"
          sub="Name, avatar, bio, location"
        />
        <SettingLink
          to="/settings/handle"
          icon={<Hash size={16} />}
          label="Premium handle"
          sub={`You are @${bee.handle} — claim a shorter one`}
        />
      </div>

      {/* Privacy — two-geo presence (MMF s25.7), lands with Patchboard */}
      <div className="space-y-2">
        <SectionHead title="Privacy" hint="Control what other members can see." />
        <SettingSoon
          icon={<MapPin size={16} />}
          label="Presence & location"
          sub="Two-geo visibility — a public place and a private one"
        />
      </div>

      {/* Notifications */}
      <div className="space-y-2">
        <SectionHead title="Notifications" />
        <SettingLink
          to="/notifications"
          icon={<Bell size={16} />}
          label="Your notifications"
          sub="See everything that pinged you"
        />
        <SettingSoon
          icon={<Bell size={16} />}
          label="Notification preferences"
          sub="Choose what reaches you, and how"
        />
      </div>

      {/* Connected accounts → Patchboard */}
      <div className="space-y-2">
        <SectionHead title="Connected accounts" hint="Link the services you use elsewhere." />
        <SettingSoon
          icon={<Plug size={16} />}
          label="Connect an account"
          sub="Arriving with Patchboard — the platform switch system"
        />
      </div>

      {/* Security */}
      <div className="space-y-2">
        <SectionHead title="Security" />
        <SettingSoon
          icon={<ShieldCheck size={16} />}
          label="Password & sign-in"
          sub="Change your password, add a second factor"
        />
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

function Shell({
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

function SettingLink({
  to,
  icon,
  label,
  sub,
}: {
  to: string;
  icon: ReactNode;
  label: string;
  sub: string;
}) {
  return (
    <Link to={to} className="block transition-colors hover:bg-zinc-50/60">
      <Shell
        icon={icon}
        label={label}
        sub={sub}
        right={<ChevronRight size={16} className="text-zinc-300" />}
      />
    </Link>
  );
}

function SettingSoon({ icon, label, sub }: { icon: ReactNode; label: string; sub: string }) {
  return (
    <Shell
      icon={icon}
      label={label}
      sub={sub}
      right={
        <span
          className="font-mono uppercase tracking-wider text-zinc-400"
          style={{ fontSize: '9px' }}
          data-size="meta"
        >
          soon
        </span>
      }
    />
  );
}
