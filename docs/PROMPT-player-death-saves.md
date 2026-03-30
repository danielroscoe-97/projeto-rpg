# Prompt: Implementar Player Death Saves

Leia a spec completa em `docs/quick-spec-player-death-saves.md` e implemente tudo que está descrito lá.

## Resumo do que fazer

O player conectado via `/join/[token]` precisa poder ver e marcar seus próprios Death Saves quando está em 0 HP durante o turno dele. Hoje só o DM pode fazer isso.

## Ordem de implementação sugerida

1. Adicionar `"player:death_save"` ao type union em `lib/types/realtime.ts`
2. Adicionar listener `player:death_save` no `CombatSessionClient.tsx` (DM side) — no mesmo useEffect do `player:end_turn`, usando o mesmo padrão de ref estável
3. Incluir `death_saves` no state sync payload em `lib/realtime/broadcast.ts`
4. No `PlayerJoinClient.tsx`, passar death saves do combatant para o `PlayerInitiativeBoard`
5. No `PlayerInitiativeBoard.tsx`, importar `DeathSaveTracker` e renderizar para o own char quando HP=0, com botões ativos apenas no turno do player
6. Implementar `handleDeathSave` que envia broadcast via `channelRef`
7. Adicionar as 2 i18n keys em ambos locales

## Regras

- Reutilizar o `DeathSaveTracker` existente em `components/combat/DeathSaveTracker.tsx` — não criar componente novo
- Usar o padrão de `useRef` para callbacks estáveis (como foi feito no `player:end_turn` listener)
- Toda mudança de death save no DM side deve fazer broadcast via `combat:hp_update` para que outros players vejam
- 3 failures auto-defeat via `addDeathSaveFailure` no store (já implementado)
- Rodar `npx tsc --noEmit` e `npx next build` ao final para garantir zero erros
- Fazer commit com mensagem descritiva

## Contexto técnico

- `PlayerInitiativeBoard` recebe `channelRef` (RealtimeChannel), `registeredName`, e `combatants` (PlayerCombatant[])
- O own char é identificado por `registeredName` matching `combatant.name`
- `DeathSaveTracker` aceita props: `successes`, `failures`, `onAddSuccess`, `onAddFailure`
- O DM channel singleton é via `getDmChannel(sessionId)` em `lib/realtime/broadcast.ts`
- Death saves no store: `combatant.death_saves?: { successes: number; failures: number }`
