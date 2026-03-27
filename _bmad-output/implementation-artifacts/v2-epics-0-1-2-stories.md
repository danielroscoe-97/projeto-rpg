---
story_key: v2-epics-0-1-2-stories
epics: [0, 1, 2]
status: draft
created: 2026-03-27
updated: 2026-03-27
prd_version: '2.0'
input_documents:
  - docs/prd-v2.md
  - _bmad-output/planning-artifacts/architecture.md
  - _bmad-output/planning-artifacts/prd.md
---

# V2 Stories — Epic 0, Epic 1, Epic 2

---

## Epic 0: Tech Debt Cleanup

Resolver debitos tecnicos criticos que causam bugs, falhas silenciosas ou UX ruim antes de adicionar features V2. Zero eslint-disable para type safety, zero catch blocks vazios, rate limit persistente em ambiente serverless.

---

### Story 0.1: Corrigir catch blocks vazios com feedback ao usuario

As a **developer**,
I want to replace empty catch blocks with proper error handling and user feedback,
So that users see meaningful error messages instead of silent failures, and errors are tracked in Sentry for debugging.

**FRs/NFRs:** TD1
**Dependencias:** Nenhuma
**Estimativa:** 2h
**Arquivos afetados:** `components/player/PlayerLobby.tsx:64`, `components/oracle/OracleAIModal.tsx:150`

**Acceptance Criteria:**

**Cenario 1: Falha no registro do jogador (PlayerLobby)**

**Given** um jogador esta preenchendo o formulario de registro no PlayerLobby
**When** a chamada `onRegister()` lanca uma excecao (ex: falha de rede, erro do servidor)
**Then** o catch block captura o erro e exibe um Toast com mensagem traduzivel (i18n key: `player.register_error`)
**And** o estado `isSubmitting` e resetado para `false`, permitindo nova tentativa
**And** o erro e reportado ao Sentry com contexto (session name, player name tentado)
**And** o botao de submissao volta ao estado habilitado

**Cenario 2: Falha no parse de SSE chunk (OracleAIModal)**

**Given** o Oracle AI esta em streaming e recebe um chunk SSE malformado
**When** o `JSON.parse(data)` dentro do loop de streaming falha
**Then** o catch block registra um `console.warn` com o chunk malformado para debugging
**And** o streaming continua processando os proximos chunks sem interromper a resposta
**And** nenhum erro visivel e exibido ao usuario (chunks malformados sao esperados em streaming)

**Cenario 3: Cobertura de Sentry**

**Given** qualquer um dos catch blocks corrigidos captura um erro
**When** o erro nao e um `AbortError` (cancelamento intencional) nem um chunk SSE malformado
**Then** `Sentry.captureException(error)` e chamado com metadata relevante
**And** o erro aparece no dashboard do Sentry com tags do componente de origem

**Definition of Done:**
- [ ] Zero catch blocks vazios em `PlayerLobby.tsx` e `OracleAIModal.tsx`
- [ ] Toast de erro visivel no PlayerLobby quando registro falha
- [ ] Sentry.captureException integrado nos catches relevantes
- [ ] `next build` passa sem erros TypeScript

---

### Story 0.2: Corrigir useEffect dependency arrays com eslint-disable

As a **developer**,
I want to fix all useEffect hooks that suppress the `react-hooks/exhaustive-deps` ESLint rule,
So that effects react correctly to dependency changes, preventing stale closures and unpredictable re-renders.

**FRs/NFRs:** TD2
**Dependencias:** Nenhuma
**Estimativa:** 3h
**Arquivos afetados:**
- `components/guest/GuestCombatClient.tsx:76`
- `components/dice/DiceHistoryPanel.tsx:41`
- `components/combat/EncounterSetup.tsx:89`
- `components/combat/MonsterSearchPanel.tsx:140`

**Acceptance Criteria:**

**Cenario 1: GuestCombatClient — limpeza de erro ao mudar combatants**

**Given** o componente GuestCombatClient tem um useEffect que limpa `submitError` e `invalidInitIds` quando `combatants` muda
**When** a dependencia `combatants` e a unica listada no array (eslint-disable removido)
**Then** as funcoes `setSubmitError` e `setInvalidInitIds` sao estabilizadas via useCallback ou verificacao condicional para evitar loops infinitos
**And** o comentario `// eslint-disable-next-line react-hooks/exhaustive-deps` e removido
**And** o comportamento funcional permanece identico: erro limpo quando combatants muda

**Cenario 2: DiceHistoryPanel — markRead ao abrir painel**

**Given** o componente DiceHistoryPanel tem um useEffect que chama `markRead()` quando `isOpen` muda para `true`
**When** a funcao `markRead` e incluida no dependency array
**Then** `markRead` e estabilizada com useCallback no componente pai ou via useRef
**And** o comentario `// eslint-disable-next-line react-hooks/exhaustive-deps` e removido
**And** o painel continua marcando entradas como lidas corretamente ao abrir

**Cenario 3: EncounterSetup — limpeza de erro ao mudar combatants**

**Given** o componente EncounterSetup tem um useEffect identico ao do GuestCombatClient (limpa submitError/invalidInitIds)
**When** a dependencia `combatants` e corretamente declarada sem eslint-disable
**Then** funcoes setter (`setSubmitError`, `setInvalidInitIds`) sao reconhecidas como estaveis (useState setters sao estaveis por definicao do React)
**And** somente `combatants` precisa estar no dependency array; setters nao causam re-execucao
**And** o comentario `// eslint-disable-next-line react-hooks/exhaustive-deps` e removido

**Cenario 4: MonsterSearchPanel — load de dados por rulesetVersion**

**Given** o componente MonsterSearchPanel tem um useEffect que carrega monstros do SRD quando `rulesetVersion` muda
**When** todas as dependencias reais sao incluidas no array (alem de `rulesetVersion`)
**Then** dependencias de funcao (ex: funcoes de load, traduzir) sao estabilizadas via useCallback ou useRef
**And** o load de monstros continua sendo disparado exatamente uma vez por mudanca de `rulesetVersion`
**And** o comentario `// eslint-disable-next-line react-hooks/exhaustive-deps` e removido
**And** nenhum request duplicado ocorre ao trocar de versao

