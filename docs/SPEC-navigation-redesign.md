# SPEC — Navigation Redesign (Menu Esquerdo + Quick Switcher)

> **Status:** Pronto para implementação
> **Origem:** Beta test F13 (Onda 2 do ROADMAP) + `docs/UX-benchmarks-modern-ludic.md` §5.3
> **Princípio:** Keyboard-first, sidebar esquerda universal, command palette unificado, lúdico na pele
> **Dependências upstream:** Onda 0 (Linguagem Ubíqua) concluída
> **Risco:** Médio-alto — refactor transversal. Mitigado via phased rollout (§10)
> **Data:** 2026-04-19

---

## 1. Problema

Hoje o PocketDM tem **duas estratégias de navegação inconsistentes** convivendo:

1. **Rotas `/app/dashboard/*` e `/app/compendium/*`** usam `DashboardLayout` com **sidebar esquerda collapsible** (`components/dashboard/DashboardSidebar.tsx`) + bottom tab bar no mobile. Este é o padrão moderno e o usuário nem reclama dele.
2. **Rotas `/app/*` em geral** (incluindo `/app/campaigns/[id]`) ficam apenas com o **topbar fixo** (`components/layout/Navbar.tsx` via `NavbarWithSync`). O "menu" principal vive num **dropdown na direita do header** (com Compêndio) + ações do Oracle à direita, e dentro da campanha existe um `CampaignSidebarIndex` (scroll anchor-nav) que é pequeno, à direita do conteúdo e não tem densidade de navegação global.

Consequência: ao abrir uma campanha (tela onde o mestre passa 80% do tempo), ele perde a sidebar esquerda do dashboard, e o "menu" aparenta estar à direita — exatamente o feedback F13:

> *"Na página principal, menu está muito escondido na DIREITA — mover pra ESQUERDA."*

Isso cria fricção de descoberta, inconsistência cognitiva entre rotas, e ausência de um entry point keyboard-first (Ctrl+K global hoje só atende o **Oracle** SRD — não acha campanhas, NPCs, locais, facções, personagens, ou rotas do app).

**Aparentemente já existe boa base** (sidebar collapsible de dashboard + `CommandPalette` do Oracle). O gap é: **unificar a sidebar em todas as rotas `/app/*`** e **expandir o Ctrl+K para ser um Quick Switcher universal** (não só SRD).

---

## 2. Visão (estado desejado)

Ao abrir **qualquer rota `/app/*`** (dashboard, campanha, personagem, compêndio, sessão, combate), o mestre vê uma **sidebar esquerda collapsible única**, com navegação global persistente + sub-navegação contextual quando está dentro de campanha/combate. Ao apertar **Ctrl/Cmd+K de qualquer lugar**, abre um overlay universal que busca em uma passada: ações rápidas, campanhas, personagens, entidades da campanha atual (NPCs, Locais, Facções), notas recentes, **e** o compêndio SRD existente. Keyboard-first ("g d" vai para dashboard, "g c" para campanhas, etc.). No mobile, a mesma sidebar vira drawer lateral acionado por hamburger — **sem duplicar componente, sem subset curado**.

Visualmente: iluminação dramática (§4.4 UX benchmark), halo dourado na rota ativa, dark mode default, texturas sutis. Remove a dependência do `Navbar` top como "menu principal" — ele vira **action bar puro** (sync dot, notifications, oracle AI, logout) ou é aposentado.

---

## 3. Arquitetura proposta

### 3.1 Desktop (viewport ≥ 1024px)

**Sidebar esquerda fixa** (`<AppSidebar />`), width **256px (expanded) / 64px (collapsed)**. Toggle persistido em `localStorage['pocketdm:sidebar:collapsed']`. Mantém a mesma largura/animation do `DashboardSidebar` atual (256/64 com framer-motion, ease 200ms) para preservar familiaridade.

Seções, de cima para baixo:

1. **Brand** — logo + "Pocket DM" (ou sync dot se numa sessão de combate — reutilizar `DmSyncDot`). Clique no logo = toggle collapse (já é padrão atual).
2. **Quick Switcher button** — linha destacada, label "Buscar · ⌘K", abre overlay Ctrl+K. Ícone de lupa.
3. **Primary nav** (sempre visível):
   - Dashboard `/app/dashboard`
   - Minhas campanhas `/app/dashboard/campaigns` — expansível; quando expandido, lista as 5 últimas campanhas visitadas (hook `useRecentCampaigns`).
   - Meus personagens `/app/dashboard/characters`
   - Combates `/app/dashboard/combats`
   - Compêndio `/app/compendium` (mantém rota atual)
   - Soundboard `/app/dashboard/soundboard`
   - Presets `/app/dashboard/presets` (DM-only, já filtrado por `hasDmAccess`)
