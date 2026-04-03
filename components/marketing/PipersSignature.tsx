/** "Feito com ❤️ pelos Pipers" — branded studio signature for footers */
export function PipersSignature() {
  return (
    <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground/50 select-none">
      <span>Feito com</span>
      <span className="text-red-400/70 text-sm animate-pulse">&#10084;</span>
      <span>pelos</span>
      <span className="inline-flex items-center gap-1">
        <span className="font-display text-[13px] tracking-[0.08em] text-muted-foreground/70">
          Pipers
        </span>
        {/* Inline pipe icon */}
        <svg
          viewBox="0 0 20 16"
          fill="none"
          className="w-4 h-3.5 text-muted-foreground/40"
          aria-hidden="true"
        >
          {/* Bowl */}
          <path
            d="M4 3.5C4 1.8 5.5.5 7.5.5S11 1.8 11 3.5V8H4V3.5Z"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
          {/* Rim */}
          <path
            d="M3 8h9"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          {/* Stem */}
          <path
            d="M11 7.5c1 1.5 2.5 2.2 4.5 2.8s3.5.7 4.5.7"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
          {/* Smoke wisps */}
          <path
            d="M6.5.5c0-1 .8-1.8 1.5-1.8M8.5.2c0-.8.6-1.5 1.2-1.5"
            stroke="currentColor"
            strokeWidth="0.6"
            strokeLinecap="round"
            opacity="0.35"
          />
        </svg>
      </span>
    </div>
  );
}
