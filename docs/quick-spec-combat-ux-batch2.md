# Quick Spec: Combat UX Fixes — Batch 2 (9 itens)

**Data:** 2026-03-29
**Branch:** master (direct)
**Status:** ✅ Implementado + CR fixes aplicados (2026-03-30)

---

## Item 1 — Monstros 2024 não aparecem (P0)

**Problema:** Todos os 520 monstros em `monsters-2024.json` têm `is_srd: false`. O filtro em `srd-data-server.ts:21` faz `.filter(m => m.is_srd === true)` e remove tudo.

**Root cause:** O script `fetch-5etools-bestiary.ts` marca fontes XMM/XPHB/XDMG como `is_srd: false`.

**Fix:**
1. No script `scripts/fetch-5etools-bestiary.ts`, corrigir a lógica de `is_srd` para que monstros 2024 (XMM) sejam marcados como `is_srd: true`
2. Re-executar `npm run fetch-bestiary` para regenerar os JSONs
3. Verificar que o filtro server-side e client-side agora incluem monstros 2024

**Arquivos:** `scripts/fetch-5etools-bestiary.ts`, `public/srd/monsters-2024.json`

---

## Item 2 — Numeração duplicada de grupo (P1)

**Problema:** Ao adicionar dois grupos do mesmo monstro, a numeração reseta (1,2 + 1,2 ao invés de 1,2,3,4).

**Root cause:** `EncounterSetup.tsx:273` usa loop counter `i` ao invés de `getNumberedName()`.

**Fix:** No loop de `handleSelectMonsterGroup()`, usar `getNumberedName(monster.name, [...currentCombatants, ...newCombatants])` para cada iteração ao invés de `${monster.name} ${i}`.

**Arquivos:** `components/combat/EncounterSetup.tsx`

---

## Item 3 — Teclado bugado na edição de nome (grupo) (P1)

**Problema:** Edição de nome de monstro dentro de um grupo tem comportamento de teclado errado, podendo apagar o nome base.

**Fix:** Adicionar `onKeyDown` handler no input de nome em `CombatantSetupRow.tsx` com `e.stopPropagation()` para impedir que eventos de teclado propaguem para handlers pai (grupo colapsável, shortcuts globais).

**Arquivos:** `components/combat/CombatantSetupRow.tsx`, `components/combat/MonsterGroupHeader.tsx`

---

## Item 4 — Confirmação antes de remover combatant (P1)

**Problema:** O botão "Remover" executa direto sem confirmação.

**Fix:**
1. Envolver o botão "Remover" em `AlertDialog` (shadcn) nos dois contextos:
   - `CombatantSetupRow.tsx:344-352` (setup)
   - `CombatantRow.tsx:663-671` (combate ativo)
2. Texto do dialog:
   - Setup: "Remover {nome} do encontro?"
   - Combate: "Remover {nome} do combate? HP, condições e posição na iniciativa serão perdidos."

**Arquivos:** `components/combat/CombatantSetupRow.tsx`, `components/combat/CombatantRow.tsx`

---

## Item 5 — Contador de turnos nas condições (P1)

**Problema:** DM não sabe há quantos turnos uma condição está ativa.

**Implementação (diferente da spec original — mais simples e backwards-compatible):**
1. Adicionado campo separado `condition_durations?: Record<string, number>` no tipo `Combatant` — mantém `conditions: string[]` intacto
2. Em `toggleCondition`, setar `condition_durations[condition] = 0` on add, `delete` on remove
3. Em `advanceTurn`, incrementar `condition_durations[cond]++` para cada condição do combatant cujo turno está começando
4. Em `ConditionBadge.tsx`, prop `turnCount` exibe: `Frightened ②` usando circled digits Unicode (⓪-⑳)
5. `condition_durations` adicionado ao tipo `RealtimeConditionChange` para sync com players
6. Tooltip usa ICU plural: "3 turns" / "3 turnos"

**Decisão:** Usar campo separado ao invés de mudar a estrutura de `conditions[]` evita breaking changes em serialização, localStorage hydration, e realtime payloads.

