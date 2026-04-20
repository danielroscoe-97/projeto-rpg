# EPIC 01: Identity Foundation

> **Status:** Aprovado para execução (v3 pós code review 2026-04-19)
> **Prioridade:** Crítica (habilitador dos épicos 02-04)
> **Origem:** Party Mode 2026-04-19 + Code Review 2026-04-19 (corrigiu 5 críticos + 6 altos + 7 médios + 7 baixos)
> **Parent epic:** `docs/EPIC-player-identity-continuity.md` (a ser criado em commit separado)
> **Sprint estimate:** ~2 sprints (10-15 dias úteis)
> **Release strategy:** Big-bang (junto com épicos 02-04)
> **Agente executor:** Winston (Architect) lidera; Bob (SM) fatia em stories; Quinn (QA) valida cobertura

---

## Contexto do Épico Mãe

A iniciativa **"Player Identity & Continuity"** cobre três hipóteses validadas com Dani_ em 2026-04-19:

- **H1** — Reduzir atrito da próxima sessão do player (entra mais rápido, já autenticado)
- **H2** — Retenção/conversão de player anônimo em conta (lead do produto)
- **H3** — Continuidade narrativa: personagem, campanha e histórico persistem entre sessões

Decomposição em 4 épicos encadeados, release big-bang:

| # | Épico | Visível? | Entrega |
|---|---|---|---|
| **01** | **Identity Foundation** (este doc) | Não | Primitives backend: upgrade anon→auth in-place, portabilidade, claim, profile |
| 02 | Player Dashboard & Invite Inteligente | Sim | Smart landing, dashboard do player, seletor de personagem (cenário 5) |
| 03 | Momentos de Conversão | Sim | Sala de espera com CTA de login, recap pós-combate com oferta de conta |
| 04 | Player-as-DM Upsell | Sim | Player logado cria sua própria campanha (loop viral H2) |

---

## Problema

O modelo atual de identidade suporta dois mundos desconectados:

1. **Anon players** — `session_tokens.anon_user_id` ligados a combate mas SEM acesso a `campaign_members`, dashboard, ou persistência entre campanhas
2. **Auth players** — `auth.users` + `campaign_members.user_id`, com persistência completa mas dependem de signup prévio

Não existe ponte entre os dois. Player anônimo que quer virar autenticado hoje precisa desconectar, perder session_token, fazer signup manual, re-invite do DM.

Os 3 épicos seguintes assumem essa ponte existente. Sem ela, cada um refaz primitives.

---

## Estado Atual (verificado contra codebase, 2026-04-19)

### Infraestrutura que JÁ EXISTE

| Componente | Onde | Nota |
|---|---|---|
| Anon auth Supabase (`signInAnonymously()`) | `components/player/PlayerJoinClient.tsx` (~3043 linhas) | Funcional |
| Tabela `session_tokens` com `anon_user_id` | `supabase/migrations/004_session_tokens.sql` | `anon_user_id` pode **regenerar** em cookie loss (ver `docs/spec-resilient-reconnection.md`) |
| Tabela `campaign_members` (role dm/player) | `supabase/migrations/033_campaign_members.sql` | Exige `user_id` de `auth.users` |
| **Tabela `player_characters`** (NÃO `characters`) | `supabase/migrations/001_initial_schema.sql:27` + 027, 076 | Suporta `user_id` e `campaign_id` nullable (3 estados) |
| Tabela `users` (extensão de `auth.users`) | migration 001 + 022 (role) | **Trigger em migration 015 PULA inserção para anon** — anon NÃO tem row em `public.users` |
| `campaign_invites` com `email` | existe | Token namespace DIFERENTE de `session_tokens.token` |
| `claimPlayerToken()` | `lib/supabase/player-registration.ts:26-100` | Funcional para anon; lida com token re-claim via `player_name` match |
| Dashboard do player (thin) | `app/app/dashboard/characters/page.tsx:14` | Lista simples de characters do user |
| Guest combat snapshot em localStorage | `lib/stores/guest-combat-store.ts` | Zustand + JSON; 4h session, 24h snapshot |

### O que NÃO EXISTE (gaps desta fundação)

