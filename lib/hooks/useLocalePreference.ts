"use client";

import { useState, useEffect, useCallback } from "react";

type Locale = "en" | "pt-BR";

const LS_KEY = "pocketdm_locale";

function readStored(): Locale | null {
  if (typeof window === "undefined") return null;
  const v = localStorage.getItem(LS_KEY);
  if (v === "en" || v === "pt-BR") return v;
  return null;
}

/**
 * Persistent locale preference hook.
 * Reads from localStorage on mount, writes on change.
 * Also updates the NEXT_LOCALE cookie so server rendering picks it up.
 */
export function useLocalePreference(initialLocale: Locale = "en"): [Locale, (l: Locale) => void] {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  // Hydrate from localStorage on mount
  useEffect(() => {
    const stored = readStored();
    if (stored) setLocaleState(stored);
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    localStorage.setItem(LS_KEY, l);
    // Update NEXT_LOCALE cookie for server-side rendering
    document.cookie = `NEXT_LOCALE=${l};path=/;max-age=31536000;samesite=lax`;
  }, []);

  return [locale, setLocale];
}