4. **Current campaign section** (renderizada **apenas se `pathname.startsWith('/app/campaigns/')`**):
   - Título da campanha (breadcrumb) + link "Visão geral" → `/app/campaigns/[id]`.
   - Sub-itens de âncora (atual `CampaignSidebarIndex` migrado):
     - Encontros, Quests, Jogadores, NPCs, Locais, Facções, Notas, Inventário (DM-only), Mapa mental.
   - **Reutilizar `SECTIONS` / `SECTION_ICON_COLOR`** já definidos em `CampaignSidebarIndex.tsx`. Migra-se o componente de `hidden lg:block sticky` à direita para **seção inline da sidebar esquerda** — mesmo array de seções, mesmo mecanismo de scroll anchor (`router.push(#id)`).
5. **Mini mind-map footer** (opcional, Fase 3 do rollout — ver §10):
   - Colapsado por default. Exibe 6-8 últimas entidades visitadas como nós (Obsidian-inspired, §2.1 UX benchmark).
   - Placeholder "Teia recente (em breve)" na Fase 1 para preservar real estate.
6. **User footer**:
   - Avatar + nome (truncado); menu dropdown com Settings (`/app/dashboard/settings`), Notifications (reaproveita `NotificationBell`), LogoutButton.
   - `OracleAITrigger` migra pra cá como entrada secundária (ação rara, fora do caminho crítico).

**Main content** ganha `lg:ml-64` / `lg:ml-16` (depend. do collapse), sem `pt-[72px]` do navbar pré-existente — topo fica livre para a sidebar marcar a hierarquia visual.

### 3.2 Header/topbar — aposentar como navegação

O `Navbar`/`NavbarWithSync` atual tem hoje:
- Brand + links (compendium dropdown) + rightSlot (Notifications, OracleSearchTrigger, OracleAITrigger, Logout).

Na nova arquitetura:
- **Brand + links desktop** saem (vão pra sidebar).
- **Sync dot** e **mobile hamburger/search** permanecem em uma faixa superior minimalista **apenas em mobile** (ver §3.3) ou em **modo `minimal` (onboarding)** onde sidebar é suprimida.
- Em desktop, **`NavbarWithSync` não é renderizado** dentro do novo layout. A "action bar" (Notifications, Logout) vira rodapé da sidebar.

### 3.3 Mobile (< 1024px)

**Decisão:** **drawer lateral** (não bottom tab bar).

**Racional:**
- Reutiliza o mesmo componente da sidebar desktop — zero lógica duplicada (diferente do `DashboardSidebar` atual, que mantém dois arrays `NAV_ITEMS_DESKTOP_BASE` vs `NAV_ITEMS_MOBILE_PRIMARY` + `NAV_ITEMS_MOBILE_MORE_BASE`).
- Bottom tab bar exige curar subset (cabe só 4-5 itens) e conflita com o FAB do Oracle e `LazyOracleWidgets` que já moram no canto inferior.
- §4.6 UX benchmark: "mobile é target primário" → drawer dá acesso ao **mesmo 100%** da navegação desktop, essencial para o DM que usa mobile em sessão presencial.

**Mecânica mobile:**
- Faixa superior slim (48px, não os 72px atuais) contendo: hamburger (abre drawer) + brand/logo + ícone de busca (dispara Ctrl+K via `window.dispatchEvent` como já funciona no Navbar atual). Sync dot ao lado do brand se em combate.
- Drawer desliza da esquerda (240px width), backdrop preto 60%, `aria-modal=true`, **fecha ao clicar fora, tecla Esc, ou ao navegar** (padrão já implementado em `Navbar.tsx` via `useEffect([pathname])`).
- Conteúdo do drawer = **mesmo `<SidebarContent />` do desktop** (um único componente compartilhado, sem variante "mobile primary vs more").
- Ao fechar, foco retorna ao botão hamburger (WCAG 2.4.3).

