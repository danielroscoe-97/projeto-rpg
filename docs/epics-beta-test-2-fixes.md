# Epicos — Beta Test #2 Fixes

> **Objetivo**: Resolver TODOS os 15 itens do Beta Test #2 antes da proxima sessao.
> **Estrategia**: 5 frentes paralelas por stack/dependencia, 3 independentes + 2 dependentes.
> **Referencia**: `docs/beta-test-session-2-2026-04-09.md`

---

## EPIC A: Realtime Sync — "DM e a Fonte da Verdade"

**Prioridade**: P0 | **Itens**: BT2-01, BT2-02, BT2-03, BT2-04
**Objetivo**: Toda acao do DM deve refletir nos players em < 2s. Zero desync.

### Contexto Tecnico

O sistema usa Supabase Realtime com canal `session:{sessionId}`. O DM faz broadcast de eventos via `lib/realtime/broadcast.ts` e os players escutam em `PlayerJoinClient.tsx`. O problema e que **nem todas as acoes do DM disparam broadcast** e/ou **o player nao processa todos os eventos**.

### Tarefas

#### A1: Audit de cobertura de broadcast (investigacao)
- Mapear TODAS as acoes do DM em `CombatSessionClient.tsx` que alteram estado de combate
- Para cada acao, verificar se existe broadcast correspondente em `broadcast.ts`
- Para cada broadcast, verificar se existe listener correspondente em `PlayerJoinClient.tsx`
- Produzir uma tabela: Acao DM | Broadcast Event | Player Listener | Status (OK/MISSING)

#### A2: Fix — Broadcast de remocao de combatant (BT2-02)
- Quando DM remove um combatant, deve disparar broadcast `combat:combatant_removed`
- Player deve processar e remover o combatant do state local
- Verificar se `sanitizePayload` interfere

#### A3: Fix — Broadcast de adicao mid-combat (BT2-03)
- Quando DM adiciona monstro mid-combat, deve disparar broadcast com dados do novo combatant
- Player deve inserir na initiative list na posicao correta
- Testar com monstros agrupados (grupo de 3 goblins adicionados de uma vez)

#### A4: Fix — Refresh de lobby pre-combate (BT2-04)
- Na tela "Iniciando Combate", implementar polling ou subscription que mostra players entrando
- Cada player que entra deve aparecer em tempo real para os outros
- Pode ser via broadcast `combat:player_joined` ou polling do endpoint de session_tokens

#### A5: Full state sync periodico (safety net)
- Implementar broadcast `combat:full_state_sync` que o DM envia a cada ~30s
- Contem: lista completa de combatants, turno atual, round atual
- Player usa como reconciliation — se divergiu, corrige
- Isso e o fallback absoluto contra desync

### Criterios de Aceite
- [ ] DM remove criatura -> desaparece em < 2s na tela do player
- [ ] DM adiciona monstro mid-combat -> aparece na initiative do player em < 2s
- [ ] DM avanca turno -> player ve turno correto em < 2s
- [ ] Lobby pre-combate mostra players entrando em tempo real
- [ ] Full state sync a cada 30s previne drift acumulado

### Arquivos Principais
- `lib/realtime/broadcast.ts`
- `components/session/CombatSessionClient.tsx`
- `components/player/PlayerJoinClient.tsx`
- `lib/realtime/sanitize.ts`

### Conexao com Outras Frentes
- **Frente D** depende da infra de broadcast estar consistente
- **Frente E** depende do protocolo de sync estar definido (A5 e a base do offline sync)

---

## EPIC B: Token Identity System — "Link por ID, nao por Nome"

**Prioridade**: P0 | **Itens**: BT2-05, BT2-06
**Objetivo**: Vincular combatant ao session_token por ID. Renomear nunca quebra reconexao.

### Contexto Tecnico

