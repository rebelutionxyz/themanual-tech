import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { PillarConfig } from './pillar.types';
import { resolvePillarByHost } from './registry';

// Context value: PillarConfig when host matches a registered pillar,
// null when host doesn't match (themanual.tech itself, localhost, etc.),
// undefined when no provider — usePillar throws in that case.
const PillarContext = createContext<PillarConfig | null | undefined>(undefined);

// Foundation site title — used ONLY when no pillar resolves (themanual.tech
// itself, localhost). Per manual-spine-api-v1.md §2.1 canonical values list.
const FOUNDATION_SITE_TITLE = 'The Manual · HONEYCOMB Knowledge Spine';

function setMetaProperty(property: string, content: string): void {
  let el = document.head.querySelector<HTMLMetaElement>(
    `meta[property="${property}"]`,
  );
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('property', property);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

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

  // Drive <title> + og:title from PillarConfig. The static <title>The Manual</title>
  // in index.html serves until React mounts; this effect overrides per-host
  // immediately on mount. Foundation (no pillar resolved) → "The Manual ·
  // HONEYCOMB Knowledge Spine". Resolved pillar → its siteTitle (required field).
  // Defensive `${wordmark} · HONEYCOMB` fallback handles a hypothetical future
  // pillar where siteTitle slipped past the type check; NEVER falls back to bare
  // "The Manual" on a non-foundation host (that's the atlasintel.fyi bug fix).
  useEffect(() => {
    let title: string;
    if (pillar?.siteTitle) {
      title = pillar.siteTitle;
    } else if (pillar) {
      title = `${pillar.wordmark} · HONEYCOMB`;
    } else {
      title = FOUNDATION_SITE_TITLE;
    }
    document.title = title;
    setMetaProperty('og:title', title);
  }, [pillar?.siteTitle, pillar?.wordmark]);

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

type LogLevel = 'log' | 'info' | 'warn' | 'error';

export interface PillarLogger {
  log: (msg: string, ...args: unknown[]) => void;
  info: (msg: string, ...args: unknown[]) => void;
  warn: (msg: string, ...args: unknown[]) => void;
  error: (msg: string, ...args: unknown[]) => void;
  /** Generic dispatcher — for callers that compute the level dynamically. */
  emit: (level: LogLevel, msg: string, ...args: unknown[]) => void;
}

/**
 * Pillar-aware logger. Every emitted line is prefixed with `[pillar:<slug>]`
 * (or `[pillar:foundation]` when no pillar is active — themanual.tech itself,
 * localhost, etc.). Per MMF §19.6, this is the canonical safety precaution for
 * disambiguating logs across pillars sharing one Railway service.
 *
 * Usage:
 *   const log = usePillarLogger();
 *   log.warn('user attempted to send bling', { handle, amount });
 *   // → "[pillar:atlasintel] user attempted to send bling { handle, amount }"
 *
 * Opt-in only — does NOT replace existing console calls anywhere in the
 * codebase. Sweep is a separate task.
 */
export function usePillarLogger(): PillarLogger {
  const pillar = usePillar();
  const prefix = `[pillar:${pillar?.slug ?? 'foundation'}]`;
  const emit = (level: LogLevel, msg: string, ...args: unknown[]) => {
    // eslint-disable-next-line no-console
    console[level](prefix, msg, ...args);
  };
  return {
    log: (m, ...a) => emit('log', m, ...a),
    info: (m, ...a) => emit('info', m, ...a),
    warn: (m, ...a) => emit('warn', m, ...a),
    error: (m, ...a) => emit('error', m, ...a),
    emit,
  };
}
