export function CampaignCardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-2" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className="animate-pulse bg-card rounded-lg p-4 flex items-center justify-between"
        >
          <div className="space-y-2 flex-1">
            <div className="h-4 w-40 bg-white/[0.06] rounded" />
            <div className="h-3 w-20 bg-white/[0.06] rounded" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-7 w-24 bg-white/[0.06] rounded-lg" />
            <div className="h-7 w-12 bg-white/[0.06] rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}
