# Prompts de Execução — Epic User Journey & Onboarding

> **Epic:** `docs/epic-user-journey-onboarding.md`
> **Diagramas:** `public/video/user-journey-flows.html`
> **Data:** 2026-04-05
>
> ## Mapa de Dependências
>
> ```
> SPRINT 1 ─┬── JO-01 (invite token)     ← INDEPENDENTE
>            ├── JO-02 (join code token)  ← INDEPENDENTE
>            ├── JO-03 (sign-up contexto) ← após JO-01 + JO-02
>            └── JO-04 (recap CTA join)   ← INDEPENDENTE
>
> SPRINT 2 ─┬── JO-05 (role no wizard)   ← INDEPENDENTE
>            ├── JO-06 (simplificar step2)← INDEPENDENTE
>            ├── JO-07 (DM empty state)   ← INDEPENDENTE
>            └── JO-08 (celebração done)  ← INDEPENDENTE
>
> SPRINT 3 ─┬── JO-09 (player empty)     ← após JO-05
>            ├── JO-10 (sessão ativa)     ← INDEPENDENTE
>            ├── JO-11 (pending invites)  ← INDEPENDENTE
>            └── JO-12 (player tour)      ← após JO-09 + JO-11
>
> SPRINT 4 ─┬── JO-13 (DM checklist)     ← INDEPENDENTE
>            ├── JO-14 (DM tour)          ← após JO-13
>            ├── JO-15 (sidebar actions)  ← INDEPENDENTE
>            └── JO-16 (microcopy)        ← ÚLTIMO (revisa tudo)
> ```
>
> **Sprints 1 e 2 podem rodar 100% em paralelo.**
> Sprint 3 depende parcialmente de 1+2. Sprint 4 é polish final.
>
> **Ordem ideal de execução:**
> JO-01 → JO-02 → JO-04 → JO-03 → JO-05 → JO-06 → JO-07 → JO-08 → JO-09 → JO-10 → JO-11 → JO-12 → JO-13 → JO-14 → JO-15 → JO-16

---

## SPRINT 1 — Token Survival + Redirect Fixes ✅ CONCLUÍDA (2026-04-05) — commit `2c10277`

---

### Prompt JO-01 — Invite Token Survival Through Auth Flow

```
Leia o epic `docs/epic-user-journey-onboarding.md`, story JO-01.

## Contexto
Quando um jogador clica em `/invite/[token]` e não tem conta, é redirecionado para `/auth/login`. O token é perdido no redirect. Após criar conta, cai no dashboard vazio sem contexto.

## O que fazer
Implementar "token survival" — o invite token sobrevive ao fluxo inteiro de auth (sign-up, email confirm, OAuth).

### Passos:

1. **Ler os arquivos** antes de alterar:
   - `app/invite/[token]/page.tsx`
   - `app/auth/sign-up/page.tsx`
   - `app/auth/confirm/route.ts`
   - `app/app/dashboard/page.tsx`
   - Buscar o componente que renderiza o invite accept UI (InviteAcceptClient ou similar)

2. **No `/invite/[token]`** — quando o usuário não está autenticado e vai ser redirecionado para auth:
   - Salvar em `localStorage`: `pendingInvite = JSON.stringify({ token, path: '/invite/TOKEN' })`
   - Redirecionar para `/auth/sign-up?redirect=/invite/TOKEN` (preservar token na URL também)

3. **No `/auth/sign-up`** — aceitar query param `redirect`:
   - Preservar o `redirect` param ao longo do flow (passá-lo para o form action ou OAuth redirect)
   - Se tiver redirect, mostrar nada extra por agora (JO-03 adiciona contexto visual depois)

4. **No `/auth/confirm/route.ts`** (PKCE callback) — ler `redirect` do `searchParams` ou `next`:
   - Se existe `redirect` que começa com `/invite/`, redirecionar para lá (não para `/app/dashboard`)
   - ATENÇÃO: verificar como o callback PKCE atual funciona, não quebrar o flow existente

5. **No `/app/dashboard/page.tsx`** — fallback: se o redirect falhou, checar localStorage:
   - No mount, ler `pendingInvite` do localStorage
   - Se existe, redirecionar para o path salvo e limpar o storage
   - Esse é o safety net — o redirect param é o caminho principal

## Regras
- NÃO alterar nada em `components/combat/` ou componentes de combate
- NÃO alterar a lógica de accept do invite em si — só o redirect flow
- Testar mentalmente: OAuth Google, email+password com confirm, e email+password sem confirm
- Garantir build passando: `rtk next build`

## Critérios de aceite
- Jogador clica /invite/token → sign-up → email confirm → volta para /invite/token
- Jogador clica /invite/token → Google OAuth → volta para /invite/token
- Token sobrevive a tab close+reopen (localStorage fallback)
- Se token já foi aceito/expirou, mostra mensagem (não loop infinito)
- Build passando
```

