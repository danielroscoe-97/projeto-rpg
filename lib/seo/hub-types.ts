/**
 * JSON-driven hub page schema.
 *
 * Each hub lives in content/hubs/{slug}.json and renders at /guias/{slug}
 * (locale: pt-BR) or /guides/{slug} (locale: en). See content/hubs/README.md.
 */

export interface HubItem {
  slug: string;
  name: string;
  /** Optional absolute-or-relative override; defaults to `${section.linkPath}/${slug}`. */
  url?: string;
}

export interface HubSection {
  /** URL fragment anchor (e.g. "dragoes" → #dragoes). Optional. */
  anchor?: string;
  /** Section H2. */
  label: string;
  /** Optional sub-label shown alongside H2 (e.g. CR range). */
  subLabel?: string;
  /** Optional lead paragraph under the H2. */
  desc?: string;
  /** Base path for item slugs (e.g. "/monstros", "/magias", "/monsters"). */
  linkPath: string;
  /** "chip" (compact tag) or "card" (bigger). Defaults to "chip". */
  style?: "chip" | "card";
  items: HubItem[];
}

export interface HubIconic extends HubItem {
  blurb: string;
  /** Optional level/CR badge (e.g. "CR 30", "3rd level"). */
  level?: string;
}

export interface HubRichParagraph {
  /** Rendered as a paragraph with inline links resolved from `links`. */
  text: string;
  /** Map of `{{placeholder}}` → `{ href, label }`. Placeholders in text get
   *  replaced with <Link href>label</Link>. */
  links?: Record<string, { href: string; label: string }>;
}

export interface HubContent {
  /** URL slug after /guias/ or /guides/. */
  slug: string;
  locale: "pt-BR" | "en";
  /** Text shown as <html lang> equivalent in JSON-LD `inLanguage`. */
  inLanguage?: string;

  // ─── SEO head ────────────────────────────────────────────────
  metaTitle: string;
  metaDescription: string;
  ogTitle?: string;
  ogDescription?: string;

  // ─── Visible hero ────────────────────────────────────────────
  /** Small uppercase kicker above H1 (e.g. "Guia · Bestiário"). */
  kicker: string;
  h1: string;
  /** First paragraph, rich text with inline link placeholders. */
  lead: HubRichParagraph;

  // ─── Optional intro blocks (rendered after lead, before sections) ────
  introBlocks?: { label: string; paragraphs: HubRichParagraph[] }[];

  // ─── Sections (one H2 per item) ──────────────────────────────
  sections: HubSection[];

  // ─── Iconic spotlight cards ──────────────────────────────────
  iconic?: { label: string; desc?: string; items: HubIconic[] };

  // ─── Closing content blocks ──────────────────────────────────
  closing?: { label: string; paragraphs: HubRichParagraph[] }[];

  // ─── Internal link cluster (footer of links) ─────────────────
  internalLinkCluster?: { label: string; links: { href: string; label: string }[] };

  // ─── CTA ─────────────────────────────────────────────────────
  ctaHeadline: string;
  ctaSub: string;
  ctaPrimaryHref: string;
  ctaPrimaryLabel: string;
  ctaSecondaryHref?: string;
  ctaSecondaryLabel?: string;

  // ─── Breadcrumbs (JSON-LD + visible nav) ─────────────────────
  breadcrumbs: { name: string; path: string }[];

  // ─── Epic C: queries this hub targets (for monitoring) ───────
  tracked_queries: string[];
}
