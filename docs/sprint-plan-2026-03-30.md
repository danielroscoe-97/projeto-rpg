# Sprint Plan — Pocket DM (2026-03-30)

> Plano de sprints gerado a partir de Party Mode session com análise competitiva do MasterApp.
> Bucket de ideias futuras: [bucket-future-ideas.md](bucket-future-ideas.md)
> PRD master: [prd-v2.md](prd-v2.md) | Epics master: [epics-and-sprints-spec.md](epics-and-sprints-spec.md)

---

## Filosofia de Produto

> "Simplificar pro momento da mesa. Só o que é relevante no momento de adrenalina.
> O que pode ser feito com calma, faz na ficha de papel." — Dani_

O mercado de RPG digital é poluído. Pocket DM se diferencia pela **simplicidade radical** no que importa: combate em tempo real, gestão leve de campanha, zero fricção pra começar.

---

## Sprint 1 — Estabilização & Quick Wins

**Duração:** 1 semana
**Objetivo:** Corrigir bugs, garantir paridade de combate guest/logado, converter guests em users.

### 1.1 Fix Logo PocketDM na LP
- **Tipo:** Bug fix
- **Esforço:** 30min
- **Arquivo:** `components/layout/Navbar.tsx`
- **Causas identificadas:**
  1. Link do logo sem `relative z-50` (linhas 54-62)
  2. `<img>` do logo sem `pointer-events-none` (linha 59)
  3. Mobile drawer `fixed inset-x-0 top-[72px] z-40` pode interceptar clicks (linha 135-136)
  4. `globals.css` linhas 108-116 cria competing z-index contexts
- **AC:** Logo clicável em todos os estados (scroll, mobile, hover, glass-nav)

### 1.2 Undo System no Guest Combat
- **Tipo:** Paridade
- **Esforço:** 1-2 dias
- **Contexto:** Logado tem `undoLastAction` com tracking de `undo_condition_add/remove`, `undo_turn`, `undo_hp`. Guest não tem nada.
- **Implementação:** Action stack local em localStorage no `GuestCombatClient.tsx`
- **Escopo do undo:**
  - Undo HP adjustment (damage/healing)
  - Undo condition add/remove
  - Undo turn advance
  - Undo defeat/revive
- **AC:** DM guest consegue desfazer última ação com botão ou Ctrl+Z

### 1.3 Hidden Combatants no Guest
- **Tipo:** Paridade
- **Esforço:** 2h
- **Contexto:** `GuestCombatClient.tsx` hardcodes `is_hidden: false`. Logado tem `onToggleHidden`.
- **AC:** DM guest consegue esconder/mostrar combatants (flag visual, sem broadcast pois não há players)

### 1.4 Keyboard Cheatsheet no Guest
- **Tipo:** Paridade
- **Esforço:** 1h
- **Contexto:** `KeyboardCheatsheet` componente existe no logado, falta importar no guest
- **AC:** Guest vê cheatsheet ao pressionar `?` ou botão de ajuda

### 1.5 Google Login no Fluxo "Compartilhar com Jogador"
- **Tipo:** Conversão (crítico)
- **Esforço:** 1 dia
- **Contexto:** Guest clica "Compartilhar" → hoje abre `GuestUpsellModal`. Precisa ter opção de login Google direto.
- **Fluxo:**
  1. Guest clica "Compartilhar com jogador"
  2. Modal mostra "Faça login com Google pra compartilhar" + botão Google OAuth
  3. Após login, redireciona de volta pra sessão (agora como user logado)
  4. Dados do guest combat são migrados pro user logado
- **Deps:** Supabase Auth já tem Google OAuth configurado (PKCE flow)
- **AC:** Guest consegue fazer login Google e compartilhar sessão sem perder dados do combate

### 1.6 Weather/Background como Teaser Upsell no Guest
- **Tipo:** Conversão
- **Esforço:** 4h
- **Contexto:** Weather effects e background selector existem no logado. No guest, mostrar botão mas ao clicar → upsell "Crie uma conta grátis pra customizar!"
- **AC:** Botões visíveis no guest, click abre upsell modal

---

## Sprint 2 — Dashboard v2 & Campaign Core

