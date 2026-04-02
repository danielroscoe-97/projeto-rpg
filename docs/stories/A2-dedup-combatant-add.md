# A.2 — Deduplicacao no Handler de combatant_add

**Epic:** A — Estabilidade do Realtime Player  
**Prioridade:** Alta  
**Estimativa:** 2 SP  
**Arquivo principal:** `components/player/PlayerJoinClient.tsx`

---

## Resumo

O handler de broadcast `combat:combatant_add` no `PlayerJoinClient` faz append cego no array de combatentes sem verificar se o ID ja existe. Isso causa duplicacao visual de combatentes na tela do jogador em cenarios de rede instavel, reconexao de WebSocket ou aprovacao tardia (late-join) combinada com polling.

---

## Contexto

Na linha 548 de `PlayerJoinClient.tsx`, o handler `combat:combatant_add` executa:

```typescript
updateCombatants((prev) => [...prev, payload.combatant]);
```

Nao ha nenhuma verificacao se `payload.combatant.id` ja existe em `prev`. Isso permite duplicatas nos seguintes cenarios:

1. **Turnos rapidos do DM** — O DM avanca turnos rapidamente, gerando multiplos broadcasts enfileirados. Se dois broadcasts carregam o mesmo combatente (ex: state_sync + combatant_add), o jogador ve a entrada duplicada.
2. **Late-join + polling simultaneo** — Quando um jogador entra tarde, a aprovacao do DM dispara um broadcast `combatant_add`. Se o polling periodico (fetchSession) tambem detecta o novo combatente e faz `updateCombatants(data.combatants)`, ha uma janela de race condition.
3. **Reconexao de WebSocket** — Ao reconectar, eventos perdidos podem ser reenviados pelo Supabase Realtime, causando replay do `combatant_add` para combatentes ja presentes no array local.

### Auditoria de todos os `updateCombatants` no arquivo

| Linha | Evento / Contexto | Padrao | Risco de Duplicacao |
|-------|--------------------|--------|---------------------|
| 392 | `fetchSession` (com death save protection) | `.map()` sobre serverList | Nenhum — substitui inteiro |
| 408 | `fetchSession` (sem protection) | Atribuicao direta | Nenhum — substitui inteiro |
| 437 | `session:state_sync` | Atribuicao direta | Nenhum — substitui inteiro |
| 508 | `combat:hp_update` | `.map()` por ID | Nenhum — atualiza existente |
| 526 | `combat:condition_change` | `.map()` por ID | Nenhum — atualiza existente |
| 537 | `combat:defeated_change` | `.map()` por ID | Nenhum — atualiza existente |
| **548** | **`combat:combatant_add`** | **`[...prev, payload]`** | **ALTO — append cego** |
| 572 | `combat:combatant_remove` | `.filter()` por ID | Nenhum — remove |
| 577 | `combat:version_switch` | `.map()` por ID | Nenhum — atualiza existente |
| 588 | `combat:stats_update` | `.map()` por ID | Nenhum — atualiza existente |
| 601 | `combat:initiative_reorder` | Atribuicao direta | Nenhum — substitui inteiro |
| 1280 | Death save optimistic update | `.map()` por ID | Nenhum — atualiza existente |

**Conclusao:** O unico ponto vulneravel e a linha 548 (`combat:combatant_add`).

---

## Criterios de Aceite

1. O handler `combat:combatant_add` verifica se `payload.combatant.id` ja existe no array antes de fazer append.
2. Se o ID ja existir, o combatente existente e atualizado (merge) com os dados do payload em vez de criar entrada duplicada.
3. Qualquer outro handler que faca append ao array de combatentes recebe a mesma protecao de dedup (auditoria acima confirma que hoje so a linha 548 precisa).
4. Teste unitario cobre a logica de dedup: append quando novo, merge quando duplicado.
5. Quando uma duplicata e detectada, um `console.warn` e emitido com o ID do combatente para facilitar debug em producao.

---

## Abordagem Tecnica

### 1. Funcao auxiliar de upsert

