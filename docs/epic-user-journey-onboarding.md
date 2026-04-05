# Epic: Jornada do Usuário & Onboarding — Área Logada Pocket DM

**Projeto:** Pocket DM
**Autor:** BMAD Party Mode (John PM + Sally UX + Mary Analyst) + Dani_
**Data:** 2026-04-05
**Status:** Sprint 1 concluída e deployada em produção (2026-04-05)
**Prioridade:** P0 — Nova prioridade principal do projeto
**Dependência:** Epic Dual-Role (`epic-campaign-dual-role.md`) — JÁ IMPLEMENTADO
**Referência:** `docs/internal/user-journey-flows.html` (diagramas Mermaid)
**Bucket:** `docs/bucket-future-ideas.md` | Workstreams: `docs/workstream-2-product-features.md`

---

## 🚫 Regra Absoluta — Zona Proibida

**É PROIBIDO alterar QUALQUER coisa relacionada ao combate:**

| Zona Proibida | Abrangência |
|---|---|
| Tela de construção de combate | `app/app/session/new/`, `CombatSessionClient`, encounter builder |
| Combate em andamento (ongoing) | `CombatTracker`, `PlayerJoinClient` (combat mode), `GuestCombatClient` |
| Componentes de combate | `components/combat/` (todos), `components/player/PlayerInitiativeBoard` |
| Combat recap | `CombatRecap.tsx` e sub-componentes (awards, narratives, summary, actions) |
| Realtime/broadcast combat | Channels, heartbeat, presence, state machine |

**O que PODE ser alterado:** Tudo na área logada fora do combate — dashboard, onboarding, sidebar, campaigns, settings, auth flows, empty states, navegação, Player HQ shell.

---

## 0. Estado Atual — O Que Já Existe

### Infraestrutura implementada (do Epic Dual-Role + Player HQ)

| Componente | Status |
|---|---|
| `campaign_members` table + RLS + accept_invite RPC | ✅ Implementado |
| Dashboard dual-role (DM + Player views) | ✅ Implementado |
| `OnboardingWizard.tsx` (4 steps + express) | ✅ Implementado (precisa melhorias) |
| `RoleSelectionCards.tsx` | ✅ Implementado (desconectado do fluxo) |
| `WelcomeScreen.tsx` (3 sources) | ✅ Implementado |
| `DashboardSidebar.tsx` (desktop + mobile) | ✅ Implementado |
| `PendingInvites.tsx` | ✅ Implementado |
| `PlayerCampaignCard.tsx` + `PlayerCampaignView.tsx` | ✅ Implementado |
| `GuestDataImportModal.tsx` | ✅ Implementado |
| `DashboardTourProvider.tsx` + `TourTooltip.tsx` | ✅ Implementado (infra de tour existe!) |
| Google OAuth (`GoogleOAuthButton.tsx`) | ✅ Implementado |
| Join por código (`/join-campaign/[code]`) | ✅ Implementado |
| Join por token de sessão (`/join/[token]`) | ✅ Implementado |
| Invite por token de campanha (`/invite/[token]`) | ✅ Implementado (com bug de token survival) |
| Email invite via Resend | ✅ Implementado |
| `user_onboarding` table (wizard_completed, source, wizard_step) | ✅ Implementado |

### Gaps identificados na análise de jornada

| ID | Gap | Severidade | UC Afetado |
|---|---|---|---|
| GAP-01 | Token do invite perdido durante auth flow | ✅ Resolvido (JO-01) | UC-05 |
| GAP-02 | Jogador anônimo pós-combate sem CTA de join campanha | ✅ Resolvido (JO-04) | UC-08 |
| GAP-03 | Onboarding wizard pede HP/AC dos jogadores prematuramente | 🟠 Alto | UC-02 |
| GAP-04 | Player sem campanha vê "waiting for invite" sem CTA | 🟠 Alto | UC-06 |
| GAP-05 | Role selection desconectada do wizard principal | 🟡 Médio | UC-02 |
| GAP-06 | Sem tour do dashboard pós-onboarding | 🟡 Médio | UC-02, UC-05 |
| GAP-07 | Sign-up page sem contexto de invite/join | 🟠 Alto | UC-05, UC-08 |
| GAP-08 | DM empty state genérico (sem tutorial, sem CTA forte) | 🟡 Médio | UC-02 |

---

## 1. Use Cases Mapeados

