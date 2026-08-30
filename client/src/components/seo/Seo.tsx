import { Helmet } from 'react-helmet-async';

import { absoluteUrl, DEFAULT_OG_IMAGE, SITE_NAME } from '../../lib/seo';

interface SeoProps {
  /** Page-specific title, e.g. "Merge PDF Files Online". The site name is appended. */
  title: string;
  /** ~150-160 characters, written for a search results snippet. */
  description: string;
  /** Site-relative path this page is served at, e.g. "/merge-pdf". Used for canonical + og:url. */
  path: string;
  /** Absolute image URL. Defaults to the site's branded Open Graph image. */
  image?: string;
  /** Set on pages with no unique public content: /workspace, auth pages, 404. */
  noindex?: boolean;
  /** One or more Schema.org objects to emit as JSON-LD. */
  jsonLd?: object | object[];
}

/**
 * Per-route document head. `react-helmet-async` merges these tags into
 * `index.html`'s `<head>` on the client — Google and Bing render JS and see
 * them; raw-HTML social-preview scrapers (Twitter/Facebook) only see the
 * static defaults in `index.html`, a known limitation of a client-rendered
 * SPA without server-side rendering.
 */
export function Seo({ title, description, path, image = DEFAULT_OG_IMAGE, noindex, jsonLd }: SeoProps) {
  const url = absoluteUrl(path);
  const fullTitle = `${title} · ${SITE_NAME}`;
  const jsonLdList = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      <meta name="robots" content={noindex ? 'noindex, nofollow' : 'index, follow'} />

      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={image} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      {jsonLdList.map((entry, index) => (
        <script key={index} type="application/ld+json">
          {JSON.stringify(entry)}
        </script>
      ))}
    </Helmet>
  );
}
