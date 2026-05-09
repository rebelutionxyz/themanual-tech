import type { AdminSection, AdminTier, UserRole } from './types';
import { coreManifest } from './manifests/core';

const ALL_MANIFESTS = [coreManifest];

const ALL_SECTIONS: AdminSection[] = ALL_MANIFESTS.flatMap((m) => m.sections);

function meetsRequires(section: AdminSection, role: UserRole): boolean {
  switch (section.requires) {
    case 'authenticated':
      return role.isAuthenticated;
    case 'property-owner':
      return role.isPropertyOwner;
    case 'keyholder':
      return role.isKeyholder;
  }
}

export function getSectionsForTier(tier: AdminTier, role: UserRole): AdminSection[] {
  return ALL_SECTIONS
    .filter((s) => s.tier === tier && meetsRequires(s, role))
    .sort((a, b) => a.order - b.order);
}

export function getAllManifests() {
  return ALL_MANIFESTS;
}