| UC | Persona | Cenário | Entry Point | Status |
|---|---|---|---|---|
| UC-01 | DM/Curioso | Guest testa combate → converte | `/try` | ✅ Funcional |
| UC-02 | DM | Primeiro acesso — cria campanha | `/auth/sign-up` | ⚠️ Incompleto |
| UC-03 | DM | Retorna — retoma sessão ativa | `/auth/login` | ✅ Funcional |
| UC-04 | DM | Nova sessão em campanha existente | `/app/dashboard` | ✅ Funcional |
| UC-05 | Jogador | Convite autenticado — 1ª vez | `/invite/[token]` | ✅ Funcional (JO-01) |
| UC-06 | Jogador | Retorna — acessa sessão ativa | `/auth/login` | ⚠️ Frágil |
| UC-07 | Jogador | Combate anônimo via link sessão | `/join/[token]` | ✅ Funcional |
| **UC-08** | **Jogador** | **Combate anônimo → recap → join campanha** | `/join/[token]` | **✅ Funcional (JO-04)** |
| UC-09 | DM | Convida jogador por email | `/app/dashboard` | ✅ Funcional |
| UC-10 | Jogador | Aceita invite pelo dashboard | `/app/dashboard` | ⚠️ Incompleto |
| UC-11 | Ambos | Entra via código de campanha | `/join-campaign/[code]` | ✅ Funcional |

---

## 2. Pesquisa de Mercado — Padrões Identificados

> Pesquisa completa de SaaS onboarding, gaming companion apps, e práticas de mercado.

### Padrões que devemos adotar

| Padrão | Fonte | Aplicação no Pocket DM |
|---|---|---|
| **Role Bifurcation no Day 0** | D&D Beyond, Slack, Notion | Perguntar "DM ou Jogador?" antes do wizard, não depois |
| **Session-first, account-later** | Alchemy RPG, TikTok, Canva | Jogador joga primeiro, cria conta depois (já temos /join) |
| **Token triple-storage** | Discord, Slack | Salvar invite token em sessionStorage + localStorage + cookie |
| **Preview before signup** | Trello, Discord | Mostrar nome do DM + campanha antes de pedir auth |
| **Checklist de ativação** | Linear, Notion, Intercom | 5 itens no dashboard DM pós-onboarding |
| **Template/sample content** | Figma, Notion, Canva | DM recebe combate tutorial pré-montado |
| **Empty state com CTA** | Linear, Slack | Player sem campanha vê CTA forte, não tela morta |
| **Post-auth redirect** | Discord, Slack, Notion | Após signup, voltar para o contexto original (não dashboard) |

### Anti-padrões a evitar

| Anti-Padrão | Risco | Exemplo |
|---|---|---|
| Blank empty state | Abandono imediato | Game Master 5e |
| Modal tour obrigatório | Irritação | Roll20 |
| Signup antes de demonstrar valor | Churn no funnel | Qualquer app sem free trial |
| Pedir dados que o user não tem | Abandono no wizard | Nosso wizard atual (HP/AC) |
| Redirect para dashboard genérico pós-invite | Confusão, token perdido | Nosso fluxo atual |

---

## 3. Sprints de Implementação

### Visão geral dos sprints

| Sprint | Foco | Stories | Impacto |
|---|---|---|---|
| **Sprint 1** | Quick Wins — Token Survival + Redirect Fixes | JO-01 a JO-04 | ✅ **CONCLUÍDA** — Deployada 2026-04-05 |
| **Sprint 2** | Onboarding DM Melhorado + Role Selection | JO-05 a JO-08 | 🟠 Alto — First-time DM |
| **Sprint 3** | Player Journey — Empty States + Activation | JO-09 a JO-12 | 🟠 Alto — Player retention |
| **Sprint 4** | Polish — Tour, Checklist, Micro-copy | JO-13 a JO-16 | 🟡 Médio — Activation depth |

---

### SPRINT 1 — Token Survival + Redirect Fixes (P0 Quick Wins)

> Corrige o funil quebrado. Cada fix é independente. Pode ser paralelizado.

---

#### JO-01 — Invite Token Survival Through Auth Flow

**Gap:** GAP-01 | **UC:** UC-05 | **Esforço:** P (pequeno) | **Impacto:** 🔴 Crítico

**Problema:** Quando um jogador clica `/invite/[token]` e não tem conta, é redirecionado para `/auth/login`. O token é perdido. Após criar conta, cai no dashboard vazio.

