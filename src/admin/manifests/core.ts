import { MyPropertiesSection } from '../sections/MyPropertiesSection';
import { ProfileSection } from '../sections/ProfileSection';
import { SystemStateSection } from '../sections/SystemStateSection';
import type { AdminManifest } from '../types';

export const coreManifest: AdminManifest = {
  sections: [
    {
      tier: 'my-hex',
      slug: 'profile',
      label: 'Profile',
      icon: 'User',
      order: 10,
      requires: 'authenticated',
      component: ProfileSection,
    },
    {
      tier: 'nexus',
      slug: 'properties',
      label: 'My Properties',
      icon: 'Building2',
      order: 10,
      requires: 'property-owner',
      component: MyPropertiesSection,
    },
    {
      tier: 'nucleus',
      slug: 'system-state',
      label: 'System State',
      icon: 'Activity',
      order: 10,
      requires: 'keyholder',
      component: SystemStateSection,
    },
  ],
};
