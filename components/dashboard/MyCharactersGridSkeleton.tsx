/**
 * MyCharactersGridSkeleton — Story 02-F full.
 *
 * Shape-identical placeholder for <MyCharactersGrid>. Renders three ghost
 * cards on mobile/tablet/desktop to match the 1/2/3-column grid and keeps
 * the `mb-8` section spacing to prevent layout shift when data arrives.
 */

export function MyCharactersGridSkeleton() {
  return (
    <section
      aria-hidden="true"
      className="mb-8"
      data-testid="my-characters-grid-skeleton"
    >
      <div className="mb-3 h-4 w-40 animate-pulse rounded bg-white/[0.06]" />

      <ul
        role="list"
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
      >
        {[0, 1, 2].map((i) => (
          <li key={i}>
            <div className="rounded-xl border border-border bg-card p-4 shadow-card">
              <div className="flex items-start gap-3">
                <div className="h-14 w-14 flex-shrink-0 animate-pulse rounded-full bg-white/[0.06]" />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="h-4 w-32 animate-pulse rounded bg-white/[0.06]" />
                  <div className="h-3 w-24 animate-pulse rounded bg-white/[0.06]" />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-3">
                <div className="h-3 flex-1 animate-pulse rounded bg-white/[0.06]" />
                <div className="h-5 w-10 animate-pulse rounded-full bg-white/[0.06]" />
              </div>
              <div className="mt-2 h-3 w-28 animate-pulse rounded bg-white/[0.06]" />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
