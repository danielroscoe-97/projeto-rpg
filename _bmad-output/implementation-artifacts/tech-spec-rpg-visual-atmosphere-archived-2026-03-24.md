---
title: 'RPG Visual Atmosphere — Pixel Art & Illustrations'
slug: 'rpg-visual-atmosphere'
created: '2026-03-24'
status: 'ready-for-dev'
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['Next.js 19 (App Router)', 'React 19', 'TypeScript 5', 'Tailwind CSS 3.4 + tailwindcss-animate', 'shadcn/ui (Radix)', 'next/image', 'CSS @keyframes + steps()']
files_to_modify: ['app/page.tsx', 'app/globals.css', 'tailwind.config.ts', 'next.config.ts', 'components/layout/Navbar.tsx', 'components/marketing/Footer.tsx', 'components/dashboard/CampaignManager.tsx', 'components/dashboard/SavedEncounters.tsx', 'components/dashboard/OnboardingWizard.tsx', 'components/session/CombatSessionClient.tsx', 'app/app/dashboard/page.tsx']
code_patterns: ['next/image with width/height props (no layout shift)', 'Tailwind utility classes for opacity/visibility/transforms', 'transition-all duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)] pattern', 'CSS-only animations (no JS animation libs)', 'aria-hidden=true for decorative elements', 'hidden sm:block for responsive hiding', 'shadcn Card/Button component wrappers']
test_patterns: ['Jest 30 + @testing-library/react 16', 'Lighthouse performance > 90', 'No CLS from image loading']
---

# Tech-Spec: RPG Visual Atmosphere — Pixel Art & Illustrations

**Created:** 2026-03-24

## Overview

### Problem Statement

The Taverna do Mestre has a solid dark RPG CSS theme (gold/navy, noise texture, radial gradients) but zero actual artwork — no images, no sprites, no illustrations. The `public/` folder contains only SRD JSON data. Feature cards on the landing page use plain emojis (⚔️📱📖). The app feels functional but not immersive. It lacks the fantasy atmosphere that draws DMs in and makes the tool feel like it belongs in their RPG world.

### Solution

Add a small, curated set of ~8-12 pixel art and RPG-style visual assets across the entire app. Inspired by Ragnarok Online's aesthetic — chibi pixel sprites, warm atmospheric elements, and subtle decorative touches. The philosophy is "few but impactful": each image earns its place by adding atmosphere without cluttering the clean UI.

### Scope

**In Scope:**
- Sourcing free pixel art assets from itch.io, OpenGameArt, CraftPix (CC0/free commercial use)
- Integration with Next.js Image optimization (WebP, lazy loading, responsive)
- Pixel art icons replacing emojis on landing page feature cards
- Decorative elements: section dividers, ornamental borders, subtle watermarks
- Animated pixel art touches (torch/candle CSS sprite animation)
- Empty state illustrations (no encounters, no campaigns)
- Brand icon pixel art (navbar, favicon)
- Subtle background textures/overlays for cards
- Performance budget: total added image weight < 200KB
- Responsive handling (scale/hide decorative elements on mobile)

**Out of Scope:**
- Creating original artwork or commissioning artists
- Paid asset packs
- Full UI component redesign
- 3D effects or heavy JavaScript animations
- Character avatar system for combatants (future feature)
- Monster/spell artwork from SRD (copyright concerns)

## Context for Development

### Codebase Patterns

