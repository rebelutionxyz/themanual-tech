// Deterministic id helpers.
//
// invoiceRef() maps a Stripe invoice id → a STABLE uuid (v5). subscription_sync
// uses this as p_invoice_ref; its affiliate trigger is skipped when an
// affiliate_hold already exists for that source_ref. Because the uuid is a pure
// function of the Stripe invoice id, Stripe webhook retries and duplicate
// deliveries collapse to the same ref — the upline is freed BLiNG! exactly once
// per paid invoice.

import { v5 } from 'https://deno.land/std@0.224.0/uuid/mod.ts';

// Fixed HONEYCOMB namespace (v4). DO NOT CHANGE — invoice_ref stability, and
// therefore affiliate idempotency, depends on this constant never moving.
const HONEYCOMB_NS = 'a7f3c1d2-0b44-4e6a-9c2e-1f0e5b3a8d61';

export async function invoiceRef(stripeInvoiceId: string): Promise<string> {
  const data = new TextEncoder().encode(`stripe_invoice:${stripeInvoiceId}`);
  return await v5.generate(HONEYCOMB_NS, data);
}
