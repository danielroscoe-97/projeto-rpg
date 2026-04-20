# EPIC 04: Player-as-DM Upsell

> **Status:** Pronto para revisão (v3 pós adversarial review 2026-04-19 de v2)
> **Prioridade:** Média-Alta (loop viral de longo prazo — H2)
> **Origem:** Party Mode 2026-04-19 + adversarial reviews v1 (HANDOFF §6) e v2 (2026-04-19: 7 críticos + 7 altos + 8 médios + 6 baixos + 1 gap funcional)
> **Parent epic:** `docs/EPIC-player-identity-continuity.md` (a ser criado)
> **Sprint estimate:** ~3-4 sprints (35-45 dias úteis — o maior dos 4 épicos)
> **Release strategy:** Big-bang (junto com Épicos 01, 02, 03)
> **Depende de:** Épicos 01, 02, 03 (dashboard enriquecido, analytics, profile)
> **Agente executor:** John (PM) lidera scope; Sally (UX) onboarding DM; Winston (Arch) templates; Bob fatia

---

## Contexto do Épico Mãe

Ver [`docs/EPIC-player-identity-continuity.md`](../../EPIC-player-identity-continuity.md) para visão completa. Este épico é o **loop viral de H2** — depois que a iniciativa converte anon em auth, este épico converte auth-player em auth-DM. Cada DM novo é um gerador de novos invites, que geram novos anon players, que viram auth-players, que viram DMs. Isso é o produto crescendo sozinho.

**Escopo decidido por Dani_ em 2026-04-19: VERSÃO COMPLETA** — combina todas as 4 sub-versões originalmente propostas:
- (a) Discovery / unlock DM
- (b) Onboarding DM (tour + templates)
- (c) Kit DM pre-gerado (starter encounters, NPCs)
- (d) Viral cross-invite (novo DM convida quem jogou com ele)

---

## Dependências de Entrada

### Do Épico 01
- `users.default_character_id`, `users.last_session_at` (enrichment)
- `player_characters.user_id` atualizado por Story 01-E no anon→auth upgrade (preserva matview counts pré-upgrade — ver F12)
- Glossário ubíquo com termos de identity

### Do Épico 02
- Dashboard do player enriquecido (base visual para CTA de upsell)
- `CharacterPickerModal`, `AuthModal` (para fluxos relacionados)

### Do Épico 03
- Analytics stack consolidada (`trackServerEvent`, namespace colon-style `dm_upsell:*`)
- Padrão `MetricsDashboard` reaproveitado (ver F7 abaixo — adicionamos SEÇÃO, não tab)

---

## Problema

### Contexto surpreendente descoberto na pesquisa (2026-04-19)

**A criação de campanha JÁ é free e NÃO-GATED.** Qualquer user (incluindo `role = 'player'`) pode, tecnicamente, criar uma campanha hoje. A única diferença é visual: o dashboard filtra views com base em `users.role`:
- `role = 'player'` → vê só player view (sem botão "New Campaign")
- `role = 'dm'` → vê só DM view
- `role = 'both'` (**default de novos signups**) → vê ambas

Conclusão: este épico **NÃO é sobre "desbloquear" permissão**. É sobre:

1. **Discovery** — players `'both'` (maioria) nunca perceberam que podem DM
2. **Activation** — players `'player'` precisam trocar role (já existe `updateRole()` em `role-store.ts`)
3. **Retention as DM** — player virou DM, precisa ter sucesso na primeira campanha (ou abandona)
4. **Viral loop** — DM novo precisa de jogadores; o pool óbvio é quem ele jogou com antes

### O que falta

| Gap | Impacto |
|---|---|
| Sem CTA contextual "Virar DM" em momento certo | Players `'both'` nunca tentam; `'player'` não sabem que podem mudar |
| Sem tour de DM (só player tem) | Novo DM perdido na primeira tela |
| Sem starter kit (encounters, NPCs, campanha-tutorial) | Tela vazia = abandono |
| Sem convite automático para ex-companheiros de mesa | Novo DM pede "quem quer jogar?" sozinho |
| Sem tracking de funil player→DM | Sem dados, não iteramos |

---

## Estado Atual (verificado 2026-04-19 contra código real)

### O que JÁ EXISTE

| Componente | Onde | Estado |
|---|---|---|
| `CampaignCreationWizard` | `app/components/campaign/CampaignCreationWizard.tsx:38-96` | 3 steps maduro (name → type+party_level → confirm) |
| RPC `create_campaign_with_settings()` | `supabase/migrations/122_create_campaign_atomic.sql` | Assinatura real: `(p_owner_id, p_name, p_description, p_game_system, p_party_level, p_theme, p_is_oneshot)` retorna JSON `{campaign_id, join_code}` |
| `users.role` field | migration 022 — valores `'player'`, `'dm'`, `'both'` (default `'both'`) | Funcional |
| `role-store.ts` Zustand | `lib/stores/role-store.ts:1-50` | Tem `loadRole()` + `updateRole()` |
| `user_onboarding` table | migration 046 + 110 — campos `wizard_completed`, `dashboard_tour_completed`, `player_hq_tour_completed` | Tracking de tour existe só para player |
| `PlayerHqTourProvider` | `components/tour/PlayerHqTourProvider.tsx` + `player-hq-tour-steps.ts` | Tour maduro no lado player |
| `InvitePlayerDialog` (tabs link + email) | `components/campaign/InvitePlayerDialog.tsx:41-100` | Maduro; Resend integrado |
| `campaign_invites` | `supabase/migrations/025_campaign_invites.sql` — colunas `email NOT NULL`, `token UUID UNIQUE`, `invited_by`, `status`, `expires_at` (NÃO TEM `user_id`) | Pronto para viral loop — mas requer email resolution no server (ver F20) |
| `analytics_events` table + `trackServerEvent` | migration 013 + `lib/analytics/track-server.ts:46-67` | Analytics básico funcionando; usa colon-style namespace |
| `CampaignOnboardingChecklist` | `components/campaign/CampaignOnboardingChecklist.tsx:1-60` | Lista de setup da campanha; NÃO é tour |
| Monster presets RPC | `lib/supabase/presets.ts:14-46` | Fetch/create/update/delete |
| Evento `campaign:created_with_wizard` | `campaign-settings.ts:66` (já trackeado) | Reusável |
| `subscriptions` table | migration 017 — planos `free`, `pro`, `mesa` | **SEM gates em criação de campanha** — todo mundo cria de graça |
| `users` table | `lib/types/database.ts:39-80` — colunas `id, email, display_name, is_admin, preferred_language, role, default_character_id, last_session_at, avatar_url, upgrade_failed_at, created_at, updated_at` | **NÃO tem** `email_marketing_opt_in` (F4) |
| `users` RLS self-update | `005_rls_policies.sql:24` `users_update_own ON users FOR UPDATE USING (auth.uid() = id)` | Cobre `share_past_companions` sem policy nova (F15) |
| `sessions.is_active` | `002_session_tables.sql:14` | **DEFAULT `true`** — INSERT sem override marca sessão como ativa (F5) |
| `encounters` | `002_session_tables.sql:23` + `lib/types/database.ts:279` | Tem `session_id` (NÃO `campaign_id`), `creatures_snapshot` (JSONB), `dm_notes`, `is_active DEFAULT false` |
| `combatants.player_character_id` | `002_session_tables.sql:53` | Nullable FK — correto para JOIN de past_companions |
| `trigger ensure_encounter_started_at()` | `141_encounter_started_at_trigger.sql` | Fires BEFORE INSERT/UPDATE; tem **bypass** em direct INSERT de `is_active=false` — refresh de matview precisa ser independente de trigger (ver D10) |
| Admin dashboard | `app/admin/page.tsx` + `components/admin/MetricsDashboard.tsx` | **Rota real é `/app/admin/`** (NÃO `/app/app/admin/`). Layout é flat scroll de `<SectionTitle>` + cards (sem tab container) — ver F6+F7 |
| `rate_limits` RPC | `supabase/migrations/016_rate_limits.sql` | `check_rate_limit(key, max, window_seconds)` — usado como única mitigação de spam viral (F4) |
| SRD whitelist | `data/srd/srd-monster-whitelist.json` (singular) | Lista de slugs SRD — consumido por `scripts/filter-srd-public.ts` (F23) |

### O que NÃO EXISTE

| Gap | Área desta epic |
|---|---|
| CTA "Virar DM" contextual no dashboard do player | Área 1 |
| Trigger lógica (quantas sessões antes de mostrar CTA) | Área 2 |
| View SQL / RPC que conta `sessões jogadas como player` | Área 2 |
| Tour de DM (`DmTourProvider`, `dm-tour-steps.ts`, coluna `dm_tour_completed`) | Área 3 |
| Tabela de templates de campanha (`campaign_templates`) | Área 4 |
| RPC `clone_campaign_from_template()` | Área 4 |
| Starter encounters / NPCs pré-populados | Área 4 |
| Componente "Convide quem jogou com você" (lista ex-companheiros) | Área 5 |
| Query / view de `past_companions(userId)` | Área 5 |
| Eventos de funil player→DM | Área 6 |
| Seção "DM Upsell Funnel" em MetricsDashboard | Área 6 |

---

## Decisões de Arquitetura

### D1 — "Virar DM" é **discovery + role flip**, não gate removal

A permissão já existe. O trabalho é de UX: mostrar a possibilidade no momento certo, trocar `role` pra `'both'` ou `'dm'`, e segurar a mão do novo DM nos primeiros 15 minutos.

### D2 — Trigger conservador: **2 sessões jogadas**

Mostrar CTA após o player ter participado de **2+ sessões de combate** (como player, não como guest). Dois motivos:
- 1 sessão = ainda testando; prematuro
- 3+ = risco de perder player que só queria jogar
- 2 = momento do "engajamento confirmado"

