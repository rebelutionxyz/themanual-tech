// Phase C Component D — feed-inline slot (Code 24, 2026-05-08).
// Renders ONE feed-card-shaped promotion at a single position in a feed list.
// Returns null when there's nothing to render — callers must NOT leave a gap;
// continue rendering the next regular feed item directly (D-4).
//
// Position (which 1-indexed feed slot to inject into) is exposed via
// usePromotionSlot's `feedInlinePosition`. Callers typically:
//
//   const slot = usePromotionSlot({ slotKey: 'feed-inline', ...ctx });
//   ...threads.map((t, i) => (
//     <Fragment key={t.id}>
//       <ThreadCard thread={t} />
//       {i + 1 === slot.feedInlinePosition && <FeedInlineSlot {...ctx} />}
//     </Fragment>
//   ))
//
// or simpler — drop a single <FeedInlineSlot {...ctx} /> after the Nth card.

import { usePromotionSlot } from '@/lib/promotions/usePromotionSlot';
import type { SlotContext } from '@/lib/promotions/types';

interface FeedInlineSlotProps extends Omit<SlotContext, 'slotKey'> {
  className?: string;
}

export function FeedInlineSlot(props: FeedInlineSlotProps) {
  const result = usePromotionSlot({ slotKey: 'feed-inline', ...props });

  if (!result.enabled) return null;
  if (result.loading) return null;

  const html = result.promotion?.content_html ?? result.fallbackContent;
  if (!html) return null;

  return (
    <div
      className={`overflow-hidden rounded-lg border border-border bg-bg-elevated/70 ${props.className ?? ''}`}
      role="complementary"
      aria-label="Promoted"
      data-slot-key="feed-inline"
      data-slot-behavior={result.behavior}
    >
      <div
        className="flex items-center justify-between border-b border-border px-3 py-1 font-mono uppercase tracking-widest text-text-muted"
        style={{ fontSize: '10px' }}
        data-size="meta"
      >
        <span>Promoted</span>
      </div>
      <div
        className="px-4 py-3 text-text-silver"
        style={{ fontSize: '13px', lineHeight: '1.5' }}
        // biome-ignore lint/security/noDangerouslySetInnerHtml: admin-authored HTML, RLS-gated to is_admin Bees
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
