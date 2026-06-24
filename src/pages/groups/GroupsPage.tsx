import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Users, Plus, Lock, EyeOff, Globe } from 'lucide-react';
import { listGroups, listMyGroups, type Group, type GroupSort } from '@/lib/groups';
import { CreateGroupModal } from '@/components/groups/CreateGroupModal';
import { useAuth } from '@/lib/auth';
import { cn, formatCount } from '@/lib/utils';

const UNITE_COLOR = '#6FCF8F';

type Tab = 'discover' | 'mine';

export function GroupsPage() {
  const { bee } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('discover');
  const [sort, setSort] = useState<GroupSort>('members');
  const [groups, setGroups] = useState<Group[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    setGroups(null);
    setError(null);
    try {
      const rows = tab === 'mine' && bee?.id ? await listMyGroups(bee.id) : await listGroups(sort);
      setGroups(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load groups');
      setGroups([]);
    }
  }, [tab, sort, bee?.id]);

  useEffect(() => {
    if (tab === 'mine' && !bee?.id) {
      setGroups([]);
      return;
    }
    load();
  }, [load, tab, bee?.id]);

  return (
    <div className="min-h-full" style={{ background: `${UNITE_COLOR}0D` }}>
      <div className="safe-pad-x mx-auto max-w-4xl px-4 py-6 md:px-8 md:py-8">
        {/* Header */}
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <div
              className="mb-1 font-mono uppercase tracking-widest"
              style={{ fontSize: '11px', color: UNITE_COLOR, opacity: 0.8 }}
              data-size="meta"
            >
              UNITE · Groups
            </div>
            <h1 className="flex items-center gap-2 font-display tracking-wide text-text-silver-bright" style={{ fontSize: '24px' }}>
              <Users size={22} style={{ color: UNITE_COLOR }} />
              Groups
            </h1>
            <p className="mt-1 text-text-dim" style={{ fontSize: '13px' }}>
              Organize around shared purpose. Sovereign tribes of Bees.
            </p>
          </div>
          {bee && (
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-md px-3 py-2 font-medium text-bg transition-colors hover:brightness-110"
              style={{ background: UNITE_COLOR, fontSize: '13px' }}
            >
              <Plus size={15} /> Create
            </button>
          )}
        </div>

        {/* Tabs + sort */}
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="inline-flex rounded-md border border-border bg-bg-elevated p-0.5">
            <TabButton active={tab === 'discover'} onClick={() => setTab('discover')}>
              Discover
            </TabButton>
            <TabButton active={tab === 'mine'} onClick={() => setTab('mine')}>
              My Groups
            </TabButton>
          </div>
          {tab === 'discover' && (
            <div className="inline-flex rounded-md border border-border bg-bg-elevated p-0.5">
              <TabButton active={sort === 'members'} onClick={() => setSort('members')}>
                Top
              </TabButton>
              <TabButton active={sort === 'recent'} onClick={() => setSort('recent')}>
                New
              </TabButton>
            </div>
          )}
        </div>

        {/* List */}
        {error && (
          <div className="rounded-lg border border-kettle-unsourced/30 bg-bg-elevated p-5 text-kettle-unsourced" style={{ fontSize: '13px' }}>
            {error}
          </div>
        )}

        {!error && groups === null && <GroupsSkeleton />}

        {!error && groups !== null && groups.length === 0 && (
          <EmptyGroups
            tab={tab}
            signedIn={Boolean(bee?.id)}
            onCreate={() => setShowCreate(true)}
          />
        )}

        {!error && groups && groups.length > 0 && (
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {groups.map((g) => (
              <GroupCard key={g.id} group={g} />
            ))}
          </ul>
        )}
      </div>

      {showCreate && (
        <CreateGroupModal
          onClose={() => setShowCreate(false)}
          onCreated={(slug) => {
            setShowCreate(false);
            navigate(`/unite/${slug}`);
          }}
        />
      )}
    </div>
  );
}

