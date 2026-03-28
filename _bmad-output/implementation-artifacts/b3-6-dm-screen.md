# Story B.3.6: DM Screen (Quick Reference Panel)

Status: ready-for-dev — NEEDS DISCUSSION

## Story

**Como** DM, **quero** um painel de referência rápida com regras, soundboard, status dos jogadores e encounters num só lugar **para que** eu tenha tudo à mão sem navegar entre telas.

## Context

A Shieldmaiden tem um "DM Screen" como feature separada: acesso rápido a regras SRD, soundboard, players, e encounters. É um mini-app dentro do app.

No Pocket DM, muitas dessas funcionalidades já existem distribuídas:
- Compendium/Oracle: regras, monstros, spells
- Combat view: HP dos players, condições, iniciativa
- Audio controls: soundboard
- Command palette (Ctrl+K): busca rápida

**UX Assessment:** VERMELHO — Risco ALTO. É um SURFACE NOVO inteiro (nova rota, nova navigation). Construir quando as surfaces existentes ainda estão evoluindo = duplicação e manutenção dupla. **ESPECIFICAR PARA REFERÊNCIA FUTURA, NÃO CODAR AGORA.** O compendium + combat view + command palette já cobrem 80%.

## Acceptance Criteria (Future Implementation)

1. New route: `/app/dm-screen`
   - Accessible from navbar and command palette
   - Full-screen layout with configurable panels

2. Panel-based layout (drag to rearrange):
   ```
   ┌──────────────────────────────────────────┐
   │  DM Screen                    [⚙️] [✕]   │
   ├─────────────┬────────────┬───────────────┤
   │  📋 Rules   │ 🎵 Sound  │  👥 Players    │
   │             │            │               │
   │ ▸ Conditions│ [Tavern]   │ Aldric  32/45 │
   │ ▸ Actions   │ [Battle]   │ Lyra    28/30 │
   │ ▸ Cover     │ [Ambient]  │ Thorin  15/40 │
   │ ▸ Rest      │ [Thunder]  │               │
   │             │            │ ⚔️ Encounters  │
   │             │            │ ▸ Goblin Camp  │
   │             │            │ ▸ Dragon Lair  │
   ├─────────────┴────────────┴───────────────┤
   │  🔍 Quick Search: [_________________]     │
   └──────────────────────────────────────────┘
   ```

3. Panels:
   - **Rules Panel:** Common D&D rules (conditions, actions in combat, cover, grapple, rest). Static content from SRD, collapsible sections.
   - **Soundboard Panel:** Quick access to audio presets. One-click play. Reuses existing audio infrastructure.
   - **Players Panel:** Live HP/AC/conditions for all players in active campaign. Real-time updates if session is active.
   - **Encounters Panel:** List of encounters in current campaign. Click to launch into combat tracker.
   - **Quick Search:** Embedded command palette for monster/spell lookup without leaving the DM Screen.

4. Customization:
   - Panels can be reordered via drag-and-drop
   - Panels can be collapsed/expanded
   - Layout preference saved in localStorage
   - Responsive: on mobile, panels stack vertically (accordion)

5. Integration with active combat:
   - If a combat session is active, the Players panel shows live data
   - "Return to Combat" button always visible when combat is active
   - DM Screen and Combat can be used side-by-side on wide screens (split view)

## Technical Notes

- Each panel is a standalone component that can be developed independently
- Rules content is static markdown — can be pre-rendered at build time
- Players panel reuses campaign player data from existing stores
- Soundboard panel wraps existing `DmAudioControls` component
- Quick Search wraps existing command palette logic

## Why Deferred

- **Surface proliferation** — adding a new top-level route when existing surfaces are unstable increases maintenance burden
- **80% coverage already** — compendium + combat view + command palette cover most DM Screen use cases
- **Mobile challenge** — DM Screen by definition wants space; mobile is our primary target and space is limited
- **Sequential dependency** — the DM Screen is best built AFTER combat is fully stable (it aggregates combat data)
- **Revisit when** — combat features are complete and stable, and we're looking to improve the DM's "between combats" experience (Q3 2026)

## Estimated Effort

- Size: G+ (Grande — 5+ dias, new route + multiple panels)
- Risk: Medium (reuses existing components but needs new layout system)
- Dependencies: Stable combat system, campaign management, audio infrastructure
