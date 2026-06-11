/* DingleBERRY — drill-screen placeholder.
   STEP-2 honest stand-in: each drill route renders here until its full screen
   is ported (slices B+). It is NOT a fake screen — it shows the real wiring-map
   status for that surface AND a live count from the mock data seam, so the route
   tree is navigable + the contract is proven end-to-end without pretending the
   screen exists yet. */
import { dbIcon } from '@/components/dingleberry/icons';
import { DbCard, Eyebrow, StatusPill } from '@/components/dingleberry/primitives';
import { DINGLEBERRY_COLOR } from '@/components/dingleberry/tone';
import type { DingleberrySnapshot } from '@/lib/dingleberry/contract';
import { useDingleberry } from './DingleberryLayout';

interface ScreenMeta {
  icon: string;
  name: string;
  /** wiring-map live-source status */
  live: string;
  /** mock record count, derived from the snapshot */
  count: (d: DingleberrySnapshot) => string;
}

export const SCREEN_META: Record<string, ScreenMeta> = {
  infra: { icon: 'server', name: 'Platform & infra health', live: 'Mock-only · Phase-2 mesh unbuilt',
    count: (d) => `${d.infraHealth.services.length} services` },
  txn: { icon: 'lock', name: 'Transaction security', live: 'LIVE-WIRABLE — bling_system_state + economy_integrity_check()',
    count: (d) => `${d.transactionSecurity.stream.length} tx · ${d.transactionSecurity.anomalies.length} anomalies` },
  source: { icon: 'fingerprint', name: 'Source verification', live: 'Partial — sources exist; CoV scoring needs a view/RPC',
    count: (d) => `${d.sourceVerification.sources.length} sources` },
  shill: { icon: 'users', name: 'Shill / abuse detection', live: 'Partial — bee_affiliate_chain + anti-gaming stack',
    count: (d) => `${d.shillDetection.rings.length} rings` },
  dispatch: { icon: 'zap', name: 'Dispatch (Waggle) auth', live: 'Reads first · actions wire LAST (post security audit)',
    count: (d) => `${d.dispatchAuth.dispatches.length} in queue` },
  threat: { icon: 'shieldCheck', name: 'Threat interception', live: 'No DB table — external ingest source TBD',
    count: (d) => `${d.threatInterception.threats.length} threats` },
  mesh: { icon: 'network', name: 'Member mesh', live: 'Mock-only · Phase-2 device-sharing (do not fake a backend)',
    count: (d) => `${d.memberMesh.layers.length} layers` },
  karma: { icon: 'scale', name: 'Karma Read', live: 'Mostly unbuilt — standing tables not yet defined',
    count: (d) => `${d.karmaCredit.actors.length} actors` },
  godark: { icon: 'wifiOff', name: 'Go Dark monitor', live: 'Derived from mesh-relay health signal',
    count: (d) => d.posture === 'critical' ? 'engaged' : 'standby' },
  oracle: { icon: 'sparkle', name: 'Atlas Oracle', live: 'Partial — binds to the AtlasOracle Astra',
    count: (d) => `${d.atlasOracle.queue.length} queued incidents` },
  justice: { icon: 'scale', name: 'Justice handoff', live: 'Spec — class-action launcher → Justice realm (legal Astra: AtlasADVOCATE)',
    count: (d) => `${d.justiceHandoff.evidence.length} evidence items` },
};

export function DrillPlaceholder({ slug }: { slug: keyof typeof SCREEN_META }) {
  const { data } = useDingleberry();
  const meta = SCREEN_META[slug];
  const Icon = dbIcon(meta.icon);

  return (
    <div className="mx-auto" style={{ maxWidth: 760, padding: '32px 26px 48px' }}>
      <DbCard className="p-6">
        <div className="mb-4 flex items-center gap-3">
          <div
            className="flex flex-none items-center justify-center rounded-md"
            style={{ width: 40, height: 40, background: 'rgba(220,38,38,0.12)', color: DINGLEBERRY_COLOR }}
          >
            <Icon size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <Eyebrow>DingleBERRY · security surface</Eyebrow>
            <h1 className="font-serif font-bold text-text" style={{ fontSize: 24, lineHeight: 1.1 }}>
              {meta.name}
            </h1>
          </div>
          <StatusPill tone="info">porting</StatusPill>
        </div>

        <p className="text-text-silver" style={{ fontSize: 14, lineHeight: 1.5 }}>
          This surface is routed and reading the live mock data seam. Its full screen lands in a later
          slice of the DingleBERRY port — this stand-in is intentionally honest rather than a faked view.
        </p>

        <div className="mt-5 grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          <div className="rounded-md border border-border bg-bg-elevated p-3">
            <Eyebrow>Mock data ready</Eyebrow>
            <div className="mt-1 font-serif font-bold text-text" style={{ fontSize: 18 }}>
              {data ? meta.count(data) : '…'}
            </div>
          </div>
          <div className="rounded-md border border-border bg-bg-elevated p-3">
            <Eyebrow>Live source (wiring map)</Eyebrow>
            <div className="mt-1 text-text-silver" style={{ fontSize: 12.5, lineHeight: 1.35 }}>
              {meta.live}
            </div>
          </div>
        </div>
      </DbCard>
    </div>
  );
}
