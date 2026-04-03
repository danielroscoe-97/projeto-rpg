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
        {/* Inline pipe icon — classic curved pipe with smoke */}
        <svg
          viewBox="0 0 22 20"
          fill="none"
          className="w-[18px] h-[16px] text-muted-foreground/50"
          aria-hidden="true"
        >
          {/* Smoke */}
          <path
            d="M6 5C6 3.5 7 2.5 7 1.5S6.5 0 6.5 0"
            stroke="currentColor"
            strokeWidth="0.8"
            strokeLinecap="round"
            opacity="0.35"
          />
          <path
            d="M8.5 4C8.5 2.5 9.5 1.8 9.5 0.8"
            stroke="currentColor"
            strokeWidth="0.8"
            strokeLinecap="round"
            opacity="0.25"
          />
          {/* Bowl */}
          <path
            d="M3 11C3 8 5 6 8 6s5 2 5 5c0 2-1 3-3 3H6C4 14 3 13 3 11Z"
            stroke="currentColor"
            strokeWidth="1.3"
            fill="currentColor"
            fillOpacity="0.08"
          />
          {/* Stem curve */}
          <path
            d="M12 9C14 8 16 7.5 18 8C20 8.5 21 10 21 11.5"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
          {/* Mouthpiece */}
          <path
            d="M21 11.5L21 13"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      </span>
    </div>
  );
}