**Definition of Done:**
- [ ] Zero `eslint-disable-next-line react-hooks/exhaustive-deps` nos 4 arquivos listados
- [ ] Todos os useEffect afetados tem dependency arrays completos
- [ ] Comportamento funcional identico (verificado manualmente em cada fluxo)
- [ ] `next build` passa sem warnings de ESLint

---

### Story 0.3: Migrar rate limit do Oracle AI para Supabase

As a **developer**,
I want to replace the in-memory rate limit Map in the Oracle AI API route with a Supabase `rate_limits` table and `check_rate_limit()` RPC,
So that rate limiting works correctly across multiple serverless instances on Vercel, preventing abuse in production.

**FRs/NFRs:** TD3, NFR14
**Dependencias:** Nenhuma (nao depende de schema V2)
**Estimativa:** 4h
**Arquivos afetados:**
- `app/api/oracle-ai/route.ts` (remover `rateLimitMap`, chamar RPC)
- `supabase/migrations/016_rate_limits.sql` (nova migration)

**Acceptance Criteria:**

**Cenario 1: Criacao da tabela e RPC**

**Given** a migration `016_rate_limits.sql` e executada
**When** a tabela `rate_limits` e criada
**Then** a tabela contem colunas: `id` (UUID PK), `key` (TEXT, unique), `count` (INTEGER), `window_start` (TIMESTAMPTZ), `created_at` (TIMESTAMPTZ)
**And** um indice existe em `(key)` para lookups rapidos
**And** a funcao RPC `check_rate_limit(p_key TEXT, p_max_count INTEGER, p_window_seconds INTEGER)` e criada
**And** a RPC retorna `true` se o request esta dentro do limite, `false` se excedeu
**And** a RPC atomicamente incrementa o contador ou cria nova entrada com `INSERT ... ON CONFLICT`
**And** entries expiradas (window_start + window_seconds < now()) sao resetadas automaticamente pela RPC

**Cenario 2: Integracao na API route**

**Given** um request chega ao endpoint `POST /api/oracle-ai`
**When** o IP do requisitante e extraido dos headers (`x-forwarded-for` ou `x-real-ip`)
**Then** a funcao `check_rate_limit` e chamada via `supabase.rpc('check_rate_limit', { p_key: ip, p_max_count: 20, p_window_seconds: 60 })`
**And** se retornar `false` (limite excedido), a API retorna HTTP 429 com mensagem `"Rate limit exceeded. Try again in a minute."`
**And** se retornar `true` (dentro do limite), o request prossegue normalmente

**Cenario 3: Fail-open em caso de erro do banco**

**Given** a chamada RPC ao Supabase falha (timeout, conexao recusada, erro interno)
**When** o catch block captura o erro
**Then** o request e permitido a prosseguir (fail-open) para nao bloquear usuarios por falha de infra
**And** o erro e logado via `console.error` com contexto
**And** `Sentry.captureException` e chamado para tracking

**Cenario 4: Remocao do rate limit in-memory**

**Given** a integracao com Supabase esta completa
**When** o codigo antigo (`rateLimitMap`, `isRateLimited`, `RATE_LIMIT_MAX_ENTRIES`) e removido
**Then** nenhuma referencia a `Map` para rate limiting permanece em `route.ts`
**And** o rate limit funciona corretamente mesmo com multiplas instancias serverless

**Definition of Done:**
- [ ] Migration `016_rate_limits.sql` criada e funcional
- [ ] RPC `check_rate_limit` testada localmente via `supabase start`
- [ ] `rateLimitMap` removido de `route.ts`
- [ ] Rate limit funciona em ambiente multi-instance (testado com 2+ requests simultaneos)
- [ ] Fail-open verificado: Oracle AI funciona mesmo se Supabase estiver indisponivel
- [ ] `next build` passa sem erros

---

### Story 0.4: Cleanup de setTimeout leaks em useEffect

As a **developer**,
I want to store setTimeout IDs in refs and clear them in useEffect cleanup functions,
So that timeouts are properly cancelled when components unmount, preventing memory leaks and state updates on unmounted components.

**FRs/NFRs:** TD5
**Dependencias:** Nenhuma
**Estimativa:** 2h
**Arquivos afetados:**
- `components/oracle/OracleAIModal.tsx:46` (setTimeout para focus no input)
- `components/player/PlayerLobby.tsx` (possivel setTimeout em animacoes/waiting state)
- `components/tutorial/code-block.tsx:45` (setTimeout para resetar icone de copy)

**Acceptance Criteria:**

**Cenario 1: OracleAIModal — focus com cleanup**

**Given** o OracleAIModal abre e agenda `setTimeout(() => inputRef.current?.focus(), 50)`
**When** o modal e fechado antes dos 50ms passarem
**Then** o timeout e cancelado via `clearTimeout` no cleanup do useEffect
**And** nenhum `setState` e chamado em componente desmontado
**And** o timeout ID e armazenado em um `useRef<ReturnType<typeof setTimeout>>`

**Cenario 2: code-block.tsx — reset de icone de copy**

**Given** o usuario clica "Copy" e o icone muda para checkmark com `setTimeout(() => setIcon(CopyIcon), 2000)`
**When** o componente CodeBlock e desmontado antes dos 2000ms
**Then** o timeout e cancelado via `clearTimeout` no cleanup
**And** o timeout ID e armazenado em um `useRef`
**And** a funcao `copy` limpa qualquer timeout anterior antes de agendar um novo

**Cenario 3: PlayerLobby — verificacao e limpeza**

**Given** o componente PlayerLobby pode conter setTimeout para animacoes ou polling
**When** o componente e desmontado (jogador navega para outra pagina, sessao encerra)
**Then** todos os setTimeout existentes sao cancelados via cleanup
**And** se nenhum setTimeout for encontrado no PlayerLobby, documentar a verificacao no PR

**Cenario 4: Padrao consistente**

