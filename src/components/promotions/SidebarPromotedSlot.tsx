// Phase C Component D — sidebar-promoted slot (Code 24, 2026-05-08).
// Static block in the right sidebar / rail area. Hides entirely when empty.

import { usePromotionSlot } from '@/lib/promotions/usePromotionSlot';
import type { SlotContext } from '@/lib/promotions/types';

interface SidebarPromotedSlotProps extends Omit<SlotContext, 'slotKey'> {
  className?: string;
}

export function SidebarPromotedSlot(props: SidebarPromotedSlotProps) {
  const result = usePromotionSlot({ slotKey: 'sidebar-promoted', ...props });

  if (!result.enabled) return null;
  if (result.loading) return null;

  const html = result.promotion?.content_html ?? result.fallbackContent;
  if (!html) return null; // D-4

  return (
    <aside
      className={`overflow-hidden rounded-md border border-border bg-bg-elevated/60 ${props.className ?? ''}`}
      aria-label="Promoted"
      data-slot-key="sidebar-promoted"
      data-slot-behavior={result.behavior}
    >
      <div
        className="border-b border-border px-3 py-1 font-mono uppercase tracking-widest text-text-muted"
        style={{ fontSize: '10px' }}
        data-size="meta"
      >
        Promoted
      </div>
      <div
        className="px-3 py-3 text-text-silver"
        style={{ fontSize: '12.5px', lineHeight: '1.5' }}
        // biome-ignore lint/security/noDangerouslySetInnerHtml: admin-authored HTML, RLS-gated to is_admin Bees
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </aside>
  );
}
