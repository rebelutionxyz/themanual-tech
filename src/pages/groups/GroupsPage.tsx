import { SurfaceHeader } from '@/components/shell/SurfaceHeader';
import { SURFACE_FRIENDLY } from '@/components/shell/sidebarNav';
import { useAuth } from '@/lib/auth';
import {
  type Group,
  type GroupSort,
  listGroups,
  listMyGroups,
  listMyModeratingGroups,
} from '@/lib/groups';
import { cn, formatCount } from '@/lib/utils';
import type { GroupsOutletCtx, GroupsView } from '@/pages/groups/GroupsLayout';
import { useLensStore } from '@/stores/useLensStore';
import { EyeOff, Globe, Lock, Plus, Users } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';

const UNITE_COLOR = '#7C3AED';

export function GroupsPage() {
  const { bee } = useAuth();
  const { view, openCreate } = useOutletContext<GroupsOutletCtx>();
  const [sort, setSort] = useState<GroupSort>('members');
  const [groups, setGroups] = useState<Group[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  // The realm strip narrows Discover (groups.realm_path); "mine" stays unfiltered.
  const realmPath = useLensStore((s) => s.path);

  const load = useCallback(async () => {
    setGroups(null);
    setError(null);
    try {
      if (view === 'discover') setGroups(await listGroups(sort, realmPath));
      else if (!bee?.id) setGroups([]);
      else if (view === 'mine') setGroups(await listMyGroups(bee.id));
      else setGroups(await listMyModeratingGroups(bee.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load groups');
      setGroups([]);
    }
  }, [view, sort, bee?.id, realmPath]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="min-h-full bg-white">
      <div className="safe-pad-x mx-auto max-w-4xl px-4 py-6 md:px-8 md:py-8">
        <SurfaceHeader
          friendly={SURFACE_FRIENDLY.unite}
          icon={Users}
          accent={UNITE_COLOR}
          action={
            bee && (
              <button
                type="button"
                onClick={openCreate}
                className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-md px-3 py-2 font-medium text-bg transition-colors hover:brightness-110"
                style={{ background: UNITE_COLOR, fontSize: '13px' }}
              >
                <Plus size={15} /> Create
              </button>
            )
          }
        />

        {view === 'discover' && (
          <div className="mb-4 inline-flex rounded-md border border-zinc-200 bg-zinc-50 p-0.5">
            <SortButton active={sort === 'members'} onClick={() => setSort('members')}>
              Top
            </SortButton>
            <SortButton active={sort === 'recent'} onClick={() => setSort('recent')}>
              New
            </SortButton>
          </div>
        )}

        {error && (
          <div
            className="rounded-lg border border-red-200 bg-red-50 p-5 text-red-600"
            style={{ fontSize: '13px' }}
          >
            {error}
          </div>
        )}

        {!error && groups === null && <GroupsSkeleton />}

        {!error && groups !== null && groups.length === 0 && (
          <EmptyGroups view={view} signedIn={Boolean(bee?.id)} onCreate={openCreate} />
        )}

        {!error && groups && groups.length > 0 && (
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {groups.map((g) => (
              <GroupCard key={g.id} group={g} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function GroupCard({ group }: { group: Group }) {
  const VisIcon =
    group.visibility === 'public' ? Globe : group.visibility === 'private' ? Lock : EyeOff;
  return (
    <li>
      <Link
        to={`/unite/${group.slug}`}
        className="group block h-full overflow-hidden rounded-lg border border-zinc-200 p-4 transition-colors hover:bg-[#7C3AED1f]"
        style={{ borderLeft: `3px solid ${UNITE_COLOR}`, background: `${UNITE_COLOR}14` }}
      >
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display text-lg leading-tight text-zinc-900">{group.name}</h3>
          <span
            className="flex flex-shrink-0 items-center gap-1 rounded px-1.5 py-0.5 font-mono uppercase tracking-wider text-zinc-500"
            style={{ fontSize: '9.5px' }}
            data-size="meta"
            title={group.visibility}
          >
            <VisIcon size={10} />
            {group.visibility}
          </span>
        </div>
        {group.tagline && (
          <p
            className="mt-1 line-clamp-2 text-zinc-500"
            style={{ fontSize: '13px', lineHeight: 1.5 }}
          >
            {group.tagline}
          </p>
        )}
        <div
          className="mt-3 flex items-center gap-1 font-mono text-zinc-500"
          style={{ fontSize: '11px' }}
          data-size="meta"
        >
          <Users size={11} />
          {formatCount(group.memberCount)} {group.memberCount === 1 ? 'member' : 'members'}
        </div>
      </Link>
    </li>
  );
}

function SortButton({
  active,
  onClick,
  children,
}: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-sm px-3 py-1 font-mono transition-all',
        !active && 'text-zinc-500 hover:text-zinc-800',
      )}
      style={{
        fontSize: '12px',
        ...(active ? { color: UNITE_COLOR, background: `${UNITE_COLOR}18`, fontWeight: 600 } : {}),
      }}
      data-size="meta"
    >
      {children}
    </button>
  );
}

function GroupsSkeleton() {
  return (
    <ul
      className="grid grid-cols-1 gap-2 sm:grid-cols-2"
      aria-busy="true"
      aria-label="Loading groups"
    >
      {[70, 55, 80, 60].map((w, i) => (
        <li
          // biome-ignore lint/suspicious/noArrayIndexKey: decorative loading skeleton, fixed-length static array
          key={i}
          className="animate-pulse-slow rounded-lg border border-zinc-200 p-4"
          style={{
            borderLeft: `3px solid ${UNITE_COLOR}`,
            background: `${UNITE_COLOR}14`,
            animationDelay: `${i * 100}ms`,
          }}
        >
          <div className="h-5 rounded bg-zinc-200" style={{ width: `${w}%` }} />
          <div className="mt-2 h-3 rounded bg-zinc-100" style={{ width: '90%' }} />
          <div className="mt-3 h-3 w-20 rounded bg-zinc-100" />
        </li>
      ))}
    </ul>
  );
}

function EmptyGroups({
  view,
  signedIn,
  onCreate,
}: { view: GroupsView; signedIn: boolean; onCreate: () => void }) {
  const headline =
    view === 'discover'
      ? 'No groups yet'
      : view === 'moderating'
        ? signedIn
          ? "You don't own or moderate any groups"
          : 'Sign in to see groups you moderate'
        : signedIn
          ? "You haven't joined a group yet"
          : 'Sign in to see your groups';
  const subtext =
    view === 'discover'
      ? 'Be the first to organize. Start a group and gather your Bees.'
      : signedIn
        ? 'Start your own, or join one from Discover.'
        : 'Your group memberships are tied to your Bee account.';
  return (
    <div
      className="rounded-lg border-2 border-dashed p-8 text-center"
      style={{ borderColor: `${UNITE_COLOR}40`, background: `${UNITE_COLOR}08` }}
    >
      <Users size={26} className="mx-auto mb-3" style={{ color: UNITE_COLOR, opacity: 0.7 }} />
      <p className="mb-1 font-display text-zinc-900" style={{ fontSize: '17px', fontWeight: 500 }}>
        {headline}
      </p>
      <p className="mx-auto max-w-md text-zinc-500" style={{ fontSize: '13px', lineHeight: 1.5 }}>
        {subtext}
      </p>
      {signedIn ? (
        <button
          type="button"
          onClick={onCreate}
          className="mt-5 inline-flex items-center gap-1.5 rounded-md px-4 py-1.5 font-medium text-bg transition-colors hover:brightness-110"
          style={{ background: UNITE_COLOR, fontSize: '12px' }}
        >
          <Plus size={14} /> Create a group
        </button>
      ) : (
        <Link
          to="/login"
          className="mt-5 inline-flex items-center gap-1.5 rounded-md border-2 px-4 py-1.5 transition-colors hover:brightness-110"
          style={{
            borderColor: `${UNITE_COLOR}70`,
            color: UNITE_COLOR,
            fontSize: '12px',
            fontWeight: 600,
          }}
        >
          Sign in
        </Link>
      )}
    </div>
  );
}