**Given** os 3 componentes corrigidos
**When** o padrao de cleanup e aplicado
**Then** todos seguem o mesmo padrao: `const timerRef = useRef<ReturnType<typeof setTimeout>>()` + `clearTimeout(timerRef.current)` no return do useEffect
**And** nenhum warning de "Can't perform a React state update on an unmounted component" aparece no console

**Definition of Done:**
- [ ] Todos os setTimeout nos 3 arquivos armazenados em ref com cleanup
- [ ] Zero warnings de state update em componente desmontado no console
- [ ] Comportamento funcional identico (focus, icone reset, animacoes)
- [ ] `next build` passa sem erros

---

### Story 0.5: Remover eslint-disable desnecessarios e tipar corretamente

As a **developer**,
I want to remove unnecessary `eslint-disable` comments and replace `any` types with proper TypeScript types,
So that the linter catches real bugs, type safety is enforced at compile time, and the codebase is maintainable.

**FRs/NFRs:** TD4, TD8
**Dependencias:** Nenhuma
**Estimativa:** 4h
**Arquivos afetados:**
- `lib/realtime/broadcast.ts` (4 eslint-disable para @typescript-eslint/no-unused-vars)
- `app/join/[token]/page.tsx` (1 eslint-disable para no-unused-vars)
- `app/api/session/[id]/state/route.ts` (1 eslint-disable para no-unused-vars)
- `scripts/generate-srd-bundles.ts` (3 eslint-disable para no-explicit-any)
- `app/api/oracle-ai/route.ts` (`any` types em response parsing — TD8)

**Acceptance Criteria:**

**Cenario 1: broadcast.ts — destructuring com prefixo underscore**

**Given** `broadcast.ts` tem 4 eslint-disable para `@typescript-eslint/no-unused-vars` em destructuring (ex: `const { dm_notes, ...safe } = c`)
**When** as variaveis descartadas sao renomeadas com prefixo `_` (ex: `const { dm_notes: _dm_notes, ...safe } = c`)
**Then** os 4 comentarios `eslint-disable-next-line` sao removidos
**And** nenhum comportamento funcional muda
**And** o ESLint nao reporta warnings para variaveis com prefixo `_`

**Cenario 2: join/[token]/page.tsx e state/route.ts — unused vars**

**Given** os arquivos tem variaveis declaradas mas nao utilizadas (capturadas em destructuring)
**When** as variaveis sao renomeadas com prefixo `_` ou removidas se desnecessarias
**Then** os comentarios eslint-disable sao removidos
**And** a logica de autenticacao e session state continua funcional

**Cenario 3: generate-srd-bundles.ts — tipos explicitados**

**Given** o script de geracao SRD usa `any` em 3 locais para dados JSON dinamicos
**When** interfaces ou type aliases sao criados para os shapes esperados (ex: `SrdMonsterRaw`, `SrdSpellRaw`)
**Then** os 3 comentarios `eslint-disable` para `no-explicit-any` sao removidos
**And** os tipos criados documentam o shape dos dados SRD importados
**And** o script continua gerando bundles identicos

**Cenario 4: Oracle AI route — any em response parsing (TD8)**

**Given** `api/oracle-ai/route.ts` usa `any` para parsear a resposta streaming da Gemini API
**When** interfaces sao criados para o formato de resposta esperado (ex: `GeminiStreamChunk`, `GeminiCandidate`, `GeminiGroundingSource`)
**Then** o parsing usa type narrowing em vez de `any` assertion
**And** erros de formato inesperado sao detectados em compile time
**And** a funcionalidade de streaming permanece identica

**Definition of Done:**
- [ ] Minimo 12 dos 15+ eslint-disable comments removidos (restantes documentados se irremovibles)
- [ ] Zero `any` type em `api/oracle-ai/route.ts`
- [ ] Interfaces criadas para dados SRD raw e Gemini response
- [ ] `next build` passa sem erros TypeScript
- [ ] ESLint roda limpo nos 8 arquivos afetados

---
---

## Epic 1: Combat Core Improvements

Resolver os 3 problemas mais criticos de combate reportados em sessoes reais: impossibilidade de adicionar combatentes durante combate ativo, falta de display names para anti-metagaming, e jogadores atrasados nao conseguem entrar. Depende de schema V2 (display_name column adicionada na migration 016/017).

---

### Story 1.1: Adicionar combatente durante combate ativo (mid-combat add)

As a **DM**,
I want to add new monsters or players to an encounter that is already in progress,
So that I can improvise freely during combat — reinforcements arrive, new NPCs join, or a player arrives late — without restarting the encounter.

**FRs/NFRs:** FR42, FR12
**Dependencias:** Nenhuma (usa infraestrutura de `combat:combatant_add` ja existente em `lib/types/realtime.ts` e `lib/realtime/broadcast.ts`)
**Estimativa:** 4h
**Arquivos afetados:**
- `components/combat/CombatView.tsx` ou equivalente (botao "Adicionar Combatente" visivel durante combate ativo)
- `components/combat/AddCombatantForm.tsx` (formulario existente, adaptar para aceitar initiative editavel)
- `lib/hooks/useCombatActions.ts` (`handleAddMidCombat` — novo handler)
- `lib/stores/combat-store.ts` (`addCombatant` — ajustar para inserir na posicao correta durante combate ativo)
- `lib/supabase/session.ts` (`persistNewCombatant` — ja existe, verificar compatibilidade)

**Acceptance Criteria:**

**Cenario 1: Botao visivel durante combate ativo**

**Given** o DM esta em uma sessao de combate ativa (`is_active === true`)
**When** a interface de combate e renderizada
**Then** um botao "Adicionar Combatente" (verde sutil: `bg-emerald-900/30 text-emerald-400`) e visivel na toolbar de combate
**And** o botao segue Action Color Semantics (verde = construtivo)
**And** o botao tem aria-label descritivo para acessibilidade

**Cenario 2: Formulario de adicao mid-combat**

**Given** o DM clica no botao "Adicionar Combatente" durante combate
**When** o formulario abre (inline ou modal)
**Then** o formulario mostra campos: Nome, HP, AC, DC (opcional), Initiative (editavel, obrigatorio)
**And** o campo Initiative aceita valor numerico (1-30) e vem pre-preenchido se um monstro SRD e selecionado (roll automatico baseado em DEX)
**And** o DM pode buscar monstros do SRD via MonsterSearchPanel integrado
**And** o DM pode adicionar um combatente custom (NPC/jogador) preenchendo manualmente

