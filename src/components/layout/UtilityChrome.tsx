import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Bell, MessageCircle, ShoppingCart, LayoutGrid } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { SearchModal } from './SearchModal';
import { cn } from '@/lib/utils';

/**
 * Utility chrome cluster shown in top-right of SiteHeader.
 * Final order (left to right):
 *   search · notif · msg · cart · BLiNG! pill · profile-avatar · sidebar-opener (mobile only)
 *
 * - Home icon removed (logo top-left + INTEL sidebar both handle home navigation)
 * - Search icon opens modal (consistent mobile + desktop)
 * - "/" keyboard shortcut opens search modal from anywhere
 * - Cart shown only when count > 0
 * - BLiNG! pill shown only when signed in
 * - Profile combines avatar + handle into one clickable pill
 * - Sidebar opener mobile-only (desktop has rail always visible)
 */
export function UtilityChrome() {
  const { bee } = useAuth();
  const [searchOpen, setSearchOpen] = useState(false);

  // Placeholder counts — wire later
  const notificationCount = 0;
  const messageCount = 0;
  const cartCount = 0;
  const blingBalance = bee ? 0 : null;

  // "/" keyboard shortcut to open search
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isTyping =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;
      if (e.key === '/' && !isTyping && !searchOpen) {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [searchOpen]);

  function openSurfaces() {
    window.dispatchEvent(new CustomEvent('open-surfaces-drawer'));
  }

  return (
    <>
      <div className="flex items-center gap-1">
        {/* 1. Search — opens modal */}
        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-md text-text-silver transition-colors hover:bg-bg-elevated hover:text-text"
          aria-label="Search"
          title="Search (/)"
        >
          <Search size={16} />
        </button>

        {/* 2. Notifications */}
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

        {/* 3. Messages */}
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

        {/* 4. Cart (only when >0) */}
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

        {/* 5. BLiNG! balance pill */}
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

        {/* 6. Profile-avatar */}
        {bee ? (
          <Link
            to="/profile"
            className="ml-0.5 flex items-center gap-2 rounded-full border border-border-bright bg-bg-elevated py-0.5 pl-0.5 pr-3 transition-all hover:border-text-silver/50 hover:bg-panel-2"
            title={`Profile · @${bee.handle}`}
          >
            <span
              className="relative flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-honey/30 to-kettle-sourced/30 font-display font-semibold text-text"
              style={{ fontSize: '13px' }}
            >
              {bee.handle.slice(0, 1).toUpperCase()}
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

        {/* 7. Sidebar opener — MOBILE ONLY */}
        <button
          type="button"
          onClick={openSurfaces}
          aria-label="Open surfaces menu"
          title="Surfaces"
          className="ml-1 flex h-9 w-9 items-center justify-center rounded-md border border-honey/40 bg-honey/10 text-honey transition-colors hover:border-honey/70 hover:bg-honey/20 md:hidden"
        >
          <LayoutGrid size={16} />
        </button>
      </div>

      {/* Search modal — rendered outside the chrome row */}
      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
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
