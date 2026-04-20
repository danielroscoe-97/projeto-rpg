import type { SupabaseClient } from "@supabase/supabase-js";
import type { RecentActivityItem, RecentActivityType } from "@/lib/types/campaign-briefing";

/**
 * Fetch the 5 most-recently-updated items across NPCs, locations, factions,
 * notes, and quests for a campaign. Used by the Campaign Briefing's
 * "Atividade recente" timeline (SPEC-campaign-dashboard-briefing §3.3 / §4).
 *
 * Implementation notes:
 * - 5 parallel queries, then merge + sort in JS (cheap, ≤25 rows total).
 * - Falls back to created_at when updated_at is null.
 * - Silently ignores query errors (non-critical; timeline shows empty).
 * - Caller provides the supabase client so this can be batched into an
 *   existing Promise.all without a new connection.
 */
export async function getCampaignRecentActivity(
  // Accept a loosely-typed client to avoid re-importing the generated Database
  // type here — caller always passes the ssr client from lib/supabase/server.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, "public", any>,
  campaignId: string,
  limit = 5,
): Promise<RecentActivityItem[]> {
  const [npcs, locations, factions, notes, quests] = await Promise.all([
    supabase
      .from("campaign_npcs")
      .select("id, name, updated_at, created_at")
      .eq("campaign_id", campaignId)
      .order("updated_at", { ascending: false, nullsFirst: false })
      .limit(limit),
    supabase
      .from("campaign_locations")
      .select("id, name, updated_at, created_at")
      .eq("campaign_id", campaignId)
      .order("updated_at", { ascending: false, nullsFirst: false })
      .limit(limit),
    supabase
      .from("campaign_factions")
      .select("id, name, updated_at, created_at")
      .eq("campaign_id", campaignId)
      .order("updated_at", { ascending: false, nullsFirst: false })
      .limit(limit),
    supabase
      .from("campaign_notes")
      .select("id, title, updated_at, created_at")
      .eq("campaign_id", campaignId)
      .order("updated_at", { ascending: false, nullsFirst: false })
      .limit(limit),
    supabase
      .from("campaign_quests")
      .select("id, title, updated_at, created_at")
      .eq("campaign_id", campaignId)
      .order("updated_at", { ascending: false, nullsFirst: false })
      .limit(limit),
  ]);

  const items: RecentActivityItem[] = [];

  type NamedRow = { id: string; name: string; updated_at: string | null; created_at: string | null };
  type TitledRow = { id: string; title: string; updated_at: string | null; created_at: string | null };

  const pushNamed = (rows: NamedRow[] | null | undefined, type: RecentActivityType) => {
    for (const r of rows ?? []) {
      const ts = r.updated_at ?? r.created_at;
      if (!ts) continue;
      items.push({ id: r.id, type, label: r.name, timestamp: ts });
    }
  };

  const pushTitled = (rows: TitledRow[] | null | undefined, type: RecentActivityType) => {
    for (const r of rows ?? []) {
      const ts = r.updated_at ?? r.created_at;
      if (!ts) continue;
      items.push({ id: r.id, type, label: r.title, timestamp: ts });
    }
  };

  pushNamed(npcs.data as NamedRow[] | null, "npc");
  pushNamed(locations.data as NamedRow[] | null, "location");
  pushNamed(factions.data as NamedRow[] | null, "faction");
  pushTitled(notes.data as TitledRow[] | null, "note");
  pushTitled(quests.data as TitledRow[] | null, "quest");

  items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return items.slice(0, limit);
}
