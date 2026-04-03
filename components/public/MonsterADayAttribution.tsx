interface MonsterADayAttributionProps {
  postUrl: string;
  author?: string | null;
  dayId?: string | null;
}

export function MonsterADayAttribution({
  postUrl,
  author,
  dayId,
}: MonsterADayAttributionProps) {
  return (
    <aside className="mb-6 rounded-xl border border-orange-500/20 bg-orange-950/20 px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-4">
      {/* r/ logo mark */}
      <div className="flex-shrink-0">
        <div className="w-12 h-12 rounded-full bg-orange-600 flex items-center justify-center">
          <span className="text-white font-black text-lg leading-none">r/</span>
        </div>
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-orange-300 mb-0.5">
          Community Monster — r/monsteraday
        </p>
        <p className="text-sm text-gray-400">
          This monster was created by the{" "}
          <a
            href="https://www.reddit.com/r/monsteraday"
            target="_blank"
            rel="noopener noreferrer"
            className="text-orange-400 hover:text-orange-300 underline underline-offset-2"
          >
            r/monsteraday
          </a>{" "}
          community and is included here with permission and in partnership with
          the subreddit.
          {author && (
            <>
              {" "}
              Original design by{" "}
              <a
                href={postUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-orange-400 hover:text-orange-300 underline underline-offset-2"
              >
                u/{author}
              </a>
              {dayId && dayId !== "Bonus" && ` (Day ${dayId})`}
              {dayId === "Bonus" && " (Bonus monster)"}
              .
            </>
          )}
        </p>
      </div>

      {/* Link to original post */}
      <a
        href={postUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex-shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-orange-500/30 px-3 py-2 text-xs font-medium text-orange-400 hover:bg-orange-500/10 transition-colors whitespace-nowrap"
      >
        <svg
          className="w-3.5 h-3.5"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path d="M11.983 1.907a.75.75 0 0 0-1.292-.657l-8.5 9.5A.75.75 0 0 0 2.75 12h6.572l-1.305 6.093a.75.75 0 0 0 1.292.657l8.5-9.5A.75.75 0 0 0 17.25 8h-6.572l1.305-6.093Z" />
        </svg>
        View original post
      </a>
    </aside>
  );
}
