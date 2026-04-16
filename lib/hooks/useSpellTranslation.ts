"use client";

import { useState, useEffect } from "react";

interface SpellTranslations {
  name_pt?: string;
  description?: string;
  higher_levels?: string | null;
}

type SpellTranslationData = Record<string, SpellTranslations>;

// Global preference: affects every spell page in the compendium
const GLOBAL_KEY = "pocket-dm:spell-lang-global";

let cachedData: SpellTranslationData | null = null;

async function loadTranslations(): Promise<SpellTranslationData> {
  if (cachedData) return cachedData;
  const mod = await import("@/data/srd/spell-descriptions-pt.json");
  cachedData = mod.default as SpellTranslationData;
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

export interface UseSpellTranslationReturn {
  translated: boolean;
  globalPtBR: boolean;
  toggle: () => void;
  setGlobalPtBR: () => void;
  getName: (fallback: string) => string;
  getDescription: (fallback: string) => string;
  getHigherLevels: (fallback: string | null) => string | null;
}

export function useSpellTranslation(spellId: string, locale?: "en" | "pt-BR"): UseSpellTranslationReturn {
  // Page locale determines the initial state:
  // - PT pages default to translated (PT-BR)
  // - EN pages default to untranslated (English)
  // The global preference only applies when no locale is given
  const isPtRoute = locale === "pt-BR";
  const [translated, setTranslated] = useState(isPtRoute);
  const [globalPtBR, setGlobalPtBRState] = useState(false);
  const [data, setData] = useState<SpellTranslationData | null>(null);

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

  const spellData = data?.[spellId] ?? null;

  function toggle() {
    setTranslated((prev) => !prev);
  }

  function setGlobalPtBR() {
    writeGlobalPreference(true);
    setGlobalPtBRState(true);
    setTranslated(true);
  }

  function getName(fallback: string): string {
    if (!translated || !spellData?.name_pt) return fallback;
    return spellData.name_pt;
  }

  function getDescription(fallback: string): string {
    if (!translated || !spellData?.description) return fallback;
    return spellData.description;
  }

  function getHigherLevels(fallback: string | null): string | null {
    if (!translated || !spellData) return fallback;
    // Return the translated higher_levels if it exists and is non-null, otherwise fallback
    if (spellData.higher_levels != null) return spellData.higher_levels;
    return fallback;
  }

  return { translated, globalPtBR, toggle, setGlobalPtBR, getName, getDescription, getHigherLevels };
}
