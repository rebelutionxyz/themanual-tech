import { useAuth } from '@/lib/auth';
import {
  Eye,
  LayoutList,
  Megaphone,
  PanelRight,
  Rocket,
  ScrollText,
  ShieldCheck,
  Store,
} from 'lucide-react';
import type { ComponentType } from 'react';
import { Link } from 'react-router-dom';

const AD = '#0D9488'; // atlasADs teal on the white community shell

interface SlotCard {
  icon: ComponentType<{ size?: number | string; style?: React.CSSProperties }>;
  name: string;
  copy: string;
}

const SLOTS: SlotCard[] = [
  {
    icon: ScrollText,
    name: 'Top ticker',
    copy: 'The scrolling band above every surface — platform-wide reach, one line at a time.',
  },
  {
    icon: LayoutList,
    name: 'Feed inline',
    copy: 'One labeled card inside the thread feed, matched to the realm being read.',
  },
  {
    icon: PanelRight,
    name: 'Sidebar promoted',
    copy: 'A steady placement on the right rail, scoped to realm, branch, or atom.',
  },
];

/**
 * ADVERTISE — the promotion surface (/promotion), white community shell.
 * Two paths per atlasADs canon [LOCKED 2026-06-07]: Boost (member quick-path,
 * BLiNG! to the Well) and the atlasADs commercial console (fiat, KYC,
 * review-before-live — opens with the fiat rail). Targeting is contextual
 * only: content and context a Bee chooses — never a profile of the Bee.
 */
export function AdvertisePage() {
  const { bee } = useAuth();

  return (
    <div className="safe-pad-x mx-auto w-full max-w-4xl px-4 py-8 md:px-8 md:py-10">
      {/* Hero */}
      <div className="mb-8 text-center">
        <div
          className="mb-3 inline-flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-[11px] uppercase tracking-widest"
          style={{ borderColor: `${AD}40`, color: AD }}
          data-size="meta"
        >
          <Megaphone size={13} /> Advertise
        </div>
        <h1 className="mx-auto mb-3 max-w-2xl font-display text-4xl font-semibold leading-tight text-zinc-900">
          Reach Bees where they already are
        </h1>
        <p className="mx-auto max-w-xl text-[14.5px] leading-relaxed text-zinc-500">
          Bee-funded promotion — transparent, opt-in, and contextual. Your placement follows the{' '}
          <strong className="text-zinc-900">content</strong>, never the person reading it.
        </p>
      </div>

      {/* Two paths */}
      <div className="mb-8 grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col rounded-xl border border-zinc-200 bg-white p-5">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 text-[15px] font-semibold text-zinc-900">
              <Rocket size={17} style={{ color: AD }} />
              Boost — for Bees
            </span>
            <span
              className="rounded border border-zinc-200 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest text-zinc-500"
              data-size="meta"
            >
              Opening soon
            </span>
          </div>
          <p className="flex-1 text-[13px] leading-relaxed text-zinc-500">
            The member quick-path: boost your own thread, campaign, or event with a flat BLiNG!
            DONATION to the Well. Your content already passed moderation, so boosts run
            innocent-until-flagged — social amplification, not commercial intrusion.
          </p>
          {!bee && (
            <p className="mt-3 font-mono text-[11px] text-zinc-400" data-size="meta">
              Sign in to boost your posts when it opens.
            </p>
          )}
        </div>

        <div className="flex flex-col rounded-xl border border-zinc-200 bg-white p-5">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 text-[15px] font-semibold text-zinc-900">
              <Store size={17} style={{ color: AD }} />
              atlasADs — commercial console
            </span>
            <span
              className="rounded border border-zinc-200 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest text-zinc-500"
              data-size="meta"
            >
              Opening soon
            </span>
          </div>
          <p className="flex-1 text-[13px] leading-relaxed text-zinc-500">
            The self-serve console for verified organizations: compose creative, pick a slot and
            contextual target, set your window and budget at a flat reach-scope rate — then
            review-before-live keeps the comb clean. Opens with the fiat rail; see{' '}
            <Link to="/business" className="underline" style={{ color: AD }}>
              Business
            </Link>{' '}
            for the full org suite.
          </p>
        </div>
      </div>

      {/* Slots */}
      <h2
        className="mb-3 font-mono text-[11px] uppercase tracking-widest text-zinc-500"
        data-size="meta"
      >
        The three slots
      </h2>
      <div className="mb-8 grid gap-3 sm:grid-cols-3">
        {SLOTS.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.name} className="rounded-xl border border-zinc-200 bg-white p-4">
              <p className="mb-1.5 flex items-center gap-2 text-[14px] font-semibold text-zinc-900">
                <Icon size={15} style={{ color: AD }} />
                {s.name}
              </p>
              <p className="text-[12.5px] leading-relaxed text-zinc-500">{s.copy}</p>
            </div>
          );
        })}
      </div>

      {/* Firewall principles */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-zinc-200 bg-zinc-50/60 p-4">
          <p className="mb-1 flex items-center gap-2 text-[13px] font-semibold text-zinc-900">
            <Eye size={14} style={{ color: AD }} />
            No surveillance, by architecture
          </p>
          <p className="font-mono text-[11.5px] leading-relaxed text-zinc-500" data-size="meta">
            Targeting is contextual only — realm, branch, atom, chosen geo-lens. No behavioral
            profiles, no retargeting, no demographics. We report where your promotion ran, never
            who saw it.
          </p>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-zinc-50/60 p-4">
          <p className="mb-1 flex items-center gap-2 text-[13px] font-semibold text-zinc-900">
            <ShieldCheck size={14} style={{ color: AD }} />
            Review before live
          </p>
          <p className="font-mono text-[11.5px] leading-relaxed text-zinc-500" data-size="meta">
            Verified identity, KYC at payment, and creative that fits the realm it runs in.
            89% of revenue flows back to Bees; 11% to R&D.
          </p>
        </div>
      </div>
    </div>
  );
}
