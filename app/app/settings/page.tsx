import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AccountDeletion } from "@/components/settings/AccountDeletion";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-semibold text-foreground mb-2">
        Account Settings
      </h1>
      <p className="text-muted-foreground text-sm mb-8">
        Manage your account preferences and data.
      </p>
      <AccountDeletion />
    </div>
  );
}
