/**
 * Single source of truth for the site's canonical origin.
 *
 * Reads `NEXT_PUBLIC_SITE_URL` (set on Vercel + .env.local) with a safe apex
 * fallback. All canonical tags, OpenGraph URLs, JSON-LD `url`/`item` fields,
 * sitemap, and robots `host` MUST derive from here — never hardcode.
 *
 * Canonical is apex (no www); Vercel redirects www/http to this.
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") ||
  "https://pocketdm.com.br";

/**
 * Build an absolute URL on the canonical origin.
 *
 * Accepts either a path ("/monsters/axe-beak") or a full URL (returned as-is
 * if on the canonical origin, or normalized if not). Leading slash optional.
 */
export function siteUrl(pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) {
    return pathOrUrl;
  }
  const path = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  return `${SITE_URL}${path}`;
}
