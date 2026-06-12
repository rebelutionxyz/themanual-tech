import { FreedomblingsSidebar } from '@/components/freedomblings/FreedomblingsSidebar';
/* FreedomBLiNGS — shared layout (mirrors the DingleBERRY layout pattern).
   The design's left Sidebar + a main column. The whole subtree is wrapped in a
   [data-surface='freedomblings'] element so the warm-paper/white+gold Aurora
   tokens stay SCOPED — they never leak into the dark platform chrome. Aurora is
   the locked default theme; grotesque type; compact density (all baked into the
   scoped token block in styles/freedomblings.css). */
import { Outlet } from 'react-router-dom';

export function FreedomblingsLayout() {
  return (
    <div data-surface="freedomblings" className="flex h-full overflow-hidden">
      <FreedomblingsSidebar />
      <Outlet />
    </div>
  );
}