**Solução:**
1. Na página `/invite/[token]`, antes de redirecionar para auth, salvar em 3 lugares:
   - `sessionStorage.setItem('pendingInvite', JSON.stringify({ token, campaignName, dmName }))`
   - `localStorage.setItem('pendingInvite', token)` (fallback)
   - Query param: `/auth/sign-up?redirect=/invite/[token]`
2. No callback de auth (`/auth/confirm/route.ts`), checar `redirect` query param
3. No `DashboardPage` ou layout, checar `pendingInvite` no storage e redirecionar

**Arquivos a alterar:**
- `app/invite/[token]/page.tsx` — salvar token antes de redirect
- `components/auth/InviteAcceptClient.tsx` (ou o componente que renderiza o invite) — lógica de pre-save
- `app/auth/confirm/route.ts` — respeitar `redirect` param no callback PKCE
- `app/auth/sign-up/page.tsx` — aceitar e preservar `redirect` query param
- `app/app/dashboard/page.tsx` — checar `pendingInvite` no mount e redirecionar

**Critérios de aceite:**
- [x] Jogador clica /invite/token → cria conta → volta para /invite/token automaticamente
- [x] Token sobrevive a: OAuth redirect, email confirm, tab close+reopen
- [x] Se token expirou ou foi aceito, mostra mensagem apropriada (não loop)
- [x] Funciona com Google OAuth e email/password
- [x] Build passando

**Implementado em:** `components/sign-up-form.tsx` (localStorage + OAuth fix), `components/dashboard/DashboardOverview.tsx` (safety net redirect). Commit: `2c10277`

---

#### JO-02 — Join-Campaign Token Survival (Código de Campanha)

**Gap:** GAP-07 | **UC:** UC-11 | **Esforço:** PP (muito pequeno) | **Impacto:** 🟠 Alto

**Problema:** `/join-campaign/[code]` já redireciona para `/auth/sign-up?join_code=[code]`, mas o sign-up page precisa preservar esse código e redirecionar de volta após auth.

**Solução:**
1. Verificar que `/auth/sign-up` lê `join_code` query param
2. Após auth, redirecionar para `/join-campaign/[code]` (não dashboard)
3. Fallback: `localStorage.setItem('pendingJoinCode', code)`

**Arquivos a alterar:**
- `app/auth/sign-up/page.tsx` — preservar `join_code` no redirect
- `app/auth/confirm/route.ts` — respeitar redirect para `/join-campaign/[code]`

**Critérios de aceite:**
- [x] Jogador com código → sign-up → volta para /join-campaign/[code] → entra na campanha
- [x] Código sobrevive ao flow de auth (OAuth + email confirm)
- [x] Build passando

**Implementado em:** Reutiliza mecanismo de JO-01 (`pendingJoinCode` no localStorage). Commit: `2c10277`

---

#### JO-03 — Sign-Up Page com Contexto de Invite/Join

**Gap:** GAP-07 | **UC:** UC-05, UC-08, UC-11 | **Esforço:** P (pequeno) | **Impacto:** 🟠 Alto

**Problema:** A página de sign-up é genérica. Quando o usuário vem de um invite ou join, deveria mostrar contexto: "Crie sua conta para entrar na campanha [X] de [DM Y]".

**Solução:**
1. Ler query params (`redirect`, `join_code`, `context=campaign_join`)
2. Se tem contexto de invite/join, mostrar banner contextual acima do form
3. Microcopy: "Quase lá! Crie sua conta para entrar na mesa de [DM Name]"
4. Ler dados do localStorage se disponível (salvos por JO-01)

**Arquivos a alterar:**
- `app/auth/sign-up/page.tsx` — ler query params e renderizar banner
- `components/auth/AuthPageContent.tsx` — aceitar prop de contexto

**Critérios de aceite:**
- [x] Sign-up vindo de /invite mostra banner contextual (simplificado vs spec — sem nome de DM, mas detecta contexto)
- [x] Sign-up vindo de /join-campaign mostra banner contextual
- [x] Sign-up normal (sem contexto) permanece inalterado
- [x] Build passando

**Implementado em:** `components/sign-up-form.tsx` — banner gold/amber inline com ícone contextual. i18n em `signup.signup_context_*`. Commit: `2c10277`

---

#### JO-04 — Post-Combat CTA: Join Campaign para Jogador Anônimo (UC-08 NOVO)

**Gap:** GAP-02 | **UC:** UC-08 | **Esforço:** M (médio) | **Impacto:** 🔴 Crítico

