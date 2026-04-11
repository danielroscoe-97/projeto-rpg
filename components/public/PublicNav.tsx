import Link from "next/link";
import { PublicNavAuthSlot } from "./PublicNavAuthSlot";
import { PublicNavClient } from "./PublicNavClient";
import { PublicDesktopNav } from "./PublicDesktopNav";

interface PublicNavProps {
  breadcrumbs?: { label: string; href?: string }[];
  locale?: "en" | "pt-BR";
}


function CrownD20Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <g transform="translate(2, 1.5) scale(0.055)" stroke="currentColor" fill="none" strokeLinejoin="round" strokeLinecap="round">
        <polygon points="256,110 379,185 379,335 256,410 133,335 133,185" strokeWidth="22"/>
        <line x1="256" y1="110" x2="176" y2="326" strokeWidth="14" opacity="0.5"/>
        <line x1="256" y1="110" x2="336" y2="326" strokeWidth="14" opacity="0.5"/>
        <line x1="256" y1="410" x2="176" y2="326" strokeWidth="14" opacity="0.5"/>
        <line x1="256" y1="410" x2="336" y2="326" strokeWidth="14" opacity="0.5"/>
      </g>
      <g transform="translate(2, 1.5) scale(0.055)">
        <path
          d="M 130,174 L 110,37 L 195,92 L 256,4 L 317,92 L 402,37 L 382,174 L 256,92 Z"
          fill="currentColor"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}

export function PublicNav({ breadcrumbs, locale = "en" }: PublicNavProps) {
  return (
    <nav className="border-b border-white/[0.06] bg-gray-950/95 backdrop-blur-sm sticky top-0 z-40 shadow-[0_1px_0_rgba(212,168,83,0.06)]">
      <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between gap-2 lg:gap-3">
        {/* Left: logo + breadcrumbs */}
        <div className="flex items-center gap-2.5 min-w-0 overflow-hidden">
          <Link
            href="/"
            className="flex items-center gap-2 group shrink-0"
          >
            <CrownD20Logo className="w-6 h-6 text-gold transition-opacity group-hover:opacity-80" />
            <span className="hidden sm:inline text-gold font-semibold font-[family-name:var(--font-cinzel)] tracking-wide text-sm whitespace-nowrap">
              Pocket DM
            </span>
          </Link>
          {breadcrumbs?.map((crumb, i) => (
            <span key={i} className="hidden sm:flex items-center gap-3 min-w-0">
              <span className="text-gray-700 shrink-0">/</span>
              {crumb.href ? (
                <Link
                  href={crumb.href}
                  className="text-gray-400 hover:text-gray-200 text-sm transition-colors truncate max-w-[150px]"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-gray-300 text-sm truncate max-w-[200px]">
                  {crumb.label}
                </span>
              )}
            </span>
          ))}
        </div>

        {/* Center: grouped dropdown nav */}
        <PublicDesktopNav locale={locale} />

        {/* Right: search + auth + hamburger */}
        <div className="flex items-center gap-1 shrink-0">
          <PublicNavClient locale={locale} />
          <div className="hidden sm:block">
            <PublicNavAuthSlot locale={locale} />
          </div>
        </div>
      </div>
    </nav>
  );
}
