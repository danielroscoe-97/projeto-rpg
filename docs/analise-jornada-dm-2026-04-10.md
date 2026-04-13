# Analise Completa: Jornada do Mestre (DM) — Criacao e Gestao de Campanha

**Data:** 2026-04-10
**Metodo:** Code review completo + Party Mode (PM, UX, Architect, Analyst)
**Autor:** BMAD Team + Claude Code
**Escopo:** Toda a experiencia do DM desde login ate gestao continua de campanha

---

## 1. Mapa da Jornada Atual

### 1.1 Fluxo Completo do DM

```
LOGIN/SIGNUP
  |
  v
ONBOARDING WIZARD (OnboardingWizard.tsx — 1534 linhas)
  |-- Step: Role Selection (player/dm/both)
  |-- Step: Welcome Screen
  |-- Step: Choose Path (Quick Combat | Build Campaign | Got Invite)
  |-- Step 1: Campaign Name (input, max 50 chars)
  |-- Step 2: Invite Players (link + QR | email)
  |-- Celebration: XP rewards (+25 campaign, +50 onboarding)
  |
  v
DASHBOARD (/app/dashboard)
  |-- DM Tables: grid de campaign cards
  |-- Player Tables: campanhas onde e jogador
  |-- Pending Invites: convites recebidos
  |-- Sidebar: Overview, Campaigns, Combats, Characters, Soundboard, Presets, Settings
  |
  v
CAMPAIGN HUB (/app/campaigns/[id])
  |-- OVERVIEW STATE (default)
  |   |-- Hero Section (nome, status, avatares dos players, KPIs)
  |   |-- Quick Actions (New Combat, New Encounter, New Note, New NPC)
  |   |-- Section Grid (3 grupos: Operational, World, Journal)
  |   |-- Sidebar Index
  |   
  |-- FOCUS STATE (?section=X)
  |   |-- Compact Hero (1 linha)
  |   |-- Sticky NavBar (pills horizontais)
  |   |-- Full-width section content
  |
  v
SECOES DISPONIVEIS (9 total)
  |-- Encounters: Builder + History
  |-- Quests: Board com status
  |-- Players: PlayerCharacterManager (cards, DM notes, tokens)
  |-- NPCs: CRUD com tags
  |-- Locations: CRUD com imagem
  |-- Factions: CRUD com alignment/goals
  |-- Notes: Folder tree + markdown
  |-- Inventory: Bag of Holding
  |-- Mindmap: Grafo visual de entidades
  |
  v
COMBATE
  |-- CombatLaunchSheet (3 paths: New | Preset | Quick)
  |-- /app/session/new?campaign=[id]
  |-- Session criada automaticamente
```

### 1.2 Modelo de Dados

| Tabela | Campos-Chave | RLS |
|--------|-------------|-----|
| `campaigns` | id, owner_id, name, join_code, join_code_active, max_players | Owner CRUD + Member SELECT |
| `campaign_members` | campaign_id, user_id, role (dm/player), status | Members SELECT + DM ALL + User DELETE own |
| `campaign_invites` | campaign_id, email, token, status, expires_at (7d) | DM ALL + Public read by token |
| `session_tokens` | session_id, token, player_name, anon_user_id, is_active | Session-scoped |
| `sessions` | campaign_id, owner_id, name, is_active | Owner CRUD + Member SELECT |
| `player_characters` | campaign_id, user_id, name, hp, ac, class, level, token_url | Owner + Member SELECT |

**Funcoes SECURITY DEFINER:**
- `is_campaign_member(campaign_id)` — checa membership ativa
- `is_session_campaign_member(session_id)` — chain session -> campaign -> member
- `is_encounter_campaign_member(encounter_id)` — chain encounter -> session -> campaign -> member
- `accept_campaign_invite(token)` — RPC com FOR UPDATE SKIP LOCKED

**APIs:**
- `POST/GET/DELETE /api/campaign/[id]/invites` — email invites (rate limit: 20/dia)
- `GET/PATCH/POST /api/campaign/[id]/join-link` — join code management

### 1.3 Fluxo de Convite

```
VIA LINK (primario):
  DM gera join code (8 chars) -> /join-campaign/[code]
  Player visita -> auth check -> JoinCampaignClient -> campaign_members criado
  DM pode: copiar, toggle ativo/inativo, regenerar

VIA EMAIL (secundario):
  DM digita email -> POST /api/campaign/[id]/invites
  Resend envia email branded -> Player clica link -> /auth/sign-up?invite=[token]
  Player cria conta/login -> accept_campaign_invite RPC -> campaign_members criado
  Expira em 7 dias. Rate limit 20/dia.
```

---

## 2. Critica Completa — Problemas Identificados

### 2.1 Problemas Estruturais (P0)

