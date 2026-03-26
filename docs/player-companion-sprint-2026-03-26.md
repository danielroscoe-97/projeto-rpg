# Sprint: Player Combat Companion — 2026-03-26

**Status:** ✅ IMPLEMENTADO
**Objetivo:** Transformar a player view de um display passivo em um companion de combate presencial completo — com lobby self-service, progressive reveal, e zero vazamento de dados de monstros.
**Contexto:** Jogadores estão presencialmente na mesa, com fichas de papel e dados físicos. O app é apenas a "TV do combate no bolso" — acompanhar turnos, ver ordem de iniciativa, saber o estado narrativo dos monstros (sem números).

---

## Decisões de Design

1. **Mesa presencial** — Jogadores têm ficha e dados na mão. App não substitui isso.
2. **HP labels de monstros** — LIGHT (70-100%, verde), MODERATE (40-70%, amarelo), HEAVY (10-40%, vermelho), CRITICAL (<10%, caveira preta)
3. **Zero dados numéricos de monstros** — Jogador nunca vê AC, HP exato, temp HP, spell save DC, notas do DM
4. **Submit once** — Jogador preenche nome/iniciativa/HP/AC no lobby e depois não controla mais nada. Só o DM edita.
5. **Progressive reveal** — Round 1: combatentes aparecem conforme o DM avança turnos. Round 2+: visão completa.
6. **Share antes do combate** — DM gera QR/link na página da sessão, não só durante combate ativo.

---

## Stream 1 — Data Leak Fix + HP Labels (P0, CRÍTICO)

**Por quê:** Hoje o realtime broadcast vaza HP exato e AC de monstros para jogadores. Game-breaking.

### 1.1 — Strip dados sensíveis do broadcast realtime

**Arquivo:** `lib/realtime/broadcast.ts`

**AC (Acceptance Criteria):**
- [ ] Eventos `combat:hp_update` NÃO incluem `current_hp`, `max_hp`, `temp_hp` para combatants com `is_player=false` — enviam apenas `hp_status` (LIGHT/MODERATE/HEAVY/CRITICAL)
- [ ] Eventos `combat:stats_update` NÃO incluem `ac`, `spell_save_dc`, `max_hp`, `current_hp` para non-players
- [ ] Eventos `session:state_sync` aplicam a mesma filtragem por combatant
- [ ] Eventos `combat:combatant_add` strip AC, HP exato, spell_save_dc de non-players
- [ ] Eventos `combat:initiative_reorder` strip dados sensíveis de non-players
- [ ] `dm_notes` continua sendo stripped (já funciona)

**Implementação:**
- Criar função `stripMonsterStats(combatant)` que retorna combatant sem `current_hp`, `max_hp`, `temp_hp`, `ac`, `spell_save_dc` e com `hp_status` calculado
- Aplicar em `sanitizePayload()` para todos os eventos que contêm combatant data

### 1.2 — Strip dados sensíveis da API `/state`

**Arquivo:** `app/api/session/[id]/state/route.ts`

**AC:**
- [ ] Response NÃO inclui `ac`, `spell_save_dc` para non-player combatants
- [ ] Response NÃO inclui `temp_hp` para non-player combatants
- [ ] Response inclui `hp_status` (LIGHT/MODERATE/HEAVY/CRITICAL) para non-player combatants
- [ ] Response mantém HP exato apenas para `is_player=true`

### 1.3 — HP Status Labels System

**Arquivos:** `lib/types/combat.ts`, novo util `lib/utils/hp-status.ts`

**AC:**
- [ ] Função `getHpStatus(currentHp, maxHp)` retorna:
  - `"LIGHT"` quando HP > 70% do max
  - `"MODERATE"` quando HP entre 40-70%
  - `"HEAVY"` quando HP entre 10-40%
  - `"CRITICAL"` quando HP < 10%
- [ ] Tipo `HpStatus = 'LIGHT' | 'MODERATE' | 'HEAVY' | 'CRITICAL'` exportado
- [ ] Função é usada tanto no broadcast quanto na API

### 1.4 — PlayerInitiativeBoard: render HP labels

**Arquivo:** `components/player/PlayerInitiativeBoard.tsx`

**AC:**
- [ ] Monstros (is_player=false): mostra label colorido ao invés de HP bar
  - LIGHT: texto verde + ícone de coração ou escudo
  - MODERATE: texto amarelo + ícone warning
  - HEAVY: texto vermelho + ícone danger
  - CRITICAL: texto vermelho escuro + ícone caveira 💀
