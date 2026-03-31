# Sprint Plan — Pocket DM (2026-03-31)

> **Versão:** 2 — Repriorizado com base na análise competitiva completa (gap analysis, innovation strategy A+C, stress-test adversarial).
> **Estratégia:** Opção A+C — Combat Excellence + Blitzscale Brasil
> **Prioridade máxima:** Validar o viral loop (player engagement no celular) antes de tudo.
> **Docs de referência:**
> - [gap-analysis-competitors-2026-03-30.md](gap-analysis-competitors-2026-03-30.md)
> - [innovation-strategy.md](innovation-strategy.md)
> - [stress-test-strategy-ac-2026-03-30.md](stress-test-strategy-ac-2026-03-30.md)
> - [bucket-future-ideas.md](bucket-future-ideas.md)
> - PRD master: [prd-v2.md](prd-v2.md) | Epics master: [epics-and-sprints-spec.md](epics-and-sprints-spec.md)

---

## Filosofia de Produto

> "Simplificar pro momento da mesa. Só o que é relevante no momento de adrenalina.
> O que pode ser feito com calma, faz na ficha de papel." — Dani_

O mercado de RPG digital é poluído. Pocket DM se diferencia pela **simplicidade radical** no que importa: combate em tempo real, gestão leve de campanha, zero fricção pra começar.

**Ação #1 urgente (stress-test):** Validar que players realmente abrem o link no celular e acompanham o combate. Se isso não funcionar, o viral loop inteiro cai.

---

## Sprint 1 — "Validate the Loop" (1 semana)

**Objetivo:** Completar a paridade guest/logado + fechar o gap CRÍTICO de notifications para validar o viral loop em mesas reais.
**Métrica de validação:** Colocar em 3-5 mesas reais e medir quantos players abrem o link e ficam engajados.

### 1.1 Undo System no Guest Combat
- **Tipo:** Paridade
- **Esforço:** 1-2 dias
- **Arquivo:** `components/guest/GuestCombatClient.tsx`
- **Contexto:** Logado tem `undoLastAction` com tracking de `undo_condition_add/remove`, `undo_turn`, `undo_hp`. Guest não tem nada.
- **Implementação:** Action stack local em localStorage no `GuestCombatClient.tsx`
- **Escopo do undo:**
  - Undo HP adjustment (damage/healing)
  - Undo condition add/remove
  - Undo turn advance
  - Undo defeat/revive
- **AC:** DM guest consegue desfazer última ação com botão ou Ctrl+Z

### 1.2 Hidden Combatants no Guest
- **Tipo:** Paridade
- **Esforço:** 2h
- **Arquivo:** `components/guest/GuestCombatClient.tsx`
- **Contexto:** `GuestCombatClient.tsx` hardcodes `is_hidden: false`. Logado tem `onToggleHidden`.
- **AC:** DM guest consegue esconder/mostrar combatants (flag visual, sem broadcast pois não há players)

### 1.3 Keyboard Cheatsheet no Guest
- **Tipo:** Paridade
- **Esforço:** 1h
- **Contexto:** `KeyboardCheatsheet` componente existe no logado, falta importar no guest
- **AC:** Guest vê cheatsheet ao pressionar `?` ou botão de ajuda

### 1.4 Google Login no Fluxo "Compartilhar com Jogador"
- **Tipo:** Conversão (crítico para o viral loop)
- **Esforço:** 1 dia
- **Fluxo:**
  1. Guest clica "Compartilhar com jogador"
  2. Modal mostra "Faça login com Google pra compartilhar" + botão Google OAuth
  3. Após login, redireciona de volta pra sessão (agora como user logado)
  4. Dados do guest combat são migrados pro user logado
- **Deps:** Supabase Auth já tem Google OAuth configurado (PKCE flow)
- **AC:** Guest consegue fazer login Google e compartilhar sessão sem perder dados do combate

