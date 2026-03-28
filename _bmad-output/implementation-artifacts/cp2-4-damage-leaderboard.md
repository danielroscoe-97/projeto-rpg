# Story CP.2.4: Combat Stats & Damage Leaderboard

Status: ready-for-dev

## Story

**Como** DM e jogadores, **queremos** ver um resumo de dano e cura por combatente ao final do combate **para que** possamos celebrar momentos épicos e compartilhar nas redes sociais.

## Context

O combat-log-store (`lib/stores/combat-log-store.ts`) já rastreia todas as ações de combate com `CombatLogEntry` contendo `type`, `actorName`, `targetName`, e `details.damageAmount`. A base de dados existe — precisamos apenas agregar e apresentar.

A Shieldmaiden tem damage leaderboards e é uma das features mais elogiadas pelos usuários: "My players LOVE when I share the damage leaderboards after combat."

**UX Assessment:** VERDE — Risco BAIXO. É um overlay PÓS-COMBATE que não compete com o combate ativo. Zero botões novos durante o combate.

## Acceptance Criteria

1. Create `lib/utils/combat-stats.ts`:
   ```typescript
   interface CombatantStats {
     name: string;
     totalDamageDealt: number;
     totalDamageReceived: number;
     totalHealing: number;
     knockouts: number;        // times reduced to 0 HP
     criticalHits: number;     // isNat20 entries
     criticalFails: number;    // isNat1 entries
   }

   function computeCombatStats(entries: CombatLogEntry[]): CombatantStats[]
   ```
   - Aggregate by `actorName` for damage dealt, by `targetName` for damage received
   - Sort by `totalDamageDealt` descending (MVP first)

2. Create `components/combat/CombatLeaderboard.tsx`:
   - Full-screen overlay that appears when DM clicks "End Encounter"
   - Dark background with gold accents (brand palette)
   - Header: encounter name + round count + "Combat Complete"
   - **MVP Section:** Top damager highlighted with crown icon and gold border
   - **Rankings:** Numbered list with bar chart visualization:
     - Name | Damage Dealt bar | Number
     - Color: gold for #1, silver for #2, bronze for #3, muted for rest
   - **Secondary Stats Row** (horizontal scroll on mobile):
     - Most Damage Taken: 🛡️ name (amount)
     - Top Healer: 💚 name (amount)
     - Most Crits: ⚔️ name (count)
   - **Action Buttons:**
     - "Compartilhar" — uses `navigator.share()` or copies text summary to clipboard
     - "Fechar" — dismisses overlay and returns to session
   - Animate entry with staggered fade-in (framer-motion)

3. Integration with End Encounter flow:
   - In `CombatSessionClient.tsx`, when `handleEndEncounter` is called:
     - Compute stats from `useCombatLogStore.getState().entries`
     - Show `CombatLeaderboard` overlay BEFORE clearing the combat log
     - Only clear log after user dismisses the leaderboard
   - If combat log is empty (no actions recorded), skip leaderboard

4. Share text format (for clipboard/share):
   ```
   ⚔️ Pocket DM — Combat Results
   Encounter: [name] | Rounds: [N]

   🏆 MVP: [name] — [damage] damage
   🥈 [name] — [damage] damage
   🥉 [name] — [damage] damage

   🛡️ Tank: [name] ([damage] received)
   💚 Healer: [name] ([amount] healed)
   ```

5. Player View broadcast:
   - When leaderboard is shown, broadcast `session:combat_stats` event to player view
   - Player view shows a simplified leaderboard overlay (same ranking, fewer details)
   - Auto-dismiss after 30 seconds on player view (DM controls their own dismissal)

## i18n Keys

Add to `messages/pt-BR.json` and `messages/en.json`:
- `combat.leaderboard_title`: "Resultado do Combate" / "Combat Results"
- `combat.leaderboard_mvp`: "MVP do Combate" / "Combat MVP"
- `combat.leaderboard_damage_dealt`: "Dano Causado" / "Damage Dealt"
- `combat.leaderboard_damage_taken`: "Dano Recebido" / "Damage Taken"
- `combat.leaderboard_healing`: "Cura" / "Healing"
- `combat.leaderboard_crits`: "Críticos" / "Critical Hits"
- `combat.leaderboard_share`: "Compartilhar" / "Share"
- `combat.leaderboard_close`: "Fechar" / "Close"
- `combat.leaderboard_rounds`: "{rounds} rounds" / "{rounds} rounds"

## Technical Notes

- Stats computation is pure function — easy to unit test
- No new DB tables — everything aggregated from in-memory combat log
- Leaderboard is ephemeral — appears once, then gone (no persistence needed)
- Broadcast to player view reuses existing `session:` event pattern
- Share API has graceful fallback to clipboard for browsers that don't support `navigator.share()`

## Out of Scope

- Persistent stats across sessions (future: campaign-level stats)
- Detailed per-round breakdown (future enhancement)
- Screenshot/image generation for sharing (future: html2canvas)