| Gap | Impacto |
|---|---|
| Fluxo anon→auth **in-place** preservando session_token, combate ativo e personagem | Bloqueia H1, H2 e H3 |
| Coluna `user_id` em `session_tokens` (distinguir "já autenticado" de anon) | Query "quais sessões esse user jogou" não diferencia |
| Migração de guest character (localStorage) para `player_characters` | Personagem do `/try` some ao logar |
| Auto-inserção em `campaign_members` pós-upgrade | Player upgraded não vê campanha no dashboard |
| Claim de personagem DM-created | Cenário comum fica manual |
| `listClaimableCharacters(campaignId, opts)` **paginado** | Client não lista personagens disponíveis |
| `users` enriquecido (default_character, last_session_at, avatar) | Dashboard continua thin |
| Glossário ubíquo para termos novos | Equipe usa 4 termos pra mesma coisa |

---

## Decisões de Arquitetura (pós code review)

### D1 — Primitive de upgrade: `supabase.auth.updateUser`, NÃO `signUp`

**Reviewer adversarial 2026-04-19 identificou:** `signUp({ email, password })` cria `auth.users` NOVO com UUID diferente do anon — quebraria toda referência. A API correta é **`supabase.auth.updateUser({ email, password })`** que **promove o anon user in-place preservando UUID**.

**Consequência:** `oldUserId === newUserId` (mesma UUID). A "saga" deixa de ser rollback-based — vira **idempotent forward-recovery**.

### D2 — Ponto de não retorno + Forward-recovery

`updateUser` não tem rollback (Supabase não suporta "desfazer email"). Portanto:

- **Fase 1 — Pre-flight:** validar tudo antes (email disponível, password policy, credenciais)
- **Fase 2 — Point of no return:** `updateUser` executa
- **Fase 3 — Migração de dados (idempotente):** cada step `ON CONFLICT DO NOTHING` ou retryable. Se falhar, marca `users.upgrade_pending_since` e cron retry manual

### D3 — Execução em server action (Route Handler)

Upgrade roda em `app/api/player-identity/upgrade/route.ts` (POST). Razões:
- Controle de transação sobre migração de dados
- Service role disponível para operações que RLS bloquearia
- Broadcast server-side garante entrega confiável
- Client passa apenas `sessionTokenId` + `credentials`; server deriva resto via `auth.uid()`

### D4 — `session_tokens.id` é o identificador estável, NÃO `anon_user_id`

`spec-resilient-reconnection.md` estabelece que `anon_user_id` pode **regenerar em cookie loss**. Portanto toda referência cruzada usa `session_tokens.id` (estável, nunca muda). `anon_user_id` é apenas "último UUID visto" (informativo).

---

## Solução Proposta

### Área 1 — Schema: Link `session_tokens` ↔ `auth.users`

**Migration nova:** `supabase/migrations/142_session_tokens_user_id.sql`

```sql
ALTER TABLE session_tokens
  ADD COLUMN user_id UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX idx_session_tokens_user_id ON session_tokens(user_id);

-- RLS: user lê session_tokens dele (auth ou anon)
CREATE POLICY session_tokens_select_own ON session_tokens
  FOR SELECT USING (
    user_id = auth.uid() OR anon_user_id = auth.uid()
  );
```

**Regras:**
- `user_id` populado quando player é (ou vira) autenticado
- `anon_user_id` continua preenchido (pode regenerar; é apenas "último UUID visto")
- Após upgrade: `user_id == anon_user_id` (mesma UUID por D1)
- `session_tokens.id` é o identificador estável para cross-reference

---

### Área 2 — Server action: `upgradeAnonToAuth()` (idempotent forward-recovery)

**Arquivos novos:**
- `app/api/player-identity/upgrade/route.ts` — POST endpoint
- `lib/supabase/player-identity.ts` — lógica de migração

**Assinatura (server):**

```typescript
export async function upgradePlayerIdentity(params: {
  sessionTokenId: string;          // estável, da storage do client
  credentials: { email: string; password: string; displayName?: string };
  guestCharacter?: GuestCombatSnapshot["combatants"][number]; // opcional
}): Promise<{
  userId: string;  // = auth.uid() (mesma UUID do anon, por D1)
  migrated: {
    playerCharactersPromoted: number;
    campaignMembersInserted: number;
    guestCharacterMigrated: boolean;
  };
}>
```

**Fluxo (server-side):**

**Fase 1 — Pre-flight (retryable, zero side-effects):**
1. Verificar `auth.uid()` corresponde a `session_tokens.anon_user_id` OR `session_tokens.user_id` onde `id = sessionTokenId`
2. Validar formato email + password policy
3. Checar conflito: email já existe em outro `auth.users`? Retornar erro claro
4. Checar se já não está autenticado (idempotência: retornar sucesso sem-op)

