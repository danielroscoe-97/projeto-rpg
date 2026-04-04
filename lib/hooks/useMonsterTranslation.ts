"use client";

import { useState, useEffect } from "react";

type SectionMap = Record<string, string>;

interface MonsterTranslations {
  name?: string;
  special_abilities: SectionMap;
  actions: SectionMap;
  reactions: SectionMap;
  legendary_actions: SectionMap;
  lair_actions?: SectionMap;
  regional_effects?: SectionMap;
}

type TranslationData = Record<string, MonsterTranslations>;

// Global preference: affects every monster page in the compendium
const GLOBAL_KEY = "pocket-dm:monster-lang-global";

let cachedData: TranslationData | null = null;

async function loadTranslations(): Promise<TranslationData> {
  if (cachedData) return cachedData;
  const mod = await import("@/public/srd/monster-descriptions-pt.json");
  cachedData = mod.default as TranslationData;
  return cachedData;
}

function readGlobalPreference(): boolean {
  try {
    return localStorage.getItem(GLOBAL_KEY) === "pt-BR";
  } catch {
    return false;
  }
}

function writeGlobalPreference(ptBR: boolean): void {
  try {
    if (ptBR) localStorage.setItem(GLOBAL_KEY, "pt-BR");
    else localStorage.removeItem(GLOBAL_KEY);
  } catch {
    // ignore
  }
}

export interface UseMonsterTranslationReturn {
  translated: boolean;
  globalPtBR: boolean;
  toggle: () => void;
  setGlobalPtBR: () => void;
  getName: (fallback: string) => string;
  getDesc: (section: "special_abilities" | "actions" | "reactions" | "legendary_actions" | "lair_actions" | "regional_effects", name: string, fallback: string) => string;
}

export function useMonsterTranslation(slug: string, locale?: "en" | "pt-BR"): UseMonsterTranslationReturn {
  // Page locale determines the initial state:
  // - PT pages default to translated (PT-BR)
  // - EN pages default to untranslated (English)
  // The global preference only applies when no locale is given
  const isPtRoute = locale === "pt-BR";
  const [translated, setTranslated] = useState(isPtRoute);
  const [globalPtBR, setGlobalPtBRState] = useState(false);
  const [data, setData] = useState<TranslationData | null>(null);

  // Read global preference on mount — only used on PT pages
  // EN pages ALWAYS start in English regardless of global preference
  useEffect(() => {
    const global = readGlobalPreference();
    setGlobalPtBRState(global);
  }, []);

  // Load JSON lazily when translation is first activated
  useEffect(() => {
    if (translated && !data) {
      loadTranslations().then(setData).catch(() => {
        // silently fall back to english
      });
    }
  }, [translated, data]);

  const monsterData = data?.[slug] ?? null;

  function toggle() {
    setTranslated((prev) => !prev);
  }

  function setGlobalPtBR() {
    writeGlobalPreference(true);
    setGlobalPtBRState(true);
    setTranslated(true);
  }

  function getName(fallback: string): string {
    if (!translated || !monsterData?.name) return fallback;
    return monsterData.name;
  }

  function getDesc(
    section: "special_abilities" | "actions" | "reactions" | "legendary_actions" | "lair_actions" | "regional_effects",
    name: string,
    fallback: string,
  ): string {
    if (!translated || !monsterData) return fallback;
    return monsterData[section]?.[name] ?? fallback;
  }

  return { translated, globalPtBR, toggle, setGlobalPtBR, getName, getDesc };
}
