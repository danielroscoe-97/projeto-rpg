import { Suspense } from "react";
import { AuthCallbackContinueClient } from "./AuthCallbackContinueClient";

export const dynamic = "force-dynamic";

/**
 * Client-side continuation of the OAuth callback. Reads
 * `identity-upgrade-context-v1` from localStorage (persisted by `AuthModal`
 * before the OAuth redirect) and — when present — runs the upgrade saga.
 *
 * Rendered via `/auth/callback → redirect → here` so the server route keeps
 * its Supabase code exchange responsibility while localStorage inspection
 * stays on the client.
 */
export default function AuthCallbackContinuePage() {
  return (
    <Suspense fallback={null}>
      <AuthCallbackContinueClient />
    </Suspense>
  );
}
