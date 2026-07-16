import { supabase } from './supabase';

// ═════════════════════════════════════════════════════════════════════
// Groups (UNITE / AtlasNATION). Backend: groups + group_memberships tables,
// group_* RPCs. RLS auto-scopes reads (public groups + ones you belong to).
// bee.id === auth.uid().
// ═════════════════════════════════════════════════════════════════════

export type GroupVisibility = 'public' | 'private' | 'secret';
export type GroupRole = 'member' | 'moderator' | 'owner';

export interface Group {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  description: string | null;
  visibility: GroupVisibility;
  createdBy: string;
  memberCount: number;
  parentSurface: string | null;
  parentId: string | null;
  createdAt: string;
}

export interface GroupMember {
  beeId: string;
  role: GroupRole;
  joinedAt: string;
  handle: string | null;
  name: string | null;
}

function mapGroup(row: Record<string, unknown>): Group {
  return {
    id: String(row.id),
    slug: String(row.slug),
    name: String(row.name),
    tagline: (row.tagline as string) ?? null,
    description: (row.description as string) ?? null,
    visibility: (row.visibility as GroupVisibility) ?? 'public',
    createdBy: String(row.created_by ?? ''),
    memberCount: Number(row.member_count ?? 0),
    parentSurface: (row.parent_surface as string) ?? null,
    parentId: (row.parent_id as string) ?? null,
    createdAt: String(row.created_at ?? ''),
  };
}

/** A nested `bees(handle,name)` embed comes back as an object (to-one). */
function bee(row: Record<string, unknown>): { handle: string | null; name: string | null } {
  const b = row.bees;
  const obj = Array.isArray(b) ? b[0] : b;
  const rec = (obj ?? {}) as Record<string, unknown>;
  return {
    handle: (rec.handle as string) ?? null,
    name: (rec.name as string) ?? null,
  };
}

// ───────────────────────────── Reading ─────────────────────────────

export type GroupSort = 'members' | 'recent';

/**
 * Discovery feed via the groups_search RPC (SECURITY INVOKER, RLS-scoped —
 * private/secret groups stay hidden). Powers the cross-Astra right-rail UNITE
 * card. 'members' = popularity, 'recent' = newest.
 */
export async function groupsSearch(sort: GroupSort = 'members', limit = 30): Promise<Group[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc('groups_search', { p_sort: sort, p_limit: limit });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapGroup);
}

/**
 * Discover list — RLS returns public groups + any private/secret you belong to.
 * `realmPath` (the realm-strip lens) narrows by groups.realm_path when non-empty.
 */
export async function listGroups(
  sort: GroupSort = 'members',
  realmPath: string[] = [],
): Promise<Group[]> {
  if (!supabase) return [];
  const order =
    sort === 'recent'
      ? { col: 'created_at', ascending: false }
      : { col: 'member_count', ascending: false };
  let q = supabase.from('groups').select('*');
  if (realmPath.length > 0) q = q.contains('realm_path', realmPath);
  const { data, error } = await q.order(order.col, { ascending: order.ascending });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapGroup);
}

