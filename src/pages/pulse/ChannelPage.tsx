import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Tv } from 'lucide-react';
import { PULSE_RED } from '@/components/pulse/cards';

/**
 * Channel route — stub. Channel internals (banner, broadcast list, go-live,
 * composer) land in later dispatches. Phase 1 registers the route so channel
 * search results have a destination.
 */
export function ChannelPage() {
  const { handle } = useParams<{ handle: string }>();

  return (
    <div className="mx-auto max-w-3xl px-5 py-10 md:px-8">
      <Link
        to="/pulse"
        className="inline-flex items-center gap-1.5 font-mono text-zinc-500 hover:text-zinc-700"
        style={{ fontSize: '12px' }}
      >
        <ArrowLeft size={14} /> Back to PULSE
      </Link>

      <div className="mt-6 flex items-center gap-4">
        <div
          className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full border-2"
          style={{ borderColor: `${PULSE_RED}40`, background: `${PULSE_RED}0D` }}
        >
          <Tv size={28} style={{ color: PULSE_RED }} />
        </div>
        <div>
          <h1 className="font-display text-2xl tracking-wide text-zinc-900">
            {handle ? `@${handle}` : 'Channel'}
          </h1>
          <p className="mt-1 font-mono text-zinc-500" style={{ fontSize: '12px' }}>
            Channel page coming soon
          </p>
        </div>
      </div>
    </div>
  );
}