**Cenario 3: Insercao na posicao correta de initiative**

**Given** o DM preenche o formulario e submete o novo combatente com initiative = 15
**When** o combatente e adicionado ao store
**Then** o novo combatente e inserido na posicao correta da ordem de iniciativa (entre combatentes com initiative > 15 e < 15)
**And** `initiative_order` e recalculado para todos os combatentes
**And** se o novo combatente tem initiative igual a um existente, ele e inserido abaixo do existente (tiebreaker: ultimo adicionado vai depois)
**And** `current_turn_index` e ajustado se o novo combatente foi inserido antes ou no turno atual

**Cenario 4: Broadcast e persistencia**

**Given** um novo combatente e adicionado mid-combat
**When** o store e atualizado (optimistic UI)
**Then** `broadcastEvent(sessionId, { type: "combat:combatant_add", combatant })` e chamado
**And** o combatant payload e sanitizado via `sanitizePayload` antes do broadcast (remove dm_notes, monster stats para players)
**And** `persistNewCombatant` salva o combatente no banco de dados
**And** jogadores conectados veem o novo combatente aparecer na posicao correta em tempo real

**Cenario 5: Undo suportado**

**Given** um combatente foi adicionado mid-combat
**When** o DM quer desfazer a adicao
**Then** o DM pode remover o combatente recem-adicionado usando o botao "Remover" existente (mesma UX de `removeCombatant`)
**And** `combat:combatant_remove` e broadcast e o combatente e removido do banco
**And** `current_turn_index` e re-ajustado se necessario

**Cenario 6: Combatente custom vs SRD**

**Given** o formulario de adicao mid-combat
**When** o DM adiciona um combatente custom (sem monster_id)
**Then** os campos nome, HP, AC, initiative sao obrigatorios; DC e opcional
**And** `monster_id` e `null`, `token_url` e `null`, `creature_type` e `null`
**When** o DM adiciona um monstro SRD (selecionado via busca)
**Then** os campos sao pre-preenchidos com dados do SRD (HP, AC, DEX-based initiative roll)
**And** `monster_id` aponta para o ID do SRD, `token_url` e `creature_type` sao populados

**Definition of Done:**
- [ ] Botao "Adicionar Combatente" visivel e funcional durante combate ativo
- [ ] Combatente inserido na posicao correta de initiative
- [ ] Broadcast `combat:combatant_add` sanitizado chega a todos os jogadores
- [ ] Persistencia no banco via `persistNewCombatant`
- [ ] `current_turn_index` corretamente ajustado apos insercao
- [ ] `next build` passa sem erros

---

### Story 1.2: Display name customizavel para monstros (anti-metagaming)

As a **DM**,
I want to set a custom display name for any monster that is visible to players instead of the real SRD name,
So that players cannot metagame by recognizing monster names and looking up their stats externally.

**FRs/NFRs:** FR43, NFR33
**Dependencias:** Migration de schema V2 (esta story inclui a migration)
**Estimativa:** 4h
**Arquivos afetados:**
- `supabase/migrations/017_display_name_and_groups.sql` (nova migration — `display_name` column)
- `lib/types/combat.ts` (adicionar `display_name` ao interface `Combatant`)
- `lib/types/realtime.ts` (ajustar `RealtimeCombatantAdd` e `RealtimeStatsUpdate` para incluir `display_name`)
- `lib/realtime/broadcast.ts` (`sanitizePayload` — substituir `name` por `display_name` para players quando definido)
- `components/combat/CombatantRow.tsx` ou equivalente (DM ve "Beholder (Criatura Misteriosa)", player ve "Criatura Misteriosa")
- `components/combat/StatsEditor.tsx` (campo editavel para display_name)
- `components/combat/EncounterSetup.tsx` (campo opcional de display_name ao adicionar monstro)

**Acceptance Criteria:**

**Cenario 1: Migration adiciona coluna display_name**

**Given** a migration `017_display_name_and_groups.sql` e executada
**When** a coluna `display_name` e adicionada a tabela `combatants`
**Then** a coluna e `TEXT NULL DEFAULT NULL`
**And** um trigger `trg_sanitize_display_name` e criado que sanitiza o valor contra XSS (strip HTML tags, encode entidades) antes de INSERT e UPDATE
**And** a migration e idempotente (pode rodar mais de uma vez sem erro)

**Cenario 2: DM ve nome real + display name**

**Given** o DM adicionou um "Beholder" com display_name "Criatura Misteriosa"
**When** a lista de combate e renderizada na visao do DM
**Then** o DM ve: "Beholder (Criatura Misteriosa)" — nome real em texto principal, display_name em texto secundario/badge
**And** se display_name for `null` ou vazio, apenas o nome real e exibido normalmente
**And** o display_name e editavel via StatsEditor (campo de texto, max 50 caracteres)

**Cenario 3: Player ve apenas display name**

**Given** um combatente tem `display_name = "Criatura Misteriosa"` e `name = "Beholder"`
**When** o broadcast `combat:combatant_add` e enviado para players
**Then** `sanitizePayload` substitui o campo `name` pelo `display_name` no payload enviado para players
**And** o payload enviado nunca contem o nome real do SRD para combatentes nao-player
**And** se `display_name` for `null`, o nome real e enviado normalmente (comportamento retrocompativel)

**Cenario 4: Display name editavel mid-combat**

**Given** o DM esta em combate ativo
**When** o DM abre o StatsEditor para um combatente
**Then** um campo "Nome visivel para jogadores" (display_name) e exibido
**And** o campo aceita texto livre, max 50 caracteres
**And** ao salvar, `combat:stats_update` inclui `display_name` no broadcast
**And** `sanitizePayload` para `combat:stats_update` envia `display_name` como `name` para players

**Cenario 5: Sanitizacao XSS no banco (NFR33)**

