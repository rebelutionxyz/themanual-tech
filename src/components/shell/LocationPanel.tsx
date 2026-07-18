import { RealmTreeContent } from '@/components/shell/RealmTreeSlider';

/**
 * Location lens panel v2 (Butch 2026-07-18): locations LIVE IN THE REALM
 * TAXONOMY — the Geography realm carries the geonames import, drilling
 * country → state → city → neighborhood (USA → NY → New York City → SoHo).
 * This panel is the same lazy realm tree ROOTED at Geography; picking
 * places drives the ONE shared lens, so location chips render behind the
 * Astra name and feeds filter through the existing realm-prefix machinery
 * with zero new state.
 *
 * v1 (country/state selects over lib/geo) replaced — lib/geo remains in
 * service of the profile editor + promotions geo cascade.
 */
export function LocationPanel() {
  return <RealmTreeContent rootPath={['Geography']} clearLabel="Anywhere" />;
}
