"use client";

import { useState } from "react";
import Link from "next/link";

interface LoreSection {
  overview: string;
  combat: string[];
  world: string[];
  dmTips: string[];
}

interface PublicCTAProps {
  entityName?: string;
  lore?: LoreSection;
  locale?: "en" | "pt-BR";
}

const LABELS = {
  "en": {
    about: (name: string) => `About ${name}`,
    inCombat: "In Combat",
    inTheWorld: "In the World",
    dmTips: "DM Tips",
    ctaHeadline: (name?: string) =>
      name ? `Ready to roll initiative with ${name}?` : "What is Pocket DM?",
    ctaSub: "Free D&D 5e combat tracker · real-time initiative · no signup",
    ctaBtn: "Start Combat →",
  },
  "pt-BR": {
    about: (name: string) => `Sobre ${name}`,
    inCombat: "Em Combate",
    inTheWorld: "No Mundo",
    dmTips: "Dicas",
    ctaHeadline: (name?: string) =>
      name ? `Pronto pra rolar iniciativa com ${name}?` : "O que é o Pocket DM?",
    ctaSub: "Combat Tracker gratuito · D&D 5e · sem cadastro",
    ctaBtn: "Iniciar Combate →",
  },
} as const;

type TabId = "combat" | "world" | "dmTips";

export function PublicCTA({ entityName, lore, locale = "en" }: PublicCTAProps) {
  const L = LABELS[locale];

  const availableTabs: { id: TabId; label: string; items: string[] }[] = [
    lore?.combat?.length ? { id: "combat", label: L.inCombat, items: lore.combat } : null,
    lore?.world?.length ? { id: "world", label: L.inTheWorld, items: lore.world } : null,
    lore?.dmTips?.length ? { id: "dmTips", label: L.dmTips, items: lore.dmTips } : null,
  ].filter(Boolean) as { id: TabId; label: string; items: string[] }[];

  const [activeTab, setActiveTab] = useState<TabId>(availableTabs[0]?.id ?? "combat");

  const activeItems = availableTabs.find((t) => t.id === activeTab)?.items ?? [];

  return (
    <div className="mt-8 space-y-4">
      {/* Lore card — full-width, tabbed */}
      {lore && entityName && availableTabs.length > 0 && (
        <div className="rounded-xl bg-gray-800/50 border border-white/[0.06] overflow-hidden">
          {/* Header: title + overview */}
          <div className="px-6 pt-6 pb-4">
            <h2 className="text-lg font-bold text-gray-100 font-[family-name:var(--font-cinzel)] mb-2">
              {L.about(entityName)}
            </h2>
            <p className="text-gray-300 text-sm leading-relaxed">{lore.overview}</p>
          </div>

          {/* Tab strip */}
          <div className="flex border-t border-white/[0.06]" role="tablist">
            {availableTabs.map((tab) => (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
                role="tab"
                aria-selected={activeTab === tab.id}
                aria-controls={`tabpanel-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-2.5 text-xs font-semibold tracking-wide transition-colors ${
                  activeTab === tab.id
                    ? "text-gold border-b-2 border-gold bg-gold/[0.06]"
                    : "text-gray-400 hover:text-gray-300 border-b-2 border-transparent"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <ul role="tabpanel" id={`tabpanel-${activeTab}`} aria-labelledby={`tab-${activeTab}`} className="px-6 py-4 space-y-2">
            {activeItems.map((tip, i) => (
              <li key={i} className="text-gray-400 text-sm flex gap-2">
                <span className="text-gold/60 mt-0.5 shrink-0">&#x2022;</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* CTA banner — full-width, horizontal */}
      <div className="rounded-xl bg-gradient-to-r from-gold/[0.08] to-gray-800/40 border border-gold/15 px-6 py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-gray-100 font-semibold text-base leading-snug">
            {L.ctaHeadline(entityName)}
          </p>
          <p className="text-gray-400 text-sm mt-0.5">{L.ctaSub}</p>
        </div>
        <Link
          href="/try"
          className="shrink-0 rounded-lg bg-gold px-5 py-2.5 text-white font-semibold text-sm hover:bg-gold/90 transition-colors whitespace-nowrap"
        >
          {L.ctaBtn}
        </Link>
      </div>
    </div>
  );
}