**Problema:** Jogador anônimo via `/join/[token]` participa do combate inteiro. Quando o combate acaba e o recap é exibido, não existe CTA para o jogador entrar na campanha do mestre. Este é o maior momento de conversão orgânica do app e está desperdiçado.

**Contexto técnico:**
- `CombatRecap` já aceita prop `onSaveAndSignup` (usada pelo Guest)
- `PlayerJoinClient` já recebe `campaignId` do server (mas só para auth users)
- O dado `session.campaign_id` está disponível no server

**Solução:**
1. Passar `campaignId` para `PlayerJoinClient` mesmo para jogadores anônimos (já passa! mas o client não usa para CTA)
2. Criar nova prop no `CombatRecap`: `onJoinCampaign?: (campaignId: string) => void`
3. Quando `campaignId` existe E o usuário é anônimo → mostrar CTA no recap:
   - Título: "Quer continuar nessa campanha?"
   - Subtítulo: "Crie uma conta grátis e suas partidas serão salvas"
   - Botão primário: "Entrar na Campanha" (gold, destaque)
   - Botão secundário: "Talvez depois" (dismiss)
4. Ao clicar "Entrar na Campanha":
   - Salvar no localStorage: `{ pendingCampaignJoin: campaignId, playerName, characterStats }`
   - Redirecionar para `/auth/sign-up?context=campaign_join&redirect=/join-campaign/...`
5. Após auth, restaurar contexto e fazer join na campanha

**⚠️ ATENÇÃO: Não alterar CombatRecap.tsx internamente.** A alteração é apenas:
- Adicionar a nova prop `onJoinCampaign`
- O CTA é renderizado por um wrapper/container externo ao recap, ou via `RecapActions`

**Arquivos a alterar:**
- `components/combat/RecapActions.tsx` — adicionar botão de join campaign (se receber prop)
- `components/combat/CombatRecap.tsx` — passar nova prop adiante para RecapActions
- `components/player/PlayerJoinClient.tsx` — conectar campaignId ao callback do recap
- `app/auth/sign-up/page.tsx` — ler context=campaign_join
- `app/app/dashboard/page.tsx` — checar pendingCampaignJoin no mount

**Critérios de aceite:**
- [x] Jogador anônimo vê CTA "Entrar na Campanha" no recap quando session tem campaign_id
- [x] Clicar no CTA → sign-up → join campaign automático → dashboard player
- [x] Se session NÃO tem campaign_id, CTA não aparece
- [x] O combate em andamento NÃO é afetado (nenhuma alteração durante combat)
- [x] Build passando

**Implementado em:** `app/join/[token]/page.tsx` (`sessionCampaignId` prop), `components/player/PlayerJoinClient.tsx` (callback), `components/combat/CombatRecap.tsx` + `RecapActions.tsx` (botão gold), `app/app/dashboard/actions.ts` (server action com service client, bypassa RLS). Commit: `2c10277`

---

### SPRINT 2 — Onboarding DM Melhorado (P0-P1)

> Melhora a experiência do mestre na primeira vez. Nenhuma alteração no combate.

---

#### JO-05 — Integrar Role Selection no Onboarding Wizard

**Gap:** GAP-05 | **UC:** UC-02 | **Esforço:** P (pequeno) | **Impacto:** 🟡 Médio

**Problema:** A página `/app/onboarding/role` com `RoleSelectionCards` existe mas não está integrada no fluxo principal. O wizard não pergunta o role de forma natural.

**Solução:**
1. Adicionar step "role" como primeiro step do `OnboardingWizard` (antes de "welcome")
2. Se role = "player" → skip wizard inteiro, marcar `wizard_completed=true`, ir para dashboard player
3. Se role = "dm" ou "both" → continuar wizard normalmente
4. Remover redirect isolado para `/app/onboarding/role` (absorvido pelo wizard)

**Arquivos a alterar:**
- `components/dashboard/OnboardingWizard.tsx` — novo step "role" no início
- `app/app/onboarding/page.tsx` — remover redirect condicional de role
- `app/app/dashboard/page.tsx` — ajustar lógica de redirect (player sem campanha vai para dashboard, não wizard)

**Critérios de aceite:**
- [ ] Wizard pergunta role no primeiro step
- [ ] Player puro → skip wizard → dashboard player (com empty state adequado)
- [ ] DM/Both → wizard continua normalmente
- [ ] Role salvo no DB (`users.role`)
- [ ] Build passando

