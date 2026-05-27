// HQ stub sections — land live in subsequent dispatches.
// Each renders the section title + one-line description so the sidebar is
// clickable + the admin can see what's coming.
//
// HQ-2 (2026-05-27) retired the ActiveBees / RecentKettleVotes /
// TreasuryBalances / EconomySnapshot stubs from this file — those now
// live as their own files under sections/. AstraStatus + AdminActions
// remain stubbed; HQ-3 dispatch wires them.

interface StubProps {
  title: string;
  dispatch: 'HQ-3';
  description: string;
}

function Stub({ title, dispatch, description }: StubProps) {
  return (
    <div>
      <header className="mb-4">
        <h2 className="font-display text-2xl font-semibold text-text-silver-bright">{title}</h2>
        <p className="mt-1 font-mono text-text-muted" style={{ fontSize: '11px' }}>
          coming in dispatch {dispatch}
        </p>
      </header>
      <div className="rounded-md border border-border bg-bg-elevated/40 px-4 py-6 text-center">
        <p className="text-text-dim" style={{ fontSize: '13px' }}>{description}</p>
      </div>
    </div>
  );
}

export function AstraStatus() {
  return (
    <Stub
      title="Astra Status"
      dispatch="HQ-3"
      description="INFRA STATUS SLIDER per MMF §19.3 — Railway / GitHub / Supabase live status across the constellation."
    />
  );
}

export function AdminActions() {
  return (
    <Stub
      title="Admin Actions"
      dispatch="HQ-3"
      description="One-click operator actions: refresh trending matviews, force re-disposition, seed Astras, etc."
    />
  );
}
