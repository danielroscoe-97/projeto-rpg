"use client";

interface MonsterADayBadgeProps {
  url?: string | null;
}

export function MonsterADayBadge({ url }: MonsterADayBadgeProps) {
  const badge = (
    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-orange-900/40 text-orange-400 border border-orange-500/30 whitespace-nowrap">
      Monster a Day
    </span>
  );
  if (url) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        title="Ver no Reddit — r/monsteraday"
      >
        {badge}
      </a>
    );
  }
  return badge;
}
