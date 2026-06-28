import { BlingPopupContent } from '@/components/freedomblings/BlingPopupContent';
import type { ShellIcon } from '@/components/shell/sidebarNav';
import { HoneyDrop } from '@/components/ui/HoneyDrop';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { Hammer, ShieldAlert, Sparkles, Waves, X } from 'lucide-react';
import { type ReactNode, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';

type LauncherId = 'bling' | 'oracle' | 'workshop' | 'security' | 'tasks';

interface Launcher {
  id: LauncherId;
  label: string;
  icon: ShellIcon;
  /** Popup heading. */
  title: string;
  /** Stub body — these surfaces become real popups in later passes. */
  lines: string[];
}

// Bottom utility launchers. Each opens an OVERLAY popup (no navigation) —
// mirrors the top lens toolbar in height + right-of-sidebar span.
const LAUNCHERS: Launcher[] = [
  {
    id: 'bling',
    label: 'BLiNG!',
    icon: HoneyDrop,
    title: 'BLiNG!',
    lines: ['Your BLiNG! wallet, the bonding curve, and the order book.'],
  },
  {
    id: 'oracle',
    label: 'AtlasOracle',
    icon: Sparkles,
    title: 'AtlasOracle',
    lines: ['The platform AI runtime — ask, summarize, and route across Astras.'],
  },
  {
    id: 'security',
    label: 'Security',
    icon: ShieldAlert,
    title: 'DingleBERRY',
    lines: ['Security + monitoring — threat interception, source verification, infra health.'],
  },
  {
    id: 'tasks',
    label: 'Tasks',
    icon: Waves,
    title: 'Mini Waves',
    lines: ['Your task waves — lightweight coordination across the constellation.'],
  },
  {
    id: 'workshop',
    label: 'Workshop',
    icon: Hammer,
    title: 'Workshop',
    lines: ['The creation surface.', 'Build Skins, HoneyComb templates, and apps.'],
  },
];

/** Relative-luminance pick: white vs near-black ink that reads on a given bg.
    Exported so the top lens toolbar (LensRow) flips its control ink the same
    way against the shared solid Astra accent. */
export function readableInk(hex: string): string {
  const h = hex.replace('#', '');
  if (h.length < 6) return '#ffffff';
  const toLin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const r = toLin(Number.parseInt(h.slice(0, 2), 16) / 255);
  const g = toLin(Number.parseInt(h.slice(2, 4), 16) / 255);
  const b = toLin(Number.parseInt(h.slice(4, 6), 16) / 255);
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return lum > 0.45 ? '#18181b' : '#ffffff';
}

/**
 * Bottom utility toolbar — a full-width band flush to both screen edges (pass 19),
 * its background the current Astra accent. Items open overlay popups in place
 * rather than navigating.
 */
export function BottomToolbar({ accent }: { accent: string }) {
  const { bee } = useAuth();
  // Hold contrast on the colored bar: light ink on dark accents, dark on light.
  const ink = readableInk(accent);
  const onDark = ink === '#ffffff';
  const hoverBg = onDark ? 'hover:bg-white/10' : 'hover:bg-black/10';
  const [open, setOpen] = useState<LauncherId | null>(null);
  const [anchor, setAnchor] = useState<{ left: number; bottom: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(null);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  function openAt(id: LauncherId, btn: HTMLButtonElement) {
    if (open === id) {
      setOpen(null);
      return;
    }
    const r = btn.getBoundingClientRect();
    setAnchor({ left: r.left, bottom: window.innerHeight - r.top + 4 });
    setOpen(id);
  }

  const active = LAUNCHERS.find((l) => l.id === open) ?? null;
  const popWidth = 300;
  const popStyle: React.CSSProperties = anchor
    ? {
        position: 'fixed',
        left: Math.max(8, Math.min(anchor.left, window.innerWidth - popWidth - 8)),
        bottom: anchor.bottom,
        width: popWidth,
        zIndex: 60,
      }
    : {};

  return (
    // REGION 2 of the OUTER CONTAINER (CommunityShell): `w-full` = the ~1290
    // shell-box width, so the band spans the whole container (under the sidebar
    // AND the content), edges meeting the container edges — NOT the viewport.
    <div className="w-full flex-shrink-0" style={{ background: accent }}>
      {/* Horizontal touch-scroller: items stay one row and scroll when they
          overflow a narrow viewport rather than wrapping or squashing. */}
      <div
        className="flex h-11 items-center gap-1 overflow-x-auto px-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {/* Profile — FIRST item, sticky so it stays visible while the rest
            scrolls under it. */}
        {bee ? (
          <Link
            to="/profile"
            title={`@${bee.handle}`}
            aria-label={`Profile — @${bee.handle}`}
            className={cn(
              'sticky left-0 z-10 mr-1 flex max-w-[160px] flex-shrink-0 items-center gap-2 rounded-md px-1.5 py-1 transition-colors',
              hoverBg,
            )}
            style={{ background: accent }}
          >
            <span
              className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md font-display text-[13px] font-semibold"
              style={{
                background: onDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.14)',
                color: ink,
              }}
            >
              {bee.handle.slice(0, 1).toUpperCase()}
            </span>
            <span className="min-w-0 truncate text-[13px] font-medium" style={{ color: ink }}>
              @{bee.handle}
            </span>
          </Link>
        ) : (
          <Link
            to="/login"
            className={cn(
              'sticky left-0 z-10 mr-1 flex-shrink-0 rounded-md px-2.5 py-1.5 text-[13px] font-semibold transition-colors',
              hoverBg,
            )}
            style={{ background: accent, color: ink }}
          >
            Sign in
          </Link>
        )}

        {LAUNCHERS.map((l) => (
          <LauncherButton
            key={l.id}
            icon={l.icon}
            label={l.label}
            ink={ink}
            onDark={onDark}
            active={open === l.id}
            onClick={(b) => openAt(l.id, b)}
          />
        ))}
        {/* Settings removed (pass 17) — it lives permanently in the left sidebar tail. */}
      </div>

      {/* BLiNG! → the FreedomBLiNGS popup (the balance page + SEND module). */}
      {open === 'bling' && <BlingPopup onClose={() => setOpen(null)} />}

      {/* Other launchers → the placeholder anchored popover (unchanged). */}
      {active && open !== 'bling' && (
        <>
          <div
            className="fixed inset-0 z-50"
            onMouseDown={() => setOpen(null)}
            aria-hidden="true"
          />
          <Popover
            title={active.title}
            style={popStyle}
            accent={accent}
            onClose={() => setOpen(null)}
          >
            {active.lines.map((line, i) => (
              <p
                key={line}
                className={cn(
                  'text-[13px] leading-relaxed',
                  i === 0 ? 'text-zinc-700' : 'text-zinc-500',
                )}
              >
                {line}
              </p>
            ))}
            <p
              className="mt-2 font-mono text-[9px] uppercase tracking-wider text-zinc-400"
              data-size="meta"
            >
              Popup surface — wiring lands in a later pass
            </p>
          </Popover>
        </>
      )}
    </div>
  );
}

