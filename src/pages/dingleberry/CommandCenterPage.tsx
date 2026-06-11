/* DingleBERRY — Command Center (overview).
   Ported from the artifact shell's overview: posture banner + the six surface
   tiles + member-mesh oversight + Go Dark strip. The artifact's TopBar and
   RightRail (flags + Oracle) are dropped per the port spec; a compact
   sample-data posture switcher stands in for the TopBar's posture control so
   the surface stays explorable on mock. */
import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { dbIcon } from '@/components/dingleberry/icons';
import { DbCard, Eyebrow, Spark, StatusPill } from '@/components/dingleberry/primitives';
import { DATA_BLUE, POSTURE_TONE, TONE } from '@/components/dingleberry/tone';
import type { Posture, Tone } from '@/lib/dingleberry/contract';
import { useDingleberry } from './DingleberryLayout';

/* ---- presentation constants (shell-baked demo content, not the data seam) ---- */

interface ScreenState {
  st: Tone;
  main: string;
  sub: string;
}
interface SurfaceTileDef {
  key: string;
  icon: string;
  eyebrow: string;
  name: string;
  secure: ScreenState;
  degraded: ScreenState;
  critical: ScreenState;
}

const SURFACES: SurfaceTileDef[] = [
  { key: 'infra', icon: 'server', eyebrow: 'Surface 01', name: 'Platform & infra health',
    secure: { st: 'secure', main: '99.98%', sub: '142 services · all regions' },
    degraded: { st: 'watch', main: '99.41%', sub: '3 services degraded · EU edge' },
    critical: { st: 'critical', main: '97.2%', sub: '2 core services down · ledger relay' } },
  { key: 'txn', icon: 'lock', eyebrow: 'Surface 02', name: 'Transaction security',
    secure: { st: 'secure', main: '1,284,902', sub: 'secured today · 0 anomalies on BLiNG!' },
    degraded: { st: 'watch', main: '1,051,210', sub: '2 ledger anomalies under review' },
    critical: { st: 'critical', main: 'HELD', sub: 'writes queued · go-dark reconcile mode' } },
  { key: 'source', icon: 'fingerprint', eyebrow: 'Surface 03', name: 'Source verification',
    secure: { st: 'secure', main: '2,140', sub: 'sources ranked · chain intact' },
    degraded: { st: 'watch', main: '2,140', sub: '3 sources flagged · verification gap' },
    critical: { st: 'watch', main: '2,140', sub: '6 unverified sources quarantined' } },
  { key: 'shill', icon: 'users', eyebrow: 'Surface 04', name: 'Shill / abuse detection',
    secure: { st: 'secure', main: '0', sub: 'active patterns · cross-Astra clean' },
    degraded: { st: 'watch', main: '2', sub: 'coordinated patterns flagged' },
    critical: { st: 'critical', main: '7', sub: 'brigading surge · 3 realms' } },
  { key: 'dispatch', icon: 'zap', eyebrow: 'Surface 05', name: 'Dispatch (Waggle) auth',
    secure: { st: 'secure', main: '3,402', sub: 'dispatches hashed · rank-verified' },
    degraded: { st: 'secure', main: '3,402', sub: 'dispatches hashed · rank-verified' },
    critical: { st: 'watch', main: '3,388', sub: '14 dispatches failed rank check' } },
  { key: 'threat', icon: 'shieldCheck', eyebrow: 'Surface 06', name: 'Threat interception',
    secure: { st: 'secure', main: '0', sub: 'live threats · 1 intercepted today' },
    degraded: { st: 'watch', main: '1', sub: 'malware intercepted · 1 member device' },
    critical: { st: 'critical', main: '3', sub: 'active surveillance attempt · mesh' } },
];

interface HeaderDef {
  tone: Tone;
  word: string;
  sub: string;
  stats: [string, string, Tone][];
}

