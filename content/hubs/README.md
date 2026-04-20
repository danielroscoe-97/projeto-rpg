# content/hubs — JSON-driven hub page source

**Adding a hub page = drop a JSON file.** The dynamic routes at `app/guias/[slug]/page.tsx` (PT-BR) and `app/guides/[slug]/page.tsx` (EN) read everything in this folder at build time.

## Schema

TypeScript definitions live in [`lib/seo/hub-types.ts`](../../lib/seo/hub-types.ts). The file here is the authoritative reference.

```ts
interface HubContent {
  slug: string;              // URL segment (e.g. "bestiario-dnd-5e")
  locale: "pt-BR" | "en";    // determines which dynamic route picks it up
  metaTitle: string;
  metaDescription: string;
  kicker: string;            // small uppercase label above H1
  h1: string;
  lead: HubRichParagraph;    // first paragraph
  introBlocks?: [...]        // optional context sections
  sections: HubSection[];    // chip/card sections (one H2 each)
  iconic?: { label, desc?, items: HubIconic[] }
  closing?: [...]
  internalLinkCluster?: { label, links: [...] }
  ctaHeadline, ctaSub, ctaPrimaryHref, ctaPrimaryLabel
  ctaSecondaryHref?, ctaSecondaryLabel?
  breadcrumbs: { name, path }[]
  tracked_queries: string[]  // Epic C monitoring uses these
}
```

## Rich text with placeholders

Paragraphs can embed inline links using `{{placeholder}}` substitution:

```json
{
  "text": "Ver o {{compendium}} pra stat blocks completos.",
  "links": {
    "compendium": { "href": "/monstros", "label": "Compêndio" }
  }
}
```

Placeholders without a matching key render as plain text (safe fallback).

## Locales & routing

- `locale: "pt-BR"` → rendered at `/guias/{slug}`
- `locale: "en"` → rendered at `/guides/{slug}`

Both routes share `content/hubs/*.json` via `lib/seo/hub-loader.ts` which filters by locale. **Creating a translation = a second JSON file with the same slug style but `locale: "en"` and `linkPath` values pointing to EN routes (`/monsters`, `/spells` vs `/monstros`, `/magias`).**

## File naming

- PT-BR: `{topic-in-portuguese}.json` (e.g. `bestiario-dnd-5e.json`)
- EN: `{topic-in-english}.json` (e.g. `dnd-5e-bestiary.json`)
- Underscore-prefixed files (`_draft.json`) are ignored by the loader — use as scratchpad.

## Sitemap

`app/sitemap.ts` calls `loadAllHubs()` and emits one entry per hub, using `/guias/` or `/guides/` prefix based on locale. No manual work.

## tracked_queries

Used by Epic C monitoring scripts to cross-reference hub performance against GSC data. Populate with the top queries each hub targets (PT-BR preferred; Brazilian traffic is 83%).

## Example

See [`bestiario-dnd-5e.json`](./bestiario-dnd-5e.json) for a complete hub with introBlocks, 6 sections, iconic spotlight, closing blocks, and internal link cluster.
