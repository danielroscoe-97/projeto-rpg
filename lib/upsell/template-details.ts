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
    .order("sort_order", { ascending: true });
  if (eErr) return null;

  const encounters: TemplateEncounterDetail[] = (encounterRows ?? []).map(
    (row) => {
      const payload = (row.monsters_payload ?? []) as Array<{
        slug?: string;
        quantity?: number;
      }>;
      const monsters: TemplateEncounterMonster[] = payload
        .filter(
          (m): m is { slug: string; quantity?: number } =>
            typeof m?.slug === "string" && m.slug.length > 0,
        )
        .map((m) => {
          const srd = getMonsterBySlug(m.slug);
          return {
            slug: m.slug,
            quantity: Number.isInteger(m.quantity) && m.quantity! > 0 ? m.quantity! : 1,
            displayName: srd?.name ?? m.slug,
            unresolved: !srd,
          };
        });
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
