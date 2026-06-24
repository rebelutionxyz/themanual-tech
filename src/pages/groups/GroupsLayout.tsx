import { useCallback, useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Compass, Users, Shield, Plus } from 'lucide-react';
import { SurfaceNavRail, type NavRailItem } from '@/components/layout/SurfaceNavRail';
import { CreateGroupModal } from '@/components/groups/CreateGroupModal';
import { countMyGroups } from '@/lib/groups';
import { useAuth } from '@/lib/auth';

const UNITE_COLOR = '#6FCF8F';

export type GroupsView = 'discover' | 'mine' | 'moderating';

export interface GroupsOutletCtx {
  view: GroupsView;
  openCreate: () => void;
}

/** Layout shell for the Groups (UNITE) surface — persistent left nav rail. */
export function GroupsLayout() {
  const { bee } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [view, setView] = useState<GroupsView>('discover');
  const [createOpen, setCreateOpen] = useState(false);
  const [myCount, setMyCount] = useState(0);

  const refreshCount = useCallback(() => {
    if (!bee?.id) {
      setMyCount(0);
      return;
    }
    countMyGroups(bee.id).then(setMyCount).catch(() => setMyCount(0));
  }, [bee?.id]);

  useEffect(() => {
    refreshCount();
  }, [refreshCount]);

  const items: NavRailItem[] = [
    { id: 'discover', label: 'Discover', icon: Compass, group: 'primary' },
    { id: 'create', label: 'Create', icon: Plus, group: 'primary', isAction: true },
    { id: 'mine', label: 'My Groups', icon: Users, group: 'personal', badge: myCount },
    { id: 'moderating', label: 'Moderating', icon: Shield, group: 'personal' },
  ];

  function handleSelect(id: string) {
    if (id === 'create') {
      setCreateOpen(true);
      return;
    }
    // Switching a list view always returns to the index list.
    if (location.pathname !== '/unite') navigate('/unite');
    setView(id as GroupsView);
  }

  return (
    <div className="flex h-full overflow-hidden">
      <SurfaceNavRail title="UNITE" accent={UNITE_COLOR} items={items} activeId={view} onSelect={handleSelect} />
      <main className="min-w-0 flex-1 overflow-y-auto">
        <Outlet context={{ view, openCreate: () => setCreateOpen(true) } satisfies GroupsOutletCtx} />
      </main>

      {createOpen && (
        <CreateGroupModal
          onClose={() => setCreateOpen(false)}
          onCreated={(slug) => {
            setCreateOpen(false);
            refreshCount();
            navigate(`/unite/${slug}`);
          }}
        />
      )}
    </div>
  );
}
