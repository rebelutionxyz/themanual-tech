import Stripe from 'https://esm.sh/stripe@17.7.0?target=deno';

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (_stripe) return _stripe;
  const key = Deno.env.get('STRIPE_SECRET_KEY');
  if (!key) throw new Error('STRIPE_SECRET_KEY missing');
  _stripe = new Stripe(key, {
    apiVersion: '2026-03-25.dahlia',
    httpClient: Stripe.createFetchHttpClient(),
  });
  return _stripe;
}

export const cryptoProvider = Stripe.createSubtleCryptoProvider();
