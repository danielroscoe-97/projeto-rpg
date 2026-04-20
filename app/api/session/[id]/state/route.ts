/**
 * Legacy proxy route — forwards to /api/combat/[id]/state.
 * Kept for compatibility with tabs/clients from before the Linguagem Ubíqua
 * migration. Uses re-export (not redirect) because redirects of non-GET
 * methods or sendBeacon can be unreliable per RFC 7231 (see
 * docs/migration-rotas-session-to-combat.md).
 */
export { GET } from "@/app/api/combat/[id]/state/route";
