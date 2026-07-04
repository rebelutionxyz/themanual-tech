/* commons.jsx — Commons: transparent, member-owned shared treasuries */

const COMMONS_LEDGER = [
  { kind: "got",   desc: "Rosa GAVE her monthly tithe to the commons", who: "@rosa", amt: "90", dir: "pos", run: "4,820" },
  { kind: "freed", desc: "FREEd for collective stewardship of the river", who: "Productive action", amt: "120", dir: "pos", run: "4,730" },
  { kind: "given", desc: "GAVE to the Marsh Crew — for clearing the weir", who: "@marsh-crew", amt: "150", dir: "neg", run: "4,610" },
  { kind: "got",   desc: "Theo GAVE to the commons", who: "@theo", amt: "60", dir: "pos", run: "4,760" },
  { kind: "given", desc: "GAVE to FreedomNETWORK — to fund a river dispatch", who: "@freedomnetwork", amt: "80", dir: "neg", run: "4,700" },
];

const COMMONS_TAG = { freed: "FREEd", got: "GOT", given: "GAVE" };

const STEWARDS = [
  { i: "R", name: "Rosa Maren", h: "@rosa" },
  { i: "A", name: "Amara Osei", h: "@amara" },
  { i: "J", name: "Jonah Pell", h: "@jonah" },
];

const DECISIONS = [
  { title: "GIVE 400 to restore the south bank", forN: 88, total: 142, status: "Open · 3 days left", cls: "open" },
  { title: "Welcome 12 new keepers with a starter GIVE", forN: 121, total: 142, status: "Passing", cls: "pass" },
];

function CommonsRow({ r }) {
  return (
    <div className="lrow">
      <div className={"l-ico" + (r.dir === "pos" ? " in" : "")}><BMark fill={r.dir === "pos"} /></div>
      <div className="l-main">
        <div className="l-desc">{r.desc}</div>
        <div className="l-meta">
          <span className={"l-tag " + r.kind}>{COMMONS_TAG[r.kind]}</span>
          <span className="who">{r.who}</span>
        </div>
      </div>
      <div className="l-amt">
        <div className={"amt " + r.dir}>{r.amt}</div>
        <div className="run num">{r.run} held</div>
      </div>
      <div className="l-go" aria-hidden="true" />
    </div>
  );
}

function Decision({ d }) {
  const pct = Math.round((d.forN / d.total) * 100);
  return (
    <div className="decision">
      <div className="dec-top">
        <span className="dec-title">{d.title}</span>
        <span className={"dec-status " + d.cls}>{d.status}</span>
      </div>
      <div className="dec-bar"><i style={{ width: pct + "%" }} /></div>
      <div className="dec-meta"><b className="num">{d.forN}</b> of <span className="num">{d.total}</span> keepers in favor · decided in the open</div>
    </div>
  );
}

function Commons() {
  const ctx = React.useContext(FrameCtx);
  const riverkeepers = { id: "@riverkeepers", name: "the Riverkeepers", handle: "@riverkeepers · commons", a: "R" };
  return (
    <main className="app-main">
      <div className="commons-top">
        <div>
          <div className="eyebrow">A member-owned commons</div>
          <h1>The Riverkeepers</h1>
          <div className="sub">A shared treasury tending the river and the people who keep it. Open to all — no steward moves value in secret.</div>
        </div>
        <div className="commons-tags">
          <span className="pill"><span className="live-dot" />Open · 142 keepers</span>
        </div>
      </div>

      <div className="commons-hero card">
        <div className="ch-bal">
          <div className="eyebrow">Held by the commons</div>
          <div className="ch-amount"><HeroMark /><span className="num">4,820</span><span className="ch-u">BLiNG!</span></div>
        </div>
        <div className="ch-flows">
          <div className="ch-flow">
            <div className="cf-k">In this season</div>
            <div className="cf-v pos num">+ 1,240</div>
            <div className="cf-s">tithes, gifts & FREEd stewardship</div>
          </div>
          <div className="ch-flow">
            <div className="cf-k">Out this season</div>
            <div className="cf-v neg num">− 760</div>
            <div className="cf-s">GAVE to causes & keepers</div>
          </div>
          <div className="ch-flow">
            <div className="cf-k">Stewards</div>
            <div className="cf-stew">
              {STEWARDS.map((s) => <span className="avatar sm" key={s.h} title={s.name}>{s.i}</span>)}
              <span className="cf-stew-n">3 stewards</span>
            </div>
            <div className="cf-s">propose & move value — in full view</div>
          </div>
        </div>
      </div>

      <div className="commons-grid">
        <div>
          <div className="recent-head"><div className="eyebrow">The commons ledger</div>
            <span className="seeall">Public to all 142 keepers</span></div>
          <div className="ledger-list">
            {COMMONS_LEDGER.map((r, i) => <CommonsRow key={i} r={r} />)}
          </div>
          <div className="ledger-foot">
            <span className="seal" />
            Every BLiNG! in this commons is visible to every keeper. The treasury cannot move in secret.
          </div>
        </div>

        <div className="commons-aside">
          <div className="card aside-card">
            <h3>Open decisions</h3>
            <div className="decisions">
              {DECISIONS.map((d, i) => <Decision key={i} d={d} />)}
            </div>
          </div>
          <div className="card aside-card">
            <h3>Stewards</h3>
            <div className="people">
              {STEWARDS.map((s) => (
                <div className="person" key={s.h}>
                  <div className="avatar">{s.i}</div>
                  <div><div className="p-name">{s.name}</div><div className="p-handle">{s.h}</div></div>
                </div>
              ))}
            </div>
          </div>
          <button className="btn-give" onClick={() => ctx.give({ member: riverkeepers, amount: 90 })}><BMark /> GIVE to this commons</button>
        </div>
      </div>
    </main>
  );
}

Object.assign(window, { Commons });
