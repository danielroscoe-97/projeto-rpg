/**
 * SessionHistoryListSkeleton — Story 02-F full.
 *
 * Shape-identical placeholder for <SessionHistoryList>. Five ghost rows
 * inside the same rounded/divided surface the loaded list uses, so there
 * is no layout shift on the swap.
 */

export function SessionHistoryListSkeleton() {
  return (
    <section
      aria-hidden="true"
      className="mb-8"
      data-testid="session-history-list-skeleton"
    >
      <div className="mb-3 h-4 w-48 animate-pulse rounded bg-white/[0.06]" />
      <ul
        role="list"
        className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card shadow-card"
      >
        {[0, 1, 2, 3, 4].map((i) => (
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
