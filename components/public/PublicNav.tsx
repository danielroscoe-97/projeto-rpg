import Link from "next/link";

interface PublicNavProps {
  breadcrumbs?: { label: string; href?: string }[];
  locale?: "en" | "pt-BR";
}

const LABELS = {
  "en": {
    monsters: "Monsters",
    monstersHref: "/monsters",
    spells: "Spells",
    spellsHref: "/spells",
    combat: "Combat Tracker",
    tryFree: "Try Free",
    signUp: "Sign Up",
  },
  "pt-BR": {
    monsters: "Monstros",
    monstersHref: "/monstros",
    spells: "Magias",
    spellsHref: "/magias",
    combat: "Rastreador de Combate",
    tryFree: "Testar Grátis",
    signUp: "Cadastrar",
  },
} as const;

function CrownD20Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <g transform="translate(2, 1.5) scale(0.055)" stroke="#D4A853" fill="none" strokeLinejoin="round" strokeLinecap="round">
        <polygon points="256,110 379,185 379,335 256,410 133,335 133,185" strokeWidth="22"/>
        <line x1="256" y1="110" x2="176" y2="326" strokeWidth="14" opacity="0.5"/>
        <line x1="256" y1="110" x2="336" y2="326" strokeWidth="14" opacity="0.5"/>
        <line x1="256" y1="410" x2="176" y2="326" strokeWidth="14" opacity="0.5"/>
        <line x1="256" y1="410" x2="336" y2="326" strokeWidth="14" opacity="0.5"/>
      </g>
      <g transform="translate(2, 1.5) scale(0.055)">
        <path
          d="M 130,174 L 110,37 L 195,92 L 256,4 L 317,92 L 402,37 L 382,174 L 256,92 Z"
          fill="#D4A853"
          stroke="#D4A853"
          strokeWidth="4"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}

export function PublicNav({ breadcrumbs, locale = "en" }: PublicNavProps) {
  const l = LABELS[locale];

  return (
    <nav className="border-b border-white/[0.06] bg-gray-950/95 backdrop-blur-sm sticky top-0 z-40 shadow-[0_1px_0_rgba(212,168,83,0.06)]">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
        {/* Left: logo + breadcrumbs */}
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/"
            className="flex items-center gap-2 group shrink-0"
          >
            <CrownD20Logo className="w-6 h-6 transition-opacity group-hover:opacity-80" />
            <span className="text-[#D4A853] font-semibold font-[family-name:var(--font-cinzel)] tracking-wide text-sm whitespace-nowrap">
              Pocket DM
            </span>
          </Link>
          {breadcrumbs?.map((crumb, i) => (
            <span key={i} className="flex items-center gap-3">
              <span className="text-gray-700">/</span>
              {crumb.href ? (
                <Link
                  href={crumb.href}
                  className="text-gray-400 hover:text-gray-200 text-sm transition-colors"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-gray-300 text-sm truncate max-w-[180px]">
                  {crumb.label}
                </span>
              )}
            </span>
          ))}
        </div>

        {/* Center: nav links */}
        <div className="hidden md:flex items-center gap-6">
          <Link
            href={l.monstersHref}
            className="text-gray-400 hover:text-gray-200 text-sm transition-colors"
          >
            {l.monsters}
          </Link>
          <Link
            href={l.spellsHref}
            className="text-gray-400 hover:text-gray-200 text-sm transition-colors"
          >
            {l.spells}
          </Link>
          <Link
            href="/try"
            className="text-gray-400 hover:text-gray-200 text-sm transition-colors"
          >
            {l.combat}
          </Link>
        </div>

        {/* Right: CTA */}
        <div className="flex items-center gap-2.5">
          <Link
            href="/try"
            className="hidden sm:inline-flex items-center gap-1.5 rounded-md bg-[#D4A853] px-3 py-1.5 text-white text-sm font-semibold hover:bg-[#D4A853]/90 transition-colors"
          >
            {l.tryFree}
          </Link>
          <Link
            href="/auth/sign-up"
            className="inline-flex items-center gap-1.5 rounded-md border border-[#D4A853]/30 px-3 py-1.5 text-[#D4A853] text-sm font-semibold hover:bg-[#D4A853]/10 transition-colors"
          >
            {l.signUp}
          </Link>
        </div>
      </div>
    </nav>
  );
}
