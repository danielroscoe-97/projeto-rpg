# EPIC 04: Player-as-DM Upsell

> **Status:** Pronto para revisão
> **Prioridade:** Média-Alta (loop viral de longo prazo — H2)
> **Origem:** Party Mode 2026-04-19
> **Parent epic:** `docs/EPIC-player-identity-continuity.md` (a ser criado)
> **Sprint estimate:** ~3-4 sprints (18-28 dias úteis — o maior dos 4 épicos)
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
- Glossário ubíquo com termos de identity

### Do Épico 02
- Dashboard do player enriquecido (base visual para CTA de upsell)
- `CharacterPickerModal`, `AuthModal` (para fluxos relacionados)

### Do Épico 03
- Dashboard de funil (`/app/admin/conversion-funnel`)
- Stack de analytics consolidada (eventos `conversion_*` estabelecem padrão)

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

## Estado Atual (verificado 2026-04-19)

### O que JÁ EXISTE

| Componente | Onde | Estado |
|---|---|---|
| `CampaignCreationWizard` | `app/components/campaign/CampaignCreationWizard.tsx:38-96` | 3 steps maduro (name → type+party_level → confirm) |
| RPC `create_campaign_with_settings()` | `app/lib/supabase/campaign-settings.ts:20-73` | Atomic: campaign + settings + DM membership |
| `users.role` field | migration 022 — valores `'player'`, `'dm'`, `'both'` (default `'both'`) | Funcional |
| `role-store.ts` Zustand | `lib/stores/role-store.ts:1-50` | Tem `loadRole()` + `updateRole()` |
| `user_onboarding` table | migration 046 + 110 — campos `wizard_completed`, `dashboard_tour_completed`, `player_hq_tour_completed` | Tracking de tour existe só para player |
| `PlayerHqTourProvider` | `components/tour/PlayerHqTourProvider.tsx` + `player-hq-tour-steps.ts` | Tour maduro no lado player |
| `InvitePlayerDialog` (tabs link + email) | `components/campaign/InvitePlayerDialog.tsx:41-100` | Maduro; Resend integrado |
| `campaign_invites` + RLS | migration 025 | Pronto para viral loop |
| `analytics_events` table + `trackServerEvent` | migration 013 + `lib/analytics/track-server.ts:46-67` | Analytics básico funcionando |
| `CampaignOnboardingChecklist` | `components/campaign/CampaignOnboardingChecklist.tsx:1-60` | Lista de setup da campanha; NÃO é tour |
| Monster presets RPC | `lib/supabase/presets.ts:14-46` | Fetch/create/update/delete |
| Evento `campaign:created_with_wizard` | `campaign-settings.ts:66` (já trackeado) | Reusável |
| `subscriptions` table | migration 017 — planos `free`, `pro`, `mesa` | **SEM gates em criação de campanha** — todo mundo cria de graça |

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
| Dashboard admin com taxa de conversão player→DM | Área 6 |

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

Não reinventar invite. Lista de ex-companheiros é UI nova; o envio em si reusa `/api/campaign/[id]/invites`. Copy é contextual ("Você jogou com Lucas em Phandelver — convide-o!").

### D5 — DM Onboarding é **opcional e interruptível**

Tour de DM abre na primeira criação de campanha, mas:
- Botão "Pular tour" visível
- Permite voltar via help button (padrão do `DashboardTourHelpButton`)
- Progresso salvo em `user_onboarding.dm_tour_completed` e `user_onboarding.dm_tour_step`

### D6 — Nenhuma cobrança, sem gates de subscription

`subscriptions.plan = 'free'` já cria campanhas ilimitadas. Este épico **não** adiciona paywall. Se futuro escopo quiser monetizar DM features, é outra iniciativa.

---

## Solução Proposta

### Área 1 — CTA "Virar DM" no Player Dashboard

**Trigger:** player autenticado com:
- `users.role = 'player'` (precisa de role switch) OU
- `users.role = 'both'` E nunca criou campanha (discovery — DM latente)

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
- Botão secundário "Agora não" → dismissal store (reusa Épico 03 Área 6, namespace separado)

---

### Área 2 — Trigger Logic: Session Counting

**Migration nova:** `supabase/migrations/145_v_player_sessions_played.sql`

