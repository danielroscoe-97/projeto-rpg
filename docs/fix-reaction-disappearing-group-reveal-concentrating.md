# Fix: Reaction Disappearing + Monster Group Reveal + Concentrating Self-Toggle

**Data**: 2026-04-11
**Commit**: 2bb25df (bundled in audit commit)
**Origem**: Bug report durante sessao real — video do jogador mostrando reactions sumindo e grupo de monstros so revelando o primeiro.

---

## Bug 1: Reaction Tracker Sumindo da Tela dos Players

### Sintoma
O indicador de reaction (bolinha verde/vermelha) aparecia e depois sumia da tela do player sem motivo aparente.

### Root Cause
`reaction_used` e um campo **runtime-only** — existe no Zustand store do DM e nos broadcasts, mas **NAO existe como coluna no banco de dados**.

Quando o player faz `fetchFullState` (reconnect, polling fallback, ou visibility change), a API `/api/session/[id]/state` le do DB via SELECT. Como `reaction_used` nao e coluna do DB, o response vem sem o campo. O handler antigo fazia:

```
if (alguma_protecao_ativa) { merge com protecao } else { replace tudo }
```

Quando nenhuma protecao estava ativa (apos 5s), fazia replace total → `reaction_used` virava `undefined` → condicao da UI `reaction_used !== undefined` falhava → indicador sumia.

### Fix (PlayerJoinClient.tsx)
Removida a guarda condicional. Agora SEMPRE faz merge, preservando `reaction_used` do estado local quando o servidor nao tem o campo:

```typescript
// reaction_used is runtime-only (not in DB) — always preserve from local state
if (local && typeof local.reaction_used === "boolean" && sc.reaction_used === undefined) {
  merged = { ...merged, reaction_used: local.reaction_used };
}
```

### Auditoria Completa
Auditei TODOS os campos visiveis ao player. `reaction_used` era o UNICO campo que:
- Aparece na UI do player
- NAO existe no banco de dados
- Era sobrescrito com `undefined` pelo fetchFullState

Todos os outros campos (conditions, death_saves, HP, etc.) estao no DB e retornam pela API.

---

## Bug 2: Grupo de Monstros — So o Primeiro Aparecia

### Sintoma
Quando um grupo de monstros (ex: Goblin A, B, C — mesmo `monster_group_id`) chegava na vez na iniciativa durante Round 1, apenas o primeiro era revelado aos jogadores. Os demais apareciam como "Mystery Creature".

### Root Cause
O sistema de "progressive reveal" no Round 1 usava `maxRevealedIndex = currentTurnIndex`. Como os membros do grupo tinham indices sequenciais (ex: 3, 4, 5) e o `currentTurnIndex` apontava para o primeiro (3), apenas ele era revelado.

```typescript
// ANTES — so revelava ate o indice do turno atual
const isRevealed = (index) => index <= maxRevealedIndex;
```

### Fix (PlayerInitiativeBoard.tsx)
Duas mudancas:

1. **useEffect**: ao calcular `revealUpTo`, se o combatant atual tem `monster_group_id`, busca o maior indice do grupo:
```typescript
if (current?.monster_group_id) {
  for (let i = 0; i < combatants.length; i++) {
    if (combatants[i].monster_group_id === current.monster_group_id) {
      revealUpTo = Math.max(revealUpTo, i);
    }
  }
}
```

2. **isRevealed()**: alem de checar `index <= maxRevealedIndex`, agora tambem checa se o combatant pertence ao mesmo grupo do turno ativo:
```typescript
if (current?.monster_group_id && target?.monster_group_id &&
    current.monster_group_id === target.monster_group_id) {
  return true;
}
```

---

## Feature: Concentrating — Player Self-Toggle (Roxo)

### Decisao
Players agora podem marcar "Concentrating" neles mesmos, com cor roxa (bg-purple-600) separada dos buffs verdes (emerald). Segue o pattern existente de Concentration no ConditionBadge.

### Implementacao

1. **DM whitelist** (CombatSessionClient.tsx): `handleSelfConditionToggle` agora aceita `"concentrating"` e `"concentrating:SpellName"` alem dos `BENEFICIAL_CONDITIONS`
2. **Player UI** (PlayerInitiativeBoard.tsx): Botao roxo com icone Focus aparece primeiro no picker, antes dos buffs verdes. Aplicado nos 2 locais (desktop card + list view)
3. **DM persist** (CombatSessionClient.tsx): Adicionado `persistConditions()` no handler de self-conditions para que conditions auto-aplicadas sobrevivam ao fetchFullState

### Optimistic Update
Adicionado update otimista no player (PlayerJoinClient.tsx) para self-conditions — toggle local instantaneo antes do broadcast ao DM, igual ao pattern de reactions.

---

## Parity Check (Guest/Anon/Auth)

| Modo | Impactado? | Motivo |
|------|-----------|--------|
| Guest (`/try`) | NAO | Sem realtime, sem progressive reveal, sem self-conditions |
| Anon (`/join`) | SIM | Usa PlayerJoinClient + PlayerInitiativeBoard |
| Auth (`/join` via campanha) | SIM | Mesmo path que Anon |

Guest e intencionalmente inferior (teaser) — correto nao ter essas features.

---

## Arquivos Modificados

| Arquivo | Mudanca |
|---------|---------|
| `components/player/PlayerJoinClient.tsx` | reaction_used preserve + optimistic self-condition toggle |
| `components/player/PlayerInitiativeBoard.tsx` | Monster group reveal + Concentrating toggle (roxo) |
| `components/session/CombatSessionClient.tsx` | Concentrating whitelist + persistConditions no self-toggle |
