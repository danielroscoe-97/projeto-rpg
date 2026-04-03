import Link from "next/link";

interface PublicNavProps {
  breadcrumbs?: { label: string; href?: string }[];
}

export function PublicNav({ breadcrumbs }: PublicNavProps) {
  return (
    <nav className="border-b border-white/[0.06] bg-gray-950/90 backdrop-blur-sm sticky top-0 z-40">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
        {/* Left: logo + breadcrumbs */}
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/"
            className="text-orange-400 font-semibold font-[family-name:var(--font-cinzel)] whitespace-nowrap"
          >
            Pocket DM
          </Link>
          {breadcrumbs?.map((crumb, i) => (
            <span key={i} className="flex items-center gap-3">
              <span className="text-gray-600">/</span>
              {crumb.href ? (
                <Link
                  href={crumb.href}
                  className="text-gray-400 hover:text-gray-200 text-sm transition-colors"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-gray-200 text-sm truncate max-w-[200px]">
                  {crumb.label}
                </span>
              )}
            </span>
          ))}
        </div>

        {/* Center: nav links (hidden on mobile) */}
        <div className="hidden md:flex items-center gap-6">
          <Link
            href="/monsters"
            className="text-gray-400 hover:text-gray-200 text-sm transition-colors"
          >
            Monsters
          </Link>
          <Link
            href="/spells"
            className="text-gray-400 hover:text-gray-200 text-sm transition-colors"
          >
            Spells
          </Link>
          <Link
            href="/try"
            className="text-gray-400 hover:text-gray-200 text-sm transition-colors"
          >
            Combat Tracker
          </Link>
        </div>

        {/* Right: CTA */}
        <div className="flex items-center gap-3">
          <Link
            href="/try"
            className="hidden sm:inline-flex items-center gap-1.5 rounded-md bg-orange-600/90 px-3 py-1.5 text-white text-sm font-medium hover:bg-orange-500 transition-colors"
          >
            Try Free
          </Link>
          <Link
            href="/auth/sign-up"
            className="inline-flex items-center gap-1.5 rounded-md border border-orange-500/30 px-3 py-1.5 text-orange-400 text-sm font-medium hover:bg-orange-500/10 transition-colors"
          >
            Sign Up
          </Link>
        </div>
      </div>
    </nav>
  );
}
