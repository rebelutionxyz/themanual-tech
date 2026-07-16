import { useAuth } from '@/lib/auth';
import { type Group, getGroupsByIds } from '@/lib/groups';
import { listSavedGroupIds } from '@/lib/reactions';
import { CARD_INK, realmCardStyle } from '@/lib/realmCardStyle';
import { formatCount } from '@/lib/utils';
import { Users } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const UNITE_COLOR = '#7C3AED';
const WATCH_INK = '#8A6D1A';
const WATCH_GOLD = '#FAD15E';

/**
 * Watched groups strip for the Bookmarked page ("Bookmarked = Watching").
 * Reads entity_saves rows with source_surface 'unite'; renders nothing when
 * the Bee watches no groups. Re-pulls on `intel-counts-refresh` (fired by
 * the WatchButton + thread save toggles) so unsaves reflect immediately.
 */
export function WatchedGroupsRow() {
  const { bee } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);

  const load = useCallback(() => {
    if (!bee?.id) {
      setGroups([]);
      return;
    }
    listSavedGroupIds(bee.id)
      .then((ids) => (ids.length > 0 ? getGroupsByIds(ids) : []))
      .then(setGroups)
      .catch(() => setGroups([]));
  }, [bee?.id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const onRefresh = () => load();
    window.addEventListener('intel-counts-refresh', onRefresh);
    return () => window.removeEventListener('intel-counts-refresh', onRefresh);
  }, [load]);

  if (groups.length === 0) return null;

  return (
    <section className="mb-5">
      <h2
        className="mb-2 inline-block rounded px-2 py-0.5 font-mono uppercase tracking-widest"
        style={{ fontSize: '10px', color: WATCH_INK, background: `${WATCH_GOLD}30` }}
        data-size="meta"
      >
        Watching — Groups
      </h2>
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {groups.map((g) => (
          <li key={g.id}>
            <Link
              to={`/unite/${g.slug}`}
              className="block overflow-hidden rounded-lg p-3 transition-shadow hover:shadow-md"
              style={realmCardStyle(UNITE_COLOR)}
            >
              <div className="flex items-center justify-between gap-2">
                <h3
                  className="min-w-0 truncate font-display leading-tight"
                  style={{ fontSize: '15px', color: CARD_INK.title }}
                >
                  {g.name}
                </h3>
                <span
                  className="flex flex-shrink-0 items-center gap-1 font-mono text-white/65"
                  style={{ fontSize: '10.5px' }}
                  data-size="meta"
                >
                  <Users size={10} />
                  {formatCount(g.memberCount)}
                </span>
              </div>
              {g.tagline && (
                <p
                  className="mt-0.5 line-clamp-1"
                  style={{ fontSize: '12px', lineHeight: 1.5, color: CARD_INK.body }}
                >
                  {g.tagline}
                </p>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
