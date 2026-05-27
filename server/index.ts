// Express HTML-transform server for TheMANUAL.tech.
//
// Wraps Vite's dist/ output. On each HTML request, reads the Host header,
// resolves PillarConfig server-side via the shared registry, and rewrites
// <title> + injects og:title + og:description + meta description before
// sending. Static assets (/assets/*, /favicon.svg, etc.) are served as-is.
//
// Why: client-side React updates document.title once it mounts (see
// PillarContext useEffect), but social/SEO crawlers that don't execute JS
// (Twitter, Facebook, search engines) only see the static HTML response.
// Pre-this-server they'd always see "The Manual" as <title>, even on
// atlasintel.fyi. This is the per-host fix.
//
// Per shared/canon/manual-spine-api-v1.md §2.1.
//
// Runtime: tsx (npm start). No transpile step. The PillarConfig registry
// imports from src/ — type aliases resolve via tsconfig paths.

import express, { type Request, type Response } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { resolvePillarByHost } from '../src/lib/pillars/registry';

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

// HTML shell — every non-asset GET returns the SPA shell with per-host
// <title> + og meta. The SPA's client-side router then handles the path.
app.get(/.*/, (req: Request, res: Response) => {
  const rawHost = (req.headers.host ?? '').toString();
  // Strip any :port suffix (Host header may include it, e.g. ":3000" locally).
  const host = rawHost.split(':')[0].toLowerCase();

  const pillar = resolvePillarByHost(host);

  let title: string;
  if (pillar?.siteTitle) {
    title = pillar.siteTitle;
  } else if (pillar) {
    // Defensive: pillar resolved but siteTitle not set. Shouldn't fire because
    // siteTitle is required at compile time, but guards against runtime
    // anomalies. NEVER falls back to bare "The Manual" on a non-foundation host.
    title = `${pillar.wordmark} · HONEYCOMB`;
  } else {
    // No pillar match → foundation (themanual.tech, localhost, unknown host).
    title = FOUNDATION_SITE_TITLE;
  }

  const description = pillar?.tagline ?? FOUNDATION_DESCRIPTION;

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
