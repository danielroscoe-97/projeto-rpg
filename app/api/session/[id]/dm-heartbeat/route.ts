/**
 * Legacy proxy route — forwards to /api/combat/[id]/dm-heartbeat.
 * sendBeacon POST cannot reliably follow redirects (RFC 7231) so we
 * re-export the handler instead of using `redirect()`.
 */
export { POST } from "@/app/api/combat/[id]/dm-heartbeat/route";
