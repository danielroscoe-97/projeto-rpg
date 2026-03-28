# Story CP.3.2: Weather Effects on Player View

Status: ready-for-dev

## Story

**Como** DM, **quero** ativar efeitos climáticos visuais na tela dos jogadores **para que** a atmosfera do combate seja mais imersiva e cinematográfica.

## Context

O BackgroundSelector (`components/combat/BackgroundSelector.tsx`) já permite escolher imagens de fundo para o player view. Esta story adiciona efeitos climáticos animados (chuva, neve, neblina, raios) como overlay em cima do background.

A Shieldmaiden cobra por weather effects (tier pago). Nós podemos incluir no Pro tier como selling point.

**UX Assessment:** AMARELO — Risco MÉDIO. Solução: NÃO criar botão novo na toolbar. Embutir o seletor de weather DENTRO do BackgroundSelector existente. Zero botões novos.

## Acceptance Criteria

1. Create `components/player/WeatherOverlay.tsx`:
   - Pure CSS/canvas animated overlays, NO external dependencies
   - Supported effects:
     - `rain` — diagonal animated lines falling (CSS animation)
     - `snow` — soft white particles drifting down (CSS animation)
     - `fog` — semi-transparent white gradient that slowly shifts (CSS animation)
     - `storm` — rain + periodic lightning flash (brief white screen flash every 8-15s random interval)
     - `ash` — orange/grey particles floating upward (for volcanic/fire scenes)
   - Each effect is a single React component that renders an absolutely positioned overlay
   - Performance: use CSS `will-change: transform` and GPU-accelerated properties only
   - Reduced motion: respect `prefers-reduced-motion` — disable particle effects, keep only subtle color overlay

2. Extend BackgroundSelector to include weather:
   - Add a row below the scene presets grid:
     ```
     Efeito climático:
     [Nenhum] [🌧️ Chuva] [❄️ Neve] [🌫️ Neblina] [⛈️ Tempestade] [🌋 Cinzas]
     ```
   - Each is a small button with emoji + label
   - Active effect highlighted with gold border
   - "Nenhum" clears the effect
   - Weather selection is independent of background image (can combine any image + any weather)

3. Broadcast weather change:
   - Add new realtime event type: `session:weather_change`
   ```typescript
   interface RealtimeWeatherChange {
     type: "session:weather_change";
     effect: "none" | "rain" | "snow" | "fog" | "storm" | "ash";
   }
   ```
   - Broadcast when DM selects a weather effect
   - Pass through sanitization unchanged (no sensitive data)

4. Player View integration:
   - In `PlayerInitiativeBoard.tsx`:
     - Listen for `session:weather_change` events
     - Render `WeatherOverlay` with the selected effect
     - Effect renders ABOVE the background image but BELOW the initiative content
     - Z-index layering: background (z-0) → weather (z-10) → dark overlay (z-20) → content (z-30)
   - Store current weather in component state (resets on page refresh — ephemeral)

5. DM preview:
   - In CombatSessionClient, when weather is selected, show a tiny indicator next to the background button:
     - Just the emoji of the active weather effect (e.g., 🌧️) — no extra space
   - DM does NOT see the full weather overlay on their screen (it's player-facing only)

## CSS Animation Specs

### Rain
```css
/* Multiple thin lines falling at 75° angle, varying speeds */
/* 40-60 lines, animation-duration: 0.8-1.5s, opacity: 0.3-0.6 */
/* Color: rgba(174, 194, 224, 0.5) */
```

### Snow
```css
/* 30-50 soft circles, varying sizes (2-6px), drift left-right while falling */
/* animation-duration: 4-8s, opacity: 0.4-0.8 */
/* Color: rgba(255, 255, 255, 0.7) */
```

### Fog
```css
/* 2-3 large gradient blobs that slowly translate horizontally */
/* animation-duration: 15-25s, opacity: 0.15-0.3 */
/* Color: rgba(255, 255, 255, 0.2) */
```

### Storm
```css
/* Rain effect + periodic lightning: full-screen white flash */
/* Flash: opacity 0→0.7→0 over 200ms, random interval 8-15s */
```

### Ash
```css
/* 20-30 small particles floating UPWARD, slight horizontal drift */
/* Colors: mix of rgba(255,140,0,0.4) and rgba(180,180,180,0.3) */
/* animation-duration: 5-10s */
```

## i18n Keys

- `combat.weather_title`: "Efeito Climático" / "Weather Effect"
- `combat.weather_none`: "Nenhum" / "None"
- `combat.weather_rain`: "Chuva" / "Rain"
- `combat.weather_snow`: "Neve" / "Snow"
- `combat.weather_fog`: "Neblina" / "Fog"
- `combat.weather_storm`: "Tempestade" / "Storm"
- `combat.weather_ash`: "Cinzas" / "Ash"

## Technical Notes

- All animations are pure CSS — no JS animation loops, no requestAnimationFrame
- Particles generated via CSS pseudo-elements or repeated `<span>` with randomized `animation-delay`
- Weather state is ephemeral (sessionStorage like backgrounds) — not persisted in DB
- The overlay must NOT capture pointer events (`pointer-events: none`)
- Total DOM elements for any effect should not exceed 60 (performance on low-end mobile)
- Lightning flash uses `mix-blend-mode: screen` for natural look

## Out of Scope

- Sound effects tied to weather (rain sounds, thunder) — handled by existing soundboard
- Custom weather intensity slider — fixed intensity per effect for V1
- Weather transitions (smooth fade between effects) — instant switch for V1
- Day/night cycle — future enhancement
