/* THE UNIVERSAL SHELL — SHELL v1.5 (ops_docs SHELL, owner+lead 2026-08-22).
 *
 * The perfected shell every astra wears. SHELL_PORT1 mounts it on /h24 as the
 * REFERENCE implementation the other astras copy-port. Every layout ruling from
 * SHELL v1.5 §LAYOUT is encoded here; the ONLY things an astra swaps are its
 * AstraTokens (accent/tld/logo/display face) — see src/lib/shell/astraTokens.ts.
 *
 * RULINGS ENCODED (SHELL v1.5 §LAYOUT):
 *  - HEADER spans FULL WIDTH (44px); the sidebar hangs BELOW it. The left strip
 *    NEVER moves regardless of sidebar state.
 *  - Left strip order: [logo][TLD][astra picker][back][fwd][collapser]. No
 *    dividers. Logo + TLD are ASTRA-COLORED; the controls are grey (--icon).
 *    SHELL v1.8 (owner 2026-09-03): SEARCH moved to the right toolbar as its
 *    FIRST icon; back/forward hide below `lg` (mobile AND tablet portrait).
 *  - Breadcrumbs live in the CONTENT top-left (never in the header).
 *  - Sidebar = pure nav. Collapsed = 52px ICON RAIL (never disappears); open =
 *    240px. Hovering the rail = INSTANT peek OVER content (absolute, no reflow);
 *    the collapser sets the resting state.
 *  - Right toolbar order: Search, Tasks, Security, Alerts,
 *    Notifications, BLiNG total + gold drop (number first), handle, avatar.
 *    SHELL v1.8: the BLiNG slot shows BLiNG — the astra's OWN balance (h24
 *    tokens) lives at the top of the left sidebar via `sidebarTop`, so the two
 *    currencies are never adjacent (CURRENCY_LAW v1.6 s1). Icons rest WHITE
 *    (--ink) and turn the ASTRA ACCENT on hover (owner 2026-09-03, supersedes
 *    v1.5's per-icon colours). BLiNG is always gold.
 *  - Own name has NO @ (butch); other users are always @name. Handle opens the
 *    your-stuff DRAWER; avatar goes to the profile page.
 *  - ICON DRAWER (right chrome): every toolbar icon opens its quick panel there
 *    — no page load. Tinted color-mix(accent 10%, near-black).
 *  - ONE AUTH BOUNDARY: this frame carries session identity but never gates it;
 *    jumping astras keeps the same login/bee/balance (DOMAINS_MAP v2.2).
 *
 * SHELL_MOBILE1 (2026-08-29, responsive rules — NOT a fork, per SHELL v1.6 s2):
 *  - Back/forward drop below `md` (owner ruling — mobile has OS-level back).
 *  - Header/left-strip gaps tighten below `md`; tap targets never shrink.
 *  - The switcher chevron takes `--accent` (was grey) — a live astra cue,
 *    ready for ASTRA_COLORS v1 without touching this file again.
 */

import { BlingDrawerPanel } from '@/components/shell/BlingDrawerPanel';
import { AstraMark } from '@/components/shell/marks/AstraMark';
import type { AstraTokens } from '@/lib/shell/astraTokens';
import { ASTRA_TOKENS, astraCssVars } from '@/lib/shell/astraTokens';
import type { ShellVisibility } from '@/lib/shell/shellPatchboard';
import { ALL_VISIBLE, SHELL_SWITCH } from '@/lib/shell/shellPatchboard';
import { cn } from '@/lib/utils';
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  Calendar,
  ChevronDown,
  Droplet,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Shield,
  TriangleAlert,
  X,
} from 'lucide-react';
import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';

/* ── nav model ─────────────────────────────────────────────────────────────*/
export interface ShellNavItem {
  id: string;
  label: string;
  icon: ReactNode;
  onClick?: () => void;
  active?: boolean;
  /** Right-aligned count/hint (e.g. a vault count). Rail state hides it. */
  hint?: ReactNode;
}
export interface ShellNavGroup {
  id: string;
  label?: string;
  items: ShellNavItem[];
}

/* ── toolbar model ─────────────────────────────────────────────────────────*/
export type ToolbarSlot = 'tasks' | 'security' | 'alerts' | 'notifications';