**Arquivos:** `lib/types/combat.ts`, `lib/types/realtime.ts`, `lib/stores/combat-store.ts`, `lib/stores/guest-combat-store.ts`, `components/oracle/ConditionBadge.tsx`, `components/combat/CombatantRow.tsx`

---

## Item 6 — Header do guest não é sticky (P1)

**Problema:** No guest, o header com "Round X", "Next Turn" scrolla com o conteúdo.

**Root cause:** `GuestCombatClient.tsx:1041` usa `flex` sem `sticky`.

**Fix:** Aplicar wrapper `sticky top-0 z-30 bg-background pb-3 border-b border-white/[0.06] -mx-2 px-2 pt-1` com o flex container dentro. Mesma estrutura do logado (`CombatSessionClient.tsx:668`).

**Arquivos:** `components/guest/GuestCombatClient.tsx`

---

## Item 7 — ▶ clicável para passar turno (P2)

**Problema:** O indicador `▶` ao lado do nome é apenas visual.

**Fix:**
1. Trocar `<span>` por `<button>` em `CombatantRow.tsx:193-199`
2. Adicionar prop `onAdvanceTurn` ao `CombatantRow`
3. Estilo: `cursor-pointer hover:scale-125 transition-transform`
4. Tooltip: "Próximo Turno (Space)"

**Arquivos:** `components/combat/CombatantRow.tsx`, `components/session/CombatSessionClient.tsx`, `components/guest/GuestCombatClient.tsx`

---

## Item 8 — Headers de colunas invisíveis (P2)

**Problema:** `text-[10px] text-muted-foreground/60` — quase invisível.

**Fix:**
1. Em `EncounterSetup.tsx:735`: trocar para `text-xs font-medium text-muted-foreground`
2. Atualizar i18n: `setup_col_init` → "Iniciativa" / "Initiative"
3. Aplicar no guest se existir header equivalente

**Arquivos:** `components/combat/EncounterSetup.tsx`, `components/guest/GuestCombatClient.tsx`, `messages/pt-BR.json`, `messages/en.json`

---

## Item 9 — Timer de turno e combate (P2)

**Problema:** Não existe contagem de tempo por turno individual nem do combate total no DM logado.

**Fix:**
1. Adicionar `combatStartedAt` e `turnStartedAt` ao combat store
2. Setar em `startCombat()` e `advanceTurn()`
3. Criar/reutilizar `CombatTimer` + novo `TurnTimer`
4. Exibir no header sticky (logado + guest)

**Arquivos:** `lib/stores/combat-store.ts`, `components/combat/CombatTimer.tsx`, `components/session/CombatSessionClient.tsx`

---

## Ordem de Execução

| Ordem | Item | Esforço | Status |
|-------|------|---------|--------|
| 1 | Item 6 — Header sticky guest | ~5 min | ✅ |
| 2 | Item 8 — Headers visíveis | ~10 min | ✅ |
| 3 | Item 2 — Numeração grupo | ~15 min | ✅ |
| 4 | Item 3 — Teclado grupo | ~15 min | ✅ |
| 5 | Item 7 — ▶ clicável | ~10 min | ✅ |
| 6 | Item 4 — Confirm remover | ~20 min | ✅ |
| 7 | Item 1 — Monstros 2024 | ~30 min | ✅ |
| 8 | Item 5 — Contador condições | ~1h | ✅ |
| 9 | Item 9 — Timer turno | ~1h | ✅ |

---

## Code Review Fixes (2026-03-30)

CR adversarial encontrou 8 issues nos itens acima. Todos corrigidos no commit `fix(combat): CR fixes`:

### CR-1: toggleCondition não salvava condition_durations (CRITICAL)
- **Problema:** `toggleCondition` em ambos stores atualizava `conditions[]` mas não `condition_durations{}`, então o contador no badge nunca funcionava.
- **Fix:** Adicionado tracking de `condition_durations` — on add: `durations[condition] = 0`, on remove: `delete durations[condition]`
- **Arquivos:** `lib/stores/combat-store.ts`, `lib/stores/guest-combat-store.ts`

