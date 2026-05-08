// Phase C Component D — top-ticker slot (Code 24, 2026-05-08).
// Renders directly below SiteHeader. Behavior is 'scrolling' by default;
// individual promotions can override via the row's `behavior` field.
// Hides entirely when no DB match and no fallbackContent (D-4).

import { usePromotionSlot } from '@/lib/promotions/usePromotionSlot';
import type { SlotContext } from '@/lib/promotions/types';

interface TopTickerSlotProps
  extends Omit<SlotContext, 'slotKey'> {
  className?: string;
}

export function TopTickerSlot(props: TopTickerSlotProps) {
  const result = usePromotionSlot({ slotKey: 'top-ticker', ...props });

  if (!result.enabled) return null;
  if (result.loading) return null; // hide on first paint to avoid flash; layout shift is small

  const html = result.promotion?.content_html ?? result.fallbackContent;
  if (!html) return null; // D-4: hide slot entirely when empty

  const isScrolling = result.behavior === 'scrolling';

  return (
    <div
      className={`relative w-full overflow-hidden border-b border-border bg-bg-elevated/80 ${props.className ?? ''}`}
      role="complementary"
      aria-label="Promoted ticker"
      data-slot-key="top-ticker"
      data-slot-behavior={result.behavior}
    >
      {isScrolling ? (
        <div className="flex w-max animate-promo-ticker whitespace-nowrap py-1.5">
          {/* Two copies side-by-side keeps the marquee visually continuous
              when the transform wraps from -50% back to 0%. */}
          <TickerTrack html={html} />
          <TickerTrack html={html} hidden />
        </div>
      ) : (
        <div
          className="px-4 py-1.5 text-text-silver"
          style={{ fontSize: '12px' }}
          // biome-ignore lint/security/noDangerouslySetInnerHtml: admin-authored HTML, RLS-gated to is_admin Bees
          dangerouslySetInnerHTML={{ __html: html }}
        />
      )}
    </div>
  );
}

function TickerTrack({
  html,
  hidden = false,
}: {
  html: string;
  hidden?: boolean;
}) {
  return (
    <div
      className="flex shrink-0 items-center gap-12 px-12 text-text-silver"
      style={{ fontSize: '12px' }}
      aria-hidden={hidden || undefined}
      // biome-ignore lint/security/noDangerouslySetInnerHtml: admin-authored HTML, RLS-gated to is_admin Bees
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