/** Desktop hover-open intent delay for toolbar icons (SHELL mock, H24_DRAWER1). */
const HOVER_OPEN_MS = 140;

/* ICON COLOUR LAW — owner 2026-09-03, supersedes SHELL v1.5's per-icon hover
 * colours: "the icons are all white except bling drop, when you hover over them
 * they turn the astra specific color." Rest = --ink, hover = --accent, for every
 * strip and toolbar icon. BLiNG! keeps gold in every state (currency != astra). */
const ICON_REST = 'var(--ink)';
const ICON_HOVER = 'var(--accent)';

/** SHELL v1.10 — header BLiNG reads compact ("10.9k", "1.2M"); the drawer and
 *  the ledger show the full figure. Truncates (never rounds up a balance). */
export function compactAmount(n: number): string {
  const abs = Math.abs(n);
  if (abs < 1000) return n.toLocaleString();
  const trunc = (v: number) => (Math.floor(v * 10) / 10).toString();
  if (abs < 1_000_000) return `${trunc(n / 1000)}k`;
  return `${trunc(n / 1_000_000)}M`;
}

/* ── THE RIGHT SIDEBAR AS ONE SURFACE (owner ruling 2026-09-03) ─────────────
 * "Every icon in the tool bar and some from the left sidebar will use that
 * right sidebar area for their information so it needs to change size based on
 * the icon clicked."
 *
 * So the drawer is no longer a fixed 320px chrome strip that only the toolbar
 * can address. It is ONE surface, keyed by a panel id, and the panel declares
 * its own width. Any caller — a toolbar icon, a left-sidebar entry, a page —
 * opens it by id.
 *
 * WHY THIS EXISTS AT ALL: h24's Recent activity panel put the 8-column routing
 * log inside 320px, which produced a horizontal scrollbar along the bottom of
 * the panel. A table does not get narrower because the container is; it just
 * hides itself behind a scrollbar. The fix is that the panel says how wide it
 * needs to be.
 *
 * Widths are a SET, not free numbers, so panels stay visually consistent:
 *   compact — a list you skim (notifications, alerts, wallet, your stuff)
 *   wide    — a list with structure (tasks, security findings)
 *   table   — a real table that must not scroll sideways (the routing log)
 * Every width is capped at 92vw so no panel can exceed a phone.
 */
export const DRAWER_WIDTH = { compact: 320, wide: 480, table: 760 } as const;
export type DrawerWidth = keyof typeof DRAWER_WIDTH;

/** A panel the right sidebar can show. `width` defaults to compact. */
export interface PanelSpec {
  title: string;
  width?: DrawerWidth;
}

/** Panel id — the four toolbar slots, bling/handle, or any id a page registers. */
export type PanelKey = string;

