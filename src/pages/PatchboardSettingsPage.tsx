// PATCHBOARD1 — the Bee-scope Patchboard settings page (route /settings/patchboard).
//
// Lands inside the community shell (the /settings prefix). The platform-wide
// surface; per-Astra overrides render contextually within an Astra. PROFILE
// Settings links here (PLATFORM_SLATE v1).

import { PatchboardSettings } from '@/components/patchboard/PatchboardSettings';

export function PatchboardSettingsPage() {
  return <PatchboardSettings astraId={null} />;
}