**Given** o DM insere `<script>alert('xss')</script>` como display_name
**When** o valor e salvo no banco
**Then** o trigger de sanitizacao remove tags HTML e encoda entidades especiais
**And** o valor armazenado e texto puro sem markup
**And** testes de regressao verificam payloads XSS OWASP Top 10

**Cenario 6: Display name no setup de encontro**

**Given** o DM esta configurando um encontro (pre-combate)
**When** o DM adiciona um monstro do SRD
**Then** um campo opcional "Display name" aparece no formulario de adicao
**And** o campo tem placeholder: "Ex: Criatura Misteriosa (vazio = nome real)"
**And** combatentes do tipo player (`is_player = true`) nao mostram campo de display_name

**Cenario 7: Retrocompatibilidade**

**Given** encontros existentes no banco nao tem `display_name` (null)
**When** esses encontros sao carregados
**Then** o comportamento e identico ao V1: nome real exibido para todos
**And** nenhum erro ocorre por `display_name` ser null

**Definition of Done:**
- [ ] Migration `017_display_name_and_groups.sql` cria coluna + trigger de sanitizacao
- [ ] `Combatant` interface inclui `display_name: string | null`
- [ ] DM ve "Real Name (Display Name)" na UI
- [ ] Players nunca recebem o nome real quando display_name esta definido
- [ ] Campo editavel no StatsEditor e no formulario de setup
- [ ] 100% dos display names sanitizados contra XSS (trigger + testes)
- [ ] `next build` passa sem erros

---

### Story 1.3: Late-join — jogador entra em sessao ativa e inputa iniciativa

As a **player arriving late**,
I want to join an already-active combat session, enter my character info and initiative,
So that the DM can add me to the initiative order without restarting the encounter.

**FRs/NFRs:** FR47
**Dependencias:** Story 1.1 (mid-combat add — usa a mesma infraestrutura de insercao em combate ativo)
**Estimativa:** 6h
**Arquivos afetados:**
- `components/player/PlayerLobby.tsx` (detectar se sessao ja esta ativa; mostrar formulario de registro com initiative)
- `app/join/[token]/page.tsx` (logica de late-join: detectar `encounter.is_active === true`)
- `components/combat/CombatView.tsx` ou DM view (notificacao de late-join request)
- `lib/types/realtime.ts` (novo evento `combat:late_join_request` e `combat:late_join_response`)
- `lib/realtime/broadcast.ts` (handler para late-join events)
- `lib/hooks/useCombatActions.ts` (`handleAcceptLateJoin`, `handleRejectLateJoin`)

**Acceptance Criteria:**

**Cenario 1: Jogador detecta sessao ja ativa**

**Given** um jogador escaneia o QR code ou acessa o link de sessao
**When** a sessao tem um encontro com `is_active === true`
**Then** o PlayerLobby exibe o formulario de registro com campos: Nome (obrigatorio), HP (opcional), AC (opcional), Initiative (obrigatorio, 1-30)
**And** uma mensagem informa: "O combate ja esta em andamento. Preencha seus dados para solicitar entrada." (i18n key: `player.late_join_info`)
**And** o formulario tem visual diferenciado do lobby pre-combate (ex: badge "Combate em andamento")

**Cenario 2: Jogador envia request de late-join**

**Given** o jogador preenche o formulario e clica "Solicitar Entrada"
**When** o formulario e submetido
**Then** um evento `combat:late_join_request` e enviado via channel broadcast com payload: `{ player_name, hp, ac, initiative }`
**And** o jogador ve um estado de espera: "Aguardando aprovacao do mestre..." com animacao
**And** o botao de submissao e desabilitado durante a espera

**Cenario 3: DM recebe notificacao de late-join**

**Given** o DM esta gerenciando combate ativo
**When** um evento `combat:late_join_request` chega via channel
**Then** uma notificacao (Toast ou banner) aparece na tela do DM: "[Nome do Jogador] quer entrar no combate (Initiative: X)"
**And** a notificacao tem botoes [Aceitar] (verde) e [Rejeitar] (vermelho)
**And** a notificacao persiste ate o DM tomar uma acao (nao auto-dismiss)
**And** a notificacao inclui um som sutil (opcional, respeitando `prefers-reduced-motion`)

**Cenario 4: DM aceita o late-join**

**Given** o DM clica [Aceitar] na notificacao de late-join
**When** a acao e processada
**Then** um novo combatente e criado usando a infraestrutura de mid-combat add (Story 1.1) com os dados do jogador
**And** o combatente e inserido na posicao correta da ordem de initiative
**And** `is_player = true` e definido no combatente
**And** `combat:combatant_add` e broadcast para todos os jogadores
**And** `combat:late_join_response` com `{ accepted: true }` e enviado para o jogador solicitante
**And** o jogador ve a transicao para o PlayerInitiativeBoard (visao de combate)

**Cenario 5: DM rejeita o late-join**

**Given** o DM clica [Rejeitar] na notificacao de late-join
**When** a acao e processada
**Then** `combat:late_join_response` com `{ accepted: false }` e enviado para o jogador solicitante
**And** o jogador ve uma mensagem: "O mestre nao aceitou sua entrada neste momento." (i18n key: `player.late_join_rejected`)
**And** o jogador pode tentar novamente

**Cenario 6: Jogador que ja esta registrado nao ve formulario de late-join**

**Given** um jogador que ja se registrou antes do combate iniciar
**When** a sessao transiciona para combate ativo
**Then** o jogador ve o PlayerInitiativeBoard normalmente (ja esta na lista de combatentes)
**And** o formulario de late-join nao e exibido para jogadores ja registrados

**Cenario 7: Persistencia do combatente late-join**

**Given** o DM aceitou um late-join
**When** o combatente e adicionado
**Then** `persistNewCombatant` salva o combatente no banco de dados com todos os dados
**And** se a sessao for salva e retomada, o combatente late-join persiste
**And** `current_turn_index` e ajustado corretamente (via logica da Story 1.1)

