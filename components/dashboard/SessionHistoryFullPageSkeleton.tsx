/**
 * SessionHistoryFullPageSkeleton — Story 02-G.
 *
 * Shape-identical placeholder for <SessionHistoryFullPage>. Reuses the same
 * header + 10-row rounded/divided container so the Suspense swap does not
 * CLS. Marked aria-hidden because screen readers should not announce the
 * placeholder.
 */

export function SessionHistoryFullPageSkeleton() {
  return (
    <section aria-hidden="true" data-testid="dashboard.sessions.skeleton">
      <div className="mb-6">
        <div className="mb-3 h-3 w-24 animate-pulse rounded bg-white/[0.06]" />
        <div className="h-7 w-64 animate-pulse rounded bg-white/[0.06]" />
      </div>

      <ul
        role="list"
        className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card shadow-card"
      >
        {Array.from({ length: 10 }).map((_, i) => (
          <li key={i}>
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1 space-y-2">
                <div className="h-4 w-48 animate-pulse rounded bg-white/[0.06]" />
                <div className="h-3 w-32 animate-pulse rounded bg-white/[0.06]" />
              </div>
              <div className="h-4 w-4 flex-shrink-0 animate-pulse rounded bg-white/[0.06]" />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