```sql
-- View materializada (refresh em trigger ou cron)
CREATE MATERIALIZED VIEW v_player_sessions_played AS
SELECT 
  pc.user_id,
  COUNT(DISTINCT s.id) AS sessions_played
FROM player_characters pc
JOIN combatants c ON c.player_character_id = pc.id
JOIN encounters e ON e.id = c.encounter_id
JOIN sessions s ON s.id = e.session_id
WHERE pc.user_id IS NOT NULL
  AND e.is_active = false  -- só sessões concluídas
GROUP BY pc.user_id;

CREATE UNIQUE INDEX idx_v_player_sessions_played_user_id 
  ON v_player_sessions_played(user_id);

-- Refresh automatizado: trigger em encounters.is_active = false (encerramento)
CREATE OR REPLACE FUNCTION refresh_v_player_sessions_played()
RETURNS trigger AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY v_player_sessions_played;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_refresh_v_player_sessions_played
AFTER UPDATE OF is_active ON encounters
FOR EACH ROW
WHEN (NEW.is_active = false AND OLD.is_active = true)
EXECUTE FUNCTION refresh_v_player_sessions_played();
```

**Alternativa mais leve:** se triggered-refresh for caro, fazer refresh em cron pg_cron a cada 15 min.

**Server action:** `lib/upsell/get-sessions-played.ts`

```typescript
export async function getPlayerSessionsPlayed(userId: string): Promise<number>
```

Consulta `v_player_sessions_played` com fallback 0 se row não existe.

**Consumo:**
- Dashboard query adiciona `sessionsPlayed` no contexto do overview
- `BecomeDmCta` recebe via prop
- Endpoint `/api/upsell/should-show-dm-cta` (server action) retorna boolean

---

### Área 3 — DM Onboarding Tour + Wizard

**Migration nova:** `supabase/migrations/146_user_onboarding_dm.sql`

```sql
ALTER TABLE user_onboarding
  ADD COLUMN dm_tour_completed BOOLEAN DEFAULT false,
  ADD COLUMN dm_tour_step TEXT NULL,
  ADD COLUMN first_campaign_created_at TIMESTAMPTZ NULL;
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
Step 3: Confirma + cria campanha (via RPC existente)
Step 4: Trigger `DmTourProvider` automaticamente
Step 5: Oferece "Convide quem jogou com você" (Área 5)
```

**Role flip:** no submit do Step 3, se `user.role = 'player'`, atualiza para `'both'` via `updateRole()`. Track evento `player:role_upgraded_to_dm`.

---

### Área 4 — Starter Kit: Campaign Templates

**Migrations novas:**

**`supabase/migrations/147_campaign_templates.sql`**
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
  monsters_payload JSONB,  -- pré-populado com monstros SRD
  narrative_prompt TEXT
);

-- RLS: todo mundo lê templates públicos
CREATE POLICY campaign_templates_public_read ON campaign_templates
  FOR SELECT USING (is_public = true);

-- Admin-only write (via service role na seed)
```

**`supabase/migrations/148_seed_starter_templates.sql`** — seed data para 2-3 templates iniciais:
- "Taverna em Chamas" (one-shot, nível 1, 1 sessão, 3 encontros)
- "A Cripta Perdida" (mini-dungeon, nível 3, 3 sessões, 5 encontros)
- "Intro 5e" (campanha introdutória, nível 1-3, 4 sessões, tutorial de regras)

Cada template: encontros pre-populados com monstros do catálogo SRD + prompts narrativos.

**RPC nova:** `clone_campaign_from_template(template_id UUID, new_dm_user_id UUID) RETURNS UUID`

```sql
CREATE FUNCTION clone_campaign_from_template(
  p_template_id UUID,
  p_new_dm_user_id UUID
) RETURNS UUID AS $$
DECLARE
  v_new_campaign_id UUID;
BEGIN
  -- Cria campanha nova usando create_campaign_with_settings
  SELECT create_campaign_with_settings(
    p_new_dm_user_id,
    (SELECT name || ' (cópia)' FROM campaign_templates WHERE id = p_template_id),
    (SELECT description FROM campaign_templates WHERE id = p_template_id),
    (SELECT game_system FROM campaign_templates WHERE id = p_template_id),
    (SELECT target_party_level FROM campaign_templates WHERE id = p_template_id),
    'long_campaign' -- ou lê do template
  ) INTO v_new_campaign_id;

  -- Clona encontros
  INSERT INTO encounters (campaign_id, name, description, sort_order)
  SELECT v_new_campaign_id, name, description, sort_order
  FROM campaign_template_encounters
  WHERE template_id = p_template_id;

  -- (Combatants por encontro serão instanciados quando o DM iniciar cada encontro)

  RETURN v_new_campaign_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Componentes novos:**
