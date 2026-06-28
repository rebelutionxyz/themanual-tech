import { useEffect, useState } from 'react';
import { Check, Plus } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { pulseFollow, pulseUnfollow, pulseMyChannel } from '@/lib/pulse';
import { cn } from '@/lib/utils';
import { PULSE_RED } from './cards';

// Session-cached "my channel" lookup so every FollowButton doesn't re-query.
let myChannelCache: { beeId: string | null; channelId: string | null } | null = null;

function useMyChannel(beeId: string | null): string | null {
  const [channelId, setChannelId] = useState<string | null>(
    myChannelCache?.beeId === beeId ? myChannelCache.channelId : null,
  );

  useEffect(() => {
    if (!beeId) {
      setChannelId(null);
      return;
    }
    if (myChannelCache?.beeId === beeId) {
      setChannelId(myChannelCache.channelId);
      return;
    }
    let cancelled = false;
    pulseMyChannel()
      .then((id) => {
        myChannelCache = { beeId, channelId: id };
        if (!cancelled) setChannelId(id);
      })
      .catch(() => {
        if (!cancelled) setChannelId(null);
      });
    return () => {
      cancelled = true;
    };
  }, [beeId]);

  return channelId;
}

/**
 * Follow / unfollow toggle for a channel.
 * Optimistic; reconciles to the RPC's authoritative state.
 * Disabled when signed out; hidden on the Bee's own channel.
 */
export function FollowButton({
  channelId,
  initialFollowing = false,
  className,
}: {
  channelId: string;
  initialFollowing?: boolean;
  className?: string;
}) {
  const { bee } = useAuth();
  const myChannel = useMyChannel(bee?.id ?? null);
  const [following, setFollowing] = useState(initialFollowing);
  const [pending, setPending] = useState(false);

  // Can't follow your own channel.
  if (myChannel && myChannel === channelId) return null;

  const signedOut = !bee;

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (signedOut || pending) return;
    const next = !following;
    setFollowing(next);
    setPending(true);
    try {
      const res = next
        ? await pulseFollow(channelId)
        : await pulseUnfollow(channelId);
      setFollowing(res.following);
    } catch {
      setFollowing(!next); // rollback
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={signedOut || pending}
      title={signedOut ? 'Sign in to follow' : undefined}
      aria-pressed={following}
      className={cn(
        'inline-flex flex-shrink-0 items-center gap-1 rounded-md border px-2.5 py-1 font-medium tracking-wide transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        following && 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50',
        className,
      )}
      style={
        following
          ? { fontSize: '12px' }
          : {
              fontSize: '12px',
              borderColor: `${PULSE_RED}59`,
              background: `${PULSE_RED}12`,
              color: PULSE_RED,
            }
      }
    >
      {following ? <Check size={12} /> : <Plus size={12} />}
      {following ? 'Following' : 'Follow'}
    </button>
  );
}
