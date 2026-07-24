import { Store } from 'lucide-react';

// STOREFRONT — the ETZY module's reserved slot (etzy-store-blueprint v0.2+).
// Nothing here is load-bearing yet; the tab exists so ETZY plugs in without
// reworking the shell. Fleet plan: every Astra can run its own storefront
// (shop.* subdomains) wearing its own skin, one POD account fulfilling all.
// Language firewall: GET / OFFER / REDEEM — never the banned verbs.

const PROVIDERS = ['Etsy (affiliate-wired · §36.5)', 'Printify', 'Printful', 'Stripe rail'];

export function BrandosophicStorefrontPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="rounded-2xl border border-dashed border-zinc-300 p-10 text-center">
        <Store className="mx-auto text-zinc-400" size={34} />
        <h1 className="mt-4 text-lg font-bold text-zinc-900">Storefront — arriving</h1>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-500">
          Your brand kit becomes a storefront: branded goods on demand, no inventory. Bees GET your
          merch; a print partner makes and ships each piece. Every Astra can run its own —
          shop.rebelution.xyz is first in line.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {PROVIDERS.map((p) => (
            <span
              key={p}
              className="rounded-full border border-zinc-200 px-3 py-1 text-xs text-zinc-500"
            >
              {p}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
