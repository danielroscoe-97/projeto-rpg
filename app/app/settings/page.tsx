import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SettingsClient } from "@/components/settings/SettingsClient";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const displayName =
    (user.user_metadata?.display_name as string) ??
    (user.user_metadata?.full_name as string) ??
    "";
  const avatarUrl =
    (user.user_metadata?.avatar_url as string) ?? null;

  return (
    <SettingsClient
      email={user.email ?? ""}
      displayName={displayName}
      avatarUrl={avatarUrl}
    />
  );
}
