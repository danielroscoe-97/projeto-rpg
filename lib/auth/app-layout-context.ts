import { cache } from "react";
import { createClient, getAuthUser } from "@/lib/supabase/server";

export interface AppLayoutContext {
  user: NonNullable<Awaited<ReturnType<typeof getAuthUser>>>;
  supabase: Awaited<ReturnType<typeof createClient>>;
  isBetaTester: boolean;
  hasDmAccess: boolean;
}

/**
 * Shared setup for every `/app/*` layout: auth, beta whitelist, DM access.
 * Returns null when the user is not signed in (caller should redirect).
 *
 * Wrapped in `cache()` so the root layout and nested route-group layouts can
 * both call this within the same request without re-hitting the database.
 *
 * Security invariant: a user that has no row in `public.users` MUST NOT gain
 * DM access implicitly. The default role here is `"player"`, and `hasDmAccess`
 * only turns true when the user actually owns a campaign, has an active DM
 * membership, or has an explicit `dm`/`both` role.
 */
export const getAppLayoutContext = cache(
  async (): Promise<AppLayoutContext | null> => {
    const [user, supabase] = await Promise.all([getAuthUser(), createClient()]);
    if (!user) return null;

    const [whitelistRes, userRowRes, dmMembershipRes, ownedCampaignRes] =
      await Promise.all([
        supabase
          .from("content_whitelist")
          .select("id")
          .eq("user_id", user.id)
          .is("revoked_at", null)
          .maybeSingle(),
        supabase
          .from("users")
          .select("is_admin, role")
          .eq("id", user.id)
          .maybeSingle(),
        supabase
          .from("campaign_members")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("role", "dm")
          .eq("status", "active"),
        supabase
          .from("campaigns")
          .select("id", { count: "exact", head: true })
          .eq("owner_id", user.id),
      ]);

    // Consistent error policy: any query error → treated as unknown → false.
    const isBetaTester =
      (!whitelistRes.error && !!whitelistRes.data) ||
      (!userRowRes.error && !!userRowRes.data?.is_admin);

    const userDbRole = userRowRes.data?.role ?? "player";
    const hasDmAccess =
      (dmMembershipRes.count ?? 0) > 0 ||
      (ownedCampaignRes.count ?? 0) > 0 ||
      userDbRole === "dm" ||
      userDbRole === "both";

    return { user, supabase, isBetaTester, hasDmAccess };
  },
);