- [ ] Monstros NÃO mostram AC em nenhum lugar
- [ ] Player characters (is_player=true): continuam mostrando HP exato com barra
- [ ] Nenhum combatant mostra `spell_save_dc` na player view
- [ ] Labels têm text alternative para acessibilidade (aria-label)

---

## Stream 2 — Player Lobby & Self-Registration (P0)

**Por quê:** O DM precisa compartilhar a sessão antes do combate, e jogadores precisam se auto-cadastrar para eliminar trabalho manual do DM.

### 2.1 — Share disponível antes do combate

**Arquivos:** `components/session/CombatSessionClient.tsx`, `components/session/ShareSessionButton.tsx`, possivelmente Navbar

**AC:**
- [ ] Botão "Compartilhar Sessão" visível na página da sessão ANTES de iniciar combate
- [ ] Funciona no header/toolbar da sessão, não apenas no toolbar de combate ativo
- [ ] Mantém funcionalidade existente (gerar token, copiar link, QR code)
- [ ] QR code exibido de forma proeminente (não escondido atrás de toggle)
- [ ] Botão de copiar link ao lado do QR code

### 2.2 — Player Lobby UI

**Arquivo:** novo componente `components/player/PlayerLobby.tsx`

**AC:**
- [ ] Formulário com campos:
  - **Nome do personagem** (obrigatório, text input, max 50 chars)
  - **Iniciativa** (obrigatório, number input, min 1, max 30)
  - **HP** (opcional, number input, min 1)
  - **AC** (opcional, number input, min 1, max 30)
- [ ] Botão "Entrar no Combate" / "Pronto!" (gold, proeminente)
- [ ] Após submit: tela de espera "Aguardando o DM iniciar o combate..."
- [ ] Na tela de espera: mostra lista de jogadores que já entraram (atualiza em tempo real)
- [ ] Jogador NÃO pode editar dados após submit
- [ ] Se combate já está ativo quando jogador entra: pula lobby, vai direto pra initiative board
- [ ] Mobile-first: campos grandes, touch-friendly (≥44px)
- [ ] Visual consistente com o tema dark do app

### 2.3 — Player Self-Registration API

**Arquivo:** nova server action ou API route `lib/supabase/player-registration.ts`

**AC:**
- [ ] Endpoint/action `registerPlayerCombatant(tokenId, sessionId, data)`:
  - Cria combatant com `is_player=true`
  - Vincula ao session token
  - Campos: name (required), initiative_order (required), current_hp/max_hp (optional), ac (optional)
  - Se HP não informado: `current_hp=null`, `max_hp=null` (DM preenche depois)
  - Se AC não informado: `ac=null`
- [ ] Broadcast `combat:combatant_add` para o canal da sessão (DM vê em tempo real)
- [ ] Validação: nome não vazio, iniciativa entre 1-30, HP > 0 se informado, AC 1-30 se informado
- [ ] Um token só pode registrar UM combatant (previne duplicatas)
- [ ] RLS: jogador anônimo pode criar combatant apenas para sessão vinculada ao seu token

### 2.4 — DM vê jogadores entrando em tempo real

**Arquivo:** `components/combat/EncounterSetup.tsx` ou `components/session/CombatSessionClient.tsx`

**AC:**
- [ ] No setup de encounter (antes de iniciar combate), jogadores que se registram aparecem automaticamente na lista de combatentes
- [ ] Card do jogador mostra: nome, iniciativa, HP (se informado), AC (se informado)
- [ ] DM pode editar qualquer campo do jogador registrado
- [ ] DM pode remover jogador que entrou errado
- [ ] Animação sutil de entrada (fade-in) quando novo jogador aparece
- [ ] Contagem de jogadores conectados visível

### 2.5 — Waiting Room (jogador aguardando)

**Arquivo:** `components/player/PlayerJoinClient.tsx` + `components/player/PlayerLobby.tsx`

**AC:**
- [ ] Antes do combate: jogador registrado vê tela "Aguardando o DM iniciar o combate..."
- [ ] Lista de jogadores já registrados (atualiza em tempo real via broadcast)
- [ ] Nome da sessão visível
- [ ] Quando DM inicia combate: transição automática para initiative board (progressive reveal no round 1)
- [ ] Sem refresh manual necessário

---

## Stream 3 — Progressive Reveal (P1)

**Por quê:** No round 1, os combatentes devem ser revelados conforme o DM avança turnos — criando suspense e impedindo meta-gaming.

### 3.1 — Lógica de revelação

**Arquivo:** `components/player/PlayerInitiativeBoard.tsx`

