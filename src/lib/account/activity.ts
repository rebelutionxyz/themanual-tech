import { supabase } from '@/lib/supabase';

/**
 * ACCOUNT hub — ACTIVITY timeline (PROFILE1). One readable stream of everything
 * a member does across the constellation, assembled READ-ONLY from their own
 * rows under the existing owner-read RLS. No new schema, no writes.
 *
 * Each source is queried independently and merged; a source that errors (RLS,
 * a missing embed) is DROPPED, never allowed to blank the whole timeline —
 * Promise.allSettled + a per-source try. Legible over clever: every row reads
 * as a plain sentence with a date and, where one exists, a link to the thing.
 */

export type ActivityKind =
  | 'post' // authored an INTEL thread
  | 'reply' // replied in a discussion
  | 'vote' // voted on a thread
  | 'event' // RSVP'd to an event
  | 'group' // joined a group
  | 'game' // played a game
  | 'competition' // entered a competition
  | 'fund' // GAVE to a campaign
  | 'campaign'; // started a campaign

export interface ActivityItem {
  id: string;
  kind: ActivityKind;
  /** Plain-language headline, e.g. "Posted a thread". */
  title: string;
  /** Optional secondary line (the thing's name). */
  detail: string | null;
  /** ISO timestamp used for the merged sort + the rendered date. */
  when: string;
  /** In-app destination, when the thing has a page. */
  href: string | null;
}

type Row = Record<string, unknown>;
const s = (v: unknown): string => (v == null ? '' : String(v));

/** Pull a one-level PostgREST embed that may arrive as an object or a 1-array. */
function embed(v: unknown): Row | null {
  if (Array.isArray(v)) return (v[0] as Row) ?? null;
  if (v && typeof v === 'object') return v as Row;
  return null;
}

async function safe(fn: () => Promise<ActivityItem[]>): Promise<ActivityItem[]> {
  try {
    return await fn();
  } catch {
    return [];
  }
}

const PER_SOURCE = 20;

/**
 * The signed-in member's recent activity, newest first. `beeId` must be the
 * caller's own id (every query filters on it and RLS enforces the same).
 */
