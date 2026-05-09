import type { ComponentType } from 'react';

export type AdminTier = 'my-hex' | 'nexus' | 'nucleus';

export type AdminRequires = 'authenticated' | 'property-owner' | 'keyholder';

export interface AdminSection {
  tier: AdminTier;
  slug: string;
  label: string;
  icon: string;
  order: number;
  requires: AdminRequires;
  component: ComponentType;
}

export interface AdminManifest {
  sections: AdminSection[];
}

export interface UserRole {
  bee: { id: string; handle: string } | null;
  isAuthenticated: boolean;
  isPropertyOwner: boolean;
  isKeyholder: boolean;
}

export const TIER_ACCENT: Record<AdminTier, string> = {
  'my-hex': '#E8B86E',
  nexus: '#C0C0C0',
  nucleus: '#FAD15E',
};

export const TIER_LABEL: Record<AdminTier, string> = {
  'my-hex': 'My Hex',
  nexus: 'The Nexus',
  nucleus: 'The Nucleus',
};
