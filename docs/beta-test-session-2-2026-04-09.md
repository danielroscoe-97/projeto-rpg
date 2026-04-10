# Beta Test Session #2 — 2026-04-09

> **Sessao**: Presencial, campanha "Curse of Strahd"
> **DM**: Luiz Alexandre
> **Players**: Lucca, Victor, Daniel
> **Duracao**: ~2h (22:30 - 00:30)
> **Severidade geral**: ALTA — app crashou durante sessao (504 cascade), desync severo entre DM e players

---

## Incidente Critico

O servidor Supabase retornou 504 (timeout cascade) durante a sessao, derrubando o app para todos.
Fix emergencial ja deployado no commit `34c3b94` (timeouts, backoff, parallel queries).
Porem, apos o crash, a reconexao dos players falhou devido ao bug de token-name mismatch (doc: `docs/bug-token-name-mismatch.md`).

---

## Feedback Consolidado — 15 Itens

### Legenda de Severidade
- **P0** = Blocker (impede uso)
- **P1** = Major (experiencia degradada significativamente)
- **P2** = Minor (incomodo, workaround existe)
- **P3** = Nice-to-have

---

### BT2-01: Desync geral entre visao DM e Players
- **Severidade**: P0
- **Descricao**: Turnos, nomes, adicoes e remocoes de combatentes nao refletem consistentemente na visao dos players. O PC do DM e a fonte da verdade mas os players ficam defasados.
- **Frente**: A (Realtime Sync)

### BT2-02: DM deletar criatura nao reflete nos players
- **Severidade**: P0
- **Descricao**: Quando o mestre deleta uma criatura do combate, ela some da tela do DM mas continua aparecendo na visao dos players.
- **Frente**: A (Realtime Sync)

### BT2-03: Monstros adicionados mid-combat nao aparecem pros players
- **Severidade**: P0
- **Descricao**: Adicoes de monstros durante o combate nao refletem corretamente no turno dos jogadores. Monstros novos nao aparecem ou aparecem incorretamente.
- **Frente**: A (Realtime Sync)

### BT2-04: Tela "Iniciando Combate" nao atualiza lista de players
- **Severidade**: P1
- **Descricao**: Na tela de pre-combate, os players nao veem outros jogadores entrando em tempo real. Precisa de refresh para que todos vejam a galera aparecendo na sala de espera.
- **Frente**: A (Realtime Sync)

### BT2-05: Token-name mismatch quebra reconexao
- **Severidade**: P0
- **Descricao**: Quando o DM renomeia um combatant (ex: "Kamuy" -> "Kai"), o player perde o vinculo com aquele aparelho. Reconexao falha porque match e por string exata.
- **Doc existente**: `docs/bug-token-name-mismatch.md`
- **Solucao recomendada**: Option A — link por session_token_id no combatant
- **Frente**: B (Token Identity)

### BT2-06: DM renomear player desvincula aparelho
- **Severidade**: P0
- **Descricao**: Quando o jogador coloca o nome errado e o mestre muda o nome, desvincula aquele aparelho daquele nome. Updates param de chegar.
- **Relacionado**: BT2-05 (mesmo root cause — match por nome)
- **Frente**: B (Token Identity)

### BT2-07: Texto de critico ilegivel
- **Severidade**: P2
- **Descricao**: O texto "CRITICAL" na barra de HP nao e legivel. Precisa de fonte branca, contorno ou sombra para contraste.
- **Frente**: C (UI/Visual)

### BT2-08: Animacao mobile piscando muito rapido
- **Severidade**: P1
- **Descricao**: Na versao mobile dos jogadores, o indicador visual (provavelmente turn indicator) esta piscando muito rapido. Precisa ser MUITO mais sutil, senao fica ruim de olhar pra tela.
- **Frente**: C (UI/Visual)

### BT2-09: DM nao ve AC de monstros e jogadores facilmente
- **Severidade**: P1
- **Descricao**: Na visao do mestre, ele deveria conseguir ver a AC de todos os monstros e todos os jogadores facilmente. Atualmente nao esta aparecendo de forma acessivel.
- **Frente**: C (UI/Visual)

### BT2-10: Expandir grupo nao funciona na visao do player
- **Severidade**: P1
- **Descricao**: Dentro da visao do jogador, clicar para expandir um grupo de monstros nao expande corretamente.
- **Frente**: C (UI/Visual)

### BT2-11: Monstros agrupados — players veem so um
- **Severidade**: P1
- **Descricao**: Quando tem monstro em grupo, os jogadores estao vendo so um monstro. Devem ver todos os individuais com status de cada um, nao o status do grupo todo.
- **Frente**: C (UI/Visual)

### BT2-12: Lista de players ativos sem marcador "(voce)"
- **Severidade**: P2
- **Descricao**: Na tela de combate, a lista de jogadores ativos deve mostrar todos os players E ter o nome do proprio jogador entre parenteses "(voce)" para auto-identificacao.
- **Frente**: C (UI/Visual)

### BT2-13: Players nao conseguem marcar reacao
- **Severidade**: P1
- **Descricao**: Os jogadores deveriam conseguir usar reacao e esse tipo de coisa para aparecer para o mestre. Deve ser um atalho facil na barrinha do player. Reacao auto-descarrega no turno do jogador (ou pode tirar/por manualmente).
- **Frente**: D (Player Agency)

