import { useState } from 'react';
import { Share2, Check } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { createShareLink } from '@/lib/reactions';
import { cn } from '@/lib/utils';

interface ShareButtonProps {
  sourceSurface: string;
  sourceId: string;
  /** Relative or absolute URL to the thread (without tracking token) */
  url: string;
  compact?: boolean;
}

/**
 * Share button — generates a share link with affiliate tracking token
 * (per Universal Post Architecture) and copies to clipboard.
 *
 * If not signed in, generates untracked URL.
 */
export function ShareButton({
  sourceSurface,
  sourceId,
  url,
  compact = false,
}: ShareButtonProps) {
  const { bee } = useAuth();
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleShare() {
    if (loading) return;
    setLoading(true);
    try {
      // Normalize to absolute URL for sharing
      const absoluteUrl = url.startsWith('http')
        ? url
        : `${window.location.origin}${url.startsWith('/') ? url : `/${url}`}`;

      const shareUrl = bee
        ? await createShareLink(sourceSurface, sourceId, bee.id, absoluteUrl)
        : absoluteUrl;

      // Try navigator.share first (mobile), fallback to clipboard
      if (navigator.share) {
        try {
          await navigator.share({ url: shareUrl });
          setCopied(true);
        } catch {
          // User dismissed — fall through to clipboard
          await copyToClipboard(shareUrl);
          setCopied(true);
        }
      } else {
        await copyToClipboard(shareUrl);
        setCopied(true);
      }

      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Share failed:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      disabled={loading}
      title={bee ? 'Share with affiliate tracking' : 'Share link'}
      aria-label="Share"
      className={cn(
        'flex items-center gap-1 rounded-md border transition-all',
        compact ? 'px-1.5 py-0.5' : 'px-2 py-1',
        copied
          ? 'border-kettle-sourced/40 bg-kettle-sourced/10 text-kettle-sourced'
          : 'border-border bg-bg-elevated text-text-silver hover:border-text-silver/40 hover:bg-bg',
        loading && 'opacity-60',
      )}
      style={{ fontSize: compact ? '11px' : '12px' }}
    >
      {copied ? (
        <>
          <Check size={compact ? 11 : 13} />
          {!compact && <span>Copied</span>}
        </>
      ) : (
        <>
          <Share2 size={compact ? 11 : 13} />
          {!compact && <span>Share</span>}
        </>
      )}
    </button>
  );
}

async function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  // Fallback: temporary textarea
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand('copy');
  } finally {
    document.body.removeChild(ta);
  }
}
