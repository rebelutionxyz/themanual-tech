/** @type {import('next').NextConfig} */

/*
 * BASE PATH IS ENV-DRIVEN, and the default is deliberately empty.
 *
 * Two worlds have to work from one build config:
 *   proxied      served under a path segment -> NEXT_PUBLIC_BASE_PATH=/fund
 *   standalone   served at a root of its own -> unset, so the app roots at /
 *
 * NEXT_PUBLIC_ because basePath is baked into every emitted asset URL at BUILD
 * time. THE PROXIED SERVICE REQUIRES THIS VARIABLE AT BUILD TIME: a build
 * without it roots at / and breaks behind the proxy — the document would be
 * served but every /_next/... asset would resolve outside the proxy and be
 * answered by the manual's catch-all with HTML instead of JS. Setting the
 * variable on an already-built service and reloading does nothing; it needs a
 * redeploy.
 *
 * This shape is the ASTRA_STANDARD v1.0 §2 requirement, proven on the VOTE app
 * (FRONT38) and carried through Justice. FUND's canonical face is a path on the
 * manual (FUND_MF v0.1, SEO); the assigned domain rebelution.fund is NOT
 * attached, and per §12 attaching it later is an env change plus a 301, never a
 * code change. Nothing in this file names a host.
 */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

const nextConfig = {
  reactStrictMode: true,
  basePath,
  // The dev-tools badge overlays the page in captures.
  devIndicators: false,
};

export default nextConfig;