function getHeader(p: Posture): HeaderDef {
  if (p === 'secure')
    return {
      tone: 'secure',
      word: 'The comb is secure.',
      sub: 'All six surfaces nominal. Member mesh healthy. Astra is watching.',
      stats: [
        ['Transactions secured · 24h', '1.28M', 'secure'],
        ['Uptime · 30d', '99.98%', 'secure'],
        ['Threats intercepted · 24h', '1', 'secure'],
        ['Mesh nodes healthy', '4,181 / 4,182', 'secure'],
      ],
    };
  if (p === 'degraded')
    return {
      tone: 'watch',
      word: 'Vigilant — 3 flags open.',
      sub: 'Core surfaces holding. Two patterns and one device need a human call.',
      stats: [
        ['Transactions secured · 24h', '1.05M', 'watch'],
        ['Uptime · 30d', '99.41%', 'watch'],
        ['Threats intercepted · 24h', '1', 'watch'],
        ['Mesh nodes healthy', '4,180 / 4,182', 'watch'],
      ],
    };
  return {
    tone: 'critical',
    word: 'Spine unreachable — Go Dark.',
    sub: 'Mesh holding the line: serving from cache, relaying P2P, queuing ledger writes for reconcile.',
    stats: [
      ['Ledger writes queued', '12,408', 'critical'],
      ['Uptime · 30d', '97.2%', 'critical'],
      ['Active threats', '3', 'critical'],
      ['Mesh nodes quarantined', '14 / 4,182', 'critical'],
    ],
  };
}

interface LayerState {
  st: Tone;
  sig: string;
  sub: string;
}
interface MeshLayerDef {
  n: number;
  key: string;
  icon: string;
  name: string;
  watch: string;
  load: number;
  goDark?: boolean;
  heal?: boolean;
  secure: LayerState;
  degraded: LayerState;
  critical: LayerState;
}

const MESH_LAYERS: MeshLayerDef[] = [
  { n: 1, key: 'cdn', icon: 'globe', name: 'Edge CDN', watch: 'served bytes vs. content hash', load: 1,
    secure: { st: 'secure', sig: '0 hash mismatches', sub: '1,204 nodes · content verified' },
    degraded: { st: 'secure', sig: '0 hash mismatches', sub: '1,204 nodes · content verified' },
    critical: { st: 'watch', sig: '2 tampered copies', sub: 'quarantined · re-served from origin' } },
  { n: 2, key: 'relay', icon: 'network', name: 'Mesh relay', watch: 'drop rate · latency · routing', load: 3, goDark: true,
    secure: { st: 'secure', sig: 'drop 0.3% · p95 42ms', sub: '988 relays · routing nominal' },
    degraded: { st: 'watch', sig: 'drop 1.9% · p95 180ms', sub: 'spine flaky · Go Dark armed' },
    critical: { st: 'critical', sig: 'spine unreachable', sub: 'Go Dark engaged · relaying P2P' } },
  { n: 3, key: 'compute', icon: 'cpu', name: 'Public-good compute', watch: 'sandbox escape · hijack', load: 1,
    secure: { st: 'secure', sig: '0 escape attempts', sub: '312 jobs · isolated' },
    degraded: { st: 'secure', sig: '0 escape attempts', sub: '312 jobs · isolated' },
    critical: { st: 'watch', sig: '1 escape blocked', sub: 'job killed · node flagged' } },
  { n: 4, key: 'storage', icon: 'server', name: 'Member storage', watch: 'proof-of-storage · heartbeat hash', load: 4, heal: true,
    secure: { st: 'secure', sig: '100% pieces verified', sub: '1,678 nodes · reliability 99.4' },
    degraded: { st: 'critical', sig: '1 node withholding', sub: 'mq-7f3a quarantined · self-heal running' },
    critical: { st: 'critical', sig: '14 nodes gone dark', sub: 'rebuilding onto fresh devices' } },
];

/* ---- small pieces ---- */