---

### Prompt JO-02 — Join-Campaign Code Survival

```
Leia o epic `docs/epic-user-journey-onboarding.md`, story JO-02.

## Contexto
`/join-campaign/[code]` já redireciona para `/auth/sign-up?join_code=[code]` quando o user não está logado. Mas após o auth flow, o redirect de volta para `/join-campaign/[code]` pode falhar.

## O que fazer
Garantir que o join_code sobrevive ao auth flow completo, usando o mesmo padrão de JO-01.

### Passos:

1. **Ler os arquivos:**
   - `app/join-campaign/[code]/page.tsx`
   - `app/auth/sign-up/page.tsx`
   - `app/auth/confirm/route.ts`

2. **No `/join-campaign/[code]`** — quando redireciona para sign-up:
   - Verificar se já salva `join_code` no query param (parece que sim)
   - Adicionar fallback: `localStorage.setItem('pendingJoinCode', code)`

3. **No `/auth/sign-up`** — verificar que `join_code` é preservado:
   - Se recebe `join_code`, montar redirect: `/join-campaign/[code]`
   - Passar como `redirect` param no flow de auth (mesmo mecanismo de JO-01)

4. **No `/auth/confirm/route.ts`** — já deve funcionar se JO-01 implementou o redirect genérico.
   - Verificar que redirect para `/join-campaign/[code]` funciona

5. **No dashboard** — fallback:
   - Checar `pendingJoinCode` no localStorage
   - Se existe, redirecionar para `/join-campaign/[code]` e limpar

## Regras
- Se JO-01 já foi implementado, reaproveitar o mecanismo de redirect genérico
- NÃO alterar nada em componentes de combate
- Build passando: `rtk next build`

## Critérios de aceite
- Jogador com código → sign-up → volta para /join-campaign/[code] → entra na campanha
- Funciona com OAuth e email confirm
- Build passando
```

---

### Prompt JO-04 — Post-Combat CTA: Join Campaign (UC-08 NOVO)

```
Leia o epic `docs/epic-user-journey-onboarding.md`, story JO-04.

## Contexto
Jogador anônimo via `/join/[token]` participa de combate inteiro. Quando o combate acaba e o CombatRecap é exibido, NÃO existe CTA para entrar na campanha. Este é o maior momento de conversão orgânica do app.

O `CombatRecap` já aceita props: `onSaveAndSignup` (guest), `campaignId`, `encounterId`.
O `PlayerJoinClient` já recebe `campaignId` do server — MAS só usa para jogadores autenticados.

## REGRA CRÍTICA
**É PROIBIDO alterar a lógica interna do combate em andamento.** Alterações permitidas:
- Adicionar nova prop ao `CombatRecap` e `RecapActions`
- Alterar como `PlayerJoinClient` passa props para o recap APÓS o combate terminar
- NÃO alterar nada que acontece DURANTE o combate

## O que fazer

### Passos:

1. **Ler os arquivos:**
   - `components/combat/CombatRecap.tsx` — entender as props
   - `components/combat/RecapActions.tsx` — onde os botões do recap vivem
   - `components/player/PlayerJoinClient.tsx` — buscar onde o CombatRecap é renderizado
   - `app/join/[token]/page.tsx` — confirmar que `campaignId` é passado

2. **Em `RecapActions.tsx`** — adicionar botão condicional:
   - Nova prop: `onJoinCampaign?: () => void`
   - Se `onJoinCampaign` existe, renderizar botão:
     - Texto: usar i18n key (pt: "Entrar na Campanha", en: "Join Campaign")
     - Estilo: botão primário gold, full-width, com ícone de UserPlus ou similar
     - Posicionar ACIMA dos outros botões de ação (share, close)
   - Se não existe, não renderizar nada (backward compatible)

3. **Em `CombatRecap.tsx`** — passar a nova prop:
   - Aceitar `onJoinCampaign?: () => void`
   - Passar para `RecapActions`

4. **Em `PlayerJoinClient.tsx`** — conectar o callback:
   - Buscar onde `CombatRecap` é renderizado (provavelmente numa condicional de `phase === "recap"` ou similar)
   - Se o jogador é anônimo (não tem user autenticado real) E `campaignId` existe:
     - Passar `onJoinCampaign` que faz:
       ```ts
       const handleJoinCampaign = () => {
         localStorage.setItem('pendingCampaignJoin', JSON.stringify({
           campaignId,
           playerName: currentPlayerName, // nome usado no combate
         }));
         window.location.href = '/auth/sign-up?context=campaign_join';
       };
       ```
   - Se o jogador já é autenticado ou não tem campaignId, NÃO passar a prop

5. **Em `app/app/dashboard/page.tsx`** — adicionar handler de pendingCampaignJoin:
   - No mount (client-side), checar localStorage para `pendingCampaignJoin`
   - Se existe, chamar API para join na campanha (insert campaign_members)
   - Limpar localStorage após sucesso
   - Mostrar toast de sucesso: "Você entrou na campanha!"

6. **Adicionar i18n keys** em `messages/pt-BR.json` e `messages/en.json`:
   - `combat.recap_join_campaign`: "Entrar na Campanha"
   - `combat.recap_join_campaign_desc`: "Crie uma conta e continue jogando nessa mesa"
   - `dashboard.campaign_joined_success`: "Você entrou na campanha!"

## Critérios de aceite
- Jogador anônimo vê CTA "Entrar na Campanha" no recap quando session tem campaign_id
- Jogador autenticado NÃO vê o CTA (já está na campanha ou é tratado diferente)
- Clicar → sign-up → join campaign automático → dashboard player
- Se session NÃO tem campaign_id, CTA não aparece
- O combate em andamento NÃO é afetado (nenhuma alteração durante combat)
- Build passando: `rtk next build`
```