/** Groups the Bee belongs to, with their role. */
export async function listMyGroups(beeId: string): Promise<Group[]> {
  if (!supabase || !beeId) return [];
  const { data, error } = await supabase
    .from('group_memberships')
    .select('joined_at, groups(*)')
    .eq('bee_id', beeId)
    .order('joined_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? [])
    .map((r) => {
      const g = (r as Record<string, unknown>).groups;
      const obj = Array.isArray(g) ? g[0] : g;
      return obj ? mapGroup(obj as Record<string, unknown>) : null;
    })
    .filter((g): g is Group => g !== null);
}

/** Groups the Bee owns or moderates (the "Moderating" view). */
export async function listMyModeratingGroups(beeId: string): Promise<Group[]> {
  if (!supabase || !beeId) return [];
  const { data, error } = await supabase
    .from('group_memberships')
    .select('joined_at, role, groups(*)')
    .eq('bee_id', beeId)
    .in('role', ['owner', 'moderator'])
    .order('joined_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? [])
    .map((r) => {
      const g = (r as Record<string, unknown>).groups;
      const obj = Array.isArray(g) ? g[0] : g;
      return obj ? mapGroup(obj as Record<string, unknown>) : null;
    })
    .filter((g): g is Group => g !== null);
}

/** Count of groups the Bee belongs to — sidebar badge. */
export async function countMyGroups(beeId: string): Promise<number> {
  if (!supabase || !beeId) return 0;
  const { count } = await supabase
    .from('group_memberships')
    .select('*', { count: 'exact', head: true })
    .eq('bee_id', beeId);
  return count ?? 0;
}

export async function getGroupBySlug(slug: string): Promise<Group | null> {
  if (!supabase) return null;
  const { data } = await supabase.from('groups').select('*').eq('slug', slug).maybeSingle();
  return data ? mapGroup(data) : null;
}

export async function getGroupById(id: string): Promise<Group | null> {
  if (!supabase) return null;
  const { data } = await supabase.from('groups').select('*').eq('id', id).maybeSingle();
  return data ? mapGroup(data) : null;
}

export async function listMembers(groupId: string): Promise<GroupMember[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('group_memberships')
    .select('bee_id, role, joined_at, bees(handle,name)')
    .eq('group_id', groupId)
    .order('joined_at', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => {
    const row = r as Record<string, unknown>;
    const b = bee(row);
    return {
      beeId: String(row.bee_id),
      role: (row.role as GroupRole) ?? 'member',
      joinedAt: String(row.joined_at ?? ''),
      handle: b.handle,
      name: b.name,
    };
  });
}

/** The Bee's role in a group, or null if not a member. Drives the action buttons. */
export async function getMyRole(groupId: string, beeId: string): Promise<GroupRole | null> {
  if (!supabase || !beeId) return null;
  const { data } = await supabase
    .from('group_memberships')
    .select('role')
    .eq('group_id', groupId)
    .eq('bee_id', beeId)
    .maybeSingle();
  return data ? ((data.role as GroupRole) ?? 'member') : null;
}

/** Resolve a handle to a bee id (for owner/mod add-member). */
export async function findBeeByHandle(
  handle: string,
): Promise<{ id: string; handle: string } | null> {
  if (!supabase) return null;
  const clean = handle.trim().replace(/^@/, '').toLowerCase();
  if (!clean) return null;
  const { data } = await supabase
    .from('bees')
    .select('id, handle')
    .eq('handle', clean)
    .maybeSingle();
  return data ? { id: String(data.id), handle: String(data.handle) } : null;
}

// ───────────────────────────── Actions ─────────────────────────────

function unwrap<T = Record<string, unknown>>(data: unknown, error: { message: string } | null): T {
  if (error) throw new Error(error.message);
  return (data ?? {}) as T;
}

export interface CreateGroupInput {
  name: string;
  slug: string;
  visibility: GroupVisibility;
  tagline?: string;
  description?: string;
}

export async function createGroup(
  input: CreateGroupInput,
): Promise<{ id: string; slug: string; visibility: GroupVisibility }> {
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase.rpc('group_create', {
    p_name: input.name,
    p_slug: input.slug,
    p_visibility: input.visibility,
    p_tagline: input.tagline ?? null,
    p_description: input.description ?? null,
  });
  const r = unwrap<{ id: string; slug: string; visibility: GroupVisibility }>(data, error);
  return {
    id: String(r.id),
    slug: String(r.slug),
    visibility: (r.visibility ?? input.visibility) as GroupVisibility,
  };
}

export async function joinGroup(groupId: string): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase.rpc('group_join', { p_group_id: groupId });
  unwrap(data, error);
}

export async function leaveGroup(groupId: string): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase.rpc('group_leave', { p_group_id: groupId });
  unwrap(data, error);
}

