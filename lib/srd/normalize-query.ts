/**
 * S3.3 — Diacritic-insensitive string normalization for compendium search.
 *
 * Problem: DM types "Velociraptor" / "Dragao" / "remora" — misses entries that
 * have accents ("Velociráptor", "Dragão", "Rêmora") because local filters use
 * raw `.toLowerCase().includes()`.
 *
 * Solution: normalize both sides of the comparison with NFD + strip combining
 * marks before comparing. Also used on Fuse callers that don't want to rely
 * solely on `ignoreDiacritics` (e.g. hyphen folding).
 *
 * Keep this file tiny and side-effect free — imported by both client and
 * server code.
 */

/**
 * Normalize a string for accent-insensitive comparison.
 *
 * - `null` / `undefined` → `""`
 * - lowercased
 * - NFD-decomposed, combining diacritics stripped
 * - punctuation / hyphens removed, unicode letters/digits preserved
 *   (so CJK / Arabic / emoji-adjacent letters aren't corrupted)
 * - collapsed whitespace, trimmed
 */
export function normalizeForSearch(text: string | null | undefined): string {
  if (!text) return "";
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip combining diacritics
    .replace(/[^\p{L}\p{N}\s]/gu, " ") // remove pontuação/hífens, preserva letras unicode
    .replace(/\s+/g, " ")
    .trim();
}
