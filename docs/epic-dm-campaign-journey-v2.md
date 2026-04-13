# Epic: Jornada do Mestre v2 — Criacao e Gestao de Campanha

**Projeto:** Pocket DM
**Autor:** BMAD Team (Party Mode — PM, UX, Architect, Analyst)
**Data:** 2026-04-10
**Status:** Pronto para Sprint Planning
**Analise:** `docs/analise-jornada-dm-2026-04-10.md`
**Predecessor:** `docs/epic-campaign-dual-role.md` (implementado), `docs/spec-campaign-hub-v2.md` (F1-F3 done)

---

## 1. Visao Geral

### O Problema

A infraestrutura de campanha foi implementada com sucesso (dual-role, membership, invites, hub v2), mas a **experiencia do DM** ainda tem lacunas criticas:

1. **Criacao rasa** — campanha e so um nome
2. **Empty state intimidante** — 9 secoes com zero
3. **Sessao inexistente como conceito** — nao existe preparacao, recap, agendamento
4. **Zero feedback** de quando players entram
5. **Sem guia** de proximo passo

### A Solucao

Transformar a jornada do DM em uma experiencia **guiada, contextual e session-first**, mantendo a simplicidade que e o diferencial do PocketDM.

### Principios

1. **Session-first** — o DM pensa em sessoes, nao em "secoes de campanha"
2. **Progressive disclosure** — mostrar so o que e relevante agora
3. **Zero empty state** — todo "vazio" e uma oportunidade de CTA
4. **Realtime feedback** — DM sabe imediatamente quando algo acontece
5. **Nao regredir** — experiencia atual do DM nao pode piorar

---

## 2. Modelo de Dados — Alteracoes Necessarias

### 2.1 Alterar: `sessions`

Adicionar campos para transformar sessao em unidade de trabalho:

```sql
-- Migration: XXX_sessions_as_work_unit.sql
ALTER TABLE sessions
  ADD COLUMN description TEXT,
  ADD COLUMN scheduled_for TIMESTAMPTZ,
  ADD COLUMN session_number INTEGER,
  ADD COLUMN prep_notes TEXT,
  ADD COLUMN recap TEXT,
  ADD COLUMN status TEXT DEFAULT 'planned'
    CHECK (status IN ('planned', 'active', 'completed', 'cancelled'));

-- Auto-incrementar session_number por campanha
CREATE OR REPLACE FUNCTION set_session_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.session_number := COALESCE(
    (SELECT MAX(session_number) FROM sessions WHERE campaign_id = NEW.campaign_id),
    0
  ) + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_session_created
  BEFORE INSERT ON sessions
  FOR EACH ROW EXECUTE FUNCTION set_session_number();
```

### 2.2 Nova: `campaign_settings`

```sql
-- Migration: XXX_campaign_settings.sql
CREATE TABLE campaign_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE UNIQUE,
  game_system TEXT DEFAULT '5e',
  party_level INTEGER,
  theme TEXT,
  description TEXT,
  is_oneshot BOOLEAN DEFAULT false,
  allow_spectators BOOLEAN DEFAULT false,
  join_code_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: mesmo da campaigns (owner + member select)
ALTER TABLE campaign_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can manage settings"
ON campaign_settings FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM campaigns
    WHERE campaigns.id = campaign_settings.campaign_id
    AND campaigns.owner_id = auth.uid()
  )
);

CREATE POLICY "Members can view settings"
ON campaign_settings FOR SELECT
USING (
  public.is_campaign_member(campaign_id)
);
```

### 2.3 Alterar: `campaigns`

Adicionar soft-delete:

```sql
-- Migration: XXX_campaigns_soft_delete.sql
ALTER TABLE campaigns
  ADD COLUMN archived_at TIMESTAMPTZ,
  ADD COLUMN is_archived BOOLEAN DEFAULT false;

-- Atualizar RLS para filtrar arquivadas por default
-- (owner ainda pode ver com filtro explicito)
```

---

## 3. Stories

### Grupo A: Campaign Setup (Frontend + DB)

#### DJ-A1: Campaign Creation Wizard

**Descricao:** Substituir o input simples de nome por um wizard de 2-3 passos que coleta informacoes essenciais para contextualizar a campanha.

**Acceptance Criteria:**
- [ ] Step 1: Nome da campanha (mantido, max 50 chars) + Descricao opcional (max 200 chars)
- [ ] Step 2: Tipo (Campanha Longa | Oneshot | Dungeon Crawl) + Nivel do grupo (1-20, default 1)
- [ ] Step 3: Convide players (mantido — link + email)
- [ ] Wizard acessivel tanto do Dashboard quanto do Onboarding
- [ ] Campaign settings salvos na nova tabela `campaign_settings`
- [ ] Steps opcionais — DM pode pular step 2 e ir direto pro convite
- [ ] Mobile responsive
- [ ] Analytics: `campaign:created_with_wizard` com metadata do que preencheu

