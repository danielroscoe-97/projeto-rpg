# Sprint Plan: Jornada do Mestre v2 — Multi-Agent Parallel Execution

**Epic:** `docs/epic-dm-campaign-journey-v2.md`
**Analise:** `docs/analise-jornada-dm-2026-04-10.md`
**Data:** 2026-04-10
**Estrategia:** 3 sprints, ate 4 agentes paralelos por sprint

---

## Visao Geral da Paralelizacao

```
SPRINT 1 (Foundation)     SPRINT 2 (Core Features)     SPRINT 3 (Polish & Safety)
─────────────────────     ──────────────────────────    ──────────────────────────
Agent A: Migrations       Agent A: Session Planning     Agent A: Archive/Soft-Del
Agent B: Hub Onboarding   Agent B: Session Recap        Agent B: Max Players
Agent C: Creation Wizard  Agent C: Player Join Notif    Agent C: Join Expiration
Agent D: Settings Page    Agent D: Hub Realtime         Agent D: Combat Launch UX
                                                        Agent E: Quick Actions
```

---

## Sprint 1: Foundation — "Bases & First Impressions" ✅ COMPLETO

**Objetivo:** Criar a infraestrutura de dados e resolver os 2 maiores problemas visuais (empty state + criacao rasa).
**Duracao estimada:** 1 dia com 4 agentes paralelos
**Pre-requisito:** Nenhum
**Execution report:** `docs/sprint1-dm-journey-execution-report.md`
**Commit:** `2ca2a2d feat(campaign): Sprint 1 — DM Campaign Journey v2 foundation`
**Migrations:** 119, 120, 121 aplicadas no Supabase remoto

### Agent 1A: Migrations (DEVE RODAR PRIMEIRO — 30min)

> **IMPORTANTE:** Este agente deve completar ANTES dos outros 3 comecarem, pois cria as tabelas que os outros usam.

**Story:** Migrations de infraestrutura
**Escopo:**

```
1. Criar migration: campaign_settings table
   - game_system TEXT DEFAULT '5e'
   - party_level INTEGER
   - theme TEXT
   - description TEXT
   - is_oneshot BOOLEAN DEFAULT false
   - allow_spectators BOOLEAN DEFAULT false
   - join_code_expires_at TIMESTAMPTZ
   - onboarding_completed BOOLEAN DEFAULT false

2. Criar migration: sessions ALTER
   - ADD description TEXT
   - ADD scheduled_for TIMESTAMPTZ
   - ADD session_number INTEGER
   - ADD prep_notes TEXT
   - ADD recap TEXT
   - ADD status TEXT DEFAULT 'planned' CHECK (planned/active/completed/cancelled)
   - Trigger: auto-increment session_number por campanha

3. Criar migration: campaigns ALTER
   - ADD archived_at TIMESTAMPTZ
   - ADD is_archived BOOLEAN DEFAULT false
   - Atualizar RLS para filtrar arquivadas por default

4. Atualizar types em lib/types/database.ts
5. Rodar tsc --noEmit para verificar
```

**Arquivos:**
- `supabase/migrations/XXX_campaign_settings.sql`
- `supabase/migrations/XXX_sessions_work_unit.sql`
- `supabase/migrations/XXX_campaigns_soft_delete.sql`
- `lib/types/database.ts`

**Criterio de done:** Migrations criadas, types atualizados, `tsc --noEmit` passa.

---

### Agent 1B: Campaign Hub Contextual Onboarding (DJ-A2)

> **Espera:** Agent 1A completar (precisa de `campaign_settings.onboarding_completed`)

**Story:** DJ-A2 — Substituir grid de 9 zeros por checklist progressivo
**Escopo:**