### 1.5 PWA Scaffolding + Turn Notifications Push
- **Tipo:** Feature crítica (Gap G-01 — CRÍTICO, G-02 infra)
- **Esforço:** 2-3 dias
- **Contexto:** Turn notifications é a "segunda metade" do real-time sync. Sem isso, a promessa de "players acompanham no celular" fica incompleta. PWA scaffolding prepara infra de service worker que G-02 (offline) usará depois.
- **Implementação:**
  - Service worker básico (`/public/sw.js`) com push subscription
  - Web Push API + VAPID keys (env vars)
  - Supabase edge function para disparar push quando turno muda
  - Player opt-in: "Ativar notificações de turno" na player view
- **AC:** Player recebe push notification "É a sua vez!" quando o DM avança o turno para o personagem dele

### 1.6 Fix Logo LP
- **Tipo:** Bug fix
- **Esforço:** 30min
- **Arquivo:** `components/layout/Navbar.tsx`
- **Causas identificadas:**
  1. Link do logo sem `relative z-50` (linhas 54-62)
  2. `<img>` do logo sem `pointer-events-none` (linha 59)
  3. Mobile drawer `fixed inset-x-0 top-[72px] z-40` pode interceptar clicks (linha 135-136)
  4. `globals.css` linhas 108-116 cria competing z-index contexts
- **AC:** Logo clicável em todos os estados (scroll, mobile, hover, glass-nav)

### 1.7 Weather/Background como Teaser Upsell no Guest
- **Tipo:** Conversão
- **Esforço:** 4h
- **Contexto:** Weather effects e background selector existem no logado. No guest, mostrar botão mas ao clicar → upsell "Crie uma conta grátis pra customizar!"
- **AC:** Botões visíveis no guest, click abre upsell modal

---

## Sprint 2 — "Combat Excellence" (2 semanas)

**Objetivo:** Dashboard v2, campaign core, fechar gaps de UX do core.

### 2.1 Redesign Dashboard com Sidebar
- **Tipo:** Redesign
- **Esforço:** 3-5 dias
- **Estrutura proposta:**
  ```
  /app/dashboard
    ├── /campaigns      → Lista + criar nova
    ├── /combats        → Sessões ativas + histórico
    ├── /soundboard     → Biblioteca de áudio
    └── /settings       → Perfil + preferências
  ```
- **Componentes:**
  - Sidebar esquerda com ícones RPG (espada, pergaminho, lira, engrenagem)
  - Cards grandes na área principal (campanha ativa, combate em andamento)
  - Quick actions no topo: "Novo Combate", "Criar NPC", "Convidar Jogador"
- **Arquivo principal:** `components/dashboard/DashboardContent.tsx` (refatorar)
- **AC:** Dashboard com navegação por domínio, responsivo, quick actions funcionais

### 2.2 Notas com Pastas (GM Privadas + Campanha Compartilhadas)
- **Tipo:** Feature
- **Esforço:** 2 dias
- **Contexto:** `CampaignNotes.tsx` já existe com notas do GM. Falta:
  1. Organização em pastas (tree view)
  2. Notas visíveis pros jogadores (compartilhadas)
  3. Diferenciação visual privada vs compartilhada
- **Schema:** Adicionar campos `is_shared`, `folder_id` na tabela de notas
- **AC:** GM cria notas em pastas, marca como privada ou compartilhada. Jogador vê só compartilhadas.

### 2.3 CRUD de NPCs na Campanha
- **Tipo:** Feature
- **Esforço:** 2 dias
- **Schema nova:**
  ```sql
  campaign_npcs (
    id UUID PRIMARY KEY,
    campaign_id UUID REFERENCES campaigns(id),
    name TEXT NOT NULL,
    description TEXT,
    stats JSONB,
    avatar_url TEXT,
    is_visible_to_players BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
  )
  ```
- **AC:** GM cria/edita/deleta NPCs. Pode marcar como visível pros jogadores. Stats básicos (HP, AC, etc).

