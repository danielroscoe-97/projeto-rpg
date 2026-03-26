export function DashboardSkeleton() {
  return (
    <div className="animate-pulse space-y-6" aria-hidden="true">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-2">
          <div className="h-7 w-40 bg-white/[0.06] rounded-lg" />
          <div className="h-4 w-64 bg-white/[0.06] rounded" />
        </div>
        <div className="h-9 w-60 bg-white/[0.06] rounded-lg" />
      </div>

      {/* Saved encounters area */}
      <div className="h-16 bg-white/[0.06] rounded-lg" />

      {/* Campaign cards */}
      <div className="space-y-3">
        <div className="h-5 w-32 bg-white/[0.06] rounded" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-white/[0.06] rounded-lg" />
        ))}
      </div>
    </div>
  );
}
