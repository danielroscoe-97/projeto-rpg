import Link from "next/link";
import { Home, Swords } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center px-4 text-center">
      <h1 className="text-7xl font-bold text-gold font-[family-name:var(--font-cinzel)] mb-3">
        404
      </h1>

      <p className="text-xl text-gray-200 mb-2 font-medium">
        Page not found
      </p>

      <p className="text-sm text-gray-400 mb-8 max-w-md leading-relaxed">
        The page you are looking for does not exist, has been moved to another
        plane, or was disintegrated by a Beholder.
      </p>

      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 bg-gold text-[#0a0a0f] font-semibold px-6 py-2.5 rounded-lg text-sm hover:shadow-[0_0_20px_rgba(212,168,83,0.3)] hover:-translate-y-[1px] transition-all duration-[250ms] min-h-[44px]"
        >
          <Home className="w-4 h-4" aria-hidden="true" />
          Back to Home
        </Link>
        <Link
          href="/try"
          className="inline-flex items-center justify-center gap-2 bg-white/[0.06] text-gray-300 font-medium px-6 py-2.5 rounded-lg text-sm hover:bg-white/[0.1] transition-all duration-[250ms] border border-white/[0.08] min-h-[44px]"
        >
          <Swords className="w-4 h-4" aria-hidden="true" />
          Try Quick Combat
        </Link>
      </div>

      <p className="mt-12 text-xs text-gray-500">
        Pocket DM
      </p>
    </div>
  );
}
