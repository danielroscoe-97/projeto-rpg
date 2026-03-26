export function CompendiumSkeleton() {
  return (
    <div className="animate-pulse space-y-4" aria-hidden="true">
      {/* Tab bar */}
      <div className="flex gap-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-10 w-24 bg-white/[0.06] rounded-lg" />
        ))}
      </div>

      {/* Search input */}
      <div className="h-9 bg-white/[0.06] rounded-lg" />

      {/* List items */}
      {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <div
          key={i}
          className="h-12 bg-white/[0.06] rounded-md flex items-center gap-3 px-3"
        >
          <div className="h-8 w-8 bg-white/[0.04] rounded-full flex-shrink-0" />
          <div className="space-y-1.5 flex-1">
            <div className="h-3.5 w-40 bg-white/[0.04] rounded" />
            <div className="h-2.5 w-24 bg-white/[0.04] rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