**Fase 2 — Point of no return:**
5. `supabase.auth.updateUser({ email, password })` (cliente faz esse call com JWT próprio; server action espera confirmação via próximo request com novo JWT)

> **Nota sobre arquitetura:** por limitação do Supabase, `updateUser` precisa ser chamado com o JWT do próprio usuário. Fluxo:
> - Client chama `updateUser` primeiro
> - Client então chama `POST /api/player-identity/upgrade` com o novo JWT
> - Server action valida e executa Fase 3

**Fase 3 — Migração de dados (idempotente, retryable):**
6. INSERT `public.users` (id, display_name, role='player', preferred_language) ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name
7. UPDATE `session_tokens` SET `user_id = auth.uid()` WHERE `id = sessionTokenId`
8. UPDATE `player_characters` SET `user_id = auth.uid()`, `claimed_by_session_token = NULL` WHERE `claimed_by_session_token IN (SELECT id FROM session_tokens WHERE user_id = auth.uid())`
9. INSERT `campaign_members` (campaign_id, user_id, role='player', invited_by, status='active') para cada campanha onde o user tem session_token ativo — ON CONFLICT (campaign_id, user_id) DO NOTHING
10. Se `guestCharacter` fornecido: INSERT em `player_characters` via `migrateGuestCharacterToAuth` (Área 3)
11. UPDATE `users` SET `default_character_id = <novo/promovido char>`, `last_session_at = now()` (se ainda não setado)
12. Broadcast `player:identity-upgraded` via Supabase realtime (canal `campaign:{campaignId}` E `session:{sessionId}`)

**Failure handling:**
- Qualquer falha em passos 6-11: mark `users.upgrade_failed_at = now()`, retornar erro com `retryable: true`
- Client pode retry passos 6-11 via endpoint `/api/player-identity/upgrade-recovery`
- Se 3 retries falharem: abrir alerta em Slack/logging; usuário recebe mensagem "seu login foi criado, alguns dados não migraram — entre em contato"

**Migration necessária para failure tracking:**

```sql
-- dentro da migration 144 (profile enrichment, ver Área 5)
ALTER TABLE users
  ADD COLUMN upgrade_failed_at TIMESTAMPTZ NULL;
```

**Payload broadcast `player:identity-upgraded`:**

```typescript
type PlayerIdentityUpgradedPayload = {
  event: "player:identity-upgraded";
  sessionTokenId: string;  // identificador estável
  userId: string;          // = auth.uid()
  campaignId: string;      // campanha onde player está
  playerName: string;      // session_tokens.player_name (exibido ao DM)
  displayName: string;     // users.display_name (nova fonte de verdade)
  timestamp: string;       // ISO-8601
};
```

**Canais:**
- `campaign:{campaignId}` — DM e outros players ouvem
- `session:{sessionId}` — Orquestradores de combate (backup)

**Client-side expectation:** após `updateUser`, o client re-hidrata usando reconnect-from-storage (session_token_id preservado). Integração com `docs/spec-resilient-reconnection.md` ganha cenário novo "identity upgrade" (ver Área 8).

---

### Área 3 — Character Portability: Guest → Auth

**Arquivo novo:** `lib/supabase/character-portability.ts`

```typescript
export async function migrateGuestCharacterToAuth(
  guestCharacter: GuestCombatSnapshot["combatants"][number],
  userId: string,
  options?: { campaignId?: string; setAsDefault?: boolean }
): Promise<PlayerCharacter>
```

**Comportamento:**
- Converte shape do Zustand guest store → row em `player_characters`
- `user_id = userId` (promovido via D1)
- `campaign_id = null` (standalone) OU campanha atual se fornecido
- Copia: `name`, `race`, `class`, `level`, `max_hp`, `current_hp`, `ac`, atributos (STR/DEX/CON/INT/WIS/CHA)
- Ignora: `conditions`, `initiative`, `turn_order` (runtime-only)
- Se `setAsDefault === true` OU user sem `default_character_id`: UPDATE `users.default_character_id`

**Invocação:**
- Dentro de `upgradePlayerIdentity` (Área 2, step 10) quando `guestCharacter` fornecido
- Exposto via endpoint público `/api/player-identity/migrate-guest-character` para cliente invocar explicitamente (ex: recap pós-combate do guest)

---

### Área 4 — Character Claim: DM-created → Player (posse total)

**Decisão Dani_ 2026-04-19:** claim = **transferência total de posse**. Player vira dono pleno, pode editar tudo (nome, classe, stats, descrição).