Hoje `session_tokens.player_name` e `combatants.name` sao independentes. O match de reconexao e por string exata do nome. Se DM renomeia, player perde o vinculo.
Doc completo: `docs/bug-token-name-mismatch.md` — **Option A recomendada**.

### Tarefas

#### B1: Migration — Adicionar `session_token_id` na tabela `combatants`
```sql
ALTER TABLE combatants ADD COLUMN session_token_id UUID REFERENCES session_tokens(id);
CREATE INDEX idx_combatants_session_token ON combatants(session_token_id);
```

#### B2: Backend — DM link automatico
- Quando DM cria combatant e ja existe um session_token com nome similar, sugerir link
- Quando player faz late-join e DM aprova, setar `combatants.session_token_id = token.id`
- Manter nome do combatant independente (DM pode chamar como quiser)

#### B3: Frontend — Reconexao por ID
- Em `PlayerJoinClient.tsx`, alterar late-join matching:
  - PRIMEIRO: buscar combatant onde `session_token_id = meu_token.id`
  - FALLBACK: match por nome (backwards compat)
- Se encontrou por ID, reconexao e instantanea sem DM aprovar

#### B4: Frontend — DM UI de link manual
- No card do combatant (DM view), mostrar icone se tem token linkado
- Opcao de "Vincular a jogador" com dropdown dos session_tokens ativos
- Opcao de "Desvincular jogador"

#### B5: Broadcast — Notificar player do link
- Quando DM linka token a combatant, broadcast `combat:player_linked`
- Player recebe e atualiza seu state local com o combatant_id correto

### Criterios de Aceite
- [ ] DM renomeia combatant -> player continua conectado e recebendo updates
- [ ] Player reconecta apos crash -> encontra combatant por token_id, nao por nome
- [ ] DM pode vincular/desvincular player a combatant manualmente
- [ ] Backwards compatible: sessoes sem link ainda funcionam por nome

### Arquivos Principais
- `supabase/migrations/` (nova migration)
- `components/player/PlayerJoinClient.tsx`
- `components/session/CombatSessionClient.tsx`
- `docs/bug-token-name-mismatch.md`

### Conexao com Outras Frentes
- **Frente A**: O broadcast de link (B5) usa a infra de broadcast
- **Frente E**: Reconexao apos crash depende do link por ID estar funcionando

---

## EPIC C: UI/Visual Polish — "Pixel Perfect para Mesa"

**Prioridade**: P1-P2 | **Itens**: BT2-07, BT2-08, BT2-09, BT2-10, BT2-11, BT2-12
**Objetivo**: Fixes visuais puros. ZERO dependencia de backend.

### Tarefas

#### C1: Fix — Texto "CRITICAL" legivel (BT2-07)
- Localizar o label de HP status "CRITICAL" na barra de HP
- Adicionar `text-shadow: 0 0 4px rgba(0,0,0,0.8)` ou `stroke` CSS
- Testar em fundos claros e escuros
- **PARITY**: Aplicar em Guest + Player + DM views (regra de combat parity)

#### C2: Fix — Animacao mobile menos agressiva (BT2-08)
- Localizar animacao de blink/pulse (provavelmente turn indicator ou current-turn highlight)
- Reduzir `animation-duration` de ~0.5s para ~2s
- Usar `ease-in-out` em vez de `linear`
- Testar em mobile real (Chrome DevTools nao replica bem)

#### C3: Fix — AC visivel para o DM (BT2-09)
- No card de combatant na DM view, mostrar AC de forma proeminente
- AC deve aparecer para TODOS os combatants (monstros E jogadores)
- Sugestao: badge com icone de escudo + numero ao lado do nome

#### C4: Fix — Expandir grupo na player view (BT2-10)
- Identificar componente de grupo na player view
- Verificar se o handler de expand esta conectado
- Garantir que ao expandir, mostra monstros individuais com status de cada um

