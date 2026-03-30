# Prompt: QA Completo — Sprints 2, 3 e 4

> **Data:** 2026-03-30
> **Commits:** ae8eaec..1c6a9dc (14 commits)
> **Escopo:** 12 stories, 97 arquivos, ~8.900 linhas novas
> **Baseline de testes:** 876 pass, 27 skipped, 0 fail

---

## Objetivo

Executar QA completo sobre todas as features entregues nos Sprints 2, 3 e 4. Validar:
1. **Funcionalidade** — cada AC (acceptance criteria) de cada story
2. **Regressão** — features existentes continuam funcionando
3. **TypeScript** — zero erros `tsc`
4. **Testes** — zero falhas `jest`
5. **i18n** — zero texto hardcoded nos componentes novos
6. **RLS** — policies corretas nas 4 novas tabelas
7. **Responsividade** — mobile (375px) + tablet (768px) + desktop (1440px)
8. **Visual** — dark theme, gold/amber accents, consistência com design system

---

## Commits a Auditar

```
1c6a9dc chore: update package-lock.json after @xyflow/react install
2115a04 fix(tests): add missing mocks for NpcList tests
b008d2a feat(sprint4): Google OAuth in all touchpoints + skeletons + empty states + polish
fc9a7c3 feat(sprint4): add campaign mind map with ReactFlow graph visualization
56c49c5 feat(sprint3): link notes with NPCs — context network
0db77d3 feat(sprint3): campaign member management UI — list, invite, remove
f8cef08 feat(sprint3): add enhanced user profile page with avatar, plan badge, settings
9ecd437 feat(sprint3): character creation form, token upload, SRD race/class data
b11165b feat(sprint2): add NPC CRUD for campaigns with visibility toggle
393a5c9 feat(sprint2): add campaign note folders with private/shared visibility
da1cdec feat(sprint2): replace emojis with lucide-react icons in landing page
18258ab feat(sprint2): redesign dashboard with sidebar navigation and domain-based routes
```

---

## Fase 1: Validação Automatizada

### 1.1 TypeScript Strict
```bash
npx tsc --noEmit
```
**Esperado:** 0 erros.

### 1.2 Jest (Unit + Integration)
```bash
npx jest --passWithNoTests
```
**Esperado:** 876+ pass, 0 fail.

### 1.3 Playwright E2E (se configurado)
```bash
npx playwright test
```
**Esperado:** testes existentes continuam passando. Novos fluxos podem não ter E2E ainda.

### 1.4 i18n Audit
Verificar que TODAS as novas namespaces existem em ambos os arquivos:
- `messages/pt-BR.json`
- `messages/en.json`

**Namespaces novas a validar:**
- `sidebar` (9 keys)
- `notes` (18 keys)
- `npcs` (27 keys)
- `character` (20 keys)
- `members` (17 keys)
- `links` (6 keys)
- `profile` (28 keys)
- `mindmap` (10 keys)
- `empty_states` (5 keys)
- `auth.google_*` (3 keys)
- `landing.google_*` (2 keys)
- `dashboard.encounter_history_*` (12 keys)

**Método:** Para cada namespace, verificar que:
1. Existe em pt-BR.json
2. Existe en.json
3. Número de keys é igual em ambos
4. Nenhuma key tem valor vazio ou placeholder

### 1.5 Busca por Texto Hardcoded
```bash
grep -rn "\"[A-Z][a-z].*\"" components/dashboard/Dashboard*.tsx components/campaign/*.tsx components/character/*.tsx components/settings/*.tsx --include="*.tsx" | grep -v "import\|//\|jest\|test\|className\|data-testid\|aria-"
```
**Esperado:** zero strings de UI hardcoded nos componentes novos.

---

## Fase 2: Validação de Migrations e RLS

### 2.1 Migrations Sequenciais
Verificar que existem e são sequenciais:
- `supabase/migrations/042_campaign_note_folders.sql`
- `supabase/migrations/043_campaign_npcs.sql`
- `supabase/migrations/044_player_characters_extended.sql`
- `supabase/migrations/045_note_npc_links.sql`

### 2.2 RLS Policies — Verificação por Tabela

**`campaign_note_folders` (042):**
- [ ] Owner pode criar/editar/deletar pastas
- [ ] Member ativo pode LER pastas (para navegação de notas compartilhadas)
- [ ] Anon não tem acesso

**`campaign_notes` (update em 042):**
- [ ] `is_shared` column adicionada
- [ ] `folder_id` column adicionada
- [ ] Player member vê apenas notas com `is_shared = true`
- [ ] DM vê todas as notas

