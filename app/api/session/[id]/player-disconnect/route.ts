/**
 * Legacy proxy route — forwards to /api/combat/[id]/player-disconnect.
 * sendBeacon POST cannot reliably follow redirects so we re-export the
 * handler instead of using `redirect()`.
 */
export { POST } from "@/app/api/combat/[id]/player-disconnect/route";
