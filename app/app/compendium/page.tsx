"use client";

import { Suspense, useState } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams, useRouter } from "next/navigation";
import { useSrdStore } from "@/lib/stores/srd-store";
import { MonsterBrowser } from "@/components/compendium/MonsterBrowser";
import { SpellBrowser } from "@/components/compendium/SpellBrowser";
import { ConditionReference } from "@/components/compendium/ConditionReference";

type Tab = "monsters" | "spells" | "conditions";

function CompendiumContent() {
  const t = useTranslations("compendium");
  const searchParams = useSearchParams();
  const router = useRouter();
  const isLoading = useSrdStore((s) => s.is_loading);

  const tabParam = searchParams.get("tab") as Tab | null;
  const [activeTab, setActiveTab] = useState<Tab>(tabParam ?? "monsters");

  function handleTabChange(tab: Tab) {
    setActiveTab(tab);
    router.replace(`/app/compendium?tab=${tab}`, { scroll: false });
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "monsters", label: `🐉 ${t("tab_monsters")}` },
    { key: "spells", label: `✨ ${t("tab_spells")}` },
    { key: "conditions", label: `⚡ ${t("tab_conditions")}` },
  ];

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold text-gold tracking-wide">
          {t("title")}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">{t("subtitle")}</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-1 -mx-1 px-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => handleTabChange(tab.key)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-[250ms] min-h-[44px] whitespace-nowrap ${
              activeTab === tab.key
                ? "bg-gold/20 text-gold border border-gold/30"
                : "text-muted-foreground hover:text-foreground hover:bg-white/[0.06] border border-transparent"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">
          {t("loading")}
        </div>
      ) : (
        <>
          {activeTab === "monsters" && <MonsterBrowser />}
          {activeTab === "spells" && <SpellBrowser />}
          {activeTab === "conditions" && <ConditionReference />}
        </>
      )}
    </div>
  );
}

export default function CompendiumPage() {
  return (
    <Suspense>
      <CompendiumContent />
    </Suspense>
  );
}
