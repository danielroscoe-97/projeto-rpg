export function NotesListSkeleton({ count = 2 }: { count?: number }) {
  return (
    <div className="flex gap-4" aria-hidden="true">
      {/* Folder sidebar skeleton */}
      <div className="w-48 shrink-0 space-y-2">
        <div className="h-3 w-16 bg-white/[0.06] rounded animate-pulse" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-8 bg-white/[0.06] rounded-lg animate-pulse" />
        ))}
      </div>
      {/* Notes list skeleton */}
      <div className="flex-1 min-w-0 space-y-3">
        {Array.from({ length: count }, (_, i) => (
          <div
            key={i}
            className="animate-pulse rounded-xl border border-border bg-card p-4 space-y-2"
          >
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 bg-white/[0.06] rounded" />
              <div className="h-4 w-36 bg-white/[0.06] rounded flex-1" />
              <div className="h-3 w-12 bg-white/[0.06] rounded" />
            </div>
            <div className="h-3 w-2/3 bg-white/[0.06] rounded ml-7" />
          </div>
        ))}
      </div>
    </div>
  );
}
