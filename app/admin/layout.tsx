import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { LogoutButton } from "@/components/logout-button";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  // Check is_admin flag
  const { data: userRow } = await supabase
    .from("users")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!userRow?.is_admin) redirect("/app/dashboard");

  return (
    <div className="min-h-screen flex flex-col bg-[#1a1a2e] text-base">
      <nav
        className="border-b border-white/10 h-14 flex items-center px-6 shrink-0"
        aria-label="Admin navigation"
      >
        <div className="flex items-center gap-6 w-full">
          <Link
            href="/admin"
            className="font-bold text-lg text-white tracking-tight min-h-[44px] inline-flex items-center"
          >
            Admin Panel
          </Link>
          <div className="ml-auto flex items-center gap-4 text-sm text-white/70">
            <Link
              href="/admin"
              className="hover:text-white transition-colors min-h-[44px] inline-flex items-center"
            >
              Metrics
            </Link>
            <Link
              href="/admin/users"
              className="hover:text-white transition-colors min-h-[44px] inline-flex items-center"
            >
              Users
            </Link>
            <Link
              href="/admin/content/monsters"
              className="hover:text-white transition-colors min-h-[44px] inline-flex items-center"
            >
              Monsters
            </Link>
            <Link
              href="/admin/content/spells"
              className="hover:text-white transition-colors min-h-[44px] inline-flex items-center"
            >
              Spells
            </Link>
            <Link
              href="/app/dashboard"
              className="text-white/50 hover:text-white transition-colors min-h-[44px] inline-flex items-center"
            >
              ← App
            </Link>
            <LogoutButton />
          </div>
        </div>
      </nav>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
