"use server";

/**
 * Server-side helper to fetch public campaign templates for the
 * BecomeDmWizard (Epic 04 Story 04-F).
 *
 * Consumed by:
 *   - `app/app/become-dm/page.tsx` — fetches on page load, passes the
 *     array as a prop to the client-side wizard so the template picker
 *     doesn't require a client-side fetch + spinner.
 *   - Later, `components/upsell/TemplateGallery.tsx` (Story 04-G) will
 *     consume the same helper for the full gallery page.
 *
 * Returns only fields needed by the picker. Encounter details + full
 * monsters_payload are fetched on-demand by TemplateDetailModal (04-G),
 * not here — keeps this round trip tight.
 */

import { createClient } from "@/lib/supabase/server";

export interface CampaignTemplateSummary {
  id: string;
  name: string;
  description: string | null;
  game_system: string;
  target_party_level: number;
  encounter_count: number;
}

export async function listPublicTemplates(): Promise<CampaignTemplateSummary[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("campaign_templates")
    .select(
      "id, name, description, game_system, target_party_level, campaign_template_encounters(count)",
    )
    .eq("is_public", true)
    .order("name", { ascending: true });

  if (error || !data) return [];

  return data.map((row) => {
    const countRows = row.campaign_template_encounters as
      | { count: number }[]
      | undefined;
    return {
      id: row.id as string,
      name: row.name as string,
      description: (row.description as string | null) ?? null,
      game_system: (row.game_system as string) ?? "5e",
      target_party_level: (row.target_party_level as number) ?? 1,
      encounter_count: countRows?.[0]?.count ?? 0,
    };
  });
}
