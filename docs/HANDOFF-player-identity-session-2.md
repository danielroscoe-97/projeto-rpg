# Handoff — Player Identity & Continuity (PocketDM)

Você está continuando uma iniciativa de múltiplas sprints no projeto **PocketDM** (Next.js + Supabase). Esta é uma sessão de continuidade — leia TUDO antes de agir. Não tem memória de sessões anteriores; este prompt é a fonte única de verdade.

## 1. Contexto da Iniciativa

**"Player Identity & Continuity"** resolve o maior gargalo do Beta Test 3: players anônimos vivem uma sessão e somem. Decomposta em 4 épicos (big-bang release, ~71-94 dias úteis somados):

- **H1** — Reduzir atrito da próxima sessão (player volta mais rápido, já autenticado)
- **H2** — Retenção/conversão de anônimo em conta
- **H3** — Continuidade narrativa (personagem + campanha + histórico persistem)

**Decisão de release travada:** big-bang (4 épicos entram juntos em produção). Sem opt-out parcial.

## 2. Estado Atual

### ✅ Docs SÓLIDOS (passaram por adversarial review)
- `docs/EPIC-player-identity-continuity.md` — parent (índice)
- `docs/epics/player-identity/epic-01-identity-foundation.md` — **v3**
- `docs/epics/player-identity/epic-02-player-dashboard-invite.md` — **v2**
- `docs/SPRINT-PLAN-player-identity.md` — plano cross-epic (11 sprints)
- `docs/glossario-ubiquo.md` — atualizado com 7 termos novos de identity

### ⚠️ Docs FRÁGEIS (precisam v2 rewrite — review pegou muitos bugs)
- `docs/epics/player-identity/epic-03-conversion-moments.md` — **v1**, ver §5
- `docs/epics/player-identity/epic-04-player-as-dm-upsell.md` — **v1**, ver §6

### ✅ Código shipping (Epic 01 — 4 commits)

| Story | Commit | Conteúdo |
|---|---|---|
| 01-A | `aa19d08e` | Glossário + sprint plan |
| 01-B | `379fa1cd` | Migrations 142, 143, 144 + types update (`lib/types/database.ts`) |
| 01-C | `cf44fb59` | `lib/supabase/character-claim.ts` + migration 145 (RLS fix) + 11 tests jest |
| 01-D | `75327868` | `lib/supabase/character-portability.ts` + 13 tests jest |

### 📋 Pendente em Epic 01
- **Story 01-E** — `upgradePlayerIdentity` saga (a mais complexa, 4-5 dias)
- **Story 01-F** — Testing Contract completo (Quinn lidera — concorrência, RLS bypass, E2E Playwright)
- **Story 01-G** — Atualizar `docs/spec-resilient-reconnection.md` com §4 (identity upgrade cenário)

## 3. Lições Aprendidas (NÃO REPITA)

Estes erros apareceram em review. Você receberá contexto, mas confirme com grep se tiver dúvida.

1. **Tabela é `player_characters`, NÃO `characters`**
   - Toda SQL, migration, RLS, RPC usa `player_characters`
   - Rota pública é `/app/characters/[id]` (URL friendly, só isso)
   - Type alias `Character` ou `PlayerCharacter` em TypeScript OK

2. **Upgrade anon→auth usa `supabase.auth.updateUser({ email, password })`, NÃO `signUp()`**
   - `updateUser` preserva UUID in-place (anon UUID vira auth UUID)
   - `signUp` criaria NOVO UUID e quebraria toda referência
   - Epic 01 Área 2 tem saga correta com `updateUser`

3. **Projeto usa jest, NÃO vitest**
   - `package.json`: `"test": "jest"`; sem vitest instalado
   - Tests com `import from "vitest"` NÃO RODAM em `npm test`
   - Usar jest globals: `describe`, `it`, `expect`, `jest.fn()`, sem import
   - Conversão: remove import vitest, `vi.` → `jest.`

