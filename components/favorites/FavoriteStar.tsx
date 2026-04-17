"use client";

/**
 * S5.2 — FavoriteStar toggle button.
 *
 * Thin wrapper around `useFavorites(kind)` that renders a 32x32 touch-target
 * star in top-right of a card. Outline when not favorited, filled when
 * favorited. `aria-pressed` reflects state; `aria-label` is localized.
 *
 * Gated behind `ff_favorites_v1` — returns null when flag is OFF.
 */

import { useTranslations } from "next-intl";
import { Star } from "lucide-react";
import { isFeatureFlagEnabled } from "@/lib/flags";
import { useFavorites, type FavoriteKind } from "@/lib/favorites/use-favorites";
import { cn } from "@/lib/utils";

export interface FavoriteStarProps {
  kind: FavoriteKind;
  slug: string;
  /** Human-readable name used for the aria-label. */
  name: string;
  className?: string;
  /** When true, renders a slightly smaller button for dense rows. */
  compact?: boolean;
  /** Optional callback fired after a successful add/remove. */
  onToggle?: (favorited: boolean) => void;
}

export function FavoriteStar({ kind, slug, name, className, compact = false, onToggle }: FavoriteStarProps) {
  const t = useTranslations("favorites");
  const { add, remove, isFavorite } = useFavorites(kind);

  // Hard gate — flag OFF means star must not be visible.
  if (!isFeatureFlagEnabled("ff_favorites_v1")) return null;

  const favorited = isFavorite(slug);
  const label = favorited ? t("unfavorite_aria", { name }) : t("favorite_aria", { name });
  const size = compact ? 28 : 32;

  async function onClick(e: React.MouseEvent<HTMLButtonElement>) {
    e.stopPropagation();
    e.preventDefault();
    if (favorited) {
      await remove(slug);
      onToggle?.(false);
    } else {
      const ok = await add(slug);
      onToggle?.(ok);
    }
  }

  return (
    <button
      type="button"
      aria-pressed={favorited}
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        "inline-flex items-center justify-center rounded-full transition-colors",
        "hover:bg-amber-400/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60",
        favorited ? "text-amber-400" : "text-stone-400 hover:text-amber-300",
        className,
      )}
      style={{ width: size, height: size, minWidth: size, minHeight: size }}
      data-testid="favorite-star"
      data-favorited={favorited ? "true" : "false"}
      data-kind={kind}
      data-slug={slug}
    >
      <Star size={compact ? 16 : 18} fill={favorited ? "currentColor" : "none"} strokeWidth={favorited ? 1.75 : 2} />
    </button>
  );
}
