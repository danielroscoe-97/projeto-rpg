# EPIC 02: Player Dashboard & Invite Inteligente

> **Status:** Pronto para execução (v2 pós code review 2026-04-19)
> **Prioridade:** Alta (primeira experiência visível ao usuário da iniciativa)
> **Origem:** Party Mode 2026-04-19 + Code Review 2026-04-19
> **Parent epic:** `docs/EPIC-player-identity-continuity.md` (a ser criado em commit separado)
> **Sprint estimate:** ~2-3 sprints (19-27 dias úteis)
> **Release strategy:** Big-bang (junto com Épicos 01, 03, 04)
> **Depende de:** Épico 01 — Identity Foundation (bloqueante)
> **Agente executor:** Sally (UX) lidera; Winston valida arquitetura; Bob fatia em stories

---

## Contexto do Épico Mãe

Ver [`docs/EPIC-player-identity-continuity.md`](../../EPIC-player-identity-continuity.md) (a ser criado) para visão completa da iniciativa **"Player Identity & Continuity"**.

Este épico entrega a **primeira superfície visível ao player** — tela de invite inteligente e dashboard enriquecido. Épico 01 fornece primitives backend; este monta UI em cima.

---

## Dependências de Entrada (Épico 01)

Este épico **NÃO PODE COMEÇAR** antes que estas primitives do Épico 01 estejam em staging:

- `upgradePlayerIdentity()` via `POST /api/player-identity/upgrade` — consumido no AuthModal quando player guest/anon cria conta
- `claimCampaignCharacter()` — consumido no picker ao selecionar personagem DM-created
- `listClaimableCharacters(campaignId, identity, pagination)` **paginado** — consumido pelo picker
- `migrateGuestCharacterToAuth()` — consumido quando player do `/try` cria conta
- Campos em `users`: `default_character_id`, `last_session_at`, `avatar_url`, `role`
- Broadcast `player:identity-upgraded` com payload definido — consumido pela UI do DM

---

## Problema

Dois problemas distintos:

### Problema 1 — Fluxos de invite fragmentados mas com TOKEN NAMESPACES DIFERENTES

**Correção crítica do review (2026-04-19):**

- `/app/invite/[token]` valida **`campaign_invites.token`** (convites por email, para auth users) — `app/invite/[token]/page.tsx`
- `/app/join/[token]` valida **`session_tokens.token`** (links anônimos da sessão) — `app/join/[token]/page.tsx`

**Os dois tokens vivem em tabelas diferentes e não são intercambiáveis.** A v1 deste épico propôs unificar via redirect — **ERRADO**. A v2 mantém rotas separadas mas adiciona experiência inteligente em cada uma.

### Problema 2 — Dashboard do player é thin

Hoje (`/app/app/dashboard/*`): checklist + pending invites + active session card + lista de personagens simples. Sem histórico de sessões, sem "próxima sessão", sem "último personagem usado". Não reflete a continuidade narrativa do H3.

---

## Estado Atual (verificado contra código, 2026-04-19)

### Rotas de invite e join (2 fluxos distintos)

| Rota | Arquivo | Token table | Estado |
|---|---|---|---|
| `/invite/[token]` (campaign invite, auth-preferido) | `app/invite/[token]/page.tsx:1-117` | `campaign_invites` | Char picker maduro em `InviteAcceptClient.tsx` (3-modo state machine) |
| `/join/[token]` (session link, anon flow) | `app/join/[token]/page.tsx:1-199` | `session_tokens` | `PlayerJoinClient.tsx` ~3043 linhas; handles anon sign-in inline |
| `/try` (guest) | `app/try/page.tsx:1-35` | — | Funcional com `GuestCombatClient` + `GuestUpsellModal` |

### Componentes existentes

| Componente | Onde | Estado |
|---|---|---|
| `InviteAcceptClient` | `components/campaign/InviteAcceptClient.tsx` | 3-modo state machine (`claim` → `pick` → `create`); page-embedded, não modal |
| `CharacterWizard` | `components/character/wizard/CharacterWizard.tsx:1-80` | 3 steps (identity → stats → preview) |
| `LoginForm` | `components/login-form.tsx` | Google OAuth + email; page-bound |
| `SignUpForm` | `components/sign-up-form.tsx` | Com role selection; page-bound |
| `CombatRecap` | `components/combat/CombatRecap.tsx` | Maduro; `onSaveAndSignup` + `onJoinCampaign` callbacks |