**Duração:** 2 semanas
**Objetivo:** Transformar dashboard de MVP em produto real. Gestão de campanha completa.

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
- **Referência:** MasterApp tem "Notas Privadas" e "Notas da Campanha" com pastas
- **Schema:** Adicionar campos `is_shared`, `folder_id` na tabela de notas (ou nova tabela `campaign_note_folders`)
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
    stats JSONB, -- {hp, ac, initiative_mod, etc}
    avatar_url TEXT,
    is_visible_to_players BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
  )
  ```
- **Componentes:** Lista de NPCs, form de criação/edição, toggle visibilidade
- **AC:** GM cria/edita/deleta NPCs. Pode marcar como visível pros jogadores. Stats básicos (HP, AC, etc).

### 2.4 Ícones RPG na Landing Page
- **Tipo:** Visual/Marketing
- **Esforço:** 1 dia
- **Plano:** Substituir emojis por SVGs do game-icons.net (CC BY 3.0)
- **Mapeamento:**
  | Seção | Emoji Atual | Ícone Novo |
  |-------|-------------|------------|
  | Combat Tracker | ⚔️ | `crossed-swords.svg` |
  | Player View RT | 📱 | `wireless.svg` ou custom |
  | Oráculo Magias | 🔮 | `crystal-ball.svg` |
  | Regras SRD | 📖 | `scroll-unfurled.svg` |
  | Salvar & Retomar | 💾 | `shield-reflect.svg` |
  | Dark Mode | 🌙 | `crescent-moon.svg` |
- **Arquivo:** `app/page.tsx` (linhas 264-305, FeaturesSection)
- **AC:** Ícones SVG estilizados com gold/amber no tema dark. Sem emojis na seção de features.

---

## Sprint 3 — Personagens & Engajamento

**Duração:** 2 semanas
**Objetivo:** Criação simplificada de personagem, tokens de player, gestão de membros.

### 3.1 Criação de Personagem Simplificada
- **Tipo:** Feature
- **Esforço:** 3 dias
- **Filosofia:** Só o essencial pra mesa. NÃO é ficha completa.
- **Campos:**
  - Nome (obrigatório)
  - Raça (select com opções SRD 5e)
  - Classe (select com opções SRD 5e)
  - HP máximo
  - AC (Armor Class)
  - Anotações livres (textarea)
- **Fluxo:** Form simples em 1 tela (NÃO wizard multi-step). Salva na campanha.
- **Schema:** Evoluir `player_characters` existente (adicionar `race`, `class`, `notes`)
- **AC:** Jogador/GM cria personagem com dados essenciais. Personagem fica vinculado à campanha.

### 3.2 Player Token Upload
- **Tipo:** Feature
- **Esforço:** 2 dias
- **Fluxo:**
  1. Jogador faz upload de foto na gestão de campanha
  2. Preview com crop circular automático
  3. Borda estilizada (igual tokens de monstro)
  4. Token salvo no Supabase Storage
- **Deps:** Supabase Storage bucket pra avatares
- **AC:** Jogador tem token personalizado que aparece no combate como os de monstro.

### 3.3 Cadastro de Jogadores na Campanha
- **Tipo:** Feature
- **Esforço:** 2 dias
- **Contexto:** `campaign_members` já existe. Evoluir a UI.
- **Funcionalidades:**
  - Lista de membros com role (DM/Player), status, personagem vinculado
  - Convidar por link (já existe)
  - Remover membro
  - Ver token/avatar do jogador
- **AC:** GM vê todos os membros da campanha, seus personagens e tokens.

### 3.4 Ligar Notas com NPCs
- **Tipo:** Feature
- **Esforço:** 1 dia
- **Contexto:** Nota pode referenciar NPC (e vice-versa). Cria rede de contexto.
- **Implementação:** Campo `linked_npcs[]` na nota, ou tabela junction `note_npc_links`
- **AC:** GM pode linkar NPC a nota. Ao abrir NPC, vê notas relacionadas.

### 3.5 Perfil de Usuário Melhorado
- **Tipo:** Visual
- **Esforço:** 1 dia
- **Referência:** MasterApp tem banner fantasy + avatar circular
- **AC:** Página de perfil com avatar, banner opcional, info do plano, settings rápidos.

---

## Sprint 4 — Mind Map & Polish

**Duração:** 1-2 semanas
**Objetivo:** Visualização de campanha, Google Login em mais lugares, polish geral.

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

### 4.2 Google Login em Pontos Estratégicos
- **Tipo:** Conversão
- **Esforço:** 1 dia
- **Locais identificados:**
  - Landing page (CTA principal)
  - Guest combat share flow (Sprint 1.5)
  - Guest banner ("Salve seu progresso")
  - Qualquer upsell modal
- **AC:** Botão "Login com Google" consistente em todos os touchpoints de conversão.

### 4.3 Polish Geral
- **Tipo:** Quality
- **Esforço:** 2-3 dias
- **Itens:**
  - Responsividade do novo dashboard
  - Transições e animações
  - Loading states consistentes
  - Empty states com CTAs úteis
  - i18n das novas features (PT-BR + EN)

---

## Resumo de Esforço

| Sprint | Duração | Items | Foco |
|--------|---------|-------|------|
| Sprint 1 | 1 semana | 6 items | Bug fix + Paridade + Conversão |
| Sprint 2 | 2 semanas | 4 items | Dashboard + Campaign Core |
| Sprint 3 | 2 semanas | 5 items | Personagens + Engajamento |
| Sprint 4 | 1-2 semanas | 3 items | Mind Map + Polish |
| **Total** | **~6-7 semanas** | **18 items** | |

---

## Análise Competitiva — Referência

Baseado na navegação completa do MasterApp (2026-03-30):
- Screenshots salvos em `qa-evidence/masterapp-*.png`
- Features deles mapeadas no relatório de Party Mode
- Diferenciais nossos: combate realtime, guest access, UX moderna, SRD real
- Gaps nossos: criação de personagem, XP/level, notas compartilhadas, visual bestiário

---

> **Criado:** 2026-03-30 — BMAD Party Mode
> **Aprovado por:** Dani_
> **Bucket futuro:** [bucket-future-ideas.md](bucket-future-ideas.md)
