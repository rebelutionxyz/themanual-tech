import {
  Award,
  BadgeCheck,
  Briefcase,
  CreditCard,
  Headset,
  Megaphone,
  Radar,
  Signature,
  Store,
  Users,
} from 'lucide-react';
import type { ComponentType } from 'react';
import { Link } from 'react-router-dom';

const BIZ = '#2563EB'; // business blue on the white community shell

interface BizSection {
  icon: ComponentType<{ size?: number | string; style?: React.CSSProperties }>;
  title: string;
  copy: string;
  to?: string;
  linkLabel?: string;
  soon?: boolean;
}

const SECTIONS: BizSection[] = [
  {
    icon: BadgeCheck,
    title: 'Verified presence',
    copy: 'A verified organization profile — gold check, org handle, and your people affiliated under one banner.',
    soon: true,
  },
  {
    icon: Megaphone,
    title: 'Promotions console',
    copy: 'Run contextual promotions through atlasADs: compose creative, pick slots, set your window. Review-before-live keeps the comb clean.',
    to: '/promotion',
    linkLabel: 'Open Advertise',
  },
  {
    icon: Radar,
    title: 'Contextual insights',
    copy: 'Aggregate, no-surveillance reporting — impressions, clicks, and reach by realm, atom, and geo. We report where your promotion ran, never who saw it.',
    soon: true,
  },
  {
    icon: Signature,
    title: 'Premium handles',
    copy: 'Claim the short, memorable handle your organization deserves.',
    to: '/settings/handle',
    linkLabel: 'Claim a handle',
  },
  {
    icon: Store,
    title: 'Venue plans',
    copy: 'Physical venue? Host platform game nights — TheTRIVIA venue rail ships with founding and standard plans.',
    soon: true,
  },
  {
    icon: Users,
    title: 'Hire talent',
    copy: 'Reach ranked, vouched Bees across the five disciplines through Pro Services.',
    soon: true,
  },
  {
    icon: Headset,
    title: 'VIP support',
    copy: 'A direct line. Priority handling for verified organizations.',
    soon: true,
  },
  {
    icon: CreditCard,
    title: 'Billing',
    copy: 'One place for every DONATION, plan, and receipt tied to your organization.',
    soon: true,
  },
];

/**
 * BUSINESS — the organization hub (/business), X-Premium-Business pattern
 * inside the language firewall: grow, credibility, insights — donations,
 * never "sales." Live where the backend exists (Advertise, handles); the
 * fiat-gated sections read honest "opening soon."
 */
export function BusinessPage() {
  return (
    <div className="safe-pad-x mx-auto w-full max-w-4xl px-4 py-8 md:px-8 md:py-10">
      {/* Hero */}
      <div className="mb-10 text-center">
        <div
          className="mb-3 inline-flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-[11px] uppercase tracking-widest"
          style={{ borderColor: `${BIZ}40`, color: BIZ }}
          data-size="meta"
        >
          <Briefcase size={13} /> Business
        </div>
        <h1 className="mx-auto mb-3 max-w-2xl font-display text-4xl font-semibold leading-tight text-zinc-900">
          The fastest way to grow on HoneyComb
        </h1>
        <p className="mx-auto mb-6 max-w-xl text-[14.5px] leading-relaxed text-zinc-500">
          A suite of tools for organizations: <strong className="text-zinc-900">grow your reach</strong>,{' '}
          <strong className="text-zinc-900">build credibility</strong>, and see{' '}
          <strong className="text-zinc-900">real-time contextual insights</strong> — all without
          surveilling a single Bee.
        </p>
        <Link
          to="/promotion"
          className="inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-[14px] font-semibold transition-transform hover:scale-[1.02]"
          style={{ background: '#18181b', color: '#ffffff' }}
        >
          Start now
        </Link>
      </div>

      {/* Section grid */}
      <div className="grid gap-3 sm:grid-cols-2">
        {SECTIONS.map((s) => {
          const Icon = s.icon;
          return (
            <div
              key={s.title}
              className="flex flex-col rounded-xl border border-zinc-200 bg-white p-5"
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-[15px] font-semibold text-zinc-900">
                  <Icon size={17} style={{ color: BIZ }} />
                  {s.title}
                </span>
                {s.soon && (
                  <span
                    className="rounded border border-zinc-200 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest text-zinc-500"
                    data-size="meta"
                  >
                    Opening soon
                  </span>
                )}
              </div>
              <p className="flex-1 text-[13px] leading-relaxed text-zinc-500">{s.copy}</p>
              {s.to && !s.soon && (
                <Link
                  to={s.to}
                  className="mt-3 inline-flex w-fit items-center gap-1.5 rounded-md border px-3 py-1.5 text-[12.5px] font-semibold transition-colors hover:brightness-110"
                  style={{ borderColor: `${BIZ}60`, color: BIZ }}
                >
                  {s.linkLabel}
                </Link>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer principle */}
      <div className="mx-auto mt-8 max-w-2xl rounded-lg border border-zinc-200 bg-zinc-50/60 p-4 text-center">
        <p className="flex items-center justify-center gap-2 font-mono text-[11.5px] leading-relaxed text-zinc-500" data-size="meta">
          <Award size={13} style={{ color: BIZ }} />
          Everything here is a DONATION with benefits — the platform takes nothing it doesn't earn.
        </p>
      </div>
    </div>
  );
}
