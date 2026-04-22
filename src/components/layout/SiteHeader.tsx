import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { ManualLogo } from '@/components/ui/ManualLogo';
import { cn } from '@/lib/utils';

export function SiteHeader() {
  const { bee, configured } = useAuth();
  const location = useLocation();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/95 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4 md:px-6">
        {/* Logo + wordmark */}
        <Link to="/" className="group flex items-center gap-2.5 no-drag" aria-label="Home">
          <ManualLogo size={28} className="transition-opacity group-hover:opacity-90" />
          <span className="font-display text-lg font-semibold tracking-wide text-text-silver-bright">
            The Manual
          </span>
        </Link>

        {/* Nav */}
        <nav className="ml-4 flex items-center gap-1">
          <NavLink to="/s/manual" active={location.pathname === '/s/manual'}>
            Manual
          </NavLink>
          <NavLink to="/s/intel" active={location.pathname === '/s/intel'}>
            Intel
          </NavLink>
          <NavLink to="/s/unite" active={location.pathname === '/s/unite'}>
            Unite
          </NavLink>
          <NavLink to="/s/bazaar" active={location.pathname === '/s/bazaar'}>
            Bazaar
          </NavLink>
        </nav>

        <div className="flex-1" />

        {/* Right side: auth state */}
        <div className="flex items-center gap-3">
          {!configured && (
            <span
              className="hidden font-mono text-text-muted md:inline"
              style={{ fontSize: '11px' }}
              data-size="meta"
              title="Supabase env vars not set"
            >
              read-only mode
            </span>
          )}
          {bee ? (
            <Link
              to="/profile"
              className={cn(
                'flex items-center gap-2 rounded-full border border-border px-3 py-1 text-sm',
                'hover:border-border-bright hover:bg-bg-elevated transition-colors',
              )}
            >
              <span className="h-2 w-2 rounded-full bg-kettle-sourced" />
              <span className="font-mono text-text-silver" style={{ fontSize: '12px' }}>
                {bee.handle}
              </span>
            </Link>
          ) : (
            <Link
              to="/login"
              className={cn(
                'rounded-md border border-border-bright bg-bg-elevated px-3 py-1 text-sm',
                'text-text-silver hover:bg-panel-2 hover:text-text transition-colors',
              )}
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

function NavLink({
  to,
  active,
  children,
}: {
  to: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      className={cn(
        'rounded-md px-2.5 py-1 text-sm transition-colors',
        active
          ? 'bg-bg-elevated text-text'
          : 'text-text-dim hover:bg-bg-elevated hover:text-text-silver',
      )}
    >
      {children}
    </Link>
  );
}