**Definition of Done:**
- [ ] Jogador ve formulario de late-join quando sessao ja esta ativa
- [ ] Request de late-join e broadcast para o DM via channel
- [ ] DM ve notificacao com [Aceitar/Rejeitar]
- [ ] Aceitar insere combatente na posicao correta (via mid-combat add)
- [ ] Rejeitar notifica jogador com mensagem amigavel
- [ ] Eventos `combat:late_join_request` e `combat:late_join_response` tipados em `realtime.ts`
- [ ] `next build` passa sem erros

---
---

## Epic 2: Monster Grouping & Initiative

Facilitar combates com muitos monstros do mesmo tipo (5+ Goblins, 3 Esqueletos), agrupando-os sob uma unica entrada de iniciativa com HP individual. Depende de schema V2 (colunas `monster_group_id` e `group_order` na tabela combatants).

---

### Story 2.1: UI de agrupamento de monstros no setup de encontro

As a **DM**,
I want to add multiple monsters of the same type as a named group with a single action,
So that adding 5 Goblins to an encounter takes one action instead of five, and they appear as a cohesive group in the initiative list.

**FRs/NFRs:** FR44
**Dependencias:** Migration de schema V2 (esta story inclui as colunas de agrupamento)
**Estimativa:** 6h
**Arquivos afetados:**
- `supabase/migrations/017_display_name_and_groups.sql` (adicionar `monster_group_id UUID NULL`, `group_order INTEGER NULL` a `combatants`. Se a migration da Story 1.2 ja existir, combinar na mesma migration ou criar migration separada)
- `lib/types/combat.ts` (adicionar `monster_group_id: string | null`, `group_order: number | null` ao `Combatant`)
- `components/combat/MonsterSearchPanel.tsx` (adicionar campo "Quantidade" ao selecionar monstro)
- `components/combat/EncounterSetup.tsx` (renderizar grupos como header colapsavel)
- `lib/stores/combat-store.ts` (acao `addMonsterGroup` que cria N combatentes com mesmo `monster_group_id`)
- `lib/utils/initiative.ts` (suporte a agrupamento no sorting)

**Acceptance Criteria:**

**Cenario 1: Migration adiciona colunas de agrupamento**

**Given** a migration e executada (mesma migration 017 ou migration separada 018)
**When** as colunas `monster_group_id` e `group_order` sao adicionadas a tabela `combatants`
**Then** `monster_group_id` e `UUID NULL DEFAULT NULL` — combatentes sem grupo tem `NULL`
**And** `group_order` e `INTEGER NULL DEFAULT NULL` — posicao dentro do grupo (1, 2, 3...)
**And** um indice composto existe em `(encounter_id, monster_group_id)` para queries eficientes
**And** combatentes existentes nao sao afetados (valores NULL)

**Cenario 2: Campo "Quantidade" no MonsterSearchPanel**

**Given** o DM seleciona um monstro do SRD no MonsterSearchPanel
**When** o monstro e selecionado
**Then** um campo numerico "Quantidade" (stepper: - [N] +, default: 1, range: 1-20) aparece ao lado do botao "Adicionar"
**And** o campo tem min=1, max=20 com validacao client-side
**And** o label e "Qty" ou "Qtd" (i18n key: `combat.monster_quantity`)

**Cenario 3: Criacao de grupo com N combatentes**

**Given** o DM selecionou "Goblin" com Quantidade = 3
**When** o DM clica "Adicionar"
**Then** 3 combatentes sao criados no store com:
  - Nomes: "Goblin 1", "Goblin 2", "Goblin 3" (numeracao automatica)
  - Mesmo `monster_group_id` (UUID gerado client-side)
  - `group_order`: 1, 2, 3 respectivamente
  - Mesmo HP, AC, stats (copiados do SRD)
  - Initiative: `null` (sera rolado coletivamente — Story 2.4)
**And** a lista de combate mostra um header de grupo: "Goblins (3)" com icone de chevron
**And** cada combatente individual e visivel ao expandir o grupo

**Cenario 4: Quantidade = 1 nao cria grupo**

**Given** o DM selecionou um monstro com Quantidade = 1 (default)
**When** o DM clica "Adicionar"
**Then** um unico combatente e criado com `monster_group_id = null` e `group_order = null`
**And** o comportamento e identico ao V1 (sem agrupamento)

**Cenario 5: Adicionar ao grupo existente**

**Given** ja existem "Goblin 1", "Goblin 2", "Goblin 3" como grupo
**When** o DM seleciona "Goblin" novamente com Quantidade = 2
**Then** o DM recebe opcao: "Adicionar ao grupo existente" ou "Criar novo grupo"
**And** se "Adicionar ao grupo existente": "Goblin 4" e "Goblin 5" sao criados com mesmo `monster_group_id`, `group_order` 4 e 5
**And** o header do grupo atualiza para "Goblins (5)"

**Cenario 6: Visualizacao do grupo na lista**

**Given** um grupo de 3 Goblins existe no encontro
**When** a lista de combate e renderizada
**Then** o grupo aparece como um unico "header row" mostrando: icone de chevron, "Goblins (3)", HP agregado (soma ou range)
**And** o header row ocupa a posicao do grupo na ordem de initiative
**And** clicar no chevron expande/colapsa os membros individuais (detalhes na Story 2.3)

**Definition of Done:**
- [ ] Migration cria colunas `monster_group_id` e `group_order` em `combatants`
- [ ] Campo "Quantidade" funcional no MonsterSearchPanel (1-20)
- [ ] N combatentes criados com mesmo `monster_group_id`
- [ ] Header de grupo renderizado na lista de combate
- [ ] Quantidade = 1 comporta-se identicamente ao V1
- [ ] `Combatant` interface atualizado com novos campos
- [ ] `next build` passa sem erros

---

### Story 2.2: HP individual dentro de grupo de monstros

As a **DM**,
I want each monster in a group to maintain its own HP, temp HP, and defeated status independently,
So that I can damage, heal, and defeat monsters individually while keeping them organized as a group.

