import { useEffect } from 'react';

const WAVES_COLOR = '#0EA5E9'; // ocean/sky blue — matches Mini Waves V76 --ocean

/**
 * Mini Waves V76 embedded as an iframe. The real standalone build lives in
 * /public/mini-waves-v76.html and is served as-is. We just wrap it in our
 * platform shell (SiteHeader + right rail via PlatformLayout) so it feels
 * native inside themanual.tech.
 *
 * Future: port V76 to React components for shared auth/data/theming.
 * For now: real Mini Waves, zero loss, native access via the right rail.
 */
export function WavesPage() {
  // Set a page title hint. Restore whatever title was active before mount
  // (AstraContext owns the per-host default) instead of hard-resetting to
  // 'The Manual' — that clobbered astra siteTitles (atlasintel.fyi bug class).
  useEffect(() => {
    const previous = document.title;
    document.title = 'MiniWaves. In the Flow.';
    return () => {
      document.title = previous;
    };
  }, []);

  return (
    <div
      className="h-full w-full overflow-hidden"
      style={{
        background: 'rgba(14, 165, 233, 0.06)',
      }}
    >
      <iframe
        src="/mini-waves-v78.html"
        title="MiniWaves"
        className="h-full w-full border-0"
        style={{
          display: 'block',
          background: '#030508',
        }}
        // Allow local storage, modals, drag-drop — all inside V76 HTML
        sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups"
      />
    </div>
  );
}

export { WAVES_COLOR };