---

#### JO-06 — Simplificar Step 2 do Wizard (Jogadores)

**Gap:** GAP-03 | **UC:** UC-02 | **Esforço:** P (pequeno) | **Impacto:** 🟠 Alto

**Problema:** Step 2 pede nome + HP + AC + spell_save_dc dos jogadores. O mestre frequentemente não tem esses dados na hora do onboarding. Isso causa abandono.

**Solução:**
1. Step 2 passa a pedir APENAS nome dos jogadores
2. HP, AC, spell_save_dc têm defaults inteligentes (HP=10, AC=10, spell_save_dc=null)
3. Adicionar opção "Pular — convidar depois"
4. Microcopy: "Seus jogadores podem completar suas fichas depois"
5. Opcionalmente mostrar campo de email para convite (não obrigatório)

**Arquivos a alterar:**
- `components/dashboard/OnboardingWizard.tsx` — simplificar step 2, adicionar skip

**Critérios de aceite:**
- [ ] Step 2 mostra apenas campo de nome por padrão
- [ ] HP/AC têm defaults e podem ser editados (accordion/expand)
- [ ] Botão "Pular — convidar depois" funciona e vai pro step 3
- [ ] Zero jogadores é válido (wizard cria campanha sem players)
- [ ] Build passando

---

#### JO-07 — DM Empty State Aprimorado

**Gap:** GAP-08 | **UC:** UC-02 | **Esforço:** P (pequeno) | **Impacto:** 🟡 Médio

**Problema:** Dashboard DM sem campanhas mostra empty state genérico. Deveria guiar o mestre com CTA forte e contexto.

**Solução:**
1. Redesenhar empty state do DM com:
   - Ilustração pixel art (usar asset existente de `/art/icons/`)
   - Título: "Sua mesa está pronta para a aventura!"
   - CTA primário: "Criar Primeira Campanha" (link para onboarding ou campaign create)
   - CTA secundário: "Testar combate rápido" (link para /try)
   - Sub-text: "Ou experimente o combate guest para ver como funciona"
2. Se o DM completou o wizard mas tem 0 sessões, mostrar nudge: "Convide seus jogadores!"

**Arquivos a alterar:**
- `components/dashboard/DashboardOverview.tsx` — melhorar empty state rendering

**Critérios de aceite:**
- [ ] DM sem campanhas vê CTA forte e ilustração (não tela vazia)
- [ ] DM com campanha mas sem sessão vê nudge de "convidar jogadores"
- [ ] CTAs funcionam e navegam corretamente
- [ ] Build passando

---

#### JO-08 — Celebração do Onboarding Complete

**UC:** UC-02 | **Esforço:** PP (muito pequeno) | **Impacto:** 🟡 Médio

**Problema:** O step "done" do wizard mostra o link de sessão mas sem impacto emocional. O mestre acabou de montar sua mesa — isso deveria ser celebrado.

**Solução:**
1. Adicionar animação de confetti/pixel-art ao step "done" (usar motion/framer-motion já disponível)
2. Microcopy melhorado: "Sua mesa está pronta! 🎲 Compartilhe o link com seus jogadores"
3. Botão "Copiar Link" com feedback visual mais forte (animação de check, cor gold)
4. Botão "Ir para o Dashboard" como CTA secundário

**Arquivos a alterar:**
- `components/dashboard/OnboardingWizard.tsx` — step "done" visual upgrade

**Critérios de aceite:**
- [ ] Step "done" tem animação de celebração
- [ ] Link de sessão é copiável com feedback visual claro
- [ ] Botão "Ir para Dashboard" presente
- [ ] Build passando

---

### SPRINT 3 — Player Journey (P1)

> Foco no jogador autenticado. Empty states, activation, pending invites UX.

---

#### JO-09 — Player Empty State: Sem Campanha

**Gap:** GAP-04 | **UC:** UC-06 | **Esforço:** P (pequeno) | **Impacto:** 🟠 Alto

**Problema:** Jogador que cria conta mas não tem campanha vê "Waiting for invite" sem contexto. Isso é abandono disfarçado de UI.

**Solução:**
1. Redesenhar empty state do player:
   - Ilustração pixel art (personagem esperando, estilo marca)
   - Título: "Aguardando o convite do seu mestre"
   - Subtítulo: "Peça o link de sessão ou código de campanha"
   - Input field: "Tem um código? Cole aqui" → join-campaign direto
   - CTA secundário: "Enquanto espera, explore o compêndio" → /app/compendium
   - CTA terciário: "Teste o combate por conta" → /try
