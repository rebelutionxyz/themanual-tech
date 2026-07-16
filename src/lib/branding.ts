import { supabase } from './supabase';

// ═════════════════════════════════════════════════════════════════════
// BRANDING — HQ-editable platform brand config (ui_theme_config.branding).
//
// Single jsonb blob on the ui_theme_config singleton (public read; admin
// UPDATE via the is_platform_admin() RLS policy — migration ui_branding_v1).
// The baked defaults below are the fallback whenever the column is empty,
// missing, or unreachable — the shell never renders blank branding.
// Edited from HQ Control Room → Branding.
// ═════════════════════════════════════════════════════════════════════

export interface BrandingConfig {
  /** Wordmark segments: pre + accent + post (accent renders in accentHex). */
  wordmarkPre: string;
  wordmarkAccent: string;
  wordmarkPost: string;
  /** Trailing suffix (e.g. ".app") — rendered in the sans face, TRUE lowercase
      (Norwester is caps-only, so lowercase there shows as small caps). */
  wordmarkSuffix: string;
  /** Hex color for the accent segment (and brand red generally). */
  accentHex: string;
  /** Shell logo image (public/ path or full URL). */
  logoUrl: string;
  /** Favicon image (public/ path or full URL). */
  faviconUrl: string;
}

export const BRANDING_DEFAULTS: BrandingConfig = {
  wordmarkPre: 'Rebel',
  wordmarkAccent: 'U',
  wordmarkPost: 'tion',
  wordmarkSuffix: '.app',
  accentHex: '#DC2626',
  logoUrl: '/rebelution-logo.png',
  faviconUrl: '/rebelution-favicon.png',
};

const STRING_KEYS = [
  'wordmarkPre',
  'wordmarkAccent',
  'wordmarkPost',
  'wordmarkSuffix',
  'accentHex',
  'logoUrl',
  'faviconUrl',
] as const;

/** Keep only known string keys — the jsonb blob is admin-written but typed loosely. */
function sanitize(raw: unknown): Partial<BrandingConfig> {
  if (!raw || typeof raw !== 'object') return {};
  const src = raw as Record<string, unknown>;
  const out: Partial<BrandingConfig> = {};
  for (const k of STRING_KEYS) {
    const v = src[k];
    if (typeof v === 'string' && v.length <= 300) out[k] = v;
  }
  return out;
}

/** Load branding (defaults merged under whatever the DB carries). */
export async function fetchBranding(): Promise<BrandingConfig> {
  if (!supabase) return { ...BRANDING_DEFAULTS };
  try {
    const { data, error } = await supabase
      .from('ui_theme_config')
      .select('branding')
      .eq('id', 1)
      .maybeSingle();
    if (error || !data) return { ...BRANDING_DEFAULTS };
    return { ...BRANDING_DEFAULTS, ...sanitize((data as { branding?: unknown }).branding) };
  } catch {
    return { ...BRANDING_DEFAULTS };
  }
}

/** Persist branding (admin-only via RLS; throws on denial or missing column). */
export async function saveBranding(cfg: BrandingConfig): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured');
  const { error } = await supabase
    .from('ui_theme_config')
    .update({ branding: cfg, updated_at: new Date().toISOString() })
    .eq('id', 1);
  if (error) throw new Error(error.message);
}

/** Swap the document favicon at runtime (PNG or SVG, path or URL). */
export function applyFavicon(url: string): void {
  if (!url || typeof document === 'undefined') return;
  let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  link.type = url.endsWith('.svg') ? 'image/svg+xml' : 'image/png';
  link.href = url;
}
