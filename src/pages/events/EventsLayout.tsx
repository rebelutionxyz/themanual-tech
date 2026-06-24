import { useCallback, useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Calendar, History, Check, Megaphone, Plus } from 'lucide-react';
import { SurfaceNavRail, type NavRailItem } from '@/components/layout/SurfaceNavRail';
import { CreateEventModal } from '@/components/events/CreateEventModal';
import { countMyGoingUpcoming } from '@/lib/events';
import { useAuth } from '@/lib/auth';

const RULE_COLOR = '#E88938';

export type EventsView = 'upcoming' | 'past' | 'going' | 'hosting';

export interface EventsOutletCtx {
  view: EventsView;
  openCreate: () => void;
}

/** Layout shell for the Events (RULE) surface — persistent left nav rail. */
export function EventsLayout() {
  const { bee } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [view, setView] = useState<EventsView>('upcoming');
  const [createOpen, setCreateOpen] = useState(false);
  const [goingCount, setGoingCount] = useState(0);

  const refreshCount = useCallback(() => {
    if (!bee?.id) {
      setGoingCount(0);
      return;
    }
    countMyGoingUpcoming(bee.id).then(setGoingCount).catch(() => setGoingCount(0));
  }, [bee?.id]);

  useEffect(() => {
    refreshCount();
  }, [refreshCount]);

  const items: NavRailItem[] = [
    { id: 'upcoming', label: 'Upcoming', icon: Calendar, group: 'primary' },
    { id: 'past', label: 'Past', icon: History, group: 'primary' },
    { id: 'create', label: 'Create', icon: Plus, group: 'primary', isAction: true },
    { id: 'going', label: 'Going', icon: Check, group: 'personal', badge: goingCount },
    { id: 'hosting', label: 'Hosting', icon: Megaphone, group: 'personal' },
  ];

  function handleSelect(id: string) {
    if (id === 'create') {
      setCreateOpen(true);
      return;
    }
    if (location.pathname !== '/rule') navigate('/rule');
    setView(id as EventsView);
  }

  return (
    <div className="flex h-full overflow-hidden">
      <SurfaceNavRail title="RULE" accent={RULE_COLOR} neon="#00E5FF" items={items} activeId={view} onSelect={handleSelect} />
      <main className="min-h-0 min-w-0 flex-1 overflow-y-auto">
        <Outlet context={{ view, openCreate: () => setCreateOpen(true) } satisfies EventsOutletCtx} />
      </main>

      {createOpen && (
        <CreateEventModal
          onClose={() => setCreateOpen(false)}
          onCreated={(id) => {
            setCreateOpen(false);
            refreshCount();
            navigate(`/rule/${id}`);
          }}
        />
      )}
    </div>
  );
}
