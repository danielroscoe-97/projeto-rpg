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
    <div className="min-h-screen flex flex-col bg-[#1a1a2e]">
      <nav className="border-b border-white/10 h-14 flex items-center px-6 shrink-0">
        <div className="flex items-center gap-6 w-full">
          <Link
            href="/app/dashboard"
            className="font-bold text-lg text-white tracking-tight"
          >
            RPG Tracker
          </Link>
          <div className="ml-auto flex items-center gap-4 text-sm text-white/70">
            <Link
              href="/app/dashboard"
              className="hover:text-white transition-colors"
            >
              Dashboard
            </Link>
            <LogoutButton />
          </div>
        </div>
      </nav>
      <SrdInitializer />
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
