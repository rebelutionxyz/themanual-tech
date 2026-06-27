import { BMark, HeroMark } from '@/components/freedomblings/marks';
import { type EscrowCard, useEscrow } from '@/lib/freedomblings/escrow';
/* FreedomBLiNGS — Escrow (Slice #7) · LIVE party-data, read + actions.
   The OFFER-assurance layer. Mirrors escrow.jsx's shell, but the design's one
   fabricated example + useState toggle are GONE — this reads live bling_escrows
   (RLS party-scoped) and the status track / parties / amounts / dates are all
   REAL. Held amounts come from each escrow row (never bees.bling_held). Release
   and dispute call the live auth-pinned RPCs with a confirm step. Genesis: 0 rows
   → honest empty, no fake card. CANON: held by the ledger, never by us; no fee,
   no custodian; timelock + dispute in the open. Honey-drop marks; hex decor. */
import { useState } from 'react';

const KIND_LABEL: Record<string, string> = {
  p2p: 'P2P',
  order_match: 'Order match',
  crowdfund: 'Crowdfund',
  campaign: 'Campaign',
  timelock: 'Timelock',
};

const STATUS_META: Record<string, { label: string; cls: string }> = {
  held: { label: 'Held · in escrow', cls: '' },
  released: { label: 'Released · complete', cls: 'released' },
  cancelled: { label: 'Cancelled · refunded', cls: 'cancelled' },
  disputed: { label: 'Disputed · in review', cls: 'disputed' },
  expired: { label: 'Expired', cls: 'expired' },
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function fmtDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

function letterFor(label: string): string {
  return label.replace(/^@/, '').charAt(0).toUpperCase() || 'B';
}

interface CardProps {
  card: EscrowCard;
  onRelease: (id: number) => Promise<{ ok: boolean; error?: string }>;
  onDispute: (id: number) => Promise<{ ok: boolean; error?: string }>;
}

function EscrowCardView({ card, onRelease, onDispute }: CardProps) {
  const [busy, setBusy] = useState<null | 'release' | 'dispute'>(null);
  const [err, setErr] = useState<string | null>(null);
  const meta = STATUS_META[card.status] ?? { label: card.status, cls: '' };
  const kindLabel = `${KIND_LABEL[card.kind] ?? card.kind} escrow · #${card.id}`;
  const isHeld = card.status === 'held';
  const isReleased = card.status === 'released';

  async function act(
    which: 'release' | 'dispute',
    fn: (id: number) => Promise<{ ok: boolean; error?: string }>,
    confirmMsg: string,
  ) {
    if (!window.confirm(confirmMsg)) return;
    setBusy(which);
    setErr(null);
    const r = await fn(card.id);
    setBusy(null);
    if (!r.ok) setErr(r.error ?? 'That action could not be completed.');
  }

  return (
    <div className="card escrow-card">
      <div className="ec-head">
        <span className={`ec-status ${meta.cls}`}>{meta.label}</span>
        <span className="ec-kind num">{kindLabel}</span>
      </div>

      <div className="ec-parties">
        <div className="ec-party">
          <div className="avatar sm">{letterFor(card.creatorLabel)}</div>
          <div>
            <div className="ecp-n">{card.creatorLabel}</div>
            <div className="ecp-r">offering</div>
          </div>
        </div>
        <span className="ec-arrow" />
        <div className="ec-party">
          <div className="avatar sm">{letterFor(card.recipientLabel)}</div>
          <div>
            <div className="ecp-n">{card.recipientLabel}</div>
            <div className="ecp-r">getting</div>
          </div>
        </div>
      </div>

      {card.memo && (
        <div className="ec-for">
          For: <b>{card.memo}</b>
        </div>
      )}

      <div className="ec-amount">
        <HeroMark />
        <span className="num">{card.amount}</span>
        <span className="ec-u">BLiNG! held</span>
      </div>

      {/* Status-driven — not a toy 3-step */}
      {isHeld || isReleased ? (
        <div className="ec-track">
          <div className="ec-node done">
            <span className="ecn-dot" />
            <div className="ecn-k">Funded</div>
            <div className="ecn-d">placed in escrow</div>
          </div>
          <span className={`ec-line${isReleased ? ' done' : ''}`} />
          <div className={`ec-node${isReleased ? ' done' : ' cur'}`}>
            <span className="ecn-dot" />
            <div className="ecn-k">Held</div>
            <div className="ecn-d">by the ledger</div>
          </div>
          <span className={`ec-line${isReleased ? ' done' : ''}`} />
          <div className={`ec-node${isReleased ? ' done' : ''}`}>
            <span className="ecn-dot" />
            <div className="ecn-k">Released</div>
            <div className="ecn-d">to {card.recipientLabel}</div>
          </div>
        </div>
      ) : (
        <div className={`ec-state-line ${meta.cls}`}>
          {card.status === 'cancelled' && <>Refunded to {card.creatorLabel}.</>}
          {card.status === 'disputed' &&
            "In dispute — the comb reviews this in the open. Release is paused until it's resolved."}
          {card.status === 'expired' && 'Expired — the hold has lapsed.'}
        </div>
      )}

      {/* Timelock line — only for timelock escrows */}
      {card.kind === 'timelock' && isHeld && card.timelockReleaseAt && (
        <div className="ec-timelock">
          <BMark /> Auto-releases <b>{fmtDate(card.timelockReleaseAt)}</b> — or the moment both
          sides agree.
        </div>
      )}

      {isReleased && (
        <div className="ec-ok">
          <BMark fill /> Released to {card.recipientLabel} · recorded in the open ledger.
        </div>
      )}

      {err && <div className="comp-error">{err}</div>}

      {/* Actions — only on a held escrow, party-appropriate */}
      {isHeld && (card.canRelease || card.canDispute) && (
        <div className="ec-actions">
          {card.canRelease && (
            <button
              type="button"
              className="give-btn"
              style={{ flex: 1 }}
              disabled={busy !== null}
              onClick={() =>
                act(
                  'release',
                  onRelease,
                  `Release ${card.amount} BLiNG! to ${card.recipientLabel}? This cannot be undone.`,
                )
              }
            >
              <BMark fill />
              {busy === 'release' ? 'Releasing…' : `Release to ${card.recipientLabel}`}
            </button>
          )}
          {card.canDispute && (
            <button
              type="button"
              className="ec-dispute"
              disabled={busy !== null}
              onClick={() =>
                act(
                  'dispute',
                  onDispute,
                  'Open a dispute on this escrow? The comb reviews it in the open and release is paused until it resolves.',
                )
              }
            >
              {busy === 'dispute' ? 'Opening…' : 'Open a dispute'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function EscrowPage() {
  const e = useEscrow();

  if (e.status === 'loading') {
    return (
      <main className="app-main">
        <div className="eyebrow">For OFFERs that need assurance</div>
        <div className="feed-empty" style={{ marginTop: 16 }}>
          <span className="live-dot" /> Opening your escrows…
        </div>
      </main>
    );
  }

  if (e.status === 'signed-out') {
    return (
      <main className="app-main">
        <div className="eyebrow">For OFFERs that need assurance</div>
        <div className="state-card">
          <h2>Sign in to see your escrows</h2>
          <p>
            Escrow holds BLiNG! in trust for OFFERs that need it — released when both sides agree.
            Sign in to see the ones you're a party to.
          </p>
          <a className="signin" href="/login">
            <BMark fill /> Sign in
          </a>
        </div>
      </main>
    );
  }

  if (e.status === 'unavailable') {
    return (
      <main className="app-main">
        <div className="eyebrow">For OFFERs that need assurance</div>
        <div className="state-card">
          <h2>Escrow unavailable</h2>
          <p>Couldn't reach your escrows just now. Try again in a moment.</p>
        </div>
      </main>
    );
  }

  // ----- LIVE -----
  const hasEscrows = e.escrows.length > 0;

  return (
    <main className="app-main">
      <div className="commons-top">
        <div>
          <div className="eyebrow">For OFFERs that need assurance</div>
          <h1>Escrow</h1>
          <div className="sub">
            When an OFFER needs trust on both sides, BLiNG! rests in open escrow — released when
            both are satisfied, timelocked for fairness, and disputed in the open if it ever comes
            to that.
          </div>
        </div>
        <div className="commons-tags">
          <span className="pill">
            <BMark /> Held by the ledger · never by us
          </span>
        </div>
      </div>

      <div className="escrow-grid">
        <div className="escrow-main">
          {hasEscrows ? (
            e.escrows.map((card) => (
              <EscrowCardView
                key={card.id}
                card={card}
                onRelease={e.release}
                onDispute={e.dispute}
              />
            ))
          ) : (
            <div className="card escrow-empty">
              <span className="live-dot" />
              <div>
                <h2>No escrows yet</h2>
                <p>
                  When an OFFER needs trust on both sides, BLiNG! rests in open escrow — released
                  when both agree, timelocked for fairness, disputed in the open if it comes to
                  that.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="escrow-aside">
          <div className="card ob-panel">
            <h3>How escrow protects both</h3>
            <div className="net-steps">
              <div className="net-step">
                <span className="ns-n num">1</span>
                <div>
                  <div className="ns-k">Held by the ledger</div>
                  <div className="ns-d">
                    Not by us, never spendable by either side while it rests.
                  </div>
                </div>
              </div>
              <div className="net-step">
                <span className="ns-n num">2</span>
                <div>
                  <div className="ns-k">Timelock</div>
                  <div className="ns-d">
                    Releases on agreement, or automatically after the set time — no one can stall
                    forever.
                  </div>
                </div>
              </div>
              <div className="net-step">
                <span className="ns-n num">3</span>
                <div>
                  <div className="ns-k">Dispute in the open</div>
                  <div className="ns-d">
                    If something's wrong, the comb reviews it transparently — no hidden arbiter.
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="sovereign-note">
            <span className="sn-mark" />
            <p>
              <b>Trust without a middleman.</b> Escrow is just the ledger holding value honestly
              until a promise is kept — sovereign assurance, no fee, no custodian.
            </p>
          </div>
        </div>
      </div>

      <div className="ledger-foot">
        <span className="seal" />
        Escrow is optional, used only for OFFERs that ask for it — held by the ledger, never by us,
        no fee, no custodian.
      </div>
    </main>
  );
}
