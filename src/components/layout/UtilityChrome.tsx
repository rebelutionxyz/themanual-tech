import { Link } from 'react-router-dom';
import { Home, Search, Bell, MessageCircle, ShoppingCart, LayoutGrid } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';

/**
 * Utility chrome cluster shown in top-right of SiteHeader.
 * Final order (left to right):
 *   home · search · notif · msg · cart · BLiNG! pill · profile-avatar · sidebar-opener
 *
 * - Cart shown only when count > 0
 * - BLiNG! pill shown only when signed in
 * - Profile combines avatar + handle into one clickable pill; goes to /profile
 * - Sidebar-opener dispatches a custom event that PlatformRail listens for
 *   (opens pinned popup on desktop; opens drawer on mobile)
 */
export function UtilityChrome() {
  const { bee } = useAuth();

  // Placeholder counts — wire these to real data later
  const notificationCount = 0;
  const messageCount = 0;
  const cartCount = 0;
  const blingBalance = bee ? 0 : null;

  function openSurfaces() {
    window.dispatchEvent(new CustomEvent('open-surfaces-drawer'));
  }

  return (
    <div className="flex items-center gap-1">
      {/* 1. Home */}
      <Link
        to="/"
        className="flex h-9 w-9 items-center justify-center rounded-md text-text-silver transition-colors hover:bg-bg-elevated hover:text-text"
        aria-label="Home"
        title="Home"
      >
        <Home size={16} />
      </Link>

      {/* 2. Search */}
      <button
        type="button"
        className="flex h-9 w-9 items-center justify-center rounded-md text-text-silver transition-colors hover:bg-bg-elevated hover:text-text"
        aria-label="Search"
        title="Search"
        onClick={() => console.log('search clicked (placeholder)')}
      >
        <Search size={16} />
      </button>

      {/* 3. Notifications */}
      {bee && (
        <IconButton
          ariaLabel="Notifications"
          title="Notifications"
          badge={notificationCount}
          onClick={() => console.log('notifications clicked')}
        >
          <Bell size={16} />
        </IconButton>
      )}

      {/* 4. Messages */}
      {bee && (
        <IconButton
          ariaLabel="Messages"
          title="Messages"
          badge={messageCount}
          onClick={() => console.log('messages clicked')}
        >
          <MessageCircle size={16} />
        </IconButton>
      )}

      {/* 5. Cart (only if >0) */}
      {bee && cartCount > 0 && (
        <IconButton
          ariaLabel="Cart"
          title="Cart"
          badge={cartCount}
          onClick={() => console.log('cart clicked')}
        >
          <ShoppingCart size={16} />
        </IconButton>
      )}

      {/* 6. BLiNG! balance pill */}
      {blingBalance !== null && (
        <Link
          to="/bling"
          className="ml-0.5 flex items-center gap-1.5 rounded-full border border-honey/40 bg-bg-elevated px-2.5 py-1 transition-colors hover:border-honey/70"
          title="BLiNG! balance"
        >
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: '#FAD15E' }}
          />
          <span
            className="bling font-mono tracking-wide"
            style={{ fontSize: '12px' }}
          >
            {blingBalance.toLocaleString()}
          </span>
        </Link>
      )}

      {/* 7. Profile-avatar (bigger + brighter than before) */}
      {bee ? (
        <Link
          to="/profile"
          className="ml-0.5 flex items-center gap-2 rounded-full border border-border-bright bg-bg-elevated py-0.5 pl-0.5 pr-3 transition-all hover:border-text-silver/50 hover:bg-panel-2"
          title={`Profile · @${bee.handle}`}
        >
          {/* Avatar circle (larger, brighter) */}
          <span
            className="relative flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-honey/30 to-kettle-sourced/30 font-display font-semibold text-text"
            style={{ fontSize: '13px' }}
          >
            {bee.handle.slice(0, 1).toUpperCase()}
            {/* Presence dot */}
            <span
              className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-bg-elevated bg-kettle-sourced"
              aria-label="Online"
            />
          </span>
          <span
            className="hidden font-mono text-text-silver md:inline"
            style={{ fontSize: '12.5px' }}
          >
            {bee.handle}
          </span>
        </Link>
      ) : (
        <Link
          to="/login"
          className="rounded-md border border-border-bright bg-bg-elevated px-3 py-1 text-sm text-text-silver transition-colors hover:bg-panel-2 hover:text-text"
        >
          Sign in
        </Link>
      )}

      {/* 8. Sidebar opener — always visible now (desktop: pin active popup, mobile: open drawer) */}
      <button
        type="button"
        onClick={openSurfaces}
        aria-label="Open surfaces menu"
        title="Surfaces"
        className="ml-1 flex h-9 w-9 items-center justify-center rounded-md border border-honey/40 bg-honey/10 text-honey transition-colors hover:border-honey/70 hover:bg-honey/20"
      >
        <LayoutGrid size={16} />
      </button>
    </div>
  );
}

function IconButton({
  ariaLabel,
  title,
  badge,
  onClick,
  children,
}: {
  ariaLabel: string;
  title: string;
  badge?: number;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      title={title}
      className={cn(
        'relative flex h-9 w-9 items-center justify-center rounded-md text-text-silver transition-colors',
        'hover:bg-bg-elevated hover:text-text',
      )}
    >
      {children}
      {badge !== undefined && badge > 0 && (
        <span
          className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-kettle-unsourced px-1 font-mono text-text"
          style={{ fontSize: '10px' }}
        >
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </button>
  );
}
