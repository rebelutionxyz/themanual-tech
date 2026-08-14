// Express HTML-transform server for TheMANUAL.tech.
//
// Wraps Vite's dist/ output. On each HTML request, reads the Host header,
// resolves AstraConfig server-side via the shared registry, and rewrites
// <title> + injects og:title + og:description + meta description before
// sending. Static assets (/assets/*, /favicon.svg, etc.) are served as-is.
//
// Why: client-side React updates document.title once it mounts (see
// AstraContext useEffect), but social/SEO crawlers that don't execute JS
// (Twitter, Facebook, search engines) only see the static HTML response.
// Pre-this-server they'd always see "The Manual" as <title>, even on
// atlasintel.fyi. This is the per-host fix.
//
// Per shared/canon/manual-spine-api-v1.md §2.1.
//
// Runtime: tsx (npm start). No transpile step. The AstraConfig registry
// imports from src/ — type aliases resolve via tsconfig paths.

import express, { type Request, type Response } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import fs from 'node:fs';
import path from 'node:path';
import { resolveAstraByHost } from '../src/lib/astras/registry';

const FOUNDATION_SITE_TITLE = 'The Manual · HONEYCOMB Knowledge Spine';
const FOUNDATION_DESCRIPTION =
  'The Manual — a sovereign research instrument. Show me who got it wrong.';

const DIST_DIR = path.resolve(process.cwd(), 'dist');
const INDEX_HTML_PATH = path.join(DIST_DIR, 'index.html');

if (!fs.existsSync(INDEX_HTML_PATH)) {
  console.error(
    `[server] FATAL: ${INDEX_HTML_PATH} not found. Run 'npm run build' before 'npm start'.`,
  );
  process.exit(1);
}

const HTML_TEMPLATE = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

const app = express();

// Trust X-Forwarded-* from Railway's proxy so req.headers.host (Host) is
// the public hostname, not the internal proxy hostname.
app.set('trust proxy', true);

// Static assets — everything Vite emitted EXCEPT index.html (we transform that).
// Vite hashes asset filenames so long max-age is safe. HTML is no-cache.
app.use(
  express.static(DIST_DIR, {
    index: false,
    maxAge: '1y',
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache');
      }
    },
  }),
);

// ─────────────────────────────────────────────────────────────────────
// /vote → the VOTE service (AtlasVOTE / the Elections astra)
//
// MOUNT ORDER IS LOAD-BEARING and this position is the whole point: AFTER
// express.static, BEFORE the SPA catch-all below. Mounted after the catch-all
// instead, every /vote request would return the manual's SPA shell with a 200
// and this proxy would silently never run — a failure that reads as a bug in
// VOTE rather than a mount-order bug here. (OPS88 finding, FRONT37.)
//
// VOTE is a PRIVATE Railway service in this same project — no public
// subdomain, per DEPLOY AMENDMENT v2. It is reachable only over the private
// network, which is why nothing here can be smoke-tested from a laptop.
//
// THE /vote PREFIX IS PRESERVED, NOT STRIPPED. VOTE is built with
// NEXT_PUBLIC_BASE_PATH=/vote, so it expects to own that prefix and emits all
// of its assets under /vote/_next/. `pathFilter` is used rather than
// app.use('/vote', …) precisely because Express strips a mount path from
// req.url and we would have to add it straight back.
const VOTE_INTERNAL_URL = process.env.VOTE_INTERNAL_URL;

if (VOTE_INTERNAL_URL) {
  app.use(
    createProxyMiddleware({
      // Matches /vote exactly and everything beneath it — and nothing else.
      // A prefix test alone would also swallow sibling paths like /voters.
      pathFilter: (pathname: string) => pathname === '/vote' || pathname.startsWith('/vote/'),
      target: VOTE_INTERNAL_URL,
      // Keep the browser's Host so VOTE sees the public hostname; the private
      // target does no host-based routing. X-Forwarded-* carries the rest.
      changeOrigin: false,
      xfwd: true,
      ws: false,
      on: {
        // A dead or restarting VOTE service must degrade to a plain 502 on
        // /vote and MUST NOT take the manual down with it.
        error: (err: Error, _req, res) => {
          console.error('[server] /vote proxy error:', err.message);
          const response = res as Response;
          if (typeof response.headersSent === 'boolean' && !response.headersSent) {
            response.status(502).type('text/plain').send('The vote service is unavailable.');
          }
        },
      },
    }),
  );
  console.log(`[server] /vote proxying to ${VOTE_INTERNAL_URL}`);
} else {
  // NOT FATAL, deliberately. An unset variable must not stop the manual from
  // serving — /vote simply falls through to the SPA shell below, exactly as it
  // did before this proxy existed.
  console.warn('[server] VOTE_INTERNAL_URL unset — /vote is NOT proxied.');
}