- `components/upsell/TemplateGallery.tsx` — lista `campaign_templates` em grid com preview, descrição, botão "Usar este"
- `components/upsell/TemplateDetailModal.tsx` — detalhes + encontros + botão "Clonar pra minha conta"

**Client flow:**
- `BecomeDmWizard` Step 2 chama `TemplateGallery`
- Seleção → `clone_campaign_from_template(id, userId)` → redirect para a nova campanha

---

### Área 5 — Viral Cross-invite: "Convide quem jogou com você"

**View nova:** `v_past_companions(for_user_id)` — SQL query/view:

```sql
CREATE VIEW v_past_companions AS
SELECT DISTINCT
  my.user_id AS for_user_id,
  others.user_id AS companion_user_id,
  u.display_name AS companion_display_name,
  u.avatar_url AS companion_avatar_url,
  COUNT(DISTINCT s.id) AS sessions_together
FROM combatants my
JOIN encounters e ON e.id = my.encounter_id
JOIN sessions s ON s.id = e.session_id
JOIN combatants others ON others.encounter_id = e.id AND others.id != my.id
JOIN player_characters opc ON opc.id = others.player_character_id
JOIN users u ON u.id = opc.user_id
WHERE my.player_character_id IN (
  SELECT id FROM player_characters WHERE user_id IS NOT NULL
)
AND opc.user_id IS NOT NULL
AND opc.user_id != (SELECT pc.user_id FROM player_characters pc WHERE pc.id = my.player_character_id)
GROUP BY my.user_id, others.user_id, u.display_name, u.avatar_url;
```

**RLS:** view retorna só rows onde `for_user_id = auth.uid()`.

**Componente novo:** `components/upsell/InvitePastCompanions.tsx`

- Tab dentro de `InvitePlayerDialog` (aditivo, não refatoração)
- Exibe lista de ex-companheiros com checkbox
- Copy: "Você jogou {sessionsTogether}x com **{displayName}**"
- "Enviar convite pra selecionados" → loop em POST `/api/campaign/[id]/invites` reusando fluxo existente

**Emails de convite podem ter copy contextual:** "Olá {name}, {dmName} (que jogou com você em {lastCampaignName}) te convidou pra ser jogador na nova campanha dele".

---

### Área 6 — Analytics: Funil Player → DM

**Eventos novos** (via `trackServerEvent`):

| Evento | Payload | Quando |
|---|---|---|
| `player_dm_cta_shown` | `{ userId, sessionsPlayed, role }` | CTA Área 1 renderizado |
| `player_dm_cta_dismissed` | `{ userId, dismissalCount }` | Dismiss |
| `player_dm_cta_clicked` | `{ userId, sessionsPlayed }` | Abre wizard |
| `player_role_upgraded_to_dm` | `{ userId, previousRole, newRole, via: 'wizard' \| 'manual' }` | `updateRole` disparado |
| `dm_template_used` | `{ userId, templateId, templateName }` | `clone_campaign_from_template` chamado |
| `dm_first_campaign_created` | `{ userId, source: 'blank' \| 'template' }` | 1ª campanha do user (flag `first_campaign_created_at` em user_onboarding) |
| `dm_tour_completed` | `{ userId, stepsCompleted }` | DmTourProvider finish |
| `dm_invite_past_companions_sent` | `{ userId, companionCount, campaignId }` | Envio bulk |
| `dm_first_session_run` | `{ userId, campaignId, encounterId }` | Primeira vez que `encounters.is_active = true` na campanha nova |

**Dashboard admin:** `app/app/admin/player-dm-funnel/page.tsx` (auth admin)
- Métricas: CTA shown → clicked → role_upgraded → first_campaign → first_session → invite_sent
- Cohort analysis por semana
- Taxa de conversão total (player → DM ativo)

---

## Arquivos Chave

