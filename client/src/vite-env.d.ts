/// <reference types="vite/client" />

/**
 * Typed build-time configuration. Vite's default `ImportMetaEnv` has an `any`
 * index signature; declaring the variables we actually use keeps them checked.
 */
interface ImportMetaEnv {
  /** Base URL of the API. Empty in development, where Vite proxies `/api`. */
  readonly VITE_API_BASE_URL?: string;
  /** Production origin, e.g. `https://pdftoolbox.com`. Drives canonical/OG URLs and the sitemap. */
  readonly VITE_SITE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