**Bottom bar do `DashboardSidebar` atual é aposentada** — beta tester quer menu "à esquerda" de forma consistente; drawer entrega isso.

### 3.4 Quick Switcher (Ctrl+K / Cmd+K universal)

**Estratégia: estender o `CommandPalette` do Oracle existente**, não criar um componente paralelo. Já é `cmdk`-based, já escuta `Ctrl/Cmd+K` global, já tem debounce, ESC close, grupos agrupados, a11y, tracking. É a base ideal.

**Novos grupos a adicionar** (além de monsters/spells/items/feats/backgrounds/abilities/conditions já existentes):

| Grupo | Fonte | Aparece quando |
|---|---|---|
| Ações | array estático (`QUICK_ACTIONS`) | Sempre (primeiro grupo se query vazia) |
| Campanhas | `supabase.from('campaigns')` (já cacheada via hook) | Sempre |
| Personagens do usuário | `supabase.from('characters')` | Sempre |
| **Entidades da campanha atual** | NPCs + Locais + Facções + Quests | Apenas se `pathname.startsWith('/app/campaigns/')` |
| Notas recentes | `campaign_notes` ordenado por `updated_at` | Apenas dentro de campanha |

**Ações rápidas (`QUICK_ACTIONS`)** — PT-BR narrativo (§4.5 UX benchmark):
- "Iniciar combate" → `/app/combat/new` (DM-only, respeita `hasDmAccess`)
- "Dar vida a um NPC" → abre modal de criação de NPC (dentro de campanha) ou `/app/dashboard/campaigns` (fora)
- "Nova campanha" → `/app/dashboard/campaigns?new=1`
- "Abrir configurações" → `/app/dashboard/settings`
- "Alternar tema" → toggle dark/light (futuro — ver §9)

**Filter pills** — adicionar "Navegação" e "Campanha atual" aos pills existentes (all / monster / spell / item / feat / background / ability / condition).

**Reutiliza estado vazio atual** (hint narrativo em i18n key `command_palette.hint` a reescrever: "Busque qualquer coisa no seu mundo — campanhas, NPCs, locais, feitiços…").

### 3.5 Keyboard shortcuts globais

| Atalho | Ação |
|---|---|
| **Ctrl+K / Cmd+K** | Abrir Quick Switcher (já funciona, só amplia o conteúdo) |
| **Ctrl+B / Cmd+B** | Toggle sidebar collapse |
| **Ctrl+, / Cmd+,** | Abrir Settings |
| **g d** | Ir para Dashboard (chord 2 teclas, 800ms janela) |
| **g c** | Ir para Campanhas |
| **g p** | Ir para Meus personagens |
| **g s** | Ir para Compêndio (SRD) |
| **g o** | Ir para Soundboard |
| **?** | Abrir cheatsheet de atalhos (não reimplementar — reutiliza o padrão do `useCombatKeyboardShortcuts`) |

**Regras:**
- Desativar todos os atalhos quando `document.activeElement` é `<input>`, `<textarea>`, `[contenteditable]`, ou dentro de `.ProseMirror`.
- Atalhos não conflitam com atalhos de combate (`useCombatKeyboardShortcuts`) — os de combate só ativam quando `enabled=true` (durante combate ativo); fora disso, os globais tomam prioridade.
- Novo hook **`useKeyboardShortcut(keys, handler, options)`** em `lib/hooks/useKeyboardShortcut.ts` — genérico, suporta `ctrlKey/metaKey`, chords ("g d"), respeita inputs.

### 3.6 Persistência e estado

- **Collapse state:** `localStorage['pocketdm:sidebar:collapsed']` — boolean.
- **Rota ativa:** derivada de `usePathname()` (já padrão atual).
- **Last visited campaigns:** `localStorage['pocketdm:recent_campaigns']` — array `{id, name, visited_at}` com cap de 10. Alimenta o expansível "Minhas campanhas" + grupo "Campanhas" do Quick Switcher.
- **Last visited entities (para mini mind-map):** mesma estratégia, chave separada. Fase 3 do rollout.

### 3.7 Matriz Combat Parity (regra imutável)

| Seção | Guest (`/try`) | Anon (combate público) | Auth |
|---|---|---|---|
| Dashboard | — (não acessa `/app/*`) | — | ✓ |
| Campanhas | — | — | ✓ |
| Personagens | — | — | ✓ |
| Combates | — | — | ✓ |
| Compêndio | — | — | ✓ |
| Current campaign (contextual) | — | — | ✓ (só owner/member) |
| Quick Switcher | n/a (usa `PublicCommandPalette`) | n/a | ✓ (novo escopo) |