Valor configurável via feature flag para A/B test futuro (não bloqueante do MVP).

### D3 — Templates são curados pelo admin, NÃO geração LLM

Starter kit vem de templates pré-construídos em SQL seed. Evita custo de LLM, garante qualidade. Admin (Dani_) curate 2-3 templates iniciais: "One-shot taverna", "Mini-dungeon 3 encontros", "Introdução 5e 3 sessões".

### D4 — Viral loop reusa `InvitePlayerDialog` + `campaign_invites`

Não reinventar invite. Lista de ex-companheiros é UI nova; o envio em si reusa `/api/campaign/[id]/invites`. Copy é contextual ("Você jogou com Lucas em Phandelver — convide-o!"). **Observar:** `campaign_invites.email NOT NULL` — o endpoint bulk resolve `user_id → email` server-side antes de INSERT (ver F20 / Área 5).

### D5 — DM Onboarding é **opcional e interruptível**

Tour de DM abre na primeira criação de campanha, mas:
- Botão "Pular tour" visível
- Permite voltar via help button (padrão do `DashboardTourHelpButton`)
- Progresso salvo em `user_onboarding.dm_tour_completed` e `user_onboarding.dm_tour_step`

### D6 — Nenhuma cobrança, sem gates de subscription

`subscriptions.plan = 'free'` já cria campanhas ilimitadas. Este épico **não** adiciona paywall. Se futuro escopo quiser monetizar DM features, é outra iniciativa.

### D7 — SRD compliance enforced por **trigger de validação**, não CHECK constraint

> **⚠️ Antipadrão rejeitado:** A primeira versão propôs usar `CHECK (EXISTS (SELECT 1 FROM monsters WHERE slug = ...))` em `campaign_template_encounters`. **Postgres CHECK expressions NÃO podem referenciar outras tabelas** — compilam mas comportam de forma não-determinística (são tratadas como se fossem IMMUTABLE). `(x, y) IN (SELECT ...)` também NÃO é suportado em CHECK. Portanto:
>
> ```sql
> -- ❌ NÃO IMPLEMENTAR — não funciona em Postgres
> -- ALTER TABLE campaign_template_encounters
> --   ADD CONSTRAINT check_srd_monsters_only
> --   CHECK (monsters_payload @> '[...]' IN (SELECT slug FROM monsters WHERE is_srd));
> ```

**Solução adotada — trigger BEFORE INSERT/UPDATE:**

```sql
CREATE OR REPLACE FUNCTION validate_template_monsters_srd()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_slug TEXT;
  v_missing_slugs TEXT[] := ARRAY[]::TEXT[];
BEGIN
  -- monsters_payload shape: [{"slug": "goblin", "quantity": 3, "hp": 7}, ...]
  IF NEW.monsters_payload IS NULL OR jsonb_typeof(NEW.monsters_payload) <> 'array' THEN
    RETURN NEW; -- empty payload permitido (pure-narrative encounter)
  END IF;

  FOR v_slug IN
    SELECT jsonb_array_elements(NEW.monsters_payload)->>'slug'
  LOOP
    IF v_slug IS NULL THEN CONTINUE; END IF;
    IF NOT EXISTS (
      SELECT 1 FROM monsters WHERE slug = v_slug AND is_srd = true
    ) THEN
      v_missing_slugs := array_append(v_missing_slugs, v_slug);
    END IF;
  END LOOP;

  IF array_length(v_missing_slugs, 1) > 0 THEN
    RAISE EXCEPTION 'Template monsters must be SRD-whitelisted. Non-SRD or missing: %', v_missing_slugs
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_template_monsters_srd
  BEFORE INSERT OR UPDATE ON campaign_template_encounters
  FOR EACH ROW EXECUTE FUNCTION validate_template_monsters_srd();
```

Consequência: tentativa de inserir slug não-SRD falha em runtime com SQLSTATE `23514`. Texto e código consistentes em torno de `monsters_payload` (JSONB array) — F10 resolvido.

### D8 — Privacy: opt-out de past companions

Adicionar `users.share_past_companions BOOLEAN DEFAULT true`. `get_past_companions()` filtra companions que setaram `false`. Usuário pode alterar em settings (exposto em Épico 02 Área 5 se couber; senão, ticket de follow-up). Já coberto por RLS `users_update_own` existente (F15).

### D9 — Role flip broadcast contract (multi-tab sync)

`updateRole()` em `role-store.ts` passa a emitir broadcast:
- **Canal:** `user:{userId}` (dedicated per-user channel; criar se não existe)
- **Event:** `role_updated`
- **Payload:** `{ event: 'role_updated', newRole: 'player' | 'dm' | 'both', previousRole, at: ISO8601 }`
- **Listeners:** `useRoleStore` em outras tabs faz re-read da role do banco. **NÃO tocar `session_token_id`** — preservado por contrato com `docs/spec-resilient-reconnection.md §4` (identity upgrade).
- **Test 10 (session_token_id preservation)** é cabeada diretamente ao código path do broadcast (assert que `session_token_id` em sessionStorage é idêntico antes/depois).

### D10 — Matview refresh: **pg_cron como DEFAULT + pg_notify-triggered debounce para hot path**

Direct INSERT com `encounters.is_active=false` NÃO dispara o trigger do `141`. Qualquer refresh-on-trigger em `encounters` driftaria. Portanto:

- **Default (stale-tolerant):** `pg_cron` refresh a cada 15 min. Idempotente via DELETE-then-schedule (F16).
- **Hot path ("just-ended-session" case):** F19 — trigger em `sessions.is_active true→false` chama `pg_notify('session_ended', owner_id::text)`. **Fallback mais simples e adotado:** server action do dashboard do player detecta `matview_stale_seconds > N` e faz query live `SELECT COUNT(DISTINCT s.id) FROM ... WHERE pc.user_id = $1`. Isto evita pg_notify/edge-function complexidade e garante que o CTA aparece imediatamente na volta da sessão recém-terminada.
- **Materialized view NÃO tem RLS enforcement pelo Postgres.** Portanto: `REVOKE ALL ON v_player_sessions_played FROM authenticated, anon, PUBLIC;` (F2). Acesso público vai só pela VIEW wrapper `my_sessions_played` (filtra por `auth.uid()`).

### D11 — Clone RPC: `auth.uid()` enforcement + accumulated validation failures

`clone_campaign_from_template` é `SECURITY DEFINER`. **F1 — escolha (b):** manter parâmetro `p_new_dm_user_id` para clareza no call site, mas validar no topo:

```sql
IF auth.uid() IS NULL OR auth.uid() <> p_new_dm_user_id THEN
  RAISE EXCEPTION 'forbidden: cannot clone on behalf of another user'
    USING ERRCODE = '42501';
END IF;
```

**F9 — validação acumulada:** iterar todos os template encounters, coletar `missing_monsters` por encounter, e RAISE ao fim OR retornar como JSON se validação falhar (escolhemos retornar JSON para que a UI mostre todas as falhas de uma vez):

```jsonc
// Retorno em caso de falha:
{
  "ok": false,
  "missing_monsters": [
    { "encounter_id": "uuid-1", "missing_slugs": ["vgm-kenku"] },
    { "encounter_id": "uuid-2", "missing_slugs": ["mtf-boggle", "vgm-grung"] }
  ]
}
// Retorno em caso de sucesso:
{ "ok": true, "campaign_id": "uuid", "join_code": "ABC12345" }
```

### D12 — F-BONUS: `monsters_payload` → `creatures_snapshot` no clone (choice (a))

`campaign_template_encounters.monsters_payload` é JSONB array. `encounters.creatures_snapshot` é JSONB (confirmado `lib/types/database.ts:290`). **Escolhemos (a):** copiar direto.

Razão: não há código existente que materialize combatants JIT a partir de um `creatures_snapshot` JSONB — o fluxo atual cria `combatants` na UI quando DM inicia encontro, e o DM arrasta monstros do catálogo. Deixar snapshot NULL entregaria encontros vazios. Copiando `monsters_payload → creatures_snapshot`, a UI do DM consome o snapshot como preview/source na tela de start-of-encounter (componente existente em `CampaignManagementClient` já lê `creatures_snapshot` para recap); adaptação de start-flow é escopo de Story 04-C (ver ACs).

### D13 — `sessions.is_active = false` no clone

`002_session_tables.sql:14` mostra `DEFAULT true`. INSERT sem override marca a sessão clonada como ativa — template recém-clonado apareceria "em sessão" no dashboard. **F5 correção:** INSERT explicita `is_active = false`.

### D14 — `dm_upsell:first_campaign_created` emitido do **server action**, não de SQL trigger

F27. O SQL trigger `trg_first_campaign_created_at` apenas seta `user_onboarding.first_campaign_created_at`. A emissão do evento analytics acontece no wrapper Node que chama `create_campaign_with_settings` (i.e., `app/lib/supabase/campaign-settings.ts:66`), após a RPC retornar com sucesso e antes da resposta ao client:

```ts
// campaign-settings.ts (pseudocódigo do delta)
const { campaign_id } = rpcResult;
// ... existing track of campaign:created_with_wizard ...
if (userOnboarding.first_campaign_created_at_was_null) {
  trackServerEvent("dm_upsell:first_campaign_created", {
    userId,
    properties: { source, campaignId: campaign_id }
  });
}
```

O "was null" check é feito via SELECT prévio OU retornado como flag pela trigger (ver D15). Razão: SQL triggers não podem chamar `trackServerEvent` (Node) sem LISTEN/NOTIFY complexo; manter emission no edge de API action é padrão do repo.

