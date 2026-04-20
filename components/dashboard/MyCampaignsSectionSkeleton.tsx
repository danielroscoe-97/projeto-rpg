/**
 * MyCampaignsSectionSkeleton — Story 02-F full.
 *
 * Shape-identical placeholder for <MyCampaignsSection>. Two ghost cards
 * (mirrors the 1/2-column grid) keep layout stable across the skeleton swap.
 */

export function MyCampaignsSectionSkeleton() {
  return (
    <section
      aria-hidden="true"
      className="mb-8"
      data-testid="my-campaigns-section-skeleton"
    >
      <div className="mb-3 h-4 w-40 animate-pulse rounded bg-white/[0.06]" />

      <ul role="list" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {[0, 1].map((i) => (
          <li key={i}>
            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
              <div className="h-24 w-full animate-pulse bg-white/[0.06]" />
              <div className="space-y-1.5 p-3">
                <div className="h-3 w-32 animate-pulse rounded bg-white/[0.06]" />
                <div className="flex items-center justify-between">
                  <div className="h-3 w-20 animate-pulse rounded bg-white/[0.06]" />
                  <div className="h-3 w-16 animate-pulse rounded bg-white/[0.06]" />
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
