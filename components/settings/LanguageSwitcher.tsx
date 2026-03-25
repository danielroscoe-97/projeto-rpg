"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

export function LanguageSwitcher() {
  const locale = useLocale();
  const t = useTranslations("settings");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  async function onChange(newLocale: string) {
    document.cookie = `NEXT_LOCALE=${newLocale};path=/;max-age=31536000;SameSite=Lax`;

    try {
      await fetch("/api/user/language", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale: newLocale }),
      });
    } catch {
      // Ignore — cookie fallback is sufficient for anonymous users
    }

    startTransition(() => router.refresh());
  }

  return (
    <div className="mb-8">
      <h2 className="text-lg font-semibold text-foreground mb-1">
        {t("language_title")}
      </h2>
      <p className="text-muted-foreground text-sm mb-3">
        {t("language_description")}
      </p>
      <select
        value={locale}
        onChange={(e) => onChange(e.target.value)}
        disabled={isPending}
        className="bg-card border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-gold/50 disabled:opacity-50"
      >
        <option value="pt-BR">Portugues (Brasil)</option>
        <option value="en">English</option>
      </select>
    </div>
  );
}