#### C5: Fix — Monstros agrupados mostram individuais (BT2-11)
- Na player view, um grupo de 3 goblins deve mostrar 3 entries individuais
- Cada um com seu HP status (LIGHT/MODERATE/HEAVY/CRITICAL)
- NAO mostrar HP exato — apenas o tier (regra de sanitizacao)
- Verificar se `sanitizePayload` esta enviando dados individuais ou agrupados

#### C6: Fix — Marcador "(voce)" na lista de players (BT2-12)
- Na lista de jogadores ativos dentro do combate, identificar o player atual
- Adicionar "(voce)" ou "(you)" ao lado do nome (i18n)
- Usar `session_token` local para saber qual e o "eu"

### Criterios de Aceite
- [ ] "CRITICAL" e legivel em qualquer fundo
- [ ] Animacao mobile e sutil e confortavel (~2s cycle)
- [ ] DM ve AC de todos os combatants sem cliques extras
- [ ] Grupos expandem corretamente na player view
- [ ] Monstros agrupados aparecem individualmente com status proprio
- [ ] Player ve "(voce)" ao lado do seu nome

### Arquivos Principais
- Componentes de HP bar (buscar por "CRITICAL" ou "hp_status")
- Componentes de turn indicator (buscar por "pulse", "blink", "animate")
- Componentes de combatant card (DM view e player view)
- Componentes de initiative list (player view)

### Conexao com Outras Frentes
- **NENHUMA** — pode rodar 100% em paralelo
- C5 pode ter overlap com A3 (como dados de grupo sao broadcastados)

---

## EPIC D: Player Agency — "Reacoes Bidirecionais"

**Prioridade**: P1 | **Itens**: BT2-13, BT2-14
**Objetivo**: Players marcam reacao na sua tela, DM ve na dele. Auto-descarrega no turno.
**Depende de**: EPIC A (broadcast infra consistente)

### Contexto Tecnico

Hoje o broadcast e unidirecional: DM -> Players. Esta epic introduz broadcast bidirecional: Player -> DM.
Isso abre precedente para futuras features de player agency (ready action, dodge, etc).

### Tarefas

#### D1: Design — Protocolo de broadcast Player -> DM
- Definir evento `player:reaction_toggle` com payload: `{ tokenId, hasReaction: boolean }`
- Player envia no mesmo canal `session:{sessionId}`
- DM recebe e atualiza UI
- Definir regras de rate-limit (max 1 toggle por segundo)

#### D2: Frontend — UI de reacao no player
- Adicionar botao/toggle de "Reacao" na barrinha de acoes do player
- Icone claro (ex: raio/relampago do D&D)
- Estado visual: ativo (cor highlight) / inativo (cinza)
- Ao clicar, toggle e broadcast para DM

#### D3: Frontend — UI de reacao no DM
- No card do combatant (player), mostrar indicador de reacao
- Badge ou icone ao lado do nome quando player tem reacao disponivel
- DM pode ver quais players ainda tem reacao

#### D4: Auto-descarrega no turno
- Quando o turno avanca para o player, sua reacao reseta automaticamente
- Broadcast `combat:turn_advance` deve triggerar reset da reacao
- Player pode re-ativar manualmente se quiser manter

#### D5: Persistencia em memoria (nao DB)
- Reacoes sao efemeras — vivem apenas no state do combate (Zustand)
- NAO persistir no DB (complexidade desnecessaria)
- Se player reconecta, reacao reseta (aceitavel)

### Criterios de Aceite
- [ ] Player marca reacao -> DM ve em < 2s
- [ ] Player desmarca reacao -> DM ve em < 2s
- [ ] Turno do player chega -> reacao reseta automaticamente
- [ ] UI e clara e acessivel em mobile
- [ ] Nao sobrecarrega o canal de broadcast

### Conexao com Outras Frentes
- **Frente A**: Usa a mesma infra de broadcast (canal, sanitize)
- **Frente B**: Usa token_id para identificar player (nao nome)
- Abre caminho para futuras acoes: ready action, dodge, dash

