// Shared Stripe wiring for Edge Functions.
// - getStripe(): lazily-constructed Stripe client using the Deno fetch HTTP
//   client (required in the edge runtime).
// - cryptoProvider: SubtleCrypto provider for constructEventAsync (the edge
//   runtime has no Node crypto, so signature verification MUST be async).

import Stripe from 'https://esm.sh/stripe@17.7.0?target=deno';

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (_stripe) return _stripe;
  const key = Deno.env.get('STRIPE_SECRET_KEY');
  if (!key) throw new Error('STRIPE_SECRET_KEY missing');
  _stripe = new Stripe(key, {
    apiVersion: '2024-06-20',
    httpClient: Stripe.createFetchHttpClient(),
  });
  return _stripe;
}

export const cryptoProvider = Stripe.createSubtleCryptoProvider();
