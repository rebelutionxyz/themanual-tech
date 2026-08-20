import { type ActivityItem, type ActivityKind, listMyActivity } from '@/lib/account/activity';
import { useAuth } from '@/lib/auth';
import {
  ArrowBigUp,
  Calendar,
  Gamepad2,
  HeartHandshake,
  MessageSquare,
  Reply,
  Rocket,
  Trophy,
  Users,
} from 'lucide-react';
import type { ComponentType } from 'react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ACCOUNT_ACCENT } from '../accent';
import { SectionHead, StateLine, fmtDate } from '../ui';

type IconC = ComponentType<{ size?: number | string; className?: string }>;

const KIND_ICON: Record<ActivityKind, IconC> = {
  post: MessageSquare,
  reply: Reply,
  vote: ArrowBigUp,
  event: Calendar,
  group: Users,
  game: Gamepad2,
  competition: Trophy,
  fund: HeartHandshake,
  campaign: Rocket,
};

/** ACTIVITY — one readable timeline of everything the member does. Read-only. */
export function ActivityTab() {
  const { bee } = useAuth();
  const [items, setItems] = useState<ActivityItem[] | null>(null);

  useEffect(() => {
    if (!bee) return;
    let alive = true;
    listMyActivity(bee.id)
      .then((r) => alive && setItems(r))
      .catch(() => alive && setItems([]));
    return () => {
      alive = false;
    };
  }, [bee]);

  return (
    <div className="space-y-4">
      <SectionHead title="Activity" hint="Everything you do across the comb, newest first." />
      {items === null ? (
        <StateLine>Loading…</StateLine>
      ) : items.length === 0 ? (
        <StateLine>Nothing yet — your timeline fills as you post, vote, join, and give.</StateLine>
      ) : (
        <ul className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
          {items.map((it) => (
            <li key={it.id}>
              <Row item={it} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Row({ item }: { item: ActivityItem }) {
  const Icon = KIND_ICON[item.kind];
  const inner = (
    <div className="flex items-center gap-3 border-b border-zinc-100 px-4 py-3 last:border-b-0">
      <span
        className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full"
        style={{ background: `${ACCOUNT_ACCENT}12`, color: ACCOUNT_ACCENT }}
      >
        <Icon size={16} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-zinc-900" style={{ fontSize: '13.5px' }}>
          {item.title}
          {item.detail && <span className="text-zinc-500"> — {item.detail}</span>}
        </p>
        <p className="font-mono text-zinc-400" style={{ fontSize: '10.5px' }} data-size="meta">
          {fmtDate(item.when)}
        </p>
      </div>
    </div>
  );
  return item.href ? (
    <Link to={item.href} className="block transition-colors hover:bg-zinc-50">
      {inner}
    </Link>
  ) : (
    inner
  );
}