**`campaign_npcs` (043):**
- [ ] Owner pode CRUD completo
- [ ] Member ativo vê apenas NPCs com `is_visible_to_players = true`
- [ ] Anon não tem acesso

**`note_npc_links` (045):**
- [ ] Owner pode criar/deletar links
- [ ] Member ativo pode LER links de notas compartilhadas
- [ ] Anon não tem acesso

**`player_characters` (044):**
- [ ] Columns novas: `notes`, `token_url` (verificar que `race`, `class`, `level` já existiam)
- [ ] RLS existente continua funcionando

### 2.3 Teste Manual de RLS (se Supabase local disponível)
```bash
supabase db reset
supabase start
```
Testar com 2 usuários:
1. DM cria campanha, NPCs, notas → tudo visível para DM
2. Player aceita convite → vê apenas NPCs visíveis e notas compartilhadas

---

## Fase 3: Validação Funcional por Story

### Story 2.1 — Dashboard Sidebar
**Rota:** `/app/dashboard`

- [ ] Sidebar renderiza com 5 seções (Overview, Campanhas, Combates, Soundboard, Configurações)
- [ ] Ícones corretos (LayoutDashboard, Swords, ScrollText, Music, Settings)
- [ ] Rota ativa destacada com gold accent
- [ ] Navegação entre sub-rotas funciona:
  - `/app/dashboard` → Overview
  - `/app/dashboard/campaigns` → Lista de campanhas
  - `/app/dashboard/combats` → Histórico de combates
  - `/app/dashboard/soundboard` → Soundboard
  - `/app/dashboard/settings` → Perfil e configurações
- [ ] Quick Actions renderizam (Novo Combate, Criar NPC, Convidar)
- [ ] Quick Actions linkam corretamente
- [ ] **Mobile (375px):** Sidebar vira bottom nav com tabs
- [ ] **Desktop (1440px):** Sidebar fixa à esquerda
- [ ] DashboardContent.tsx original preservado (não deletado)

### Story 2.2 — Notas com Pastas
**Rota:** `/app/campaigns/[id]` → seção Notas

- [ ] GM cria pasta
- [ ] GM renomeia pasta
- [ ] GM deleta pasta (notas ficam "sem pasta")
- [ ] GM move nota para pasta
- [ ] Toggle privada/compartilhada funciona
- [ ] Badge visual: ícone Lock (privada) vs Eye (compartilhada)
- [ ] Filtro por pasta funciona
- [ ] Player vê apenas notas compartilhadas (testar com conta de player)
- [ ] i18n: trocar idioma e verificar labels

### Story 2.3 — CRUD NPCs
**Rota:** `/app/campaigns/[id]` → seção NPCs

- [ ] GM cria NPC (nome obrigatório)
- [ ] GM edita NPC (todos os campos)
- [ ] GM deleta NPC (confirmação aparece)
- [ ] Toggle visibilidade funciona (Eye/EyeOff)
- [ ] Stats editáveis: HP, AC, CR, Initiative Mod
- [ ] Avatar URL opcional (preview quando preenchido)
- [ ] Filtro: Todos / Visíveis / Ocultos
- [ ] Alternar vista: Grid vs Lista
- [ ] Empty state com CTA quando zero NPCs
- [ ] Player vê apenas NPCs visíveis

### Story 2.4 — Ícones Landing Page
**Rota:** `/` (landing page)

- [ ] 6 ícones lucide-react no lugar dos emojis
- [ ] Ícones: Swords, Smartphone, Sparkles, BookOpen, Save, Moon
- [ ] Estilo gold/amber consistente (`text-amber-400` + container circular)
- [ ] Responsivo (tamanho menor no mobile)
- [ ] Hover effect sutil

### Story 3.1 — Criação de Personagem
- [ ] Form de 1 tela com: Nome, Raça, Classe, Nível, HP, AC, Notas
- [ ] Select de raça com opções SRD 5e (2014 + 2024)
- [ ] Select de classe com opções SRD 5e (2014 + 2024)
- [ ] Nível: 1-20
- [ ] Personagem vinculado a campanha
- [ ] Validação: nome obrigatório

### Story 3.2 — Token Upload
- [ ] Upload de imagem funciona
- [ ] Drag-and-drop funciona
- [ ] Preview circular com gold ring
- [ ] Imagem salva no Supabase Storage (bucket `player-avatars`)
- [ ] Token aparece no card do personagem

### Story 3.3 — Gestão de Membros
**Rota:** `/app/campaigns/[id]` → seção Membros

