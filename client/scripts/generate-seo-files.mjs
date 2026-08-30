// Runs after `vite build` (see package.json's `build` script). Vite has no
// server-side route to compute these dynamically, so they're generated once
// at build time from the same route list the app itself treats as public
// (publicRoutes.json), and written straight into `dist/` — Vercel serves a
// real file over the SPA rewrite in `vercel.json` automatically (the same
// reason `favicon.svg` already works today), so no hosting config changes.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDir = path.resolve(__dirname, '..');
const distDir = path.join(clientDir, 'dist');

const siteUrl = (process.env.VITE_SITE_URL ?? 'https://pdf-toolbox.example').replace(/\/$/, '');
if (!process.env.VITE_SITE_URL) {
  console.warn(
    '[generate-seo-files] VITE_SITE_URL is not set — sitemap.xml will use a placeholder domain. ' +
      'Set it as a real project env var before deploying.',
  );
}

const routes = JSON.parse(readFileSync(path.join(clientDir, 'src/lib/publicRoutes.json'), 'utf8'));

const today = new Date().toISOString().slice(0, 10);

const urlEntries = routes
  .map(
    (route) => `  <url>
    <loc>${siteUrl}${route.path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority.toFixed(1)}</priority>
  </url>`,
  )
  .join('\n');

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries}
</urlset>
`;

const robots = `User-agent: *
Allow: /
Disallow: /workspace
Disallow: /login
Disallow: /register
Disallow: /account
Disallow: /api/

Sitemap: ${siteUrl}/sitemap.xml
`;

writeFileSync(path.join(distDir, 'sitemap.xml'), sitemap);
writeFileSync(path.join(distDir, 'robots.txt'), robots);

console.log(`[generate-seo-files] wrote sitemap.xml (${routes.length} routes) and robots.txt to dist/`);