**AC:**
- [ ] **Round 1:** Apenas combatentes cujo turno já aconteceu OU é o turno atual são visíveis
- [ ] Combatentes ainda não revelados ficam ocultos (não aparecem na lista)
- [ ] Conforme DM avança turno: próximo combatente aparece com animação
- [ ] **Round 2+:** Todos os combatentes visíveis (revelação completa)
- [ ] Lógica baseada em `current_turn_index` e `round_number` recebidos via realtime
- [ ] Se jogador entra no meio do round 1: vê todos os combatentes que já tiveram turno

### 3.2 — UI de estado "escuro"

**Arquivo:** `components/player/PlayerInitiativeBoard.tsx`

**AC:**
- [ ] Antes de qualquer turno (round 1, turn 0): tela com "Combate iniciado..." e animação sutil (pulso ou fade)
- [ ] Contagem de combatentes revelados vs total oculto: "3 de ? combatentes revelados"
- [ ] Visual escuro/misterioso no round 1 (background mais escuro, borda diferente)
- [ ] Transição suave quando round 2 começa (todos aparecem com staggered fade-in)

### 3.3 — Animação de revelação

**Arquivo:** `components/player/PlayerInitiativeBoard.tsx`

**AC:**
- [ ] Combatente novo aparece com fade-in + slide-down (200-300ms)
- [ ] Animação não interfere no auto-scroll do turno atual
- [ ] Performance: CSS transitions, não JS animations
- [ ] Respeita `prefers-reduced-motion` (sem animação nesse caso)

---

## Stream 4 — Polish & QA (P2)

### 4.1 — Mobile touch audit

**Arquivo:** `components/player/PlayerInitiativeBoard.tsx`, `components/player/PlayerLobby.tsx`

**AC:**
- [ ] Todos os elementos interativos ≥ 44x44px
- [ ] Espaçamento adequado entre touch targets
- [ ] Input fields com font-size ≥ 16px (previne zoom no iOS)

### 4.2 — Session/token expiry messaging

**Arquivo:** `components/player/PlayerJoinClient.tsx`

**AC:**
- [ ] Quando sessão é encerrada pelo DM: mensagem "Sessão encerrada pelo DM" com ícone
- [ ] Quando token expira: mensagem "Link expirado, peça um novo ao DM"
- [ ] Sem tela de erro genérica

### 4.3 — i18n keys

**Arquivos:** `messages/pt-BR.json`, `messages/en.json`

**AC:**
- [ ] Todas as novas strings têm chaves i18n nos dois idiomas
- [ ] Namespace `player` para lobby, waiting room, HP labels
- [ ] Namespace `combat` para HP status labels usados no broadcast

---

## Ordem de Execução

```
Fase 1 (AGORA):     Stream 1 — Data leak fixes + HP labels
Fase 2 (SEGUIDA):   Stream 2 — Lobby + self-registration + share flow
Fase 3 (DEPOIS):    Stream 3 — Progressive reveal
Fase 4 (POLISH):    Stream 4 — Touch audit + expiry + i18n
```

**Único blocker entre fases:** Stream 3 depende de Stream 1 (HP labels existirem) para renderizar corretamente na revelação.

---

## Arquivos Impactados (Resumo)

| Arquivo | Stream | Tipo |
|---------|--------|------|
| `lib/realtime/broadcast.ts` | 1 | Modificar |
| `lib/utils/hp-status.ts` | 1 | Criar |
| `lib/types/combat.ts` | 1 | Modificar |
| `app/api/session/[id]/state/route.ts` | 1 | Modificar |
| `components/player/PlayerInitiativeBoard.tsx` | 1, 3, 4 | Modificar |
| `components/session/ShareSessionButton.tsx` | 2 | Modificar |
| `components/session/CombatSessionClient.tsx` | 2 | Modificar |
| `components/player/PlayerLobby.tsx` | 2, 4 | Criar |
| `lib/supabase/player-registration.ts` | 2 | Criar |
| `components/combat/EncounterSetup.tsx` | 2 | Modificar |
| `components/player/PlayerJoinClient.tsx` | 2, 4 | Modificar |
| `messages/pt-BR.json` | 4 | Modificar |
| `messages/en.json` | 4 | Modificar |

---

## Backlog (Pós-Sprint)

Itens identificados mas NÃO incluídos:
- [ ] Dice roller (jogadores têm dados físicos na mesa)
- [ ] Character sheet (jogadores têm ficha de papel)
- [ ] Chat entre jogadores (estão na mesma mesa)
- [ ] Slot tracking (ficha de papel)
- [ ] DM → Player broadcast messaging (post-MVP)
- [ ] Quick action buttons (post-MVP)
