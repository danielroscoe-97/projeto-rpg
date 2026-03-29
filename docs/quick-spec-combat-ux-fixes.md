# Quick Spec: Combat UX Fixes (5 itens)

**Data:** 2026-03-29
**Status:** Aprovado — escopo fechado

---

## Fix 1 — Histórico de Rolls no Guest (`/try`)

**Problema:** O `DiceHistoryPanel` só está montado no layout logado (`app/app/layout.tsx`), não aparece na rota `/try`.

**Solução:**
- Adicionar `<DiceHistoryPanel />` no `app/try/layout.tsx`
- Posicionar acima do `OracleFAB` (que será movido — Fix 5)

**Arquivos:**
- `app/try/layout.tsx` — adicionar import + render

---

## Fix 2 — Nome do Monstro no Histórico de Rolls

**Problema:** O histórico mostra só o nome da ação (ex: "Rejuvenation") sem indicar **qual monstro** rolou. O campo `source` existe no `RollResult` mas nunca é populado.

**Solução:**
1. Adicionar prop `source?: string` em `ClickableRoll` e `DiceText`
2. Passar `source` no `RollResult` ao disparar o `CustomEvent`
3. `MonsterStatBlock` já tem `monster.name` — passar como `source` para `DiceText` e `ClickableRoll`
4. `DiceHistoryPanel` já renderiza `result.source` (linha 144-146) — nenhuma mudança necessária no painel

**Formato no histórico:**
```
20:16:35  Goblin 2 — Rejuvenation          4
          1d10 [4]
```

**Arquivos:**
- `components/dice/ClickableRoll.tsx` — nova prop `source`, incluir no `RollResult` antes de dispatch
- `components/dice/DiceText.tsx` — nova prop `source`, repassar para `ClickableRoll`
- `components/oracle/MonsterStatBlock.tsx` — passar `monster.name` como `source`

---

## Fix 3 — Barra de Espaço no Guest Combat

**Problema:** `useCombatKeyboardShortcuts` está integrado no `CombatSessionClient` (logado) mas **não** no `GuestCombatClient`. Spacebar não avança turno no guest.

**Solução:**
- Importar e chamar `useCombatKeyboardShortcuts` no `GuestCombatClient` com os callbacks apropriados do guest store
- Habilitar apenas quando `phase === "combat"`

**Arquivos:**
- `components/guest/GuestCombatClient.tsx` — adicionar hook

---

## Fix 4 — "Derrotar" Zera HP + Desabilita Botão

**Problema:** O botão "Derrotar" só toggle `is_defeated` sem alterar o HP. Expectativa: monstro "toma o dano" e vai a HP 0.

**Solução:**
1. **Ao derrotar** (`is_defeated = true`):
   - Salvar `hp_before_defeat = current_hp` no undo stack
   - Setar `current_hp = 0`
   - Marcar `is_defeated = true`

2. **Undo** (Ctrl+Z):
   - Restaurar `current_hp = hp_before_defeat`
   - Restaurar `is_defeated = false`

3. **Botão desabilitado** em combatentes já derrotados:
   - Não mostrar "Reviver" — remover o toggle
   - O botão fica `disabled` / oculto quando `is_defeated === true`
   - Reverter via Undo apenas

**Arquivos:**
- `lib/types/combat.ts` — adicionar `previousHp` no UndoEntry de `defeated`
- `lib/stores/combat-store.ts` — `setDefeated()` salva HP + zera; undo restaura HP
- `lib/stores/guest-combat-store.ts` — `setDefeated()` zera HP
- `components/combat/CombatantRow.tsx` — desabilitar botão quando `is_defeated`

---

## Fix 5 — Mover Botão `?` (OracleFAB)

**Problema:** O `OracleFAB` (botão `?` dourado) ocupa `bottom-6 right-6`, mesmo spot do `DiceHistoryPanel` → colisão visual.

**Solução:**
- Mover `OracleFAB` para `bottom-6 left-6` (canto inferior esquerdo)
- Canto inferior direito fica exclusivo para o `DiceHistoryPanel`

**Arquivos:**
- `components/oracle/OracleFAB.tsx` — mudar `right-6` para `left-6`

---

## Checklist de QA

- [ ] Guest: rolar dado no stat block → aparece no histórico com nome do monstro
- [ ] Guest: spacebar avança turno durante combate
- [ ] Guest: "Derrotar" zera HP, botão fica desabilitado
- [ ] Guest: Ctrl+Z após derrotar restaura HP e botão
- [ ] Logado: mesmos comportamentos
- [ ] Logado: broadcast de `combat:defeated_change` + `combat:hp_update`
- [ ] Botão `?` no canto inferior esquerdo, sem colisão com histórico
