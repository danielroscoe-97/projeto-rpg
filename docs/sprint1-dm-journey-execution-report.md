# Sprint 1 Execution Report: DM Campaign Journey v2 — Foundation

**Data:** 2026-04-10
**Epic:** `docs/epic-dm-campaign-journey-v2.md`
**Sprint Plan:** `docs/sprint-plan-dm-journey-2026-04-10.md`
**Commit:** `2ca2a2d feat(campaign): Sprint 1 — DM Campaign Journey v2 foundation`
**Status:** COMPLETO — tsc --noEmit PASS, migrations aplicadas

---

## O Que Foi Implementado

### DJ-A1: Campaign Creation Wizard (Agent 1C)

**Problema:** Criacao de campanha era so um input de nome.
**Solucao:** Wizard de 3 steps em Sheet lateral.

| Arquivo | Acao | Linhas |
|---------|------|--------|
| `components/campaign/CampaignCreationWizard.tsx` | NOVO | 569 |
| `lib/supabase/campaign-settings.ts` | NOVO | 215 |
| `components/dashboard/CampaignManager.tsx` | EDIT | Substituido inline form pelo wizard |

**Detalhes:**
- Step 1: Nome (obrigatorio, max 50) + Descricao (opcional, max 200)
- Step 2: Tipo (Campanha Longa / One-Shot / Dungeon Crawl) + Nivel (1-20) + Sistema
- Step 3: Link de convite com botao copiar
- Steps 2 e 3 sao pulaveis
- Criacao atomica: campaign + campaign_settings + campaign_members (DM) em uma transacao
- Se member insert falhar, campaign orfa e deletada (rollback)
- Guard contra criacao duplicada ao clicar "Voltar" no step 2
- Animacoes de transicao entre steps (framer-motion)

**Server Actions criadas (`lib/supabase/campaign-settings.ts`):**
- `createCampaignWithSettings(userId, name, description?)` -> `{ campaignId, joinCode }`
- `updateCampaignSettings(campaignId, settings)` -> boolean
- `getCampaignSettings(campaignId)` -> CampaignSettingsRow | null

---

### DJ-A2: Campaign Hub Contextual Onboarding (Agent 1B)

**Problema:** Campanha nova mostrava grid com 9 secoes com "0" — intimidante.
**Solucao:** Checklist progressivo de 4 passos que guia o DM.

| Arquivo | Acao | Linhas |
|---------|------|--------|
| `components/campaign/CampaignOnboardingChecklist.tsx` | NOVO | 267 |
| `app/app/campaigns/[id]/page.tsx` | EDIT | Render condicional checklist vs grid |

**Detalhes:**
- 4 steps: Campanha criada -> Convidar jogadores -> Criar encontro -> Iniciar sessao
- Step atual: gold border com glow pulsante (framer-motion)
- Steps completos: green check, texto riscado
- Steps futuros: opacity 0.5
- Ao completar todos: XP event `dm:campaign_setup_complete` via requestXpGrant
- "Pular setup" com min-h-[44px] para touch target
- Dialogs (InvitePlayerDialog, CombatLaunchSheet) fora do AnimatePresence
- Auto-complete via useEffect (nao setTimeout no render)

**Condicao de exibicao (server-side em page.tsx):**
```
playerCount === 0 AND finishedEncounterCount === 0 AND sessionCount === 0
  -> CampaignOnboardingChecklist
else
  -> CampaignGrid
```

---

### DJ-A3: Campaign Settings Page (Agent 1D)

**Problema:** Nao existia pagina de configuracoes da campanha.
**Solucao:** Settings page com auto-save, acessivel via nav pill.

| Arquivo | Acao | Linhas |
|---------|------|--------|
| `components/campaign/CampaignSettings.tsx` | NOVO | 566 |
| `components/campaign/CampaignNavBar.tsx` | EDIT | +pill "Settings" (dmOnly) |
| `app/app/campaigns/[id]/CampaignFocusView.tsx` | EDIT | +case "settings" no switch |

**Detalhes:**
- Secao "Geral": nome, descricao, tipo, nivel, sistema
- Secao "Convites": max players
- Secao "Zona de Perigo": Arquivar (soft-delete) + Excluir (com confirmacao de nome)
- Auto-save com debounce 800ms (mesmo padrao DM Notes)
- Save status indicator: idle -> saving -> saved -> error
- Se campaign_settings nao existe (campanhas antigas), cria defaults no mount
- Colunas no DB: `theme` (nao campaign_type), `game_system` (nao system)
- Valores de tipo: `long_campaign` | `oneshot` | `dungeon_crawl`
- Cancel buttons usam `tc("cancel")` de common (nao hardcoded)

