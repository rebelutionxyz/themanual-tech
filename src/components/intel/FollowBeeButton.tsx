import { useAuth } from '@/lib/auth';
import { followBee, isFollowingBee, unfollowBee } from '@/lib/follows';
import { cn } from '@/lib/utils';
import { UserCheck, UserPlus } from 'lucide-react';
import { useEffect, useState } from 'react';

const INTEL_COLOR = '#1D9BF0';

/**
 * Follow / Following toggle for a Bee author (bee_follows_v1).
 * Hidden when signed out or when the target is the signed-in Bee.
 * Fires `intel-counts-refresh` so the shell + Following feed stay honest.
 * `accent` recolors the pill per surface (defaults to INTEL sky).
 */
export function FollowBeeButton({
  beeId,
  className,
  accent = INTEL_COLOR,
}: {
  beeId: string;
  className?: string;
  accent?: string;
}) {
  const { bee } = useAuth();
  const [following, setFollowing] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  const isSelf = !bee?.id || bee.id === beeId;

  useEffect(() => {
    let cancelled = false;
    if (isSelf || !beeId) {
      setFollowing(null);
      return;
    }
    isFollowingBee(bee?.id ?? null, beeId)
      .then((f) => !cancelled && setFollowing(f))
      .catch(() => !cancelled && setFollowing(false));
    return () => {
      cancelled = true;
    };
  }, [bee?.id, beeId, isSelf]);

  if (isSelf || !beeId || following === null) return null;

  async function toggle() {
    if (busy) return;
    const next = !following;
    setBusy(true);
    setFollowing(next);
    try {
      if (next) await followBee(beeId);
      else await unfollowBee(beeId);
      window.dispatchEvent(new CustomEvent('intel-counts-refresh'));
    } catch (err) {
      console.warn('follow toggle failed:', err);
      setFollowing(!next);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void toggle();
      }}
      disabled={busy}
      title={following ? 'Unfollow this Bee' : 'Follow this Bee'}
      className={cn(
        'inline-flex flex-shrink-0 items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11.5px] font-semibold transition-all disabled:opacity-60',
        className,
      )}
      style={
        following
          ? { borderColor: `${accent}50`, color: accent, background: `${accent}12` }
          : { borderColor: accent, color: '#ffffff', background: accent }
      }
    >
      {following ? <UserCheck size={12} /> : <UserPlus size={12} />}
      {following ? 'Following' : 'Follow'}
    </button>
  );
}
