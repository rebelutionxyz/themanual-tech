/* FreedomBLiNGS — the HoneyComb constellation launcher (Slice 4).
   Ported from constellation.jsx: the sibling Astras that share one BLiNG! ledger.
   Opened from the sidebar brand button. Statuses are HONEST for today —
   FreedomBLiNGS (here), TheMANUAL (live), DingleBERRY (live · operators), all
   others Soon. Clicking a live Astra navigates there; your balance follows you.
   Overlay conventions: frosted ink backdrop, transform-only entrance, ✕ /
   backdrop / Escape close, reduced-motion safe. */
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

type AstraStatus = 'here' | 'live' | 'soon';

interface Astra {
  name: string;
  role: string;
  status: AstraStatus;
  to?: string;
}

// Honest as of 2026-06: only TheMANUAL and DingleBERRY (operators) are live.
const ASTRAS: Astra[] = [
  { name: 'FreedomBLiNGS', role: 'BLiNG! · The Sovereign Ledger', status: 'here' },
  { name: 'TheMANUAL', role: 'The knowledge spine', status: 'live', to: '/manual' },
  {
    name: 'DingleBERRY',
    role: 'Security console · operators only',
    status: 'live',
    to: '/dingleberry',
  },
  { name: 'FreedomNETWORK', role: 'The Live News Network', status: 'soon' },
  { name: 'MiniWaves', role: 'Mini Waves · your tasks', status: 'soon' },
  { name: 'BLiNGster', role: 'The games arena', status: 'soon' },
  { name: 'TheWORKSHOP', role: 'Clone-mode workshop', status: 'soon' },
];

const STATUS_LABEL: Record<AstraStatus, string> = { here: 'Here', live: 'Live', soon: 'Soon' };

function AstraCard({ a, onStep }: { a: Astra; onStep: (to: string) => void }) {
  const here = a.status === 'here';
  const clickable = a.status === 'live' && Boolean(a.to);
  return (
    <button
      type="button"
      className={`astra-card${here ? ' current' : ''}${clickable ? ' steppable' : ''}`}
      onClick={clickable ? () => onStep(a.to as string) : undefined}
      disabled={!clickable}
      title={clickable ? 'Step across — your BLiNG! follows you' : undefined}
    >
      <div className="ac-top">
        <span className="ac-mark" />
        <span className="ac-name">{a.name}</span>
        <span className={`astra-status ${a.status}`}>
          <span className="dot" />
          {STATUS_LABEL[a.status]}
        </span>
      </div>
      <div className="ac-role">{a.role}</div>
      {here && <div className="ac-here">This ledger · your BLiNG! lives here</div>}
    </button>
  );
}

export function ConstellationOverlay({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const step = (to: string) => {
    onClose();
    navigate(to);
  };

  return (
    // biome-ignore lint/a11y/useSemanticElements: a surface-scoped positioned overlay, not a top-layer <dialog> (no showModal); role="dialog" is the correct semantics here
    <div className="constel" role="dialog" aria-label="The HoneyComb constellation">
      <button type="button" className="constel-backdrop" aria-label="Close" onClick={onClose} />
      <div className="constel-panel card">
        <div className="constel-head">
          <div>
            <div className="eyebrow">Your constellation</div>
            <h2>The HoneyComb</h2>
            <p className="constel-sub">
              The Astras that share one honest, member-owned BLiNG! ledger. Step across — your
              balance follows you across the comb.
            </p>
          </div>
          <button type="button" className="constel-x" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <div className="astra-grid">
          {ASTRAS.map((a) => (
            <AstraCard key={a.name} a={a} onStep={step} />
          ))}
        </div>
        <div className="constel-foot">
          <span className="seal" />
          Your balance follows you across the comb — one honest, member-owned ledger.
        </div>
      </div>
    </div>
  );
}