```
1. Criar CampaignOnboardingChecklist.tsx:
   - 4 steps visuais com estado (done/current/pending):
     Step 1: "Campanha criada" — auto-done
     Step 2: "Convide jogadores" — done quando campaign_members > 1
     Step 3: "Crie um encontro" — done quando encounters > 0
     Step 4: "Inicie uma sessao" — done quando sessions > 0
   - Cada step tem icone, titulo, descricao, CTA
   - Step atual tem destaque visual (gold border, glow)
   - Steps futuros em opacity reduzida
   - "Pular setup" link no topo

2. Modificar CampaignGrid.tsx:
   - Se onboarding NAO completado → render CampaignOnboardingChecklist
   - Se onboarding completado → render grid normal
   - Logica: completado quando todos 4 steps done OU user clicou "skip"

3. Atualizar page.tsx:
   - Passar flag de onboarding_completed para client
   - Server-side: calcular se steps estao completos

4. Celebracao ao completar:
   - XP event: dm:campaign_setup_complete
   - Animacao de confetti (usar lib existente se houver, senao CSS simples)
   - Transicao suave para grid normal

5. i18n: chaves PT-BR e EN para todos os textos
```

**Arquivos:**
- NOVO: `components/campaign/CampaignOnboardingChecklist.tsx`
- EDIT: `components/campaign/CampaignGrid.tsx`
- EDIT: `app/app/campaigns/[id]/page.tsx`
- EDIT: `lib/types/campaign-hub.ts`
- EDIT: `messages/pt-BR.json`, `messages/en.json`

**Criterio de done:** Campanha nova mostra checklist. Campanha com dados mostra grid. Transicao funciona. i18n completo.

---

### Agent 1C: Campaign Creation Wizard (DJ-A1)

> **Espera:** Agent 1A completar (precisa de `campaign_settings` table)

**Story:** DJ-A1 — Wizard de criacao de campanha com 2-3 passos
**Escopo:**

```
1. Criar CampaignCreationWizard.tsx:
   - Step 1: Nome (mantido) + Descricao opcional (textarea, max 200 chars)
   - Step 2: Configuracao (OPCIONAL — botao "Pular"):
     - Tipo: radio group (Campanha Longa | Oneshot | Dungeon Crawl)
     - Nivel do grupo: slider ou input (1-20, default 1)
     - Sistema: select (5e default, futuramente mais)
   - Step 3: Convide players (reutilizar InvitePlayerDialog internals)
   - Progress bar no topo mostrando step atual
   - "Voltar" em cada step
   - Mobile: steps full-width, botoes sticky no bottom

2. Integrar no CampaignManager.tsx:
   - "Nova Campanha" abre wizard (dialog ou sheet)
   - Ao completar step 1: cria campaign + campaign_settings
   - Ao completar step 2: atualiza campaign_settings
   - Ao completar step 3: redireciona para /app/campaigns/[id]

3. Integrar no OnboardingWizard.tsx:
   - Quando DM escolhe "Build Campaign", usar novo wizard
   - Manter compatibilidade com flow existente

4. Server actions:
   - createCampaignWithSettings(name, description, settings)
   - Transacao: campaign + campaign_settings + campaign_members (DM)

5. i18n: chaves PT-BR e EN
6. Analytics: campaign:created_with_wizard { has_description, has_type, has_level }
```

**Arquivos:**
- NOVO: `components/campaign/CampaignCreationWizard.tsx`
- EDIT: `components/dashboard/CampaignManager.tsx`
- EDIT: `components/onboarding/OnboardingWizard.tsx`
- NOVO ou EDIT: `lib/supabase/campaign-settings.ts`
- EDIT: `messages/pt-BR.json`, `messages/en.json`

**Criterio de done:** Wizard funciona no dashboard e onboarding. Campaign settings salvos. Steps opcionais funcionam. Mobile responsive.

---

### Agent 1D: Campaign Settings Page (DJ-A3)

> **Espera:** Agent 1A completar (precisa de `campaign_settings` table)

**Story:** DJ-A3 — Pagina de configuracoes da campanha
**Escopo:**

