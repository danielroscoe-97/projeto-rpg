import Link from "next/link";
import { Footer } from "@/components/marketing/Footer";

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-[#1a1a2e]">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-[#e94560] focus:text-white focus:rounded focus:text-sm"
      >
        Skip to main content
      </a>
      <nav
        className="border-b border-white/10 h-14 flex items-center px-6 shrink-0"
        aria-label="Site navigation"
      >
        <Link
          href="/"
          className="font-bold text-lg text-white tracking-tight min-h-[44px] inline-flex items-center"
        >
          RPG Tracker
        </Link>
        <div className="ml-auto flex gap-4 text-sm">
          <Link
            href="/auth/login"
            className="text-white/70 hover:text-white transition-colors min-h-[44px] inline-flex items-center"
          >
            Login
          </Link>
          <Link
            href="/auth/sign-up"
            className="text-white bg-[#e94560] hover:bg-[#e94560]/90 px-4 rounded-md min-h-[44px] inline-flex items-center"
          >
            Sign Up
          </Link>
        </div>
      </nav>
      <main id="main-content" className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