- [ ] Lista de membros com roles (DM amber, Player emerald)
- [ ] Avatar com iniciais fallback
- [ ] Status: Ativo / Pendente
- [ ] Botão "Convidar" gera link
- [ ] Copiar link funciona
- [ ] Remover membro com confirmação
- [ ] Apenas owner vê botão remover
- [ ] Responsivo: cards empilhados no mobile, grid no desktop

### Story 3.4 — Notas↔NPCs
- [ ] GM vincula NPC a nota via tag selector
- [ ] Chips de NPC aparecem na nota (roxo/purple)
- [ ] Ao abrir NPC card, mostra notas relacionadas
- [ ] Ao abrir nota, mostra NPCs vinculados
- [ ] Desvincular funciona
- [ ] Dropdown de busca de NPCs funciona

### Story 3.5 — Perfil de Usuário
**Rota:** `/app/dashboard/settings`

- [ ] Avatar exibido (imagem ou iniciais)
- [ ] Nome e email do usuário
- [ ] Badge do plano: Free (cinza), Trial (amber), Pro (gold com coroa)
- [ ] Botão "Upgrade" para não-pro
- [ ] Select de idioma (pt-BR / en) funciona
- [ ] Toggle de tema (dark/light/system)
- [ ] Toggles de notificação (placeholder)

### Story 4.1 — Mind Map
**Rota:** `/app/campaigns/[id]` → seção Mapa Mental

- [ ] Grafo renderiza com @xyflow/react
- [ ] Nó central: Campanha (gold border)
- [ ] Nós: NPCs (purple), Notas (blue), Players (emerald)
- [ ] Edges conectando entidades
- [ ] Links Note↔NPC como edges adicionais
- [ ] Layout hierárquico automático (dagre)
- [ ] Pan e zoom funcionam
- [ ] MiniMap visível
- [ ] Dark theme no fundo do grafo
- [ ] Click em nó (comportamento esperado: log ou action)

### Story 4.2 — Google OAuth
- [ ] Botão Google na página de login
- [ ] Botão Google na página de signup
- [ ] Botão Google no GuestUpsellModal
- [ ] Botão Google no GuestBanner
- [ ] Botão Google no hero da landing page
- [ ] Botão Google no CTA final da landing page
- [ ] Visual consistente em todos os 6 locais
- [ ] Redirect correto após login

### Story 4.3 — Polish
- [ ] Skeletons em: campanhas, NPCs, membros, notas
- [ ] Empty states com CTAs em: membros, notas, combates
- [ ] EncounterHistory strings i18n (não hardcoded)
- [ ] CampaignNotes empty state com botão "Nova nota"
- [ ] Transições suaves (verificar framer-motion)

---

## Fase 4: Validação Visual e Responsividade

### 4.1 Viewports a Testar
| Viewport | Device | Prioridade |
|----------|--------|-----------|
| 375px | iPhone SE / mobile | Alta |
| 768px | iPad / tablet | Média |
| 1024px | Laptop | Média |
| 1440px | Desktop | Alta |

### 4.2 Checklist Visual por Viewport

**Mobile (375px):**
- [ ] Dashboard: bottom nav visível, sidebar escondida
- [ ] Cards: stack vertical, sem overflow horizontal
- [ ] Forms: full-width, inputs tocáveis (min 44px)
- [ ] Mind Map: pan/zoom funciona com touch
- [ ] Modals/Sheets: full-screen no mobile

**Desktop (1440px):**
- [ ] Dashboard: sidebar fixa à esquerda (w-64)
- [ ] Cards: grid 2-3 colunas
- [ ] Mind Map: grande área de visualização
- [ ] Dialogs: centered, not full-screen

### 4.3 Design System Consistency
- [ ] Fundo: `bg-surface-primary` ou `bg-[#1a1a2e]`
- [ ] Accents gold: `text-amber-400`, `bg-amber-400/10`
- [ ] Cards: `bg-card border border-border rounded-lg`
- [ ] Hover: `hover:border-white/20` ou `hover:border-amber-400/30`
- [ ] Fontes: consistentes com o resto do app
- [ ] Ícones: lucide-react em todos os componentes novos

---

## Fase 5: Regressão

### 5.1 Fluxos Críticos (NÃO devem ter quebrado)
- [ ] Login email/senha funciona
- [ ] Criar nova sessão de combate
- [ ] Buscar monstro SRD e adicionar ao combate
- [ ] Adicionar combatente manual
- [ ] Iniciar combate → initiative order
- [ ] Aplicar dano → HP tier visual
- [ ] Avançar turno
- [ ] Player join via link → vê combat view
- [ ] Salvar e retomar encontro
- [ ] Oracle de magias funciona
- [ ] Oracle de monstros funciona
- [ ] Soundboard funciona

