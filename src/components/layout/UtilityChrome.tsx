import { Link } from 'react-router-dom';
import { Home, Search, Bell, MessageCircle, ShoppingCart } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';

/**
 * Utility chrome cluster shown in top-right of SiteHeader.
 * Order: home · search · BLiNG! balance · notifications · messages · cart · profile
 *
 * Cart is only shown when it has items (count > 0).
 * BLiNG! pill shows balance; click navigates to /bling surface.
 */
export function UtilityChrome() {
  const { bee } = useAuth();

  // TODO wire these to real data once surfaces exist
  const notificationCount = 0;
  const messageCount = 0;
  const cartCount = 0;
  const blingBalance = bee ? 0 : null;

  return (
    <div className="flex items-center gap-1">
      {/* Home icon */}
      <Link
        to="/"
        className="flex h-9 w-9 items-center justify-center rounded-md text-text-silver transition-colors hover:bg-bg-elevated hover:text-text"
        aria-label="Home"
        title="Home"
      >
        <Home size={16} />
      </Link>

      {/* Search (opens search UI — placeholder for now) */}
      <button
        type="button"
        className="flex h-9 w-9 items-center justify-center rounded-md text-text-silver transition-colors hover:bg-bg-elevated hover:text-text"
        aria-label="Search"
        title="Search"
        onClick={() => {
          // TODO: open site-wide search modal
          console.log('search clicked');
        }}
      >
        <Search size={16} />
      </button>

      {/* BLiNG! balance pill */}
      {blingBalance !== null && (
        <Link
          to="/bling"
          className="flex items-center gap-1.5 rounded-full border border-honey/30 bg-bg-elevated px-2.5 py-1 transition-colors hover:border-honey/60"
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

      {/* Notifications */}
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

      {/* Messages */}
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

      {/* Cart (only if has items) */}
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

      {/* Profile */}
      {bee ? (
        <Link
          to="/profile"
          className="flex items-center gap-2 rounded-full border border-border bg-bg-elevated px-2.5 py-1 text-sm transition-colors hover:border-border-bright hover:bg-panel-2"
          title={`Profile · @${bee.handle}`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-kettle-sourced" />
          <span
            className="hidden font-mono text-text-silver md:inline"
            style={{ fontSize: '12px' }}
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
