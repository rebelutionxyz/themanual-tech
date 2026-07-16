// Surface view + outlet-context types for the Groups (UNITE) surface.
// The persistent shell + controller now live in CommunityLayout; this module
// keeps the shared types the GroupsPage consumes via useOutletContext.

export type GroupsView = 'discover' | 'following' | 'mine' | 'moderating';

export interface GroupsOutletCtx {
  view: GroupsView;
  openCreate: () => void;
}
