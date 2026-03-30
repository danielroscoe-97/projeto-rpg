"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { LanguageSwitcher } from "@/components/settings/LanguageSwitcher";
import { AccountDeletion } from "@/components/settings/AccountDeletion";
import { SpellSearch } from "@/components/oracle/SpellSearch";
import { MonsterSearch } from "@/components/oracle/MonsterSearch";
import { ConditionLookup } from "@/components/oracle/ConditionLookup";
import dynamic from "next/dynamic";

const SubscriptionPanel = dynamic(() => import("@/components/billing/SubscriptionPanel").then(m => m.SubscriptionPanel), {
  ssr: false,
  loading: () => <div className="animate-pulse h-32 bg-surface-secondary rounded-lg" />,
});
import { ImportManagement } from "@/components/import/ImportManagement";
import { RoleSelector } from "@/components/settings/RoleSelector";

type Tab = "preferences" | "wiki" | "billing" | "account";
type WikiTab = "spells" | "monsters" | "conditions";

export function SettingsClient({ email }: { email: string }) {
  const t = useTranslations("settings");

  // Support ?tab=billing query param for deep linking from billing CTAs
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get("tab");
      if (tab === "billing") return "billing";
    }
    return "preferences";
  });
  const [wikiTab, setWikiTab] = useState<WikiTab>("spells");

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: "preferences", label: t("tab_preferences"), icon: "⚙" },
    { id: "wiki", label: t("tab_wiki"), icon: "📖" },
    { id: "billing", label: t("tab_billing"), icon: "💳" },
    { id: "account", label: t("tab_account"), icon: "👤" },
  ];

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground mb-1">
          {t("title")}
        </h1>
        <p className="text-muted-foreground text-sm">{t("description")}</p>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 mb-6 border-b border-white/[0.08] pb-px">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-sm font-medium rounded-t-md transition-all duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)] min-h-[44px] ${
              activeTab === tab.id
                ? "text-gold border-b-2 border-gold bg-white/[0.04]"
                : "text-muted-foreground hover:text-foreground hover:bg-white/[0.03]"
            }`}
          >
            <span className="mr-1.5" aria-hidden="true">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "preferences" && <PreferencesTab email={email} />}
      {activeTab === "wiki" && (
        <WikiReferenceTab wikiTab={wikiTab} setWikiTab={setWikiTab} />
      )}
      {activeTab === "billing" && <SubscriptionPanel />}
      {activeTab === "account" && <AccountTab />}
    </div>
  );
}

function PreferencesTab({ email }: { email: string }) {
  const t = useTranslations("settings");

  return (
    <div className="space-y-6 animate-[fade-in_0.3s_ease-out]">
      {/* Profile info */}
      <section className="bg-card rounded-lg border border-border p-5">
        <h2 className="text-foreground font-semibold mb-1">{t("profile_title")}</h2>
        <p className="text-muted-foreground text-sm mb-4">{t("profile_description")}</p>
        <div className="grid gap-3">
          <div>
            <span className="text-muted-foreground text-xs uppercase tracking-wider">{t("profile_email")}</span>
            <p className="text-foreground text-sm mt-0.5">{email}</p>
          </div>
        </div>
      </section>

      {/* Role */}
      <section className="bg-card rounded-lg border border-border p-5">
        <RoleSelector />
      </section>

      {/* Language */}
      <section className="bg-card rounded-lg border border-border p-5">
        <LanguageSwitcher />
      </section>

      {/* External content management */}
      <ImportManagement />
    </div>
  );
}

function WikiReferenceTab({
  wikiTab,
  setWikiTab,
}: {
  wikiTab: WikiTab;
  setWikiTab: (tab: WikiTab) => void;
}) {
  const t = useTranslations("settings");

  const subtabs: { id: WikiTab; label: string }[] = [
    { id: "spells", label: t("wiki_spells") },
    { id: "monsters", label: t("wiki_monsters") },
    { id: "conditions", label: t("wiki_conditions") },
  ];

  return (
    <div className="space-y-4 animate-[fade-in_0.3s_ease-out]">
      <div>
        <h2 className="text-foreground font-semibold mb-1">{t("wiki_title")}</h2>
        <p className="text-muted-foreground text-sm">{t("wiki_description")}</p>
      </div>

      {/* Wiki subtabs */}
      <div className="flex gap-2">
        {subtabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setWikiTab(tab.id)}
            className={`px-3 py-1.5 text-sm rounded-md transition-all duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)] min-h-[36px] ${
              wikiTab === tab.id
                ? "bg-gold/15 text-gold border border-gold/30"
                : "text-muted-foreground border border-border hover:text-foreground hover:border-white/20"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Wiki content */}
      <div className="bg-card rounded-lg border border-border p-5">
        {wikiTab === "spells" && <SpellSearch />}
        {wikiTab === "monsters" && <MonsterSearch />}
        {wikiTab === "conditions" && <ConditionLookup />}
      </div>
    </div>
  );
}

function AccountTab() {
  const t = useTranslations("settings");

  return (
    <div className="space-y-6 animate-[fade-in_0.3s_ease-out]">
      {/* Password */}
      <section className="bg-card rounded-lg border border-border p-5">
        <h2 className="text-foreground font-semibold mb-1">{t("security_title")}</h2>
        <p className="text-muted-foreground text-sm mb-4">{t("security_description")}</p>
        <a
          href="/auth/forgot-password"
          className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md border border-border text-foreground hover:bg-white/[0.06] transition-all duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)] min-h-[44px]"
        >
          {t("change_password")}
        </a>
      </section>

      {/* Danger zone — collapsed by default */}
      <AccountDeletion />
    </div>
  );
}
