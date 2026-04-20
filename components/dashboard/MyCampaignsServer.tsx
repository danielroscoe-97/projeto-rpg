/**
 * MyCampaignsServer — Story 02-F full (Epic 02, Area 4, Section 3).
 *
 * Async server component. Queries `campaign_members` where the user is a
 * `player` with `status='active'`, joins the `campaigns` row, resolves the
 * DM display name via a `users` lookup (the FK points at `auth.users` so
 * PostgREST can't chain it in one select), and folds in session counts.
 *
 * RLS: `campaign_members` policies already scope to `user_id = auth.uid()`
 * for the authenticated viewer; `campaigns` exposes the fields players are
 * allowed to see (cover, name). No bypass.
 *
 * WINSTON C5 NOTE — users SELECT scope:
 *   The `users` SELECT is intentionally limited to (id, display_name,
 *   avatar_url). RLS on `users` was broadened by migration 155 to allow any
 *   authenticated user to read another user's row, so that the DM
 *   display_name resolves for players. The APPLICATION LAYER is responsible
 *   for not leaking `email`, `role`, `is_admin`, or other sensitive fields
 *   when reading a foreign user row. Add columns here ONLY if they are safe
 *   to expose to any authenticated user.
 *
 * WINSTON M8 NOTE — session count accuracy:
 *   Per-campaign session count is fetched via a `count: "exact", head: true`
 *   HEAD query per campaign. One round-trip per campaign (typically < 10 for
 *   a player), which is acceptable and exact — the previous `.limit(500)`
 *   would silently truncate for a prolific campaign. The most-recent session
 *   timestamp comes from a second per-campaign lookup (limit 1, DESC order)
 *   piggybacked on the same Promise.all.
 */

import { getLocale } from "next-intl/server";

import { createClient, getAuthUser } from "@/lib/supabase/server";
import {
  MyCampaignsSection,
  type MyCampaignCardData,
} from "@/components/dashboard/MyCampaignsSection";

export async function MyCampaignsServer() {
  const [user, supabase, locale] = await Promise.all([
    getAuthUser(),
    createClient(),
    getLocale(),
  ]);
  if (!user) return null;

  // 1. Memberships (player only) + embedded campaign.
  const { data: memberships } = await supabase
    .from("campaign_members")
    .select(
      `
      campaign_id,
      campaigns!inner ( id, name, cover_image_url, owner_id, updated_at )
    `,
    )
    .eq("user_id", user.id)
    .eq("role", "player")
    .eq("status", "active");

  const rows = memberships ?? [];
  if (rows.length === 0) {
    return <MyCampaignsSection campaigns={[]} locale={locale} />;
  }

  type CampaignEmbed = {
    id: string;
    name: string;
    cover_image_url: string | null;
    owner_id: string;
    updated_at: string | null;
  };

  const campaigns: CampaignEmbed[] = rows.map((r) => {
    const raw = r.campaigns as CampaignEmbed | CampaignEmbed[] | null;
    const c = Array.isArray(raw) ? raw[0] : raw;
    return {
      id: (c?.id as string) ?? (r.campaign_id as string),
      name: (c?.name as string) ?? "",
      cover_image_url: (c?.cover_image_url as string | null) ?? null,
      owner_id: (c?.owner_id as string) ?? "",
      updated_at: (c?.updated_at as string | null) ?? null,
    };
  });

  const ownerIds = Array.from(new Set(campaigns.map((c) => c.owner_id).filter(Boolean)));

  // 2. DM display names — SELECT ONLY public-safe columns (see C5 note above).
  //    No email, no role, no is_admin. `users_select_public_profile` (RLS,
  //    migration 155) allows the row to be visible; this SELECT enforces the
  //    column discipline at the application layer.
  // 3. Session count (exact) + most-recent session per campaign. Parallelized.
  const usersPromise =
    ownerIds.length > 0
      ? supabase
          .from("users")
          .select("id, display_name, avatar_url")
          .in("id", ownerIds)
      : Promise.resolve({
          data: [] as { id: string; display_name: string | null; avatar_url: string | null }[],
        });

  // One HEAD count + one latest-session lookup per campaign. N round-trips
  // where N = campaigns.length (typically < 10 per player), but each is tiny.
  // This replaces the previous `.limit(500)` single-query approach which
  // silently truncated for campaigns with many sessions.
  const perCampaignPromise = Promise.all(
    campaigns.map(async (c) => {
      const [countRes, lastRes] = await Promise.all([
        supabase
          .from("sessions")
          .select("id", { count: "exact", head: true })
          .eq("campaign_id", c.id),
        supabase
          .from("sessions")
          .select("created_at")
          .eq("campaign_id", c.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      return {
        campaignId: c.id,
        count: countRes.count ?? 0,
        lastSessionAt: (lastRes.data?.created_at as string | null) ?? null,
      };
    }),
  );

  const [usersRes, perCampaign] = await Promise.all([
    usersPromise,
    perCampaignPromise,
  ]);

  const dmMap: Record<string, { name: string | null; avatarUrl: string | null }> = {};
  for (const u of usersRes.data ?? []) {
    dmMap[u.id as string] = {
      name: (u.display_name as string | null) ?? null,
      avatarUrl: (u.avatar_url as string | null) ?? null,
    };
  }

  const statsMap: Record<string, { count: number; lastSessionAt: string | null }> = {};
  for (const stat of perCampaign) {
    statsMap[stat.campaignId] = {
      count: stat.count,
      lastSessionAt: stat.lastSessionAt,
    };
  }

  const cards: MyCampaignCardData[] = campaigns
    .map((c) => ({
      id: c.id,
      name: c.name,
      coverImageUrl: c.cover_image_url,
      dmName: dmMap[c.owner_id]?.name ?? null,
      // Email intentionally omitted (C5): never expose foreign user email.
      // UI uses a generic fallback when dmName is null.
      dmEmail: "",
      sessionCount: statsMap[c.id]?.count ?? 0,
      lastSessionAt: statsMap[c.id]?.lastSessionAt ?? c.updated_at ?? null,
    }))
    .sort((a, b) => {
      // Most recently active campaign first
      const ta = a.lastSessionAt ? new Date(a.lastSessionAt).getTime() : 0;
      const tb = b.lastSessionAt ? new Date(b.lastSessionAt).getTime() : 0;
      return tb - ta;
    });

  return <MyCampaignsSection campaigns={cards} locale={locale} />;
}
