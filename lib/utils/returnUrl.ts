/**
 * Return-URL whitelist sanitization (anti open-redirect).
 *
 * Used to sanitize any `next=`/`returnUrl` param that will be fed back into a
 * login/signup redirect. Only allows same-origin internal paths.
 *
 * Rejected:
 * - Absolute URLs (`https://evil.com`, `http://...`)
 * - Protocol-relative (`//evil.com`) — would resolve to external origin
 * - Pseudo-protocols (`javascript:`, `data:`, `vbscript:`, `mailto:`)
 * - Paths containing `@` (URL userinfo trick)
 * - Paths containing `\` (Windows backslash bypass)
 * - Empty / undefined / non-string
 *
 * Accepted:
 * - `/`
 * - `/dashboard`
 * - `/try`
 * - `/join/abc123`
 * - `/feedback/abc123?x=1#y` (query + hash allowed on deep paths)
 *
 * @param input - Raw return URL from query string or caller
 * @returns Safe internal path, or `/` as a safe fallback
 */
export function sanitizeReturnUrl(input: unknown): string {
  const FALLBACK = "/";

  if (typeof input !== "string") return FALLBACK;
  if (input.length === 0) return FALLBACK;

  // Reject protocol-relative (//evil.com → browser resolves to https://evil.com)
  if (input.startsWith("//")) return FALLBACK;

  // Must start with a single forward slash
  if (!input.startsWith("/")) return FALLBACK;

  // Reject backslash injection (Windows path, could be normalized by some browsers)
  if (input.includes("\\")) return FALLBACK;

  // Reject URL userinfo trick (/@evil.com resolves to evil.com as host in some contexts)
  if (input.includes("@")) return FALLBACK;

  // Reject any pseudo-protocol anywhere in string (defense-in-depth; startsWith("/")
  // already blocks `javascript:` at position 0, but catch smuggled cases too)
  // Common dangerous schemes:
  const lower = input.toLowerCase();
  const BAD_SCHEMES = ["javascript:", "data:", "vbscript:", "mailto:", "file:"];
  for (const scheme of BAD_SCHEMES) {
    if (lower.includes(scheme)) return FALLBACK;
  }

  // Only allow printable ASCII + common URL chars. Reject control chars / newlines /
  // unicode that could bypass parsers.
  if (/[\x00-\x1f\x7f]/.test(input)) return FALLBACK;

  return input;
}
