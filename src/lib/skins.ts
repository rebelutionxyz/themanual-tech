import type { BrandingConfig } from './branding';
import { BRANDING_DEFAULTS } from './branding';
import { supabase } from './supabase';

// ═════════════════════════════════════════════════════════════════════
// SKINS — BRANDoSOPHIC skin layer client (MMF §25).
//
// Backed by public.skins (brandosophic_skins_v1, 2026-07-24) + SECDEF RPCs:
//   skin_resolve(owner_kind, owner_id) → { skin_id, name, branding, background_softness }
//   skin_create / skin_clone / skin_update (authenticated; writes RLS-denied direct)
//
// branding jsonb = the SAME shape as ui_theme_config.branding (BrandingConfig).
// ui_theme_config remains the platform fallback until the renderer cutover;
// skin_resolve falls back to the earliest active platform skin server-side,
// and we fall back to BRANDING_DEFAULTS client-side. Never render blank.
// ═════════════════════════════════════════════════════════════════════

export type SkinOwnerKind = 'platform' | 'astra' | 'nova' | 'bee';

export interface SkinRow {
  id: string;
  owner_kind: SkinOwnerKind;
  owner_id: string | null;
  name: string;
  branding: Partial<BrandingConfig>;
  background_softness: number;
  is_preset: boolean;
  cloned_from: string | null;
  status: 'active' | 'archived';
  created_by: string | null;
  created_at: string;
}

export interface ResolvedSkin {
  skinId: string | null;
  name: string;
  branding: BrandingConfig;
  backgroundSoftness: number;
}

const FALLBACK: ResolvedSkin = {
  skinId: null,
  name: 'Rebelution',
  branding: { ...BRANDING_DEFAULTS },
  backgroundSoftness: 0.9,
};

/** Merge a loose branding blob over the baked defaults (never blank). */
export function mergeBranding(raw: Partial<BrandingConfig> | null | undefined): BrandingConfig {
  const out = { ...BRANDING_DEFAULTS };
  if (raw && typeof raw === 'object') {
    for (const k of Object.keys(out) as (keyof BrandingConfig)[]) {
      const v = raw[k];
      if (typeof v === 'string' && v.length <= 300) out[k] = v;
    }
  }
  return out;
}

/** Resolve the active skin for an owner (platform fallback server-side). */
export async function resolveSkin(
  ownerKind: SkinOwnerKind = 'platform',
  ownerId: string | null = null,
): Promise<ResolvedSkin> {
  if (!supabase) return { ...FALLBACK };
  try {
    const { data, error } = await supabase.rpc('skin_resolve', {
      p_owner_kind: ownerKind,
      p_owner_id: ownerId,
    });
    if (error || !data) return { ...FALLBACK };
    const d = data as {
      skin_id?: string;
      name?: string;
      branding?: Partial<BrandingConfig>;
      background_softness?: number;
    };
    return {
      skinId: d.skin_id ?? null,
      name: typeof d.name === 'string' ? d.name : FALLBACK.name,
      branding: mergeBranding(d.branding),
      backgroundSoftness: typeof d.background_softness === 'number' ? d.background_softness : 0.9,
    };
  } catch {
    return { ...FALLBACK };
  }
}

/** All active presets (the STUDIO pick-a-skin grid). */
export async function fetchPresets(): Promise<SkinRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('skins')
    .select('*')
    .eq('is_preset', true)
    .eq('status', 'active')
    .order('created_at', { ascending: true });
  if (error || !data) return [];
  return data as SkinRow[];
}

/** The signed-in Bee's own kits (BRANDS tab). */
export async function fetchMyKits(beeId: string): Promise<SkinRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('skins')
    .select('*')
    .eq('owner_kind', 'bee')
    .eq('owner_id', beeId)
    .eq('status', 'active')
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return data as SkinRow[];
}

/** Clone any active skin into a Bee-owned kit (lineage kept via cloned_from). */
export async function cloneSkin(sourceId: string, name?: string): Promise<string> {
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase.rpc('skin_clone', {
    p_source: sourceId,
    p_name: name ?? null,
  });
  if (error) throw new Error(error.message);
  return data as string;
}

/** Update an owned kit (name / branding / softness). */
export async function updateSkin(
  id: string,
  patch: { name?: string; branding?: Partial<BrandingConfig>; backgroundSoftness?: number },
): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured');
  const { error } = await supabase.rpc('skin_update', {
    p_id: id,
    p_name: patch.name ?? null,
    p_branding: patch.branding ?? null,
    p_background_softness: patch.backgroundSoftness ?? null,
  });
  if (error) throw new Error(error.message);
}

/** Create a Nova + its skin in one flow (wizard). Returns registry ids. */
export async function createNova(input: {
  astraId: string;
  displayName: string;
  slug: string;
  tier?: string;
  skinSourceId?: string | null;
}): Promise<{ novaId: string; skinId: string | null; slug: string }> {
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase.rpc('nova_create', {
    p_astra_id: input.astraId,
    p_display_name: input.displayName,
    p_slug: input.slug,
    p_tier: input.tier ?? 'standard',
    p_skin_source: input.skinSourceId ?? null,
  });
  if (error) throw new Error(error.message);
  const d = data as { nova_id: string; skin_id: string | null; slug: string };
  return { novaId: d.nova_id, skinId: d.skin_id, slug: d.slug };
}

/** Astra list for the wizard's source picker (registry read). */
export async function fetchAstraChoices(): Promise<
  { id: string; slug: string; displayName: string }[]
> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('astra_registry')
    .select('id, slug, display_name')
    .order('slug', { ascending: true });
  if (error || !data) return [];
  return (data as { id: string; slug: string; display_name: string }[]).map((r) => ({
    id: r.id,
    slug: r.slug,
    displayName: r.display_name,
  }));
}
