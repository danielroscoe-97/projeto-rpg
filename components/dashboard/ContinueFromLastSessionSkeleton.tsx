/**
 * ContinueFromLastSessionSkeleton — Story 02-F parte 1.
 *
 * Matches the exact shape of `<ContinueFromLastSession>` so the swap from
 * loading → loaded state does not shift layout. Per Wave 0 AC on skeleton
 * states, every async section on the dashboard needs a shape-identical
 * skeleton.
 *
 * Kept as a tiny server-safe component (no "use client", no framer-motion)
 * so it can be streamed as the first paint while `users.last_session_at`
 * resolves.
 */

export function ContinueFromLastSessionSkeleton() {
  return (
    <section
      aria-hidden="true"
      data-testid="continue-from-last-session-skeleton"
      className="mb-6"
    >
      <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-card sm:p-5">
        {/* Avatar placeholder */}
        <div className="h-14 w-14 flex-shrink-0 animate-pulse rounded-full bg-white/[0.06] sm:h-16 sm:w-16" />

        {/* Copy placeholders */}
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-3 w-24 animate-pulse rounded bg-white/[0.06]" />
          <div className="h-4 w-56 animate-pulse rounded bg-white/[0.06]" />
          <div className="h-3 w-32 animate-pulse rounded bg-white/[0.06]" />
        </div>

        {/* CTA placeholder */}
        <div className="h-7 w-20 flex-shrink-0 animate-pulse rounded-lg bg-white/[0.06]" />
      </div>
    </section>
  );
}
