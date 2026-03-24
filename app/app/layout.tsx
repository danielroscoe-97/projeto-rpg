import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { LogoutButton } from "@/components/logout-button";
import { SrdInitializer } from "@/components/srd/SrdInitializer";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#1a1a2e] text-base">
      {/* Skip navigation — hidden until focused (WCAG 2.4.1) */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-[#e94560] focus:text-white focus:rounded focus:text-sm"
      >
        Skip to main content
      </a>

      <nav
        className="border-b border-white/10 h-14 flex items-center px-6 shrink-0"
        aria-label="Main navigation"
      >
        <div className="flex items-center gap-6 w-full">
          <Link
            href="/app/dashboard"
            className="font-bold text-lg text-white tracking-tight min-h-[44px] inline-flex items-center"
          >
            RPG Tracker
          </Link>
          <div className="ml-auto flex items-center gap-4 text-sm text-white/70">
            <Link
              href="/app/dashboard"
              className="hover:text-white transition-colors min-h-[44px] inline-flex items-center"
            >
              Dashboard
            </Link>
            <Link
              href="/app/settings"
              className="text-white/50 hover:text-white text-sm transition-colors min-h-[44px] inline-flex items-center"
            >
              Settings
            </Link>
            <LogoutButton />
          </div>
        </div>
      </nav>
      <SrdInitializer />
      <main id="main-content" className="flex-1 p-6">{children}</main>
    </div>
  );
}
