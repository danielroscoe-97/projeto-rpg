"use client";

import { useUserInviteListener } from "@/hooks/useUserInviteListener";

interface CombatInviteListenerMountProps {
  userId: string;
}

/**
 * P2 channel consolidation (2026-04-22) — simplified from pre-P2 version that
 * queried the user's campaign list + opened a `combat-invite-mount:${userId}`
 * postgres_changes watcher + delegated to `useCombatInviteListener` which
 * opened one channel per campaign.
 *
 * Now: single user-scoped channel (`user-invites:${userId}`). Membership is
 * resolved server-side at dispatch time (`campaign_members.status='active'`),
 * so the client no longer needs `campaignIds` nor the membership watcher.
 *
 * Old tabs still running pre-P2 bundle continue to receive invites via the
 * legacy `campaign:{id}:invites` broadcast (also emitted by the dispatch
 * route during the grace period).
 */
export function CombatInviteListenerMount({
  userId,
}: CombatInviteListenerMountProps) {
  useUserInviteListener({ userId });
  return null;
}
