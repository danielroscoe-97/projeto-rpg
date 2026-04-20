/**
 * Canonical slug format for the favorites store. `<FavoriteStar>` writes and
 * `FavoritesTab` reads MUST use the same function — divergence causes silent
 * data loss (write under one slug, read under another).
 *
 * Consolidated in beta-4 review (P1 finding) — previously duplicated in
 * PlayerCompendiumBrowser.tsx and FavoritesTab.tsx.
 */
export function favoriteSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
