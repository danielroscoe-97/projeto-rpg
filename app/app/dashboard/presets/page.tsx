export const dynamic = "force-dynamic";

import { createClient, getAuthUser } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { PresetsManager } from "@/components/presets/PresetsManager";

export default async function PresetsPage() {
  const [t, user, supabase] = await Promise.all([
    getTranslations("presets"),
    getAuthUser(),
    createClient(),
  ]);
  if (!user) redirect("/auth/login");

  const { data: rawPresets } = await supabase
    .from("monster_presets")
    .select("id, name, monsters, ruleset_version, created_at, updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  const presets = rawPresets ?? [];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-foreground">{t("title")}</h1>
        <p className="text-muted-foreground mt-1 text-sm">{t("description")}</p>
      </div>
      <PresetsManager initialPresets={presets} userId={user.id} />
    </div>
  );
}