Rotas **guest** (`/try`) e **anon** (`/combat/join/[token]`) **não** usam `AppSidebar`. Mantêm o `PublicCommandPalette` existente + `PublicNavClient` (sem alterações neste spec). A sidebar é exclusiva de `/app/*`.

---

## 4. Componentes — criar / modificar / aposentar

### 4.1 A criar

| Arquivo | Propósito |
|---|---|
| `components/layout/AppSidebar.tsx` | Wrapper da sidebar global (desktop fixed + mobile drawer). Renderiza `<SidebarContent />` em ambos os modos. Possui lógica de collapse + drawer open. |
| `components/layout/SidebarContent.tsx` | Lista de seções (brand, switcher button, primary nav, current campaign, user footer). Recebe props `{ isOwner, hasDmAccess, currentCampaignId? }`. |
| `components/layout/SidebarSection.tsx` | Header collapsible + slot (agrupa "Minhas campanhas" expansível, "Campanha atual" expansível). |
| `components/layout/SidebarCampaignNav.tsx` | Migração de `CampaignSidebarIndex.tsx` para usar dentro da sidebar esquerda. Mantém o array `SECTIONS` + cores. Scroll anchor-nav intacto. |
| `components/layout/SidebarMiniMap.tsx` | Placeholder na Fase 1 ("Teia recente — em breve"); implementação real na Fase 3 após Entity Graph (Onda 3). |
| `components/layout/QuickActionsProvider.tsx` | Context que expõe `QUICK_ACTIONS` filtradas por permissões (DM-only, dentro de campanha, etc.). |
| `lib/hooks/useKeyboardShortcut.ts` | Hook genérico para atalhos globais (chord, ctrl/cmd, respeita inputs). |
| `lib/hooks/useRecentCampaigns.ts` | Mantém `localStorage` de campanhas visitadas. |
| `lib/hooks/useSidebarCollapse.ts` | Persiste + sincroniza collapse state entre abas (storage event listener). |
| `lib/hooks/useQuickSwitcherData.ts` | Agrega fontes (campanhas, personagens, entidades da campanha atual, notas recentes) para o overlay Ctrl+K. |
| `lib/quick-switcher/actions.ts` | Array `QUICK_ACTIONS` tipado + filtros por contexto. |

### 4.2 A modificar

| Arquivo | Mudança |
|---|---|
| `app/app/layout.tsx` | Substitui `<NavbarWithSync />` (desktop) por `<AppSidebar />`. Mobile-only: mantém um `<AppTopBar />` slim com hamburger + search + sync dot. Remove `pt-[72px]` do `<main>`. Passa `hasDmAccess` via server (igual `dashboard/layout.tsx` já faz). |
| `app/app/dashboard/layout.tsx` | **Remover** — a nova sidebar global substitui o `DashboardLayout`. Ou simplificar para passar apenas `showDashboardTour/tourSource/isPlayerFirstCampaign` para o provider de tour, sem renderizar sidebar local. |
| `components/dashboard/DashboardLayout.tsx` | Aposentar (ou reduzir a wrapper-só-de-tour). Nenhuma rota nova deve importá-lo. |
| `components/dashboard/DashboardSidebar.tsx` | **Absorvido por `AppSidebar`/`SidebarContent`**. Após migração 100% validada, deletar. Durante o rollout (§10 Fase 1), manter co-existindo atrás de feature flag. |
| `components/campaign/CampaignSidebarIndex.tsx` | Migrar lógica para `SidebarCampaignNav.tsx`. A remoção do sidebar index antigo da direita do conteúdo na campanha resolve F13 diretamente. |
| `app/app/campaigns/[id]/page.tsx` | Remover `<CampaignSidebarIndex />` do JSX (a nav contextual agora aparece na sidebar esquerda global). |
| `components/layout/NavbarWithSync.tsx` | Transformar em `<AppTopBar />` minimalista — só no mobile e no modo `minimal` (onboarding). Mantém `useDmChannelStatus` + `DmSyncDot`. |
| `components/layout/Navbar.tsx` | Simplificar: remove desktop links + dropdown menu + mobile drawer próprio (drawer agora é responsabilidade do `AppSidebar`). Em `minimal` (onboarding), continua funcionando como hoje. |
| `components/oracle/CommandPalette.tsx` | Adicionar novos grupos: ações, campanhas, personagens, entidades da campanha atual, notas recentes. Consumir `useQuickSwitcherData`. Adicionar 2 filter pills. Atualizar i18n `command_palette.*`. |
| `messages/pt-BR.json` + `messages/en.json` | Novas chaves: `sidebar.*`, `command_palette.group_actions`, `group_campaigns`, `group_characters`, `group_entities`, `group_notes`, plus copy narrativa §4.5. |