**Migration nova:** `supabase/migrations/143_player_characters_claim.sql`

```sql
ALTER TABLE player_characters
  ADD COLUMN claimed_by_session_token UUID NULL REFERENCES session_tokens(id) ON DELETE SET NULL;

CREATE INDEX idx_player_characters_claimed_by_session_token 
  ON player_characters(claimed_by_session_token);

-- RLS: permitir soft-claim UPDATE para anon via session_tokens.anon_user_id match
-- (a posse "completa" vira hard-claim via user_id após upgrade)
CREATE POLICY player_characters_soft_claim_update ON player_characters
  FOR UPDATE USING (
    claimed_by_session_token IS NOT NULL 
    AND claimed_by_session_token IN (
      SELECT id FROM session_tokens WHERE anon_user_id = auth.uid()
    )
  ) WITH CHECK (
    -- anon só pode mexer em character que claimou e ainda é soft-claim
    claimed_by_session_token IN (
      SELECT id FROM session_tokens WHERE anon_user_id = auth.uid()
    )
  );
```

**Arquivo novo:** `lib/supabase/character-claim.ts`

```typescript
export async function claimCampaignCharacter(
  characterId: string,
  playerIdentity: { sessionTokenId?: string; userId?: string }
): Promise<{ claimedBy: "anon" | "auth" }>

export async function listClaimableCharacters(
  campaignId: string,
  playerIdentity: { sessionTokenId?: string; userId?: string },
  pagination: { limit: number; offset: number } // default limit: 20
): Promise<{
  characters: PlayerCharacter[];
  total: number;
  hasMore: boolean;
}>
```

**Regras `claimCampaignCharacter`:**
- Se `player_characters.user_id IS NOT NULL` OR `claimed_by_session_token IS NOT NULL` → erro "já reivindicado"
- **Atomic claim** (prevenir race):
  ```sql
  UPDATE player_characters 
  SET claimed_by_session_token = $1  -- ou user_id = $1 se auth
  WHERE id = $2 
    AND user_id IS NULL 
    AND claimed_by_session_token IS NULL
  RETURNING id;
  ```
  Se retornar 0 rows: outro player claimou primeiro — retornar erro "já reivindicado"
- Claim anon é "soft" (editável por anon via RLS acima); promove-se a "hard" (`user_id`) em `upgradePlayerIdentity`

**Regras `listClaimableCharacters`:**
- Retorna `user_id IS NULL AND claimed_by_session_token IS NULL` da campanha
- **Paginado** (`limit`, `offset`, retorna `total` e `hasMore`)
- Consumido por `CharacterPickerModal` (Épico 02)

---

### Área 5 — Player Profile Enrichment

**Migration nova:** `supabase/migrations/144_users_profile_enrichment.sql`

```sql
ALTER TABLE users
  ADD COLUMN default_character_id UUID NULL REFERENCES player_characters(id) ON DELETE SET NULL,
  ADD COLUMN last_session_at TIMESTAMPTZ NULL,
  ADD COLUMN avatar_url TEXT NULL,
  ADD COLUMN upgrade_failed_at TIMESTAMPTZ NULL,
  -- CHECK avatar_url não é javascript: ou data: URI (XSS guard)
  ADD CONSTRAINT users_avatar_url_safe CHECK (
    avatar_url IS NULL OR avatar_url ~ '^https?://'
  );
```

**Atualização em `lib/types/database.ts`:** adicionar os 4 campos + `role` (já existente em SQL, ausente nos types — drift identificado no review).

**Regras:**
- **`default_character_id`** = "último personagem usado em combate" (atualizado via server action ao criar `combatants` que referencia player); player pode **sobrescrever manualmente** em settings (Épico 02 Área 5). Cobre tanto combate em campanha quanto abertura de personagem em `/app/characters/[id]` HQ standalone (Épico 02 trigger)
- **`last_session_at`** = atualizado junto com `default_character_id`
- **`avatar_url`** = URL http/https externa; validação via CHECK constraint + server-side regex adicional; **NÃO aceita** `javascript:`, `data:`, ou schemes inseguros
- **`upgrade_failed_at`** = preenchido se Fase 3 da Área 2 falhar parcialmente; usado por cron retry

**Decisão:** `users` segue sendo tabela única de profile (não criar `player_profile` separado).

---

### Área 6 — Auto-inserção em `campaign_members` no upgrade

Orquestração dentro de `upgradePlayerIdentity` (Área 2, step 9).