| Arquivo | Ação | Área |
|---|---|---|
| `supabase/migrations/145_v_player_sessions_played.sql` | **CRIAR** — materialized view + trigger | 2 |
| `supabase/migrations/146_user_onboarding_dm.sql` | **CRIAR** — colunas DM tour | 3 |
| `supabase/migrations/147_campaign_templates.sql` | **CRIAR** — tabelas de templates | 4 |
| `supabase/migrations/148_seed_starter_templates.sql` | **CRIAR** — 3 templates iniciais | 4 |
| `supabase/migrations/149_v_past_companions.sql` | **CRIAR** — view ex-companheiros | 5 |
| `lib/upsell/get-sessions-played.ts` | **CRIAR** — server action | 2 |
| `lib/upsell/should-show-dm-cta.ts` | **CRIAR** — trigger logic | 1, 2 |
| `lib/upsell/clone-template.ts` | **CRIAR** — wrapper da RPC | 4 |
| `lib/upsell/past-companions.ts` | **CRIAR** — query de v_past_companions | 5 |
| `lib/upsell/analytics.ts` | **CRIAR** — event helpers | 6 |
| `components/upsell/BecomeDmCta.tsx` | **CRIAR** | 1 |
| `components/upsell/BecomeDmWizard.tsx` | **CRIAR** | 3 |
| `components/upsell/TemplateGallery.tsx` | **CRIAR** | 4 |
| `components/upsell/TemplateDetailModal.tsx` | **CRIAR** | 4 |
| `components/upsell/InvitePastCompanions.tsx` | **CRIAR** — tab nova | 5 |
| `components/campaign/InvitePlayerDialog.tsx` | **MODIFICAR** — adicionar tab "Ex-companheiros" | 5 |
| `components/tour/DmTourProvider.tsx` | **CRIAR** | 3 |
| `components/tour/dm-tour-steps.ts` | **CRIAR** | 3 |
| `app/app/dashboard/page.tsx` | **MODIFICAR** — injetar `BecomeDmCta` no player view | 1 |
| `app/app/admin/player-dm-funnel/page.tsx` | **CRIAR** — dashboard admin | 6 |
| `public/locales/{pt,en}/upsell.json` | **CRIAR** — copy DM upsell | 1, 3 |
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
- [ ] Dismissal store respeitado (reusa Épico 03 Área 6)
- [ ] Abre `BecomeDmWizard` no clique primário

### Área 2 — Session Counting
- [ ] Migration 145 aplicada; materialized view criada
- [ ] Trigger refresha em `encounters.is_active` transition para false
- [ ] Performance: refresh em &lt;500ms com 10k sessions (teste)
- [ ] Fallback 0 se user não tem row (nunca jogou)

### Área 3 — DM Onboarding
- [ ] Migration 146 aplicada
- [ ] `BecomeDmWizard` cobre 5 steps descritos
- [ ] Role flip: `role = 'player'` → `'both'` no Step 3 submit
- [ ] `DmTourProvider` inicia após criação de campanha no Step 3
- [ ] Tour salva progresso em `user_onboarding.dm_tour_step`
- [ ] Botão "Pular tour" funciona (salva `dm_tour_completed = true` sem steps)
- [ ] Help button reabre tour

### Área 4 — Starter Kit
- [ ] Migrations 147, 148 aplicadas
- [ ] 3 templates seeded com encontros e monstros (validar via query)
- [ ] RPC `clone_campaign_from_template` cria campanha + encontros
- [ ] `TemplateGallery` lista templates com preview
- [ ] `TemplateDetailModal` exibe encontros do template
- [ ] Clone redirect para nova campanha funcional

### Área 5 — Viral Invite
- [ ] Migration 149 aplicada; view `v_past_companions` retorna rows corretos
- [ ] RLS valida `for_user_id = auth.uid()`
- [ ] Tab nova em `InvitePlayerDialog` aparece só se user tem companions
- [ ] Bulk invite usa endpoint existente `/api/campaign/[id]/invites` (sem duplicar)
- [ ] Email de convite inclui contexto ("jogou com você em...")

### Área 6 — Analytics
- [ ] 9 eventos de funil emitidos via `trackServerEvent`
- [ ] Dashboard admin `/app/admin/player-dm-funnel` exibe métricas
- [ ] Cohort query retorna dados (mesmo zerado inicialmente)