### 2.4 Ícones RPG na Landing Page
- **Tipo:** Visual/Marketing
- **Esforço:** 1 dia
- **Plano:** Substituir emojis por SVGs do game-icons.net (CC BY 3.0)
- **Mapeamento:**
  | Seção | Emoji Atual | Ícone Novo |
  |-------|-------------|------------|
  | Combat Tracker | ⚔️ | `crossed-swords.svg` |
  | Player View RT | 📱 | `wireless.svg` |
  | Oráculo Magias | 🔮 | `crystal-ball.svg` |
  | Regras SRD | 📖 | `scroll-unfurled.svg` |
  | Salvar & Retomar | 💾 | `shield-reflect.svg` |
  | Dark Mode | 🌙 | `crescent-moon.svg` |
- **Arquivo:** `app/page.tsx` (seção FeaturesSection)
- **AC:** Ícones SVG estilizados com gold/amber no tema dark. Sem emojis na seção de features.

---

## Sprint 3 — "Player Gravity" (2 semanas)

**Objetivo:** Criar razões pro player voltar + gerar switching costs + session history.

### 3.1 Criação de Personagem Simplificada
- **Tipo:** Feature
- **Esforço:** 3 dias
- **Filosofia:** Só o essencial pra mesa. NÃO é ficha completa.
- **Campos:** Nome, Raça (select SRD), Classe (select SRD), HP máximo, AC, Anotações livres
- **Fluxo:** Form simples em 1 tela (NÃO wizard multi-step). Salva na campanha.
- **Schema:** Evoluir `player_characters` (adicionar `race`, `class`, `notes`)
- **AC:** Jogador/GM cria personagem com dados essenciais vinculado à campanha.

### 3.2 Player Token Upload
- **Tipo:** Feature
- **Esforço:** 2 dias
- **Fluxo:** Upload → crop circular automático → borda estilizada → Supabase Storage
- **AC:** Jogador tem token personalizado no combate.

### 3.3 Cadastro de Jogadores na Campanha
- **Tipo:** Feature
- **Esforço:** 2 dias
- **Funcionalidades:** Lista de membros, role (DM/Player), convidar por link, remover membro, ver token
- **AC:** GM vê todos os membros, seus personagens e tokens.

### 3.4 Ligar Notas com NPCs
- **Tipo:** Feature
- **Esforço:** 1 dia
- **Implementação:** Campo `linked_npcs[]` na nota ou tabela junction `note_npc_links`
- **AC:** GM pode linkar NPC a nota. Ao abrir NPC, vê notas relacionadas.

### 3.5 Session History Básico
- **Tipo:** Feature (Gap G-09)
- **Esforço:** 2 dias
- **Contexto:** Gera switching cost — DM perde histórico se trocar de ferramenta
- **Conteúdo mínimo:** data/hora, monstros na sessão, HP total gasto, quem morreu/desmaiou, duração do combate
- **AC:** GM vê lista de combates passados com resumo. Pode clicar pra ver detalhes.

---

## Sprint 4 — "Mind Map & Blitzscale Prep" (1-2 semanas)

**Objetivo:** Mind map de campanha, polish, preparar go-to-market BR.

### 4.1 Mind Map Básico da Campanha
- **Tipo:** Feature
- **Esforço:** 3 dias
- **Lib:** reactflow (já é React, boa integração)
- **Nós do grafo:**
  - Campanha (centro)
  - NPCs (conectados à campanha)
  - Notas (conectadas a NPCs e/ou campanha)
  - Encontros/Combates (conectados à campanha)
  - Jogadores (conectados à campanha)
- **Versão básica:** Sem IA. Dados vêm das relações já existentes no banco.
- **AC:** GM visualiza grafo da campanha com todos os elementos conectados. Pode clicar em nó pra abrir detalhe.

### 4.2 Google Login em Todos os Touchpoints
- **Tipo:** Conversão
- **Esforço:** 1 dia
- **Locais:** Landing page CTA, guest combat share flow, guest banner, qualquer upsell modal
- **AC:** Botão "Login com Google" consistente em todos os touchpoints de conversão.

### 4.3 Polish Geral
- **Tipo:** Quality
- **Esforço:** 2-3 dias
- **Itens:** Responsividade do novo dashboard, transições, loading states, empty states com CTAs, i18n das novas features (PT-BR + EN)