**Arquivos afetados:**
- `components/dashboard/CampaignManager.tsx` — trigger novo wizard
- NOVO: `components/campaign/CampaignCreationWizard.tsx`
- `components/onboarding/OnboardingWizard.tsx` — integrar novo wizard no step de campanha
- Migration: `campaign_settings` table

**Estimativa:** 6-8h

---

#### DJ-A2: Campaign Hub Contextual Onboarding

**Descricao:** Substituir o grid de 9 secoes com "0" por um checklist progressivo que guia o DM pelos primeiros passos.

**Acceptance Criteria:**
- [ ] Quando campanha tem 0 players E 0 encounters E 0 sessions → mostrar Onboarding Mode
- [ ] Checklist com 4 passos sequenciais:
  1. "Campanha criada" (auto-completado)
  2. "Convide seus jogadores" → abre InvitePlayerDialog
  3. "Crie seu primeiro encontro" → abre Encounters section
  4. "Inicie sua primeira sessao" → abre CombatLaunchSheet
- [ ] Cada step completado revela preview da proxima secao
- [ ] Celebracao ao completar todos (XP bonus: `dm:campaign_setup_complete`)
- [ ] Apos completar onboarding, mostrar grid normal com dados populados
- [ ] DM pode "Skip onboarding" e ir direto pro grid
- [ ] Persist state em `campaign_settings.onboarding_completed`

**Arquivos afetados:**
- `components/campaign/CampaignGrid.tsx` — render condicional
- NOVO: `components/campaign/CampaignOnboardingChecklist.tsx`
- `app/app/campaigns/[id]/page.tsx` — flag de onboarding
- `lib/types/campaign-hub.ts` — novo type

**Estimativa:** 4-6h

---

#### DJ-A3: Campaign Settings Page

**Descricao:** Adicionar pagina de configuracoes da campanha acessivel via secao "Settings" no hub.

**Acceptance Criteria:**
- [ ] Acessivel via novo item "Settings" no CampaignNavBar (icone engrenagem)
- [ ] Campos editaveis: nome, descricao, tipo, nivel do grupo, sistema
- [ ] Toggle: permitir espectadores
- [ ] Toggle: link de convite ativo/inativo (mover do InviteDialog)
- [ ] Danger zone: Arquivar campanha (soft-delete) + Deletar permanentemente
- [ ] Confirmacao com nome da campanha para delete permanente
- [ ] Auto-save com debounce (mesmo padrao dos DM Notes)
- [ ] Apenas DM (owner) ve esta secao

**Arquivos afetados:**
- NOVO: `components/campaign/CampaignSettings.tsx`
- `components/campaign/CampaignFocusView.tsx` — adicionar section "settings"
- `components/campaign/CampaignNavBar.tsx` — novo pill
- `lib/types/campaign-hub.ts` — adicionar "settings" ao SectionId

**Estimativa:** 4-6h

---

### Grupo B: Session as Work Unit (Backend + Frontend)

#### DJ-B1: Session Planning & Preparation

**Descricao:** Transformar sessao de "container de combate" em "unidade de trabalho" com preparacao, agendamento e notas.

**Acceptance Criteria:**
- [ ] Nova UI "Plan Next Session" no Campaign Hero (CTA principal)
- [ ] Formulario de sessao: nome (auto: "Sessao N"), data agendada, notas de prep
- [ ] Sessao aparece no Campaign Hub como card em destaque: "Proxima Sessao: [nome] — [data]"
- [ ] DM pode adicionar notas de prep (markdown, max 5000 chars)
- [ ] DM pode vincular encounters existentes a sessao
- [ ] Status workflow: Planned → Active → Completed
- [ ] Migration aplicada para campos novos em `sessions`

**Arquivos afetados:**
- Migration: `sessions` ALTER (description, scheduled_for, session_number, prep_notes, recap, status)
- NOVO: `components/campaign/SessionPlanner.tsx`
- `components/campaign/CampaignHero.tsx` — CTA "Proxima Sessao"
- `components/campaign/CampaignStatusCards.tsx` — card de proxima sessao
- `lib/types/campaign-hub.ts` — SessionWithDetails type

**Estimativa:** 8-10h

---

#### DJ-B2: Session Recap & History

**Descricao:** Apos completar uma sessao, DM pode escrever recap e ver historico de sessoes.