```
1. Criar CampaignSettings.tsx:
   - Header: "Configuracoes da Campanha"
   - Secao "Geral":
     - Nome da campanha (input, max 50)
     - Descricao (textarea, max 200)
     - Tipo (radio: Campanha Longa | Oneshot | Dungeon Crawl)
     - Nivel do grupo (number input 1-20)
     - Sistema (select, default 5e)
   - Secao "Convites":
     - Max players (number input, default 10)
     - Link de convite toggle (mover logica do InvitePlayerDialog)
     - Expiracao do link (select: 7d/30d/90d/Never)
   - Secao "Danger Zone" (border-red):
     - Arquivar campanha (botao amarelo) → CampaignArchiveDialog
     - Deletar permanentemente (botao vermelho) → confirmacao com nome
   - Auto-save com debounce 800ms (padrao DM Notes)
   - Save status indicator: idle | saving | saved | error

2. Registrar no CampaignFocusView.tsx:
   - Nova secao "settings" no switch
   - Guard: apenas owner (isOwner check)

3. Adicionar pill no CampaignNavBar.tsx:
   - "Settings" com icone de engrenagem
   - Apenas visivel para DM (owner)
   - Posicao: ultimo item

4. Server actions:
   - getCampaignSettings(campaignId)
   - updateCampaignSettings(campaignId, data)

5. i18n: chaves PT-BR e EN
```

**Arquivos:**
- NOVO: `components/campaign/CampaignSettings.tsx`
- EDIT: `components/campaign/CampaignFocusView.tsx`
- EDIT: `components/campaign/CampaignNavBar.tsx`
- EDIT: `lib/types/campaign-hub.ts`
- NOVO: `lib/supabase/campaign-settings.ts` (se nao criado pelo 1C)
- EDIT: `messages/pt-BR.json`, `messages/en.json`

**Criterio de done:** Settings acessivel no hub, auto-save funciona, danger zone com confirmacoes, i18n completo.

---

## Sprint 2: Core Features — "Session-First & Realtime"

**Objetivo:** Implementar sessao como unidade de trabalho e feedback realtime.
**Duracao estimada:** 1-2 dias com 4 agentes paralelos
**Pre-requisito:** Sprint 1 completo (migrations + settings)

### Agent 2A: Session Planning (DJ-B1)

**Story:** DJ-B1 — Session como unidade de trabalho
**Escopo:**

```
1. Criar SessionPlanner.tsx (dialog/sheet):
   - Nome da sessao (auto-fill: "Sessao N")
   - Data agendada (date picker)
   - Notas de preparacao (textarea markdown, max 5000)
   - Vincular encounters existentes (multi-select)
   - Botoes: "Salvar como planejada" | "Iniciar agora"

2. CTA no Campaign Hero:
   - "Planejar Proxima Sessao" (quando nao tem sessao planejada)
   - Abre SessionPlanner

3. Card de proxima sessao no Campaign Hub:
   - Destaque visual acima do grid
   - Mostra: nome, data (relativa), encounters vinculados
   - Botoes: "Editar" | "Iniciar" | "Cancelar"

4. Status workflow:
   - Planned → Active (DM clica "Iniciar")
   - Active → Completed (DM finaliza ultimo combate)
   - Planned → Cancelled (DM cancela)

5. Server actions:
   - createSession(campaignId, data)
   - updateSession(sessionId, data)
   - getPlannedSessions(campaignId)
   - startSession(sessionId) → status = 'active'

6. Atualizar CombatLaunchSheet:
   - Se tem sessao planejada, mostrar como opcao principal:
     "Iniciar Sessao: [nome]" com encounters vinculados

7. i18n
```

**Arquivos:**
- NOVO: `components/campaign/SessionPlanner.tsx`
- NOVO: `components/campaign/NextSessionCard.tsx`
- EDIT: `components/campaign/CampaignHero.tsx`
- EDIT: `components/campaign/CombatLaunchSheet.tsx`
- NOVO: `lib/supabase/campaign-sessions.ts`
- EDIT: `messages/pt-BR.json`, `messages/en.json`

**Criterio de done:** DM pode planejar, iniciar e cancelar sessoes. Card de proxima sessao aparece no hub. CombatLaunch integrado.

---

### Agent 2B: Session Recap & History (DJ-B2)

**Story:** DJ-B2 — Recap pos-sessao e timeline de sessoes
**Escopo:**