export interface UniversalShellProps {
  tokens: AstraTokens;
  /** Breadcrumb node, rendered in the CONTENT top-left under the header. */
  breadcrumb?: ReactNode;
  /** Sidebar nav groups (top group + astra groups). */
  nav: ShellNavGroup[];
  /**
   * SHELL v1.8 (owner 2026-09-03): a slot at the TOP of the left sidebar, above
   * the first nav group. h24 puts its token balance here. This is where an
   * astra's OWN balance goes; the header BLiNG slot stays BLiNG. Rendered in
   * the open panel and the hover-peek, not on the 52px rail.
   */
  sidebarTop?: ReactNode;
  /** Live BLiNG! total; null renders an em-dash. Number shows FIRST, gold drop after. */
  bling?: number | null;
  /**
   * H24_FIX1 — the CANONICAL rendering of `bling`, pre-formatted by the caller
   * (e.g. `formatTokens`). When provided, this is what the header total and the
   * drawer title show INSTEAD OF `bling.toLocaleString()` — the astra that reads
   * a fractional balance (h24 tokens) must not show two different-looking
   * numbers for the same balance depending on which corner of the shell reads
   * it. Omit to keep the plain `toLocaleString()` behavior (whole-number BLiNG!).
   */
  blingDisplay?: string;
  /** Small unit label after the number (e.g. "h24") — the "label the unit" half
   *  of the same fix, since this balance is not always BLiNG!. */
  blingUnit?: string;
  /** The signed-in bee's handle WITHOUT @ (own name has no @). null = signed out. */
  handle?: string | null;
  avatarUrl?: string | null;
  /** Toolbar actions. */
  onBack?: () => void;
  onForward?: () => void;
  onSearch?: () => void;
  onAvatar?: () => void;
  /** Astra picker: keys into ASTRA_TOKENS; selecting one navigates to that astra. */
  onSelectAstra?: (key: string) => void;
  /**
   * Drawer panel content per toolbar slot / handle. Returning null lets the shell
   * render an honest "nothing here yet" note instead of a fabricated panel
   * (real-data-only). Slots: the four ToolbarSlot values plus 'bling' and 'handle'.
   */
  renderPanel?: (slot: PanelKey) => ReactNode;
  /**
   * Extra panels this astra registers on the right sidebar, keyed by panel id
   * (owner ruling 2026-09-03 — the sidebar is one surface, not the toolbar's).
   * Merged over the built-in toolbar panels; a page may also override a
   * built-in's title or width here.
   */
  panels?: Record<PanelKey, PanelSpec>;
  /** Controlled panel id. Omit to let the shell own the state internally. */
  openPanel?: PanelKey | null;
  /** Controlled setter — required for a left-sidebar entry to open a panel. */
  onOpenPanel?: (key: PanelKey | null) => void;
  /**
   * Door out of the BLiNG! drawer to the full wallet page. The drawer itself is
   * SHELL-LEVEL (owner 2026-09-03: balance, escrows, latest transactions —
   * "just shortcuts to main info") and renders on every astra unless the page's
   * renderPanel returns something for 'bling'.
   */
  onOpenLedger?: () => void;
  /** BLiNG drawer "Transfer" door (owner 2026-09-03) — the move-value composer. */
  onTransfer?: () => void;
  /**
   * PATCHBOARD VISIBILITY (owner ruling 2026-09-03): every toolbar icon, every
   * sidebar entry and every astra-switcher row is a Patchboard switch resolving
   * Master -> Astra -> Bee. The page resolves once (loadShellVisibility) and
   * passes the predicate down, so this component stays a pure synchronous
   * render and NOTHING inside it is special-cased per astra — SHELL v1.6 §2
   * holds: hiding is data, never a conditional in here.
   *
   * Omitted = everything visible, which is also the floor when the patchboard
   * has no rows or is unreachable.
   */
  visibility?: ShellVisibility;
  children: ReactNode;
}