/** FreedomBLiNGS popup (pass 17/18) — dark-brown redesign: hero balance · FREEd/
 *  GOT/GAVE tiles · SEND · circulating supply · infinite-scroll transactions.
 *  Portaled to body; data-surface scopes the SEND module's freedomblings tokens. */
function BlingPopup({ onClose }: { onClose: () => void }) {
  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex overflow-y-auto bg-black/60 p-3 backdrop-blur-sm sm:p-6"
      onMouseDown={onClose}
      // biome-ignore lint/a11y/useSemanticElements: native <dialog> needs imperative showModal(); this overlay is mounted declaratively
      role="dialog"
      aria-modal="true"
      aria-label="BLiNG! — FreedomBLiNGS"
    >
      <div
        data-surface="freedomblings"
        className="relative m-auto w-full max-w-lg overflow-hidden rounded-2xl shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/30 text-[#F3E7D8] shadow-sm backdrop-blur transition-colors hover:bg-black/50"
        >
          <X size={16} />
        </button>
        <BlingPopupContent />
      </div>
    </div>,
    document.body,
  );
}

function LauncherButton({
  icon: Icon,
  label,
  ink,
  onDark,
  active,
  onClick,
}: {
  icon: ShellIcon;
  label: string;
  /** Contrast ink for the accent bar. */
  ink: string;
  /** True when the accent is dark (light ink) — picks the hover/active overlay. */
  onDark: boolean;
  active?: boolean;
  onClick: (btn: HTMLButtonElement) => void;
}) {
  return (
    <button
      type="button"
      onClick={(e) => onClick(e.currentTarget)}
      title={label}
      aria-label={label}
      className={cn(
        'flex flex-shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1.5 text-[13px] transition-colors',
        active ? 'font-semibold' : onDark ? 'hover:bg-white/10' : 'hover:bg-black/10',
      )}
      style={
        active
          ? { color: ink, background: onDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.12)' }
          : { color: ink, opacity: 0.85 }
      }
    >
      <Icon size={16} style={{ color: ink }} />
      <span>{label}</span>
    </button>
  );
}

function Popover({
  title,
  accent,
  style,
  children,
  onClose,
}: {
  title: string;
  accent: string;
  style: React.CSSProperties;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl"
      style={style}
    >
      <div className="flex items-center justify-between border-b border-zinc-100 px-3 py-2">
        <span
          className="font-display text-[14px] font-bold tracking-wide"
          style={{ color: accent }}
        >
          {title}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="flex h-6 w-6 items-center justify-center rounded text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
        >
          <X size={13} />
        </button>
      </div>
      <div className="space-y-1.5 p-3">{children}</div>
    </div>
  );
}
