"use client";

import { useState, useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Globe, Sun, Moon, Monitor, Bell } from "lucide-react";

type ThemeOption = "dark" | "light" | "system";

function getStoredTheme(): ThemeOption {
  if (typeof window === "undefined") return "dark";
  return (localStorage.getItem("theme") as ThemeOption) ?? "dark";
}

function applyTheme(theme: ThemeOption) {
  if (typeof window === "undefined") return;
  localStorage.setItem("theme", theme);
  const root = document.documentElement;
  if (theme === "system") {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    root.classList.toggle("dark", prefersDark);
    root.classList.toggle("light", !prefersDark);
  } else {
    root.classList.toggle("dark", theme === "dark");
    root.classList.toggle("light", theme === "light");
  }
}

export function SettingsForm() {
  const t = useTranslations("profile");
  const locale = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [theme, setTheme] = useState<ThemeOption>("dark");
  const [notifications, setNotifications] = useState({
    turnReminder: true,
    sessionStart: true,
  });

  useEffect(() => {
    setTheme(getStoredTheme());
  }, []);

  const handleLocaleChange = async (newLocale: string) => {
    document.cookie = `NEXT_LOCALE=${newLocale};path=/;max-age=31536000;SameSite=Lax`;
    try {
      await fetch("/api/user/language", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale: newLocale }),
      });
    } catch {
      // cookie fallback is sufficient
    }
    startTransition(() => router.refresh());
  };

  const handleThemeChange = (newTheme: ThemeOption) => {
    setTheme(newTheme);
    applyTheme(newTheme);
    toast.success(t("settings_saved"));
  };

  const themeOptions: { value: ThemeOption; label: string; icon: React.ReactNode }[] = [
    { value: "dark", label: t("theme_dark"), icon: <Moon className="w-4 h-4" /> },
    { value: "light", label: t("theme_light"), icon: <Sun className="w-4 h-4" /> },
    { value: "system", label: t("theme_system"), icon: <Monitor className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6" data-testid="settings-form">
      {/* Language */}
      <section className="bg-card rounded-lg border border-border p-5">
        <div className="flex items-center gap-2 mb-1">
          <Globe className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
          <h2 className="text-foreground font-semibold">{t("language")}</h2>
        </div>
        <p className="text-muted-foreground text-sm mb-3 ml-6">
          {t("language_description")}
        </p>
        <div className="ml-6">
          <select
            value={locale}
            onChange={(e) => handleLocaleChange(e.target.value)}
            disabled={isPending}
            data-testid="language-select"
            className="bg-surface-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-gold/50 disabled:opacity-50"
          >
            <option value="pt-BR">Portugues (Brasil)</option>
            <option value="en">English</option>
          </select>
        </div>
      </section>

      {/* Theme */}
      <section className="bg-card rounded-lg border border-border p-5">
        <div className="flex items-center gap-2 mb-3">
          <Sun className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
          <h2 className="text-foreground font-semibold">{t("theme")}</h2>
        </div>
        <div className="ml-6 flex gap-3">
          {themeOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleThemeChange(option.value)}
              data-testid={`theme-${option.value}`}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 transition-all duration-200 text-sm font-medium min-h-[44px] ${
                theme === option.value
                  ? "border-gold bg-gold/10 text-gold"
                  : "border-white/[0.08] bg-white/[0.02] text-muted-foreground hover:border-white/[0.15]"
              }`}
            >
              {option.icon}
              {option.label}
            </button>
          ))}
        </div>
      </section>

      {/* Notifications (placeholder) */}
      <section className="bg-card rounded-lg border border-border p-5">
        <div className="flex items-center gap-2 mb-3">
          <Bell className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
          <h2 className="text-foreground font-semibold">{t("notifications")}</h2>
        </div>
        <div className="ml-6 space-y-3">
          <label className="flex items-center gap-3 cursor-pointer" data-testid="notif-turn">
            <input
              type="checkbox"
              checked={notifications.turnReminder}
              onChange={(e) =>
                setNotifications((prev) => ({ ...prev, turnReminder: e.target.checked }))
              }
              className="w-4 h-4 rounded border-border bg-surface-secondary accent-gold"
            />
            <span className="text-sm text-foreground">{t("notif_turn_reminder")}</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer" data-testid="notif-session">
            <input
              type="checkbox"
              checked={notifications.sessionStart}
              onChange={(e) =>
                setNotifications((prev) => ({ ...prev, sessionStart: e.target.checked }))
              }
              className="w-4 h-4 rounded border-border bg-surface-secondary accent-gold"
            />
            <span className="text-sm text-foreground">{t("notif_session_start")}</span>
          </label>
        </div>
      </section>
    </div>
  );
}