### Dashboard (thin)

| Rota | Arquivo | Mostra |
|---|---|---|
| `/app/dashboard` | `app/app/dashboard/page.tsx:1-287` | Checklist, pending invites, active session |
| `/app/dashboard/characters` | `app/app/dashboard/characters/page.tsx:14` | Lista simples de `player_characters` |
| `/app/dashboard/campaigns` | existe | Join form + lista |
| `/app/dashboard/settings` | existe | User preferences |

### Design system
- **UI:** shadcn/ui + Tailwind + Framer Motion
- **Primitives:** `Button` (gold, goldOutline, etc.), `Dialog` (Radix), `Card`, `Input`
- **Gaps:** sem componente stepper/wizard genérico; **sem auth em modal** (full-page hoje)

---

## Solução Proposta

### Área 1 — Smart Landing por Rota (sem unificar token namespaces)

**Decisão arquitetural revisada (review 2026-04-19):** `/invite/[token]` e `/join/[token]` permanecem como rotas **separadas**, cada uma lendo de sua tabela de token. Introduzimos **state detection por rota**:

#### 1A — `/invite/[token]` smart experience (campaign_invites)

**Utility nova:** `lib/identity/detect-invite-state.ts`

```typescript
export async function detectInviteState(
  token: string,
  supabaseServer: SupabaseServerClient // já cookie-aware (M3 resolvido)
): Promise<
  | { state: "invalid"; reason: "not_found" | "expired" | "accepted" }
  | { state: "guest"; invite: CampaignInvite }
  | { state: "auth"; invite: CampaignInvite; user: User }
  | { state: "auth-with-invite-pending"; invite: CampaignInvite; user: User; displayName: string }
>
```

**Decisão UX por estado:**
- `guest` → Landing "Dani te convidou pra **Phandelver**" + AuthModal (signup padrão, NÃO `updateUser` — pois não há session_token aqui)
- `auth` → `CharacterPickerModal` abre; após claim: INSERT `campaign_members` + redirect
- `auth-with-invite-pending` → mesmo fluxo de `auth` com preamble "Bem-vindo de volta, {displayName}"

**Arquivo novo:** `components/invite/InviteLanding.tsx` (client) renderiza conforme estado detectado.

#### 1B — `/join/[token]` smart experience (session_tokens)

**Utility nova:** `lib/identity/detect-join-state.ts`

```typescript
export async function detectJoinState(
  token: string,
  supabaseServer: SupabaseServerClient
): Promise<
  | { state: "invalid"; reason: "not_found" | "expired" | "session_ended" }
  | { state: "fresh"; sessionToken: SessionToken; session: Session }           // primeiro acesso
  | { state: "returning-anon"; sessionToken: SessionToken; session: Session }  // anon user voltando
  | { state: "returning-auth"; sessionToken: SessionToken; session: Session; user: User }
>
```

**Decisão UX por estado:**
- `fresh` → Fluxo atual do `PlayerJoinClient` (anon sign-in inline). **PLUS:** oferta opcional "Criar conta" no waiting room antes do combate começar (integração com Épico 03)
- `returning-anon` → reconnect silencioso (como hoje) + banner sutil "Criar conta agora?" (não bloqueante)
- `returning-auth` → reconnect silencioso como auth; usa `claimCampaignCharacter` se ainda não tem character

**Nota:** `/join/[token]` **não vira** `/invite/[token]`. São fluxos paralelos. O botão "Já tenho conta, fazer login" no `/join` abre AuthModal modo login que, após sucesso, chama `upgradePlayerIdentity` (Épico 01) preservando session_token.

#### 1C — Smart cross-linking

Se player logado clica link `/join/[token]` de campanha onde já é `campaign_member`: backend detecta e redireciona pra campanha diretamente. Se é sessão nova em campanha nova: tratar como `returning-auth` (consegue associar via `upgradePlayerIdentity` se ainda anon, ou direto via `claimCampaignCharacter` se já auth).

---

### Área 2 — `CharacterPickerModal` (reusável, paginado)

**Extração de** `InviteAcceptClient.tsx` para componente standalone.

**Arquivo novo:** `components/character/CharacterPickerModal.tsx`

