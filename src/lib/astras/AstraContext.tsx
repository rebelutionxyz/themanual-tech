import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { AstraConfig } from './astra.types';
import { resolveAstraByHost } from './registry';

// Context value: AstraConfig when host matches a registered astra,
// null when host doesn't match (themanual.tech itself, localhost, etc.),
// undefined when no provider — useAstra throws in that case.
const AstraContext = createContext<AstraConfig | null | undefined>(undefined);

export function AstraProvider({ children }: { children: ReactNode }) {
  const [astra] = useState<AstraConfig | null>(() =>
    resolveAstraByHost(window.location.hostname),
  );

  useEffect(() => {
    if (astra?.constellation) {
      document.body.setAttribute('data-constellation', astra.constellation);
    } else {
      document.body.removeAttribute('data-constellation');
    }
    return () => {
      document.body.removeAttribute('data-constellation');
    };
  }, [astra?.constellation]);

  return <AstraContext.Provider value={astra}>{children}</AstraContext.Provider>;
}

export function useAstra(): AstraConfig | null {
  const ctx = useContext(AstraContext);
  if (ctx === undefined) {
    throw new Error('useAstra must be used within AstraProvider');
  }
  return ctx;
}

/**
 * Look up a copy string with astra-specific override support.
 * Returns astra.copyOverrides[key] when defined; otherwise returns the key itself.
 * Example: useCopy('Bees') → 'Members' on AtlasNation astras carrying the override; 'Bees' otherwise.
 */
export function useCopy(key: string): string {
  const astra = useAstra();
  return astra?.copyOverrides?.[key] ?? key;
}

type LogLevel = 'log' | 'info' | 'warn' | 'error';

export interface AstraLogger {
  log: (msg: string, ...args: unknown[]) => void;
  info: (msg: string, ...args: unknown[]) => void;
  warn: (msg: string, ...args: unknown[]) => void;
  error: (msg: string, ...args: unknown[]) => void;
  /** Generic dispatcher — for callers that compute the level dynamically. */
  emit: (level: LogLevel, msg: string, ...args: unknown[]) => void;
}

/**
 * Astra-aware logger. Every emitted line is prefixed with `[astra:<slug>]`
 * (or `[astra:foundation]` when no astra is active — themanual.tech itself,
 * localhost, etc.). Per MMF §19.6, this is the canonical safety precaution for
 * disambiguating logs across astras sharing one Railway service.
 *
 * Usage:
 *   const log = useAstraLogger();
 *   log.warn('user attempted to send bling', { handle, amount });
 *   // → "[astra:atlasintel] user attempted to send bling { handle, amount }"
 *
 * Opt-in only — does NOT replace existing console calls anywhere in the
 * codebase. Sweep is a separate task.
 */
export function useAstraLogger(): AstraLogger {
  const astra = useAstra();
  const prefix = `[astra:${astra?.slug ?? 'foundation'}]`;
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
