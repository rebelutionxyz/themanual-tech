import { type ProvTx, fmtMicros, toMicros, useProvenance } from '@/lib/freedomblings/ledger';
/* FreedomBLiNGS — Provenance overlay ("Trace this BLiNG!").
   Ported from provenance.jsx (frosted ink backdrop · transform-only entrance ·
   ✕ / backdrop / Escape close). LIVE-HONEST: renders only what the Bee's OWN
   records prove (see useProvenance). The design's illustrative lineage chain is
   NOT shipped — cross-member hops are RLS-blocked and shown as an honest
   "trail continues beyond your ledger" node, never fabricated. */
import { useEffect } from 'react';

function Initial({ who }: { who: string }) {
  const ch = (who || '?').replace(/^@/, '').charAt(0).toUpperCase();
  return <span className="avatar sm">{ch}</span>;
}

export function ProvenanceOverlay({ entry, onClose }: { entry: ProvTx; onClose: () => void }) {
  const prov = useProvenance(entry);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const mag = toMicros(entry.amount);
  const amtFmt = fmtMicros(mag < 0n ? -mag : mag);
  const headDesc = entry.memo || 'A movement in your ledger';
  const hops = prov.nodes.length;

  return (
    // biome-ignore lint/a11y/useSemanticElements: a surface-scoped positioned overlay, not a top-layer <dialog> (no showModal); role="dialog" is the correct semantics here
    <div className="constel" role="dialog" aria-label="Provenance of this BLiNG!">
      <button type="button" className="constel-backdrop" aria-label="Close" onClick={onClose} />
      <div className="prov-panel card">
        <div className="constel-head">
          <div>
            <div className="eyebrow">Provenance · your records</div>
            <h2>Trace this BLiNG!</h2>
            <p className="constel-sub">
              {headDesc} · <b className="num">{amtFmt} BLiNG!</b>. Here is what your own ledger can
              prove about how it came to be — in the open.
            </p>
            {prov.lot && (
              <div className="dna-chip">
                <span className="dna-k">BLiNG! DNA</span>
                <span className="dna-v num">{prov.lot.dnaCode}</span>
              </div>
            )}
          </div>
          <button type="button" className="constel-x" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="prov-line">
          {prov.nodes.map((s, i) => {
            const isNow = s.kind === 'now';
            const isOrigin = s.kind === 'origin';
            const last = i === hops - 1;
            return (
              <div
                // biome-ignore lint/suspicious/noArrayIndexKey: fixed, ordered trace nodes — position IS identity
                key={i}
                className={`prov-node ${s.kind}`}
              >
                <div className="pn-rail">
                  <span className="pn-dot" />
                  {!last && <span className="pn-stem" />}
                </div>
                <div className="pn-card">
                  <div className="pn-top">
                    {!isNow && s.tag && <span className={`l-tag ${s.kind}`}>{s.tag}</span>}
                    {isNow && <span className="pn-now-tag">Now</span>}
                    {s.when && <span className="pn-when">{s.when}</span>}
                    {s.amt && <span className="pn-amt num">{s.amt}</span>}
                  </div>
                  <div className="pn-desc">{s.desc}</div>
                  {s.who && (
                    <div className="pn-who">
                      <Initial who={s.who} />
                      {s.who}
                    </div>
                  )}
                  {isOrigin && (
                    <div className="pn-bucket">
                      Issued from: <b>the well · Royal Jelly Treasury</b>
                    </div>
                  )}
                  {isOrigin && prov.lot && (
                    <div className="lot-detail">
                      <span className="pn-vintage num">
                        jar · {prov.lot.origin} · vintage {prov.lot.vintage}
                      </span>
                      {prov.lot.sealed && (
                        <span className="sealed-glint" title="A sealed gift, not yet revealed">
                          sealed ✦
                        </span>
                      )}
                    </div>
                  )}
                  {isOrigin && <div className="pn-label">Origin · FREEd into existence</div>}
                  {isNow && <div className="pn-label now">Resting in your ledger</div>}
                </div>
              </div>
            );
          })}
        </div>

        <div className="prov-foot">
          <span className="seal" />
          <span>
            From your own records · {hops} step{hops > 1 ? 's' : ''} · nothing here can be
            rewritten.
          </span>
          <span className="prov-verify">Yours ✓</span>
        </div>
      </div>
    </div>
  );
}