export async function addMember(
  groupId: string,
  beeId: string,
  role: GroupRole = 'member',
): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase.rpc('group_add_member', {
    p_group_id: groupId,
    p_bee_id: beeId,
    p_role: role,
  });
  unwrap(data, error);
}

export async function setRole(groupId: string, beeId: string, role: GroupRole): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase.rpc('group_set_role', {
    p_group_id: groupId,
    p_bee_id: beeId,
    p_role: role,
  });
  unwrap(data, error);
}

export async function removeMember(groupId: string, beeId: string): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase.rpc('group_remove_member', {
    p_group_id: groupId,
    p_bee_id: beeId,
  });
  unwrap(data, error);
}

// ──────────────────────── Group discussion (forum reuse) ────────────────────────

export interface GroupThread {
  id: string;
  title: string;
  body: string;
  replyCount: number;
  lastActivityAt: string;
  createdAt: string;
  isLocked: boolean;
  authorHandle: string | null;
}

/** Threads anchored to this group (forum_threads.parent_id = group_id). */
export async function listGroupThreads(groupId: string): Promise<GroupThread[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('forum_threads')
    .select('*')
    .eq('parent_id', groupId)
    .order('last_activity_at', { ascending: false });
  if (error) throw new Error(error.message);
  const rows = data ?? [];
  // Author handles.
  const ids = Array.from(new Set(rows.map((r) => String(r.created_by)).filter(Boolean)));
  const handle = new Map<string, string>();
  if (ids.length > 0) {
    const { data: bees } = await supabase.from('bees').select('id, handle').in('id', ids);
    for (const b of bees ?? []) handle.set(String(b.id), String(b.handle));
  }
  return rows.map((r) => ({
    id: String(r.id),
    title: String(r.title),
    body: String(r.body ?? ''),
    replyCount: Number(r.reply_count ?? 0),
    lastActivityAt: String(r.last_activity_at ?? ''),
    createdAt: String(r.created_at ?? ''),
    isLocked: Boolean(r.is_locked),
    authorHandle: handle.get(String(r.created_by)) ?? null,
  }));
}

/** Start a group discussion thread via the forum RPC (parent_surface 'unite'). */
export async function createGroupThread(
  groupId: string,
  title: string,
  body: string,
): Promise<string> {
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase.rpc('forum_create_thread', {
    p_title: title,
    p_body: body,
    p_parent_surface: 'unite',
    p_parent_id: groupId,
  });
  const r = unwrap<{ thread_id?: string; id?: string }>(data, error);
  return String(r.thread_id ?? r.id ?? '');
}

// ──────────────────────── Following + Watching ────────────────────────
// UNITE Following reuses the bee_follows graph (lib/follows.ts) verbatim:
// groups CREATED by Bees you follow — same semantics as the INTEL feed
// (threads by Bees you follow). One follow graph, every surface.
// Watching a specific group = a Bookmark (entity_saves, source_surface
// 'unite') — private, no follow edge, no owner notification.

/**
 * Groups created by any of these Bees — the UNITE Following view
 * (feed with listFollowedBeeIds). RLS scopes visibility: public groups
 * plus private/secret ones you belong to.
 */
export async function listGroupsByCreators(creatorIds: string[]): Promise<Group[]> {
  if (!supabase || creatorIds.length === 0) return [];
  const { data, error } = await supabase
    .from('groups')
    .select('*')
    .in('created_by', creatorIds)
    .order('member_count', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapGroup);
}

/** Resolve group ids → groups, preserving input order (Bookmarked groups row). */
export async function getGroupsByIds(ids: string[]): Promise<Group[]> {
  if (!supabase || ids.length === 0) return [];
  const { data, error } = await supabase.from('groups').select('*').in('id', ids);
  if (error) throw new Error(error.message);
  const byId = new Map(
    (data ?? []).map((r) => {
      const g = mapGroup(r as Record<string, unknown>);
      return [g.id, g] as const;
    }),
  );
  return ids.map((id) => byId.get(id)).filter((g): g is Group => Boolean(g));
}
