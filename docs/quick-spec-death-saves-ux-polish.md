# Quick Spec: Death Saves UX Polish — Player View

**Data:** 2026-03-30
**Status:** Pronto para implementação
**Depende de:** Player Death Saves (já implementado em `462680b`)

---

## Contexto

A feature Player Death Saves está funcional mas a análise UX identificou 5 melhorias de polish para a experiência do jogador no mobile e desktop.

## Mudanças

### 1. Touch targets maiores no player context

**Arquivo:** `components/combat/DeathSaveTracker.tsx`

- Adicionar prop `playerContext?: boolean` (default false)
- Quando `playerContext=true`, botões usam `min-h-[44px] px-4 py-2 text-sm` em vez de `min-h-[24px] px-2 py-0.5 text-xs`
- `PlayerInitiativeBoard` passa `playerContext={true}`

### 2. Desktop own-char card — mostrar DeathSaveTracker

**Arquivo:** `components/player/PlayerInitiativeBoard.tsx`

- No bloco `hasOwnChar && ownChar` (desktop, `hidden lg:block`), adicionar DeathSaveTracker quando `current_hp === 0 && max_hp > 0 && !is_defeated`
- Botões ativos só quando `isPlayerTurn`, senão `readOnly`
- Mostrar mensagem "É seu turno — role seu Teste contra Morte!" no turno

### 3. Debounce nos botões de death save

**Arquivo:** `components/player/PlayerInitiativeBoard.tsx`

- Estado `deathSavePending` + cooldown ref de 2s (igual `endTurnPending`)
- Guard `if (deathSavePending) return` no `handleDeathSave`
- Reset quando turno muda

### 4. Death saves na PlayerBottomBar (mobile)

**Arquivo:** `components/player/PlayerBottomBar.tsx`

- Novas props: `deathSaves?`, `isPlayerTurn?`, `onDeathSave?`, `deathSavePending?`
- Quando HP=0, max_hp > 0, !is_defeated: mostrar DeathSaveTracker em vez da barra de HP
- Usar `playerContext={true}` e `readOnly={!isPlayerTurn}`

### 5. Label read-only com i18n key existente

**Arquivo:** `components/player/PlayerInitiativeBoard.tsx`

- No modo read-only (fora do turno), mostrar `t("death_saves_waiting")` antes do tracker
- Key já existe em ambos locales

---

## Arquivos a modificar

| Arquivo | Mudança |
|---------|---------|
| `components/combat/DeathSaveTracker.tsx` | Prop `playerContext` |
| `components/player/PlayerInitiativeBoard.tsx` | Desktop card, debounce, label read-only |
| `components/player/PlayerBottomBar.tsx` | Death saves no mobile |

## Critérios de aceite

- [ ] Botões de death save têm 44px+ no player view
- [ ] Desktop own-char card mostra death saves quando HP=0
- [ ] Double-click prevenido por debounce de 2s
- [ ] Bottom bar mobile mostra death saves em vez de HP quando HP=0
- [ ] Label "Testes contra Morte" aparece no modo read-only
- [ ] `npx tsc --noEmit` e `npx next build` passam sem erros
