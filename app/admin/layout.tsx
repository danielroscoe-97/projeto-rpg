import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
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
    <div className="min-h-screen flex flex-col">
      <Navbar
        brand="Admin Panel"
        brandHref="/admin"
        links={[
          { href: "/admin", label: "Metrics" },
          { href: "/admin/users", label: "Users" },
          { href: "/admin/content/monsters", label: "Monsters" },
          { href: "/admin/content/spells", label: "Spells" },
          { href: "/app/dashboard", label: "← App" },
        ]}
        rightSlot={<LogoutButton />}
      />
      <main className="flex-1 pt-[72px] p-6">{children}</main>
    </div>
  );
}
