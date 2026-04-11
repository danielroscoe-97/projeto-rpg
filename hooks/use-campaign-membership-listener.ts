"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { subscribeToCampaignMembers } from "@/lib/realtime/campaign-membership-listener";
import type { MemberJoinEvent } from "@/lib/realtime/campaign-membership-listener";
import type { RealtimeChannel } from "@supabase/supabase-js";

type TranslationFn = ReturnType<typeof useTranslations>;

interface UseCampaignMembershipListenerOptions {
  campaignId: string;
  enabled?: boolean;
  onMemberJoined?: (event: MemberJoinEvent) => void;
}

interface UseCampaignMembershipListenerReturn {
  /** Set of user_ids that joined since this hook mounted (for "new" badge) */
  newMemberIds: Set<string>;
  /** Clear a specific member from the "new" set (when DM views their avatar) */
  clearNewMember: (userId: string) => void;
  /** Clear all "new" badges */
  clearAllNew: () => void;
}

export function useCampaignMembershipListener({
  campaignId,
  enabled = true,
  onMemberJoined,
}: UseCampaignMembershipListenerOptions): UseCampaignMembershipListenerReturn {
  const t = useTranslations("campaignMembership");
  const tRef = useRef<TranslationFn>(t);
  tRef.current = t;
  const channelRef = useRef<RealtimeChannel | null>(null);
  const onMemberJoinedRef = useRef(onMemberJoined);
  onMemberJoinedRef.current = onMemberJoined;

  // Use a plain object + counter to force re-renders when the Set changes,
  // since React cannot detect mutations inside a Set.
  const memberIdsRef = useRef<Set<string>>(new Set());
  const [, setVersion] = useState(0);

  const clearNewMember = useCallback((userId: string) => {
    if (memberIdsRef.current.has(userId)) {
      memberIdsRef.current.delete(userId);
      setVersion((v) => v + 1);
    }
  }, []);

  const clearAllNew = useCallback(() => {
    if (memberIdsRef.current.size > 0) {
      memberIdsRef.current = new Set();
      setVersion((v) => v + 1);
    }
  }, []);

  useEffect(() => {
    if (!enabled || !campaignId) return;

    const channel = subscribeToCampaignMembers(campaignId, (event) => {
      // Track new member for badge display
      memberIdsRef.current = new Set(memberIdsRef.current).add(event.user_id);
      setVersion((v) => v + 1);

      // Show toast notification
      const name = event.display_name || tRef.current("anonymous_player");
      toast.success(tRef.current("player_joined", { name }));

      // Fire external callback if provided
      onMemberJoinedRef.current?.(event);
    });

    channelRef.current = channel;

    return () => {
      channelRef.current?.unsubscribe();
      channelRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- tRef is stable
  }, [campaignId, enabled]);

  return {
    newMemberIds: memberIdsRef.current,
    clearNewMember,
    clearAllNew,
  };
}
