import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { ManualLogo } from '@/components/ui/ManualLogo';
import { UtilityChrome } from './UtilityChrome';

export function SiteHeader() {
  const { configured } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/95 backdrop-blur-md">
      <div className="safe-pad-x flex h-14 items-center gap-3 px-4 md:px-6">
        {/* Logo + wordmark (clickable, goes home) */}
        <Link
          to="/"
          className="group flex flex-shrink-0 items-center gap-2.5 no-drag"
          aria-label="Home"
        >
          <ManualLogo size={28} className="transition-opacity group-hover:opacity-90" />
          <span className="hidden font-display text-lg font-semibold tracking-wide text-text-silver-bright sm:inline">
            The Manual
          </span>
        </Link>

        <div className="flex-1" />

        {/* Right: utility chrome (search · notif · msg · cart · BLiNG! · profile · [mobile surfaces]) */}
        <div className="flex flex-shrink-0 items-center gap-2">
          {!configured && (
            <span
              className="hidden font-mono text-text-muted lg:inline"
              style={{ fontSize: '11px' }}
              data-size="meta"
              title="Supabase env vars not set"
            >
              read-only mode
            </span>
          )}
          <UtilityChrome />
        </div>
      </div>
    </header>
  );
}
