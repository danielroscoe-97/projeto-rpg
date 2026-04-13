export const dynamic = "force-dynamic";

import { getAuthUser } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { SoundboardPageClient } from "@/components/dashboard/SoundboardPageClient";

export default async function SoundboardPage() {
  const [t, user] = await Promise.all([
    getTranslations("sidebar"),
    getAuthUser(),
  ]);
  if (!user) redirect("/auth/login");

  return <SoundboardPageClient title={t("soundboard")} />;
}