function GroupCard({ group }: { group: Group }) {
  const VisIcon = group.visibility === 'public' ? Globe : group.visibility === 'private' ? Lock : EyeOff;
  return (
    <li>
      <Link
        to={`/unite/${group.slug}`}
        className="group block h-full overflow-hidden rounded-lg border border-border bg-bg-elevated p-4 transition-all hover:border-border-bright hover:bg-panel-2"
        style={{ borderLeft: `3px solid ${UNITE_COLOR}80` }}
      >
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display text-lg leading-tight text-text-silver-bright group-hover:text-text">
            {group.name}
          </h3>
          <span
            className="flex flex-shrink-0 items-center gap-1 rounded px-1.5 py-0.5 font-mono uppercase tracking-wider text-text-muted"
            style={{ fontSize: '9.5px' }}
            data-size="meta"
            title={group.visibility}
          >
            <VisIcon size={10} />
            {group.visibility}
          </span>
        </div>
        {group.tagline && (
          <p className="mt-1 line-clamp-2 text-text-dim" style={{ fontSize: '13px', lineHeight: 1.5 }}>
            {group.tagline}
          </p>
        )}
        <div className="mt-3 flex items-center gap-1 font-mono text-text-muted" style={{ fontSize: '11px' }} data-size="meta">
          <Users size={11} />
          {formatCount(group.memberCount)} {group.memberCount === 1 ? 'member' : 'members'}
        </div>
      </Link>
    </li>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn('rounded-sm px-3 py-1 font-mono transition-all', !active && 'text-text-dim hover:text-text-silver')}
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
    <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2" aria-busy="true" aria-label="Loading groups">
      {[70, 55, 80, 60].map((w, i) => (
        <li
          // biome-ignore lint/suspicious/noArrayIndexKey: decorative loading skeleton, fixed-length static array
          key={i}
          className="animate-pulse-slow rounded-lg border border-border bg-bg-elevated p-4"
          style={{ borderLeft: `3px solid ${UNITE_COLOR}80`, animationDelay: `${i * 100}ms` }}
        >
          <div className="h-5 rounded bg-text-muted/15" style={{ width: `${w}%` }} />
          <div className="mt-2 h-3 rounded bg-text-muted/10" style={{ width: '90%' }} />
          <div className="mt-3 h-3 w-20 rounded bg-text-muted/10" />
        </li>
      ))}
    </ul>
  );
}

function EmptyGroups({ tab, signedIn, onCreate }: { tab: Tab; signedIn: boolean; onCreate: () => void }) {
  const headline = tab === 'mine' ? (signedIn ? 'You haven\'t joined a group yet' : 'Sign in to see your groups') : 'No groups yet';
  const subtext =
    tab === 'mine'
      ? signedIn
        ? 'Join one from Discover, or start your own.'
        : 'Your group memberships are tied to your Bee account.'
      : 'Be the first to organize. Start a group and gather your Bees.';
  return (
    <div className="rounded-lg border-2 border-dashed p-8 text-center" style={{ borderColor: `${UNITE_COLOR}40`, background: `${UNITE_COLOR}08` }}>
      <Users size={26} className="mx-auto mb-3" style={{ color: UNITE_COLOR, opacity: 0.7 }} />
      <p className="mb-1 font-display text-text-silver-bright" style={{ fontSize: '17px', fontWeight: 500 }}>
        {headline}
      </p>
      <p className="mx-auto max-w-md text-text-dim" style={{ fontSize: '13px', lineHeight: 1.5 }}>
        {subtext}
      </p>
      {tab === 'mine' && !signedIn ? (
        <Link
          to="/login"
          className="mt-5 inline-flex items-center gap-1.5 rounded-md border-2 px-4 py-1.5 transition-colors hover:brightness-110"
          style={{ borderColor: `${UNITE_COLOR}70`, color: UNITE_COLOR, fontSize: '12px', fontWeight: 600 }}
        >
          Sign in
        </Link>
      ) : signedIn ? (
        <button
          type="button"
          onClick={onCreate}
          className="mt-5 inline-flex items-center gap-1.5 rounded-md px-4 py-1.5 font-medium text-bg transition-colors hover:brightness-110"
          style={{ background: UNITE_COLOR, fontSize: '12px' }}
        >
          <Plus size={14} /> Create a group
        </button>
      ) : null}
    </div>
  );
}
