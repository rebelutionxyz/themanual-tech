/* FreedomBLiNGS — Honey Gradations (Slice 4). Subscription tiers $0 / $3 / $8 /
   $13 (Wildflower / Clover / Manuka featured / Royal Jelly). Ported from
   gradations.jsx. Prices are canon-ratified; per-tier perks are illustrative
   until confirmed. Membership is a monthly subscription.

   CTAs are INERT: the Stripe checkout-session function doesn't exist yet, so the
   paid tiers carry a "memberships open at launch" caption rather than a fake
   checkout. Wildflower ($0) is the universal baseline every member already holds. */
import { BMark } from '@/components/freedomblings/marks';

interface Tier {
  key: string;
  price: string;
  cadence: string;
  tag?: string;
  feature?: boolean;
  current?: boolean;
  perks: string[];
}

const TIERS: Tier[] = [
  {
    key: 'Wildflower',
    price: '0',
    cadence: 'free',
    tag: 'Every Sovereign Beeing',
    current: true,
    perks: [
      'A sovereign wallet & honest ledger',
      'FREE BLiNG! by what you do',
      'Read the Open Books',
    ],
  },
  {
    key: 'Clover',
    price: '3',
    cadence: '/mo',
    perks: [
      'Everything in Wildflower',
      'Higher Drip reach on what you make',
      'Custom standing display',
    ],
  },
  {
    key: 'Manuka',
    price: '8',
    cadence: '/mo',
    tag: 'Most chosen',
    feature: true,
    perks: [
      'Everything in Clover',
      'Priority in OFFERs & the marketplace',
      'Steward your own commons',
    ],
  },
  {
    key: 'Royal Jelly',
    price: '13',
    cadence: '/mo',
    perks: [
      'Everything in Manuka',
      'Deepest curation & faucet reach',
      'Founding voice in the comb',
    ],
  },
];

export function GradationsPage() {
  return (
    <main className="app-main">
      <div className="commons-top">
        <div>
          <div className="eyebrow">Membership in the comb</div>
          <h1>Honey Gradations</h1>
          <div className="sub">
            Choose how deep you tend the comb. Membership unlocks reach and tools.
          </div>
        </div>
        <div className="commons-tags">
          <span className="pill">
            <BMark /> Billed monthly
          </span>
        </div>
      </div>

      <div className="grad-grid">
        {TIERS.map((t) => (
          <div
            className={`grad-card${t.feature ? ' feature' : ''}${t.current ? ' current' : ''}`}
            key={t.key}
          >
            {t.tag && <div className="grad-tag">{t.tag}</div>}
            <div className="grad-name">{t.key}</div>
            <div className="grad-price">
              <span className="gp-cur">$</span>
              <span className="num gp-n">{t.price}</span>
              <span className="gp-cad">{t.cadence}</span>
            </div>
            <ul className="grad-perks">
              {t.perks.map((p) => (
                <li key={p}>
                  <span className="gp-tick" />
                  {p}
                </li>
              ))}
            </ul>
            <button
              type="button"
              className={`grad-btn${t.feature && !t.current ? ' solid' : ''}${t.current ? ' ghost' : ''}`}
              disabled
            >
              {t.current ? 'Your tier' : `Choose ${t.key}`}
            </button>
          </div>
        ))}
      </div>

      <div className="grad-caption">
        Memberships open at launch — checkout wires in then. Wildflower is free, always.
      </div>

      <div className="ledger-foot">
        <span className="seal" />
        Honey Gradations are a membership — they unlock reach and tools. Per-tier perks are
        illustrative until confirmed.
      </div>
    </main>
  );
}