**Acceptance Criteria:**
- [ ] Ao finalizar combate, prompt para "Escrever recap da sessao"
- [ ] Recap salvo no campo `sessions.recap`
- [ ] Nova secao "Sessions" no Campaign Hub substituindo comportamento atual
- [ ] Timeline de sessoes com: numero, nome, data, recap preview, stats de combate
- [ ] Click em sessao expande detalhes: recap completo + encounters + stats
- [ ] Player view: pode ver recaps (read-only)
- [ ] Acessivel via CampaignNavBar pill "Sessions"

**Arquivos afetados:**
- NOVO: `components/campaign/SessionHistory.tsx`
- NOVO: `components/campaign/SessionRecapDialog.tsx`
- `components/campaign/CampaignFocusView.tsx` — nova secao "sessions"
- `components/campaign/CampaignNavBar.tsx` — pill "Sessions"
- `components/session/CombatSessionClient.tsx` — trigger recap no end encounter

**Estimativa:** 6-8h

---

#### DJ-B3: Session-First Hero Section

**Descricao:** Redesenhar o Hero do Campaign Hub para ser session-centric em vez de KPI-centric.

**Acceptance Criteria:**
- [ ] **COM sessao planejada:** Hero mostra "Proxima Sessao: [nome] — [data relativa]" como elemento principal, com botao "Preparar" e "Iniciar"
- [ ] **COM sessao ativa:** Hero mostra "Sessao em andamento: [nome] — Rodada X" com botao "Entrar"
- [ ] **SEM sessao:** Hero mostra "Nenhuma sessao planejada" com CTA "Planejar Proxima Sessao"
- [ ] KPI cards movidos para posicao secundaria (abaixo do hero)
- [ ] Player avatares mantidos com popover de HP/AC
- [ ] Mantido: Quick Actions contextuais

**Arquivos afetados:**
- `components/campaign/CampaignHero.tsx` — redesign session-first
- `components/campaign/CampaignStatusCards.tsx` — reposicionar como secundario
- i18n: novas chaves PT-BR/EN

**Estimativa:** 4-6h

---

### Grupo C: Realtime & Feedback (Supabase Realtime)

#### DJ-C1: Player Join Notification

**Descricao:** DM recebe notificacao em tempo real quando um player aceita convite e entra na campanha.

**Acceptance Criteria:**
- [ ] Supabase Realtime subscription na tabela `campaign_members` (INSERT)
- [ ] Toast notification: "🎉 [Player Name] entrou na campanha!"
- [ ] Badge de "novo" no player avatar ate DM visualizar
- [ ] Sound effect opcional (usar infra existente do Soundboard)
- [ ] Funciona tanto no Campaign Hub quanto no Dashboard
- [ ] Subscription cleanup no unmount

**Arquivos afetados:**
- NOVO: `lib/realtime/campaign-membership-listener.ts`
- `components/campaign/CampaignHero.tsx` — subscription + toast
- `components/campaign/CampaignPlayerAvatars.tsx` — badge "new"
- `components/dashboard/CampaignManager.tsx` — player count update

**Estimativa:** 3-4h

---

#### DJ-C2: Campaign Health Indicators

**Descricao:** Adicionar indicadores visuais de "saude" da campanha no dashboard e hub.

**Acceptance Criteria:**
- [ ] No Dashboard card: badge "Ultima sessao: ha X dias" com cores (verde <7d, amarelo <30d, vermelho >30d)
- [ ] No Dashboard card: "X/Y players com character sheet"
- [ ] No Campaign Hub: barra de progresso de "completude" da campanha
- [ ] Criterios de completude: tem players (25%), tem encounter preparado (25%), teve sessao (25%), tem notas/NPCs (25%)
- [ ] Tooltip explicando cada indicador
- [ ] Nao bloquear nada — apenas informativo

**Arquivos afetados:**
- NOVO: `components/campaign/CampaignHealthBadge.tsx`
- `components/dashboard/CampaignManager.tsx` — badges nos cards
- `components/campaign/CampaignHero.tsx` — barra de progresso
- `lib/utils/campaign-stats.ts` — funcao de calculo de health

**Estimativa:** 4-6h

---

#### DJ-C3: Realtime Hub Updates

**Descricao:** Campaign Hub atualiza em tempo real sem refresh quando dados mudam.

**Acceptance Criteria:**
- [ ] Subscribe `campaign_members` — player count atualiza live
- [ ] Subscribe `player_characters` — avatares atualizam live
- [ ] Subscribe `sessions` — status de sessao ativa atualiza live
- [ ] Revalidacao server-side via `router.refresh()` como fallback
- [ ] Indicador visual sutil quando dados atualizam (flash animation)
- [ ] Unsubscribe on unmount