| # | Problema | Severidade | Componente |
|---|---------|-----------|------------|
| **C-01** | **Criacao de campanha e rasa demais** — so nome (max 50 chars), sem descricao, tema, sistema, nivel, nada | P0 | CampaignManager.tsx |
| **C-02** | **Empty state hell** — Campaign Hub mostra 9 cards com "0", intimidante pra DM novo | P0 | CampaignGrid.tsx |
| **C-03** | **Sem guided path** — DM cria campanha e nao sabe o proximo passo | P0 | CampaignHero.tsx |
| **C-04** | **Sessao nao e unidade de trabalho** — so container de combate, sem nome proprio, notas, prep, recap, agendamento | P0 | sessions table |
| **C-05** | **Sem notificacao realtime de player join** — DM nao sabe quando alguem entrou | P0 | InvitePlayerDialog.tsx |

### 2.2 Problemas de UX (P1)

| # | Problema | Severidade | Componente |
|---|---------|-----------|------------|
| **C-06** | **Onboarding wizard desconectado do Hub** — wizard cria campanha mas hub nao "lembra" onde DM parou | P1 | OnboardingWizard → CampaignHero |
| **C-07** | **CombatLaunchSheet tem 3 paths sem explicacao** — New vs Preset vs Quick confunde DM novo | P1 | CombatLaunchSheet.tsx |
| **C-08** | **Campaign delete e nuclear** — cascadeia tudo sem soft-delete, sem archive, sem warning de volume | P1 | CampaignManager.tsx |
| **C-09** | **Quick Actions genericos** — 4 botoes sem contexto situacional | P1 | CampaignHero.tsx |
| **C-10** | **Player hub passivo demais** — player ve campanha mas nao tem acoes proprias | P1 | CampaignFocusView.tsx |

### 2.3 Problemas Tecnicos (P1-P2)

| # | Problema | Severidade | Componente |
|---|---------|-----------|------------|
| **C-11** | **max_players nao enforced no frontend** — campo existe no DB mas JoinCampaignClient nao checa | P1 | JoinCampaignClient.tsx |
| **C-12** | **Join code sem expiracao** — uma vez gerado, vale pra sempre (risco de link vazado) | P2 | join-link API |
| **C-13** | **Sem tabela campaign_settings** — nao da pra customizar sistema, nivel, tema | P2 | Schema |
| **C-14** | **Sem realtime subscription no campaign hub** — DM precisa dar refresh pra ver mudancas | P1 | CampaignPage |
| **C-15** | **Mindmap renderiza vazio pra campanha nova** — sem dados = tela vazia inutil | P2 | CampaignMindMap.tsx |

---

## 3. Benchmarks de Mercado

### 3.1 Comparativo Funcional

| Feature | Roll20 | D&D Beyond | Foundry VTT | Alchemy RPG | **PocketDM** |
|---------|--------|-----------|-------------|-------------|-------------|
| Criacao guiada | Wizard 5 passos | Template-based | Import modulo | Wizard 3 passos | Solo nome |
| Campaign settings | Sistema, nivel, tipo | Source book linkado | Config extensivel | Sistema + tema | Nenhum |
| Session scheduling | Calendar integrado | Nao | Calendar + tracker | Nao | Nao |
| Session recap/log | Adventure log | Adventure Log | Journal entries | Session notes | Nao |
| Player readiness | "Ready" status visible | Character linked status | Ready check | Status indicators | Nao |
| Onboarding DM | Tutorial interativo | Guided setup | Docs extensos | Video + wizard | Tour basico |
| Campaign template | Marketplace ($$) | Source books ($$) | Modules (free+$$) | Presets | Nenhum |
| Invite flow | Link + LFG board | Manual/link | Password protect | Link | Link+Email+QR |
| Mobile DM | Ruim (desktop-first) | App nativo | Impossivel | Parcial | Responsivo |
| Empty state | Pre-populated | Guided cards | Module import | Starter kit | 9 zeros |
| Campaign health | Player list + last active | Character sync status | Module status | Dashboard | Nenhum |

### 3.2 Onde PocketDM JA Ganha

1. **Invite flow superior** — link + email + QR + toggle + regeneracao. Nenhum concorrente tem os 5.
2. **Mobile-first real** — unico VTT que funciona bem no celular do DM
3. **Simplicidade** — nao tenta ser tudo, foca no essencial (filosofia do projeto)
4. **Anti-metagaming nativo** — players NUNCA veem stats de monstros
5. **Dual-role por campanha** — uma conta, multiplos papeis

### 3.3 Onde PocketDM Precisa Evoluir (Priorizado)

1. **Session como unidade de trabalho** — padrao em D&D Beyond, Roll20, Foundry
2. **Campaign setup com contexto** — todo concorrente tem wizard ou template
3. **"Proxima sessao" como CTA principal** — e o que o DM quer ver ao abrir o app
4. **Contextual onboarding** — substituir 9 zeros por checklist progressivo
5. **Campaign health dashboard** — DM precisa saber se campanha esta "viva"

### 3.4 Boas Praticas de UX para Campaign Management

