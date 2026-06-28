import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Radio } from 'lucide-react';
import { PULSE_RED } from '@/components/pulse/cards';

/**
 * Watch route — stub. The player, live chat, claims panel and Send Nectar
 * tips land in later dispatches. Phase 1 only registers the route so cards
 * have a destination.
 */
export function WatchPage() {
  const { broadcastId } = useParams<{ broadcastId: string }>();

  return (
    <div className="mx-auto max-w-3xl px-5 py-10 md:px-8">
      <Link
        to="/pulse"
        className="inline-flex items-center gap-1.5 font-mono text-zinc-500 hover:text-zinc-700"
        style={{ fontSize: '12px' }}
      >
        <ArrowLeft size={14} /> Back to PULSE
      </Link>

      <div
        className="mt-5 flex aspect-video w-full items-center justify-center overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100"
        style={{
          backgroundImage: `linear-gradient(135deg, ${PULSE_RED}1A 0%, transparent 70%)`,
        }}
      >
        <div className="text-center">
          <Radio size={36} style={{ color: PULSE_RED }} className="mx-auto" />
          <p className="mt-3 font-display text-lg text-zinc-900">Player coming soon</p>
          <p className="mt-1 font-mono text-zinc-500" style={{ fontSize: '11px' }}>
            Free to watch — no gate
          </p>
        </div>
      </div>

      <p className="mt-4 font-mono text-zinc-400" style={{ fontSize: '11px' }}>
        broadcast · {broadcastId}
      </p>
    </div>
  );
}