export function UniversalShell({
  tokens,
  breadcrumb,
  nav,
  sidebarTop,
  bling = null,
  blingDisplay,
  blingUnit,
  handle = null,
  avatarUrl = null,
  onBack,
  onForward,
  onSearch,
  onAvatar,
  onSelectAstra,
  renderPanel,
  panels,
  openPanel,
  onOpenPanel,
  onOpenLedger,
  onTransfer,
  visibility = ALL_VISIBLE,
  children,
}: UniversalShellProps) {
  // Sidebar resting state — the collapser sets it. Default open on desktop,
  // rail on mobile (SHELL v1.5: "Mobile: rail resting").
  const [railResting, setRailResting] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth < 768 : false,
  );
  const [peek, setPeek] = useState(false); // hover peek over content
  const [pickerOpen, setPickerOpen] = useState(false);
  const [ownDrawer, setOwnDrawer] = useState<PanelKey | null>(null);
  // Controlled when the page passes both halves; otherwise the shell owns it.
  const controlled = openPanel !== undefined && Boolean(onOpenPanel);
  const drawer = controlled ? (openPanel ?? null) : ownDrawer;
  const setDrawer = useCallback(
    (key: PanelKey | null) => {
      if (controlled) onOpenPanel?.(key);
      else setOwnDrawer(key);
    },
    [controlled, onOpenPanel],
  );
  /** Built-in panels + whatever this astra registered. Registered wins. */
  const panelSpecs: Record<PanelKey, PanelSpec> = { ...BUILTIN_PANELS, ...(panels ?? {}) };

  const signedIn = Boolean(handle);
  const rootStyle = astraCssVars(tokens);

  const closeAll = useCallback(() => {
    setDrawer(null);
    setPickerOpen(false);
  }, [setDrawer]);

  // Esc closes the drawer / picker.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeAll();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [closeAll]);

  return (
    <div className="astra-shell flex h-full min-h-0 flex-col overflow-hidden" style={rootStyle}>
      {/* ── FULL-WIDTH HEADER (44px) ─────────────────────────────────────── */}
      <header
        className="flex flex-shrink-0 items-center gap-0.5 px-1.5 md:gap-1 md:px-2"
        style={{
          height: 44,
          borderBottom: '1px solid var(--hairline)',
          background: 'var(--raised)',
        }}
      >
        {/* LEFT STRIP — never moves. [logo][TLD][picker][back][fwd][search][collapser].
            SHELL_MOBILE1: back/forward are OS-level gestures on mobile (owner
            ruling) — hidden below md, desktop unchanged. Gaps tighten below md
            so the row fits without crowding the astra name/balance; tap targets
            (h-8 w-8, already above the StripButton floor) are never shrunk. */}
        <div className="flex items-center gap-0.5 md:gap-1">
          <span className="flex items-center pl-1" style={{ color: 'var(--accent)' }}>
            <AstraMark logo={tokens.logo} size={20} title={tokens.tld} />
          </span>
          <span
            className="font-semibold"
            style={{ color: 'var(--accent)', fontSize: 15, letterSpacing: '0.01em' }}
          >
            {tokens.tld}
          </span>

          {/* astra picker — chevron takes the astra's own --accent (SHELL v1.6):
              a live cue to which astra you're in, wired to the token so
              ASTRA_COLORS v1 resolves it later without touching this file.
              Owner 2026-09-03: sits tight against the TLD (negative margin eats
              the strip gap + the button's own centring slack). */}
          <div className="relative -ml-2">
            <StripButton
              label="Switch astra"
              onClick={() => setPickerOpen((v) => !v)}
              aria-expanded={pickerOpen}
              iconColor="var(--accent)"
            >
              <ChevronDown size={16} />
            </StripButton>
            {pickerOpen && (
              <AstraPicker
                currentSlug={tokens.slug}
                onSelect={(k) => {
                  setPickerOpen(false);
                  onSelectAstra?.(k);
                }}
                onClose={() => setPickerOpen(false)}
                visibility={visibility}
              />
            )}
          </div>

          {/* SHELL v1.8: hidden below `lg` — mobile AND tablet portrait have
              OS-level back; only tablet landscape and desktop show these. */}
          <StripButton label="Back" onClick={onBack} className="hidden lg:flex">
            <ArrowLeft size={16} />
          </StripButton>
          <StripButton label="Forward" onClick={onForward} className="hidden lg:flex">
            <ArrowRight size={16} />
          </StripButton>
          <StripButton
            label={railResting ? 'Pin sidebar open' : 'Collapse sidebar to rail'}
            onClick={() => setRailResting((v) => !v)}
          >
            {railResting ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          </StripButton>
        </div>

        <div className="flex-1" />

        {/* RIGHT TOOLBAR — search, tasks, security, alerts, notifications, BLiNG, handle, avatar */}
        <div className="flex items-center gap-0.5">
          {/* SHELL v1.8: Search is the FIRST right-toolbar icon (was in the left strip). */}
          {visibility(SHELL_SWITCH.icon('search')) && (
            <StripButton label="Search" onClick={onSearch}>
              <Search size={16} />
            </StripButton>
          )}
          {/* SHELL v1.10 (owner 2026-09-03): no current-astra icon here — the
              left strip [logo][TLD][chevron] already says where you are. */}
          {visibility(SHELL_SWITCH.icon('tasks')) && (
            <ToolbarIcon slot="tasks" label="Tasks" onClick={() => setDrawer('tasks')}>
              <Calendar size={17} />
            </ToolbarIcon>
          )}
          {visibility(SHELL_SWITCH.icon('security')) && (
            <ToolbarIcon slot="security" label="Security" onClick={() => setDrawer('security')}>
              <Shield size={17} />
            </ToolbarIcon>
          )}
          {visibility(SHELL_SWITCH.icon('alerts')) && (
            <ToolbarIcon slot="alerts" label="Alerts" onClick={() => setDrawer('alerts')}>
              <TriangleAlert size={17} />
            </ToolbarIcon>
          )}
          {visibility(SHELL_SWITCH.icon('notifications')) && (
            <ToolbarIcon
              slot="notifications"
              label="Notifications"
              onClick={() => setDrawer('notifications')}
            >
              <Bell size={17} />
            </ToolbarIcon>
          )}

          {/* BLiNG total + gold drop — number FIRST, drop after, always gold. */}
          {visibility(SHELL_SWITCH.icon('bling')) && (
            <button
              type="button"
              onClick={() => setDrawer('bling')}
              title="BLiNG! balance"
              aria-label="BLiNG balance"
              className="ml-1 flex items-center gap-1 rounded-md px-2 py-1"
              style={{ color: 'var(--bling-gold)', fontSize: 12.5 }}
            >
              <span className="font-mono font-semibold tabular-nums">
                {blingDisplay ?? (bling === null ? '—' : compactAmount(bling))}
              </span>
              {blingUnit && <span style={{ fontSize: 10, color: 'var(--mute)' }}>{blingUnit}</span>}
              <Droplet size={14} fill="var(--bling-gold)" stroke="var(--bling-gold)" />
            </button>
          )}

          {/* handle — own name has NO @; opens the your-stuff drawer. */}
          {signedIn && visibility(SHELL_SWITCH.icon('handle')) && (
            <button
              type="button"
              onClick={() => setDrawer('handle')}
              title="Your stuff"
              className="rounded-md px-2 py-1 font-mono transition-colors"
              style={{ color: 'var(--body)', fontSize: 12.5 }}
            >
              {handle}
            </button>
          )}

          {/* avatar — goes to the profile PAGE, not the drawer. */}
          {visibility(SHELL_SWITCH.icon('avatar')) && (
            <button
              type="button"
              onClick={onAvatar}
              title="Profile"
              aria-label="Profile"
              className="ml-0.5 flex h-7 w-7 items-center justify-center overflow-hidden rounded-full"
              style={{ background: 'var(--accent-bg)', border: '1px solid var(--line)' }}
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <span
                  className="font-mono uppercase"
                  style={{ color: 'var(--accent)', fontSize: 11 }}
                >
                  {(handle ?? '·').slice(0, 1)}
                </span>
              )}
            </button>
          )}
        </div>
      </header>

      {/* ── BODY: sidebar (below header) + content + icon drawer ──────────── */}
      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        <Sidebar
          nav={nav}
          top={sidebarTop}
          railResting={railResting}
          peek={peek}
          onPeek={setPeek}
          visibility={visibility}
        />

        {/* CONTENT — breadcrumbs top-left, then the page. */}
        <main
          className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
          style={{ background: 'var(--bg)' }}
        >
          {breadcrumb && (
            <div className="flex flex-shrink-0 items-center px-5 pt-3 md:px-8">
              <div className="font-mono" style={{ color: 'var(--mute)', fontSize: 12 }}>
                {breadcrumb}
              </div>
            </div>
          )}
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
        </main>

        {/* ICON DRAWER — right chrome; tinted color-mix(accent 10%, near-black). */}
        {drawer && (
          <IconDrawer
            slot={drawer}
            spec={panelSpecs[drawer] ?? { title: drawer }}
            onClose={() => setDrawer(null)}
            render={renderPanel}
            signedIn={signedIn}
            onOpenLedger={onOpenLedger}
            onTransfer={onTransfer}
            bling={bling}
            blingDisplay={blingDisplay}
            blingUnit={blingUnit}
          />
        )}
      </div>
    </div>
  );
}