---

### Prompt JO-03 — Sign-Up Page com Contexto de Invite/Join

```
Leia o epic `docs/epic-user-journey-onboarding.md`, story JO-03.

## Pré-requisito
JO-01 e JO-02 devem estar implementados (o token já é salvo no localStorage e redirect param existe).

## Contexto
A página de sign-up é genérica. Quando o user vem de invite ou join, deveria mostrar contexto visual.

## O que fazer

### Passos:

1. **Ler os arquivos:**
   - `app/auth/sign-up/page.tsx`
   - `components/auth/AuthPageContent.tsx` (se existir)
   - `messages/pt-BR.json` e `messages/en.json` — seção "auth"

2. **Detectar contexto** na sign-up page:
   - Ler query params: `redirect`, `join_code`, `context`
   - Ler localStorage: `pendingInvite` (salvo por JO-01)
   - Determinar tipo: "invite" | "join_code" | "campaign_join" | "generic"

3. **Renderizar banner contextual** acima do formulário de sign-up:
   - Se tipo = "invite":
     - Tentar ler dados do `pendingInvite` no localStorage (pode ter campaignName, dmName)
     - Banner: "Crie sua conta para aceitar o convite" (ou com nomes se disponível)
   - Se tipo = "join_code":
     - Banner: "Crie sua conta para entrar na campanha"
   - Se tipo = "campaign_join":
     - Banner: "Crie uma conta grátis e continue jogando nessa mesa"
   - Se tipo = "generic":
     - Sem banner (comportamento atual)

4. **Estilo do banner:**
   - Card sutil acima do form, com borda gold/amber
   - Ícone contextual (Swords para player, Shield para DM)
   - Não intrusivo — complementa, não substitui o form

5. **Adicionar i18n keys:**
   - `auth.signup_context_invite`: "Crie sua conta para aceitar o convite"
   - `auth.signup_context_join_code`: "Crie sua conta para entrar na campanha"
   - `auth.signup_context_campaign_join`: "Crie uma conta grátis e continue jogando"

## Critérios de aceite
- Sign-up vindo de /invite mostra banner contextual
- Sign-up vindo de /join-campaign mostra banner contextual
- Sign-up vindo de recap (context=campaign_join) mostra banner contextual
- Sign-up normal permanece inalterado
- Build passando: `rtk next build`
```

---

## SPRINT 2 — Onboarding DM Melhorado ✅ CONCLUÍDA (2026-04-05) — commit `0923175`

---

### Prompt JO-05 — Integrar Role Selection no Wizard