### D15 — `users.share_past_companions` e `first_campaign_created_at` idempotentes

Trigger de first_campaign_created_at usa **INSERT ... ON CONFLICT DO UPDATE** (F18) em vez de UPDATE puro — garante que mesmo se a row em `user_onboarding` não existir, o campo é populado.

---

## Solução Proposta

### Área 1 — CTA "Virar DM" no Player Dashboard

**Trigger:** player autenticado com:
- `users.role = 'player'` (precisa de role switch) OU
- `users.role = 'both'` E nunca criou campanha (discovery — DM latente; condicionado a `first_campaign_created_at IS NULL`)

E `sessionsPlayed >= 2` (ver Área 2).

**Componente novo:** `components/upsell/BecomeDmCta.tsx`

```typescript
type BecomeDmCtaProps = {
  userId: string;
  userRole: "player" | "both";
  sessionsPlayed: number;
  dismissalCount: number; // reusa store da Área 6 do Épico 03
  onOpenFlow: () => void;   // abre modal de onboarding (Área 3)
  onDismiss: () => void;
};
```

**Comportamento:**
- Card inline em `DashboardOverview` (acima de "Meus personagens" ou em destaque)
- Copy: "Você já jogou {sessionsPlayed} aventuras — que tal criar a sua?"
- Se `role = 'player'`: "Libere o criador de campanhas"; se `'both'`: "Descubra o lado DM do PocketDM"
- Botão primário "Criar minha campanha" → abre `BecomeDmWizard` (Área 3)
- Botão secundário "Agora não" → dismissal store (reusa Épico 03 Área 6, namespace separado `pocketdm_dm_upsell_dismissal_v1`)

---

### Área 2 — Trigger Logic: Session Counting (materialized view + wrapper)

**Migration nova:** `supabase/migrations/160_v_player_sessions_played.sql`

```sql
-- Materialized view: counts sessions played (as player, not as DM)
-- NOTE: joins through player_characters.user_id. For anon→auth upgrades,
-- Story 01-E updates this FK so pre-upgrade sessions remain counted (F12).
CREATE MATERIALIZED VIEW v_player_sessions_played AS
SELECT
  pc.user_id,
  COUNT(DISTINCT s.id) AS sessions_played,
  MAX(s.updated_at) AS last_counted_session_at
FROM player_characters pc
JOIN combatants c ON c.player_character_id = pc.id
JOIN encounters e ON e.id = c.encounter_id
JOIN sessions s ON s.id = e.session_id
WHERE pc.user_id IS NOT NULL
  AND e.is_active = false        -- only completed encounters
GROUP BY pc.user_id;

CREATE UNIQUE INDEX idx_v_player_sessions_played_user_id
  ON v_player_sessions_played(user_id);

-- F2 — Matview has no Postgres-enforced RLS. Lock direct access.
REVOKE ALL ON v_player_sessions_played FROM authenticated, anon, PUBLIC;
-- (postgres / service_role role retain access implicitly)

-- Wrapper VIEW with per-user filter. F17 — CREATE OR REPLACE idempotent.
-- F29 — `security_invoker = true` (PG15+) makes the view run with the
-- caller's privileges and makes `auth.uid()` resolve against the caller's
-- JWT context. Without this flag, a view owned by the migration role
-- evaluates `auth.uid()` under the owner's session (returns NULL outside
-- of HTTP/RPC contexts) and the per-user filter silently breaks.
CREATE OR REPLACE VIEW my_sessions_played
  WITH (security_invoker = true) AS
SELECT sessions_played, last_counted_session_at
FROM v_player_sessions_played
WHERE user_id = auth.uid();

-- Wrapper view inherits caller privileges; allow authenticated to SELECT
GRANT SELECT ON my_sessions_played TO authenticated;

-- F16 — pg_cron refresh idempotent (guarded against duplicate schedule on replay)
DELETE FROM cron.job WHERE jobname = 'refresh_v_player_sessions_played';
SELECT cron.schedule(
  'refresh_v_player_sessions_played',
  '*/15 * * * *', -- every 15 min
  $$REFRESH MATERIALIZED VIEW CONCURRENTLY v_player_sessions_played$$
);
```

**Trigger é descartado** (ver D10 — direct INSERT bypass; pg_cron é canônico). Hot-path refresh handled client-side via fallback COUNT (ver D10 / F19).

**Server action:** `lib/upsell/get-sessions-played.ts`

```typescript
"use server";

/**
 * Returns sessions_played count for current user.
 *
 * F19: Hot-path fallback — if matview is stale > 5 min AND user's
 * last_session_at > last_counted_session_at, issue a direct COUNT query
 * to catch the "just-ended-session" case for immediate CTA display.
 */
export async function getSessionsPlayed(userId: string): Promise<number> {
  const supabase = await createSupabaseServerClient(); // cookie-aware; auth.uid() set

  // Primary: cheap matview read via wrapper view (RLS via auth.uid())
  const { data, error } = await supabase
    .from("my_sessions_played")
    .select("sessions_played, last_counted_session_at")
    .maybeSingle();

  if (error) {
    // silent fallback to 0 so CTA does not show on error
    return 0;
  }

  if (!data) return 0;

  // F19 — hot-path fallback
  const { data: userRow } = await supabase
    .from("users")
    .select("last_session_at")
    .eq("id", userId)
    .single();

  const matviewStale = data.last_counted_session_at
    ? (Date.now() - new Date(data.last_counted_session_at).getTime()) > 5 * 60 * 1000
    : false;
  const userSessionNewer = userRow?.last_session_at && data.last_counted_session_at
    && new Date(userRow.last_session_at) > new Date(data.last_counted_session_at);

  if (matviewStale && userSessionNewer) {
    // Live COUNT fallback — bypass matview
    const { count } = await supabase
      .from("sessions")
      .select("id", { count: "exact", head: true })
      /* Simplified; full query joins combatants/encounters analogously to matview */;
    return count ?? data.sessions_played;
  }

  return data.sessions_played ?? 0;
}
```

Naming: **F14 — padronizado em `getSessionsPlayed` consumindo `my_sessions_played`** (verb match). O antigo `getMySessionsPlayed` foi removido da v2.

**Consumo:**
- Dashboard query adiciona `sessionsPlayed` no contexto do overview
- `BecomeDmCta` recebe via prop
- Endpoint `/api/upsell/should-show-dm-cta` (server action) retorna boolean

---

### Área 3 — DM Onboarding Tour + Wizard

**Migration nova:** `supabase/migrations/161_user_onboarding_dm.sql`

```sql
ALTER TABLE user_onboarding
  ADD COLUMN IF NOT EXISTS dm_tour_completed BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS dm_tour_step TEXT NULL,
  ADD COLUMN IF NOT EXISTS first_campaign_created_at TIMESTAMPTZ NULL;

-- F18 — Idempotent trigger using ON CONFLICT DO UPDATE (INSERT may need to create row).
CREATE OR REPLACE FUNCTION set_first_campaign_created_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO user_onboarding (user_id, first_campaign_created_at)
  VALUES (NEW.owner_id, NOW())
  ON CONFLICT (user_id) DO UPDATE
    SET first_campaign_created_at = COALESCE(
      user_onboarding.first_campaign_created_at,
      EXCLUDED.first_campaign_created_at
    );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_first_campaign_created_at ON campaigns;
CREATE TRIGGER trg_set_first_campaign_created_at
  AFTER INSERT ON campaigns
  FOR EACH ROW
  EXECUTE FUNCTION set_first_campaign_created_at();

-- Privacy opt-out for past companions graph (D8)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS share_past_companions BOOLEAN DEFAULT true;

-- F15 — users_update_own policy (005_rls_policies.sql:24) already allows
-- auth.uid() = id UPDATE, so no new policy needed. Verified.
```

**Componentes novos:**

**`components/tour/DmTourProvider.tsx`** — mirror de `PlayerHqTourProvider`. Monta steps definidos em `dm-tour-steps.ts`.

**`components/tour/dm-tour-steps.ts`** — array de 5-7 steps cobrindo: Dashboard DM → criar encontro → adicionar monstros → iniciar combate → compartilhar link com jogadores → dashboard de progresso.

**`components/upsell/BecomeDmWizard.tsx`** — modal multi-step que substitui o fluxo direto do `CampaignCreationWizard` quando o player está virando DM pela primeira vez:

```
Step 1: Boas-vindas DM ("Você virou Mestre! Vamos criar sua primeira campanha")
Step 2: Escolha tipo
  - (a) Começar do zero → redireciona para CampaignCreationWizard existente
  - (b) Usar um template → abre TemplateGallery (Área 4)
Step 3: Confirma + cria campanha (via RPC existente OU clone_campaign_from_template)
Step 4: Trigger `DmTourProvider` automaticamente
Step 5: Oferece "Convide quem jogou com você" (Área 5)
```

**Role flip:** no submit do Step 3, se `user.role = 'player'`, atualiza para `'both'` via `updateRole()`. Track evento `dm_upsell:role_upgraded_to_dm`.

**Broadcast (D9):** `updateRole()` emite `role_updated` no canal `user:{userId}`. Outras tabs re-lêem role sem tocar `session_token_id`.

---

### Área 4 — Starter Kit: Campaign Templates

**Migrations novas:**