4. **i18n: `next-intl` com `messages/{en,pt-BR}.json` flat**
   - NÃO é `next-i18next` com `public/locales/*`
   - Namespace via `useTranslations("combat")`, `t.rich()` pra markdown
   - Epic 03 v1 errou isso; v2 deve seguir o stack real

5. **`session_tokens.id` é o identificador ESTÁVEL**
   - `anon_user_id` pode regenerar em cookie loss (ver `docs/spec-resilient-reconnection.md §2.4`)
   - NUNCA use `anon_user_id` como chave em WHERE clauses
   - Saga do upgrade recebe `sessionTokenId` explicitamente

6. **`player_characters.campaign_id` É NULLABLE** (migration 076)
   - Types recém-corrigidos em commit 379fa1cd (`string | null`)
   - Código downstream com `campaign.campaign_id.toUpperCase()` quebra em runtime
   - Audit: grep `.campaign_id` e adicione null checks onde faltar

7. **Realtime/broadcast só em Anon + Auth** (CLAUDE.md)
   - Guest em `/try` NÃO tem realtime
   - Turn-safety claims com broadcast não aplicam a guest
   - Epic 03 v2 deve refletir isso

8. **Commit disciplinado** — Dani_ trabalha em paralelo
   - SEMPRE use `rtk git commit --only -m "..." path1 path2`
   - NUNCA `git add .` ou commit de tudo staged
   - Verifique `rtk git status --short` antes de commitar

9. **`CombatRecap.onSaveAndSignup` é `() => void` hoje**
   - Mudar assinatura é breaking change; callers em `GuestCombatClient.tsx:2214` e `RecapActions.tsx` passam zero-arg
   - Se precisar passar contexto, adicione param OPCIONAL ou prop separada

10. **`GuestCombatSnapshot["combatants"][number]` NÃO EXISTE**
    - Use `Combatant` de `lib/types/combat.ts`
    - Guest snapshot tem array de combatants incluindo MONSTROS
    - Filtro: `combatants.find(c => c.is_player === true)`

11. **Analytics stack: namespaced colon-style** (`lp:cta_click`)
    - NÃO snake_case. Ver `lib/analytics/track.ts:61-101`
    - Epic 03 v2 deve seguir: `conversion:cta_shown`, `conversion:cta_clicked`, etc.

12. **`encounters` não tem `campaign_id`** — tem `session_id → sessions(id)`
    - Sessions têm `campaign_id`
    - Epic 04 v1 escreveu SQL com `encounters.campaign_id` (não existe)

13. **`create_campaign_with_settings` assinatura real:** `(p_owner_id, p_name, p_description, p_game_system, p_party_level, p_theme, p_is_oneshot)` retorna JSON
    - Não aceita string `'long_campaign'`
    - Ver `supabase/migrations/122_create_campaign_atomic.sql`

## 4. Convenções de Trabalho

- **TodoWrite**: use pra rastrear progresso, uma task `in_progress` por vez
- **rtk prefix**: `rtk git`, `rtk npm`, `rtk tsc` — economiza tokens em output
- **Agent tool**: despache stories de código pra agentes paralelos quando tocam arquivos independentes. Briefing EXATO com file:line refs
- **Adversarial review**: rode `Plan` agent DEPOIS de escrever docs, ANTES de commitar
- **Commit mensagens**: `feat(player-identity): Story 0X-Y descrição` + corpo explicando WHAT/WHY. Inclua `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>`
- **Português**: copy user-facing, comments internos podem ser EN, nomes de funções EN

## 5. Fixes Críticos — Epic 03 v2

Review adversarial (2026-04-19) pegou os seguintes issues. Ao reescrever:

**🔴 CRÍTICOS:**
- **i18n stack errado** — trocar tudo de `next-i18next` + `public/locales/*` para `next-intl` + `messages/{en,pt-BR}.json`. Namespace `conversion` vira sub-key em arquivo existente.
- **`CombatRecap.onSaveAndSignup` breaking change** — atual é `() => void` usado em `GuestCombatClient.tsx:2214` e `RecapActions.tsx`. Alternativas:
  - (a) Não mudar assinatura; passar contexto via prop separada `saveSignupContext`
  - (b) Adicionar prop nova `onSaveAndSignupWithContext`, manter original, deprecar depois