```
Leia o epic `docs/epic-user-journey-onboarding.md`, story JO-05.

## Contexto
A página `/app/onboarding/role` com `RoleSelectionCards` existe mas está desconectada do wizard principal. O wizard deveria perguntar o role como primeiro passo.

## O que fazer

### Passos:

1. **Ler os arquivos:**
   - `components/dashboard/OnboardingWizard.tsx` (grande — ler com atenção o WizardStep type e o fluxo)
   - `components/auth/RoleSelectionCards.tsx`
   - `app/app/onboarding/page.tsx`
   - `app/app/dashboard/page.tsx` — lógica de redirect para onboarding

2. **Adicionar step "role" ao wizard** — no `OnboardingWizard.tsx`:
   - Adicionar "role" ao type `WizardStep`
   - Step "role" vem ANTES de "welcome" (é o novo primeiro step)
   - UI: 3 cards (Player / DM / Both) — copiar design do `RoleSelectionCards` ou importar o componente
   - Ao selecionar e continuar:
     - Se "player" → salvar role no DB (`users.role = 'player'`) → marcar `wizard_completed = true` → redirect para `/app/dashboard`
     - Se "dm" ou "both" → salvar role → continuar para step "welcome"

3. **Ajustar `OnboardingPage`** (`app/app/onboarding/page.tsx`):
   - Remover a lógica condicional de role que existir
   - O wizard agora cuida de tudo

4. **Ajustar `DashboardPage`** (`app/app/dashboard/page.tsx`):
   - O redirect para `/app/onboarding` deve acontecer para QUALQUER user novo sem campanhas (DM ou player)
   - Remover o check `userRole !== "player"` que hoje pula o onboarding para players
   - O wizard agora decide: se player → skip rápido, se DM → wizard completo

5. **Remover ou deprecar** `/app/onboarding/role/page.tsx` (absorvido pelo wizard)

## Regras
- NÃO alterar nada em componentes de combate
- O wizard existente não pode regredir para DMs que já completaram
- Manter `savedStep` compatível (users no meio do wizard não devem ser afetados)
- Build passando: `rtk next build`

## Critérios de aceite
- Wizard pergunta role no primeiro step
- Player → skip wizard → dashboard player (wizard_completed = true)
- DM/Both → wizard continua normalmente com steps existentes
- Role salvo no DB (users.role)
- Usuários que já completaram wizard NÃO são afetados
- Build passando
```

---

### Prompt JO-06 — Simplificar Step 2 do Wizard

```
Leia o epic `docs/epic-user-journey-onboarding.md`, story JO-06.

## Contexto
Step 2 do OnboardingWizard pede nome + HP + AC + spell_save_dc dos jogadores. O mestre muitas vezes não tem HP/AC na hora do onboarding. Isso gera fricção e abandono.

## O que fazer

### Passos:

1. **Ler `components/dashboard/OnboardingWizard.tsx`** — focar no step 2 (buscar "Step 2" ou "handlePlayerChange")

2. **Simplificar o formulário de Step 2:**
   - Campo de nome: VISÍVEL e obrigatório (como hoje)
   - Campos HP, AC, spell_save_dc: COLAPSADOS por padrão num accordion/expandable
     - Label do accordion: "Detalhes avançados (opcional)" ou "HP, AC e mais"
     - Quando expandido, mostra os campos como hoje
     - Defaults: HP=10, AC=10, spell_save_dc=null
   - Microcopy abaixo do nome: "Seus jogadores podem completar as fichas depois"

3. **Adicionar botão "Pular — convidar depois":**
   - Posicionar abaixo da lista de jogadores
   - Ao clicar: avançar para step 3 com `players = []` (zero jogadores é válido)
   - Microcopy: "Você pode adicionar jogadores depois no dashboard"

4. **Ajustar validação:**
   - Se tem jogadores, nome continua obrigatório
   - HP e AC usam defaults se não preenchidos (já devem ter defaults no `newPlayer()`)
   - Zero jogadores é válido → pular step normalmente

5. **Adicionar i18n keys:**
   - `onboarding.players_advanced_details`: "Detalhes avançados (opcional)"
   - `onboarding.players_skip`: "Pular — convidar depois"
   - `onboarding.players_skip_hint`: "Você pode adicionar jogadores depois"
   - `onboarding.players_fill_later`: "Seus jogadores podem completar as fichas depois"

## Critérios de aceite
- Step 2 mostra apenas campo de nome por padrão
- HP/AC acessíveis via expand mas não obrigatórios
- Botão "Pular" funciona e avança para step 3
- Zero jogadores é válido (campanha criada sem players)
- Dados pré-populados do guest combat continuam funcionando (source=guest_combat)
- Build passando: `rtk next build`
```

---

### Prompt JO-07 — DM Empty State Aprimorado

