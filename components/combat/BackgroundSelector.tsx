"use client";

import { useTranslations } from "next-intl";
import type { WeatherEffect } from "@/components/player/WeatherOverlay";

const WEATHER_OPTIONS: { id: WeatherEffect; emoji: string }[] = [
  { id: "none", emoji: "----" },
  { id: "rain", emoji: "\uD83C\uDF27\uFE0F" },
  { id: "snow", emoji: "\u2744\uFE0F" },
  { id: "fog", emoji: "\uD83C\uDF2B\uFE0F" },
  { id: "storm", emoji: "\u26C8\uFE0F" },
  { id: "ash", emoji: "\uD83C\uDF0B" },
];

interface BackgroundSelectorProps {
  currentWeather: WeatherEffect;
  onWeatherChange: (effect: WeatherEffect) => void;
}

/** Selector for scene weather effects, shown in the DM combat controls. */
export function BackgroundSelector({ currentWeather, onWeatherChange }: BackgroundSelectorProps) {
  const t = useTranslations("combat");

  return (
    <div className="space-y-2">
      {/* Weather Effect row */}
      <div>
        <span className="text-muted-foreground text-xs font-medium block mb-1.5">
          {t("weather_title")}
        </span>
        <div className="flex flex-wrap gap-1.5">
          {WEATHER_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => onWeatherChange(opt.id)}
              className={`px-2.5 py-1.5 text-sm rounded-md transition-all duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)] min-h-[36px] ${
                currentWeather === opt.id
                  ? "border-2 border-gold bg-gold/10 text-foreground"
                  : "border border-border bg-white/[0.04] text-muted-foreground hover:bg-white/[0.08]"
              }`}
              aria-pressed={currentWeather === opt.id}
              aria-label={t(`weather_${opt.id}` as Parameters<typeof t>[0])}
              data-testid={`weather-btn-${opt.id}`}
            >
              <span className="mr-1" aria-hidden="true">{opt.emoji}</span>
              <span className="text-xs">{t(`weather_${opt.id}` as Parameters<typeof t>[0])}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
