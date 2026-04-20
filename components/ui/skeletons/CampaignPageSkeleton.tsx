/**
 * Skeleton shown while a campaign page's data is streaming in (B04 perf fix).
 * Matches the overall shape of CampaignHero + grid/stats so there's no layout shift.
 */
export function CampaignPageSkeleton() {
  return (
    <div className="animate-pulse space-y-8" aria-hidden="true" data-testid="campaign-page-skeleton">
      {/* Hero block */}
      <div className="space-y-4 rounded-xl border border-white/[0.04] bg-card p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            <div className="h-7 w-56 bg-white/[0.06] rounded-lg" />
            <div className="h-4 w-80 bg-white/[0.06] rounded" />
          </div>
          <div className="h-9 w-40 bg-white/[0.06] rounded-lg" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 bg-white/[0.04] rounded-lg" />
          ))}
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-12 bg-white/[0.04] rounded-lg" />
        ))}
      </div>

      {/* Grid of sections */}
      <div className="space-y-6">
        <div className="h-5 w-32 bg-white/[0.06] rounded" />
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-24 bg-white/[0.04] rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}

/** Simpler skeleton for the player's campaign view. */
export function PlayerCampaignSkeleton() {
  return (
    <div className="animate-pulse space-y-6 p-4" aria-hidden="true">
      <div className="space-y-2">
        <div className="h-6 w-40 bg-white/[0.06] rounded" />
        <div className="h-4 w-56 bg-white/[0.06] rounded" />
      </div>
      <div className="h-32 bg-white/[0.04] rounded-lg" />
      <div className="grid grid-cols-2 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-20 bg-white/[0.04] rounded-lg" />
        ))}
      </div>
    </div>
  );
}