```
Leia o epic `docs/epic-user-journey-onboarding.md`, story JO-07.

## Contexto
Dashboard DM sem campanhas mostra empty state genérico. Deveria guiar o mestre com CTA forte e pixel art.

## O que fazer

### Passos:

1. **Ler `components/dashboard/DashboardOverview.tsx`** — encontrar o bloco que renderiza quando `campaigns.length === 0` para role DM/both.

2. **Redesenhar o empty state DM:**
   - Usar uma ilustração pixel art existente de `/art/icons/` (ex: `carta.png`, `team-chibi-1.png`, `mvp-crown.png` — ver o que faz sentido)
   - Layout centralizado:
     ```
     [Ilustração pixel art 80-120px]
     
     Título: "Sua mesa está pronta para a aventura!"
     Subtítulo: "Crie sua primeira campanha e convide seus jogadores"
     
     [Botão Primário: "Criar Primeira Campanha" → /app/session/new ou campaign create]
     [Botão Secundário (ghost): "Combate Rápido" → /try]
     ```
   - Se o DM tem campanha MAS zero sessões, mostrar nudge:
     - "Campanha criada! Agora convide seus jogadores e inicie a primeira sessão"
     - CTA: "Convidar Jogadores" (abre dialog de invite)

3. **Estilo:** Seguir design system existente — dark theme, gold accents, pixel art. Não inventar cores novas.

4. **Adicionar i18n keys:**
   - `dashboard.dm_empty_title_v2`: "Sua mesa está pronta para a aventura!"
   - `dashboard.dm_empty_desc_v2`: "Crie sua primeira campanha e convide seus jogadores"
   - `dashboard.dm_empty_cta_campaign`: "Criar Primeira Campanha"
   - `dashboard.dm_empty_cta_quick`: "Combate Rápido"
   - `dashboard.dm_nudge_invite`: "Campanha criada! Agora convide seus jogadores"

## Critérios de aceite
- DM sem campanhas vê empty state com ilustração e CTAs (não tela genérica)
- DM com campanha mas sem sessão vê nudge contextual
- CTAs navegam corretamente
- Visual consistente com brand guide (dark + gold + pixel art)
- Build passando: `rtk next build`
```

---

### Prompt JO-08 — Celebração do Onboarding Complete

```
Leia o epic `docs/epic-user-journey-onboarding.md`, story JO-08.

## Contexto
O step "done" do OnboardingWizard mostra link de sessão mas sem impacto emocional. O mestre acabou de criar sua mesa — isso merece celebração.

## O que fazer

### Passos:

1. **Ler `components/dashboard/OnboardingWizard.tsx`** — encontrar o step "done" (buscar por `showCelebration` ou o bloco final do wizard).

2. **Melhorar visual do step "done":**
   - Adicionar animação de confetti com framer-motion (particle animation simples, 2-3s)
   - Alternativa: animação de estrelas/sparkles caindo (mais sutil que confetti)
   - Usar os variants do motion já importados no componente
   - Título grande com animação de escala: "Sua mesa está pronta!"
   - Subtítulo: "Compartilhe o link com seus jogadores para começar"

3. **Melhorar botão "Copiar Link":**
   - Ao copiar: transição animada de "Copiar Link" → "Copiado!" com check icon
   - Cor gold no hover/active
   - Feedback visual mais forte (1.5s de estado "copiado")

4. **Adicionar botão "Ir para o Dashboard":**
   - Posicionar como CTA secundário abaixo do "Copiar Link"
   - Navega para `/app/dashboard`

5. **NÃO adicionar libs externas** — usar apenas framer-motion (já importado) para as animações.

## Critérios de aceite
- Step "done" tem animação de celebração (confetti ou sparkles)
- Copiar link tem feedback visual forte
- Botão "Ir para Dashboard" presente e funcional
- Animações não bloqueiam interação (user pode clicar durante animação)
- Build passando: `rtk next build`
```

---

## SPRINT 3 — Player Journey ✅ CONCLUÍDA (2026-04-05) — commit `617e723`

---

### Prompt JO-09 — Player Empty State: Sem Campanha

