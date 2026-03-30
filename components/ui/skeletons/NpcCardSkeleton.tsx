export function NpcCardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className="animate-pulse bg-card border border-border rounded-lg p-4 space-y-3"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/[0.06]" />
            <div className="flex-1 space-y-1.5">
              <div className="h-4 w-28 bg-white/[0.06] rounded" />
              <div className="h-3 w-16 bg-white/[0.06] rounded" />
            </div>
          </div>
          <div className="h-3 w-full bg-white/[0.06] rounded" />
          <div className="h-3 w-2/3 bg-white/[0.06] rounded" />
        </div>
      ))}
    </div>
  );
}
