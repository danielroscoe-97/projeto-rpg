export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { Suspense } from "react";
import { detectInviteState } from "@/lib/identity/detect-invite-state";
import { InviteLanding } from "@/components/invite/InviteLanding";
import { InviteLandingSkeleton } from "@/components/invite/InviteLandingSkeleton";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

interface InvitePageProps {
  params: Promise<{ token: string }>;
}

/**
 * /invite/[token] — smart landing.
 *
 * Story 02-D: delegates state detection to `detectInviteState` (Story 02-A)
 * and UI rendering to `InviteLanding` (client). The page itself is thin:
 * resolve params, detect state, hand off.
 *
 * Suspense boundary wraps the async resolver so the skeleton renders on
 * slow cold-starts / serverless warmup. Shape is identical to the resolved
 * UI (see `InviteLandingSkeleton`) — zero CLS when the real content arrives.
 */
export default async function InvitePage({ params }: InvitePageProps) {
  const { token } = await params;

  return (
    <Suspense fallback={<InviteLandingSkeleton />}>
      <InviteLandingResolver token={token} />
    </Suspense>
  );
}

async function InviteLandingResolver({ token }: { token: string }) {
  const state = await detectInviteState(token);
  return <InviteLanding state={state} token={token} />;
}