**FRs/NFRs:** FR45
**Dependencias:** Story 2.1 (monster grouping UI — estrutura de grupo precisa existir)
**Estimativa:** 4h
**Arquivos afetados:**
- `components/combat/HpAdjuster.tsx` (funciona per-individual, sem mudanca necessaria)
- `components/combat/CombatantRow.tsx` ou equivalente (cada membro do grupo tem seu proprio HpAdjuster)
- `lib/stores/combat-store.ts` (acoes `applyDamage`, `applyHealing`, `setTempHp`, `setDefeated` ja operam por ID — verificar compatibilidade com grupos)
- `lib/hooks/useCombatActions.ts` (verificar que broadcasts de HP sao per-individual)
- `components/combat/MonsterGroupHeader.tsx` (novo — mostra HP agregado)

**Acceptance Criteria:**

**Cenario 1: HP independente por membro**

**Given** um grupo de 3 Goblins, cada um com `current_hp: 7`, `max_hp: 7`, `temp_hp: 0`
**When** o DM aplica 3 de dano ao Goblin 2
**Then** Goblin 2 tem `current_hp: 4`, Goblin 1 e Goblin 3 permanecem com `current_hp: 7`
**And** o broadcast `combat:hp_update` e enviado apenas para Goblin 2 (combatant_id = Goblin 2 ID)
**And** a barra de HP do Goblin 2 reflete o novo valor; as outras nao mudam

**Cenario 2: Temp HP independente**

**Given** um grupo de 3 Goblins
**When** o DM define `temp_hp: 5` para Goblin 1
**Then** apenas Goblin 1 recebe temp HP; os outros permanecem com `temp_hp: 0`
**And** dano subsequente ao Goblin 1 absorve temp HP primeiro (comportamento V1 preservado)

**Cenario 3: Derrota individual**

**Given** um grupo de 3 Goblins
**When** o DM marca Goblin 2 como derrotado (`is_defeated: true`)
**Then** Goblin 2 aparece com visual de derrotado (opacity reduzida, strikethrough)
**And** Goblin 1 e Goblin 3 permanecem ativos
**And** o header do grupo atualiza para refletir: "Goblins (2/3 ativos)" ou count atualizado
**And** `combat:defeated_change` e broadcast apenas para Goblin 2

**Cenario 4: Derrota automatica do grupo**

**Given** um grupo de 3 Goblins
**When** todos os 3 membros sao marcados como derrotados
**Then** o header do grupo mostra visual de grupo derrotado (opacity reduzida completa)
**And** o grupo e tratado como "skip" no advance turn (identico a combatente individual derrotado)
**And** se pelo menos 1 membro for revivido (un-defeated), o grupo volta a ser ativo

**Cenario 5: HpAdjuster funciona em contexto de grupo expandido**

**Given** o DM expandiu o grupo "Goblins (3)"
**When** o DM clica no HpAdjuster de um membro individual
**Then** o HpAdjuster abre normalmente, aplicando dano/cura apenas ao membro selecionado
**And** undo funciona per-individual (stack de undo registra o membro especifico)
**And** o HpAdjuster fecha sem colapsar o grupo

**Cenario 6: HP agregado no header do grupo**

**Given** um grupo com Goblin 1 (7/7 HP), Goblin 2 (4/7 HP), Goblin 3 (0/7 HP, derrotado)
**When** o header do grupo e renderizado (colapsado)
**Then** o header mostra HP agregado: "11/21 HP" (soma de current_hp / soma de max_hp) dos membros ativos
**And** a barra de HP agregada reflete a proporcao (11/21 = ~52%, amarelo)
**And** membros derrotados sao excluidos do agregado ou marcados separadamente

**Definition of Done:**
- [ ] Cada membro de grupo mantem `current_hp`, `max_hp`, `temp_hp` independentes
- [ ] HpAdjuster funciona per-individual dentro de grupo expandido
- [ ] Derrota individual possivel sem afetar outros membros
- [ ] Grupo auto-derrota quando todos membros derrotados
- [ ] HP agregado exibido no header do grupo (colapsado)
- [ ] Broadcasts de HP enviados per-individual (nao por grupo)
- [ ] `next build` passa sem erros

---

### Story 2.3: Expandir/colapsar grupos de monstros na lista de combate

As a **DM**,
I want to expand and collapse monster groups in the combat list,
So that I can see a compact overview when managing many monsters, and expand a specific group when I need to interact with individual members.

**FRs/NFRs:** FR46
**Dependencias:** Story 2.1 (monster grouping UI — header de grupo precisa existir)
**Estimativa:** 3h
**Arquivos afetados:**
- `components/combat/MonsterGroupHeader.tsx` (novo componente — header com chevron toggle)
- `components/combat/CombatView.tsx` ou lista de combatentes (logica de rendering condicional)
- `lib/stores/combat-store.ts` ou Zustand slice separado (estado de expand/collapse por group_id — client-side only)

**Acceptance Criteria:**

**Cenario 1: Estado default — colapsado**

**Given** um grupo de 3 Goblins e renderizado na lista de combate
**When** a lista e exibida pela primeira vez
**Then** o grupo aparece colapsado: apenas o header "Goblins (3)" e visivel
**And** os 3 membros individuais estao ocultos
**And** um icone de chevron (ChevronRight) indica que o grupo pode ser expandido

**Cenario 2: Expandir grupo**

**Given** o grupo "Goblins (3)" esta colapsado
**When** o DM clica no chevron ou no header do grupo
**Then** os 3 membros individuais aparecem abaixo do header (animacao de 150-200ms, slide-down)
**And** o icone de chevron rotaciona para ChevronDown
**And** cada membro mostra: nome individual ("Goblin 1"), barra de HP, conditions, HpAdjuster access
**And** a animacao respeita `prefers-reduced-motion` (sem animacao se preferido)

**Cenario 3: Colapsar grupo**

**Given** o grupo "Goblins (3)" esta expandido
**When** o DM clica no chevron ou no header do grupo
**Then** os membros individuais sao ocultados (animacao de 150-200ms, slide-up)
**And** o icone de chevron rotaciona para ChevronRight
**And** o header mostra informacoes agregadas: nome + count + HP agregado

**Cenario 4: Informacoes no header colapsado**

**Given** o grupo esta colapsado
**When** o header e renderizado
**Then** o header mostra: icone chevron, nome do monstro no plural + count "(3)", barra de HP agregada, count de membros ativos/total
**And** se algum membro tem conditions, um badge resumido e exibido (ex: "2 com condicoes")
**And** o header ocupa a mesma largura que um CombatantRow normal