```
1. Criar SessionRecapDialog.tsx:
   - Trigger: ao finalizar ultimo combate de uma sessao
   - Textarea para recap (markdown, max 5000)
   - "Pular recap" (salva sessao como completed sem recap)
   - "Salvar" → sessions.recap + status = 'completed'

2. Criar SessionHistory.tsx (nova secao do hub):
   - Timeline vertical de sessoes (mais recente primeiro)
   - Cada card mostra:
     - "Sessao N: [nome]" + data
     - Status badge (planned/active/completed/cancelled)
     - Preview do recap (truncado 200 chars)
     - Stats agregados: X encounters, Y rounds, Z damage total
   - Click expande: recap completo + lista de encounters + stats detalhados
   - Empty state: "Nenhuma sessao registrada ainda"

3. Registrar no CampaignFocusView + NavBar:
   - Nova secao "sessions" — substitui "Encounters" como primeiro item
   - Encounters vira sub-secao de Sessions (ou mantem separado)

4. Player view:
   - Players podem ver recaps (read-only)
   - Players NAO veem prep_notes (DM only)

5. i18n
```

**Arquivos:**
- NOVO: `components/campaign/SessionRecapDialog.tsx`
- NOVO: `components/campaign/SessionHistory.tsx`
- EDIT: `components/campaign/CampaignFocusView.tsx`
- EDIT: `components/campaign/CampaignNavBar.tsx`
- EDIT: `components/session/CombatSessionClient.tsx` (trigger recap)
- EDIT: `messages/pt-BR.json`, `messages/en.json`

**Criterio de done:** DM pode escrever recap apos combate. Timeline de sessoes funciona. Player ve recaps.

---

### Agent 2C: Player Join Notification (DJ-C1)

**Story:** DJ-C1 — Notificacao realtime quando player entra
**Escopo:**

```
1. Criar campaign-membership-listener.ts:
   - Subscribe Supabase Realtime: campaign_members INSERT
   - Filter: campaign_id IN (campanhas do DM)
   - On event: buscar display_name do user que entrou
   - Dispatch toast notification

2. Integrar no Campaign Hub:
   - Hook: useCampaignMembershipListener(campaignId)
   - Toast: "🎉 [Name] entrou na campanha!"
   - Atualizar player count e avatares sem refresh

3. Integrar no Dashboard:
   - Hook: useDashboardMembershipListener(campaignIds[])
   - Toast: "[Name] entrou em [Campaign Name]!"
   - Atualizar player count nos cards

4. Badge "novo" no avatar:
   - CampaignPlayerAvatars: ring dourado pulsante em novos membros
   - Persiste ate DM clicar no avatar ou navegar para Players section
   - State local (nao precisa persistir em DB)

5. Sound effect (opcional):
   - Reutilizar infra do soundboard se disponivel
   - Fallback: sem som

6. Cleanup: unsubscribe on unmount
```

**Arquivos:**
- NOVO: `lib/realtime/campaign-membership-listener.ts`
- NOVO: `hooks/use-campaign-membership-listener.ts`
- EDIT: `components/campaign/CampaignHero.tsx`
- EDIT: `components/campaign/CampaignPlayerAvatars.tsx`
- EDIT: `components/dashboard/CampaignManager.tsx`

**Criterio de done:** DM ve toast quando player entra. Avatar com badge. Funciona no hub e dashboard.

---

### Agent 2D: Campaign Health Indicators (DJ-C2)

**Story:** DJ-C2 — Indicadores visuais de saude da campanha
**Escopo:**

```
1. Criar CampaignHealthBadge.tsx:
   - Badge para Dashboard cards:
     - "Ultima sessao: ha X dias" com cores (verde <7, amarelo <30, vermelho >30, cinza never)
     - "X/Y players prontos" (com character sheet)
   - Compact mode para cards, expanded mode para hub

2. Criar funcao calculateCampaignHealth():
   - Input: { playerCount, hasEncounter, sessionCount, lastSessionDate, notesCount, npcCount }
   - Output: { score: 0-100, level: 'new'|'growing'|'active'|'stale', components: [...] }
   - Criterios:
     - Tem players: 25 pts
     - Tem encounter preparado: 25 pts
     - Teve sessao: 25 pts
     - Tem conteudo (notes/NPCs): 25 pts

3. Progress bar no Campaign Hub:
   - Abaixo do Hero, sutil
   - 4 segmentos com labels
   - Tooltip explicando cada criterio
   - Apenas informativo — nao bloqueia nada

4. Dashboard integration:
   - Badge no canto inferior do campaign card
   - Cores e icones consistentes com o hub

5. i18n
```

