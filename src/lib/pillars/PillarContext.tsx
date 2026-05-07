import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { PillarConfig } from './pillar.types';
import { resolvePillarByHost } from './registry';

// Context value: PillarConfig when host matches a registered pillar,
// null when host doesn't match (themanual.tech itself, localhost, etc.),
// undefined when no provider — usePillar throws in that case.
const PillarContext = createContext<PillarConfig | null | undefined>(undefined);

export function PillarProvider({ children }: { children: ReactNode }) {
  const [pillar] = useState<PillarConfig | null>(() =>
    resolvePillarByHost(window.location.hostname),
  );

  useEffect(() => {
    if (pillar?.constellation) {
      document.body.setAttribute('data-constellation', pillar.constellation);
    } else {
      document.body.removeAttribute('data-constellation');
    }
    return () => {
      document.body.removeAttribute('data-constellation');
    };
  }, [pillar?.constellation]);

  return <PillarContext.Provider value={pillar}>{children}</PillarContext.Provider>;
}

export function usePillar(): PillarConfig | null {
  const ctx = useContext(PillarContext);
  if (ctx === undefined) {
    throw new Error('usePillar must be used within PillarProvider');
  }
  return ctx;
}

/**
 * Look up a copy string with pillar-specific override support.
 * Returns pillar.copyOverrides[key] when defined; otherwise returns the key itself.
 * Example: useCopy('Bees') → 'Members' on AtlasNation pillars carrying the override; 'Bees' otherwise.
 */
export function useCopy(key: string): string {
  const pillar = usePillar();
  return pillar?.copyOverrides?.[key] ?? key;
}
