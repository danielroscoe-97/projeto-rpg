export function CombatSkeleton() {
  return (
    <div className="animate-pulse space-y-3" aria-hidden="true">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div className="h-6 w-36 bg-white/[0.06] rounded" />
        <div className="flex gap-2">
          <div className="h-8 w-20 bg-white/[0.06] rounded-lg" />
          <div className="h-8 w-28 bg-white/[0.06] rounded-lg" />
        </div>
      </div>

      {/* Combatant rows */}
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="h-16 bg-white/[0.06] rounded-md flex items-center gap-3 px-3"
        >
          <div className="h-4 w-8 bg-white/[0.04] rounded" />
          <div className="h-4 w-32 bg-white/[0.04] rounded flex-1" />
          <div className="h-2 w-24 bg-white/[0.04] rounded-full" />
          <div className="flex gap-1">
            <div className="h-6 w-10 bg-white/[0.04] rounded" />
            <div className="h-6 w-10 bg-white/[0.04] rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