| Pratica | Fonte | Aplicacao PocketDM |
|---------|-------|-------------------|
| **Progressive disclosure** — mostrar so o que e relevante agora | Nielsen Norman | Substituir grid 9-zeros por checklist step-by-step |
| **Contextual actions** — botoes mudam conforme estado | Material Design | Quick Actions adaptivos (sem players? mostrar Invite. Sem encounter? mostrar Create) |
| **Celebracao de progresso** — feedback positivo em milestones | Duolingo/Gamification | XP ja existe, expandir pra completar secoes |
| **Zero-state design** — empty state e oportunidade, nao vazio | Basecamp | Cada secao vazia mostra CTA + preview do que sera |
| **Session-first design** — organizar em torno de sessoes | Roll20/Foundry | Hero mostra "proxima sessao" em vez de KPIs genericos |
| **Campaign health signals** — indicadores visuais de saude | Linear/Jira | Badge de "ultima sessao ha X dias", players ativos, etc |

---

## 4. Recomendacoes — Priorizadas

### P0 — Antes do Proximo Beta

| # | Recomendacao | Esforco | Impacto |
|---|-------------|---------|---------|
| R-01 | Contextual onboarding no Campaign Hub (substituir 9 zeros por checklist progressivo) | 4-6h | Alto — elimina "e agora?" |
| R-02 | Notificacao realtime quando player entra na campanha | 2-3h | Alto — DM sabe que invite funcionou |
| R-03 | Enforce max_players no frontend (JoinCampaignClient) | 1h | Medio — previne abuse |

### P1 — Proximo Sprint

| # | Recomendacao | Esforco | Impacto |
|---|-------------|---------|---------|
| R-04 | Session como unidade (nome, data, notas de prep, recap pos-sessao) | 8-12h | Alto — core workflow missing |
| R-05 | "Proxima sessao" como CTA hero do campaign hub | 2-3h | Alto — responde a pergunta #1 do DM |
| R-06 | Campaign creation wizard (nome + descricao + sistema + nivel) | 4-6h | Medio — primeira impressao |
| R-07 | Quick Actions contextuais (adaptam conforme estado da campanha) | 3-4h | Medio — reduz friccao |

### P2 — Proximo Mes

| # | Recomendacao | Esforco | Impacto |
|---|-------------|---------|---------|
| R-08 | Campaign soft-delete/archive (em vez de delete nuclear) | 3-4h | Medio — safety net |
| R-09 | Campaign health indicators (ultima sessao, players ativos, completude) | 4-6h | Medio — DM engagement |
| R-10 | Join code expiracao (30 dias default, configuravel) | 2h | Baixo — seguranca |
| R-11 | Campaign templates ("Oneshot", "Campanha Longa", "Dungeon Crawl") | 6-8h | Medio — onboarding |
| R-12 | Combat Launch UX (explicacao contextual dos 3 paths) | 2-3h | Baixo — clareza |

---

## 5. Arquivos de Referencia

### Paginas
- `app/app/dashboard/campaigns/page.tsx` — Dashboard de campanhas
- `app/app/campaigns/[id]/page.tsx` — Campaign Hub (overview + focus)
- `app/join-campaign/[code]/page.tsx` — Join via link
- `app/app/onboarding/page.tsx` — Onboarding wizard

### Componentes-Chave
- `components/dashboard/CampaignManager.tsx` — CRUD de campanhas
- `components/campaign/CampaignHero.tsx` — Hero section
- `components/campaign/CampaignGrid.tsx` — Grid de secoes
- `components/campaign/CampaignFocusView.tsx` — Focus view router
- `components/campaign/InvitePlayerDialog.tsx` — Dialog de convite
- `components/campaign/CombatLaunchSheet.tsx` — Lancador de combate
- `components/campaign/JoinCampaignClient.tsx` — Formulario de join
- `components/onboarding/OnboardingWizard.tsx` — Wizard de onboarding

### Server Logic
- `lib/supabase/campaign-membership.ts` — 10 funcoes de membership
- `lib/actions/invite-actions.ts` — Server actions de convite
- `app/api/campaign/[id]/invites/route.ts` — API de email invites
- `app/api/campaign/[id]/join-link/route.ts` — API de join code

### Migrations
- `001_initial_schema.sql` — campaigns table
- `025_campaign_invites.sql` — campaign_invites
- `032_campaign_membership_helpers.sql` — SECURITY DEFINER functions
- `033_campaign_members.sql` — campaign_members + trigger
- `035_update_rls_for_members.sql` — RLS member-based
- `036_accept_invite_function.sql` — RPC accept invite
- `039_campaigns_join_code.sql` — join_code fields

### Docs Relacionados
- `docs/epic-campaign-dual-role.md` — Epic original de dual-role
- `docs/spec-campaign-hub-v2.md` — Spec do redesign v2
- `docs/bucket-future-ideas.md` — Features adiadas (34 items)

---

> **Proximos passos:** Epic completo em `docs/epic-dm-campaign-journey-v2.md` + Sprint plans em `docs/sprint-plan-dm-journey-2026-04-10.md`