function PostureSwitcher({ posture, setPosture }: { posture: Posture; setPosture: (p: Posture) => void }) {
  const options: [Posture, string][] = [
    ['secure', 'Secure'],
    ['degraded', 'Degraded'],
    ['critical', 'Go Dark'],
  ];
  return (
    <div className="flex items-center gap-2">
      <span
        className="rounded-full border border-dashed border-border-bright px-2 py-0.5 font-mono uppercase text-text-muted"
        style={{ fontSize: '9px', letterSpacing: '0.1em' }}
      >
        sample data
      </span>
      <div className="flex overflow-hidden rounded-md border border-border-bright">
        {options.map(([k, label]) => {
          const active = posture === k;
          const tone = TONE[POSTURE_TONE[k]];
          return (
            <button
              key={k}
              type="button"
              onClick={() => setPosture(k)}
              className="border-r border-border-bright px-3 py-1 font-sans transition-colors last:border-r-0"
              style={{
                fontSize: '12.5px',
                fontWeight: active ? 700 : 500,
                background: active ? tone.tint : 'transparent',
                color: active ? tone.c : 'var(--text-muted, #6B7580)',
              }}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function LoadDots({ load }: { load: number }) {
  return (
    <span className="inline-flex items-center gap-[3px]">
      {[1, 2, 3, 4].map((i) => (
        <span
          key={i}
          className="rounded-full"
          style={{ width: 5, height: 5, background: i <= load ? DATA_BLUE : '#2A3138' }}
        />
      ))}
    </span>
  );
}

function PostureBanner({ posture }: { posture: Posture }) {
  const h = getHeader(posture);
  const k = TONE[h.tone];
  return (
    <DbCard
      className="mb-[18px] p-5"
      style={{ borderLeft: `3px solid ${k.c}`, background: posture === 'secure' ? undefined : k.tint }}
    >
      <div className="flex flex-wrap items-start gap-[18px]">
        <div className="min-w-[280px] flex-1">
          <div className="mb-2 flex items-center gap-[10px]">
            <span
              className={posture === 'critical' ? 'animate-pulse' : ''}
              style={{ width: 13, height: 13, borderRadius: 99, background: k.c }}
            />
            <StatusPill tone={h.tone} pulse={posture === 'critical'} />
            <Eyebrow>Security Astra · dingleberry</Eyebrow>
          </div>
          <h1
            className="font-serif font-bold text-text"
            style={{ fontSize: 34, lineHeight: 1.05, letterSpacing: '-0.01em', margin: '0 0 6px' }}
          >
            {h.word}
          </h1>
          <div className="max-w-[560px] text-text-silver" style={{ fontSize: 15 }}>
            {h.sub}
          </div>
        </div>
        <div className="grid gap-[10px]" style={{ gridTemplateColumns: 'repeat(2, minmax(140px, 1fr))' }}>
          {h.stats.map(([cap, num, tone]) => (
            <div key={cap} className="rounded-md border border-border bg-bg-elevated" style={{ padding: '10px 13px' }}>
              <div
                className="mb-1 font-mono uppercase text-text-muted"
                style={{ fontSize: 9.5, letterSpacing: '0.08em' }}
              >
                {cap}
              </div>
              <div className="font-serif font-bold" style={{ fontSize: 24, lineHeight: 1, color: TONE[tone].c }}>
                {num}
              </div>
            </div>
          ))}
        </div>
      </div>
    </DbCard>
  );
}

function SurfaceTile({ s, posture }: { s: SurfaceTileDef; posture: Posture }) {
  const d = s[posture];
  const k = TONE[d.st];
  const Icon = dbIcon(s.icon);
  return (
    <DbCard className="flex flex-col overflow-hidden">
      <div style={{ height: 4, background: k.c }} />
      <div className="flex flex-1 flex-col gap-[11px]" style={{ padding: 15 }}>
        <div className="flex items-center gap-[10px]">
          <div
            className="flex flex-none items-center justify-center rounded-md"
            style={{ width: 32, height: 32, background: k.tint, color: k.c }}
          >
            <Icon size={17} />
          </div>
          <div className="min-w-0 flex-1">
            <Eyebrow>{s.eyebrow}</Eyebrow>
            <div className="font-sans font-bold text-text" style={{ fontSize: 14.5, lineHeight: 1.1, marginTop: 2 }}>
              {s.name}
            </div>
          </div>
          <ChevronRight size={16} className="text-text-muted" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="font-serif font-bold text-text" style={{ fontSize: 26, lineHeight: 1 }}>
            {d.main}
          </span>
          <StatusPill tone={d.st} pulse={d.st === 'critical'} />
        </div>
        <div className="text-text-silver" style={{ fontSize: 12.5, lineHeight: 1.3 }}>
          {d.sub}
        </div>
        <div className="mt-auto pt-1">
          <Spark seed={s.key.length * 13 + 7} tone={d.st} w={260} h={26} />
        </div>
      </div>
    </DbCard>
  );
}

function MeshOversight({ posture }: { posture: Posture }) {
  const quarantined = posture === 'critical' ? 14 : posture === 'degraded' ? 1 : 0;
  const Network = dbIcon('network');
  return (
    <DbCard className="mb-[18px] p-5">
      <div className="mb-[6px] flex items-center gap-[11px]">
        <Network size={18} style={{ color: DATA_BLUE }} />
        <div className="flex-1">
          <Eyebrow>Phase 2 · zero-trust muscle oversight</Eyebrow>
          <div className="font-serif font-bold text-text" style={{ fontSize: 19, lineHeight: 1.1 }}>
            Member mesh — per-layer monitoring map
          </div>
        </div>
        <span className="font-mono text-text-silver" style={{ fontSize: 12 }}>
          4,182 nodes
        </span>
        {quarantined > 0 && <StatusPill tone="critical">{quarantined} quarantined</StatusPill>}
      </div>
      <div className="mb-[14px] text-text-silver" style={{ fontSize: 12.5 }}>
        Each muscle layer adds one surface to watch — and load scales in build order, so the watchtower grows one
        manageable layer at a time.
      </div>
      <div className="flex flex-col gap-[9px]">
        {MESH_LAYERS.map((L) => (
          <LayerRow key={L.key} L={L} posture={posture} />
        ))}
      </div>
    </DbCard>
  );
}

function LayerRow({ L, posture }: { L: MeshLayerDef; posture: Posture }) {
  const d = L[posture];
  const k = TONE[d.st];
  const Icon = dbIcon(L.icon);
  return (
    <div
      className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-bg-elevated"
      style={{ padding: '12px 14px', borderLeft: `3px solid ${k.c}`, background: d.st === 'critical' ? k.tint : undefined }}
    >
      <div className="flex flex-none items-center gap-[11px]">
        <span className="font-mono font-bold text-text-muted" style={{ fontSize: 11 }}>
          {L.n}
        </span>
        <div
          className="flex items-center justify-center rounded-md"
          style={{ width: 34, height: 34, background: k.tint, color: k.c }}
        >
          <Icon size={18} />
        </div>
      </div>
      <div className="min-w-0 flex-1" style={{ flexBasis: 180 }}>
        <div className="flex flex-wrap items-center gap-[9px]">
          <span className="font-bold text-text" style={{ fontSize: 14.5 }}>
            {L.name}
          </span>
          {L.goDark && (
            <span
              className="inline-flex items-center gap-1 rounded-full border font-mono font-semibold uppercase"
              style={{
                fontSize: 9.5,
                letterSpacing: '0.06em',
                padding: '1px 8px',
                color: TONE.watch.c,
                background: TONE.watch.tint,
                borderColor: TONE.watch.border,
              }}
            >
              → Go Dark
            </span>
          )}
          {L.heal && d.st === 'critical' && (
            <span
              className="inline-flex items-center gap-1 rounded-full border font-mono font-semibold uppercase"
              style={{
                fontSize: 9.5,
                letterSpacing: '0.06em',
                padding: '1px 8px',
                color: DATA_BLUE,
                background: 'rgba(59,130,246,0.12)',
                borderColor: 'rgba(59,130,246,0.38)',
              }}
            >
              self-heal
            </span>
          )}
        </div>
        <div className="mt-[2px] font-mono text-text-muted" style={{ fontSize: 11 }}>
          watches: {L.watch}
        </div>
      </div>
      <div className="flex min-w-0 flex-1 flex-col items-end gap-[3px] text-right" style={{ flexBasis: 140 }}>
        <span className="font-serif font-bold" style={{ fontSize: 16, lineHeight: 1.05, color: k.c }}>
          {d.sig}
        </span>
        <span className="text-text-silver" style={{ fontSize: 11.5 }}>
          {d.sub}
        </span>
      </div>
      <div className="flex flex-none flex-col items-end gap-[6px]" style={{ width: 88 }}>
        <StatusPill tone={d.st} pulse={d.st === 'critical'} />
        <span className="flex items-center gap-[6px]">
          <span className="font-mono uppercase text-text-muted" style={{ fontSize: 9, letterSpacing: '0.06em' }}>
            load
          </span>
          <LoadDots load={L.load} />
        </span>
      </div>
    </div>
  );
}

function GoDarkStrip({ posture }: { posture: Posture }) {
  const dark = posture === 'critical';
  const k = dark ? TONE.critical : TONE.secure;
  const Icon = dbIcon(dark ? 'wifiOff' : 'globe');
  return (
    <DbCard className="p-4" style={dark ? { background: 'var(--bg-elevated, #0C0E12)', borderColor: k.border } : undefined}>
      <div className="flex items-center gap-[13px]">
        <div
          className="flex flex-none items-center justify-center rounded-md"
          style={{ width: 38, height: 38, background: k.tint, color: k.c }}
        >
          <Icon size={20} />
        </div>
        <div className="flex-1">
          <Eyebrow>Go Dark monitor</Eyebrow>
          <div className="font-serif font-bold text-text" style={{ fontSize: 16, lineHeight: 1.15 }}>
            {dark
              ? 'Spine unreachable — mesh in alive-not-transacting mode'
              : 'Spine nominal — mesh ready, reconcile queue empty'}
          </div>
        </div>
        {dark ? (
          <span className="flex gap-[6px]">
            <StatusPill tone="watch">cache serving</StatusPill>
            <StatusPill tone="watch">P2P relay</StatusPill>
            <StatusPill tone="critical" pulse>
              writes queued
            </StatusPill>
          </span>
        ) : (
          <StatusPill tone="secure">standby</StatusPill>
        )}
      </div>
    </DbCard>
  );
}

function SectionRule({ children }: { children: ReactNode }) {
  return (
    <div className="mb-3 flex items-center gap-[10px]">
      <Eyebrow>{children}</Eyebrow>
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}

/* ---- page ---- */

export function CommandCenterPage() {
  const { posture, setPosture } = useDingleberry();

  return (
    <div className="mx-auto" style={{ maxWidth: 1100, padding: '22px 26px 48px' }}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {(() => {
            const Lock = dbIcon('lock');
            return <Lock size={15} style={{ color: TONE.secure.c }} />;
          })()}
          <span className="font-mono text-text-silver" style={{ fontSize: 11, letterSpacing: '0.04em' }}>
            <b className="text-text">1,284,902</b> transactions secured ·{' '}
            <b className="text-text">4,182</b> mesh nodes watched ·{' '}
            <b className="text-text">0</b> unverified sources trusted
          </span>
        </div>
        <PostureSwitcher posture={posture} setPosture={setPosture} />
      </div>

      <PostureBanner posture={posture} />

      <SectionRule>The six surfaces</SectionRule>
      <div
        className="mb-[18px] grid gap-3"
        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}
      >
        {SURFACES.map((s) => (
          <SurfaceTile key={s.key} s={s} posture={posture} />
        ))}
      </div>

      <MeshOversight posture={posture} />
      <GoDarkStrip posture={posture} />
    </div>
  );
}
