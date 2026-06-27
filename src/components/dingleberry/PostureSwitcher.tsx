/* DingleBERRY — posture switcher (mock-demo affordance).
   ------------------------------------------------------------
   Flips the shared posture (secure / degraded / critical) that every DingleBERRY
   surface recolors against. STEP-2 only: there is no real posture signal yet —
   the dashed "sample data" pill keeps that honest. Hoisted out of the overview
   into DingleberryLayout's header so it drives every drill page from one shared
   state (useDingleberryData → Outlet context). */
import { POSTURE_TONE, TONE } from '@/components/dingleberry/tone';
import type { Posture } from '@/lib/dingleberry/contract';

export function PostureSwitcher({
  posture,
  setPosture,
}: {
  posture: Posture;
  setPosture: (p: Posture) => void;
}) {
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
