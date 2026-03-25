export const dynamic = "force-dynamic";

import { getTranslations } from "next-intl/server";
import { UserManager } from "@/components/admin/UserManager";

export default async function AdminUsersPage() {
  const t = await getTranslations("admin");
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-foreground">{t("users_title")}</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {t("users_description")}
        </p>
      </div>
      <UserManager />
    </div>
  );
}