```typescript
type CharacterPickerModalProps = {
  campaignId: string;
  playerIdentity: { sessionTokenId?: string; userId?: string };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (result: { characterId: string; mode: "claimed" | "picked" | "created" }) => void;
  allowModes?: Array<"claim" | "pick" | "create">; // default: todos
  pageSize?: number; // default: 20
};
```

**Comportamento:**
- Tab "Disponíveis" → `listClaimableCharacters(campaignId, identity, { limit, offset })` (Épico 01); "Carregar mais" infinite scroll
- Tab "Meus personagens" (só auth) → `player_characters` onde `user_id = auth.uid() AND campaign_id IS NULL`
- Tab "Criar novo" → embed `CharacterWizard`
- Usa `Dialog` primitive (bottom-sheet em viewport &lt;640px)
- Preserva UX: gold borders on selection, stats badges

**Uso:**
- `InviteLanding` (Área 1A) — state `auth` / `auth-with-invite-pending`
- Dashboard (Área 4) para trocar character default
- `InviteAcceptClient` refatorado consome o modal (deprecação gradual do page-embedded)

---

### Área 3 — `AuthModal` (reusável, com upgradeContext)

**Arquivo novo:** `components/auth/AuthModal.tsx`

```typescript
type AuthModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab: "login" | "signup";
  onSuccess: (result: { userId: string; isNewAccount: boolean; upgraded: boolean }) => void;
  
  // Se fornecido: signup vira upgradePlayerIdentity (Épico 01)
  upgradeContext?: {
    sessionTokenId: string;
    campaignId?: string;
    guestCharacter?: GuestCombatSnapshot["combatants"][number];
  };
  
  preamble?: string;
};
```

**Comportamento:**
- Wrappa `LoginForm` + `SignUpForm` em `Dialog`
- Se `upgradeContext` fornecido + user submit signup: chama `/api/player-identity/upgrade` (Épico 01) em vez de `auth.signUp`
- Alternância login ↔ signup dentro do modal sem fechar
- **Google OAuth (M2 resolvido):** clicar OAuth **fecha modal** e redireciona (full-page OAuth flow mantido). State do `upgradeContext` é salvo em localStorage sob key `identity-upgrade-context-v1`. Ao retornar do OAuth callback (via `/auth/callback`), client detecta localStorage e continua fluxo (chamando upgrade endpoint se aplicável). Modal reabre brevemente com estado "concluindo upgrade..." se necessário.

---

### Área 4 — Player Dashboard Enriquecido

**Redesign de** `app/app/dashboard/page.tsx` + novas páginas.

**Novas seções (player view em `DashboardOverview`):**

1. **"Continue de onde parou"** (topo, se `users.last_session_at IS NOT NULL`)
   - Card com: campanha, personagem (`default_character_id`), data da última sessão, CTA "Abrir"

2. **"Meus personagens"** (grid rico, substitui listagem atual)
   - Query: `player_characters WHERE user_id = auth.uid()` (já existente); enriquecida com `last_session_at` joined via `combatants`
   - Cards: avatar/token, nome, raça/classe/nível, HP/AC, campanha vinculada ou "standalone", badge "padrão" se `users.default_character_id = this.id`
   - Ações: abrir HQ (`/app/characters/[id]` se standalone; `/app/campaigns/[id]/sheet` se campanha), trocar padrão

3. **"Minhas campanhas"** (player view)
   - Query: `campaign_members WHERE user_id = auth.uid() AND role = 'player' AND status = 'active'`
   - Cards: nome, DM (via `users` join), last_session_at da campanha, contagem de sessões jogadas

4. **"Histórico de sessões"** (últimas 10)
   - **Query RLS-aware (M4 resolvido):**
     ```sql
     SELECT s.id, s.campaign_id, e.id as encounter_id, e.name, s.created_at
     FROM combatants c
     JOIN encounters e ON e.id = c.encounter_id
     JOIN sessions s ON s.id = e.session_id
     WHERE c.player_characters_id IN (
       SELECT id FROM player_characters WHERE user_id = auth.uid()
     )
     ORDER BY s.created_at DESC
     LIMIT 10;
     ```
   - RLS: player lê sessions onde tem combatant; metadata de outros combatants via policy pública; stats detalhados só dos próprios (RLS já existente em `combatants`)
   - Cards: campanha, encontro, data, link pra recap se existe (`encounter_recap_snapshot` conforme migration 136)

**Novas rotas:**