```sql
INSERT INTO campaign_members (campaign_id, user_id, role, invited_by, status)
SELECT DISTINCT s.campaign_id, auth.uid(), 'player', c.owner_id, 'active'
FROM session_tokens st
JOIN sessions s ON s.id = st.session_id
JOIN campaigns c ON c.id = s.campaign_id
WHERE st.user_id = auth.uid() AND st.is_active = true
ON CONFLICT (campaign_id, user_id) DO NOTHING;
```

Idempotente. Re-run seguro.

---

### Área 7 — Glossário Ubíquo (Story #1, bloqueia todas as outras)

**Decisão Paige 2026-04-19:** Glossário é a **primeira story**. Estimativa: 1-2 dias.

Termos para `docs/glossario-ubiquo.md`:

| Termo PT | Código (EN, em funções/tabelas) | Definição | Evitar |
|---|---|---|---|
| **Upgrade de identidade** | `upgradePlayerIdentity` | Promover anon user para auth **preservando UUID** via `supabase.auth.updateUser` | "Conversão" (marketing); "Adoção" (ambíguo) |
| **Personagem standalone** | `player_characters WHERE campaign_id IS NULL` | Ver `docs/EPIC-player-hq-standalone.md` | Manter |
| **Personagem portável** | `migrateGuestCharacterToAuth` | Sinônimo de standalone em contexto guest→auth | Não cunhar fora desse contexto |
| **Personagem vinculado** | `player_characters WHERE campaign_id IS NOT NULL AND user_id IS NOT NULL` | Linked character em docs bilíngues | Manter |
| **Claim de personagem** | `claimCampaignCharacter` | Ato de reivindicar `player_characters` com `user_id IS NULL`. Pode ser anon (soft) ou auth (hard). **Pós-claim, player tem posse total.** | NÃO "adoção" |
| **Soft claim / Hard claim** | `claimed_by_session_token` vs `user_id` | Soft = anon reservou; Hard = auth possui e edita | Manter distinção |
| **Identidade anterior** | `session_tokens.anon_user_id` (último UUID visto) | Pode regenerar em cookie loss (ver spec-reconnection) | **NÃO** tratar como histórico imutável |

**DoD Story #1:**
- `docs/glossario-ubiquo.md` atualizado
- Grep **direcionado** (não naive): buscar ocorrências de "conversão", "adoção" em **contextos de identity** (arquivos em `lib/supabase/*identity*`, `components/player/*`, `app/invite/*`, `app/join/*`). Marketing docs permanecem livres
- Paige revisa antes de merge

---

### Área 8 — Atualização de `spec-resilient-reconnection.md`

**Adicionar seção:** "§4 — Identity upgrade como caso especial de reconexão"

Descreve:
- `updateUser` preserva UUID → reconnect-from-storage funciona sem ajustes
- Broadcast `player:identity-upgraded` é informativo (DM atualiza UI) mas **não** substitui presence
- Client não deve forçar signOut/signIn — ou seja, NÃO invalidar `session_token_id` da storage
- Se `updateUser` falhar: anon session permanece válida; cliente pode retry

---

## Arquivos Chave para Criar/Modificar