### CR-2: advanceTurn do guest não incrementava condition durations (CRITICAL)
- **Problema:** Só o combat-store tinha a lógica de incremento. Guest store ficou sem.
- **Fix:** Portada mesma lógica de incremento para `guest-combat-store.ts:advanceTurn`
- **Arquivos:** `lib/stores/guest-combat-store.ts`

### CR-3: Header do combate guest não era sticky (HIGH)
- **Problema:** Toolbar com "Round X" e "Next Turn" scrollava com o conteúdo no guest.
- **Fix:** Wrappado com `sticky top-0 z-30 bg-background` + closing tag correspondente
- **Arquivos:** `components/guest/GuestCombatClient.tsx`

### CR-4: AlertDialog faltando no CombatantRow — combate ativo (HIGH)
- **Problema:** AlertDialog foi adicionado no setup (CombatantSetupRow) mas esquecido no combate ativo.
- **Fix:** Import + wrapper AlertDialog no botão Remover + 4 i18n keys (`remove_confirm_*`)
- **Arquivos:** `components/combat/CombatantRow.tsx`, `messages/en.json`, `messages/pt-BR.json`

### CR-5: ▶ não era clicável para avançar turno (MEDIUM)
- **Problema:** Indicador de turno ainda era `<span>`, não `<button>`.
- **Fix:** Convertido para `<button>` com `onAdvanceTurn`, prop wired em CombatSessionClient e GuestCombatClient
- **Arquivos:** `components/combat/CombatantRow.tsx`, `components/session/CombatSessionClient.tsx`, `components/guest/GuestCombatClient.tsx`

### CR-6: Headers de colunas pouco visíveis (MEDIUM)
- **Problema:** `text-[10px] text-muted-foreground/60` praticamente invisível.
- **Fix:** Atualizado para `text-xs font-medium text-muted-foreground` + i18n "Iniciativa"/"Initiative"
- **Arquivos:** `components/combat/EncounterSetup.tsx`, `components/guest/GuestCombatClient.tsx`, `messages/*.json`

### CR-7: Group numbering conflitava no mid-combat guest (LOW)
- **Problema:** `handleMidCombatSelectMonsterGroup` usava `${monster.name} ${i}` (1-indexed) sem contar existentes.
- **Fix:** Conta combatants existentes com mesmo nome base antes de numerar
- **Arquivos:** `components/guest/GuestCombatClient.tsx`

### CR-8: TurnTimer flash de 0:00 (LOW)
- **Problema:** `setElapsed(0)` hardcoded causava flash visual antes do interval calcular.
- **Fix:** `setElapsed(Math.max(0, Math.floor((Date.now() - startTime) / 1000)))`
- **Arquivos:** `components/combat/TurnTimer.tsx`

---

## Mudanças adicionais (2026-03-30)

### Death Saves — Heal reset (regra D&D 5e)
- `applyHealing` em ambos stores agora reseta `death_saves` e `is_defeated` quando HP sobe de 0
- **Arquivos:** `lib/stores/combat-store.ts`, `lib/stores/guest-combat-store.ts`

### ConditionBadge — ICU plural tooltip
- `turnCount` tooltip usa formato ICU plural: `{count, plural, one {# turn} other {# turns}}`
- **Arquivos:** `components/oracle/ConditionBadge.tsx`, `messages/*.json`

### Player: Pass Turn button + hide other players' HP
- PlayerInitiativeBoard esconde HP numérico de outros players (só mostra tier/barra)
- Botão "Passar Turno" envia broadcast `player:end_turn` via Supabase Realtime
- CombatSessionClient escuta e avança turno automaticamente (valida que é turno de player)
- **Arquivos:** `components/player/PlayerInitiativeBoard.tsx`, `components/player/PlayerJoinClient.tsx`, `components/session/CombatSessionClient.tsx`