| Rota | Arquivo | Propósito |
|---|---|---|
| `/app/dashboard/sessions` | **CRIAR** | Histórico completo paginado |
| `/app/dashboard/settings/default-character` | **CRIAR** | Trocar `default_character_id` |

**Paginação:** `/app/dashboard/sessions` usa **cursor-based** (não offset) sobre `sessions.created_at DESC, sessions.id` para estabilidade. 10 por página.

---

### Área 5 — Settings: Default Character Selector

**Nova rota:** `app/app/dashboard/settings/default-character/page.tsx`

- Lista de `player_characters` do user com botão "Tornar padrão"
- UPDATE `users.default_character_id` via server action
- Override manual da regra automática "último usado"
- RLS valida `user_id = auth.uid()`

---

### Área 6 — Cenário 5: Returning Player Invite (com concurrency guard)

Sub-caso de `auth-with-invite-pending` em `/invite/[token]` (Área 1A):

**Experiência:**
1. Lucas (logado) recebe link `campaign_invites` pra **"Campanha Nova"**
2. Clica → server detecta `auth-with-invite-pending` → `InviteLanding` renderiza preamble
3. `CharacterPickerModal` abre com tabs populadas: Disponíveis (vazio, campanha nova) / Meus personagens standalone / Criar novo
4. Lucas escolhe Thorin (standalone)
5. Backend: **UPDATE atômico com concurrency guard:**
   ```sql
   UPDATE player_characters
   SET campaign_id = $newCampaignId
   WHERE id = $characterId 
     AND user_id = auth.uid()
     AND campaign_id IS NULL
   RETURNING id;
   ```
   Se 0 rows: outro invite em-flight já vinculou → erro "personagem já em outra campanha; escolha outro"
6. INSERT em `campaign_members` (idempotente via ON CONFLICT)
7. Aceita o `campaign_invite` (mark accepted)
8. Redirect pra campanha

**Decisão 2026-04-19:** personagem vinculado NÃO é clonado — `player_characters.campaign_id` é alterado. Se sair da campanha futuramente, `campaign_id` volta a `NULL` e personagem é standalone novamente (fluxo de saída não é escopo deste épico).

---

## Arquivos Chave para Criar/Modificar

| Arquivo | Ação | Área |
|---|---|---|
| `lib/identity/detect-invite-state.ts` | **CRIAR** — state detection para `campaign_invites` | 1A |
| `lib/identity/detect-join-state.ts` | **CRIAR** — state detection para `session_tokens` | 1B |
| `components/invite/InviteLanding.tsx` | **CRIAR** — client landing para `/invite/[token]` | 1A |
| `app/invite/[token]/page.tsx` | **MODIFICAR** — usar `detectInviteState` + `InviteLanding` | 1A |
| `app/join/[token]/page.tsx` | **MODIFICAR** — usar `detectJoinState` (rota **não** redireciona; melhora experiência anon) | 1B |
| `components/player/PlayerJoinClient.tsx` (~3043 linhas) | **MODIFICAR** — adicionar botão "Já tenho conta" que abre `AuthModal` modo login + upgrade | 1B |
| `components/character/CharacterPickerModal.tsx` | **CRIAR** — modal reusável com paginação | 2 |
| `components/campaign/InviteAcceptClient.tsx` | **MODIFICAR** — refatorar pra usar CharacterPickerModal | 2 |
| `components/auth/AuthModal.tsx` | **CRIAR** — wrapper modal | 3 |
| `components/login-form.tsx` | **MODIFICAR** — suportar render inline + `onSuccess` callback | 3 |
| `components/sign-up-form.tsx` | **MODIFICAR** — suportar `upgradeContext` | 3 |
| `app/auth/callback/route.ts` (se existe) | **MODIFICAR** — detectar `identity-upgrade-context-v1` em localStorage e continuar fluxo | 3 |
| `app/app/dashboard/page.tsx` | **MODIFICAR** — novas 4 seções player view | 4 |
| `app/app/dashboard/characters/page.tsx` | **MODIFICAR** — grid rico | 4 |
| `app/app/dashboard/sessions/page.tsx` | **CRIAR** — histórico cursor-paginado | 4 |
| `app/app/dashboard/settings/default-character/page.tsx` | **CRIAR** | 5 |
| `components/dashboard/ContinueFromLastSession.tsx` | **CRIAR** | 4 |
| `components/dashboard/MyCharactersGrid.tsx` | **CRIAR** | 4 |
| `components/dashboard/MyCampaignsSection.tsx` | **CRIAR** | 4 |
| `components/dashboard/SessionHistoryList.tsx` | **CRIAR** | 4 |
| `components/dashboard/DefaultCharacterSettings.tsx` | **CRIAR** | 5 |
| `tests/invite/detect-invite-state.test.ts` | **CRIAR** | 1A |
| `tests/invite/detect-join-state.test.ts` | **CRIAR** | 1B |
| `tests/invite/smart-landing-render.test.tsx` | **CRIAR** (RTL) | 1 |
| `e2e/invite/guest-to-auth-via-invite.spec.ts` | **CRIAR** | 1A, 3 |
| `e2e/invite/anon-to-auth-via-join.spec.ts` | **CRIAR** | 1B, 3 |
| `e2e/invite/scenario-5-returning-player.spec.ts` | **CRIAR** | 1A, 6 |
| `e2e/dashboard/player-continuity.spec.ts` | **CRIAR** | 4 |

