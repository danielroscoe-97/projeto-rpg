"use client";

interface NewBadgeProps {
  show: boolean;
}

export function NewBadge({ show }: NewBadgeProps) {
  if (!show) return null;

  return (
    <span className="absolute -top-2 -right-2 z-10 new-badge-enter px-1.5 py-0.5 rounded-full bg-amber-500 text-[9px] font-bold text-black shadow-lg shadow-amber-500/30">
      NEW
    </span>
  );
}