### BT2-14: Reacao do player deve refletir pro DM
- **Severidade**: P1
- **Descricao**: Quando o player marca reacao, isso deve refletir na barrinha do DM para o mestre ver. Broadcast bidirecional player->DM.
- **Frente**: D (Player Agency)

### BT2-15: DM offline resilience (server crash)
- **Severidade**: P0
- **Descricao**: Quando o servidor cai, o DM deve continuar conseguindo jogar localmente (Zustand state). Quando a conexao volta, manda um "hello" completo pro servidor com tudo que ele fez offline.
- **Frente**: E (DM Offline Resilience)

---

## Organizacao por Frentes de Trabalho

As frentes sao organizadas por stack/dependencia para permitir trabalho paralelo com agentes diferentes.

### Frente A: Realtime Sync & Broadcast
**Stack**: Supabase Realtime, broadcast events, PlayerJoinClient.tsx, CombatSessionClient.tsx
**Itens**: BT2-01, BT2-02, BT2-03, BT2-04
**Prioridade**: P0 — Maior dor dos players
**Descricao**: O DM e a fonte da verdade. Toda acao do DM (add/remove/rename combatant, advance turn) deve ser broadcastada e refletida nos players em < 2s. Hoje o broadcast existe mas e inconsistente — muitas acoes do DM nao disparam broadcast ou o player nao processa o evento.

**Arquivos-chave**:
- `lib/realtime/broadcast.ts` — funcoes de broadcast do DM
- `components/session/CombatSessionClient.tsx` — lado DM
- `components/player/PlayerJoinClient.tsx` — lado Player (listeners)
- `lib/realtime/sanitize.ts` — sanitizacao de payload

### Frente B: Token Identity System
**Stack**: Supabase DB (session_tokens, combatants), PlayerJoinClient.tsx
**Itens**: BT2-05, BT2-06
**Prioridade**: P0 — Reconexao quebrada
**Descricao**: Vincular combatant ao session_token por ID em vez de nome. Resolver o match por string exata que causa falha de reconexao quando DM renomeia.

**Arquivos-chave**:
- `docs/bug-token-name-mismatch.md` — spec completo com 4 opcoes
- `components/player/PlayerJoinClient.tsx` — late-join matching logic
- Schema: `session_tokens`, `combatants` (migration necessaria)

### Frente C: UI/Visual Polish
**Stack**: React, Tailwind CSS, Framer Motion — ZERO dependencia de backend
**Itens**: BT2-07, BT2-08, BT2-09, BT2-10, BT2-11, BT2-12
**Prioridade**: P1-P2
**Descricao**: Fixes puramente visuais que podem rodar 100% em paralelo com as outras frentes.

**Sub-itens**:
- BT2-07: Adicionar text-shadow ou stroke no label "CRITICAL"
- BT2-08: Reduzir velocidade de animacao de blink (CSS animation-duration)
- BT2-09: Mostrar AC inline nos cards de combatant (DM view)
- BT2-10: Fix expand/collapse de grupos na player view
- BT2-11: Renderizar monstros individuais do grupo para players (nao apenas summary)
- BT2-12: Adicionar "(voce)" ao lado do nome do player na lista

### Frente D: Player Agency — Reactions
**Stack**: Supabase Realtime (broadcast bidirecional), UI do player, UI do DM
**Itens**: BT2-13, BT2-14
**Prioridade**: P1
**Descricao**: Feature nova — players marcam reacao na barrinha, broadcast player->DM, DM ve na interface. Auto-descarrega no turno do player.
**Depende de**: Frente A (broadcast infra deve estar funcional)

### Frente E: DM Offline Resilience
**Stack**: Zustand state management, queue de operacoes, reconexao
**Itens**: BT2-15
**Prioridade**: P0
**Descricao**: O DM ja usa Zustand pra state local. Precisa de um mecanismo de queue que acumula operacoes quando offline e faz sync completo quando reconecta.
**Depende de**: Frente A (precisa do broadcast infra pra fazer o sync)

---

## Grafo de Dependencias

```
Frente C (UI/Visual) ──────────── INDEPENDENTE (pode comecar agora)
Frente B (Token Identity) ─────── INDEPENDENTE (pode comecar agora)
Frente A (Realtime Sync) ─────── INDEPENDENTE (pode comecar agora)
Frente D (Player Agency) ─────── DEPENDE de A (broadcast infra)
Frente E (DM Offline) ────────── DEPENDE de A (sync protocol)
```

**Ordem recomendada**: Comecar A + B + C em paralelo. D e E apos A estabilizar.

---

## Comparacao com Beta Test #1

| Aspecto | Sessao 1 (2026-04-02) | Sessao 2 (2026-04-09) |
|---------|----------------------|----------------------|
| Crash | Nao | Sim (504 cascade) |
| Reconexao | Maior blocker | Ainda blocker (token-name) |
| Desync | Reportado | Mais detalhado, mais itens |
| UI | Basico | Detalhes finos (critico, blink) |
| Player agency | Nao discutido | Reacoes solicitadas |
| Offline DM | Nao discutido | Solicitado apos crash |

**Conclusao**: Realtime sync continua sendo o #1 pain point. O crash revelou fragilidade na resiliencia. Players querem mais agencia (reacoes). UI polish esta no radar agora que o basico funciona.
