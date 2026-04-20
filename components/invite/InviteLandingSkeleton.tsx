/**
 * InviteLandingSkeleton — shape-identical placeholder for InviteLanding.
 *
 * Shown while `detectInviteState` resolves on the server (Suspense fallback).
 * The dimensions mirror the largest resolved state (auth branch w/ preamble
 * + anon warning + picker trigger) so swapping in the real UI doesn't cause
 * layout shift.
 *
 * Intentionally server-safe (no "use client") — it's rendered from the
 * server page as a Suspense fallback.
 */
export function InviteLandingSkeleton() {
  return (
    <div
      data-testid="invite.landing.skeleton"
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="flex min-h-svh items-center justify-center p-6"
    >
      <div className="w-full max-w-md space-y-4">
        {/* Preamble placeholder (matches "auth-with-invite-pending" preamble) */}
        <div
          aria-hidden="true"
          className="h-12 rounded-md border border-white/[0.06] bg-white/[0.02] animate-pulse"
        />

        {/* Card placeholder (matches the CTA / picker trigger zone) */}
        <div
          aria-hidden="true"
          className="rounded-lg border border-white/[0.08] bg-surface-secondary p-6 space-y-4"
        >
          <div className="h-6 w-2/3 rounded bg-white/[0.04] animate-pulse" />
          <div className="h-4 w-full rounded bg-white/[0.03] animate-pulse" />
          <div className="h-11 w-full rounded bg-white/[0.04] animate-pulse" />
          <div className="h-11 w-full rounded bg-white/[0.04] animate-pulse" />
          <div className="h-11 w-full rounded bg-white/[0.04] animate-pulse" />
        </div>

        <span className="sr-only">Loading invite…</span>
      </div>
    </div>
  );
}
