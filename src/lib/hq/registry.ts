// HQ — self-assembling section registry (HQ1, MMF §19.8 + PLATFORM_SLATE v1).
//
// The HQ Control Room shell knows nothing about which sections exist. Sections
// register themselves into this module; the shell reads getHQSections() and
// renders whatever is present, sorted by `order`. This is the seam that lets
// each Astra ship its own HQ admin section without touching HQControlRoom.tsx.
//
// TWO WAYS TO REGISTER (both supported):
//   1. Central manifest — add one registerHQSection({...}) call to
//      src/components/hq/sections/register.ts. Lowest ceremony; good for the
//      platform-core sections.
//   2. Self-registration — an Astra module calls registerHQSection({...}) at
//      module scope, and register.ts adds a side-effect `import` of that module
//      so it loads. Good when a section wants to own its registration.
//
// Registration is idempotent by slug (a Map), so HMR re-evaluation and a
// double-import never duplicate a section — the latest definition wins.

import type { LucideIcon } from 'lucide-react';
import type { ComponentType } from 'react';

export interface HQSection {
  /** URL hash key: /hq#<slug>. Unique; re-registration replaces. */
  slug: string;
  /** Sidebar label. */
  label: string;
  /** Sidebar icon. */
  icon: LucideIcon;
  /** 'live' renders real data; 'stub' shows a "soon" chip and placeholder. */
  status: 'live' | 'stub';
  /** Sort key for sidebar order. Lower is higher. Defaults to 100. */
  order: number;
  /** The section body. Rendered in the HQ main pane. */
  Component: ComponentType;
}

/** Input to registerHQSection — `order` is optional (defaults to 100). */
export type HQSectionInput = Omit<HQSection, 'order'> & { order?: number };

const registry = new Map<string, HQSection>();

/**
 * Register (or replace) an HQ section. Idempotent by slug. Call at module
 * scope; the manifest in sections/register.ts guarantees these run before the
 * shell first reads the registry.
 */
export function registerHQSection(section: HQSectionInput): void {
  registry.set(section.slug, { order: 100, ...section });
}

/** All registered sections, sorted by order then label. */
export function getHQSections(): HQSection[] {
  return [...registry.values()].sort((a, b) => a.order - b.order || a.label.localeCompare(b.label));
}

/** Look up a single section by slug (or undefined). */
export function getHQSection(slug: string): HQSection | undefined {
  return registry.get(slug);
}