**`supabase/migrations/162_campaign_templates.sql`**
```sql
CREATE TABLE campaign_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  game_system TEXT DEFAULT '5e',
  target_party_level INT DEFAULT 1,
  estimated_sessions INT,
  preview_image_url TEXT,
  created_by UUID REFERENCES auth.users(id),  -- admin user
  is_public BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE campaign_template_encounters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES campaign_templates(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  sort_order INT DEFAULT 0,
  monsters_payload JSONB,  -- pré-populado com monstros SRD; shape: [{slug, quantity, hp, ac}, ...]
  narrative_prompt TEXT
);

ALTER TABLE campaign_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_template_encounters ENABLE ROW LEVEL SECURITY;

-- Public read policies
CREATE POLICY campaign_templates_public_read ON campaign_templates
  FOR SELECT USING (is_public = true);
CREATE POLICY campaign_template_encounters_public_read ON campaign_template_encounters
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM campaign_templates t
            WHERE t.id = template_id AND t.is_public = true)
  );

-- F22 — Explicit NO-DELETE policy for authenticated. Admin-only writes go via service_role.
CREATE POLICY campaign_templates_no_delete ON campaign_templates
  FOR DELETE TO authenticated USING (false);
CREATE POLICY campaign_template_encounters_no_delete ON campaign_template_encounters
  FOR DELETE TO authenticated USING (false);
-- NOTE: no INSERT/UPDATE policies for authenticated — seed/admin writes use
-- service_role which bypasses RLS. Hard delete blocked.

-- D7 — SRD-enforcement trigger (rejected CHECK approach — see D7 discussion)
CREATE OR REPLACE FUNCTION validate_template_monsters_srd()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_slug TEXT;
  v_missing_slugs TEXT[] := ARRAY[]::TEXT[];
BEGIN
  IF NEW.monsters_payload IS NULL OR jsonb_typeof(NEW.monsters_payload) <> 'array' THEN
    RETURN NEW;
  END IF;
  FOR v_slug IN SELECT jsonb_array_elements(NEW.monsters_payload)->>'slug' LOOP
    IF v_slug IS NULL THEN CONTINUE; END IF;
    IF NOT EXISTS (SELECT 1 FROM monsters WHERE slug = v_slug AND is_srd = true) THEN
      v_missing_slugs := array_append(v_missing_slugs, v_slug);
    END IF;
  END LOOP;
  IF array_length(v_missing_slugs, 1) > 0 THEN
    RAISE EXCEPTION 'Template monsters must be SRD-whitelisted. Non-SRD or missing: %', v_missing_slugs
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_template_monsters_srd
  BEFORE INSERT OR UPDATE ON campaign_template_encounters
  FOR EACH ROW EXECUTE FUNCTION validate_template_monsters_srd();
```

**`supabase/migrations/163_seed_starter_templates.sql`** — seed data para 2-3 templates iniciais:
- "Taverna em Chamas" (one-shot, nível 1, 1 sessão, 3 encontros)
- "A Cripta Perdida" (mini-dungeon, nível 3, 3 sessões, 5 encontros)
- "Intro 5e" (campanha introdutória, nível 1-3, 4 sessões, tutorial de regras)

Cada template: encontros pre-populados com monstros do catálogo SRD (trigger D7 valida) + prompts narrativos.

**RPC nova:** `clone_campaign_from_template(p_template_id UUID, p_new_dm_user_id UUID) RETURNS JSON`

```sql
CREATE OR REPLACE FUNCTION clone_campaign_from_template(
  p_template_id UUID,
  p_new_dm_user_id UUID
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_template RECORD;
  v_rpc_result JSON;
  v_new_campaign_id UUID;
  v_join_code TEXT;
  v_new_session_id UUID;
  v_te RECORD;
  v_slug TEXT;
  v_missing_slugs TEXT[];
  v_failures JSONB := '[]'::jsonb;
BEGIN
  -- F1 — auth.uid() assertion (SECURITY DEFINER bypass prevention)
  IF auth.uid() IS NULL OR auth.uid() <> p_new_dm_user_id THEN
    RAISE EXCEPTION 'forbidden: cannot clone on behalf of another user'
      USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_template FROM campaign_templates
    WHERE id = p_template_id AND is_public = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'template not found or not public' USING ERRCODE = 'P0002';
  END IF;

  -- F9 — Accumulate ALL failing encounters before returning (was: return on first failure)
  FOR v_te IN
    SELECT id, monsters_payload FROM campaign_template_encounters
      WHERE template_id = p_template_id
  LOOP
    v_missing_slugs := ARRAY[]::TEXT[];
    IF v_te.monsters_payload IS NOT NULL AND jsonb_typeof(v_te.monsters_payload) = 'array' THEN
      FOR v_slug IN SELECT jsonb_array_elements(v_te.monsters_payload)->>'slug' LOOP
        IF v_slug IS NULL THEN CONTINUE; END IF;
        IF NOT EXISTS (SELECT 1 FROM monsters WHERE slug = v_slug AND is_srd = true) THEN
          v_missing_slugs := array_append(v_missing_slugs, v_slug);
        END IF;
      END LOOP;
    END IF;
    IF array_length(v_missing_slugs, 1) > 0 THEN
      v_failures := v_failures || jsonb_build_object(
        'encounter_id', v_te.id,
        'missing_slugs', to_jsonb(v_missing_slugs)
      );
    END IF;
  END LOOP;

  IF jsonb_array_length(v_failures) > 0 THEN
    RETURN json_build_object(
      'ok', false,
      'missing_monsters', v_failures
    );
  END IF;

  -- Create campaign via existing atomic RPC (assinatura real: ver 122_create_campaign_atomic.sql)
  v_rpc_result := create_campaign_with_settings(
    p_new_dm_user_id,
    v_template.name || ' (cópia)',
    v_template.description,
    v_template.game_system,
    v_template.target_party_level,
    NULL,     -- p_theme
    false     -- p_is_oneshot
  );

  v_new_campaign_id := (v_rpc_result->>'campaign_id')::UUID;
  v_join_code := v_rpc_result->>'join_code';

  -- F5 — Create a session placeholder with is_active = false (default is true!)
  INSERT INTO sessions (campaign_id, owner_id, name, is_active)
  VALUES (v_new_campaign_id, p_new_dm_user_id, v_template.name || ' — Sessão 1', false)
  RETURNING id INTO v_new_session_id;

  -- F-BONUS / D12 — Clone encounters INCLUDING creatures_snapshot (was missing in v2)
  -- Template monsters_payload → encounters.creatures_snapshot (both JSONB)
  INSERT INTO encounters (session_id, name, dm_notes, creatures_snapshot, is_active)
  SELECT
    v_new_session_id,
    te.name,
    COALESCE(te.description, '') || E'\n\n' || COALESCE(te.narrative_prompt, ''),
    te.monsters_payload,  -- F-BONUS: pre-populate snapshot
    false                 -- encounters.is_active default is false; explicit for clarity
  FROM campaign_template_encounters te
  WHERE te.template_id = p_template_id
  ORDER BY te.sort_order;

  RETURN json_build_object(
    'ok', true,
    'campaign_id', v_new_campaign_id,
    'join_code', v_join_code,
    'session_id', v_new_session_id
  );
END;
$$;

-- F11 — defense-in-depth: REVOKE PUBLIC, GRANT authenticated explicitly
REVOKE EXECUTE ON FUNCTION clone_campaign_from_template(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION clone_campaign_from_template(UUID, UUID) TO authenticated;
```

**Componentes novos:**
- `components/upsell/TemplateGallery.tsx` — lista `campaign_templates` em grid com preview, descrição, botão "Usar este"
- `components/upsell/TemplateDetailModal.tsx` — detalhes + encontros + botão "Clonar pra minha conta"

**Client flow:**
- `BecomeDmWizard` Step 2 chama `TemplateGallery`
- Seleção → `clone_campaign_from_template(id, userId)` → se `ok === true` redirect para nova campanha; se `ok === false`, modal exibe `missing_monsters` completo (lista por encontro)

---

### Área 5 — Viral Cross-invite: "Convide quem jogou com você"

**Migration nova:** `supabase/migrations/164_past_companions.sql`

**F8 — plain VIEW não suporta RLS per-row de forma robusta. F11 — explicitamente REVOKE do PUBLIC + GRANT authenticated.**

```sql
-- SECURITY DEFINER function filtered by auth.uid() — safer than VIEW for per-user graph
CREATE OR REPLACE FUNCTION get_past_companions(
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0
) RETURNS TABLE (
  companion_user_id UUID,
  companion_display_name TEXT,
  companion_avatar_url TEXT,
  sessions_together INT,
  last_campaign_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me UUID := auth.uid();
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH my_sessions AS (
    -- All sessions where the current user had a player_character in a combatant
    SELECT DISTINCT s.id AS session_id, s.campaign_id
    FROM sessions s
    JOIN encounters e ON e.session_id = s.id
    JOIN combatants c ON c.encounter_id = e.id
    JOIN player_characters pc ON pc.id = c.player_character_id
    WHERE pc.user_id = v_me
  ),
  shared_encounters AS (
    -- Sessions the current user shared with OTHER users (not themselves)
    SELECT DISTINCT
      ms.session_id,
      ms.campaign_id,
      opc.user_id AS companion_user_id,
      s.updated_at AS session_updated_at
    FROM my_sessions ms
    JOIN sessions s ON s.id = ms.session_id
    JOIN encounters e ON e.session_id = ms.session_id
    JOIN combatants oc ON oc.encounter_id = e.id
    JOIN player_characters opc ON opc.id = oc.player_character_id
    WHERE opc.user_id IS NOT NULL
      AND opc.user_id <> v_me
  )
  SELECT
    se.companion_user_id,
    u.display_name,
    u.avatar_url,
    COUNT(DISTINCT se.session_id)::INT AS sessions_together,
    -- F3 — correlated subquery: last campaign shared WITH THIS specific companion
    (
      SELECT c.name
      FROM shared_encounters se_inner
      JOIN campaigns c ON c.id = se_inner.campaign_id
      WHERE se_inner.companion_user_id = se.companion_user_id
      ORDER BY se_inner.session_updated_at DESC
      LIMIT 1
    ) AS last_campaign_name
  FROM shared_encounters se
  JOIN users u ON u.id = se.companion_user_id
  -- D8 — respect opt-out
  WHERE COALESCE(u.share_past_companions, true) = true
  GROUP BY se.companion_user_id, u.display_name, u.avatar_url
  ORDER BY sessions_together DESC, u.display_name ASC
  LIMIT p_limit OFFSET p_offset;
END;
$$;

-- F11 — defense-in-depth
REVOKE EXECUTE ON FUNCTION get_past_companions(INT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_past_companions(INT, INT) TO authenticated;
```

