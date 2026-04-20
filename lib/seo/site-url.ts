/**
 * Single source of truth for the site's canonical origin.
 *
 * Reads `NEXT_PUBLIC_SITE_URL` (set on Vercel + .env.local) with a safe apex
 * fallback. All canonical tags, OpenGraph URLs, JSON-LD `url`/`item` fields,
 * sitemap, and robots `host` MUST derive from here — never hardcode.
 *
 * Canonical is apex (no www); Vercel redirects www/http to this. To harden
 * against env-var drift (a prior Vercel deploy accidentally shipped with
 * `www.` → every JSON-LD URL was wrong), we force-strip `www.` from any
 * configured value. Trailing slash also normalized.
 */
function normalizeSiteUrl(raw: string | undefined): string {
  const fallback = "https://pocketdm.com.br";
  const src = (raw ?? "").trim();
  if (!src) return fallback;
  // Must be an http(s) absolute URL — anything else falls back to apex.
  if (!/^https?:\/\//i.test(src)) return fallback;
  try {
    const u = new URL(src);
    if (u.hostname.startsWith("www.")) {
      u.hostname = u.hostname.slice(4);
    }
    // Force https even if env sent http (Vercel enforces https at edge anyway).
    u.protocol = "https:";
    // Strip path/query/hash — SITE_URL is origin-only.
    return `${u.protocol}//${u.host}`;
  } catch {
    return fallback;
  }
}

export const SITE_URL = normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);

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
  // Collapse any leading slashes (including protocol-relative `//foo.com/...`)
  // so we always produce a well-formed absolute URL.
  const path = "/" + pathOrUrl.replace(/^\/+/, "");
  return `${SITE_URL}${path}`;
}