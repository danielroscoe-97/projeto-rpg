"use client";

type Locale = "en" | "pt-BR";

interface LanguageToggleProps {
  locale: Locale;
  onToggle: (locale: Locale) => void;
  size?: "sm" | "md";
}

/**
 * Language toggle button (EN / PT).
 * Persistence is handled by the parent via useLocalePreference hook.
 */
export function LanguageToggle({ locale, onToggle, size = "sm" }: LanguageToggleProps) {
  const isSm = size === "sm";
  const px = isSm ? "px-2" : "px-3";
  const py = isSm ? "py-0.5" : "py-1.5";
  const text = isSm ? "text-xs" : "text-sm";

  return (
    <div className="flex items-center rounded-md border border-white/[0.08] overflow-hidden">
      <button
        type="button"
        onClick={() => onToggle("en")}
        className={`${px} ${py} ${text} font-medium transition-colors ${
          locale === "en"
            ? "bg-gold text-gray-950"
            : "bg-white/[0.04] text-gray-400 hover:text-gray-300"
        }`}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => onToggle("pt-BR")}
        className={`${px} ${py} ${text} font-medium transition-colors ${
          locale === "pt-BR"
            ? "bg-gold text-gray-950"
            : "bg-white/[0.04] text-gray-400 hover:text-gray-300"
        }`}
      >
        PT
      </button>
    </div>
  );
}