**Arquivos:**
- NOVO: `components/campaign/CampaignHealthBadge.tsx`
- NOVO: `lib/utils/campaign-health.ts`
- EDIT: `components/dashboard/CampaignManager.tsx`
- EDIT: `components/campaign/CampaignHero.tsx`
- EDIT: `messages/pt-BR.json`, `messages/en.json`

**Criterio de done:** Badges visiveis no dashboard e hub. Calculo correto. Cores significativas. i18n.

---

## Sprint 3: Polish & Safety — "Hardening"

**Objetivo:** Seguranca, edge cases, e polish final.
**Duracao estimada:** 0.5-1 dia com 4-5 agentes paralelos
**Pre-requisito:** Sprint 2 completo

### Agent 3A: Campaign Archive / Soft Delete (DJ-D1)

**Story:** DJ-D1 — Substituir delete nuclear por archive
**Escopo:** Ver DJ-D1 no epic.

**Arquivos:**
- NOVO: `components/campaign/CampaignArchiveDialog.tsx`
- EDIT: `components/dashboard/CampaignManager.tsx`
- EDIT: `app/app/dashboard/campaigns/page.tsx`
- EDIT: `lib/supabase/campaign-membership.ts`

**Criterio de done:** Archive funciona, restaurar funciona, delete permanente exige nome, campanhas arquivadas filtradas por default.

---

### Agent 3B: Max Players Enforcement (DJ-D2)

**Story:** DJ-D2 — Enforcar limite no frontend e backend
**Escopo:** Ver DJ-D2 no epic.

**Arquivos:**
- EDIT: `components/campaign/JoinCampaignClient.tsx`
- EDIT: `app/api/campaign/[id]/join-link/route.ts`
- EDIT: RPC `accept_campaign_invite` (migration de alter)

**Criterio de done:** Join bloqueado quando campanha cheia, mensagem amigavel, DM pode alterar limite.

---

### Agent 3C: Join Code Expiration (DJ-D3)

**Story:** DJ-D3 — Expiracao configuraavel
**Escopo:** Ver DJ-D3 no epic.

**Arquivos:**
- EDIT: `app/api/campaign/[id]/join-link/route.ts`
- EDIT: `app/join-campaign/[code]/page.tsx`
- EDIT: `components/campaign/InvitePlayerDialog.tsx`
- EDIT: `components/campaign/CampaignSettings.tsx`

**Criterio de done:** Links expiram, mensagem amigavel, DM pode configurar, regenerar reseta timer.

---

### Agent 3D: Combat Launch UX (DJ-D4)

**Story:** DJ-D4 — Melhorar UX do CombatLaunchSheet
**Escopo:** Ver DJ-D4 no epic.

**Arquivos:**
- EDIT: `components/campaign/CombatLaunchSheet.tsx`
- EDIT: `messages/pt-BR.json`, `messages/en.json`

**Criterio de done:** 3 paths com descricao clara, sessao planejada como opcao principal, preset count visivel.

---

### Agent 3E: Quick Actions Contextuais (DJ-D5) + Session Hero (DJ-B3)

**Story:** DJ-D5 + DJ-B3 — Quick actions adaptivos + Hero session-first
**Escopo:** Ver DJ-D5 e DJ-B3 no epic.

**Arquivos:**
- EDIT: `components/campaign/CampaignHero.tsx`
- EDIT: `components/campaign/CampaignStatusCards.tsx`
- EDIT: `messages/pt-BR.json`, `messages/en.json`

**Criterio de done:** Quick actions mudam conforme estado, Hero mostra sessao como elemento principal, KPIs secundarios.

---

## Instrucoes para Execucao Multi-Agent

### Como usar este sprint plan com Claude Code

```bash
# Sprint 1: Executar migrations primeiro, depois 3 agentes paralelos
# Terminal 1 (Agent 1A — migrations)
claude "Execute Agent 1A from docs/sprint-plan-dm-journey-2026-04-10.md"

# Apos Agent 1A completar, em paralelo:
# Terminal 2 (Agent 1B — hub onboarding)
claude "Execute Agent 1B from docs/sprint-plan-dm-journey-2026-04-10.md"

# Terminal 3 (Agent 1C — creation wizard)
claude "Execute Agent 1C from docs/sprint-plan-dm-journey-2026-04-10.md"

# Terminal 4 (Agent 1D — settings page)
claude "Execute Agent 1D from docs/sprint-plan-dm-journey-2026-04-10.md"
```

