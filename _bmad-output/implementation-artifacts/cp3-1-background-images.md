# Story CP.3.1: Background Images on Player View

Status: ready-for-dev

## Story

**Como** DM, **quero** definir uma imagem de fundo para a tela dos jogadores **para que** a atmosfera visual na mesa física impressione e imersione o grupo.

## Context

Shieldmaiden has atmospheric backgrounds with weather effects. We'll start simpler: let the DM set a background image URL that appears behind the player initiative board.

Player view: `components/player/PlayerInitiativeBoard.tsx`
Realtime broadcast: `lib/realtime/broadcast.ts`

## Acceptance Criteria

1. **DM controls (combat view):**
   - New "🖼️ Background" button in the combat toolbar
   - Opens small popover with:
     - URL input field (paste image URL)
     - Preset gallery: 8-12 curated fantasy scene thumbnails (free/CC0 images)
       - Tavern, Forest, Dungeon, Cave, Castle, Battlefield, Ocean, Mountain, City, Graveyard, Temple, Dragon Lair
     - "Clear" button to remove background
   - Presets stored as static URLs in `lib/constants/scene-presets.ts`

2. **Player view display:**
   - Background image fills the entire player view (cover, center)
   - Semi-transparent dark overlay on top (opacity 0.6-0.7) so initiative text remains readable
   - Initiative board content renders on top of the overlay
   - Smooth crossfade transition (300ms) when background changes
   - If no background set: use default dark theme (current behavior)

3. **Realtime sync:**
   - DM broadcasts `session:background_change` with `{ imageUrl: string | null }`
   - Player view listens and updates background
   - On late join / reconnect: include current background in state sync
   - Add to `session:state_sync` payload

4. **Performance:**
   - Lazy-load background image (don't block initial render)
   - Use CSS `background-image` (not <img>) for proper cover behavior
   - Preload preset images on hover in DM popover

5. **Preset images:**
   - Use free fantasy scene images (Unsplash, Pixabay, or similar CC0 sources)
   - Store as constants, not fetched dynamically
   - Thumbnails: 200x120px for DM popover
   - Full images: 1920x1080 (or responsive srcset)

6. **Session persistence:**
   - Store current background URL in session state (survives F5)
   - Clear when encounter ends

## Technical Notes

- CSS approach: `background-image: url(...)` with `background-size: cover; background-position: center`
- Overlay: absolute positioned div with `bg-black/60` Tailwind class
- Transition: CSS `transition: background-image 300ms ease-in-out`
- For presets: bundle small thumbnails, link to full-size external images
- Do NOT upload images to Supabase Storage for MVP — just URL references

## Tasks

- [ ] Create `lib/constants/scene-presets.ts` with 10-12 preset scenes
- [ ] Create BackgroundSelector popover component (URL input + preset grid)
- [ ] Add "Background" button to combat toolbar
- [ ] Implement background rendering on PlayerInitiativeBoard (CSS cover + overlay)
- [ ] Add crossfade transition (300ms)
- [ ] Broadcast `session:background_change` event
- [ ] Listen in player view and update background
- [ ] Include in `session:state_sync` for late join
- [ ] Persist in session state (survives F5)
- [ ] Clear on encounter end
- [ ] Lazy-load images (don't block render)
- [ ] i18n strings (pt-BR + en)
- [ ] Mobile: ensure overlay is opaque enough for readability on small screens