- **Next.js App Router** with React 19 — use `next/image` for all raster images
- **Tailwind CSS** with custom theme — extend via `tailwind.config.ts` for new utilities
- **CSS-only animations** preferred — the app uses `transition-all duration-[250ms]` pattern
- **Component structure**: UI primitives in `components/ui/`, feature components in domain folders
- **No existing image pipeline** — this is the first time images are being added to the project
- **Fonts**: Cinzel (headings), Plus Jakarta Sans (body) — pixel art should complement, not clash
- **Color palette**: gold (#D4A853), navy (#1a1a28), warm (#E8593C), cool (#5B8DEF)

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `app/page.tsx` | Landing page — hero section, feature cards (emoji icons), how-it-works, CTA |
| `app/globals.css` | Global CSS — noise texture, radial gradients, glass-nav, typography |
| `tailwind.config.ts` | Theme config — colors, shadows, fonts, animations |
| `components/layout/Navbar.tsx` | Fixed header — brand text, navigation links |
| `components/marketing/Footer.tsx` | Marketing footer — links, branding |
| `components/dashboard/CampaignManager.tsx` | Dashboard — campaign list, empty states |
| `components/dashboard/SavedEncounters.tsx` | Dashboard — encounter list, empty states |
| `components/session/CombatSessionClient.tsx` | Combat session — main orchestrator |
| `components/session/EncounterBuilder.tsx` | Encounter builder — add monsters UI |
| `app/app/onboarding/page.tsx` | Onboarding wizard — 4-step flow for new DMs |
| `app/app/dashboard/page.tsx` | Dashboard page — main authenticated view |
| `next.config.ts` | Next.js config — has CDN caching headers for SRD, extend for images |

### Technical Decisions

1. **Asset format**: WebP for raster, SVG for simple decorations. PNG fallback only if pixel art loses crispness in WebP.
2. **Image rendering**: Use `image-rendering: pixelated` CSS for pixel art to prevent blurring when scaled up.
3. **Sprite animations**: CSS `@keyframes` with `steps()` timing function for sprite sheet animations (torch, candle).
4. **Loading strategy**: `next/image` with `loading="lazy"` for below-fold, `priority` for hero section only.
5. **Asset organization**: `public/art/` directory with subdirectories: `icons/`, `decorations/`, `sprites/`, `textures/`.
6. **Responsive**: Decorative elements hidden on mobile (`hidden sm:block`), icons always visible but scaled.
7. **Accessibility**: All decorative images get `aria-hidden="true"` and `role="presentation"`. Functional icons get `alt` text.
8. **Performance**: Total image budget < 200KB. Individual assets < 30KB. Sprite sheets < 50KB.

## Implementation Plan

### Tasks

Tasks are ordered by dependency (infrastructure first, then integration points from lowest-level outward).

- [ ] **Task 1: CSS Infrastructure & Asset Directory**
  - File: `public/art/icons/` — create directory (for 32x32/48x48 pixel art icons)
  - File: `public/art/decorations/` — create directory (for dividers, borders)
  - File: `public/art/sprites/` — create directory (for animated sprite sheets)
  - File: `public/art/ATTRIBUTION.md` — create file documenting each asset's source, author, license URL
  - File: `app/globals.css` — after the `h1, h2, h3, h4` rule block (line ~91), add inside `@layer base`:
    ```css
    .pixel-art {
      image-rendering: pixelated;
      image-rendering: crisp-edges;
    }
    ```
  - File: `app/globals.css` — add inside `@layer components` (after `.glass-nav`, line ~99):
    ```css
    .sprite-torch {
      animation: torch-flicker 0.6s steps(4) infinite;
    }
    @keyframes torch-flicker {
      from { background-position: 0 0; }
      to { background-position: -192px 0; } /* 4 frames × 48px each */
    }
    ```
  - File: `next.config.ts` — add a new cache rule after the `/srd/:path*` block (line ~42):
    ```ts
    {
      source: "/art/:path*",
      headers: [
        { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
      ],
    },
    ```
  - Notes: No npm packages needed. All assets served from `public/art/` as static files.

- [ ] **Task 2: Source & Place Asset Files (MANUAL STEP)**
  - Action: Developer downloads curated free assets and places them in `public/art/`:
  - **`public/art/icons/`** — 6 pixel art icons (PNG, 32x32 native, ~1-3KB each):
    - `sword.png` — crossed swords (for Combat Tracker feature card + combat watermark)
    - `scroll.png` — scroll/spellbook (for Oracle feature card + onboarding step 1)
    - `potion.png` — healing potion (for Save & Retomar feature card)
    - `shield.png` — shield (for 2014/2024 feature card)
    - `d20.png` — twenty-sided die (for navbar/footer brand icon + Player View card)
    - `moon.png` — crescent moon (for Dark Mode feature card)
  - **`public/art/decorations/`** — 1 horizontal divider + 1 hero background (PNG):
    - `divider-ornament.png` — ornamental gold line with sword/diamond motif (~400x16 native, <5KB)
    - `tavern-scene.png` — pixel art tavern interior or adventurer party silhouette (~300x200 native, <15KB)
  - **`public/art/sprites/`** — 1 sprite sheet (PNG, 192x48 = 4 frames of 48x48, <10KB):
    - `torch-sheet.png` — 4-frame pixel art torch/flame animation
  - **`public/art/icons/`** — 2 empty state illustrations (PNG, 64x64 native, ~3-5KB each):
    - `treasure-chest.png` — closed treasure chest (for empty encounters)
    - `tavern-door.png` — tavern entrance door (for empty campaigns)
  - Sources (all free for commercial use):
    - [Shikashi's Fantasy Icons Pack](https://shikashipx.itch.io/shikashis-fantasy-icons-pack) — sword, shield, potion, scroll
    - [CraftPix Free RPG UI](https://craftpix.net/freebies/free-basic-pixel-art-ui-for-rpg/) — d20, UI elements
    - [itch.io Fire/Pixel Art](https://itch.io/game-assets/free/tag-fire/tag-pixel-art) — torch sprite sheet
    - [itch.io Fantasy GUI](https://itch.io/game-assets/free/tag-gui/tag-pixel-art) — ornamental divider
    - [itch.io Tavern Assets](https://itch.io/game-assets/tag-tavern) — treasure chest, tavern door
    - [OpenGameArt Fantasy/RPG](https://opengameart.org/content/theme-fantasy-rpg) — alternative source for any above
  - Notes: Keep PNG for pixel art (WebP blurs at low resolution). Total budget: all icons+sprites < 50KB.

- [ ] **Task 3: Landing Page — Hero Background Art**
  - File: `app/page.tsx` → `HeroSection` component
  - Action: Inside the `HeroSection`, after the existing "Decorative radials" div (line 15-18), add a pixel art background:
    ```tsx
    <div className="absolute inset-0 pointer-events-none hidden sm:flex items-center justify-center">
      <Image
        src="/art/decorations/tavern-scene.png"
        alt=""
        width={400}
        height={300}
        className="pixel-art opacity-[0.06]"
        aria-hidden="true"
        unoptimized
      />
    </div>
    ```
  - Asset needed: `public/art/decorations/tavern-scene.png` — pixel art tavern interior or adventurer party silhouette (~300x200 native, <15KB)
  - Source: [itch.io Dark Fantasy](https://itch.io/game-assets/tag-dark-fantasy) or [itch.io Tavern Assets](https://itch.io/game-assets/tag-tavern)
  - Notes: Hidden on mobile (`hidden sm:flex`). Opacity 6% ensures it doesn't compete with radial gradients. The hero is the highest-impact area — this single asset sets the tone for the entire app.

- [ ] **Task 4: Landing Page — Feature Card Icons (replace emojis)**
  - File: `app/page.tsx`
  - Action: Add `import Image from "next/image";` at line 2
  - Action: Change the `features` array (lines 68-103) `icon` field from emoji strings to image paths:
    ```ts
    { icon: "/art/icons/sword.png", title: "Combat Tracker Completo", ... },
    { icon: "/art/icons/d20.png", title: "Player View em Tempo Real", ... },
    { icon: "/art/icons/scroll.png", title: "Oraculo de Magias & Monstros", ... },
    { icon: "/art/icons/shield.png", title: "2014 & 2024 Side-by-Side", ... },
    { icon: "/art/icons/potion.png", title: "Salvar & Retomar", ... },
    { icon: "/art/icons/moon.png", title: "Dark Mode RPG", ... },
    ```
  - Action: Replace the emoji `<span>` render (line 125-127) with:
    ```tsx
    <Image
      src={f.icon}
      alt=""
      width={48}
      height={48}
      className="pixel-art mb-4 group-hover:scale-110 group-hover:drop-shadow-[0_0_8px_rgba(212,168,83,0.5)] transition-transform duration-[250ms]"
      aria-hidden="true"
      unoptimized
    />
    ```
  - Notes: 48x48 display from 32x32 source = 1.5x scale (acceptable). For 2x crispness, use 64x64 display from 32x32 source. Adjust based on sourced asset native size.

- [ ] **Task 5: Landing Page — Section Dividers**
  - File: `app/page.tsx`
  - Action: Create a reusable divider JSX block:
    ```tsx
    function SectionDivider() {
      return (
        <div className="flex justify-center py-2" aria-hidden="true">
          <Image
            src="/art/decorations/divider-ornament.png"
            alt=""
            width={200}
            height={8}
            className="pixel-art opacity-25"
          />
        </div>
      );
    }
    ```
  - Action: In `LandingPage` component (line 271-306), insert `<SectionDivider />` between:
    - After `<FeaturesSection />` and before `<HowItWorksSection />`
    - After `<HowItWorksSection />` and before `<ComparisonSection />`
  - Notes: Divider is `aria-hidden` and purely decorative. Gold tint comes from the asset itself or add `style={{ filter: 'sepia(0.4) saturate(1.5) hue-rotate(-5deg)' }}` if needed.

- [ ] **Task 6: Navbar Brand Icon**
  - File: `components/layout/Navbar.tsx`
  - Action: Add `import Image from "next/image";` at line 2
  - Action: Inside the brand `<Link>` (line 41-46), prepend an icon before `{brand}`:
    ```tsx
    <Link href={brandHref} className="font-display text-xl text-gold tracking-tight min-h-[44px] inline-flex items-center gap-2 hover:drop-shadow-[0_0_8px_rgba(212,168,83,0.4)] transition-all duration-[250ms]">
      <Image src="/art/icons/d20.png" alt="" width={24} height={24} className="pixel-art" aria-hidden="true" />
      {brand}
    </Link>
    ```
  - Notes: Added `gap-2` to the existing flex layout. The d20 icon provides brand identity. Size 24x24 fits the 72px navbar height.

- [ ] **Task 7: Footer Brand Icon**
  - File: `components/marketing/Footer.tsx`
  - Action: Add `import Image from "next/image";` at line 1
  - Action: Inside the brand `<div>` (line 9-13), add icon before the brand span:
    ```tsx
    <div className="flex items-center gap-2">
      <Image src="/art/icons/d20.png" alt="" width={20} height={20} className="pixel-art opacity-60" aria-hidden="true" />
      <span className="font-display text-gold text-lg">Taverna do Mestre</span>
    </div>
    ```
  - Notes: Slightly smaller (20x20) and lower opacity than navbar to maintain footer subtlety.

- [ ] **Task 8: Dashboard — Empty State Art**
  - File: `components/dashboard/CampaignManager.tsx`
  - Action: Add `import Image from "next/image";` at top
  - Action: Replace the empty state text block (lines 214-218):
    ```tsx
    {campaigns.length === 0 && !showCreate && (
      <div className="flex flex-col items-center gap-3 py-12 text-center">
        <Image src="/art/icons/tavern-door.png" alt="" width={64} height={64} className="pixel-art opacity-40" aria-hidden="true" />
        <p className="text-muted-foreground text-sm">No campaigns yet. Create your first campaign above.</p>
      </div>
    )}
    ```
  - File: `components/dashboard/SavedEncounters.tsx`
  - Action: Add `import Image from "next/image";` at top
  - Action: Change the early return at line 19 from `return null` to render an empty state:
    ```tsx
    if (encounters.length === 0) {
      return (
        <div className="mt-8" data-testid="saved-encounters">
          <h2 className="text-lg font-semibold text-foreground mb-3">Active Encounters</h2>
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <Image src="/art/icons/treasure-chest.png" alt="" width={64} height={64} className="pixel-art opacity-40" aria-hidden="true" />
            <p className="text-muted-foreground text-sm">No active encounters. Start a new combat session!</p>
          </div>
        </div>
      );
    }
    ```
  - Notes: Empty state art at 64x64 from 64x64 native = 1:1 crisp. Opacity 40% keeps it subtle. **BEHAVIOR CHANGE**: `SavedEncounters` previously returned `null` when empty (heading hidden). The new version shows the "Active Encounters" heading + empty state art. This is intentional — QA should not flag it as a regression.

- [ ] **Task 9: Dashboard — Animated Torch**
  - File: `app/app/dashboard/page.tsx`
  - Action: After the `<h1>Dashboard</h1>` heading block (line 63), add an absolutely-positioned torch sprite:
    ```tsx
    <div className="absolute -right-2 top-0 hidden sm:block" aria-hidden="true">
      <div
        className="sprite-torch pixel-art w-[48px] h-[48px] opacity-20"
        style={{ backgroundImage: 'url(/art/sprites/torch-sheet.png)', backgroundSize: '192px 48px' }}
      />
    </div>
    ```
  - Action: Ensure the parent `<div>` at line 61 has `relative` positioning — change:
    ```tsx
    <div className="mb-8 flex items-start justify-between gap-4">
    ```
    to:
    ```tsx
    <div className="mb-8 flex items-start justify-between gap-4 relative">
    ```
  - Notes: Hidden on mobile (`hidden sm:block`). Uses CSS sprite animation from Task 1. The `sprite-torch` class drives the `@keyframes torch-flicker` animation.

- [ ] **Task 10: Combat Session — Subtle Watermark**
  - File: `app/app/session/[id]/page.tsx` (the page wrapper, NOT `CombatSessionClient.tsx`)
  - Action: Add a watermark div as the first child inside the main content wrapper:
    ```tsx
    <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center overflow-hidden" aria-hidden="true">
      <Image src="/art/icons/sword.png" alt="" width={128} height={128} className="pixel-art opacity-[0.04]" unoptimized />
    </div>
    ```
  - Action: Ensure the session page content wrapper has `relative` positioning so the absolute watermark stays contained.
  - Notes: Uses `absolute` (not `fixed`) to avoid overlapping Radix modals/dialogs (AlertDialog, DropdownMenu). Placed in the page wrapper, not `CombatSessionClient.tsx`. `opacity-[0.04]` = barely visible. `pointer-events-none` + `z-0` ensures no interaction interference since all `body > div, section` elements have `z-index: 1` from globals.css.

- [ ] **Task 11: Onboarding Wizard — Step Icons**
  - File: `components/dashboard/OnboardingWizard.tsx`
  - Action: Add `import Image from "next/image";` at top
  - Action: Define a step-to-icon mapping:
    ```ts
    const STEP_ICONS: Record<number, string> = {
      1: "/art/icons/scroll.png",
      2: "/art/icons/shield.png",
      3: "/art/icons/sword.png",
      4: "/art/icons/d20.png",
    };
    ```
  - Action: Inside each step's `<CardHeader>`, before the `<CardTitle>`, add:
    ```tsx
    <Image src={STEP_ICONS[stepNumber]} alt="" width={48} height={48} className="pixel-art mx-auto mb-2 opacity-60" aria-hidden="true" />
    ```
  - Notes: Reuses existing icons from Task 2. The OnboardingWizard uses shadcn `Card`/`CardHeader`/`CardTitle` — the icon goes inside `CardHeader` before `CardTitle` to appear centered above the step title.

### Acceptance Criteria

**AC1: Asset Infrastructure**
- Given the project has no images
- When the implementation is complete
- Then `public/art/` exists with `icons/`, `decorations/`, `sprites/`, `textures/` subdirectories
- And all assets have `ATTRIBUTION.md` documenting source and license
- And `.pixel-art` CSS class is available globally

**AC2: Landing Page Visual Enhancement**
- Given a user visits the landing page
- When the page loads
- Then feature cards display pixel art icons instead of emojis
- And a subtle hero background element is visible on desktop (hidden on mobile <640px)
- And decorative dividers separate major sections
- And total landing page image weight is < 100KB

**AC3: Dashboard Atmosphere**
- Given a DM is on the dashboard
- When viewing campaigns or encounters
- Then empty states show themed pixel art illustrations with context text
- And at least one subtle animated element (torch/candle) is present
- And animations use CSS only (no JavaScript animation libraries)

**AC4: Combat Session Subtlety**
- Given a DM is running a combat session
- When the combat tracker is active
- Then a very subtle watermark is visible behind the tracker (opacity 3-5%)
- And it does not interfere with any interactive elements (`pointer-events: none`)
- And it does not shift layout or cause CLS

**AC5: Performance Budget**
- Given all art assets are added
- When measuring total image payload
- Then total weight of all art assets is < 200KB
- And no single asset exceeds 50KB
- And Lighthouse performance score remains > 90
- And no layout shift (CLS) is introduced by images

**AC6: Responsive & Accessible**
- Given a user on mobile (< 640px)
- When viewing any page
- Then decorative-only elements are hidden or gracefully scaled
- And functional icons remain visible at appropriate sizes
- And all decorative images have `aria-hidden="true"` and `role="presentation"`

**AC7: Brand Consistency**
- Given pixel art is placed throughout the app
- When viewing any page
- Then the gold (#D4A853) color is dominant in art elements (via CSS filter or asset color)
- And pixel art rendering is crisp (no anti-aliasing blur) via `image-rendering: pixelated`
- And the art style is consistent across all placements (same pixel art aesthetic)

## Additional Context

### Dependencies

- No new npm packages required
- Assets sourced from free/CC0 repositories (manual download)
- `next/image` already available in the project

### Testing Strategy

- **Visual**: Manual review on desktop (1440px), tablet (768px), mobile (375px)
- **Performance**: Run Lighthouse before/after — performance score must stay > 90
- **CLS**: Verify no Cumulative Layout Shift from image loading (use `width`/`height` props)
- **Animation**: Verify sprite animation runs smoothly at 60fps (CSS only, no JS)
- **Accessibility**: Screen reader test — decorative images must not be announced

### Notes

- **Asset sourcing is a manual step** — the developer must visit the linked sources, download assets, and place them in `public/art/`. The spec provides exact sources and recommended assets.
- **Pixel art scaling**: Always scale in integer multiples (2x, 3x, 4x) to maintain crispness. A 16x16 icon displayed at 48x48 (3x) will be crisp; at 40x40 (2.5x) it may blur.
- **Color harmony**: If sourced assets don't match the gold/navy palette, use CSS `filter` (e.g., `filter: sepia(0.3) hue-rotate(-10deg) brightness(0.9)`) to tint them consistently.
- **Future expansion**: This spec establishes the image infrastructure. Future stories can add combatant avatars, monster art, class icons, and animated battle effects using the same `public/art/` structure and patterns.

### Recommended Asset Sources

| Source | URL | License | Best For |
|--------|-----|---------|----------|
| Shikashi's Fantasy Icons | https://shikashipx.itch.io/shikashis-fantasy-icons-pack | Free | Weapon/item pixel icons |
| CraftPix Free RPG UI | https://craftpix.net/freebies/free-basic-pixel-art-ui-for-rpg/ | Free | UI frames, borders |
| itch.io Dark Fantasy | https://itch.io/game-assets/tag-dark-fantasy | Varies | Atmospheric sprites |
| itch.io Tavern Assets | https://itch.io/game-assets/tag-tavern | Varies | Tavern-themed pixel art |
| OpenGameArt Fantasy | https://opengameart.org/content/theme-fantasy-rpg | CC0/CC-BY | General fantasy sprites |
| itch.io Fire/Pixel Art | https://itch.io/game-assets/free/tag-fire/tag-pixel-art | Free | Animated torch/candle |
| itch.io Fantasy GUI | https://itch.io/game-assets/free/tag-gui/tag-pixel-art | Free | Decorative UI elements |