**Cenario 5: Estado de expand/collapse e client-side (Zustand)**

**Given** o estado de expand/collapse por grupo
**When** e armazenado
**Then** o estado e mantido em um Zustand store (ou slice do combat-store) como `Map<string, boolean>` (group_id → isExpanded)
**And** o estado NAO e persistido no banco de dados (ephemeral, client-side only)
**And** o estado NAO e broadcast para jogadores (DM-only)
**And** ao recarregar a pagina, todos os grupos voltam ao estado default (colapsado)

**Cenario 6: Navegacao por teclado**

**Given** o DM esta navegando a lista de combate via teclado
**When** o focus esta no header de um grupo
**Then** Enter ou Space toggles expand/collapse
**And** ArrowRight expande (se colapsado), ArrowLeft colapsa (se expandido)
**And** quando expandido, ArrowDown move o focus para o primeiro membro individual
**And** `aria-expanded` e atualizado no header para screen readers

**Cenario 7: Grupo com 1 membro (edge case)**

**Given** um grupo originalmente com 3 membros onde 2 foram removidos
**When** resta apenas 1 membro
**Then** o grupo continua com header e expand/collapse (nao "desagrupa" automaticamente)
**And** o header mostra "(1)" no count
**And** funcionalidade de expand/collapse permanece identica

**Definition of Done:**
- [ ] Chevron icon toggles expand/collapse com animacao 150-200ms
- [ ] Header colapsado mostra: nome + count + HP agregado
- [ ] Header expandido revela membros individuais com HpAdjuster
- [ ] Estado em Zustand (client-side, nao persistido, nao broadcast)
- [ ] Teclado: Enter/Space/ArrowLeft/ArrowRight funcionais no header
- [ ] `aria-expanded` atualizado para acessibilidade
- [ ] `next build` passa sem erros

---

### Story 2.4: Roll coletivo de iniciativa para grupo de monstros

As a **DM**,
I want a monster group to roll a single initiative value that applies to all members,
So that grouped monsters act on the same turn (as D&D 5e rules suggest for identical monsters), speeding up combat setup.

**FRs/NFRs:** FR44
**Dependencias:** Story 2.1 (monster grouping UI — estrutura de grupo precisa existir)
**Estimativa:** 2h
**Arquivos afetados:**
- `lib/utils/initiative.ts` (logica de roll coletivo para grupos)
- `lib/hooks/useInitiativeRolling.ts` ou equivalente (adaptar `handleRollAll`/`handleRollNpcs` para grupos)
- `components/combat/EncounterSetup.tsx` (campo de initiative do grupo no header)
- `lib/stores/combat-store.ts` (acao `setGroupInitiative` que aplica valor a todos membros do grupo)

**Acceptance Criteria:**

**Cenario 1: Roll de initiative durante setup**

**Given** um grupo de 3 Goblins no setup de encontro
**When** o DM clica "Rolar Iniciativa" (roll all NPCs) ou o botao de roll no header do grupo
**Then** um unico d20 e rolado (com modificador DEX do monstro) para o grupo
**And** o resultado e aplicado a todos os 3 membros do grupo (`initiative` = mesmo valor)
**And** `initiative_order` e calculado de forma que os 3 fiquem adjacentes na lista
**And** a animacao de roll mostra o resultado uma unica vez no header do grupo

**Cenario 2: Roll individual (override)**

**Given** um grupo de 3 Goblins com initiative coletiva = 14
**When** o DM edita manualmente a initiative de "Goblin 2" para 18
**Then** Goblin 2 se "separa" do grupo na ordem de initiative (posicao 18, enquanto Goblin 1 e 3 ficam em 14)
**And** Goblin 2 mantem o mesmo `monster_group_id` (continua no grupo para UI/HP)
**And** a initiative do grupo (header) mostra "14" (majority) e Goblin 2 mostra "18" individualmente
**And** na lista de combate, Goblin 2 pode aparecer em posicao diferente dos outros membros do grupo

**Cenario 3: Roll coletivo via "Roll All NPCs"**

**Given** o encontro tem: grupo de 3 Goblins + grupo de 2 Esqueletos + 1 Dragao (individual)
**When** o DM clica "Rolar Iniciativa para NPCs"
**Then** 1 roll para o grupo de Goblins (aplicado a 3 combatentes)
**And** 1 roll para o grupo de Esqueletos (aplicado a 2 combatentes)
**And** 1 roll para o Dragao (individual)
**And** total de 3 rolls para 6 combatentes (em vez de 6 rolls individuais)

**Cenario 4: Header do grupo mostra initiative**

**Given** o grupo tem initiative coletiva = 14
**When** o header do grupo e renderizado (colapsado)
**Then** o header mostra o valor de initiative: "Init: 14"
**And** se membros tem initiative diferentes (override), o header mostra a initiative mais comum ou um range

**Cenario 5: Initiative editavel no header do grupo**

**Given** o grupo de Goblins esta no setup de encontro
**When** o DM edita o campo de initiative no header do grupo
**Then** o novo valor e aplicado a todos os membros do grupo simultaneamente
**And** membros que foram individualmente overridden NAO sao afetados (preserva override)
**And** o DM pode clicar "Resetar grupo" para re-sincronizar todos ao valor do header

**Cenario 6: Dados do roll registrados no DiceHistoryPanel**

**Given** um roll coletivo de initiative e executado para um grupo
**When** o resultado e registrado
**Then** o DiceHistoryPanel mostra uma unica entrada: "Goblins (grupo): d20+1 = 14"
**And** a entrada nao e duplicada para cada membro do grupo

**Definition of Done:**
- [ ] Roll coletivo aplica um unico d20 a todos membros do grupo
- [ ] "Roll All NPCs" rola uma vez por grupo (nao por membro)
- [ ] DM pode override initiative individual sem quebrar o grupo
- [ ] Initiative editavel no header do grupo (aplica a todos)
- [ ] DiceHistoryPanel registra uma entrada por grupo
- [ ] `next build` passa sem erros
