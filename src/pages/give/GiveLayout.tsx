// Surface view + outlet-context types for the GiVE (Crowdfunding) surface.
// The persistent shell + controller now live in CommunityLayout; this module
// keeps the shared types the GivePage consumes via useOutletContext.

export type GiveView = 'discover' | 'mine' | 'create';

export interface GiveOutletCtx {
  view: GiveView;
}