**Por que SECURITY DEFINER em vez de VIEW:** o review v2 notou que VIEW plain não carrega RLS per-row de forma robusta em todos os casos; function com `auth.uid()` no corpo é padrão defendível. O `SET search_path = public` previne search_path injection.

**Componente novo:** `components/upsell/InvitePastCompanions.tsx`

- Tab dentro de `InvitePlayerDialog` (aditivo, não refatoração)
- Exibe lista de ex-companheiros com checkbox
- Copy: "Você jogou {sessionsTogether}x com **{displayName}** em {lastCampaignName}"
- "Enviar convite pra selecionados" → chama endpoint bulk (ver abaixo)

**Endpoint bulk (F20):** `POST /api/campaign/[id]/invites/bulk`

```typescript
// Request body (client sends user_ids because that's what get_past_companions returns)
type Body = { invitee_user_ids: string[] };

// Server-side resolution (campaign_invites.email NOT NULL)
// 1. SELECT id, email FROM users WHERE id = ANY(invitee_user_ids)
// 2. For each row: INSERT INTO campaign_invites (campaign_id, invited_by, email, token, ...)
// 3. Users without email → skip with structured warning in response
// 4. Rate limit via existing check_rate_limit(
//      key = `campaign_invite:${userId}`,
//      max = 20,
//      window_seconds = 86400
//    )
// 5. Response: { sent: string[], skipped_no_email: string[], rate_limited: boolean }
```

**Spam / email opt-out concern:** F4 — `users.email_marketing_opt_in` **não existe** no schema atual. Mitigações aplicadas:
- Rate limit (20 invites/day/user) via `check_rate_limit` existente
- Privacy opt-out de visibilidade do graph via `share_past_companions` (D8)
- Per-user email opt-out (no sentido "não me mande convites de campanha") é **deferido** como ticket de follow-up `#player-identity-email-opt-out` (owner Winston, SLA 45 dias pós-release). Não é escopo deste épico.

**Emails de convite podem ter copy contextual:** "Olá {name}, {dmName} (que jogou com você em {lastCampaignName}) te convidou pra ser jogador na nova campanha dele".

---

### Área 6 — Analytics: Funil Player → DM

**Eventos novos** (via `trackServerEvent`, namespace colon-style `dm_upsell:*`):

| Evento | Payload | Quando |
|---|---|---|
| `dm_upsell:cta_shown` | `{ userId, sessionsPlayed, role }` | CTA Área 1 renderizado |
| `dm_upsell:cta_dismissed` | `{ userId, dismissalCount }` | Dismiss |
| `dm_upsell:cta_clicked` | `{ userId, sessionsPlayed }` | Abre wizard |
| `dm_upsell:role_upgraded_to_dm` | `{ userId, previousRole, newRole, via: 'wizard' \| 'manual' }` | `updateRole` disparado |
| `dm_upsell:template_used` | `{ userId, templateId, templateName }` | `clone_campaign_from_template` chamado com sucesso |
| `dm_upsell:first_campaign_created` | `{ userId, source: 'blank' \| 'template', campaignId }` | **F27 — emitido do server action** `campaign-settings.ts`, NÃO de SQL trigger |
| `dm_upsell:tour_completed` | `{ userId, stepsCompleted }` | DmTourProvider finish |
| `dm_upsell:invite_past_companions_sent` | `{ userId, companionCount, campaignId }` | Envio bulk |
| `dm_upsell:first_session_run` | `{ userId, campaignId, encounterId }` | Primeira vez que `encounters.is_active = true` na campanha nova |

**Dashboard admin (F6+F7):**

**F6 correção:** rota real é `app/admin/`. Criamos `app/admin/dm-upsell-funnel/page.tsx` como rota auth admin.

**F7 — escolha (b):** `MetricsDashboard.tsx` é flat scroll. Adicionamos **seção nova "DM Upsell Funnel"** no mesmo componente (seguindo pattern de `Combat Stats (30d)` — `<SectionTitle>` + grid de `MetricCard` + barras horizontais para funil). **NÃO há tab container; NÃO refatoramos o componente para tab-based.** Estimativa 04-I absorve sem extra-day.

```tsx
// Delta em MetricsDashboard.tsx (conceitual, inserido após Top Events):
{metrics.dm_upsell_funnel && (
  <>
    <SectionTitle>DM Upsell Funnel (30d)</SectionTitle>
    <div className="bg-card border border-border rounded-md p-4 space-y-2">
      {metrics.dm_upsell_funnel.map(step => /* barra horizontal padrão */)}
    </div>
  </>
)}
```

A rota dedicada `app/admin/dm-upsell-funnel/page.tsx` mostra a mesma seção isolada + cohort analysis por semana. `/api/admin/metrics` é estendido para incluir `dm_upsell_funnel` no response.

---

## Arquivos Chave

| Arquivo | Ação | Área |
|---|---|---|
| `supabase/migrations/160_v_player_sessions_played.sql` | **CRIAR** — matview + wrapper view + pg_cron idempotent | 2 |
| `supabase/migrations/161_user_onboarding_dm.sql` | **CRIAR** — colunas DM tour + trigger idempotente + share_past_companions | 3 |
| `supabase/migrations/162_campaign_templates.sql` | **CRIAR** — tabelas + trigger SRD validation + RLS no-delete | 4 |
| `supabase/migrations/163_seed_starter_templates.sql` | **CRIAR** — 3 templates iniciais | 4 |
| `supabase/migrations/164_past_companions.sql` | **CRIAR** — function SECURITY DEFINER (NÃO view plain) | 5 |
| `lib/upsell/get-sessions-played.ts` | **CRIAR** — server action com fallback hot-path (F19) | 2 |
| `lib/upsell/should-show-dm-cta.ts` | **CRIAR** — trigger logic | 1, 2 |
| `lib/upsell/clone-template.ts` | **CRIAR** — wrapper da RPC; unwrap `{ok, missing_monsters}` | 4 |
| `lib/upsell/past-companions.ts` | **CRIAR** — wrapper `get_past_companions()` | 5 |
| `lib/upsell/analytics.ts` | **CRIAR** — event helpers com namespace `dm_upsell:*` | 6 |
| `app/api/campaign/[id]/invites/bulk/route.ts` | **CRIAR** — resolve user_ids → email server-side + rate limit (F20) | 5 |
| `components/upsell/BecomeDmCta.tsx` | **CRIAR** | 1 |
| `components/upsell/BecomeDmWizard.tsx` | **CRIAR** | 3 |
| `components/upsell/TemplateGallery.tsx` | **CRIAR** | 4 |
| `components/upsell/TemplateDetailModal.tsx` | **CRIAR** | 4 |
| `components/upsell/InvitePastCompanions.tsx` | **CRIAR** — tab nova | 5 |
| `components/campaign/InvitePlayerDialog.tsx` | **MODIFICAR** — adicionar tab "Ex-companheiros" | 5 |
| `components/tour/DmTourProvider.tsx` | **CRIAR** | 3 |
| `components/tour/dm-tour-steps.ts` | **CRIAR** | 3 |
| `app/app/dashboard/page.tsx` | **MODIFICAR** — injetar `BecomeDmCta` no player view | 1 |
| `app/admin/dm-upsell-funnel/page.tsx` | **CRIAR** — dashboard admin (rota real `/app/admin/...`) | 6 |
| `components/admin/MetricsDashboard.tsx` | **MODIFICAR** — adicionar seção "DM Upsell Funnel" (F7, escolha b) | 6 |
| `app/api/admin/metrics/route.ts` | **MODIFICAR** — incluir `dm_upsell_funnel` no response | 6 |
| `app/lib/supabase/campaign-settings.ts` | **MODIFICAR** — emitir `dm_upsell:first_campaign_created` após RPC (D14/F27) | 6 |
| `lib/stores/role-store.ts` | **MODIFICAR** — broadcast `role_updated` em canal `user:{userId}` (D9) | 3 |
| `messages/pt-BR.json` + `messages/en.json` | **MODIFICAR** — adicionar namespace `dmUpsell` (next-intl stack, não public/locales) | 1, 3 |
| `tests/upsell/should-show-dm-cta.test.ts` | **CRIAR** | 1, 2 |
| `tests/upsell/clone-template.test.ts` | **CRIAR** | 4 |
| `tests/upsell/past-companions.test.ts` | **CRIAR** | 5 |
| `e2e/upsell/player-becomes-dm-full-flow.spec.ts` | **CRIAR** (Playwright) | 1-5 |
| `e2e/upsell/template-clone-first-session.spec.ts` | **CRIAR** | 4 |
| `e2e/upsell/past-companions-invite.spec.ts` | **CRIAR** | 5 |

---

## Critérios de Aceitação