---

### Migrations (Agent 1A)

| Migration | Tabela | O Que Faz |
|-----------|--------|-----------|
| `119_campaign_settings.sql` | campaign_settings | Nova tabela: game_system, party_level, theme, description, is_oneshot, allow_spectators, max_players, join_code_expires_at, onboarding_completed. RLS: owner ALL, members SELECT. |
| `120_sessions_work_unit.sql` | sessions | ALTER: +description, +scheduled_for, +session_number, +prep_notes, +recap, +status (planned/active/completed/cancelled). Trigger auto-increment session_number por campanha. |
| `121_campaigns_soft_delete.sql` | campaigns | ALTER: +archived_at, +is_archived |

**Status:** Aplicadas no Supabase remoto via `supabase db push`.

---

### Types Atualizados

| Arquivo | Mudancas |
|---------|----------|
| `lib/types/database.ts` | +campaign_settings Row/Insert/Update, +6 campos em sessions, +2 campos em campaigns, +CampaignSettings type alias |
| `lib/types/campaign-hub.ts` | `"settings"` adicionado ao SectionId, VALID_SECTIONS, SECTION_NAV_ORDER. +PlannedSession interface. |

---

### i18n

3 novos namespaces top-level adicionados em `messages/pt-BR.json` e `messages/en.json`:

| Namespace | Componente | Chaves |
|-----------|-----------|--------|
| `campaignOnboarding` | CampaignOnboardingChecklist | 17 chaves |
| `campaignWizard` | CampaignCreationWizard | 28 chaves |
| `campaignSettings` | CampaignSettings | 30 chaves |

Tambem adicionado `campaign.hub_card_settings` ("Configuracoes" / "Settings").

---

## Code Review — Issues Encontrados e Corrigidos

| # | Severidade | Arquivo | Issue | Fix |
|---|-----------|---------|-------|-----|
| 1 | **BUG** | CampaignSettings.tsx | Schema mismatch: `campaign_type` -> `theme`, `system` -> `game_system`, valores desalinhados | Renomeado tudo + alinhado com wizard values |
| 2 | **BUG** | CampaignCreationWizard.tsx | "Voltar" no step 2 permitia criar campanha duplicada | Guard `if (campaignId) { goTo(2); return; }` |
| 3 | **BUG** | CampaignOnboardingChecklist.tsx | setTimeout no render body causava multiplos XP grants | Movido para useEffect com cleanup |
| 4 | **BUG** | CampaignOnboardingChecklist.tsx | Dialogs dentro de AnimatePresence podiam desmontar | Movidos para fora, em Fragment |
| 5 | **SECURITY** | campaign-settings.ts | Service client sem atomicidade — member insert fail deixava campanha orfa | Rollback: deleta campanha se member insert falhar |
| 6 | **UX** | CampaignOnboardingChecklist.tsx | Skip button sem min-height para touch | Adicionado min-h-[44px] |
| 7 | **STYLE** | CampaignSettings.tsx | Cancel hardcoded com hack de locale | Substituido por tc("cancel") |
| 8 | **STYLE** | CampaignNavBar.tsx | Cast desnecessario `as SectionId` | Removido |
| 9 | **NITPICK** | campaign-settings.ts | Tipo duplicado CampaignSettingsRow | Substituido por import de database.ts |

---

## Mapa de Arquivos Sprint 1

```
NOVOS (Sprint 1):
  components/campaign/CampaignCreationWizard.tsx    -- DJ-A1 wizard
  components/campaign/CampaignOnboardingChecklist.tsx -- DJ-A2 checklist
  components/campaign/CampaignSettings.tsx           -- DJ-A3 settings page
  lib/supabase/campaign-settings.ts                  -- server actions
  supabase/migrations/119_campaign_settings.sql      -- nova tabela
  supabase/migrations/120_sessions_work_unit.sql     -- sessions ALTER
  supabase/migrations/121_campaigns_soft_delete.sql  -- campaigns ALTER

EDITADOS (Sprint 1):
  lib/types/database.ts              -- +campaign_settings, +sessions fields, +campaigns fields
  lib/types/campaign-hub.ts          -- +settings SectionId, +PlannedSession
  app/app/campaigns/[id]/page.tsx    -- onboarding mode + settings VALID_SECTIONS
  app/app/campaigns/[id]/CampaignFocusView.tsx -- +case "settings"
  components/campaign/CampaignNavBar.tsx -- +pill "Settings"
  components/dashboard/CampaignManager.tsx -- wizard substitui inline form
  messages/pt-BR.json                -- +3 namespaces (75 chaves)
  messages/en.json                   -- +3 namespaces (75 chaves)

NOVOS (Sprint 2/3 -- de outros agentes, incluidos no commit):
  components/campaign/CampaignHealthBadge.tsx    -- DJ-C2
  components/campaign/NextSessionCard.tsx         -- DJ-B1
  components/campaign/SessionHistory.tsx          -- DJ-B2
  components/campaign/SessionPlanner.tsx          -- DJ-B1
  components/campaign/SessionRecapDialog.tsx      -- DJ-B2
  hooks/use-campaign-membership-listener.ts       -- DJ-C1
  lib/realtime/campaign-membership-listener.ts    -- DJ-C1
  lib/supabase/campaign-sessions.ts               -- DJ-B1
  lib/utils/campaign-health.ts                    -- DJ-C2
```