### 4.3 A aposentar (após rollout validado, Fase 3)

- `components/dashboard/DashboardLayout.tsx` (virou pass-through)
- `components/dashboard/DashboardSidebar.tsx` (absorvido)
- `components/campaign/CampaignSidebarIndex.tsx` (migrado)
- Testes em `components/dashboard/__tests__/DashboardSidebar.test.tsx` e `DashboardLayout.test.tsx` precisarão migrar para `components/layout/__tests__/AppSidebar.test.tsx`.

---

## 5. UX / interações específicas

### 5.1 Estado ativo e iluminação (§4.4 UX benchmark)

- Item ativo = **halo dourado sutil** (`box-shadow: var(--halo-active)`) + texto amber-400. Reutiliza tokens já propostos em UX benchmark §6.1.
- Item ao hover = `var(--halo-available)` + `bg-white/[0.06]`.
- Item disabled (DM-only para não-DM) = `var(--dim-inactive)` + cursor-not-allowed + tooltip explicativo ("Apenas mestres podem…").
- Respeita `prefers-reduced-motion` — remove animações de expand/collapse, mantém só crossfade 100ms.

### 5.2 Collapse vs drawer — fluxo

- Desktop: hover em item collapsed mostra **tooltip com label + atalho** ("Dashboard · g d").
- Mobile: ícone hamburger → drawer abre com animação slide-in-left (framer-motion, 200ms ease). Dentro do drawer, tap em item primário navega e **fecha** o drawer. Em itens expansíveis (Minhas campanhas), tap expande inline sem fechar.

### 5.3 Copy narrativa aplicada (§4.5)

| Label genérico (hoje) | Label narrativo (spec) |
|---|---|
| "Sidebar" | "Menu" (PT) / "Menu" (EN) |
| "Minhas campanhas" | manter (já narrativo-neutro) |
| "Novo combate" | "Iniciar combate" |
| "Convidar jogador" | "Chamar um aliado" |
| "Buscar…" (placeholder) | "Buscar em seu mundo…" |
| Empty state Quick Switcher | "O baú está vazio. Comece digitando." |

### 5.4 Loading / skeleton

- Sidebar em SSR: renderiza shell vazio com placeholders cinza (skeleton); itens carregam `hasDmAccess` no server (já feito no `dashboard/layout.tsx`) e hidratam sem flash.
- Quick Switcher: mantém `Command.Loading` + `Command.Empty` já implementados.

---

## 6. i18n

Chaves novas (namespace `sidebar`):

```
sidebar.brand = "Pocket DM"
sidebar.search_hint = "Buscar em seu mundo"
sidebar.search_kbd = "⌘K"
sidebar.section_primary = "Navegar"
sidebar.section_my_campaigns = "Minhas campanhas"
sidebar.section_current_campaign = "Campanha atual"
sidebar.mini_map_soon = "Teia recente — em breve"
sidebar.toggle_expand = "Expandir menu"
sidebar.toggle_collapse = "Recolher menu"
sidebar.open_drawer = "Abrir menu"
sidebar.close_drawer = "Fechar menu"
sidebar.user_settings = "Ajustes"
sidebar.user_signout = "Sair"
```

Chaves novas (namespace `command_palette`):

```
command_palette.group_actions = "Ações"
command_palette.group_campaigns = "Campanhas"
command_palette.group_characters = "Personagens"
command_palette.group_entities = "Nesta campanha"
command_palette.group_notes = "Notas recentes"
command_palette.filter_navigation = "Navegação"
command_palette.filter_current_campaign = "Esta campanha"
command_palette.action_start_combat = "Iniciar combate"
command_palette.action_new_npc = "Dar vida a um NPC"
command_palette.action_new_campaign = "Nova campanha"
command_palette.action_open_settings = "Abrir configurações"
```

