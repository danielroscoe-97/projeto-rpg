"use client";

import { useState, useCallback } from "react";

type Locale = "en" | "pt-BR";

const LS_KEY = "pocketdm_locale";

function readStored(): Locale | null {
  try {
    if (typeof window === "undefined") return null;
    const v = localStorage.getItem(LS_KEY);
    if (v === "en" || v === "pt-BR") return v;
  } catch { /* Safari private browsing / restricted storage */ }
  return null;
}

/**
 * Persistent locale preference hook.
 * Reads from localStorage synchronously on init (no hydration flash).
 * Writes to localStorage + NEXT_LOCALE cookie on change.
 */
export function useLocalePreference(initialLocale: Locale = "en"): [Locale, (l: Locale) => void] {
  const [locale, setLocaleState] = useState<Locale>(() => readStored() ?? initialLocale);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    try {
      localStorage.setItem(LS_KEY, l);
      document.cookie = `NEXT_LOCALE=${l};path=/;max-age=31536000;SameSite=Lax`;
    } catch { /* restricted storage — preference still works for current session */ }
  }, []);

  return [locale, setLocale];
}
