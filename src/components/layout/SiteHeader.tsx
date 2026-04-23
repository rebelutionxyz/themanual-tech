import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { ManualLogo } from '@/components/ui/ManualLogo';
import { UtilityChrome } from './UtilityChrome';

export function SiteHeader() {
  const { configured } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/95 backdrop-blur-md">
      <div className="flex h-14 items-center gap-4 px-4 md:px-6">
        {/* Logo + wordmark (clickable, goes home) */}
        <Link
          to="/"
          className="group flex items-center gap-2.5 no-drag"
          aria-label="Home"
        >
          <ManualLogo size={28} className="transition-opacity group-hover:opacity-90" />
          <span className="hidden font-display text-lg font-semibold tracking-wide text-text-silver-bright sm:inline">
            The Manual
          </span>
        </Link>

        <div className="flex-1" />

        {/* Utility chrome: home · search · BLiNG! · notif · msg · cart · profile */}
        <div className="flex items-center gap-2">
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
          <UtilityChrome />
        </div>
      </div>
    </header>
  );
}
