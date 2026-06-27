// Surface view + outlet-context types for the Events (RULE) surface.
// The persistent shell + controller now live in CommunityLayout; this module
// keeps the shared types the EventsPage consumes via useOutletContext.

export type EventsView = 'upcoming' | 'past' | 'going' | 'hosting';

export interface EventsOutletCtx {
  view: EventsView;
  openCreate: () => void;
}
