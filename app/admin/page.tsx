export const dynamic = "force-dynamic";

import { getTranslations } from "next-intl/server";
import { MetricsDashboard } from "@/components/admin/MetricsDashboard";

export default async function AdminPage() {
  const t = await getTranslations("admin");
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-foreground">{t("metrics_title")}</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {t("metrics_description")}
        </p>
      </div>
      <MetricsDashboard />
    </div>
  );
}