**Arquivos afetados:**
- NOVO: `lib/realtime/campaign-hub-listener.ts`
- `app/app/campaigns/[id]/page.tsx` — wrapper com realtime
- NOVO: `components/campaign/CampaignRealtimeProvider.tsx`

**Estimativa:** 4-6h

---

### Grupo D: Safety & Polish

#### DJ-D1: Campaign Archive (Soft Delete)

**Descricao:** Substituir delete nuclear por archive + delete permanente com confirmacao.

**Acceptance Criteria:**
- [ ] "Arquivar campanha" move pra estado `is_archived = true`
- [ ] Campanhas arquivadas somem do dashboard por default
- [ ] Toggle "Mostrar arquivadas" no dashboard (opacity reduzida)
- [ ] "Restaurar" campanha arquivada (is_archived = false)
- [ ] "Deletar permanentemente" exige digitar nome da campanha
- [ ] Warning mostra volume: "Esta campanha tem X sessoes, Y encounters, Z notas"
- [ ] Migration: adicionar `archived_at`, `is_archived` na campaigns

**Arquivos afetados:**
- Migration: `campaigns` ALTER
- `components/dashboard/CampaignManager.tsx` — novo menu com Archive/Restore/Delete
- NOVO: `components/campaign/CampaignArchiveDialog.tsx`
- `app/app/dashboard/campaigns/page.tsx` — filtro de arquivadas

**Estimativa:** 4-6h

---

#### DJ-D2: Max Players Enforcement

**Descricao:** Enforcar limite de players no frontend e backend.

**Acceptance Criteria:**
- [ ] `JoinCampaignClient.tsx` — checar count de members antes de permitir join
- [ ] API `/join-link` — retornar `current_players` e `max_players`
- [ ] UI: "Campanha cheia (X/Y players)" quando limite atingido
- [ ] DM pode alterar max_players em Campaign Settings
- [ ] Default: 10 (mantido)
- [ ] RPC `accept_campaign_invite` — checar limite antes de inserir

**Arquivos afetados:**
- `components/campaign/JoinCampaignClient.tsx` — check pre-join
- `app/api/campaign/[id]/join-link/route.ts` — retornar counts
- `supabase/migrations/036_accept_invite_function.sql` — adicionar check
- `components/campaign/CampaignSettings.tsx` — campo max_players

**Estimativa:** 3-4h

---

#### DJ-D3: Join Code Expiration

**Descricao:** Adicionar expiracao configuraavel ao join code.

**Acceptance Criteria:**
- [ ] Default: 30 dias apos geracao
- [ ] Configuravel em Campaign Settings: 7d, 30d, 90d, Never
- [ ] Frontend mostra "Expira em X dias" junto ao link
- [ ] Link expirado mostra mensagem amigavel: "Este link expirou. Peca um novo ao mestre."
- [ ] DM pode regenerar (ja existente) — reseta expiracao
- [ ] Campo `join_code_expires_at` na tabela `campaign_settings`

**Arquivos afetados:**
- `app/api/campaign/[id]/join-link/route.ts` — check expiracao
- `app/join-campaign/[code]/page.tsx` — mensagem de expirado
- `components/campaign/InvitePlayerDialog.tsx` — mostrar "expira em"
- `components/campaign/CampaignSettings.tsx` — config de expiracao

**Estimativa:** 2-3h

---

#### DJ-D4: Combat Launch UX Improvement

**Descricao:** Melhorar a UX do CombatLaunchSheet para DMs novos entenderem os paths.

**Acceptance Criteria:**
- [ ] Cada path tem icone + titulo + descricao de 1 linha:
  - "Novo Combate" — "Configure monstros e inicie do zero"
  - "Carregar Preset" — "Use um encontro que voce ja preparou"
  - "Combate Rapido" — "Pule a selecao de campanha, va direto pro combate"
- [ ] Se campanha tem sessao planejada, mostrar: "Iniciar sessao: [nome]" como opcao principal
- [ ] Se campanha tem presets, mostrar count: "X encontros preparados"
- [ ] Highlight na opcao recomendada com base no contexto

**Arquivos afetados:**
- `components/campaign/CombatLaunchSheet.tsx` — redesign com descricoes
- i18n: novas chaves

**Estimativa:** 2-3h

---

#### DJ-D5: Quick Actions Contextuais

**Descricao:** Quick Actions no Hero adaptam conforme estado da campanha.