Garantir paridade PT-BR / EN. Zero string hardcoded no layout.

---

## 7. Acessibilidade (WCAG 2.1 AA)

- `<aside role="navigation" aria-label="Menu principal">` na sidebar desktop.
- Drawer mobile `role="dialog" aria-modal="true" aria-labelledby="drawer-title"`.
- Toggle de collapse: `<button aria-expanded={!collapsed} aria-controls="app-sidebar-content">`.
- Itens ativos: `aria-current="page"` (já padrão atual — preservar).
- Skip nav link (`<a href="#main-content">`) preservado (existe hoje em `app/app/layout.tsx`).
- Foco visível em todos os itens (ring amber-400, já padrão atual).
- Drawer fecha com Esc; foco retorna ao hamburger (armazenar `lastFocused` em ref).
- Tab order: brand → search button → primary nav → current campaign (se houver) → user footer.
- Screen reader anuncia expansão de "Minhas campanhas" via `aria-expanded` no botão header.
- Quick Switcher: já herda a11y do `cmdk` (Command.Root é `role=combobox`, Command.List `role=listbox`, Command.Item `role=option` + `aria-selected`).
- `prefers-reduced-motion: reduce` → zera `framer-motion` transitions.
- Contraste: manter paleta atual (texto `muted-foreground` 60% sobre `background` passa AA; texto ativo `amber-400` sobre fundo escuro também passa).

---

## 8. Critérios de aceitação

- [ ] Sidebar esquerda visível em **toda rota `/app/*`** em desktop (`≥ 1024px`), incluindo `/app/campaigns/[id]`, `/app/dashboard/*`, `/app/compendium/*`, `/app/combat/*`, `/app/player-hq/*`.
- [ ] Toggle de collapse funciona com clique + Ctrl+B; estado persiste em `localStorage` e sincroniza entre abas.
- [ ] Mobile (`< 1024px`): hamburger abre drawer esquerdo com mesmo conteúdo; fecha em Esc, clique fora, ou navegação.
- [ ] Ctrl+K / Cmd+K abre Quick Switcher de qualquer rota autenticada; grupo "Nesta campanha" só aparece dentro de `/app/campaigns/[id]`.
- [ ] Quick Switcher retorna: ações, campanhas, personagens, entidades da campanha atual (NPCs/Locais/Facções), notas recentes, **e** resultados SRD (monsters/spells/etc.) — tudo numa única sessão de busca.
- [ ] Atalhos de chord `g d`, `g c`, `g p`, `g s`, `g o` navegam conforme tabela §3.5; não disparam em inputs/textarea/contenteditable.
- [ ] Rota ativa tem halo dourado (§5.1) + `aria-current="page"`.
- [ ] `CampaignSidebarIndex` antigo removido de `app/app/campaigns/[id]/page.tsx`; a sub-nav de campanha agora mora dentro de `AppSidebar`.
- [ ] `NavbarWithSync` não é renderizado em desktop para rotas `/app/*` (exceto onboarding).
- [ ] Dark mode default preservado (tokens existentes).
- [ ] i18n PT-BR / EN completas (zero missing keys em console).
- [ ] A11y: teclado navegável ponta-a-ponta; screen reader anuncia seções; `prefers-reduced-motion` respeitado.
- [ ] Build limpo; `pnpm rtk vitest` verde; E2E tours (dashboard/player) atualizados para novos seletores `[data-testid="app-sidebar"]`.
- [ ] Combat Parity: guest/anon não quebram — continuam usando `PublicCommandPalette` + `PublicNavClient`.

---

## 9. Fora de escopo

- **Customização do usuário** (reorder, hide items) — P2, Onda 6.
- **Nested folders/tags** na sidebar (Notion-style) — P2, depende de Entity Graph concluído.
- **Light mode polido** — paleta taverna default dark (§UX benchmark); light mode é ajuste futuro.
- **Drag-to-reorder** de itens da sidebar — P3.
- **Mini mind-map funcional** — placeholder na Fase 1; implementação real só quando Entity Graph (Onda 3) entregar dados de `campaign_mind_map_edges` prontos.
- **Tema pessoal da campanha** afetando sidebar (ex: tons diferentes por mundo) — P3.
- **Modo foco** (esconder sidebar temporariamente em sessão de combate ao vivo) — ideia boa mas fora do escopo; por ora o usuário pode colapsar manualmente com Ctrl+B.