### Integração
- [ ] `tsc --noEmit` limpo
- [ ] **Parity check:** guest e anon não veem CTAs (só auth)
- [ ] Role flip não invalida sessão/reconnection
- [ ] i18n PT-BR + EN para `upsell.json`
- [ ] **Regras imutáveis CLAUDE.md:** ver seção dedicada

---

## Testing Contract

| Área | Unit | Integration | E2E |
|---|---|---|---|
| 1 — CTA | RTL + 2 role cases | — | `player-becomes-dm-full-flow.spec.ts` |
| 2 — Session counting | SQL query validation | Materialized view refresh | — |
| 3 — Onboarding | Wizard RTL + role flip | Tour transitions | Incluído em full-flow |
| 4 — Templates | RTL gallery + modal | Clone RPC correctness | `template-clone-first-session.spec.ts` |
| 5 — Past companions | View query + RTL | Bulk invite endpoint | `past-companions-invite.spec.ts` |
| 6 — Analytics | Event emission (9) | Dashboard query | — |

**Testes obrigatórios:**

1. **E2E full flow:** player com 2 sessões jogadas → vê CTA → abre wizard → escolhe template → role flipa para `'both'` → campanha criada → tour inicia → convida ex-companion
2. **E2E template clone:** DM novo clona "Taverna em Chamas" → campanha tem 3 encontros → pode iniciar 1º encontro com monstros SRD pré-populados
3. **E2E past companions:** user já jogou com A e B em campanhas diferentes → ao virar DM, vê ambos na lista → envia convite → A e B recebem email contextual
4. **Unit: should-show-dm-cta lógica** — 5+ casos (role=player/0, role=player/2, role=both/0, role=both/3+campanha, role=dm/5)
5. **SQL: past_companions RLS** — user A lê só own row (tentativa de ler de outro user retorna 0)
6. **Materialized view race:** 2 encontros encerram em 100ms de diferença → view reflete ambos sem duplicar
7. **Tour interruption:** user inicia tour, fecha aba no meio → progresso salvo em `dm_tour_step` → reabre dashboard, tour retoma

---

## Story Sequencing (DAG)

```
Story 04-A: Migrations 145-149 + types update
   └─ bloqueia todas as outras

Story 04-B: Session counting lib (Área 2)
   └─ depende de 04-A
   └─ PARALELO a 04-C

Story 04-C: Template seed + RPC clone (Área 4 primitives)
   └─ depende de 04-A
   └─ PARALELO a 04-B

Story 04-D: Past companions view + lib (Área 5 primitives)
   └─ depende de 04-A
   └─ PARALELO a 04-B, 04-C

Story 04-E: BecomeDmCta component + dashboard integration (Área 1)
   └─ depende de 04-B
   └─ depende de Épicos 02, 03 (dashboard base + dismissal store)

Story 04-F: BecomeDmWizard + role flip + DmTourProvider (Área 3)
   └─ depende de 04-E
   └─ consome 04-C (templates)

Story 04-G: TemplateGallery + TemplateDetailModal UI (Área 4 UI)
   └─ depende de 04-C, 04-F

Story 04-H: InvitePastCompanions component + tab em InvitePlayerDialog (Área 5 UI)
   └─ depende de 04-D, 04-F

Story 04-I: Analytics events + admin funnel dashboard (Área 6)
   └─ depende de 04-E a 04-H (precisa dos eventos acontecendo)

Story 04-J: E2E Playwright suite completa
   └─ depende de 04-E a 04-I

Story 04-K: i18n (upsell.json PT + EN) + copy review da Paige
   └─ paralelo a E-J (desde que Paige tenha copy)
```

**Distribuição por sprint:**
- **Sprint 1:** 04-A, 04-B, 04-C, 04-D (fundação)
- **Sprint 2:** 04-E, 04-F, 04-G, 04-K
- **Sprint 3:** 04-H, 04-I, 04-J

---

## Riscos Documentados