/* ── left-strip control button — grey (--icon) by default, no accent ────────
   SHELL_MOBILE1: `iconColor` lets ONE control override the rest-state color
   (the switcher chevron takes the astra's own --accent, a live cue to which
   astra you're in — SHELL v1.6 keeps every OTHER strip control grey). `className`
   merges via cn() so a caller can add responsive visibility (`hidden md:flex`)
   without losing the base sizing/shape classes. */
function StripButton({
  label,
  onClick,
  children,
  className,
  iconColor = ICON_REST,
  ...rest
}: {
  label: string;
  onClick?: () => void;
  children: ReactNode;
  className?: string;
  iconColor?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        'group relative flex h-8 w-8 items-center justify-center rounded-md transition-colors',
        className,
      )}
      style={{ color: iconColor }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = ICON_HOVER;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = iconColor;
      }}
      {...rest}
    >
      {children}
      <InstantTip label={label} />
    </button>
  );
}

/* ── instant label — owner 2026-09-03: "if you hover an icon in the toolbar the
   title needs to appear right away, not wait." Native `title` waits ~1s, so every
   strip/toolbar icon carries this CSS tip instead: visible the instant the
   button is hovered or focused, gone on leave. Pointer-inert, never a target. */
function InstantTip({ label }: { label: string }) {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute left-1/2 top-full z-40 mt-1 -translate-x-1/2 whitespace-nowrap rounded px-1.5 py-0.5 font-mono opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
      style={{
        fontSize: 10.5,
        color: 'var(--ink)',
        background: 'var(--raised)',
        border: '1px solid var(--line)',
      }}
    >
      {label}
    </span>
  );
}