2. Se `pendingInvites.length > 0`, mostrar invite cards com destaque (já existe, mas reforçar)

**Arquivos a alterar:**
- `components/dashboard/DashboardOverview.tsx` — novo bloco de empty state para player

**Critérios de aceite:**
- [ ] Player sem campanha vê empty state com CTAs claros
- [ ] Campo de código de campanha funciona inline
- [ ] Links para compêndio e /try funcionam
- [ ] Pending invites aparecem em destaque quando existem
- [ ] Build passando

---

#### JO-10 — Player Dashboard: Sessão Ativa Destacada

**UC:** UC-06 | **Esforço:** P (pequeno) | **Impacto:** 🟡 Médio

**Problema:** Quando o jogador retorna e sua campanha tem sessão ativa, o CTA para entrar deveria ser mais óbvio.

**Solução:**
1. No `PlayerCampaignCard`, quando a campanha tem sessão ativa:
   - Badge pulsante "AO VIVO" (verde, animação de pulse)
   - Botão "Entrar na Sessão" em destaque (gold, full-width)
   - Mostrar há quanto tempo a sessão está ativa
2. Ordenar campanhas com sessão ativa no topo

**Arquivos a alterar:**
- `components/dashboard/PlayerCampaignCard.tsx` — badge de sessão ativa + CTA
- `components/dashboard/DashboardOverview.tsx` — ordenação por sessão ativa

**Critérios de aceite:**
- [ ] Campanha com sessão ativa tem badge "AO VIVO" pulsante
- [ ] Botão "Entrar na Sessão" em destaque
- [ ] Campanhas com sessão ativa aparecem primeiro
- [ ] Build passando

---

#### JO-11 — Pending Invites: UX Aprimorada

**UC:** UC-10 | **Esforço:** P (pequeno) | **Impacto:** 🟡 Médio

**Problema:** Pending invites existem no dashboard mas podem ser facilmente ignorados. O jogador que recebeu invite precisa ver isso como prioridade.

**Solução:**
1. Se `pendingInvites.length > 0` e player não tem campanha ativa:
   - Mostrar como card fullwidth no topo do dashboard (não sidebar notification)
   - Animação sutil de entrada (slide-in ou fade)
   - Info: "[DM Name] te convidou para [Campaign Name]"
   - Botões: "Aceitar" (gold, primário) | "Recusar" (ghost)
2. Notification bell badge count deve incluir pending invites

**Arquivos a alterar:**
- `components/dashboard/PendingInvites.tsx` — redesign visual
- `components/dashboard/DashboardOverview.tsx` — posicionamento no topo

**Critérios de aceite:**
- [ ] Pending invites aparecem como card destaque no topo
- [ ] Aceitar funciona e redireciona para a campanha
- [ ] Recusar funciona e remove o card
- [ ] Build passando

---

#### JO-12 — Player Onboarding Micro: Primeira Sessão

**UC:** UC-05, UC-08 | **Esforço:** PP (muito pequeno) | **Impacto:** 🟡 Médio

**Problema:** O jogador que acabou de entrar numa campanha deveria ter um micro-onboarding contextual — 2-3 tooltips explicando: "Aqui está sua campanha", "Quando o mestre iniciar, você entra aqui", "Explore o compêndio enquanto espera."

**Solução:**
1. Usar `DashboardTourProvider` existente
2. Criar tour "player-first-campaign" com 3 steps:
   - Step 1: "Sua campanha" (spotlight no PlayerCampaignCard)
   - Step 2: "Compêndio" (spotlight no menu compêndio)
   - Step 3: "Quando o mestre iniciar, você entra aqui" (spotlight no card da campanha)
3. Trigger: primeira vez que player tem `memberships.length === 1` e `dashboard_tour_completed === false`

**Arquivos a alterar:**
- `components/tour/DashboardTourProvider.tsx` — adicionar steps para player
- `app/app/dashboard/page.tsx` — passar flag para tour trigger

**Critérios de aceite:**
- [ ] Tour de 3 steps aparece na primeira vez do player com campanha
- [ ] Skip funciona
- [ ] Não aparece em visitas subsequentes (flag no DB)
- [ ] Build passando

---

### SPRINT 4 — Polish & Activation Depth (P1-P2)