Criar uma funcao pura (testavel isoladamente) que encapsula a logica de dedup:

```typescript
function upsertCombatant(
  prev: PlayerCombatant[],
  incoming: PlayerCombatant
): PlayerCombatant[] {
  const existingIndex = prev.findIndex((c) => c.id === incoming.id);
  if (existingIndex === -1) {
    // Novo combatente — append normal
    return [...prev, incoming];
  }
  // Duplicata detectada — merge sobre o existente
  if (process.env.NODE_ENV !== "production") {
    console.warn(
      `[PlayerJoinClient] Dedup: combatant_add for existing ID ${incoming.id} (${incoming.name}) — merging instead of appending`
    );
  }
  return prev.map((c, i) =>
    i === existingIndex ? { ...c, ...incoming } : c
  );
}
```

### 2. Aplicar no handler

```typescript
.on("broadcast", { event: "combat:combatant_add" }, ({ payload }) => {
  if (payload.combatant) {
    updateCombatants((prev) => upsertCombatant(prev, payload.combatant));
    // ... resto da logica de late-join permanece igual
  }
})
```

### 3. Log condicional

O `console.warn` usa guard de `NODE_ENV` para nao poluir console em producao. Opcionalmente, pode-se usar `captureError` do projeto (`lib/errors/capture.ts`) para logar no Sentry quando duplicata acontece, permitindo monitorar frequencia em prod.

### 4. Handler de remove (verificacao)

O handler `combat:combatant_remove` (linha 572) ja usa `.filter()` — se o ID nao existir, simplesmente nao remove nada. Nenhuma mudanca necessaria.

---

## Arquivos a Modificar

| Arquivo | Mudanca |
|---------|---------|
| `components/player/PlayerJoinClient.tsx` | Extrair `upsertCombatant()`, aplicar no handler da linha 548, adicionar log de dedup |
| `__tests__/player/upsert-combatant.test.ts` (novo) | Testes unitarios para a funcao `upsertCombatant` |

---

## Plano de Testes

### Testes Unitarios (`upsert-combatant.test.ts`)

1. **Append quando novo** — Array vazio + combatente = array com 1 item.
2. **Append quando ID diferente** — Array com combatente A + combatente B = array com 2 itens.
3. **Merge quando ID duplicado** — Array com combatente A + combatente A (dados atualizados) = array com 1 item contendo dados mesclados.
4. **Merge preserva campos locais** — Se o combatente existente tem campos que o payload nao envia, eles sao preservados (spread `{ ...c, ...incoming }`).
5. **Ordem preservada** — Apos merge, o combatente fica na mesma posicao do array (nao vai pro final).

### Teste Manual (QA)

1. Abrir sessao como DM + Player em abas separadas.
2. DM adiciona combatente — Player ve exatamente 1 entrada.
3. Simular reconexao (DevTools > Network > Offline > Online) — Player nao ve duplicatas.
4. DM avanca turnos rapidamente apos adicionar combatente — Player nao ve duplicatas.
5. Testar late-join: Player entra tarde, DM aprova — Player ve exatamente 1 entrada propria.

---

## Notas de Paridade

- **Guest Combat (`GuestCombatClient`):** Usa Zustand store local, sem broadcasts. Combatentes sao gerenciados diretamente pelo componente sem canal realtime. Nao precisa de dedup.
- **DM Combat:** O DM e a source of truth — ele nao recebe `combatant_add` de si mesmo via broadcast (o Supabase nao reenvia para o emissor por padrao com `self: false`). Nao precisa de dedup.
- **Escopo:** Esta story e exclusiva para a view do Player (`PlayerJoinClient.tsx`).

---

## Definicao de Pronto

- [ ] Funcao `upsertCombatant` extraida e aplicada no handler
- [ ] Console.warn emitido quando duplicata detectada
- [ ] Testes unitarios passando (5 cenarios)
- [ ] QA manual: nenhuma duplicata em reconexao, late-join e turnos rapidos
- [ ] Code review aprovado