/* ── right-toolbar icon — rests WHITE, turns the astra accent on hover ───────
   DESKTOP HOVER-OPEN (SHELL mock, H24_DRAWER1): hovering the icon opens its
   drawer after a 140ms intent delay, so a quick sweep across the row does not
   fire every panel. Touch devices report (hover: none) and never arm the timer;
   the click path always works. The label shows INSTANTLY on hover (InstantTip),
   owner 2026-09-03; aria-label stays for a11y. */
function ToolbarIcon({
  slot,
  label,
  onClick,
  children,
}: {
  /** Kept for callers; colour no longer varies per slot (owner 2026-09-03). */
  slot: ToolbarSlot;
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  void slot;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clear = () => {
    if (timer.current !== null) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  };
  // biome-ignore lint/correctness/useExhaustiveDependencies: clear is stable; cleanup only
  useEffect(() => clear, []);

  const canHover = () =>
    typeof window !== 'undefined' && window.matchMedia?.('(hover: hover)').matches === true;

  return (
    <button
      type="button"
      onClick={() => {
        clear();
        onClick();
      }}
      aria-label={label}
      className="group relative flex h-8 w-8 items-center justify-center rounded-md transition-colors"
      style={{ color: ICON_REST }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = ICON_HOVER;
        if (canHover()) {
          clear();
          timer.current = setTimeout(onClick, HOVER_OPEN_MS);
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = ICON_REST;
        clear();
      }}
    >
      {children}
      <InstantTip label={label} />
    </button>
  );
}

/* ── astra picker menu — tinted 16% (SHELL v1.5) ────────────────────────────*/
function AstraPicker({
  currentSlug,
  onSelect,
  onClose,
  visibility,
}: {
  currentSlug: string;
  onSelect: (key: string) => void;
  onClose: () => void;
  visibility: ShellVisibility;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute left-0 top-full z-50 mt-1 w-52 rounded-lg p-1 shadow-xl"
      style={{
        background: 'color-mix(in srgb, var(--accent) 16%, #06070a)',
        border: '1px solid var(--line)',
      }}
    >
      {/* PATCHBOARD (owner 2026-09-03): "Every astra in the astra menu."
          A row hidden here is hidden from the switcher only — it does not
          un-publish the astra, and the astra's own door still works. */}
      {/* Owner 2026-09-03: TLDs alphabetical; the ones with a door first, the
          "soon" rows below them, alphabetical again. */}
      {Object.entries(ASTRA_TOKENS)
        .filter(([, t]) => visibility(SHELL_SWITCH.astra(t.slug)))
        .sort(([, a], [, b]) => {
          if (Boolean(a.path) !== Boolean(b.path)) return a.path ? -1 : 1;
          return a.tld.localeCompare(b.tld, undefined, { sensitivity: 'base' });
        })
        .map(([key, t], _i, rows) => {
          // Owner 2026-09-03: "there are two .app in the astra menu, same with
          // .tech." Same-TLD rows are different astras — say which.
          const current = t.slug === currentSlug;
          const shared = rows.filter(([, o]) => o.tld === t.tld).length > 1;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelect(key)}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors"
              style={{ color: current ? 'var(--ink)' : 'var(--body)', fontSize: 12.5 }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background =
                  'color-mix(in srgb, var(--accent) 12%, transparent)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <span style={{ color: t.accent }}>
                <AstraMark logo={t.logo} size={15} title={t.tld} />
              </span>
              <span className="font-mono" style={{ color: t.accent }}>
                {t.tld}
              </span>
              {shared && (
                <span className="font-mono" style={{ color: 'var(--mute)', fontSize: 10.5 }}>
                  {t.slug}
                </span>
              )}
              {current && (
                <span className="ml-auto" style={{ color: 'var(--mute)', fontSize: 10 }}>
                  here
                </span>
              )}
              {!t.path && !current && (
                <span className="ml-auto" style={{ color: 'var(--mute)', fontSize: 10 }}>
                  soon
                </span>
              )}
            </button>
          );
        })}
    </div>
  );
}

