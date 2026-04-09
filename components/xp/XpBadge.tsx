"use client";

interface XpBadgeProps {
  icon: string;
  title: string;
  rank?: number;
}

/**
 * Compact badge showing rank icon + title.
 * Used in headers, profile cards, combat room.
 */
export function XpBadge({ icon, title }: XpBadgeProps) {
  return (
    <div className="inline-flex items-center gap-1.5 rounded-full bg-gold/10 border border-gold/20 px-3 py-1">
      <span className="text-base leading-none">{icon}</span>
      <span className="text-sm font-medium text-gold">{title}</span>
    </div>
  );
}