---

## EPIC E: DM Offline Resilience — "Jogo Nao Para"

**Prioridade**: P0 | **Itens**: BT2-15
**Objetivo**: DM continua jogando mesmo se o servidor cair. Sync completo quando reconecta.
**Depende de**: EPIC A (protocolo de full state sync)

### Contexto Tecnico

O DM ja usa Zustand para state local de combate. O problema e que quando o servidor cai, as operacoes do DM (avancar turno, dar dano, adicionar monstro) nao sao enfileiradas — elas tentam broadcast e falham silenciosamente. Quando reconecta, o state do player esta desatualizado.

### Tarefas

#### E1: Design — Queue de operacoes offline
- Criar interface `OfflineOperation { type, payload, timestamp }`
- Quando broadcast falha, empurrar operacao para a queue
- Queue persiste em localStorage (sobrevive a refresh)

#### E2: Deteccao de offline
- Monitorar `navigator.onLine` + falha de broadcast como sinais
- Quando detecta offline:
  - Mostrar banner sutil "Modo offline — jogando localmente"
  - Continuar operando normalmente com Zustand state
  - Enfileirar todas as operacoes

#### E3: Sync de reconexao
- Quando detecta online novamente:
  - Opcao 1 (simples): Enviar `combat:full_state_sync` com o state completo atual do DM
  - Opcao 2 (robusta): Replay da queue de operacoes em ordem
  - **Recomendado**: Opcao 1 — e mais simples e o full state sync (A5) ja resolve
- Mostrar banner "Reconectado — sincronizando..."
- Apos sync, limpar queue e banner

#### E4: Player-side graceful degradation
- Quando player detecta que broadcasts pararam (>30s sem evento):
  - Mostrar banner "Aguardando mestre..." (nao erro)
  - NAO mostrar tela de erro ou formulario de reconexao
  - Quando broadcasts voltam, atualizar automaticamente

### Criterios de Aceite
- [ ] Servidor cai -> DM continua jogando normalmente
- [ ] DM faz 5 acoes offline -> reconecta -> players recebem state atualizado
- [ ] Player ve banner informativo durante offline, nao tela de erro
- [ ] Queue de operacoes sobrevive a refresh do browser

### Conexao com Outras Frentes
- **Frente A**: Full state sync (A5) e o mecanismo de reconciliacao
- **Frente B**: Token ID linkage garante que reconexao pos-crash nao perde vinculo

---

## Grafo de Dependencias e Ordem de Execucao

```
FASE 1 (paralelo imediato):
  ├── EPIC A: Realtime Sync ──────── [3 agentes: audit + fixes + full sync]
  ├── EPIC B: Token Identity ─────── [1 agente: migration + frontend]
  └── EPIC C: UI/Visual ─────────── [1 agente: 6 fixes CSS/React]

FASE 2 (apos A estabilizar):
  ├── EPIC D: Player Reactions ───── [1 agente: broadcast bidirecional + UI]
  └── EPIC E: DM Offline ────────── [1 agente: queue + sync]
```

## Mega-Prompt para Execucao Paralela

Para iniciar as 3 frentes da Fase 1 em paralelo, usar o seguinte comando:

> "Execute as frentes A, B e C do Beta Test #2 em paralelo. Cada frente deve ser um agente independente. Frente A: Realtime Sync (audit + fixes). Frente B: Token Identity (migration + frontend). Frente C: UI/Visual (6 fixes CSS). Referencia: docs/epics-beta-test-2-fixes.md e docs/beta-test-session-2-2026-04-09.md"

Para a Fase 2 (apos Fase 1 deployada):

> "Execute as frentes D e E do Beta Test #2 em paralelo. Frente D: Player Reactions (broadcast bidirecional + UI). Frente E: DM Offline Resilience (queue + full state sync). Referencia: docs/epics-beta-test-2-fixes.md"