### 4.4 SRD Completo em PT-BR (Review & Gaps)
- **Tipo:** Conteúdo / Estratégia A (Blitzscale BR)
- **Esforço:** 1-2 dias
- **Contexto:** Diferencial competitivo no mercado BR. Auditar o que está traduzido, identificar gaps, completar.
- **AC:** 100% do conteúdo SRD disponível no app em PT-BR.

### 4.5 Quick Character Creator (SRD-based)
- **Tipo:** Feature (Gap G-05)
- **Esforço:** 2 dias
- **Contexto:** Reduz fricção pra DMs que não têm personagens pré-criados. Cria switching cost.
- **AC:** DM cria personagem SRD completo em <2 minutos a partir de classe/raça/nível.

---

## Resumo de Esforço

| Sprint | Duração | Items | Foco Estratégico |
|--------|---------|-------|-----------------|
| Sprint 1 | 1 semana | 7 items | Validar viral loop + paridade guest |
| Sprint 2 | 2 semanas | 4 items | Dashboard v2 + Campaign core |
| Sprint 3 | 2 semanas | 5 items | Player gravity + switching costs |
| Sprint 4 | 1-2 semanas | 5 items | Mind map + Blitzscale BR prep |
| **Total** | **~6-7 semanas** | **21 items** | |

---

## Hotfixes Aplicados

| Data | Fix | Causa Raiz | Migration |
|------|-----|------------|-----------|
| 2026-03-31 | 500 no signup anônimo (player join) | Trigger `create_user_onboarding` (046) não tratava users anônimos + `config.toml` com anonymous sign-ins desabilitado | `048_fix_anon_triggers.sql` |

**Detalhes do fix 048:**
- `handle_new_auth_user()`: reforçado com `EXCEPTION WHEN OTHERS` — nunca bloqueia signup
- `create_user_onboarding()`: adicionado skip para users anônimos (`email IS NULL`) + `EXCEPTION` guard
- `config.toml`: `enable_anonymous_sign_ins = true` (alinha dev local com produção)
- **Ação pós-deploy:** Rodar migration 048 no Supabase Dashboard (SQL Editor) para aplicar em produção

---

## Gaps Críticos Mapeados (Gap Analysis 2026-03-30)

| Gap | Prioridade | Sprint | Status |
|-----|-----------|--------|--------|
| G-01 Turn notifications push | CRÍTICO | Sprint 1.5 | Em dev |
| G-02 PWA/offline | ALTO | Sprint 1.5 (infra) | H2 completo |
| G-03 D&D Beyond character import | ALTO | Bucket — avaliar após PMF | Fora do roadmap |
| G-05 Quick character creator | MÉDIO | Sprint 4.5 | Novo |
| G-07 Dice roller | MÉDIO | **Bucket definitivo** | Mesa presencial usa dados físicos |
| G-09 Session history | MÉDIO | Sprint 3.5 | Novo |
| G-10 XP tracking | BAIXO | Bucket | Avaliar demanda |

---

## Referências Estratégicas

- **Inovação:** [innovation-strategy.md](innovation-strategy.md) — Estratégia A+C confirmada 2026-03-30
- **Gaps:** [gap-analysis-competitors-2026-03-30.md](gap-analysis-competitors-2026-03-30.md) — 9 concorrentes
- **Riscos:** [stress-test-strategy-ac-2026-03-30.md](stress-test-strategy-ac-2026-03-30.md) — ação #1: validar player engagement
- **Competidores:** [competitive-analysis-masterapp-2026-03-30.md](competitive-analysis-masterapp-2026-03-30.md)
- **Bucket:** [bucket-future-ideas.md](bucket-future-ideas.md)

---

> **Criado:** 2026-03-31 — BMAD Party Mode + Análise Competitiva Completa
> **Aprovado por:** Dani_
> **Versão anterior:** [sprint-plan-2026-03-30.md](sprint-plan-2026-03-30.md)