> Checklist de ativação, tour do DM, micro-copy refinements.

---

#### JO-13 — DM Activation Checklist

**UC:** UC-02, UC-03 | **Esforço:** M (médio) | **Impacto:** 🟡 Médio

**Problema:** Após completar o onboarding, o DM não tem guia de "próximos passos". Padrão de mercado (Linear, Notion, Intercom) usa checklist.

**Solução:**
1. Componente `ActivationChecklist` no dashboard DM:
   ```
   Primeiros passos no Pocket DM:
   [✓] Criar sua conta
   [ ] Rodar seu primeiro combate
   [ ] Convidar um jogador
   [ ] Testar ações lendárias
   [ ] Ver o recap do combate
   3/5 completo
   ```
2. Itens são detectados automaticamente (queries no DB):
   - Conta criada = always true
   - Primeiro combate = `encounters` count > 0
   - Jogador convidado = `session_tokens` com player_name count > 0
   - Ações lendárias = `combatants` com legendary actions used
   - Recap visto = `combat_reports` count > 0
3. Checklist dismissável (botão "x" → não mostra mais)
4. Confetti ao completar 5/5 (se quiser)
5. Persistência: `user_onboarding.checklist_dismissed` (boolean) ou localStorage

**Arquivos a alterar:**
- Novo componente: `components/dashboard/ActivationChecklist.tsx`
- `components/dashboard/DashboardOverview.tsx` — renderizar checklist

**Critérios de aceite:**
- [ ] Checklist aparece no dashboard DM até ser completada ou dismissada
- [ ] Itens são detectados automaticamente (não manual)
- [ ] Cada item é clicável e linka para a ação correspondente
- [ ] Dismiss persiste entre sessões
- [ ] Build passando

---

#### JO-14 — DM Dashboard Tour (Post-Onboarding)

**Gap:** GAP-06 | **UC:** UC-02 | **Esforço:** P (pequeno) | **Impacto:** 🟡 Médio

**Problema:** DM completa wizard e cai no dashboard sem saber o que cada seção faz. Infra de tour já existe (`DashboardTourProvider`).

**Solução:**
1. Trigger: `wizard_completed === true` E `dashboard_tour_completed === false`
2. Tour de 4-5 steps:
   - Step 1: "Seus combates" (sidebar item combats)
   - Step 2: "Suas campanhas" (sidebar item campaigns)
   - Step 3: "Compêndio SRD" (navbar compendium dropdown)
   - Step 4: "Ações rápidas" (QuickActions area)
   - Step 5: "Pronto! Comece criando um combate" (CTA new session)
3. Marcar `dashboard_tour_completed = true` ao completar ou skipar

**Arquivos a alterar:**
- `components/tour/DashboardTourProvider.tsx` — configurar steps DM
- `app/app/dashboard/page.tsx` — trigger tour baseado em onboarding state

**Critérios de aceite:**
- [ ] Tour aparece após completar wizard pela primeira vez
- [ ] Skip/dismiss funciona
- [ ] Não aparece novamente após completar ou skipar
- [ ] Build passando

---

#### JO-15 — Sidebar: Quick Actions Contextuais

**UC:** UC-03, UC-04 | **Esforço:** PP (muito pequeno) | **Impacto:** 🟡 Médio

**Problema:** Sidebar atual tem navegação estática. Ações rápidas contextuais no sidebar (ou topo do dashboard) ajudam o DM a agir mais rápido.

**Solução:**
1. Na sidebar (modo expandido), abaixo dos nav items, adicionar seção "Ações Rápidas":
   - "Novo Combate" (atalho para /app/session/new)
   - "Convidar Jogador" (abre dialog de invite)
2. No mobile bottom nav, manter "Novo Combate" como ação primária no menu "More"

**Arquivos a alterar:**
- `components/dashboard/DashboardSidebar.tsx` — seção de quick actions

**Critérios de aceite:**
- [ ] Quick actions visíveis na sidebar expandida
- [ ] Links navegam corretamente
- [ ] Mobile: ações no menu "More"
- [ ] Build passando

---

#### JO-16 — Microcopy Review: Onboarding + Auth Pages

**UC:** Todos | **Esforço:** PP (muito pequeno) | **Impacto:** 🟡 Médio

**Problema:** Textos genéricos nas páginas de auth e onboarding. Microcopy personalizado aumenta conversão.