// ─────────────────────────────────────────────────────────────────────
// /justice → the JUSTICE service (the Justice astra)
//
// SAME MOUNT-ORDER LAW as /vote above: AFTER express.static, BEFORE the SPA
// catch-all. Mounted after the catch-all instead, every /justice request would
// return the manual's SPA shell with a 200 and this proxy would silently never
// run.
//
// This mount REPLACES the astra-catalog /justice stub page: while the variable
// is set the proxy answers first and the stub is simply unreachable. The stub
// stays in src/ untouched and is what /justice falls back to when the variable
// is unset — the same fall-through /vote has.
//
// THE /justice PREFIX IS PRESERVED, NOT STRIPPED. Justice is built with
// NEXT_PUBLIC_BASE_PATH=/justice (see Justice/next.config.mjs), so it owns that
// prefix and emits its assets under /justice/_next/. `pathFilter` is used
// rather than app.use('/justice', …) because Express strips a mount path from
// req.url and we would have to add it straight back.
const JUSTICE_INTERNAL_URL = process.env.JUSTICE_INTERNAL_URL;

if (JUSTICE_INTERNAL_URL) {
  app.use(
    createProxyMiddleware({
      // Matches /justice exactly and everything beneath it — and nothing else.
      // A prefix test alone would also swallow sibling paths.
      pathFilter: (pathname: string) =>
        pathname === '/justice' || pathname.startsWith('/justice/'),
      target: JUSTICE_INTERNAL_URL,
      // Keep the browser's Host so JUSTICE sees the public hostname; the
      // private target does no host-based routing. X-Forwarded-* carries the rest.
      changeOrigin: false,
      xfwd: true,
      ws: false,
      on: {
        // A dead or restarting JUSTICE service must degrade to a plain 502 on
        // /justice and MUST NOT take the manual down with it.
        error: (err: Error, _req, res) => {
          console.error('[server] /justice proxy error:', err.message);
          const response = res as Response;
          if (typeof response.headersSent === 'boolean' && !response.headersSent) {
            response.status(502).type('text/plain').send('The justice service is unavailable.');
          }
        },
      },
    }),
  );
  console.log(`[server] /justice proxying to ${JUSTICE_INTERNAL_URL}`);
} else {
  // NOT FATAL, deliberately — identical to /vote. An unset variable must not
  // stop the manual from serving — /justice simply falls through to the SPA
  // shell below, exactly as it did before this proxy existed.
  console.warn('[server] JUSTICE_INTERNAL_URL unset — /justice is NOT proxied.');
}

// HTML shell — every non-asset GET returns the SPA shell with per-host
// <title> + og meta. The SPA's client-side router then handles the path.
app.get(/.*/, (req: Request, res: Response) => {
  const rawHost = (req.headers.host ?? '').toString();
  // Strip any :port suffix (Host header may include it, e.g. ":3000" locally).
  const host = rawHost.split(':')[0].toLowerCase();

  const astra = resolveAstraByHost(host);

  let title: string;
  if (astra?.siteTitle) {
    title = astra.siteTitle;
  } else if (astra) {
    // Defensive: astra resolved but siteTitle not set. Shouldn't fire because
    // siteTitle is required at compile time, but guards against runtime
    // anomalies. NEVER falls back to bare "The Manual" on a non-foundation host.
    title = `${astra.wordmark} · HONEYCOMB`;
  } else {
    // No astra match → foundation (themanual.tech, localhost, unknown host).
    title = FOUNDATION_SITE_TITLE;
  }

  const description = astra?.tagline ?? FOUNDATION_DESCRIPTION;

  const titleEsc = escapeHtmlText(title);
  const titleAttr = escapeHtmlAttr(title);
  const descAttr = escapeHtmlAttr(description);

  // Replace <title> + meta description, then inject og:title + og:description
  // right after <title>. Idempotent: if og tags ever land in the source
  // template the inject would duplicate — current template has none.
  let html = HTML_TEMPLATE
    .replace(/<title>[^<]*<\/title>/, `<title>${titleEsc}</title>`)
    .replace(
      /<meta\s+name="description"\s+content="[^"]*"\s*\/>/,
      `<meta name="description" content="${descAttr}" />`,
    );

  const ogTags = `<meta property="og:title" content="${titleAttr}" />\n    <meta property="og:description" content="${descAttr}" />`;
  html = html.replace('</title>', `</title>\n    ${ogTags}`);

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache');
  res.send(html);
});

const PORT = parseInt(process.env.PORT ?? '3000', 10);
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[server] TheMANUAL.tech HTML-transform server listening on 0.0.0.0:${PORT}`);
});

function escapeHtmlText(s: string): string {
  return s.replace(/[&<>"']/g, (c) => {
    switch (c) {
      case '&': return '&amp;';
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '"': return '&quot;';
      case "'": return '&#39;';
      default:  return c;
    }
  });
}

function escapeHtmlAttr(s: string): string {
  return s.replace(/[&"<>]/g, (c) => {
    switch (c) {
      case '&': return '&amp;';
      case '"': return '&quot;';
      case '<': return '&lt;';
      case '>': return '&gt;';
      default:  return c;
    }
  });
}
