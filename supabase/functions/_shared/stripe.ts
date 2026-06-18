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
    // Match the account's webhook delivery version so objects we retrieve
    // share the same shape as the event payloads (basil+ moved current_period_end
    // onto items, and the invoice→subscription link to parent.subscription_details).
    apiVersion: '2026-03-25.dahlia',
    httpClient: Stripe.createFetchHttpClient(),
  });
  return _stripe;
}

export const cryptoProvider = Stripe.createSubtleCryptoProvider();
