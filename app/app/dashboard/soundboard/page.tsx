export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { SoundboardPageClient } from "@/components/dashboard/SoundboardPageClient";

export default async function SoundboardPage() {
  const t = await getTranslations("sidebar");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  return <SoundboardPageClient title={t("soundboard")} />;
}
