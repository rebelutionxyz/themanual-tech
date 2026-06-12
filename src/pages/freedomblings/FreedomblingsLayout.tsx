import { ConstellationOverlay } from '@/components/freedomblings/ConstellationOverlay';
import { FreedomblingsSidebar } from '@/components/freedomblings/FreedomblingsSidebar';
/* FreedomBLiNGS — shared layout (mirrors the DingleBERRY layout pattern).
   The design's left Sidebar + a main column. The whole subtree is wrapped in a
   [data-surface='freedomblings'] element so the warm-paper/white+gold Aurora
   tokens stay SCOPED — they never leak into the dark platform chrome. Aurora is
   the locked default theme; grotesque type; compact density (all baked into the
   scoped token block in styles/freedomblings.css). The wrapper is `relative` so
   surface-scoped overlays (Provenance, the Constellation launcher) cover it. */
import { useState } from 'react';
import { Outlet } from 'react-router-dom';

export function FreedomblingsLayout() {
  const [constellationOpen, setConstellationOpen] = useState(false);

  return (
    <div data-surface="freedomblings" className="relative flex h-full overflow-hidden">
      <FreedomblingsSidebar onLaunch={() => setConstellationOpen(true)} />
      <Outlet />
      {constellationOpen && <ConstellationOverlay onClose={() => setConstellationOpen(false)} />}
    </div>
  );
}