| Arquivo | Ação | Área |
|---|---|---|
| `supabase/migrations/142_session_tokens_user_id.sql` | **CRIAR** | 1 |
| `supabase/migrations/143_player_characters_claim.sql` | **CRIAR** | 4 |
| `supabase/migrations/144_users_profile_enrichment.sql` | **CRIAR** | 5 |
| `lib/types/database.ts` | **MODIFICAR** — adicionar `role`, `default_character_id`, `last_session_at`, `avatar_url`, `upgrade_failed_at`; refletir migrations 142-144 | 1, 4, 5 |
| `lib/supabase/player-identity.ts` | **CRIAR** — lógica de `upgradePlayerIdentity` | 2 |
| `app/api/player-identity/upgrade/route.ts` | **CRIAR** — endpoint POST server action | 2 |
| `app/api/player-identity/upgrade-recovery/route.ts` | **CRIAR** — retry Fase 3 | 2 |
| `lib/supabase/character-portability.ts` | **CRIAR** — `migrateGuestCharacterToAuth` | 3 |
| `app/api/player-identity/migrate-guest-character/route.ts` | **CRIAR** — endpoint público | 3 |
| `lib/supabase/character-claim.ts` | **CRIAR** — `claimCampaignCharacter` + `listClaimableCharacters` (paginado) | 4 |
| `docs/glossario-ubiquo.md` | **MODIFICAR** — 7 termos novos (Story #1) | 7 |
| `docs/spec-resilient-reconnection.md` | **MODIFICAR** — adicionar §4 | 8 |
| `tests/player-identity/upgrade-player-identity.test.ts` | **CRIAR** | 2 |
| `tests/player-identity/character-portability.test.ts` | **CRIAR** | 3 |
| `tests/player-identity/character-claim.test.ts` | **CRIAR** | 4 |
| `tests/player-identity/list-claimable-characters.test.ts` | **CRIAR** | 4 |
| `e2e/features/identity-upgrade-mid-combat.spec.ts` | **CRIAR** (Playwright) | Testing Contract |

**Importante:** esta fundação é **backend-only**. Nenhum componente de UI tocado. `PlayerJoinClient.tsx` (3043 linhas), `GuestCombatClient.tsx`, rotas `/join`, `/invite`, `/try` ficam intocados — responsabilidade do Épico 02.

---

## Critérios de Aceitação

### Área 1 — Schema session_tokens.user_id
- [ ] Migration 142 aplicada em dev + staging sem erro
- [ ] `lib/types/database.ts` reflete novo campo
- [ ] RLS atualizado conforme SQL da Área 1
- [ ] Index em `user_id` criado

### Área 2 — `upgradePlayerIdentity` (server action)
- [ ] Endpoint `/api/player-identity/upgrade` existe e valida com zod
- [ ] Usa `auth.updateUser`, NÃO `signUp` (pre-flight valida email disponível)
- [ ] `oldUserId === newUserId` — nenhuma UPDATE usando anon_user_id como WHERE key
- [ ] Fase 3 idempotente: re-rodar endpoint após sucesso parcial completa
- [ ] Endpoint `/api/player-identity/upgrade-recovery` permite retry de Fase 3
- [ ] Broadcast `player:identity-upgraded` emitido em `campaign:{id}` E `session:{id}`
- [ ] Payload exatamente conforme schema documentado
- [ ] 8+ testes (ver Testing Contract)

### Área 3 — `migrateGuestCharacterToAuth`
- [ ] Aceita shape de `GuestCombatSnapshot["combatants"][number]`
- [ ] Insere row em `player_characters` (nome correto da tabela)
- [ ] `setAsDefault` aplica override condicional
- [ ] Endpoint público existe e valida

### Área 4 — Character Claim
- [ ] Migration 143 aplicada
- [ ] `claimCampaignCharacter` usa UPDATE atômico com WHERE idempotente (previne race)
- [ ] RLS para soft-claim update validado (anon UPDATE possível via `claimed_by_session_token`)
- [ ] `listClaimableCharacters` paginado (limit default 20, retorna `total` e `hasMore`)
- [ ] Soft-claim promovido a hard-claim em `upgradePlayerIdentity`
- [ ] **Posse total pós hard-claim:** validar UPDATE/DELETE via RLS `user_id = auth.uid()`
- [ ] Erro idempotente se já claimed

### Área 5 — Profile Enrichment
- [ ] Migration 144 aplicada
- [ ] CHECK constraint `users_avatar_url_safe` rejeita `javascript:`, `data:`, etc
- [ ] `last_session_at` + `default_character_id` atualizados via server action na criação de combatant OR abertura de HQ standalone
- [ ] `upgrade_failed_at` populado se Fase 3 falhar

### Área 6 — Auto-insert members
- [ ] Coberto em testes de `upgradePlayerIdentity`
- [ ] ON CONFLICT DO NOTHING garantido
- [ ] `invited_by` populado com `campaigns.owner_id`

### Área 7 — Glossário (Story #1)
- [ ] `docs/glossario-ubiquo.md` atualizado com 7 termos
- [ ] Grep direcionado (arquivos em escopo de identity) zerado
- [ ] Merged ANTES de qualquer story de código

### Área 8 — spec-resilient-reconnection
- [ ] Seção §4 adicionada
- [ ] Fluxo de identity upgrade documentado como cenário suportado

### Integração
- [ ] `tsc --noEmit` limpo
- [ ] **Parity check:** guest/anon/auth funcionam como hoje (regressão zero via smoke manual + E2E)
- [ ] Reconnection spec: broadcast não interfere com presence/heartbeat
- [ ] `supabase/seed` ou equivalente: dados de teste refletem novo schema

---

## Testing Contract

**Matriz mínima por área:**

| Área | Unit | Integration (Supabase local) | E2E (Playwright) |
|---|---|---|---|
| 1 — Schema | RLS via SQL test (pgTap ou equivalente) | — | — |
| 2 — upgradePlayerIdentity | 8+ tests (validação, failure cada passo, idempotência) | Full flow com migration 142-144 | `identity-upgrade-mid-combat.spec.ts` |
| 3 — Portability | Shape mapping (3+) | — | Guest → signup → personagem aparece no dashboard |
| 4 — claim + listClaimable | 4+ cada + race test | RLS validation (anon pode soft-update, não pode hard) | Anon claima → upgrade → posse total validada |
| 5 — Profile | Trigger validation | CHECK constraint rejeita URLs inseguras | — |
| 6 — Campaign members | Coberto em Área 2 | Idempotência re-run | — |
| 7 — Glossário | Grep direcionado | — | — |

**Testes EXPLICITAMENTE obrigatórios:**

1. **Concorrência email duplicado:** 2 anon players tentam upgrade simultâneo com mesmo email → unique constraint bloqueia o segundo; primeiro sucesso limpo
2. **Concorrência session_token (NOVO, reviewer):** 2 browsers com mesmo `session_token_id` (re-link DM) tentam upgrade → segundo detecta "já autenticado" e retorna success sem-op
3. **Failure em Fase 3 + retry:** INSERT `campaign_members` falha por RLS → `upgrade_failed_at` populado → retry endpoint completa migração
4. **RLS soft-claim (NOVO):** anon player soft-claima → pode UPDATE nome/stats via RLS `player_characters_soft_claim_update` → pós-upgrade, RLS normal (`user_id = auth.uid()`) mantém acesso
5. **anon_user_id regenerou antes do upgrade (NOVO, reviewer):** cookies limpos, anon sign-in novamente, session_token `id` preservado mas `anon_user_id` novo → upgrade usa `session_token_id` e funciona
6. **Claim race:** 2 players tentam claim do mesmo character simultaneamente → apenas 1 sucesso, outro recebe "já reivindicado"
7. **listClaimableCharacters paginação:** campanha com 30 characters claimáveis → 2 páginas retornadas corretamente com `total`
8. **E2E Playwright:** anon em combate ativo → `updateUser` inline → server action executa Fase 3 → volta ao combate sem pular turno nem perder initiative

**Cleanup de `anon_user_id` legacy:** ticket separado `#auth-cleanup-anon-users` será aberto com owner Winston, SLA 30 dias pós-release. Não é escopo deste épico.

---

## Story Sequencing (DAG)

```
Story 01-A: Glossário ubíquo (Paige)
   └─ BLOQUEIA todas as outras

Story 01-B: Migrations 142-144 + types update
   └─ depende de 01-A

Story 01-C: claimCampaignCharacter + listClaimableCharacters (Área 4)
   └─ depende de 01-B

Story 01-D: migrateGuestCharacterToAuth (Área 3)
   └─ depende de 01-B
   └─ PARALELO a 01-C

Story 01-E: upgradePlayerIdentity (server action + rota + lib) (Área 2)
   └─ depende de 01-B, 01-C, 01-D
   └─ 4-5 dias

Story 01-F: Testing Contract completo (Quinn lidera)
   └─ depende de 01-C, 01-D, 01-E
   └─ parcialmente concorrente com 01-E

Story 01-G: Docs finais (spec-reconnection §4, glossário revisado)
   └─ depende de 01-E
```

**Distribuição por sprint:**
- **Sprint 1:** 01-A, 01-B, 01-C, 01-D
- **Sprint 2:** 01-E, 01-F, 01-G

---

## Riscos Documentados

| Risco | Severidade | Mitigação |
|---|---|---|
| Fase 2 (`updateUser`) tem sucesso mas Fase 3 falha parcialmente | Média | `upgrade_failed_at` flag + endpoint de recovery + cron retry |
| Player perde continuity durante upgrade | Alta | Broadcast coordenado + `session_token_id` estável + reconnect-from-storage; spec §4 atualizado |
| `anon_user_id` regenerou antes do upgrade (cookie loss + re-anon) | Média | Saga usa `session_token_id` como chave estável (D4); WHERE-clauses nunca dependem de `anon_user_id` sozinho |
| Concorrência email duplicado | Média | Unique constraint em `auth.users.email` bloqueia; pre-flight check UX |
| Race de claim entre 2 players | Média | Atomic UPDATE com WHERE idempotente (Área 4) |
| Schema migration em prod com combate ativo | Baixa | Migrations são `ADD COLUMN` (não-bloqueantes); deploy em baixa carga |
| Big-bang release: Épico 01 pronto mas 02-04 atrasam | Alta | **Decisão revisada (review 2026-04-19):** NÃO opt-out parcial — seguir big-bang integral. Opt-out parcial coloca primitives sem consumidores em prod e torna validação impossível. Se calendário apertar: atrasar o release inteiro, não fatiar. Revisar plano a cada sprint |
| XSS via `avatar_url` malicioso | Média | CHECK constraint + server-side regex; testes negativos explícitos |
| `players_characters` RLS soft-claim permite anon editar character de campanha indevidamente | Média | Policy escopada a `claimed_by_session_token IS NOT NULL` e validação de ownership do session_token |

---

## Regras Imutáveis (CLAUDE.md)

- **Combat Parity Rule:** fundação é backend; porém `upgradePlayerIdentity` preserva continuity de combate. Validar antes do merge: anon em combate → upgrade → continua vendo initiative, HP, broadcasts.
- **Resilient Reconnection Rule:** during upgrade, client usa reconnect-from-storage. **Não forçar signOut/signIn.** `session_token_id` é preservado. Spec atualizado (Área 8).
- **SRD Compliance:** não aplicável.
- **SEO Canonical:** não aplicável.

---

## Dependências

### De entrada
Nenhuma externa. Épico-fundação da iniciativa.

### De saída (o que este épico desbloqueia)
- **Épico 02** — consome `upgradePlayerIdentity`, `listClaimableCharacters`, `claimCampaignCharacter`, dados enriquecidos de `users`
- **Épico 03** — consome `upgradePlayerIdentity` e `migrateGuestCharacterToAuth` nos CTAs de sala de espera e pós-recap
- **Épico 04** — consome player profile enriquecido

---

## Estimativa de Esforço

| Área | Complexidade | Esforço |
|---|---|---|
| Área 7 — Glossário (Story #1) | Baixa | 1-2 dias |
| Área 1 — session_tokens.user_id | Baixa | 0.5 dia |
| Área 2 — upgradePlayerIdentity (forward-recovery + recovery endpoint) | **Alta** | 5-6 dias |
| Área 3 — Character portability | Média | 1-2 dias |
| Área 4 — Character claim + listClaimable paginado + RLS soft-claim | Média | 2 dias |
| Área 5 — Profile enrichment (incl. CHECK constraint) | Baixa | 0.5 dia |
| Área 6 — Auto-insert members | — | incluso em Área 2 |
| Área 8 — spec-reconnection update | Baixa | 0.5 dia |
| Testing Contract (Quinn lidera) | Média-Alta | 2-3 dias |
| Docs finais (glossário) | Baixa | 0.5 dia |
| **Total** | | **12-17 dias úteis (~2 sprints)** |

---

## Decisões Abertas (MEDIUM da review, decidir antes de Story 01-B)

| # | Questão | Proposta default | Owner |
|---|---|---|---|
| M1 | `default_character_id` cobrindo HQ standalone (`/app/characters/[id]`) | Sim, trigger atualiza em ambos os casos | Winston |
| M2 | Google OAuth dentro de AuthModal (Épico 02) — tab nova perde `upgradeContext` | Modal fecha ao iniciar OAuth; state via localStorage sobrevive; ao retornar, client detecta e continua fluxo | Sally + Winston |
| M3 | `detectPlayerState` precisa de cookies server-side — signature deve explicitar | Passar `SupabaseServerClient` (já cookie-aware) como parâmetro único | Winston |
| M4 | Histórico de sessões do player precisa RLS especial para ler combatants de outros players | Query scoped a sessions onde user tinha combatant; metadata de outros combatants (nomes) ok via policy pública; stats detalhados só dos próprios | Winston |

Estas 4 decisões serão tomadas em rodada curta antes do Story 01-B. Se divergirem, reabrir review.

---

## Próximos Passos

1. ~~Revisão deste épico com Dani_~~ ✅ Aprovado 2026-04-19 (v1)
2. ~~Code review adversarial~~ ✅ 2026-04-19 (25 issues encontrados, todos endereçados em v3)
3. Criar Épico Mãe em `docs/EPIC-player-identity-continuity.md` (commit separado)
4. ~~Documentar Épico 02~~ ✅ (também corrigido em review v3)
5. Documentar Épicos 03 e 04
6. Decidir M1-M4 em rodada curta
7. Bob (SM) cria Story 01-A (Glossário)
8. Winston (Architect) valida contratos de API antes do primeiro story de código
