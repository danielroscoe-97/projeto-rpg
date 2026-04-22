"use server";

/**
 * Template details server action — Epic 04 Story 04-G.
 *
 * Returns a single `campaign_templates` row with its sorted encounters
 * and, for every encounter, monster slugs resolved to human-readable
 * display names via the server-side SRD bundle. The TemplateDetailModal
 * consumes this so the preview can render "Goblin ×4" instead of the
 * raw "goblin" slug.
 *
 * Why server-side resolution:
 *   - `monsters_payload` slugs are validated at write time against
 *     `srd_monster_slugs` (migration 167 trigger D7), but client code
 *     shouldn't re-implement the slug→name lookup — it would need to
 *     load the full SRD monster bundle (~7MB) just to render a label.
 *   - SRD data is available via `lib/srd/srd-data-server.ts`
 *     (`getMonsterBySlug`) which reads from `data/srd/` on the server.
 *     The monster cache is memoized, so repeat resolutions are O(1).
 *
 * Missing-monster handling: a slug that doesn't resolve (SRD list drift,
 * data file missing, future renames) falls back to the slug itself as
 * display name. The TemplateGallery's preview is advisory — the
 * authoritative SRD check is at clone time (RPC's F9 accumulator).
 */

import { createClient } from "@/lib/supabase/server";
import { getMonsterBySlug } from "@/lib/srd/srd-data-server";

export interface TemplateEncounterMonster {
  slug: string;
  quantity: number;
  /** Resolved from SRD; falls back to slug when unresolved. */
  displayName: string;
  /** True when the slug was not found in the current SRD bundle —
   *  surfaces in the UI as a gentle "needs verification" hint. */
  unresolved: boolean;
}

export interface TemplateEncounterDetail {
  id: string;
  name: string;
  description: string | null;
  sortOrder: number;
  narrativePrompt: string | null;
  monsters: TemplateEncounterMonster[];
}

export interface TemplateDetails {
  id: string;
  name: string;
  description: string | null;
  gameSystem: string;
  targetPartyLevel: number;
  encounters: TemplateEncounterDetail[];
}

/** Returns null when the template is missing or not public. */
export async function getTemplateDetails(
  templateId: string,
): Promise<TemplateDetails | null> {
  if (!templateId || typeof templateId !== "string") return null;

  const supabase = await createClient();

  const { data: template, error: tErr } = await supabase
    .from("campaign_templates")
    .select("id, name, description, game_system, target_party_level")
    .eq("id", templateId)
    .eq("is_public", true)
    .maybeSingle();
  if (tErr || !template) return null;

  const { data: encounterRows, error: eErr } = await supabase
    .from("campaign_template_encounters")
    .select("id, name, description, sort_order, narrative_prompt, monsters_payload")
    .eq("template_id", templateId)
    // Adversarial-review fix: explicit tiebreaker on id. Two encounters
    // sharing the same sort_order would otherwise render in
    // non-deterministic order (Postgres returns rows in undefined order
    // absent a stable secondary key). UUID comparison is deterministic.
    .order("sort_order", { ascending: true })
    .order("id", { ascending: true });
  if (eErr) return null;

  const encounters: TemplateEncounterDetail[] = (encounterRows ?? []).map(
    (row) => {
      const payload = (row.monsters_payload ?? []) as Array<{
        slug?: string;
        quantity?: number;
      }>;

      // Adversarial-review fix: merge duplicate slugs. A template where
      // monsters_payload has two entries for the same slug (e.g. split
      // rows during authoring: [{slug:"goblin", qty:2}, {slug:"goblin",
      // qty:1}]) would otherwise render as two pills "Goblin ×2" +
      // "Goblin ×1" — confusing. Sum quantities into a single entry.
      const merged = new Map<string, { slug: string; quantity: number }>();
      for (const m of payload) {
        if (typeof m?.slug !== "string" || m.slug.length === 0) continue;
        const qty =
          Number.isInteger(m.quantity) && (m.quantity as number) > 0
            ? (m.quantity as number)
            : 1;
        const existing = merged.get(m.slug);
        if (existing) {
          existing.quantity += qty;
        } else {
          merged.set(m.slug, { slug: m.slug, quantity: qty });
        }
      }

      // Adversarial-review fix: wrap SRD lookup in try/catch. If the SRD
      // data bundle failed to deploy (missing file) or `srd-data-server`
      // throws on init, the uncaught promise rejection would crash the
      // whole server action and produce an unhelpful 500 for the modal.
      // Treat any lookup failure as "unresolved for this slug" — the
      // authoritative check is still the clone RPC's F9 accumulator.
      const monsters: TemplateEncounterMonster[] = [];
      for (const m of merged.values()) {
        let displayName = m.slug;
        let unresolved = true;
        try {
          const srd = getMonsterBySlug(m.slug);
          if (srd) {
            displayName = srd.name;
            unresolved = false;
          }
        } catch {
          /* keep fallback: slug + unresolved=true */
        }
        monsters.push({
          slug: m.slug,
          quantity: m.quantity,
          displayName,
          unresolved,
        });
      }

      return {
        id: row.id as string,
        name: row.name as string,
        description: (row.description as string | null) ?? null,
        sortOrder: (row.sort_order as number) ?? 0,
        narrativePrompt: (row.narrative_prompt as string | null) ?? null,
        monsters,
      };
    },
  );

  return {
    id: template.id as string,
    name: template.name as string,
    description: (template.description as string | null) ?? null,
    gameSystem: (template.game_system as string) ?? "5e",
    targetPartyLevel: (template.target_party_level as number) ?? 1,
    encounters,
  };
}
