/* FreedomBLiNGS — a single ledger row (shared by Balance preview + The Ledger).
   Icon + description + type tag (FREEd/GOT/GAVE/OFFER) + counterparty + signed
   amount (ink-toned — the +/− is drawn in CSS via the accent, no casino red/green)
   + a sub line (running balance on The Ledger, date on the Balance preview).
   Rows with an amount are clickable → Provenance. */
import { TAG_LABEL } from '@/lib/freedomblings/ledger';
import { BMark } from './marks';

export interface LedgerRowView {
  kind: string;
  dir: string; // 'pos' | 'neg'
  desc: string;
  who: string;
  amt: string;
  sub?: string; // running balance ("… bal.") or a date
}

export function LedgerRow({ r, onTrace }: { r: LedgerRowView; onTrace?: () => void }) {
  const clickable = Boolean(onTrace);
  return (
    <div
      className={`lrow${clickable ? ' clickable' : ''}`}
      onClick={onTrace}
      onKeyDown={
        clickable
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onTrace?.();
              }
            }
          : undefined
      }
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      title={clickable ? 'Trace this BLiNG! — see its lineage' : undefined}
    >
      <div className={`l-ico${r.dir === 'pos' ? ' in' : ''}`}>
        <BMark fill={r.dir === 'pos'} />
      </div>
      <div className="l-main">
        <div className="l-desc">{r.desc}</div>
        <div className="l-meta">
          <span className={`l-tag ${r.kind}`}>{TAG_LABEL[r.kind] ?? r.kind}</span>
          {r.who && <span className="who">{r.who}</span>}
        </div>
      </div>
      <div className="l-amt">
        <div className={`amt ${r.dir}`}>{r.amt}</div>
        {r.sub && <div className="run num">{r.sub}</div>}
      </div>
      <div className="l-go" aria-hidden="true">
        {clickable ? '›' : ''}
      </div>
    </div>
  );
}