---

## 10. Riscos & Rollout faseado

**Riscos principais:**
1. **Refactor transversal** — várias rotas tocam navegação. Mitigação: feature flag `NEXT_PUBLIC_FEATURE_NEW_SIDEBAR=true` inicialmente; renderiza ambas lado a lado em staging; flag-on em prod só após QA + canary.
2. **E2E tours quebram** — `components/tour/dashboard-tour-steps.ts` depende de seletores `data-tour-id` do `DashboardSidebar`. Mitigação: migrar seletores 1:1 ao criar `AppSidebar` (mesmos IDs: `dash-sidebar`, `dash-nav-combats`, `dash-nav-soundboard`, `dash-nav-compendium`, `dash-sidebar-actions`, `dash-bottom-nav`).
3. **Conflito de atalhos** — `useCombatKeyboardShortcuts` usa `C` (conditions), `D` (damage), `H` (heal), `?` (cheatsheet). Mitigação: chords `g _` não conflitam (segunda tecla sempre aguarda 800ms); Ctrl+B/Ctrl+K/Ctrl+, usam modifier, sem colisão.
4. **Mobile: perda do bottom bar** — hoje `DashboardSidebar` tem bottom bar com "More" menu familiar. Mitigação: copy "bottom bar → hamburger" no release note + quick tour no primeiro acesso após upgrade.

**Rollout em 3 fases:**

- **Fase 1 — Sidebar unificada (1 sprint, ~3-4 dias)**
  - `AppSidebar`, `SidebarContent`, `SidebarCampaignNav` (migração 1:1 do `DashboardSidebar` + `CampaignSidebarIndex`).
  - `app/app/layout.tsx` renderiza nova sidebar atrás de feature flag.
  - `app/app/dashboard/layout.tsx` simplificado.
  - `app/app/campaigns/[id]/page.tsx` remove sidebar-index direito.
  - `useSidebarCollapse`, `useRecentCampaigns`.
  - Mobile drawer (sem bottom bar).
  - **Deploy:** flag ON apenas para beta tester inicial (1 user). Valida F13.
  
- **Fase 2 — Quick Switcher universal (1 sprint, ~2-3 dias)**
  - Estende `CommandPalette` com novos grupos.
  - `useQuickSwitcherData`, `useKeyboardShortcut`, `lib/quick-switcher/actions.ts`.
  - Chords `g d/c/p/s/o` + Ctrl+B + Ctrl+,.
  - **Deploy:** flag ON para canary 10% → 100%.
  
- **Fase 3 — Polish + mini mind-map (1 sprint, depois da Onda 3)**
  - `SidebarMiniMap` real (depende de Entity Graph Fase 3a concluída).
  - Iluminação §4.4 refinada com tokens CSS novos.
  - Copy narrativa §4.5 completa.
  - Deleta `DashboardLayout.tsx`, `DashboardSidebar.tsx`, `CampaignSidebarIndex.tsx`.
  - Remove feature flag.

---

## 11. Regras imutáveis verificadas

- **Combat Parity:** Guest/anon inalterados; estrutura visual consistente quando há UI (§3.7 matriz).
- **Resilient Reconnection:** Zero mudança em canais Supabase, storage de combate, ou `useCombatResilience`. `DmSyncDot` apenas migra de local (brand do navbar → brand da sidebar).
- **RTK:** Toda task de Fase 1/2/3 prefixada com `pnpm rtk` (dev, vitest, build, lint). Nenhum novo comando direto `next`/`vitest`/`tsc`.

---

## 12. Referências

- `docs/UX-benchmarks-modern-ludic.md` §5.3 (Menu Redesign), §2.1 (Obsidian), §2.2 (Notion), §2.5 (Linear Cmd+K), §4.4 (iluminação), §4.5 (copy narrativa), §4.6 (mobile-first)
- `docs/ROADMAP-pos-linguagem-ubiqua.md` §Onda 2 (F13)
- `docs/beta-test-session-3-2026-04-16.md` §Bloco 2 (F13: "menu escondido à direita")
- `docs/PRD-entity-graph.md` §7.5 (painel de conexões na ficha — base do mini mind-map futuro) + §7.9 (Quick switcher)
- `docs/SPEC-campaign-dashboard-briefing.md` (Onda 2 companion — ambos devem chegar juntos)