export async function listMyActivity(beeId: string, limit = 40): Promise<ActivityItem[]> {
  if (!supabase || !beeId) return [];
  const client = supabase;

  const sources: Promise<ActivityItem[]>[] = [
    // Threads authored (INTEL / fyi)
    safe(async () => {
      const { data, error } = await client
        .from('forum_threads')
        .select('id, title, created_at')
        .eq('created_by', beeId)
        .order('created_at', { ascending: false })
        .limit(PER_SOURCE);
      if (error) throw error;
      return ((data as Row[]) ?? []).map((r) => ({
        id: `thread-${s(r.id)}`,
        kind: 'post' as const,
        title: 'Posted a thread',
        detail: s(r.title) || null,
        when: s(r.created_at),
        href: `/intel/t/${s(r.id)}`,
      }));
    }),

    // Replies authored
    safe(async () => {
      const { data, error } = await client
        .from('forum_posts')
        .select('id, thread_id, created_at')
        .eq('bee_id', beeId)
        .order('created_at', { ascending: false })
        .limit(PER_SOURCE);
      if (error) throw error;
      return ((data as Row[]) ?? []).map((r) => ({
        id: `post-${s(r.id)}`,
        kind: 'reply' as const,
        title: 'Replied in a discussion',
        detail: null,
        when: s(r.created_at),
        href: r.thread_id ? `/intel/t/${s(r.thread_id)}` : null,
      }));
    }),

    // Thread votes
    safe(async () => {
      const { data, error } = await client
        .from('forum_thread_votes')
        .select('thread_id, value, created_at')
        .eq('bee_id', beeId)
        .order('created_at', { ascending: false })
        .limit(PER_SOURCE);
      if (error) throw error;
      return ((data as Row[]) ?? []).map((r) => ({
        id: `tvote-${s(r.thread_id)}`,
        kind: 'vote' as const,
        title: Number(r.value) < 0 ? 'Voted a thread down' : 'Voted a thread up',
        detail: null,
        when: s(r.created_at),
        href: r.thread_id ? `/intel/t/${s(r.thread_id)}` : null,
      }));
    }),

    // Event RSVPs
    safe(async () => {
      const { data, error } = await client
        .from('event_rsvps')
        .select('event_id, status, created_at, events(title)')
        .eq('bee_id', beeId)
        .order('created_at', { ascending: false })
        .limit(PER_SOURCE);
      if (error) throw error;
      return ((data as Row[]) ?? []).map((r) => {
        const ev = embed(r.events);
        const status = s(r.status);
        return {
          id: `rsvp-${s(r.event_id)}`,
          kind: 'event' as const,
          title: status === 'maybe' ? 'Might attend an event' : "RSVP'd to an event",
          detail: ev ? s(ev.title) : null,
          when: s(r.created_at),
          href: r.event_id ? `/rule/${s(r.event_id)}` : null,
        };
      });
    }),

    // Group joins
    safe(async () => {
      const { data, error } = await client
        .from('group_memberships')
        .select('group_id, role, joined_at, groups(name, slug)')
        .eq('bee_id', beeId)
        .order('joined_at', { ascending: false })
        .limit(PER_SOURCE);
      if (error) throw error;
      return ((data as Row[]) ?? []).map((r) => {
        const g = embed(r.groups);
        return {
          id: `group-${s(r.group_id)}`,
          kind: 'group' as const,
          title: s(r.role) === 'owner' ? 'Started a group' : 'Joined a group',
          detail: g ? s(g.name) : null,
          when: s(r.joined_at),
          href: g?.slug ? `/unite/${s(g.slug)}` : null,
        };
      });
    }),

    // Games — lifetime rollup, one row per game type (last played).
    safe(async () => {
      const { data, error } = await client
        .from('games_lifetime_stats')
        .select('game_type, games_played, points, last_played_at')
        .eq('bee_id', beeId)
        .order('last_played_at', { ascending: false })
        .limit(PER_SOURCE);
      if (error) throw error;
      return ((data as Row[]) ?? []).map((r) => ({
        id: `game-${s(r.game_type)}`,
        kind: 'game' as const,
        title: 'Played a game',
        detail: `${s(r.game_type)} · ${Number(r.games_played ?? 0)} played`,
        when: s(r.last_played_at),
        href: null,
      }));
    }),

    // Competitions entered
    safe(async () => {
      const { data, error } = await client
        .from('competition_participants')
        .select('competition_id, joined_at, final_rank')
        .eq('bee_id', beeId)
        .order('joined_at', { ascending: false })
        .limit(PER_SOURCE);
      if (error) throw error;
      return ((data as Row[]) ?? []).map((r) => {
        const rank = r.final_rank == null ? null : Number(r.final_rank);
        return {
          id: `comp-${s(r.competition_id)}`,
          kind: 'competition' as const,
          title: 'Entered a competition',
          detail: rank ? `Finished #${rank}` : null,
          when: s(r.joined_at),
          href: null,
        };
      });
    }),

    // FUND pledges (GAVE to a campaign)
    safe(async () => {
      const { data, error } = await client
        .from('fountain_pledges')
        .select('id, created_at, give_campaigns(title, slug)')
        .eq('bee_id', beeId)
        .order('created_at', { ascending: false })
        .limit(PER_SOURCE);
      if (error) throw error;
      return ((data as Row[]) ?? []).map((r) => {
        const c = embed(r.give_campaigns);
        return {
          id: `pledge-${s(r.id)}`,
          kind: 'fund' as const,
          title: 'GAVE to a campaign',
          detail: c ? s(c.title) : null,
          when: s(r.created_at),
          href: c?.slug ? `/fund/${s(c.slug)}` : null,
        };
      });
    }),

    // Campaigns started
    safe(async () => {
      const { data, error } = await client
        .from('give_campaigns')
        .select('slug, title, created_at')
        .eq('created_by', beeId)
        .order('created_at', { ascending: false })
        .limit(PER_SOURCE);
      if (error) throw error;
      return ((data as Row[]) ?? []).map((r) => ({
        id: `campaign-${s(r.slug)}`,
        kind: 'campaign' as const,
        title: 'Started a campaign',
        detail: s(r.title) || null,
        when: s(r.created_at),
        href: r.slug ? `/fund/${s(r.slug)}` : null,
      }));
    }),
  ];

  const settled = await Promise.allSettled(sources);
  const merged = settled.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));

  // Newest first; drop rows with no usable timestamp so the sort is total.
  return merged
    .filter((it) => it.when && !Number.isNaN(new Date(it.when).getTime()))
    .sort((a, b) => new Date(b.when).getTime() - new Date(a.when).getTime())
    .slice(0, limit);
}
