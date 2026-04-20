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

  const campaignIds = campaigns.map((c) => c.id);
  const ownerIds = Array.from(new Set(campaigns.map((c) => c.owner_id).filter(Boolean)));

  // 2. DM display names — FK points to auth.users, separate query needed.
  // 3. Session counts + most-recent session per campaign. Fetch both in parallel.
  const [usersRes, sessionsRes] = await Promise.all([
    ownerIds.length > 0
      ? supabase
          .from("users")
          .select("id, display_name, email")
          .in("id", ownerIds)
      : Promise.resolve({ data: [] as { id: string; display_name: string | null; email: string | null }[] }),
    supabase
      .from("sessions")
      .select("id, campaign_id, created_at")
      .in("campaign_id", campaignIds)
      .order("created_at", { ascending: false })
      .limit(500),
  ]);

  const dmMap: Record<string, { name: string | null; email: string }> = {};
  for (const u of usersRes.data ?? []) {
    dmMap[u.id as string] = {
      name: (u.display_name as string | null) ?? null,
      email: (u.email as string | null) ?? "",
    };
  }

  const sessionCountMap: Record<string, number> = {};
  const lastSessionMap: Record<string, string> = {};
  for (const s of sessionsRes.data ?? []) {
    const cid = s.campaign_id as string;
    sessionCountMap[cid] = (sessionCountMap[cid] ?? 0) + 1;
    const createdAt = s.created_at as string | null;
    if (createdAt && !lastSessionMap[cid]) {
      lastSessionMap[cid] = createdAt; // ordered DESC, so the first hit wins
    }
  }

  const cards: MyCampaignCardData[] = campaigns
    .map((c) => ({
      id: c.id,
      name: c.name,
      coverImageUrl: c.cover_image_url,
      dmName: dmMap[c.owner_id]?.name ?? null,
      dmEmail: dmMap[c.owner_id]?.email ?? "",
      sessionCount: sessionCountMap[c.id] ?? 0,
      lastSessionAt: lastSessionMap[c.id] ?? c.updated_at ?? null,
    }))
    .sort((a, b) => {
      // Most recently active campaign first
      const ta = a.lastSessionAt ? new Date(a.lastSessionAt).getTime() : 0;
      const tb = b.lastSessionAt ? new Date(b.lastSessionAt).getTime() : 0;
      return tb - ta;
    });

  return <MyCampaignsSection campaigns={cards} locale={locale} />;
}