### 5.2 E2E Journeys Existentes
```bash
npx playwright test e2e/journeys/dm-happy-path.spec.ts
npx playwright test e2e/visitor/landing-page.spec.ts
npx playwright test e2e/visitor/try-mode.spec.ts
```

---

## Fase 6: Relatório

### Template de Saída
```markdown
# QA Report — Sprints 2, 3, 4
**Data:** YYYY-MM-DD
**Executor:** [nome/agent]

## Resumo
- Total de checks: X
- Pass: X
- Fail: X
- Skip: X

## Falhas Encontradas
| # | Story | Severidade | Descrição | Arquivo | Fix Sugerido |
|---|-------|-----------|-----------|---------|-------------|
| 1 | X.X | Critical/Major/Minor | ... | ... | ... |

## Screenshots (se aplicável)
Salvar em `qa-evidence/sprint234/`

## Recomendações
- ...
```

### Severidade
- **Critical:** Feature não funciona, crash, data loss
- **Major:** Feature parcialmente funciona, UX ruim, acessibilidade
- **Minor:** Visual, polish, edge case

---

## Arquivos Novos a Auditar (97 total)

### Migrations (4)
- `supabase/migrations/042_campaign_note_folders.sql`
- `supabase/migrations/043_campaign_npcs.sql`
- `supabase/migrations/044_player_characters_extended.sql`
- `supabase/migrations/045_note_npc_links.sql`

### Componentes Novos (30+)
**Dashboard:**
- `components/dashboard/DashboardSidebar.tsx`
- `components/dashboard/DashboardLayout.tsx`
- `components/dashboard/DashboardOverview.tsx`
- `components/dashboard/QuickActions.tsx`
- `components/dashboard/CampaignCard.tsx`
- `components/dashboard/CombatHistoryCard.tsx`
- `components/dashboard/CampaignsPageClient.tsx`
- `components/dashboard/CombatsPageClient.tsx`
- `components/dashboard/SoundboardPageClient.tsx`

**Campaign:**
- `components/campaign/NotesFolderTree.tsx`
- `components/campaign/NoteCard.tsx`
- `components/campaign/NpcList.tsx`
- `components/campaign/NpcForm.tsx`
- `components/campaign/NpcCard.tsx`
- `components/campaign/NpcTagSelector.tsx`
- `components/campaign/MembersList.tsx`
- `components/campaign/MemberCard.tsx`
- `components/campaign/InviteMember.tsx`
- `components/campaign/CampaignMindMap.tsx`
- `components/campaign/nodes/CampaignNode.tsx`
- `components/campaign/nodes/NpcNode.tsx`
- `components/campaign/nodes/NoteNode.tsx`
- `components/campaign/nodes/PlayerNode.tsx`

**Character:**
- `components/character/CharacterForm.tsx`
- `components/character/CharacterCard.tsx`
- `components/character/TokenUpload.tsx`

**Settings:**
- `components/settings/UserProfile.tsx`
- `components/settings/SettingsForm.tsx`
- `components/settings/PlanBadge.tsx`
- `components/settings/DashboardSettingsClient.tsx`

**Auth/Marketing:**
- `components/auth/GoogleOAuthButton.tsx`
- `components/marketing/LandingGoogleButton.tsx`

**UI:**
- `components/ui/switch.tsx`
- `components/ui/skeletons/CampaignCardSkeleton.tsx`
- `components/ui/skeletons/NpcCardSkeleton.tsx`
- `components/ui/skeletons/MembersListSkeleton.tsx`
- `components/ui/skeletons/NotesListSkeleton.tsx`

### Lib (Types, Stores, Queries)
- `lib/types/campaign-npcs.ts`
- `lib/types/note-npc-links.ts`
- `lib/supabase/campaign-notes.ts`
- `lib/supabase/campaign-npcs.ts`
- `lib/supabase/note-npc-links.ts`
- `lib/data/races.ts`
- `lib/data/classes.ts`
- `lib/actions/invite-actions.ts`

### Rotas Novas
- `app/app/dashboard/layout.tsx`
- `app/app/dashboard/campaigns/page.tsx`
- `app/app/dashboard/combats/page.tsx`
- `app/app/dashboard/soundboard/page.tsx`
- `app/app/dashboard/settings/page.tsx`