### Regras de Paralelizacao

1. **NUNCA** dois agentes editam o mesmo arquivo simultaneamente
2. **Migrations** (Agent 1A) DEVEM completar antes dos outros agentes
3. Dentro do mesmo sprint, agentes sao independentes (exceto onde marcado)
4. Cada agente deve rodar `tsc --noEmit` ao final
5. Merge manual entre agentes quando tocam i18n (messages/*.json)

### Conflitos Potenciais de Arquivo

| Arquivo | Agentes que tocam | Resolucao |
|---------|-------------------|-----------|
| `messages/pt-BR.json` | Todos | Merge manual — cada agente usa namespace proprio |
| `messages/en.json` | Todos | Merge manual — cada agente usa namespace proprio |
| `CampaignHero.tsx` | 1B, 2A, 2C, 2D, 3E | Sprint 1: so 1B toca. Sprint 2: 2A e 2C em areas diferentes. Sprint 3: 3E finaliza |
| `CampaignFocusView.tsx` | 1D, 2B | Sprints diferentes — sem conflito |
| `campaign-hub.ts` | 1B, 1D, 2A, 2B | Cada agente adiciona types — merge simples |

### Namespace de i18n por Agente

Para evitar conflitos em messages/*.json:

| Agente | Namespace | Exemplo |
|--------|-----------|---------|
| 1B | `campaignOnboarding.*` | `campaignOnboarding.step1Title` |
| 1C | `campaignWizard.*` | `campaignWizard.stepName` |
| 1D | `campaignSettings.*` | `campaignSettings.general` |
| 2A | `sessionPlanner.*` | `sessionPlanner.planNext` |
| 2B | `sessionHistory.*` | `sessionHistory.recap` |
| 2D | `campaignHealth.*` | `campaignHealth.lastSession` |
| 3D | `combatLaunch.*` | `combatLaunch.newDescription` |
| 3E | `quickActions.*` | `quickActions.invitePlayers` |

---

## Checklist de Validacao pos-Sprint

### Sprint 1 Validation:

- [x] `tsc --noEmit` passa
- [ ] `next build` passa
- [x] i18n merge manual feito (sem chaves duplicadas)
- [ ] Teste manual: criar campanha nova → verificar onboarding
- [ ] Teste manual: campanha existente → verificar grid normal
- [ ] Teste manual: mobile responsive em todos componentes novos
- [x] Combat Parity Rule verificada — Sprint 1 eh DM-only, nao afeta Guest/Anon
- [x] SRD compliance — nenhum dado SRD envolvido

### Apos cada Sprint:

- [ ] `tsc --noEmit` passa
- [ ] `next build` passa
- [ ] i18n merge manual feito (sem chaves duplicadas)
- [ ] Teste manual: criar campanha nova → verificar onboarding
- [ ] Teste manual: campanha existente → verificar grid normal
- [ ] Teste manual: mobile responsive em todos componentes novos
- [ ] Combat Parity Rule verificada (Guest/Anon/Auth) — apenas para stories que tocam combate
- [ ] SRD compliance — nenhum dado nao-SRD exposto em paginas publicas

### Apos Sprint 3 (final):

- [ ] Jornada completa: Login → Create Campaign → Invite → Plan Session → Run Combat → Recap
- [ ] Player perspective: receber invite → join → ver campanha → ver recap
- [ ] Edge cases: campanha vazia, campanha cheia, link expirado, archive/restore
- [ ] Realtime: player join notifica DM, hub atualiza sem refresh
- [ ] Performance: Campaign Hub carrega em < 2s com 10 players e 20 sessoes

---

> **Referencia rapida:**
> - Analise completa: `docs/analise-jornada-dm-2026-04-10.md`
> - Epic com todas as stories: `docs/epic-dm-campaign-journey-v2.md`
> - Bucket de ideias futuras: `docs/bucket-future-ideas.md`
