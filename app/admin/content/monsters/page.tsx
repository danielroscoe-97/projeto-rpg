export const dynamic = "force-dynamic";

import { getTranslations } from "next-intl/server";
import { ContentEditor } from "@/components/admin/ContentEditor";

export default async function AdminMonstersPage() {
  const t = await getTranslations("admin");
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-foreground">{t("monsters_title")}</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {t("monsters_description")}
        </p>
      </div>
      <ContentEditor entityType="monsters" />
    </div>
  );
}