**Solução:**
1. Revisar e melhorar textos em:
   - `/auth/sign-up` → "Crie sua conta e comece a mestrar" (DM context) / "Crie sua conta e entre na mesa" (player context)
   - `/auth/login` → "Bem-vindo de volta, mestre" (se tem campaigns) / "Bem-vindo de volta" (genérico)
   - OnboardingWizard steps → microcopy mais empático e celebratório
   - Empty states → textos actionáveis, não genéricos
2. Garantir que todos os textos estão no i18n (pt-BR + en)

**Arquivos a alterar:**
- `messages/pt-BR.json` e `messages/en.json` — textos de onboarding e auth
- `components/dashboard/OnboardingWizard.tsx` — microcopy refinado

**Critérios de aceite:**
- [ ] Todos os textos de auth/onboarding revisados e melhorados
- [ ] Textos em pt-BR e en
- [ ] Build passando

---

## 4. Cross-Reference com Backlogs Existentes

### Itens absorvidos por este Epic

| Item Original | Doc de Origem | Status | Absorvido por |
|---|---|---|---|
| Onboarding Tour (Guest → Cadastro) | `workstream-2-product-features.md` Sprint 1.2 | Não implementado | JO-12/JO-14 (tour system) |
| F-44: Email invite via Novu | `bucket-future-ideas.md` | Pendente | Não absorvido — independente, manter no bucket |
| Role selection page | `app/app/onboarding/role/page.tsx` | Implementado desconectado | JO-05 (integra no wizard) |
| Dashboard tour | `workstream-2-product-features.md` Sprint 1.2 | Infra pronta, não ativada | JO-14 (ativa o tour) |
| Companheiros — ver outros PCs | `bucket-future-ideas.md` F-27 | ✅ DONE | N/A |
| Notificação "é sua vez" | `bucket-future-ideas.md` F-29 | ✅ DONE | N/A |

### Itens que permanecem no bucket (não absorvidos)

| Item | Motivo |
|---|---|
| F-01: Ficha completa de personagem | Complexidade alta, fora de escopo |
| F-02/F-03/F-04: XP tracking + level up | Feature futura, não onboarding |
| F-08: Modo VTT | Completamente diferente, fora de escopo |
| F-17/F-18/F-19: IA integrada | Feature premium futura |
| F-34: Wizard de personagem completo | Complexidade alta |
| F-44: Email invite via Novu | Complementar, mas independente |

### Interseção com Workstream 2 (Product Features)

| Workstream 2 Item | Status | Relação com este Epic |
|---|---|---|
| Sprint 1.1: Turn Notifications Push | ✅ DONE | Independente |
| Sprint 1.2: Onboarding Tour | NÃO IMPL | → Absorvido por JO-12/JO-14 |
| Sprint 1.3: Nudges "Upgrade to Pro" | NÃO IMPL | Independente — implementar depois |
| Sprint 2: Retenção | Parcial | Independente |
| Sprint 3: PWA | NÃO IMPL | Independente |

---

## 5. Métricas de Sucesso

| Métrica | Baseline Atual | Target | Como Medir |
|---|---|---|---|
| Invite link → account creation → join campaign | ~0% (broken) | >80% | Funil: invite click → auth → campaign_members insert |
| Onboarding wizard completion rate | Desconhecido | >70% | `user_onboarding.wizard_completed` / total signups |
| Player empty state → first action | Desconhecido | >50% clicam CTA | Event tracking no empty state |
| Time from sign-up to first combat (DM) | Desconhecido | <5 min | Timestamp delta: user created_at → first encounter created_at |
| Anonymous player → account creation | Desconhecido | >15% | Funil: recap CTA click → auth → campaign_members |

---

## 6. Diagrama de Fluxos

Todos os diagramas Mermaid estão renderizáveis em:
**`docs/internal/user-journey-flows.html`**

Inclui:
1. Mapa Geral de Jornadas (todos UCs, todas personas)
2. Onboarding DM detalhado (wizard steps + gaps)
3. UC-08 Novo: Jogador Anônimo → Recap → Join Campanha (sequence diagram)
4. UC-05 Corrigido: Invite Token Survival (sequence diagram)
5. UC-06: Player Retorno (flowchart)
6. Roadmap de Priorização por Tier

---

> **Última atualização:** 2026-04-05
> **Autores:** Dani_ + BMAD Party Mode (John PM, Sally UX, Mary Analyst)
> **Próximo passo:** Sprint 2 (JO-05 a JO-08) — Onboarding DM Melhorado + Role Selection