---

## Critérios de Aceitação

### Área 1 — Smart Landing
- [ ] `detectInviteState` retorna 4 estados corretamente
- [ ] `detectJoinState` retorna 4 estados corretamente
- [ ] `/invite/[token]` renderiza UI diferente por estado
- [ ] `/join/[token]` **não** redireciona pra `/invite`; melhora experiência inline
- [ ] Rotas lêem tabelas corretas (`campaign_invites` vs `session_tokens`)
- [ ] Preamble em `auth-with-invite-pending` usa `displayName`
- [ ] **Parity check:** anon flow atual continua funcional
- [ ] **Skeleton states:** `InviteLanding` renderiza `<InviteLandingSkeleton />` com shape idêntico ao landing resolvido (mesma altura/grid/gap) enquanto `detectInviteState`/`detectJoinState` resolvem. Zero flash-of-wrong-UI (guest CTA → troca pra auth visível pro usuário)
- [ ] **PlayerJoinClient parity invariants (aditivas, não refactor):** mudança em `components/player/PlayerJoinClient.tsx` preserva (a) reconnect-from-storage após hard-refresh mesmo com `AuthModal` aberto; (b) upgrade mid-combate não dispara `player:disconnecting` broadcast; (c) heartbeat pause em `document.visibilityState === "hidden"` continua funcionando pós-upgrade; (d) `session_token_id` em sessionStorage+localStorage não é invalidado pelo fluxo de signup. E2E cobre cada invariante explicitamente.

### Área 2 — CharacterPickerModal
- [ ] Componente aceita 3 modes e paginação
- [ ] Infinite scroll em "Disponíveis" funciona (consome `listClaimableCharacters` paginado com `{limit, offset}` — assinatura validada contra `lib/supabase/character-claim.ts:101-145`)
- [ ] Usa `Dialog` primitive (bottom-sheet em &lt;640px)
- [ ] `InviteAcceptClient` refatorado usa o modal
- [ ] Acessibilidade: focus trap, escape fecha, ARIA
- [ ] **axe-core:** zero violations em modal open state, após trocar de tab, e após success state (`@axe-core/playwright` assertion no E2E)
- [ ] **Mobile bottom-sheet spec:** viewport 375px, altura peek 75% da tela, 3 tabs viram select quando largura &lt; 640px, infinite scroll dentro do sheet não congela scroll da página

### Área 3 — AuthModal
- [ ] Wrappa `LoginForm` + `SignUpForm`
- [ ] `upgradeContext` dispara `POST /api/player-identity/upgrade` (Épico 01) em vez de `signUp`
- [ ] Google OAuth: modal fecha ao iniciar, state em localStorage, retorno continua fluxo
- [ ] `onSuccess` recebe `{ userId, isNewAccount, upgraded }`
- [ ] Transição login ↔ signup sem fechar
- [ ] Callback handler `/auth/callback` detecta upgrade-context-v1 em localStorage
- [ ] **axe-core:** zero violations em open state, tab switch (login ↔ signup), erro de credencial inválida visível, e após success

