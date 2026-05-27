// HQ stub sections — land live in HQ-2 / HQ-3 dispatches.
// Each renders the section title + one-line description so the sidebar is
// clickable + the admin can see what's coming.

interface StubProps {
  title: string;
  dispatch: 'HQ-2' | 'HQ-3';
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

export function ActiveBees() {
  return (
    <Stub
      title="Active Bees"
      dispatch="HQ-2"
      description="Currently-active sessions and recent-activity Bees. Joins bees + auth.sessions."
    />
  );
}

export function RecentKettleVotes() {
  return (
    <Stub
      title="Recent Kettle Votes"
      dispatch="HQ-2"
      description="Latest tier-classification votes across all atoms; flag suspicious patterns."
    />
  );
}

export function TreasuryBalances() {
  return (
    <Stub
      title="Treasury Balances"
      dispatch="HQ-2"
      description="@combtreasury sub-bucket balances (operational / reserve / defense / promotions / campaign / newbee / honeypot)."
    />
  );
}

export function EconomySnapshot() {
  return (
    <Stub
      title="Economy Snapshot"
      dispatch="HQ-2"
      description="Total BLiNG! freed from curve · circulating supply · OPS umbrella sums."
    />
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