**Acceptance Criteria:**
- [ ] **0 players:** "Convide seus jogadores" como acao principal (highlight gold)
- [ ] **0 encounters + tem players:** "Crie seu primeiro encontro" como acao principal
- [ ] **Tem encounter + 0 sessions:** "Inicie sua primeira sessao" como acao principal
- [ ] **Campanha ativa:** Quick actions padrao (New Combat, New Note, New NPC, New Encounter)
- [ ] Transicao suave entre estados
- [ ] Analytics: track qual quick action DM usa mais

**Arquivos afetados:**
- `components/campaign/CampaignHero.tsx` — logica condicional
- i18n: novas chaves contextuais

**Estimativa:** 3-4h

---

## 4. Grafo de Dependencias

```
                    ┌──────────────────┐
                    │   MIGRATIONS     │
                    │ campaign_settings│
                    │ sessions ALTER   │
                    │ campaigns ALTER  │
                    └────────┬─────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              v              v              v
     ┌────────────┐  ┌────────────┐  ┌────────────┐
     │  GRUPO A   │  │  GRUPO B   │  │  GRUPO C   │
     │  Campaign  │  │  Session   │  │  Realtime   │
     │  Setup     │  │  as Unit   │  │  & Feedback │
     ├────────────┤  ├────────────┤  ├────────────┤
     │ DJ-A1 Wiz  │  │ DJ-B1 Plan │  │ DJ-C1 Join │
     │ DJ-A2 Onb  │  │ DJ-B2 Recap│  │ DJ-C2 Hlth │
     │ DJ-A3 Set  │  │ DJ-B3 Hero │  │ DJ-C3 Live │
     └────────────┘  └─────┬──────┘  └────────────┘
                           │
                           │ DJ-B3 depende de DJ-B1
                           │ (precisa de session data)
                           │
                    ┌──────┴──────┐
                    │  GRUPO D    │
                    │  Safety &   │
                    │  Polish     │
                    ├─────────────┤
                    │ DJ-D1 Archv │  ← depende migration campaigns ALTER
                    │ DJ-D2 MaxP  │  ← independente (schema ja existe)
                    │ DJ-D3 Expir │  ← depende DJ-A3 (settings page)
                    │ DJ-D4 CmbUX │  ← independente
                    │ DJ-D5 QAct  │  ← independente
                    └─────────────┘
```

### Dependencias Criticas

| Story | Depende de | Razao |
|-------|-----------|-------|
| DJ-A1, DJ-A3 | Migration `campaign_settings` | Precisam da tabela |
| DJ-B1, DJ-B2 | Migration `sessions ALTER` | Precisam dos campos novos |
| DJ-B3 | DJ-B1 | Hero session-first precisa de session data |
| DJ-D1 | Migration `campaigns ALTER` | Precisa de `is_archived` |
| DJ-D3 | DJ-A3 | Expiracao configuraavel na settings page |
| Resto | Nenhuma | Podem rodar em paralelo |

---

## 5. Estimativas Consolidadas

| Grupo | Stories | Estimativa Total | Paralelizavel |
|-------|---------|-----------------|---------------|
| Migrations | 3 migrations | 2-3h | Sequencial (1 agente) |
| A: Campaign Setup | DJ-A1, DJ-A2, DJ-A3 | 14-20h | Sim (3 agentes apos migration) |
| B: Session Unit | DJ-B1, DJ-B2, DJ-B3 | 18-24h | Parcial (B3 depende de B1) |
| C: Realtime | DJ-C1, DJ-C2, DJ-C3 | 11-16h | Sim (3 agentes) |
| D: Safety/Polish | DJ-D1-D5 | 14-20h | Sim (5 agentes) |
| **TOTAL** | **16 stories** | **~59-83h** | **Ate 5 agentes paralelos** |

---

## 6. Criterios de Sucesso do Epic

| Metrica | Antes | Depois | Como Medir |
|---------|-------|--------|-----------|
| Tempo ate primeiro combate | ~5min (DM perdido no hub) | <2min (guided path) | Analytics: time campaign_created → session_started |
| Taxa de invite aceito | Desconhecido | +20% | Analytics: invite_sent → invite_accepted ratio |
| Sessoes por campanha | ~1-2 (sessao e invisivel) | 3+ (sessao e o core) | DB: avg sessions per campaign |
| DM retention D7 | Desconhecido | Baseline | Analytics: DM login D1/D7/D30 |
| "E agora?" complaints | Frequente no beta | Zero | Beta feedback qualitativo |

---

> **Proximo:** Sprint plans paralelizaveis em `docs/sprint-plan-dm-journey-2026-04-10.md`