### Área 4 — Dashboard Enriquecido
- [ ] "Continue de onde parou" aparece se `last_session_at IS NOT NULL`
- [ ] "Meus personagens" grid exibe `default_character_id` como badge
- [ ] "Minhas campanhas" lista via `campaign_members WHERE role = 'player'`
- [ ] "Histórico de sessões" usa query RLS-aware; retorna últimas 10
- [ ] `/app/dashboard/sessions` paginado cursor-based (10/página, sort `created_at DESC, id`)
- [ ] Shell compartilhado DM/Player, seções filtradas por `users.role`

### Área 5 — Default Character
- [ ] `/app/dashboard/settings/default-character` existe
- [ ] Update de `users.default_character_id` funciona
- [ ] RLS valida ownership

### Área 6 — Cenário 5
- [ ] Preamble correto para `auth-with-invite-pending`
- [ ] UPDATE atômico de `player_characters.campaign_id` com concurrency guard
- [ ] INSERT em `campaign_members` ON CONFLICT DO NOTHING
- [ ] Mark do `campaign_invite` como accepted
- [ ] Testes de race: 2 invites simultâneos → apenas um sucesso

### Integração
- [ ] `tsc --noEmit` limpo (lib/types/database.ts atualizado do Épico 01 Story 01-B deve refletir)
- [ ] **Parity check (CLAUDE.md):** guest/anon/auth funcionais em `/try`, `/join`, `/invite`
- [ ] **SEO:** `/invite/[token]` e `/join/[token]` continuam `noindex, nofollow`
- [ ] **Resilient reconnection:** mudanças em `/join` não quebram reconnect-from-storage

---

## Testing Contract

| Área | Unit | Integration | E2E Playwright |
|---|---|---|---|
| 1A — detect-invite-state | 4 estados + edge (token expirado, accepted) | — | `guest-to-auth-via-invite.spec.ts` |
| 1B — detect-join-state | 4 estados + edge | — | `anon-to-auth-via-join.spec.ts` |
| 2 — CharacterPickerModal | 3 modes (RTL) + pagination | Com Supabase mock | Incluído em invite E2E |
| 3 — AuthModal | Render + OAuth mock + localStorage persist | `upgradeContext` chama Épico 01 primitive | `guest-to-auth-via-invite.spec.ts` |
| 4 — Dashboard | Cada seção com mock data (RTL) | Queries RLS-aware corretas | `player-continuity.spec.ts` |
| 5 — Default character | Settings render | UPDATE via server action | — |
| 6 — Cenário 5 | — | UPDATE atômico race test | `scenario-5-returning-player.spec.ts` |

**Testes obrigatórios:**

1. **E2E: Guest → Auth via invite (`/invite`)** — Maria sem conta, chega em `/invite/abc123`, cria conta no AuthModal (signup padrão, não há session_token), escolhe personagem, entra na campanha
2. **E2E: Anon → Auth via join (`/join`)** — Maria clica link anônimo, entra como anon, vê banner "Criar conta", clica, AuthModal com `upgradeContext`, servidor executa `upgradePlayerIdentity`, combate continua sem skip de turno
3. **E2E: Cenário 5** — Lucas logado clica invite nova campanha, preamble correto, escolhe standalone, vincula via concurrency guard
4. **E2E: Cenário 5 race** — 2 abas do Lucas clicam invite do mesmo personagem ao mesmo tempo; apenas uma vinculação sucede
5. **E2E: Dashboard continuity** — Player logado com 3 sessões passadas, vê "Continue de onde parou" correto
6. **Unit: AuthModal upgradeContext** — mockar endpoint, verificar payload correto
7. **Unit: detectInviteState vs detectJoinState** — não confundir tokens (invite token em /join retorna `invalid`)
8. **Integration: Histórico de sessões RLS** — player vê apenas sessões onde tem combatant; não vaza sessões de outros

---

## Story Sequencing (DAG)

```
Story 02-A: detectInviteState + detectJoinState (utilities + testes)
   └─ PARALELO a 02-B, 02-C

Story 02-B: CharacterPickerModal (refatoração de InviteAcceptClient)
   └─ depende de Épico 01 (listClaimableCharacters paginado)

Story 02-C: AuthModal + modificações em LoginForm/SignUpForm
   └─ depende de Épico 01 (upgradePlayerIdentity endpoint)

Story 02-D: InviteLanding + redesign /invite/[token]
   └─ depende de 02-A, 02-B, 02-C

Story 02-E: Modificações em /join/[token] (banner + AuthModal integration)
   └─ depende de 02-A, 02-C

Story 02-F: Player Dashboard 4 seções
   └─ depende de Épico 01 (users enriquecido) + RLS query validation (M4)
   └─ PARALELO a 02-B, 02-C, 02-D, 02-E

Story 02-G: /app/dashboard/sessions + /settings/default-character
   └─ depende de 02-F

Story 02-H: Cenário 5 polish + concurrency tests
   └─ depende de 02-D

Story 02-I: E2E suite completa (Playwright)
   └─ depende de 02-D, 02-E, 02-F, 02-G, 02-H
```

