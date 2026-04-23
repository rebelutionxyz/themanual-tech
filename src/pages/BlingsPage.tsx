import { useEffect, useState } from 'react';
import { ExternalLink, AlertCircle } from 'lucide-react';

const BLING_COLOR = '#FAD15E'; // honey gold
const FREEDOMBLINGS_URL = 'https://freedomblings.com';

/**
 * FreedomBLiNGs embedded as an iframe, same pattern as Mini Waves.
 * The REAL live app at freedomblings.com loads inside themanual.tech's
 * platform shell (SiteHeader + right rail via PlatformLayout).
 *
 * If the iframe fails to load (X-Frame-Options / CSP frame-ancestors),
 * we show a fallback with a big "Open FreedomBLiNGs" button.
 *
 * Future: native port with shared auth/data/theming. For now: real app,
 * native access via the right rail.
 */
export function BlingsPage() {
  const [iframeBlocked, setIframeBlocked] = useState(false);

  useEffect(() => {
    document.title = 'BLiNG! · The Manual';
    return () => {
      document.title = 'The Manual';
    };
  }, []);

  // If iframe hasn't loaded content within 4s, assume it was blocked
  useEffect(() => {
    const timer = setTimeout(() => {
      // Check if iframe has a document we can access — throws if blocked
      try {
        const frame = document.getElementById('blings-iframe') as HTMLIFrameElement | null;
        if (!frame?.contentWindow) {
          setIframeBlocked(true);
        }
      } catch {
        setIframeBlocked(true);
      }
    }, 4000);
    return () => clearTimeout(timer);
  }, []);

  if (iframeBlocked) {
    return (
      <div
        className="flex h-full w-full items-center justify-center p-6"
        style={{ background: 'rgba(250, 209, 94, 0.06)' }}
      >
        <div
          className="max-w-md rounded-lg border-2 bg-bg-elevated p-6 md:p-8 text-center shadow-lg"
          style={{
            borderColor: `${BLING_COLOR}80`,
            boxShadow: `0 0 0 1px ${BLING_COLOR}25, 0 4px 14px rgba(0,0,0,0.35), 0 0 16px ${BLING_COLOR}20`,
          }}
        >
          <AlertCircle
            size={36}
            className="mx-auto mb-3"
            style={{ color: BLING_COLOR }}
          />
          <h1
            className="mb-2 font-display tracking-wide"
            style={{ fontSize: '22px', color: BLING_COLOR, fontWeight: 600 }}
          >
            FreedomBLiNGs.com
          </h1>
          <p
            className="mb-4 text-text-silver"
            style={{ fontSize: '13px', lineHeight: '1.6' }}
          >
            FreedomBLiNGs lives at its own sovereign domain. Click below to
            enter the live economy — earn, mint, send, escrow. Your Bee account
            works there too.
          </p>
          <a
            href={FREEDOMBLINGS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-md border-2 px-4 py-2 transition-colors hover:bg-honey/10"
            style={{
              borderColor: BLING_COLOR,
              color: BLING_COLOR,
              fontSize: '13px',
              fontWeight: 600,
            }}
          >
            <ExternalLink size={14} />
            Open FreedomBLiNGs
          </a>
          <div
            className="mt-5 rounded-md border border-border bg-bg/60 p-3 font-mono text-text-dim"
            style={{ fontSize: '10.5px' }}
            data-size="meta"
          >
            Native integration coming — shared Bee auth, BLiNG! balance visible platform-wide, and order book imports.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="h-full w-full overflow-hidden"
      style={{ background: 'rgba(250, 209, 94, 0.06)' }}
    >
      <iframe
        id="blings-iframe"
        src={FREEDOMBLINGS_URL}
        title="FreedomBLiNGs"
        className="h-full w-full border-0"
        style={{ display: 'block', background: '#1A120A' }}
        sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups allow-top-navigation"
        onError={() => setIframeBlocked(true)}
      />
    </div>
  );
}

export { BLING_COLOR };
