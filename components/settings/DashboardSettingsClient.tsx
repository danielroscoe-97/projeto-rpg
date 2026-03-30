"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { useSubscriptionStore } from "@/lib/stores/subscription-store";
import { UserProfile } from "@/components/settings/UserProfile";
import { SettingsForm } from "@/components/settings/SettingsForm";

interface DashboardSettingsClientProps {
  email: string;
  displayName: string;
  avatarUrl: string | null;
}

export function DashboardSettingsClient({
  email,
  displayName,
  avatarUrl,
}: DashboardSettingsClientProps) {
  const t = useTranslations("profile");
  const { loadSubscription } = useSubscriptionStore();

  useEffect(() => {
    loadSubscription();
  }, [loadSubscription]);

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground mb-1">
          {t("title")}
        </h1>
        <p className="text-muted-foreground text-sm">{t("subtitle")}</p>
      </div>

      <UserProfile
        email={email}
        displayName={displayName}
        avatarUrl={avatarUrl}
      />

      <SettingsForm />
    </div>
  );
}
