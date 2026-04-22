import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { MANIFESTO } from '@/lib/manifesto';
import { ManualLogo } from '@/components/ui/ManualLogo';

export function HomePage() {
  return (
    <main className="relative mx-auto max-w-5xl px-4 py-16 md:px-8 md:py-28">
      {/* Background sacred geometry (very subtle) */}
      <SacredGeometry />

      <div className="relative text-center">
        <div className="mb-10 flex justify-center">
          <ManualLogo size={88} className="animate-pulse-slow" />
        </div>

        <h1 className="font-display text-5xl font-semibold tracking-tight text-text-silver-bright md:text-7xl">
          The Manual
        </h1>
        <p
          className="mt-4 font-mono text-text-muted"
          style={{ fontSize: '13px' }}
          data-size="meta"
        >
          5,997 atoms · 13 realms · one sovereign record
        </p>

        {/* Three-line manifesto */}
        <div className="mx-auto mt-16 max-w-2xl space-y-4 md:mt-20">
          {MANIFESTO.map((line, i) => (
            <p
              key={i}
              className="font-display text-2xl italic leading-relaxed text-text-silver md:text-3xl"
              style={{ animationDelay: `${i * 200}ms` }}
            >
              {line}
            </p>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-16 flex flex-col items-center gap-4 md:mt-20">
          <Link
            to="/manual"
            className="group inline-flex items-center gap-2 rounded-full border border-border-bright bg-bg-elevated px-6 py-3 text-text-silver-bright transition-all hover:border-text-silver hover:bg-panel-2"
          >
            <span className="font-display text-lg tracking-wide">Enter the Manual</span>
            <ArrowRight
              size={18}
              className="transition-transform group-hover:translate-x-0.5"
            />
          </Link>
          <p
            className="font-mono text-text-muted"
            style={{ fontSize: '11px' }}
            data-size="meta"
          >
            No login required to read
          </p>
        </div>

        {/* Secondary invitation */}
        <div className="mx-auto mt-24 max-w-xl border-t border-border pt-12">
          <p className="text-text-dim" style={{ fontSize: '14px' }}>
            A research instrument for sovereign Bees. Nothing is deleted. Truth is a shape,
            not a verdict. Every claim has a kettle state — cold water to whistling fact.
          </p>
        </div>

        {/* 19 Surfaces preview */}
        <div className="mx-auto mt-16 max-w-3xl">
          <div
            className="mb-4 font-mono uppercase tracking-widest text-text-muted"
            style={{ fontSize: '11px' }}
            data-size="meta"
          >
            19 Surfaces · One HoneyComb
          </div>
          <div className="flex flex-wrap justify-center gap-1.5">
            {[
              'BLiNG!', 'INTEL', 'UNITE', 'RULE', 'COMMS', 'GIVE', 'CHAT', 'PULSE',
              'BAZAAR', 'BRAND', 'PRIZE', 'PROMOTION', 'MANUAL', 'SECURE', 'SAFE',
              'PRODUCTION', 'EDU', 'VOTE', 'LEGAL',
            ].map((name) => (
              <span
                key={name}
                className={
                  name === 'BLiNG!'
                    ? 'bling rounded border border-border bg-bg-elevated px-2 py-1 font-mono'
                    : 'rounded border border-border bg-bg-elevated px-2 py-1 font-mono text-text-silver'
                }
                style={{ fontSize: '11px' }}
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}

/** Flower of Life background — subtle, low opacity, SVG */
function SacredGeometry() {
  const r = 60;
  const circles: Array<[number, number]> = [[0, 0]];
  // 6 around center
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i;
    circles.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  // 12 outer
  for (let i = 0; i < 12; i++) {
    const a = (Math.PI / 6) * i;
    circles.push([Math.cos(a) * r * 2, Math.sin(a) * r * 2]);
  }

  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.04]"
      viewBox="-200 -200 400 400"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
    >
      <g stroke="#C8D1DA" strokeWidth="0.6" fill="none">
        {circles.map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r={r} />
        ))}
      </g>
    </svg>
  );
}