```
Leia o epic `docs/epic-user-journey-onboarding.md`, story JO-09.

## Pré-requisito suave
JO-05 (role selection) deveria estar implementado para que players puros cheguem aqui. Mas funciona sem — o dashboard já tem dual-role view.

## Contexto
Jogador que cria conta mas não tem campanha vê "Waiting for invite" sem CTA útil. Precisa de empty state com ações claras.

## O que fazer

### Passos:

1. **Ler `components/dashboard/DashboardOverview.tsx`** — encontrar o bloco que renderiza para player sem memberships.

2. **Redesenhar empty state do player:**
   - Ilustração pixel art (ex: personagem aventureiro esperando — usar assets de `/art/icons/`)
   - Layout:
     ```
     [Ilustração 80-120px]
     
     Título: "Aguardando o convite do seu mestre"
     Subtítulo: "Peça o link da sessão ou cole um código de campanha"
     
     [Input field: "Tem um código? Cole aqui" + Botão "Entrar"]
       → Submeter navega para /join-campaign/[code]
     
     [Separador "ou"]
     
     [Link: "Explore o compêndio enquanto espera" → /app/compendium]
     [Link: "Teste o combate por conta" → /try]
     ```

3. **Input de código de campanha:**
   - Campo de texto simples com placeholder "Código da campanha"
   - Botão "Entrar" ao lado
   - Ao submeter: `router.push(\`/join-campaign/\${code.trim()}\`)`
   - Validação básica: código não pode ser vazio

4. **Se `pendingInvites.length > 0`:**
   - Mostrar seção de invites pendentes ACIMA do empty state
   - Usar `PendingInvites` existente com mais destaque (ver JO-11)

5. **Adicionar i18n keys:**
   - `dashboard.player_empty_title`: "Aguardando o convite do seu mestre"
   - `dashboard.player_empty_desc`: "Peça o link da sessão ou cole um código"
   - `dashboard.player_empty_code_placeholder`: "Código da campanha"
   - `dashboard.player_empty_code_submit`: "Entrar"
   - `dashboard.player_empty_explore`: "Explore o compêndio enquanto espera"
   - `dashboard.player_empty_try`: "Teste o combate por conta"

## Critérios de aceite
- Player sem campanha vê empty state com CTAs claros (não "waiting for invite" genérico)
- Campo de código funciona e navega para /join-campaign/[code]
- Links para compêndio e /try funcionam
- Pending invites aparecem em destaque quando existem
- Build passando: `rtk next build`
```

---

### Prompt JO-10 — Player Dashboard: Sessão Ativa Destacada

```
Leia o epic `docs/epic-user-journey-onboarding.md`, story JO-10.

## Contexto
Jogador retorna e sua campanha tem sessão ativa. O CTA para entrar deveria ser mais óbvio.

## O que fazer

### Passos:

1. **Ler `components/dashboard/PlayerCampaignCard.tsx`** — entender o que é renderizado hoje.

2. **Adicionar indicador de sessão ativa:**
   - O card precisa receber info de sessão ativa (checar se `memberships` já inclui essa info ou se precisa fetch adicional)
   - Se tem sessão ativa:
     - Badge "AO VIVO" (pt) / "LIVE" (en) com animação de pulse (bolinha verde pulsante)
     - CSS: `animate-pulse` do Tailwind ou custom com `@keyframes`
     - Botão "Entrar na Sessão" em destaque (variant default/gold, full-width dentro do card)
     - Mostrar "Sessão ativa há X min" (calcular a partir de `updated_at`)
   - Se não tem sessão ativa: manter visual atual

3. **Ordenação:** No `DashboardOverview`, ordenar campanhas com sessão ativa ANTES das inativas.

4. **Adicionar i18n keys:**
   - `dashboard.session_live`: "AO VIVO"
   - `dashboard.session_join`: "Entrar na Sessão"
   - `dashboard.session_active_for`: "Sessão ativa há {minutes} min"

## Critérios de aceite
- Campanha com sessão ativa tem badge "AO VIVO" com pulse
- Botão "Entrar na Sessão" em destaque
- Campanhas com sessão ativa aparecem primeiro na lista
- Build passando: `rtk next build`
```

---

### Prompt JO-11 — Pending Invites UX Aprimorada

```
Leia o epic `docs/epic-user-journey-onboarding.md`, story JO-11.

## Contexto
Pending invites existem no dashboard mas podem ser ignorados. Jogador que recebeu invite precisa ver como prioridade.

## O que fazer

### Passos:

1. **Ler `components/dashboard/PendingInvites.tsx`** — entender visual e lógica atual.
2. **Ler `components/dashboard/DashboardOverview.tsx`** — onde PendingInvites é posicionado.

3. **Melhorar posicionamento e visual:**
   - Se player tem pending invites E não tem campanha ativa:
     - Invite card como PRIMEIRO elemento do dashboard (full-width, topo absoluto)
     - Animação de entrada: `motion.div` com `initial={{ opacity: 0, y: -10 }}` e `animate={{ opacity: 1, y: 0 }}`
   - Card visual:
     - Borda gold/amber sutil
     - Info: "[DM Name] te convidou para [Campaign Name]"
     - Botão "Aceitar" (gold, primário) | "Recusar" (ghost/outline)
     - Se múltiplos invites, stack vertical

4. **NÃO alterar** a lógica de accept/decline — só o visual e posicionamento.

5. **Adicionar i18n keys se necessário** — verificar o que já existe em `dashboard.pending_invites`, `dashboard.accept_invite`, etc.

## Critérios de aceite
- Pending invites aparecem como card destaque no topo do dashboard
- Aceitar funciona e redireciona para a campanha
- Recusar funciona e remove o card
- Animação de entrada sutil
- Build passando: `rtk next build`
```

---

### Prompt JO-12 — Player Micro-Tour: Primeira Campanha

```
Leia o epic `docs/epic-user-journey-onboarding.md`, story JO-12.

## Pré-requisito suave
JO-09 e JO-11 devem estar implementados (tour referencia componentes que precisam existir).

## Contexto
Jogador que acabou de entrar numa campanha deveria ter micro-onboarding de 3 tooltips.

## O que fazer

### Passos:

1. **Ler a infra de tour existente:**
   - `components/tour/DashboardTourProvider.tsx`
   - `components/tour/TourTooltip.tsx`
   - Entender como steps são definidos e como o trigger funciona

2. **Criar tour "player-first-campaign"** — 3 steps:
   - Step 1: "Sua campanha" — spotlight no `PlayerCampaignCard` (primeiro card)
   - Step 2: "Compêndio" — spotlight no item de menu/navbar do compêndio
   - Step 3: "Quando o mestre iniciar, você entra aqui" — spotlight no mesmo card com CTA

3. **Trigger:** Quando `memberships.length === 1` E `dashboard_tour_completed === false` (ou field equivalente no `user_onboarding`)

4. **Após tour completo ou skip:** Marcar `dashboard_tour_completed = true` no `user_onboarding`

5. **Se a infra de tour não suportar** steps customizáveis por role, adaptar o `DashboardTourProvider` para aceitar um array de steps configurável.

## Critérios de aceite
- Tour de 3 steps aparece na primeira vez do player com campanha
- Skip funciona e marca como concluído
- Não aparece em visitas subsequentes
- Build passando: `rtk next build`
```

---

## SPRINT 4 — Polish & Activation ✅ CONCLUÍDA (2026-04-05) — commit `dc3ba11`

---

### Prompt JO-13 — DM Activation Checklist

```
Leia o epic `docs/epic-user-journey-onboarding.md`, story JO-13.

## Contexto
Após onboarding, o DM não tem guia de próximos passos. Padrão de mercado usa checklist de ativação.

## O que fazer

### Passos:

1. **Criar `components/dashboard/ActivationChecklist.tsx`:**
   - Componente client-side com 5 itens detectados automaticamente:
     ```
     1. [✓] Criar sua conta          (always true)
     2. [ ] Rodar seu primeiro combate (encounters count > 0)
     3. [ ] Convidar um jogador        (session_tokens with player_name > 0)
     4. [ ] Usar ações lendárias       (combatants with legendary_actions_used > 0, OU skip se não aplicável)
     5. [ ] Ver o recap do combate     (combat_reports count > 0)
     ```
   - Cada item é clicável e deep-linka para a ação correspondente
   - Progress bar: "X/5 completo"
   - Botão dismiss ("x") → salva `checklist_dismissed` no localStorage ou `user_onboarding`

2. **Fetch de dados:** Criar API route ou server action que retorna os 5 booleans:
   - Query em `encounters`, `session_tokens`, `combatants`, `combat_reports`
   - Ou fetch client-side via supabase client (mais simples)

3. **Em `DashboardOverview.tsx`:**
   - Renderizar `ActivationChecklist` para role DM/both
   - Não mostrar se `checklist_dismissed` ou todos os 5 completos
   - Posicionar abaixo do header, acima dos campaign cards

4. **Estilo:**
   - Card com borda sutil, background elevated
   - Items com checkbox visual (✓ verde quando completo)
   - Progress bar com cor gold
   - Dismiss: ícone X no canto superior direito

5. **Adicionar i18n keys** para todos os 5 items + título + dismiss.

## Critérios de aceite
- Checklist aparece no dashboard DM até completada ou dismissada
- Items detectados automaticamente (não manual)
- Cada item clicável e linka para ação correspondente
- Dismiss persiste entre sessões
- Confetti ou highlight ao completar 5/5 (opcional, nice-to-have)
- Build passando: `rtk next build`
```

---

### Prompt JO-14 — DM Dashboard Tour

```
Leia o epic `docs/epic-user-journey-onboarding.md`, story JO-14.

## Pré-requisito suave
JO-13 (checklist) deveria existir para o tour poder referenciar.

## Contexto
DM completa wizard e cai no dashboard sem saber o que cada seção faz. Infra de tour já existe.

## O que fazer

### Passos:

1. **Ler a infra de tour:**
   - `components/tour/DashboardTourProvider.tsx`
   - `components/tour/TourTooltip.tsx`
   - Entender steps existentes (pode já ter steps — adaptar ou substituir)

2. **Configurar tour DM** — 4-5 steps:
   - Step 1: "Campanhas" — spotlight no sidebar item ou campaign card
   - Step 2: "Combates" — spotlight no sidebar "Combats"
   - Step 3: "Compêndio" — spotlight no navbar dropdown
   - Step 4: "Ações Rápidas" — spotlight na área de QuickActions
   - Step 5: "Pronto! Comece criando um combate" — spotlight no CTA primário

3. **Trigger:** `wizard_completed === true` E `dashboard_tour_completed === false` E role !== "player"

4. **Após tour:** Marcar `dashboard_tour_completed = true`

5. **Se JO-12 já implementou tour de player**, garantir que são tours distintos que não conflitam.

## Critérios de aceite
- Tour aparece após completar wizard pela primeira vez
- Skip/dismiss funciona e marca como concluído
- Não conflita com player tour (JO-12)
- Build passando: `rtk next build`
```

---

### Prompt JO-15 — Sidebar Quick Actions Contextuais

```
Leia o epic `docs/epic-user-journey-onboarding.md`, story JO-15.

## Contexto
Sidebar tem navegação estática. Quick actions contextuais ajudam o DM a agir mais rápido.

## O que fazer

### Passos:

1. **Ler `components/dashboard/DashboardSidebar.tsx`** — entender estrutura da sidebar (desktop + mobile).

2. **Adicionar seção "Ações Rápidas" na sidebar desktop:**
   - Posicionar abaixo dos nav items, separado por divider sutil
   - Dois botões:
     - "Novo Combate" (Swords icon) → `/app/session/new`
     - "Convidar Jogador" (UserPlus icon) → abre dialog de invite
   - Visível apenas em modo expandido (collapsed = escondido)
   - Visível apenas para role DM/both

3. **Mobile bottom nav:**
   - No menu "More" (overflow), adicionar "Novo Combate" como item
   - "Convidar Jogador" pode ficar no "More" também

4. **Para o "Convidar Jogador":** checar se já existe um dialog de invite reutilizável no dashboard. Se sim, triggar ele. Se não, navegar para a campanha mais recente.

## Critérios de aceite
- Quick actions visíveis na sidebar expandida (desktop)
- Links navegam corretamente
- Mobile: ações no menu "More"
- Visível apenas para DM/both (não para player puro)
- Build passando: `rtk next build`
```

---

### Prompt JO-16 — Microcopy Review

```
Leia o epic `docs/epic-user-journey-onboarding.md`, story JO-16.

## Pré-requisito
Executar DEPOIS de todas as outras stories (é a review final).

## Contexto
Revisão de todos os textos de auth e onboarding para microcopy empático e celebratório.

## O que fazer

### Passos:

1. **Ler os arquivos de i18n:**
   - `messages/pt-BR.json` — seções: auth, onboarding, dashboard
   - `messages/en.json` — mesmas seções

2. **Revisar e melhorar textos em:**
   - Sign-up page: título, descrição, CTAs
   - Login page: título (contextual se possível)
   - OnboardingWizard: cada step (welcome, role, step 1-3, express, done)
   - Dashboard empty states (DM e player)
   - Pending invites
   - Activation checklist items

3. **Princípios de microcopy:**
   - Celebratório nos momentos de conquista ("Sua mesa está pronta!")
   - Empático nos momentos de espera ("Aguardando o convite...")
   - Actionável nos CTAs ("Criar Primeira Campanha", não "Criar")
   - Consistente entre pt-BR e en
   - SEM emoji nos textos (regra do projeto)

4. **Verificar** que todos os novos textos adicionados por JO-01 a JO-15 existem em AMBOS os idiomas.

## Critérios de aceite
- Todos os textos de auth/onboarding revisados em pt-BR e en
- Textos consistentes com tom celebratório/empático
- Nenhuma key de i18n faltando
- Build passando: `rtk next build`
```

---

## Resumo de Execução

| Ordem | Story | Pode paralelizar com | Depende de |
|---|---|---|---|
| 1 | JO-01 | JO-02, JO-04 | — |
| 2 | JO-02 | JO-01, JO-04 | — |
| 3 | JO-04 | JO-01, JO-02 | — |
| 4 | JO-03 | — | JO-01 + JO-02 |
| 5 | JO-05 | JO-06, JO-07, JO-08 | — |
| 6 | JO-06 | JO-05, JO-07, JO-08 | — |
| 7 | JO-07 | JO-05, JO-06, JO-08 | — |
| 8 | JO-08 | JO-05, JO-06, JO-07 | — |
| 9 | JO-09 | JO-10, JO-11 | JO-05 (suave) |
| 10 | JO-10 | JO-09, JO-11 | — |
| 11 | JO-11 | JO-09, JO-10 | — |
| 12 | JO-12 | — | JO-09 + JO-11 |
| 13 | JO-13 | JO-15 | — |
| 14 | JO-14 | — | JO-13 (suave) |
| 15 | JO-15 | JO-13 | — |
| 16 | JO-16 | — | TODOS (review final) |
