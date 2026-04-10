import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

export interface MemberJoinEvent {
  campaign_id: string;
  user_id: string;
  role: string;
  display_name: string | null;
}

/**
 * Subscribe to new member joins for a specific campaign.
 * Returns the RealtimeChannel for cleanup.
 *
 * @param campaignId - The campaign to listen to
 * @param onMemberJoined - Callback fired when a new member joins
 * @returns RealtimeChannel (call .unsubscribe() on unmount)
 */
export function subscribeToCampaignMembers(
  campaignId: string,
  onMemberJoined: (event: MemberJoinEvent) => void,
): RealtimeChannel {
  const supabase = createClient();

  const channel = supabase
    .channel(`campaign-members-${campaignId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "campaign_members",
        filter: `campaign_id=eq.${campaignId}`,
      },
      async (payload) => {
        const newMember = payload.new as {
          campaign_id: string;
          user_id: string;
          role: string;
        };

        // Fetch display_name from users table
        let displayName: string | null = null;
        try {
          const { data } = await supabase
            .from("users")
            .select("display_name")
            .eq("id", newMember.user_id)
            .maybeSingle();
          displayName = data?.display_name ?? null;
        } catch {
          // Best-effort — proceed without name
        }

        onMemberJoined({
          campaign_id: newMember.campaign_id,
          user_id: newMember.user_id,
          role: newMember.role,
          display_name: displayName,
        });
      },
    )
    .subscribe();

  return channel;
}

/**
 * Subscribe to new member joins across multiple campaigns (for Dashboard).
 * Returns the RealtimeChannel for cleanup.
 *
 * Since Supabase Realtime filters only support `eq` (not `in`),
 * we subscribe to ALL campaign_members INSERTs and filter client-side.
 */
export function subscribeToDashboardMembers(
  campaignIds: string[],
  onMemberJoined: (event: MemberJoinEvent) => void,
): RealtimeChannel | null {
  if (campaignIds.length === 0) return null;

  const supabase = createClient();

  const channel = supabase
    .channel("dashboard-members")
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "campaign_members",
      },
      async (payload) => {
        const newMember = payload.new as {
          campaign_id: string;
          user_id: string;
          role: string;
        };

        // Client-side filter: only care about our campaigns
        if (!campaignIds.includes(newMember.campaign_id)) return;

        let displayName: string | null = null;
        try {
          const { data } = await supabase
            .from("users")
            .select("display_name")
            .eq("id", newMember.user_id)
            .maybeSingle();
          displayName = data?.display_name ?? null;
        } catch {
          // Best-effort
        }

        onMemberJoined({
          campaign_id: newMember.campaign_id,
          user_id: newMember.user_id,
          role: newMember.role,
          display_name: displayName,
        });
      },
    )
    .subscribe();

  return channel;
}
