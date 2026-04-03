export const dynamic = "force-dynamic";

import { getTranslations } from "next-intl/server";
import { WhitelistManager } from "@/components/admin/WhitelistManager";

export default async function AdminWhitelistPage() {
  const t = await getTranslations("admin");
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-foreground">
          {t("whitelist_title")}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {t("whitelist_description")}
        </p>
      </div>
      <WhitelistManager />
    </div>
  );
}
