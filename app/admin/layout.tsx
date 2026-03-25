import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
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

  const t = await getTranslations("admin");

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar
        brand={t("panel_title")}
        brandHref="/admin"
        links={[
          { href: "/admin", label: t("nav_metrics") },
          { href: "/admin/users", label: t("nav_users") },
          { href: "/admin/content/monsters", label: t("nav_monsters") },
          { href: "/admin/content/spells", label: t("nav_spells") },
          { href: "/app/dashboard", label: t("nav_back") },
        ]}
        rightSlot={<LogoutButton />}
      />
      <main className="flex-1 pt-[72px] p-6">{children}</main>
    </div>
  );
}
