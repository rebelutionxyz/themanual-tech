import { cn } from '@/lib/utils';
import { X } from 'lucide-react';
import { type ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Overlay frame for a modal-route. App.tsx only mounts this when a `background`
 * location is present in history state, so closing always means "go back to the
 * background" — a single history step. The wrapped route component (GroupPage,
 * EventPage, …) renders unchanged inside the panel; on a direct URL hit it
 * renders full-page instead (App's main <Routes>), never inside this frame.
 */
export function RouteModal({
  children,
  panelClass,
}: {
  children: ReactNode;
  /** Extra panel classes — the base panel is a uniform 80vw × 80dvh. */
  panelClass?: string;
}) {
  const navigate = useNavigate();
  const close = () => navigate(-1);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') navigate(-1);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [navigate]);

  return (
    <div
      className="fixed inset-0 z-[100] flex overflow-y-auto bg-black/40 p-3 backdrop-blur-sm sm:p-6"
      onMouseDown={close}
      // biome-ignore lint/a11y/useSemanticElements: native <dialog> needs imperative showModal(); this overlay is mounted declaratively by the router
      role="dialog"
      aria-modal="true"
    >
      <div
        className={cn(
          // Uniform popup size: every popup fills ~80% of the page (Butch,
          // 2026-07-18). Children own their internal scroll (PopupShell's
          // body region) — the panel itself never scrolls.
          'relative m-auto flex h-[80dvh] w-[80vw] flex-col overflow-hidden rounded-2xl bg-white text-zinc-900 shadow-2xl',
          panelClass,
        )}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={close}
          aria-label="Close"
          className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/85 text-zinc-500 shadow-sm backdrop-blur transition-colors hover:bg-zinc-100 hover:text-zinc-800"
        >
          <X size={16} />
        </button>
        <div className="min-h-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
