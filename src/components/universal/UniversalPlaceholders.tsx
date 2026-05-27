// Universal cross-Astra utility-surface placeholders.
//
// Per shared/canon/manual-spine-api-v1.md §3 (cross-Astra utility-path
// architecture): every utility surface lives at a canonical path that
// resolves correctly from any Astra's host. The Astra context affects
// theming/copy via PillarConfig; the functional surface is identical
// across hosts.
//
// These are PLACEHOLDERS until the real surfaces ship in follow-up
// dispatches (HQ Control Room build, Manual Groups, Comms/CHAT, etc.).
// Each reads usePillar() so host theming applies on render.
//
// Note: /bling is NOT registered here — it already exists in App.tsx as
// an iframe wrapper around freedomblings.com (BlingsPage). Replacing
// would regress live functionality. When FreedomBLiNGs becomes a
// first-class registered Astra, the iframe wrapper can retire and a
// real BlingWallet component lands here.

import { usePillar } from '@/lib/pillars/PillarContext';

interface PlaceholderProps {
  surfaceName: string;
  description?: string;
}

function Placeholder({ surfaceName, description }: PlaceholderProps) {
  const pillar = usePillar();
  const accent = pillar?.accent ?? '#9ca3af'; // gray-400 default for foundation

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center">
      <div
        aria-hidden
        className="mx-auto mb-6 h-1 w-16 rounded-full"
        style={{ background: accent }}
      />
      <h1 className="font-display text-3xl font-semibold text-text-silver-bright">
        {surfaceName}
      </h1>
      <p className="mt-4 text-base text-text-muted">
        Coming soon
        {pillar ? ` on ${pillar.wordmark}` : ''}.
      </p>
      {description && (
        <p className="mt-2 text-sm text-text-muted/80">{description}</p>
      )}
    </div>
  );
}

export function HQControlRoom() {
  return (
    <Placeholder
      surfaceName="HQ Control Room"
      description="Admin-only operational dashboard. 9 sections build in a follow-up dispatch."
    />
  );
}

export function ManualGroupsPlaceholder() {
  return (
    <Placeholder
      surfaceName="Groups"
      description="Manual Groups browser + Group pages. Ships with Code D's Groups build."
    />
  );
}

export function CommsPlaceholder() {
  return (
    <Placeholder
      surfaceName="Comms"
      description="Messaging + DMs + Patchboard CHAT. Lands when CHAT canon ships."
    />
  );
}

export function NotificationCenter() {
  return (
    <Placeholder
      surfaceName="Notifications"
      description="Notification center across all subscribed surfaces."
    />
  );
}

export function CartPlaceholder() {
  return (
    <Placeholder
      surfaceName="Cart"
      description="Shopping cart (Bazaar items, atlasADs, etc.). Per Bazaar canon."
    />
  );
}

export function OpenAPIDocs() {
  return (
    <Placeholder
      surfaceName="API Docs"
      description="OpenAPI 3.1 spec for the Spine API. Auto-generated in a follow-up dispatch."
    />
  );
}

export function StatusPage() {
  return (
    <Placeholder
      surfaceName="Status"
      description="Platform status (Railway / GitHub / Supabase). Per MMF §19.3 INFRA STATUS SLIDER."
    />
  );
}