/* ── sidebar — 52px rail (rest) / 240px open, hover peek OVER content ────────
   When pinned open (!railResting) it is a static 240px column. When resting as
   a rail it occupies a 52px column and, on hover, floats the 240px panel OVER
   the content (absolute, no reflow). The floating panel is a DESCENDANT of the
   hover container so moving rail→panel does not trip mouseleave — no flicker. */
function Sidebar({
  nav,
  top,
  railResting,
  peek,
  onPeek,
  visibility,
}: {
  nav: ShellNavGroup[];
  top?: ReactNode;
  railResting: boolean;
  peek: boolean;
  onPeek: (v: boolean) => void;
  visibility: ShellVisibility;
}) {
  // PATCHBOARD (owner 2026-09-03): "Every menu item." Each entry resolves its
  // own shell.nav.<id> switch; a group whose entries all resolve off drops out
  // rather than leaving a labelled empty section behind.
  const groups = nav
    .map((g) => ({ ...g, items: g.items.filter((it) => visibility(SHELL_SWITCH.nav(it.id))) }))
    .filter((g) => g.items.length > 0);

  const fullPanel = (floating: boolean) => (
    <nav
      aria-label="sidebar"
      className={cn(
        'flex flex-col gap-5 overflow-y-auto py-4',
        floating ? 'absolute left-[52px] top-0 z-40 h-full shadow-2xl' : 'h-full',
      )}
      style={{ width: 240, background: 'var(--raised)', borderRight: '1px solid var(--hairline)' }}
    >
      {/* SHELL v1.8: the astra's own balance sits above the first nav group. */}
      {top && <div className="px-2">{top}</div>}
      {groups.map((g) => (
        <section key={g.id} className="flex flex-col gap-0.5 px-2">
          {g.label && (
            <h3
              className="px-2 pb-1 font-mono uppercase tracking-wider"
              style={{ color: 'var(--mute)', fontSize: 10 }}
            >
              {g.label}
            </h3>
          )}
          {g.items.map((it) => (
            <button
              key={it.id}
              type="button"
              onClick={it.onClick}
              disabled={!it.onClick}
              className="flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left transition-colors disabled:cursor-default"
              style={{
                color: it.active ? 'var(--ink)' : 'var(--body)',
                background: it.active
                  ? 'color-mix(in srgb, var(--accent) 12%, transparent)'
                  : 'transparent',
                fontSize: 13,
                opacity: it.onClick || it.active ? 1 : 0.55,
              }}
              onMouseEnter={(e) => {
                if (!it.active && it.onClick)
                  e.currentTarget.style.background =
                    'color-mix(in srgb, var(--accent) 7%, transparent)';
              }}
              onMouseLeave={(e) => {
                if (!it.active) e.currentTarget.style.background = 'transparent';
              }}
            >
              <span style={{ color: it.active ? 'var(--accent)' : 'var(--icon)' }}>{it.icon}</span>
              <span className="flex-1 truncate">{it.label}</span>
              {it.hint !== undefined && (
                <span className="font-mono" style={{ color: 'var(--mute)', fontSize: 11 }}>
                  {it.hint}
                </span>
              )}
            </button>
          ))}
        </section>
      ))}
    </nav>
  );

  // PINNED OPEN — static 240px column, no rail, no peek.
  if (!railResting) {
    return <div className="flex-shrink-0">{fullPanel(false)}</div>;
  }

  // RESTING AS RAIL — 52px column; hover floats the panel over content.
  return (
    <div
      className="relative flex-shrink-0"
      style={{ width: 52 }}
      onMouseEnter={() => onPeek(true)}
      onMouseLeave={() => onPeek(false)}
    >
      <nav
        aria-label="sidebar rail"
        className="flex h-full w-[52px] flex-col items-center gap-1 overflow-hidden py-3"
        style={{ background: 'var(--raised)', borderRight: '1px solid var(--hairline)' }}
      >
        {nav
          .flatMap((g) => g.items)
          .map((it) => (
            <button
              key={it.id}
              type="button"
              onClick={it.onClick}
              disabled={!it.onClick && !it.active}
              title={it.label}
              aria-label={it.label}
              className="flex h-9 w-9 items-center justify-center rounded-md transition-colors"
              style={{
                color: it.active ? 'var(--accent)' : 'var(--icon)',
                opacity: it.onClick || it.active ? 1 : 0.45,
              }}
              onMouseEnter={(e) => {
                if (it.onClick || it.active) e.currentTarget.style.color = 'var(--ink)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = it.active ? 'var(--accent)' : 'var(--icon)';
              }}
            >
              {it.icon}
            </button>
          ))}
      </nav>
      {peek && fullPanel(true)}
    </div>
  );
}