### Área 1 — CTA Virar DM
- [ ] Card aparece no dashboard para `role = 'player'` ou `'both'` com `sessionsPlayed >= 2`
- [ ] Copy diferente para `'player'` vs `'both'`
- [ ] Dismissal store respeitado (reusa Épico 03 Área 6; namespace `pocketdm_dm_upsell_dismissal_v1`)
- [ ] Abre `BecomeDmWizard` no clique primário
- [ ] **Test 4 scenarios** (enumerados — F28):
  - (a) role=player, sessionsPlayed=0 → hidden
  - (b) role=player, sessionsPlayed=2, first_campaign_created_at=null → **shown**
  - (c) role=both, sessionsPlayed=0 → hidden
  - (d) role=both, sessionsPlayed=3, first_campaign_created_at=null → **shown**
  - (e) role=both, sessionsPlayed=3, first_campaign_created_at=SET → **hidden** (já virou DM)
  - (f) role=dm, sessionsPlayed=5 → hidden (já é DM puro)

### Área 2 — Session Counting
- [ ] Migration 160 aplicada; materialized view criada
- [ ] **F2 — REVOKE ALL** em `v_player_sessions_played` do authenticated/anon/PUBLIC; wrapper `my_sessions_played` é único acesso
- [ ] pg_cron refresh a cada 15 min (idempotente via DELETE-then-schedule — F16)
- [ ] Wrapper view `my_sessions_played` usa `CREATE OR REPLACE VIEW` (idempotente — F17)
- [ ] Performance: refresh CONCURRENTLY em &lt;500ms com 10k sessions (medido via EXPLAIN ANALYZE + pgbench teste)
- [ ] Fallback 0 se user não tem row (nunca jogou)
- [ ] **F19 hot-path fallback testado**: matview stale + `users.last_session_at` > `last_counted_session_at` → server action faz COUNT live
- [ ] **F12 comment presente na migration 160** documentando JOIN via `player_characters.user_id`

### Área 3 — DM Onboarding
- [ ] Migration 161 aplicada (inclui `share_past_companions BOOLEAN DEFAULT true`)
- [ ] `BecomeDmWizard` cobre 5 steps descritos
- [ ] Role flip: `role = 'player'` → `'both'` no Step 3 submit
- [ ] `DmTourProvider` inicia após criação de campanha no Step 3
- [ ] Tour salva progresso em `user_onboarding.dm_tour_step`
- [ ] Botão "Pular tour" funciona (salva `dm_tour_completed = true` sem steps)
- [ ] Help button reabre tour
- [ ] **F18** trigger `set_first_campaign_created_at` usa `INSERT ... ON CONFLICT DO UPDATE` (não silent-noop em UPDATE puro)
- [ ] **D9 / Test 10** broadcast `role_updated` no canal `user:{userId}` e `session_token_id` preservado nas outras tabs (assert direto no sessionStorage antes/depois)

### Área 4 — Starter Kit
- [ ] Migrations 154, 155 aplicadas
- [ ] 3 templates seeded com encontros e monstros (validar via query)
- [ ] **F1** RPC `clone_campaign_from_template` valida `auth.uid() = p_new_dm_user_id` no topo (caso contrário RAISE 42501)
- [ ] **F9** RPC acumula TODAS as falhas de validação (não retorna no primeiro encounter que falha) — retorno `{ok: false, missing_monsters: [{encounter_id, missing_slugs: [...]}, ...]}`
- [ ] **F5** INSERT em `sessions` explicita `is_active = false` (confirmado via query após clone)
- [ ] **F-BONUS** INSERT em `encounters` copia `template_encounter.monsters_payload → encounters.creatures_snapshot`; assert: encounter clonado retornado por SELECT tem `creatures_snapshot` não-null com array idêntico ao template
- [ ] **F11** RPC tem `REVOKE EXECUTE FROM PUBLIC; GRANT EXECUTE TO authenticated`
- [ ] **D7** trigger `validate_template_monsters_srd` rejeita INSERT com slug não-SRD (SQLSTATE 23514)
- [ ] **F22** policy `campaign_templates_no_delete ... USING (false)` aplicada; hard delete falha via authenticated role
- [ ] `TemplateGallery` lista templates com preview
- [ ] `TemplateDetailModal` exibe encontros do template
- [ ] Clone redirect para nova campanha funcional
- [ ] Clone flow com 0 encounters (F21 reescrito): template vazio → campanha criada + session row + empty encounters set; UI não quebra

### Área 5 — Viral Invite
- [ ] Migration 164 aplicada; `get_past_companions()` retorna rows corretos via `auth.uid()`
- [ ] **F3** `last_campaign_name` correlacionado com `companion_user_id` — teste 2 companheiros distintos retornam valores diferentes quando últimas sessões compartilhadas diferem
- [ ] **F8** VIEW plain foi rejeitada em favor de SECURITY DEFINER function (documentado em D7 e Área 5)
- [ ] **F11** `REVOKE EXECUTE ... FROM PUBLIC; GRANT EXECUTE ... TO authenticated` aplicado
- [ ] **D8** companion com `share_past_companions = false` é FILTRADO do resultado
- [ ] Tab nova em `InvitePlayerDialog` aparece só se user tem companions
- [ ] **F20** bulk endpoint resolve `user_ids → email` server-side antes de INSERT `campaign_invites` (email NOT NULL schema)
- [ ] Bulk endpoint usa `check_rate_limit` existente (20/day/user)
- [ ] Email de convite inclui contexto ("jogou com você em {lastCampaignName}")
- [ ] **F26 glossário** — termo "Ex-companheiros" definido como "user com pelo menos **1 sessão** em comum" (match SQL `COUNT(DISTINCT s.id)`)

### Área 6 — Analytics
- [ ] 9 eventos de funil emitidos via `trackServerEvent` com namespace `dm_upsell:*` (colon-style, não underscore)
- [ ] **F6** rota admin criada em `app/admin/dm-upsell-funnel/page.tsx` (NÃO `app/app/admin/...`)
- [ ] **F7** `MetricsDashboard.tsx` ganha nova seção "DM Upsell Funnel" (mesmo pattern de Combat Stats — `<SectionTitle>` + barras horizontais); NÃO há tab container
- [ ] **D14 / F27** `dm_upsell:first_campaign_created` emitido do server action `campaign-settings.ts` após a RPC retornar; NÃO via SQL trigger
- [ ] Cohort query retorna dados (mesmo zerado inicialmente)

### Integração
- [ ] `rtk tsc --noEmit` limpo
- [ ] **F25** `rtk next lint` limpo (match pattern de epic-01)
- [ ] **Parity check:** guest e anon não veem CTAs (só auth)
- [ ] Role flip não invalida sessão/reconnection (match spec-resilient-reconnection §4)
- [ ] i18n PT-BR + EN via **next-intl `messages/{en,pt-BR}.json`** (HANDOFF §3 item 4 — NÃO `next-i18next`)
- [ ] **Regras imutáveis CLAUDE.md:** ver seção dedicada

---

## Testing Contract

| Área | Unit | Integration | E2E |
|---|---|---|---|
| 1 — CTA | RTL + 6 scenarios Test 4 (F28) | — | `player-becomes-dm-full-flow.spec.ts` |
| 2 — Session counting | SQL query validation | Matview refresh + wrapper view + hot-path fallback | — |
| 3 — Onboarding | Wizard RTL + role flip + broadcast (Test 10) | Tour transitions | Incluído em full-flow |
| 4 — Templates | RTL gallery + modal | Clone RPC correctness incl. F9, F-BONUS, F5, F1 | `template-clone-first-session.spec.ts` |
| 5 — Past companions | Function query + RTL | Bulk invite endpoint + rate limit + opt-out | `past-companions-invite.spec.ts` |
| 6 — Analytics | Event emission (9) | Dashboard query + MetricsDashboard section | — |

**Testes obrigatórios (revistos v3):**

1. **E2E full flow:** player com 2 sessões jogadas → vê CTA → abre wizard → escolhe template → role flipa para `'both'` → campanha criada → tour inicia → convida ex-companion
2. **E2E template clone:** DM novo clona "Taverna em Chamas" → campanha tem 3 encontros → `encounters.creatures_snapshot` populado com monsters_payload do template (F-BONUS) → DM pode iniciar 1º encontro com monstros SRD pré-populados
3. **E2E past companions:** user já jogou com A e B em campanhas diferentes → ao virar DM, vê ambos na lista → `last_campaign_name` diferente para A vs B (F3) → envia convite → A e B recebem email contextual via endpoint bulk (F20)
4. **Unit: should-show-dm-cta lógica** — **6 cenários enumerados (F28):** (a)–(f) conforme Área 1 ACs
5. **SQL: get_past_companions RLS** — user A lê só próprias rows via `auth.uid()` (tentativa de passar user_id de outro via anything retorna do proprio token); tentativa via anon ou PUBLIC → permission denied (F11)
6. **Matview race:** 2 encontros encerram em 100ms de diferença → pg_cron próxima rodada reflete ambos sem duplicar (refresh CONCURRENTLY é idempotent)
7. **Tour interruption:** user inicia tour, fecha aba no meio → progresso salvo em `dm_tour_step` → reabre dashboard, tour retoma
8. **SRD enforcement (D7):** INSERT em `campaign_template_encounters` com slug fake (`"slug": "vgm-kenku"`) falha com SQLSTATE 23514
9. **Clone with 0 encounters (F21 reescrito):** template sem encounters → `clone_campaign_from_template` retorna `{ok: true, campaign_id, session_id}` sem erro; `encounters` table tem 0 rows associadas ao session_id — UI exibe estado vazio graciosamente
10. **Role flip broadcast + session preservation (D9):** user com 2 tabs; tab A chama `updateRole('player', 'both')` → tab B recebe broadcast `role_updated`, re-lê role; **sessionStorage de `session_token_id` idêntico em ambas as tabs antes e depois**
11. **Pre-upgrade sessions picked up (F12):** anon player com 3 sessões → upgrade via Story 01-E (`player_characters.user_id` atualizado para novo UUID auth) → pg_cron refresh → matview reflete sessions_played = 3 para user auth
12. **Opt-out filtering (D8):** user B com `share_past_companions = false` → `get_past_companions()` chamada por user A NÃO retorna user B (mesmo tendo sessão em comum)
13. **F1 escalation test:** user X chama RPC `clone_campaign_from_template(template_id, user_Y_id)` → RAISE 42501 forbidden
14. **F9 accumulated failures:** template com 3 encontros, 2 deles com slug não-SRD → retorno único `{ok: false, missing_monsters: [{encounter_id_1, missing_slugs}, {encounter_id_2, missing_slugs}]}` (não return-on-first)
15. **F-BONUS creatures_snapshot:** clone template X → SELECT creatures_snapshot FROM encounters WHERE session_id = cloned_session → JSONB array idêntico ao `monsters_payload` do template

