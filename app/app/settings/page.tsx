import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AccountDeletion } from "@/components/settings/AccountDeletion";
import { LanguageSwitcher } from "@/components/settings/LanguageSwitcher";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const t = await getTranslations("settings");

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-semibold text-foreground mb-2">
        {t("title")}
      </h1>
      <p className="text-muted-foreground text-sm mb-8">
        {t("description")}
      </p>
      <LanguageSwitcher />
      <AccountDeletion />
    </div>
  );
}