/* ── icon drawer — right chrome, tinted, no page load ───────────────────────*/
const BUILTIN_PANELS: Record<PanelKey, PanelSpec> = {
  tasks: { title: 'Tasks', width: 'wide' },
  security: { title: 'Security', width: 'wide' },
  alerts: { title: 'Alerts' },
  notifications: { title: 'Notifications' },
  bling: { title: 'BLiNG!' },
  handle: { title: 'Your stuff' },
};

function IconDrawer({
  slot,
  spec,
  onClose,
  render,
  signedIn,
  onOpenLedger,
  onTransfer,
  bling,
  blingDisplay,
  blingUnit,
}: {
  slot: PanelKey;
  spec: PanelSpec;
  onClose: () => void;
  render?: (slot: PanelKey) => ReactNode;
  signedIn: boolean;
  onOpenLedger?: () => void;
  /** BLiNG drawer "Transfer" door (owner 2026-09-03) — the move-value composer. */
  onTransfer?: () => void;
  bling: number | null;
  blingDisplay?: string;
  blingUnit?: string;
}) {
  // The BLiNG! drawer is the shell's own unless the page overrides it.
  const panel =
    render?.(slot) ??
    (slot === 'bling' ? (
      <BlingDrawerPanel
        balance={bling}
        signedIn={signedIn}
        onOpenLedger={onOpenLedger ?? (() => undefined)}
        onTransfer={onTransfer}
      />
    ) : null);
  // SHELL v1.5.1: any CHROME overlay closes on an outside click (the CONTENT
  // WINDOW does not — that is a different component). Mirrors AstraPicker. A
  // click on a toolbar icon lands outside the aside, so it closes this drawer
  // and the icon's own onClick then opens the next — a clean switch.
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [onClose]);

  return (
    <aside
      ref={ref}
      className="absolute right-0 top-0 z-40 flex h-full max-w-[92vw] flex-col shadow-2xl"
      style={{
        // Per-panel width (owner ruling): the surface sizes to what it holds.
        width: DRAWER_WIDTH[spec.width ?? 'compact'],
        background: 'color-mix(in srgb, var(--accent) 10%, #06070a)',
        borderLeft: '1px solid var(--line)',
      }}
    >
      <div
        className="flex flex-shrink-0 items-center gap-2 px-4"
        style={{ height: 44, borderBottom: '1px solid var(--hairline)' }}
      >
        <h2 className="font-mono" style={{ color: 'var(--ink)', fontSize: 13 }}>
          {spec.title}
          {slot === 'bling' && (blingDisplay !== undefined || bling !== null) && (
            <span className="ml-2" style={{ color: 'var(--bling-gold)' }}>
              {blingDisplay ?? bling?.toLocaleString()}
              {blingUnit && (
                <span className="ml-1" style={{ fontSize: 10, color: 'var(--mute)' }}>
                  {blingUnit}
                </span>
              )}
            </span>
          )}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="ml-auto flex h-7 w-7 items-center justify-center rounded-md transition-colors"
          style={{ color: 'var(--icon)' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--ink)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--icon)';
          }}
        >
          <X size={16} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4" style={{ color: 'var(--body)', fontSize: 13 }}>
        {panel ?? (
          <p style={{ color: 'var(--mute)', fontSize: 12.5 }}>
            Nothing here yet — this panel lights up when its backend lands.
          </p>
        )}
      </div>
    </aside>
  );
}
