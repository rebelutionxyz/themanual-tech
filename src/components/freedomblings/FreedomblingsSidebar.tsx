import { useAuth } from '@/lib/auth';
/* FreedomBLiNGS — the left Sidebar (ported from frames.jsx).
   Ledger group + Member group + member chip at the foot. Slice 1 wires only
   Balance (the one live route); the rest render faithfully but inert ("soon")
   until their slices land — no dead links, no "coming soon" fakery in copy. */
import { useLocation, useNavigate } from 'react-router-dom';
import { LauncherGlyph, Mark } from './marks';

interface NavDef {
  id: string;
  label: string;
  path?: string; // present = live route
  tag?: string;
}

const LEDGER_NAV: NavDef[] = [
  { id: 'balance', label: 'Balance', path: '/freedomblings' },
  { id: 'earning', label: 'Earning' },
  { id: 'circulation', label: 'Circulation' },
  { id: 'ledger', label: 'The Ledger' },
  { id: 'openbooks', label: 'The Open Books' },
  { id: 'charter', label: 'The Charter' },
  { id: 'move', label: 'Give · Get · Offer' },
];

const MEMBER_NAV: NavDef[] = [
  { id: 'standing', label: 'Standing' },
  { id: 'gradations', label: 'Gradations' },
  { id: 'commons', label: 'Commons' },
  { id: 'lineage', label: 'Lineage' },
  { id: 'legacy', label: 'Legacy' },
  { id: 'emergency', label: 'Safety net' },
];

function NavItem({ n, active, onGo }: { n: NavDef; active: boolean; onGo: (p: string) => void }) {
  const live = Boolean(n.path);
  return (
    <div
      className={`nav-item${active ? ' active' : ''}${live ? ' clickable' : ' soon'}`}
      onClick={live ? () => onGo(n.path as string) : undefined}
      onKeyDown={
        live
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onGo(n.path as string);
              }
            }
          : undefined
      }
      role={live ? 'button' : undefined}
      tabIndex={live ? 0 : undefined}
      title={live ? undefined : 'Arrives in a later slice'}
    >
      <span className="ni-mark" />
      {n.label}
      {n.tag && <span className="ni-tag">{n.tag}</span>}
    </div>
  );
}

export function FreedomblingsSidebar() {
  const { bee } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const active = pathname.replace(/\/+$/, '') === '/freedomblings' ? 'balance' : '';
  const go = (p: string) => navigate(p);

  const handle = bee?.handle ?? null;
  const avatarLetter = (handle ?? 'B').replace(/^@/, '').charAt(0).toUpperCase() || 'B';

  return (
    <aside className="app-side">
      {/* brand = constellation launcher (overlay arrives in a later slice) */}
      <button type="button" className="side-brand sb-launch" title="The HoneyComb constellation">
        <Mark size={24} />
        <div className="nm">
          Freedom<b>BLiNGS</b>
        </div>
        <LauncherGlyph />
      </button>

      <div className="nav-label">Ledger</div>
      <nav className="nav">
        {LEDGER_NAV.map((n) => (
          <NavItem key={n.id} n={n} active={active === n.id} onGo={go} />
        ))}
      </nav>

      <div className="nav-label">Member</div>
      <nav className="nav">
        {MEMBER_NAV.map((n) => (
          <NavItem key={n.id} n={n} active={active === n.id} onGo={go} />
        ))}
      </nav>

      <div className="side-foot">
        <div className="member-chip">
          <div className="avatar">{avatarLetter}</div>
          <div>
            <div className="mc-name">{handle ?? 'Not signed in'}</div>
            <div className="mc-role">{handle ? 'Sovereign Beeing' : 'Visitor'}</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
