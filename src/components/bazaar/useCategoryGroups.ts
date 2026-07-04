import { useEffect, useMemo, useState } from 'react';
import { type BazaarCategory, bazaarCategories } from '@/lib/bazaar';

export interface CategoryGroup {
  label: string;
  options: { id: string; name: string }[];
}

/**
 * Spine-backed category taxonomy as grouped, LEAF-only options — shared by the
 * Browse filter and the New-offer form so picker values stay aligned (value =
 * atom id). Group label = department at depth 6, else bucket; first-seen order
 * preserved (the RPC is pre-sorted by bucket → department → depth → name).
 */
export function useCategoryGroups(): CategoryGroup[] {
  const [categories, setCategories] = useState<BazaarCategory[]>([]);

  useEffect(() => {
    let cancelled = false;
    bazaarCategories()
      .then((c) => !cancelled && setCategories(c))
      .catch(() => {
        /* non-fatal — the picker just shows no options */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return useMemo(() => {
    const groups: CategoryGroup[] = [];
    const byLabel = new Map<string, CategoryGroup>();
    for (const c of categories) {
      if (!c.isLeaf) continue;
      const label = c.depth === 6 ? c.department : c.bucket;
      let group = byLabel.get(label);
      if (!group) {
        group = { label, options: [] };
        byLabel.set(label, group);
        groups.push(group);
      }
      group.options.push({ id: c.id, name: c.name });
    }
    return groups;
  }, [categories]);
}