---

## Story Sequencing (DAG)

```
Story 04-A: Migrations 160-164 + types update
   └─ bloqueia todas as outras

Story 04-A4 (sub-teste pós-migration): past_companions correctness
   └─ Valida F3 (last_campaign_name correlacionado) + F12 (JOIN pre-upgrade)
   └─ depende de 04-A

Story 04-B: Session counting lib + hot-path fallback (Área 2)
   └─ depende de 04-A

Story 04-C: Template seed + RPC clone (Área 4 primitives) INCL. F1, F5, F9, F-BONUS
   └─ depende de 04-A
   └─ PARALELO a 04-B

Story 04-D: Past companions function + lib + bulk invite endpoint (Área 5 primitives)
   └─ depende de 04-A
   └─ PARALELO a 04-B, 04-C

Story 04-E: BecomeDmCta component + dashboard integration (Área 1)
   └─ depende de 04-B
   └─ depende de Épicos 02, 03 (dashboard base + dismissal store)

Story 04-F: BecomeDmWizard + role flip broadcast + DmTourProvider (Área 3)
   └─ depende de 04-E
   └─ consome 04-C (templates)

Story 04-G: TemplateGallery + TemplateDetailModal UI (Área 4 UI)
   └─ depende de 04-C, 04-F

Story 04-H: InvitePastCompanions component + tab em InvitePlayerDialog (Área 5 UI)
   └─ depende de 04-D, 04-F

Story 04-I: Analytics events + MetricsDashboard section + admin route page
   └─ F7 escolha (b): ADD SECTION ao MetricsDashboard, não tab
   └─ depende de 04-E a 04-H (precisa dos eventos acontecendo)

Story 04-J: E2E Playwright suite completa
   └─ depende de 04-E a 04-I

Story 04-K: i18n (`messages/pt-BR.json` + `messages/en.json`, namespace `dmUpsell`) + copy review da Paige
   └─ paralelo a E-J (desde que Paige tenha copy)
```

**Distribuição por sprint:**
- **Sprint 1:** 04-A, 04-A4, 04-B, 04-C, 04-D (fundação)
- **Sprint 2:** 04-E, 04-F, 04-G, 04-K
- **Sprint 3:** 04-H, 04-I, 04-J

---

## Riscos Documentados

| Risco | Severidade | Mitigação |
|---|---|---|
| **Épico 04 é o MAIOR (35-45 dias) e atrasa big-bang release** | **Alta** | Flag como maior risco da iniciativa; revisar progresso a cada sprint; última carta: cortar Área 4 (templates) ou Área 5 (viral) se apertar |
| Matview refresh em trigger trava writes em campanhas muito ativas (v2 proposition) | Resolvida | **pg_cron é DEFAULT (D10)**; trigger refresh foi descartado; hot-path via fallback COUNT no server action (F19) |
| Template seed vira "content liability" (copyright de encontros, NPCs) | Média | Templates usam só monstros SRD (CC-BY-4.0) **enforced por trigger D7**; narrativas originais; Paige e Dani revisam conteúdo antes de seed |
| `past_companions` expõe relacionamentos entre users (privacy) | Média | `users.share_past_companions` opt-out (D8); `display_name` e `avatar_url` já públicos; SECURITY DEFINER function restringe a `auth.uid()` |
| Role flip de `'player'` para `'both'` confunde sessão em andamento | Baixa | Broadcast D9 em canal `user:{userId}` preservando `session_token_id`; teste de reconnection após flip |
| Tour de DM fica desatualizado quando UI de DM muda | Média | Tour steps referenciam seletores CSS estáveis (`data-tour-target`); Paige documenta processo de manutenção |
| Viral invite spam | Média | Rate limit existente `check_rate_limit` 20/day/user; opt-out do graph via D8; per-user email opt-out é follow-up ticket (F4) |
| Analytics stack só-Supabase dificulta análise em escala | Baixa | OK para MVP; trocar para PostHog/Mixpanel é outro épico |
| Subscription gate não existe hoje → Área 4 templates pode virar foot-in-door de paywall futuro e frustrar usuários | Baixa | Registrado; versão gratuita dos templates é suficiente; monetização futura cria NOVOS templates premium em vez de gate nos existentes |
| Matview stale missing "just-ended-session" CTA window | Média | Hot-path fallback COUNT (F19 / D10) quando `last_session_at > last_counted_session_at` |
| **Privilege escalation via clone RPC (F1)** | Resolvida | `auth.uid() = p_new_dm_user_id` assertion no topo; test 13 valida |
| **Matview RLS bypass (F2)** | Resolvida | `REVOKE ALL ... FROM authenticated, anon, PUBLIC` no matview; wrapper VIEW único acesso público |
| **Clone drops monsters (F-BONUS)** | Resolvida | `monsters_payload → creatures_snapshot` copiado explicitamente; test 15 valida |

---

## Regras Imutáveis (CLAUDE.md)

- **Combat Parity Rule:** CTA só aparece para auth (não guest, não anon). Nenhuma mudança em experiência de combate — áreas deste épico tocam dashboard + wizards + admin, não combate.
- **Resilient Reconnection Rule:** role flip e tour NÃO invalidam sessão. `session_token_id` preservado. Broadcast de `role_updated` viaja em canal `user:{userId}` (D9) — NÃO em `campaign:*` ou `session:*`. Test 10 cobre assert direto no storage.
- **SRD Compliance:** templates usam só monstros SRD (whitelist `data/srd/srd-monster-whitelist.json` — **singular**, F23). Trigger `validate_template_monsters_srd` (D7) enforça em runtime — não é "Paige revisa". Narrativas originais (IP próprio). Nada de livros WotC não-SRD.
- **SEO Canonical:** `/app/admin/dm-upsell-funnel` tem `noindex` (match layout de `/app/admin/*` existente). Nenhuma rota pública nova.

---

## Dependências

### De entrada
- Épico 01 — `users` enriquecido; Story 01-E atualiza `player_characters.user_id` em anon→auth upgrade (suporta F12)
- Épico 02 — dashboard enriquecido (base do card)
- Épico 03 — dismissal store pattern (Área 6 do 03); analytics stack `trackServerEvent` colon-style

### De saída
- Nenhum épico subsequente nesta iniciativa (Épico 04 é terminal)
- Futuros épicos de growth podem consumir `v_player_sessions_played` (via wrapper view) e `get_past_companions()`

---

## Estimativa de Esforço

| Área | Complexidade | Esforço |
|---|---|---|
| Área 2 — Session counting (matview + wrapper + hot-path fallback + pg_cron idempotent) | Média | 2 dias |
| Área 1 — CTA | Baixa-Média | 1.5 dias |
| Área 3 — Onboarding wizard + tour + broadcast | **Alta** | 4-5 dias |
| Área 4 — Templates (tabelas + seed + trigger SRD + RPC clone com F1/F5/F9/F-BONUS + UI) | **Alta** | 6-7 dias |
| Área 5 — Past companions (function + bulk endpoint + rate limit + opt-out + UI) | Média | 3-4 dias |
| Área 6 — Analytics events + MetricsDashboard section + admin route | Média | 2-3 dias |
| i18n + copy (Paige) — next-intl stack | Baixa | 1 dia |
| Testes unit + integration (15 testes obrigatórios + SQL RLS validations) | Média-Alta | 3-4 dias |
| E2E (3 specs complexos + cenários de F-BONUS, F3, F12, D9) | Alta | 3-4 dias |
| Review + polish + acessibilidade | Média | 2 dias |
| **Total soma parcial** | | **27.5-35.5 dias úteis** |
| **Buffer (review, context switching, iteration)** | | **+7.5-9.5 dias** (F24 — review pickup, re-pair em findings, context switch entre agentes, paging Sally/Winston) |
| **Total estimado** | | **35-45 dias úteis (~3-4 sprints)** |

**F24 — justificativa do buffer:** a soma linear das áreas é ~36 dias; header 35-45 inclui 9-day buffer compreendendo (a) review + iteration (review adversarial de cada area dá 1-2 dias cada), (b) context-switching overhead entre agentes (John/Sally/Winston paralelos), (c) paging de adjusts (e.g., seeding de templates reprovado pela Paige). Sem esse buffer, a probabilidade de bater 32 dias reais é baixa.

---

## Próximos Passos

1. Revisão deste épico com Dani_ + time (GO / AJUSTAR)
2. Aguardar Épicos 01, 02, 03 em staging antes de começar stories de código
3. Dani_ aprova conteúdo dos 3 templates (narrativa, nome, tipo) — Paige redige junto
4. Sally produz mockups do `BecomeDmCta`, `BecomeDmWizard` (5 steps), `TemplateGallery`
5. Bob quebra em stories conforme DAG
6. Winston valida o approach SECURITY DEFINER function vs view para past_companions
7. **Review do risco principal:** este épico é o maior — se apertar cronograma, cortar Área 4 (templates) primeiro; Área 5 segundo; Áreas 1-3 são must-have do valor visível

---

