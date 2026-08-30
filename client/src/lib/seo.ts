export const SITE_NAME = 'PDF Toolbox';

export const SITE_TAGLINE = 'Everything you need to work with PDFs, in one place.';

/**
 * Build-time only (Vite inlines `import.meta.env.*` at build, so this is
 * never read at runtime from the actual deployed origin). Set the real
 * value as a `VITE_SITE_URL` project env var before deploying — canonical
 * links, Open Graph URLs and the generated sitemap all depend on it.
 */
const configuredSiteUrl = import.meta.env.VITE_SITE_URL;

if (!configuredSiteUrl && import.meta.env.PROD) {
  // Doesn't block the build — a placeholder domain in canonical/OG tags is
  // wrong but not fatal — just loud, so it isn't missed at launch.
  console.warn(
    '[seo] VITE_SITE_URL is not set. Canonical URLs and Open Graph tags will use a placeholder domain.',
  );
}

export const SITE_URL = (configuredSiteUrl ?? 'https://pdf-toolbox.example').replace(/\/$/, '');

export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.png`;

/** Absolute URL for a site-relative path, e.g. `/merge-pdf` -> `https://.../merge-pdf`. */
export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}