**Distribuição por sprint (estimado):**
- **Sprint 1:** 02-A, 02-B, 02-C, 02-F (paralelos)
- **Sprint 2:** 02-D, 02-E, 02-G, 02-H
- **Sprint 3:** 02-I + polish + acessibilidade

---

## Riscos Documentados

| Risco | Severidade | Mitigação |
|---|---|---|
| Refatoração de `InviteAcceptClient` quebra fluxo atual | Alta | Feature flag durante dev; parity test antes de merge |
| `PlayerJoinClient.tsx` (3043 linhas) difícil de modificar sem regressão | Alta | Mudanças **aditivas** (novo botão + handler), não refatoração; parity E2E obrigatória |
| AuthModal OAuth tab nova perde `upgradeContext` | Média | Modal fecha; state em localStorage survives; callback detecta e continua fluxo (ver Área 3 M2) |
| Dashboard "Histórico de sessões" em campanhas com 500+ encontros fica lento | Média | Paginação cursor-based; index compound em `(user_id, created_at)` em `player_characters` (opcional: stored query plan) |
| Mobile UX de modais em viewport pequeno | Alta | Dialog primitive vira bottom-sheet em &lt;640px; teste obrigatório em 3 devices |
| Cenário 5 race de vincular character em 2 campanhas simultaneamente | Média | UPDATE atômico com WHERE idempotente (Área 6) |
| Cross-link player auth clica `/join` de campanha onde já é member | Baixa | `detectJoinState` + server-side redirect para `/app/campaigns/[id]` |
| RLS em "Histórico de sessões" pode 0-retornar se políticas de `combatants` não deixarem ler metadata de outros | Média | Ajuste RLS em `combatants` se necessário (Story 02-F bloqueia até M4 resolvido) |

---

## Regras Imutáveis (CLAUDE.md)

- **Combat Parity Rule:** mudanças em `/invite`, `/join`, `/try` afetam os 3 modos. Toda alteração testada nos 3 fluxos. Regressão zero.
- **Resilient Reconnection Rule:** `/join` preserva reconnect-from-storage. `session_token_id` em storage não é invalidado por upgrade. Spec §4 (Épico 01 Área 8) cobre.
- **SRD Compliance:** dashboard pode exibir spells/monsters de sessões via `/api/srd/full/*` auth-gated.
- **SEO Canonical:** ambas `/invite/[token]` e `/join/[token]` continuam `noindex, nofollow`.

---

## Estimativa de Esforço

| Área | Complexidade | Esforço |
|---|---|---|
| Área 1A — detectInviteState + InviteLanding | Média | 2 dias |
| Área 1B — detectJoinState + modificações /join | Alta | 3 dias (PlayerJoinClient é grande) |
| Área 2 — CharacterPickerModal | Média | 2-3 dias |
| Área 3 — AuthModal + OAuth flow | Alta | 3 dias |
| Área 4 — Dashboard 4 seções | Alta | 4-6 dias |
| Área 5 — Default character settings | Baixa | 1 dia |
| Área 6 — Cenário 5 polish | Média | 1-2 dias |
| Testes unit + integration | Média | 2-3 dias |
| E2E Playwright (5+ specs) | Média | 2-3 dias |
| Review + polish + acessibilidade | Média | 2 dias |
| **Total estimado** | | **22-29 dias úteis (~2.5-3 sprints)** |

---

## Próximos Passos

1. Aguardar Épico 01 Story 01-A (Glossário) e 01-B (Migrations 142-144) em staging
2. Decidir M1-M4 do Épico 01 (bloqueiam stories deste épico)
3. Sally (UX) produz mockups das 3 landings (guest/auth/scenario-5) e dashboard player view
4. Bob (SM) quebra em stories conforme DAG
5. Winston valida contratos de `detect*State` com Épico 01 primitives