---

## Convencoes Importantes para Outros Agentes

### Schema de campaign_settings
- Coluna de tipo de campanha: `theme` (TEXT) — valores: `long_campaign`, `oneshot`, `dungeon_crawl`
- Coluna de sistema: `game_system` (TEXT) — valor default: `5e`
- **NAO usar** `campaign_type` ou `system` — esses nomes estavam errados e foram corrigidos no code review

### SectionId
- `"settings"` ja esta adicionado ao SectionId union, VALID_SECTIONS, e SECTION_NAV_ORDER
- `"sessions"` tambem foi adicionado (Sprint 2 preview)
- Qualquer novo section deve seguir o mesmo padrao (adicionar nos 3 lugares em campaign-hub.ts + VALID_SECTIONS local em page.tsx)

### i18n Namespaces
- Sprint 1 usa: `campaignOnboarding`, `campaignWizard`, `campaignSettings`
- Sprint 2 deve usar: `sessionPlanner`, `sessionHistory`, `campaignHealth` (conforme sprint plan)
- Cada namespace eh top-level no JSON (nao nested dentro de `campaign`)

### Server Actions Pattern
- `lib/supabase/campaign-settings.ts` usa `createClient()` para RLS e `createServiceClient()` para operacoes atomicas
- Import types de `@/lib/types/database` (nao definir localmente)
- Pattern de rollback: se operacao critica falha, limpar dados parciais

### page.tsx (Campaign Hub)
- Eh server component — nao pode usar hooks
- Onboarding condition: `playerCount === 0 && encounterCount === 0 && sessionCount === 0`
- VALID_SECTIONS local (nao importado) — manter sincronizado com campaign-hub.ts

### CampaignHero.tsx
- Ja aceita props: `nextPlannedSession`, `noteCount`, `npcCount` (Sprint 2 preview)
- Importa `PlannedSession` de `@/lib/types/campaign-hub`
- Importa componentes Sprint 2: NextSessionCard, SessionPlanner, CampaignHealthBadge, useCampaignMembershipListener

### CampaignPlayerAvatars.tsx
- Prop `newMemberIds?: Set<string>` ja adicionado (Sprint 2 preview, DJ-C1)

---

## Checklist de Validacao Sprint 1

- [x] `tsc --noEmit` passa
- [ ] `next build` passa (nao testado)
- [x] i18n merge manual feito (sem chaves duplicadas)
- [x] Migrations aplicadas no Supabase remoto (119, 120, 121)
- [ ] Teste manual: criar campanha nova -> verificar onboarding checklist
- [ ] Teste manual: campanha existente -> verificar grid normal
- [ ] Teste manual: wizard 3 steps funciona end-to-end
- [ ] Teste manual: settings page auto-save + archive + delete
- [ ] Teste manual: mobile responsive

---

## Proximos Passos (Sprint 2)

Sprint 2 foca em **Session-First & Realtime**:
- DJ-B1: Session Planning (SessionPlanner.tsx ja criado, precisa integracao)
- DJ-B2: Session Recap & History (SessionHistory.tsx ja criado, precisa integracao)
- DJ-C1: Player Join Notification (listener ja criado, precisa integracao)
- DJ-C2: Campaign Health Indicators (CampaignHealthBadge.tsx ja criado, precisa integracao)

**Referencia:** `docs/sprint-plan-dm-journey-2026-04-10.md` -> Sprint 2 section

> Sprint plan completo: `docs/sprint-plan-dm-journey-2026-04-10.md`
> Epic com todas as stories: `docs/epic-dm-campaign-journey-v2.md`
> Analise original: `docs/analise-jornada-dm-2026-04-10.md`
