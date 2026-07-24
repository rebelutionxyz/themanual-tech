import { BlingPopupContent } from '@/components/freedomblings/BlingPopupContent';
import type { ShellIcon } from '@/components/shell/sidebarNav';
import { cn } from '@/lib/utils';
import { Hammer, ShieldAlert, Sparkles, Waves, X } from 'lucide-react';
import { type ReactNode, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

// 'bling' retired from the launcher row 2026-07-18 — the BLiNG! trigger (and
// the identity chip) moved UP to the top toolbar (LensRow); BlingPopup below
// is exported for it.
type LauncherId = 'oracle' | 'workshop' | 'security' | 'tasks';

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
  // Hold contrast on the colored bar: light ink on dark accents, dark on light.
  const ink = readableInk(accent);
  const onDark = ink === '#ffffff';
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
    // REGION 2 of the OUTER CONTAINER (CommunityShell): `w-full` = the shell's
    // full width, so the band spans the whole container (under the sidebar AND
    // the content). The container is now full browser width.
    <div className="w-full flex-shrink-0" style={{ background: accent }}>
      {/* Horizontal touch-scroller: items stay one row and scroll when they
          overflow a narrow viewport rather than wrapping or squashing. */}
      <div
        className="flex h-11 items-center gap-1 overflow-x-auto px-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {/* Identity chip moved UP to the top toolbar (LensRow) 2026-07-18. */}
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

      {/* Tasks → MiniWaves (V76) popup — same overlay pattern as BLiNG!,
          sized near-fullscreen because V76 is a full task manager. */}
      {open === 'tasks' && <TasksPopup onClose={() => setOpen(null)} />}

      {/* Other launchers → the placeholder anchored popover (unchanged). */}
      {active && open !== 'tasks' && (
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
 *  Portaled to body; data-surface scopes the SEND module's freedomblings tokens.
 *  Exported: the trigger lives in the TOP toolbar (LensRow) since 2026-07-18. */
export function BlingPopup({ onClose }: { onClose: () => void }) {
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

/** MiniWaves popup (Tasks launcher) — "MiniWaves. In the Flow."
 *  The real V76 standalone build (/public/mini-waves-v76.html) in an iframe,
 *  portaled to body like BlingPopup but near-fullscreen: V76 is a full
 *  motion-first task manager, not a widget. Same iframe sandbox flags as
 *  WavesPage (/waves) — local storage, modals, drag-drop all live inside V76. */
function TasksPopup({ onClose }: { onClose: () => void }) {
  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex overflow-y-auto bg-black/60 p-3 backdrop-blur-sm sm:p-6"
      onMouseDown={onClose}
      // biome-ignore lint/a11y/useSemanticElements: native <dialog> needs imperative showModal(); this overlay is mounted declaratively
      role="dialog"
      aria-modal="true"
      aria-label="Tasks — MiniWaves"
    >
      <div
        className="relative m-auto h-[92dvh] w-full max-w-6xl overflow-hidden rounded-2xl shadow-2xl"
        style={{ background: '#030508' }}
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
        <iframe
          src="/mini-waves-v92.html"
          title="MiniWaves"
          className="h-full w-full border-0"
          style={{ display: 'block', background: '#030508' }}
          sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups"
        />
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