| Risco | Severidade | Mitigação |
|---|---|---|
| **Épico 04 é o MAIOR (18-28 dias) e atrasa big-bang release** | **Alta** | Flag como maior risco da iniciativa; revisar progresso a cada sprint; última carta: cortar Área 4 (templates) ou Área 5 (viral) se apertar |
| Materialized view refresh em trigger trava writes em campanhas muito ativas | Média | Alternativa pg_cron a cada 15 min se performance ruim; teste com 10k sessions |
| Template seed vira "content liability" (copyright de encontros, NPCs) | Média | Templates usam só monstros SRD (CC-BY-4.0); narrativas originais; Paige e Dani revisam conteúdo antes de seed |
| `past_companions` view expõe relacionamentos entre users (privacy) | Média | RLS restrita; display_name público já existe; avatar_url também público; nada sensível vaza |
| Role flip de `'player'` para `'both'` confunde sessão em andamento | Baixa | Role store reload via Zustand; teste de reconnection após flip |
| Tour de DM fica desatualizado quando UI de DM muda | Média | Tour steps referenciam seletores CSS estáveis (`data-tour-target`); Paige documenta processo de manutenção |
| Viral invite sem opt-out do companion → spam | Média | Respeitar `users.email_marketing_opt_in` (se não existe, criar); limite 20 companions/sem |
| Analytics stack só-Supabase dificulta análise em escala | Baixa | OK para MVP; trocar para PostHog/Mixpanel é outro épico |
| Subscription gate não existe hoje → Área 4 templates pode virar foot-in-door de paywall futuro e frustrar usuários | Baixa | Registrado; versão gratuita dos templates é suficiente; monetização futura cria NOVOS templates premium em vez de gate nos existentes |
| `is_active` trigger em `encounters` não existe ou tem semântica diferente | Média | Migration 141 criou `encounter_started_at_trigger`; validar semântica + confirmar que `is_active = false` é evento de encerramento real |

---

## Regras Imutáveis (CLAUDE.md)

- **Combat Parity Rule:** CTA só aparece para auth (não guest, não anon). Nenhuma mudança em experiência de combate — áreas deste épico tocam dashboard + wizards + admin, não combate.
- **Resilient Reconnection Rule:** role flip e tour NÃO invalidam sessão. `session_token_id` preservado. Broadcast de eventos de funil NÃO viaja em `campaign:*` channel.
- **SRD Compliance:** templates usam só monstros SRD (whitelist já existente). Narrativas originais (IP próprio). Nada de livros WotC não-SRD.
- **SEO Canonical:** `/app/admin/player-dm-funnel` tem `noindex`. Nenhuma rota pública nova.

---

## Dependências

### De entrada
- Épico 01 — `users` enriquecido
- Épico 02 — dashboard enriquecido (base do card)
- Épico 03 — dismissal store pattern (Área 6 do 03); analytics stack

### De saída
- Nenhum épico subsequente nesta iniciativa (Épico 04 é terminal)
- Futuros épicos de growth podem consumir `v_player_sessions_played` e `v_past_companions`

---

## Estimativa de Esforço

| Área | Complexidade | Esforço |
|---|---|---|
| Área 2 — Session counting (view + trigger) | Média | 1.5 dias |
| Área 1 — CTA | Baixa-Média | 1.5 dias |
| Área 3 — Onboarding wizard + tour | **Alta** | 4-5 dias |
| Área 4 — Templates (tabelas + seed + RPC + UI) | **Alta** | 5-7 dias |
| Área 5 — Past companions view + UI | Média | 3 dias |
| Área 6 — Analytics + admin dashboard | Média | 2-3 dias |
| i18n + copy (Paige) | Baixa | 1 dia |
| Testes unit + integration | Média | 2-3 dias |
| E2E (3 specs complexos) | Alta | 3 dias |
| Review + polish + acessibilidade | Média | 2 dias |
| **Total estimado** | | **25-32 dias úteis (~3-4 sprints)** |

---

## Próximos Passos

1. Revisão deste épico com Dani_ + time (GO / AJUSTAR)
2. Aguardar Épicos 01, 02, 03 em staging antes de começar stories de código
3. Dani_ aprova conteúdo dos 3 templates (narrativa, nome, tipo) — Paige redige junto
4. Sally produz mockups do `BecomeDmCta`, `BecomeDmWizard` (5 steps), `TemplateGallery`
5. Bob quebra em stories conforme DAG
6. Winston valida o approach de materialized view (se cron vs trigger)
7. **Review do risco principal:** este épico é o maior — se apertar cronograma, cortar Área 4 (templates) primeiro; Área 5 segundo; Áreas 1-3 são must-have do valor visível
