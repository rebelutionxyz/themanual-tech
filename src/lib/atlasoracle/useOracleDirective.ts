// Shared directive state machine for every AtlasOracle surface.
//
// The badge and the /oracle console both drive this hook, so the request
// shape, the confirm-cost gate, and the error handling can only be wrong in
// one place instead of two.

import { useCallback, useState } from 'react';
import {
  type DirectiveCategory,
  type InvokeArgs,
  type RouteFailure,
  type RoutePreview,
  type RouteSuccess,
  type Tier,
  invokeDirective,
} from './client';

export type DirectiveState = 'idle' | 'working' | 'awaiting-confirm' | 'response-ready';

export interface UseOracleDirective {
  state: DirectiveState;
  response: RouteSuccess | null;
  preview: RoutePreview | null;
  failure: RouteFailure | null;
  /** Fires a directive. Resolves once the router has answered. */
  send: (text: string, opts: SendOpts) => Promise<void>;
  /** Re-fires the pending directive with confirm_cost — only valid while awaiting-confirm. */
  confirm: () => Promise<void>;
  /** Drops the pending cost preview without routing. */
  cancelConfirm: () => void;
  reset: () => void;
}

export interface SendOpts {
  tier: Tier;
  category: DirectiveCategory;
  astraSlug?: string;
}

export function useOracleDirective(): UseOracleDirective {
  const [state, setState] = useState<DirectiveState>('idle');
  const [response, setResponse] = useState<RouteSuccess | null>(null);
  const [preview, setPreview] = useState<RoutePreview | null>(null);
  const [failure, setFailure] = useState<RouteFailure | null>(null);
  const [pending, setPending] = useState<InvokeArgs | null>(null);

  const run = useCallback(async (args: InvokeArgs) => {
    setFailure(null);
    setState('working');

    const result = await invokeDirective(args);

    if (result.kind === 'preview') {
      setPreview(result);
      setPending(args);
      setState('awaiting-confirm');
      return;
    }
    if (result.kind === 'error') {
      setFailure(result);
      setState('idle');
      return;
    }
    setResponse(result);
    setPreview(null);
    setPending(null);
    setState('response-ready');
  }, []);

  const send = useCallback(
    async (text: string, opts: SendOpts) => {
      setResponse(null);
      setPreview(null);
      await run({
        directive: text,
        tier: opts.tier,
        category: opts.category,
        astraSlug: opts.astraSlug,
      });
    },
    [run],
  );

  const confirm = useCallback(async () => {
    if (!pending) return;
    await run({ ...pending, confirmCost: true });
  }, [pending, run]);

  const cancelConfirm = useCallback(() => {
    setPreview(null);
    setPending(null);
    setState('idle');
  }, []);

  const reset = useCallback(() => {
    setState('idle');
    setResponse(null);
    setPreview(null);
    setFailure(null);
    setPending(null);
  }, []);

  return { state, response, preview, failure, send, confirm, cancelConfirm, reset };
}
