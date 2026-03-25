import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
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
    <div className="min-h-screen flex flex-col">
      {/* Skip navigation — hidden until focused (WCAG 2.4.1) */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[60] focus:px-4 focus:py-2 focus:bg-gold focus:text-surface-primary focus:rounded-lg focus:text-sm focus:font-semibold"
      >
        Skip to main content
      </a>

      <Navbar
        brand="RPG Tracker"
        brandHref="/app/dashboard"
        links={[
          { href: "/app/dashboard", label: "Dashboard" },
          { href: "/app/settings", label: "Settings" },
        ]}
        rightSlot={<LogoutButton />}
      />
      <SrdInitializer />
      <main id="main-content" className="flex-1 pt-[72px] p-6">
        {children}
      </main>
      <footer className="border-t border-white/[0.08] px-6 py-3 flex items-center gap-4 text-xs text-muted-foreground shrink-0">
        <a href="/legal/attribution" className="hover:text-foreground transition-colors">Attribution</a>
        <a href="/legal/privacy" className="hover:text-foreground transition-colors">Privacy</a>
      </footer>
    </div>
  );
}
