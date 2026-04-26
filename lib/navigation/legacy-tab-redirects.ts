/**
 * Sprint 3 Track A · Story B3 — back-compat for legacy `?tab=` deep links.
 *
 * Pure helpers, extracted from `app/.../sheet/page.tsx` so the mapping +
 * URL builder can be unit-tested without spinning up Next.js routing.
 *
 * Mapping per [09-implementation-plan.md §B3](../../_bmad-output/party-mode-2026-04-22/09-implementation-plan.md):
 *
 *   ?tab=ficha        → ?tab=heroi
 *   ?tab=recursos     → ?tab=heroi&section=recursos
 *   ?tab=habilidades  → ?tab=arsenal&section=habilidades
 *   ?tab=inventario   → ?tab=arsenal
 *   ?tab=notas        → ?tab=diario&section=notas
 *   ?tab=quests       → ?tab=diario&section=quests
 *   ?tab=map          → ?tab=mapa
 */

export type V2Tab = "heroi" | "arsenal" | "diario" | "mapa";

export const LEGACY_TAB_REDIRECTS: Record<
  string,
  { tab: V2Tab; section?: string }
> = {
  ficha: { tab: "heroi" },
  recursos: { tab: "heroi", section: "recursos" },
  habilidades: { tab: "arsenal", section: "habilidades" },
  inventario: { tab: "arsenal" },
  notas: { tab: "diario", section: "notas" },
  quests: { tab: "diario", section: "quests" },
  map: { tab: "mapa" },
};

export type IncomingSearchParams = Record<
  string,
  string | string[] | undefined
>;

/**
 * Resolve the incoming `?tab=` value to a single string (Next.js search
 * params can be arrays when a key repeats).
 */
export function resolveTabParam(
  searchParams: IncomingSearchParams | undefined,
): string | undefined {
  const raw = searchParams?.tab;
  if (Array.isArray(raw)) return raw[0];
  return typeof raw === "string" ? raw : undefined;
}

/**
 * Build the target URL for a redirect. Preserves all incoming query params
 * other than `tab` and `section` so things like `?utm_source=recap` or
 * `?debug=true` survive — the AC explicitly calls out Mestre-shared recap
 * URLs that may carry attribution params.
 */
export function buildRedirectTarget(
  campaignId: string,
  mapping: { tab: V2Tab; section?: string },
  searchParams: IncomingSearchParams | undefined,
): string {
  const params = new URLSearchParams();

  // Preserve incoming params except `tab` (we overwrite) and `section`
  // (we may overwrite below if mapping defines one). For repeated keys
  // we keep only the first value, matching `resolveTabParam`'s behavior.
  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      if (key === "tab" || key === "section") continue;
      if (value === undefined) continue;
      const single = Array.isArray(value) ? value[0] : value;
      if (typeof single === "string") params.set(key, single);
    }
  }

  params.set("tab", mapping.tab);
  if (mapping.section) params.set("section", mapping.section);

  return `/app/campaigns/${campaignId}/sheet?${params.toString()}`;
}