- **`guestCharacter` shape era fiction** — `useGuestCombatStore` NÃO tem `myCharacter`. Use `Combatant` de `lib/types/combat.ts`. Caller filtra: `snapshot.combatants.find(c => c.is_player)`. (Já corrigido em Story 01-D `character-portability.ts` — veja como padrão.)

**🟠 ALTOS:**
- **Turn-safety untestable** — "turno já passado sem penalidade" é vago. Reformular AC: "se DM distribuir turno enquanto modal aberto, heartbeat mantém player como presente; DM vê status 'cadastrando'; ao fechar modal, player vê turno atual (possivelmente já passado sem dano automatizado)". Remover claim de "sem perder turno" — heartbeat prova liveness, não ação.
- **Dismissal namespace conflita** — existem `pocketdm_anon_id`, `taverna_anon_id`, `guest-banner-dismissed`. Adotar prefix consistente `pocketdm_conversion_dismissal_v1`.
- **Analytics não-namespaced** — eventos devem usar `conversion:cta_shown` (colon), não `conversion_cta_shown` (underscore). Ver `lib/analytics/track.ts` para padrão.
- **Estimativa off por 2x** — 12-16 dias é otimista. Revisar para 20-30 dias.

**🟡 MÉDIOS:**
- `combat:started` broadcast é vaporware — event não existe. Usar `encounter.is_active` transition observada via Supabase realtime.
- Área 3 contradiz: guest com `upgradeContext` cai em `upgradePlayerIdentity` (que é anon→auth), mas guest não é anon. Separar: guest → signUp padrão + migrateGuestCharacterToAuth (chamar diretamente, sem `upgradeContext`).
- Guest não tem realtime: turn-safety toast listener não aplica a guest (parity claim cosmético).
- Dismissal para guest (sem `campaignId`): usar `"__guest__"` sentinel ou fallback time-based.
- Admin dashboard (`/app/admin/conversion-funnel`) duplica `MetricsDashboard.tsx` existente — integrar, não criar novo.

**🟢 BAIXOS:** Story 03-A dependency inconsistency; markdown `**` em JSON precisa `t.rich()`; "Paige revisa" não é AC testável.

## 6. Fixes Críticos — Epic 04 v2

**🔴 CRÍTICOS:**
- **`encounters.campaign_id` NÃO EXISTE** — schema real: `session_id → sessions(id)`. Clone RPC precisa criar `sessions` row primeiro, depois `encounters` com `session_id`.
- **`create_campaign_with_settings` assinatura errada** — ver §3 item 13. Retorna JSON, não UUID.
- **Materialized view refresh em AFTER UPDATE trigger é race-prone** — `REFRESH CONCURRENTLY` não pode rodar dentro de transação com writes na tabela fonte; vai serializar session-ends. **Usar pg_cron a cada 15 min como DEFAULT, não alternativa.**
- **Trigger 141 tem bypass path** — direct INSERT de `is_active=false` NÃO dispara trigger. Materialized view vai driftar. Mitigação: refresh periódico garantido por cron.
- **SRD compliance hand-waved** — templates devem ter FK para monsters whitelist OU CHECK constraint. "Paige revisa" não é engineering control.
- **Clone ignora monstros faltantes** — se monstro sumir da whitelist, `monsters_payload` aponta pra fantasma. Validar antes de clone OU soft-fail com log.

**🟠 ALTOS:**
- **`v_past_companions` SQL quebrado** — `combatants.user_id` não existe. Correto: `combatants.player_character_id → player_characters.user_id`. Reescrever join.
- **Plain VIEW não suporta RLS per-row** — usar `SECURITY INVOKER` view com RLS nas tabelas base, OU `SECURITY DEFINER` function com WHERE `for_user_id = auth.uid()`.
- **N+1 blow-up em escala** — self-join `combatants × combatants` por encounter explode. Adicionar LIMIT na view ou materializar.
- **Privacy: social graph exposto sem opt-out** — adicionar `users.share_past_companions` BOOLEAN (default true, mas player pode opt-out nas settings).
- **Role flip sem broadcast** — user com 2 tabs abertas não sincroniza role. Adicionar `supabase.channel().broadcast()` em `updateRole`.
- **`first_campaign_created_at` semântica indefinida** — decidir: set no primeiro INSERT, NÃO limpar em delete (senão não-determinístico).
- **Estimativa inconsistente** — header diz 18-28, tabela soma 25-32. Reconciliar para 35-45 realístico.

