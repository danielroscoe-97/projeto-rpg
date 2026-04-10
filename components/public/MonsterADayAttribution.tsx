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
    <aside className="mb-6 rounded-xl border border-gold/20 bg-orange-950/20 px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-4">
      {/* Reddit Snoo logo */}
      <div className="flex-shrink-0 w-12 h-12">
        <svg viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg" className="w-full h-full" aria-label="Reddit">
          <circle cx="10" cy="10" r="10" fill="#FF4500" />
          <path d="M15.12 9.93c0-.71-.58-1.29-1.29-1.29-.35 0-.66.14-.9.36-1.11-.76-2.55-1.29-4.1-1.29l.77-3.11 2.37.5c.04.5.46.9.97.9.54 0 .97-.43.97-.97s-.43-.97-.97-.97c-.37 0-.69.22-.85.53L9.6 4.1 8.68 7.71c-1.5.04-2.9.57-3.97 1.7-.24-.22-.55-.36-.9-.36-.71 0-1.29.58-1.29 1.29 0 .5.28.93.69 1.15-.04.2-.06.4-.06.61 0 2.38 2.77 4.3 6.19 4.3s6.19-1.93 6.19-4.3c0-.21-.02-.41-.06-.61.41-.22.69-.65.69-1.15z" fill="white" />
          <circle cx="8.18" cy="10.26" r=".77" fill="#FF4500" />
          <circle cx="11.82" cy="10.26" r=".77" fill="#FF4500" />
          <path d="M8.01 12.1c.62.66 1.72 1.1 2.99 1.1 1.27 0 2.37-.44 2.99-1.1.18-.2.16-.5-.04-.67-.19-.17-.48-.15-.66.05-.44.47-1.28.81-2.29.81-1.01 0-1.85-.34-2.29-.81-.18-.2-.47-.22-.66-.05-.2.17-.22.47-.04.67z" fill="#FF4500" />
        </svg>
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
            className="text-gold hover:text-orange-300 underline underline-offset-2"
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
                className="text-gold hover:text-orange-300 underline underline-offset-2"
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
        className="flex-shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-gold/30 px-3 py-2 text-xs font-medium text-gold hover:bg-gold/10 transition-colors whitespace-nowrap"
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
