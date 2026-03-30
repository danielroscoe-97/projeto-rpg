import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DashboardSettingsClient } from "@/components/settings/DashboardSettingsClient";

export default async function DashboardSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const email = user.email ?? "";
  const displayName =
    (user.user_metadata?.display_name as string) ??
    (user.user_metadata?.full_name as string) ??
    "";
  const avatarUrl =
    (user.user_metadata?.avatar_url as string) ?? null;

  return (
    <DashboardSettingsClient
      email={email}
      displayName={displayName}
      avatarUrl={avatarUrl}
    />
  );
}