**🟡 MÉDIOS:**
- `BecomeDmWizard` não emite role_upgraded pra users `role='both'` — funil undercount.
- Tour CSS selectors precisam `data-tour-target` contract + teste "tour não throwa se selector missing".
- Template governance: versioning, i18n, cascade de delete — decisão pendente.
- `sessionsPlayed` pra upgraded anon: como contar sessões pré-upgrade? Saga do 01-E pode backfill via claimed_by_session_token.
- Bulk invite: 20 requests sequenciais sem rate limit. Batch server-side em um único endpoint.

**🟢 BAIXOS:** migration numbering mismatch (022 → 017), ACs `<500ms` sem metodologia, Story 04-A bundla 5 migrations (split).

## 7. Próximas Prioridades (ordem sugerida)

1. **Rewrite Epic 03 v2** — escreva incorporando §5, depois rode Plan agent adversarial, iterar até v3 se necessário
2. **Rewrite Epic 04 v2** — mesmo processo, §6
3. **Story 01-E — `upgradePlayerIdentity` saga** — a mais complexa; briefing detalhado em `epic-01-identity-foundation.md` Área 2. Idempotent forward-recovery com compensating action apenas no `auth.admin.deleteUser` (point of no return após `updateUser`). Ponto a ter cuidado: execução em server action (Route Handler) `app/api/player-identity/upgrade/route.ts`
4. **Story 01-F — Testing Contract** — concorrência, RLS bypass, E2E Playwright (ver `epic-01-identity-foundation.md` Testing Contract)
5. **Story 01-G — spec-reconnection update**

## 8. Arquivos Para Ler PRIMEIRO

Antes de agir, leia (ou grep):

- `CLAUDE.md` — regras imutáveis (Combat Parity, Resilient Reconnection, SRD Compliance, SEO Canonical)
- `docs/EPIC-player-identity-continuity.md` — visão geral
- `docs/epics/player-identity/epic-01-identity-foundation.md` — fundação v3 (referência de qualidade)
- `docs/glossario-ubiquo.md` — terminologia obrigatória (seção "Player Identity & Continuity")
- `docs/spec-resilient-reconnection.md` — regras de reconexão
- `lib/types/database.ts` — tipos atualizados
- `lib/supabase/character-claim.ts` + `character-portability.ts` — padrão a seguir (use `"use server"`, `createServiceClient`, discriminated unions, atomic UPDATE pattern)
- `supabase/migrations/142_*.sql` até `145_*.sql` — schema atual da iniciativa

Você NÃO precisa ler Epic 03 v1 e Epic 04 v1 — eles estão quebrados. Use §5 e §6 deste prompt como checklist de rewrite.

## 9. Verificação Inicial Recomendada

Rode no começo da sessão:

```bash
rtk git log -10 --oneline  # confirma commits da sessão anterior estão lá
rtk git status --short     # confirma estado do workspace
rtk npm test -- tests/player-identity/  # confirma 24 tests de 01-C + 01-D passando
rtk tsc --noEmit           # confirma types clean
```

Se algo falhar, reporte antes de escrever código novo.

## 10. Regra Ouro

**Review adversarial antes de implementar, sempre.** Especificamente: depois de escrever cada epic novo ou update grande, rode `Plan` agent pra procurar bugs. A sessão anterior pulou review em Epics 03 e 04 e pagou caro.

Quando estiver pronto, comece perguntando ao user qual prioridade atacar. Não assuma — o user (Dani_) pode ter mudado prioridade entre sessões.