## Changelog

### v3 (2026-04-19, pós adversarial review de v2)

Review encontrou 7 🔴 críticos + 7 🟠 altos + 8 🟡 médios + 6 🟢 baixos + 1 gap funcional (F-BONUS). **Todos endereçados.**

**🔴 Críticos (7 + F-BONUS) resolvidos:**

| # | Issue | Resolução v3 |
|---|---|---|
| F1 | Privilege escalation em `clone_campaign_from_template` (SECURITY DEFINER sem auth check) | Escolha (b): manter param `p_new_dm_user_id`, adicionar `IF auth.uid() <> p_new_dm_user_id THEN RAISE 42501` no topo. D11 + Test 13 |
| F2 | Matview RLS gap (Postgres não enforça RLS em matview) | Migration 160 adiciona `REVOKE ALL ON v_player_sessions_played FROM authenticated, anon, PUBLIC`; wrapper `my_sessions_played` único acesso público. Documentado em D10 |
| F3 | `last_campaign_name` decorrelation bug (subquery fixed-per-row em vez de per-companion) | SQL reescrito em Área 5 com subquery correlacionada `WHERE se_inner.companion_user_id = se.companion_user_id`. AC Story 04-A4 valida 2 companions retornam valores diferentes |
| F4 | `users.email_marketing_opt_in` fiction | Escolha (b): coluna **não** existe; mitigação é rate_limits existente (`check_rate_limit`) + opt-out do graph (share_past_companions). Per-user email opt-out é follow-up ticket |
| F5 | `sessions.is_active DEFAULT true` trap (clone aparecia live) | D13 + RPC INSERT explicita `is_active = false`. Migration e AC Área 4 |
| F6 | Admin routes wrong (`/app/app/admin/*` não existe) | Corrigido em todos os lugares para `app/admin/dm-upsell-funnel/page.tsx`; verificação via `ls app/admin/` vs `ls app/app/admin/` |
| F7 | MetricsDashboard tab refactor unbudgeted | Escolha (b): adicionar **nova seção** "DM Upsell Funnel" ao MetricsDashboard flat scroll (pattern `<SectionTitle>` + grid), NÃO tab. Estimativa 04-I absorve |
| F-BONUS | Clone RPC drops `monsters_payload` → templates ficam com encontros vazios | Escolha (a): D12 — copiar `template_encounter.monsters_payload → encounters.creatures_snapshot` (ambos JSONB, confirmed `lib/types/database.ts:290`). Test 15 valida |

**🟠 Altos (7) resolvidos:**

| # | Issue | Resolução v3 |
|---|---|---|
| F8 | CHECK-constraint sample inválido em D7 (`(x,y) IN (SELECT ...)` não suportado) | D7 reescrito: approach CHECK explicitamente rejeitado ("❌ NÃO IMPLEMENTAR" com comentário explicando o bug); trigger `validate_template_monsters_srd` é a solução |
| F9 | Clone RPC retorna no primeiro encounter falho | RPC reescrito para acumular `v_failures JSONB` em loop e retornar `{ok: false, missing_monsters: [{encounter_id, missing_slugs}, ...]}`. Test 14 valida |
| F10 | D7 text/code drift (`monster_ref` vs `monsters_payload`) | D7 reescrito usando `monsters_payload` consistentemente; shape documentado `[{slug, quantity, hp, ac}, ...]` |
| F11 | Functions sem REVOKE EXECUTE explícito | Migrations 162 e 164: `REVOKE EXECUTE FROM PUBLIC; GRANT EXECUTE TO authenticated` em `clone_campaign_from_template` e `get_past_companions` |
| F12 | Matview JOIN via `player_characters.user_id` sem comment de upgrade path | Migration 160 tem comment SQL explícito; Test 11 cobre cenário pre-upgrade via Story 01-E |
| F13 | Role flip broadcast contract thin | D9 expandido: canal `user:{userId}`, event `role_updated`, payload spec completo; listeners re-lêem role sem tocar `session_token_id`; Test 10 cabeado ao código |
| F14 | Naming drift `getMySessionsPlayed` vs `my_sessions_played` | Padronizado: server action `getSessionsPlayed` lê `my_sessions_played` (wrapper view). V2 menção removida |

**🟡 Médios (8) resolvidos:**

| # | Issue | Resolução v3 |
|---|---|---|
| F15 | `users` RLS para `share_past_companions` self-update | Verificado: `users_update_own ON users FOR UPDATE USING (auth.uid() = id)` existe em `005_rls_policies.sql:24` — já cobre. Nenhuma policy nova necessária, documentado em migration 161 |
| F16 | `cron.schedule` não-idempotent | Migration 160 guarda com `DELETE FROM cron.job WHERE jobname = 'refresh_v_player_sessions_played'` antes de `cron.schedule` |
| F17 | `CREATE VIEW` não-idempotent | `CREATE OR REPLACE VIEW my_sessions_played` (migration 160) |
| F18 | `first_campaign_created_at` trigger silent no-op | Trigger reescrito: `INSERT INTO user_onboarding (user_id, first_campaign_created_at) VALUES (NEW.owner_id, NOW()) ON CONFLICT (user_id) DO UPDATE SET ... = COALESCE(...)` |
| F19 | 15-min pg_cron miss "just-ended-session" CTA | Server action `getSessionsPlayed` detecta matview stale (`> 5 min`) AND `users.last_session_at > last_counted_session_at` → COUNT live fallback. D10 escolheu abordagem simples, não pg_notify/edge-function |
| F20 | Bulk invite schema mismatch (`email NOT NULL`) | Endpoint `/api/campaign/[id]/invites/bulk` resolve `user_ids → email` server-side via `users` lookup; usa `check_rate_limit` (20/day); users sem email → skip with warning |
| F21 | Test 9 "orphan encounter" nonsensical (FK CASCADE) | Reescrito: "Clone with 0 encounters creates campaign + session row + empty encounters set gracefully" |
| F22 | Hard delete RLS implícita | Migration 162 tem policy explícita `campaign_templates_no_delete ... USING (false)` + análogo para template_encounters |

**🟢 Baixos (6) resolvidos:**

| # | Issue | Resolução v3 |
|---|---|---|
| F23 | Whitelist filename (singular) | Corrigido em CLAUDE.md reference + SRD Compliance section — `srd-monster-whitelist.json` |
| F24 | Estimate math (parcial ~36, header 35-45 sem explicar buffer) | Tabela de estimativa tem buffer linha explícita com justificativa (review, context switching, iteration entre agentes, Sally/Winston paging) |
| F25 | ESLint/next lint ausente | Integração AC ganhou `rtk next lint limpo` (match epic-01) |
| F26 | Glossário "Ex-companheiros" dizia "encounter em comum" em vez de "sessão em comum" | AC Área 5 documenta "pelo menos 1 sessão em comum" match SQL `COUNT(DISTINCT s.id)` |
| F27 | `dm_upsell:first_campaign_created` via SQL trigger | D14: emitido do server action `campaign-settings.ts` após a RPC retornar (SQL triggers não podem chamar Node). Trigger SQL apenas popula `user_onboarding.first_campaign_created_at` |
| F28 | Test 4 ambiguidade | Enumerados 6 cenários (a)-(f) em Área 1 ACs; explicitamente cobre "3 sessions played AND first_campaign_created_at set → hidden" |

**Mudanças de numeração:** v2 usava 149-153 (antes de `149_player_notes_visibility.sql` e `150_fix_campaign_notes_default_visibility.sql` serem mergeados em main). v3 usa **160-164** (buffer zone — 152 e 153 já tomados por entity-graph; 151 é hardening) (152 ocupada por entity-graph, 151 é hardening do search_path; ver changelog v3.2) (migration 151 é hardening standalone do search_path do 122; ver changelog v3.1) — próximo bloco livre após 150 (verificado via `ls supabase/migrations/ | tail`).

**Arquitetural flag (não-fix):** SECURITY DEFINER em `get_past_companions` é mais defendível que VIEW plain para per-user graph, mas **expõe ONE step** de potential search_path hijack se extensions adicionarem tabelas `public.users`/`public.campaigns` shadowing. Mitigação: `SET search_path = public` no function body. Recomendação de review recorrente em schema audits (já política).

### v3.1 (2026-04-20, party-mode re-review pré-dev)

Re-revisão adversarial antes de despachar Wave 1 pegou 2 gaps críticos que passaram pela v3:

| # | Issue | Resolução v3.1 |
|---|---|---|
| F29 | Wrapper view `my_sessions_played` sem `security_invoker = true` | View declarada com `WITH (security_invoker = true)` (PG15+); sem isso, `auth.uid()` resolve no contexto do owner da migration e filtro per-user silenciosamente retorna NULL. Área 2 atualizada. |
| F30 | Chained SECURITY DEFINER entre `clone_campaign_from_template` → `create_campaign_with_settings` (migration 122) sem `SET search_path` | **Nova migration 151 standalone** (`151_harden_create_campaign_search_path.sql`) aplica `ALTER FUNCTION create_campaign_with_settings(...) SET search_path = public, pg_temp`. Epic 04 migrations shiftaram de 151-155 para **152-156**. Prerequisite de Story 04-A1. |

**Impacto na sequência:** Story 04-A1 ganha pre-req implícito de migration 151 em staging. Sem mudança nos stories IDs (04-A1..A5). Assinatura de `create_campaign_with_settings` validada contra `122_create_campaign_atomic.sql` (match exato).

### v2 (2026-04-19)

Primeira versão pós-correção do HANDOFF §6 (schema errors — `encounters.campaign_id` fiction, `create_campaign_with_settings` signature, matview race). Não passou review adversarial.

### v1 (2026-04-19)

Draft inicial do Party Mode.
