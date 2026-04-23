# Wireframe — Diário (notas + quests + NPCs + recaps + mini-wiki)

**Prereq:** [PRD §7.5](./PRD-EPICO-CONSOLIDADO.md) + decisões #24 (mini-wiki) #25 (quests via graph)
**Escopo:** Desktop + mobile + sub-abas + fluxos específicos.

---

## 1. Wireframe — Diário · desktop 1280-1440px

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ HEADER · TAB BAR · RIBBON VIVO                                                    │
├──────────────────────────────────────────────────────────────────────────────────┤
│ ┌─ SUB-NAV DIÁRIO ─────────────────────────────────────────────────────────────┐│
│ │ [📝 Rápidas] [📔 Minhas Notas] [🕰 Diário de Sessão]                          ││
│ │ [👤 NPCs] [🎯 Quests] [📬 Do Mestre (2)]                                      ││
│ └───────────────────────────────────────────────────────────────────────────────┘│
│                                                                                   │
│ ┌─ COL A (~440px) ────────────────┐  ┌─ COL B (~680px) ───────────────────────┐││
│ │ SUB-ABA ATIVA: MINHAS NOTAS     │  │ TIMELINE (cronológica)                ││
│ │                                 │  │                                       ││
│ │ [+ Nova Nota]  [🔍 buscar...]   │  │ Hoje                                  ││
│ │                                 │  │ ├── 14:30 · Nota rápida "Boris?"     ││
│ │ Tag filter: [todos] [#combate]  │  │ │                                    ││
│ │             [#roleplay]         │  │ Sexta · Sessão 12                    ││
│ │                                 │  │ ├── 22:14 · Combate Kobolds finalizado│
│ │ ┌───────────────────────────┐  │  │ ├── 22:00 · Recap publicado pelo     ││
│ │ │ Observações sobre Grolda  │  │  │ │            Mestre                   ││
│ │ │ #suspeita #teoria         │  │  │ │   "O grupo encontrou a espada..."   ││
│ │ │ editado há 2d             │  │  │ ├── 20:30 · Quest "Caça ao Dragão"   ││
│ │ └───────────────────────────┘  │  │ │            atualizada                ││
│ │ ┌───────────────────────────┐  │  │ ├── 20:15 · Nota "@Grolda mentiu"    ││
│ │ │ Sessão 11 — primeira vez  │  │  │                                      ││
│ │ │ com a espada              │  │  │ Quinta · Sessão 11                   ││
│ │ │ #loot                     │  │  │ ├── 22:00 · Recap publicado          ││
│ │ │ editado há 1sem           │  │  │ │   "Desceram nas Cavernas..."        ││
│ │ └───────────────────────────┘  │  │ ├── 18:30 · Quest "Caça ao Dragão"   ││
│ │                                 │  │ │            iniciada                 ││
│ │ [+ Nova Nota]                   │  │ │                                    ││
│ │                                 │  │ [Carregar mais ▾]                    ││
│ └─────────────────────────────────┘  └────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────────────────────────┘
```

**Layout:**
- Sub-nav horizontal no topo do tab (mais um nível abaixo do TabBar global)
- Col A (440px): sub-aba ativa com suas ações
- Col B (680px): timeline cronológica universal (eventos de todas as sub-abas)

---

## 2. Sub-abas do Diário

### 2.1 📝 Rápidas
**O que é:** Notas curtas criadas durante combate (via overlay) ou no quick-add. Não viram memória longa.
**UI:** lista chronológica, inline edit, filtros por tag auto-gerada (#combate, #roleplay, #loot).
**Retenção:** permanente (não são temporárias), mas geralmente baixa profundidade.

### 2.2 📔 Minhas Notas (mini-wiki — decisão #24)
**O que é:** Notas longas, organizadas, com backlinks. O diferencial do produto.
**UI:** lista de cards com título + tags + preview; click abre editor markdown.
**Features:**
- Título (opcional — deriva da 1ª linha)
- Tags array
- Content markdown com `@` autocomplete
- Auto-save 30s
- Search full-text local

### 2.3 🕰 Diário de Sessão
**O que é:** Visão cronológica das sessões jogadas, com recap publicado + notas pessoais do jogador por sessão.
**UI:** timeline vertical; click em sessão expande recap + notas associadas.
**Feature:** jogador pode adicionar nota "vinculada à sessão X" ao ler recap.

### 2.4 👤 NPCs (conhecidos pelo jogador)
**O que é:** Cards dos NPCs que o jogador já encontrou (via `campaign_mind_map_edges` `player → npc, rel='met'` ou similar).
**UI:** grid de cards tipo Pokédex; click abre drawer com:
- Nome em Cinzel gold
- Last known: "visto há 5d"
- Tags (ally, enemy, quest-giver, etc)
- Notes do jogador sobre esse NPC (section inline)
- Link "Ver no Mapa"

### 2.5 🎯 Quests (decisão #25 — via graph existente)
**O que é:** Quests ativas/completas visíveis ao jogador (via edges `participated_in` ou `attributed_to` no graph).
**UI:** cards de quest com status (ativa/completa/abandonada); click expande descrição + objetivos + NPCs ligados.
**Feature:** jogador pode anotar sobre a quest (player_quest_notes, mig 069 existente).

### 2.6 📬 Do Mestre
**O que é:** Inbox de mensagens/notas privadas enviadas pelo Mestre pro jogador.
**UI:** lista cronológica com badge de não-lida; click marca como lida.
**Realtime:** evento `note:received` → badge aparece na sub-aba + no tab Diário global.

### 2.7 ⭐ Biblioteca (decisão #39 · 2026-04-23)
**O que é:** Mini-wiki pessoal com tudo que o jogador favoritou do compêndio — magias, monstros, itens mágicos, feats, features e NPCs públicos. "O que eu conheço do mundo e quero lembrar rápido."
**Invocação tripla:**
- **Sub-aba Biblioteca** dentro do Diário (view curada com filtros)
- **Ctrl+K global** busca favoritos junto com compêndio do app
- **Botão ⭐ Favoritar** em TODA ficha do compêndio (qualquer lugar do app)

**UI da sub-aba:**
```
┌─ Sub-aba Biblioteca ───────────────────────────────────────┐
│ [🔍 buscar...]      [Todos] [🪄 Magias] [👹 Monstros]       │
│                     [⚔ Itens] [🎯 Feats] [🧝 NPCs]          │
├─────────────────────────────────────────────────────────────┤
│ ⭐ Fireball              3rd-level evocation   [⋯]          │
│    "minha go-to pra grupos grandes" · adicionado há 3d     │
│ ─────────────────────────────────────────────────────────── │
│ ⭐ Mind Flayer            CR 7 · aberration    [⋯]          │
│    "apareceu sessão 8 — medo!" · adicionado há 1sem        │
│ ─────────────────────────────────────────────────────────── │
│ ⭐ Vorpal Sword          Legendary · weapon    [⋯]          │
│    "Torin pegou — quero estudar" · adicionado há 2d        │
└─────────────────────────────────────────────────────────────┘
```

**Regras:**
- Cada entrada permite anotação pessoal opcional (text field)
- Click no card → abre ficha completa do SRD/compêndio em drawer
- Magias favoritadas TAMBÉM aparecem em **Herói > Spells conhecidas** filtro `[⭐ Favoritas]` (já no wireframe)
- Monstros/NPCs favoritados têm cross-nav pra Mapa se houver edge relacionada
- Auth-only; anônimo mostra prompt "Crie conta pra salvar"

**Schema:** nova migration `player_favorites` — ver PRD §10.2.

---

## 3. Wireframe — Diário · mobile 390px

```
┌─────────────────────────────────┐
│ ☰   Pocket DM     🔔 [●]         │
├─────────────────────────────────┤
│ ◄ Capa Barsavi · Nv10           │
├─────────────────────────────────┤
│ [⚔][🎒][📖●][🗺]  ← badge       │
├─────────────────────────────────┤
│ RIBBON (compacto)               │
├─────────────────────────────────┤
│ [Rápidas][Notas][Sessão]        │  ← sub-nav horizontal scroll
│ [NPCs][Quests][Mestre ●]        │
├─────────────────────────────────┤
│ SUB-ABA ATIVA                   │
│ (single-column, conteúdo full)  │
│                                 │
│ Timeline vira card colapsável   │
│ no fim da tela                  │
│                                 │
│ [▾ Ver Timeline completa]       │
└─────────────────────────────────┘
```

**Mobile:** timeline é acessada via botão expand — economiza espaço.

---

## 4. Zonas detalhadas

### 4.1 Editor de Minhas Notas

```
┌───────────────────────────────────────────────────┐
│ ◄ Voltar pra lista              [✓ Salvo há 15s]  │
│ ─────────────────────────────────────────────── │
│ Título                                            │
│ [Observações sobre Grolda                      ]  │
│                                                   │
│ Tags                                              │
│ #suspeita  #teoria  [+ tag]                      │
│                                                   │
│ Conteúdo                                          │
│ ┌───────────────────────────────────────────┐    │
│ │ A @Grolda mentiu sobre o baú.             │    │
│ │ Conferir com @Torin na próxima sessão.    │    │
│ │                                           │    │
│ │ Talvez ela seja aliada do                 │    │
│ │ @Culto Negro — verificar #teoria          │    │
│ │                                           │    │
│ │ _(Minha suspeita inicial)_                │    │
│ └───────────────────────────────────────────┘    │
│                                                   │
│ Menções detectadas: Grolda · Torin · Culto Negro │
└───────────────────────────────────────────────────┘
```

**Features:**
- `@` autocomplete com entidades da campanha (NPCs, Quests, Locations, Factions)
- Seleção vira chip gold clicável no render
- Edges `mentions` inseridos ao salvar
- Ctrl+S ou auto-save 30s
- Toolbar markdown simples: **bold** *italic* `code` `> quote`

### 4.2 Card de Quest

```
┌─ QUEST ACTIVE ───────────────────────────────────┐
│ 🎯 Caça ao Dragão                                │
│ Status: ●●○○ (progresso)         Nível: urgente  │
│                                                  │
│ Descrição:                                       │
│ "Grolda pediu que vocês parem o dragão          │
│  vermelho que assola Krynn."                    │
│                                                  │
│ NPCs ligados:                                    │
│ [@Grolda · quest-giver]                          │
│                                                  │
│ Localização:                                     │
│ [📍 Cavernas de Krynn · Câmara 3]               │
│                                                  │
│ Minhas notas sobre esta quest:                   │
│ ┌──────────────────────────────────────────┐   │
│ │ _"Grolda tá nervosa demais, pode ter     │   │
│ │  algo escondido"_                        │   │
│ └──────────────────────────────────────────┘   │
│ [✎ Editar nota]                                 │
│                                                  │
│ [Marcar como completa] [Abandonar]               │
└──────────────────────────────────────────────────┘
```

### 4.3 Card de NPC conhecido

```
┌───────────────────────────────────────┐
│ 👤 Grolda                              │
│    Anã · quest-giver                   │
│    Última vez: sexta 25/Abr (5d)       │
│                                        │
│    Humor: 😟 preocupada                │
│    Facção: — [link Mapa]               │
│                                        │
│    Tags: [quest-giver] [aliada]        │
│                                        │
│    Suas notas:                         │
│    "Mentiu sobre o baú — #suspeita"    │
│    "Pode ser aliada do Culto Negro"    │
│                                        │
│    [🗺 Ver no Mapa]                    │
└────────────────────────────────────────┘
```

---

## 5. Timeline (Col B)

**Visualização:**
- Hoje / Ontem / [Dia específico] como headers
- Eventos cronológicos em vertical:
  - 📝 Notas criadas (Rápidas + Minhas)
  - 🎯 Quests atualizadas/criadas
  - 📬 Notas do Mestre recebidas
  - 📖 Recaps publicados
  - ⚔ Combates finalizados (se houver meta interessante)

**Filtros:**
- Tipo: [Notas] [Quests] [Recaps] [Combates]
- Tag: [#combate] [#roleplay] [...]
- Busca: texto

**Click em evento:**
- Nota → abre editor
- Quest → abre card
- Recap → abre em modal ou página
- Combate → link pra Histórico (`/combat/[id]/history`)

---

## 6. Fluxos específicos do Diário

### 6.1 Criar nota rápida em combate (Fluxo 8)
1. Jogador em qualquer tab, combate ativo
2. FAB 📝 bottom-right OU tecla `N`
3. Overlay leve abre (não esconde combate)
4. Digita — contador de chars visível
5. Enter → salva em Rápidas + tag auto `#combate`
6. Fade-out 300ms
7. Toast "Nota salva em Diário"
8. Badge `[1]` aparece na aba Diário

### 6.2 Ler recap recém-publicado (Fluxo 9)
1. Push/badge avisa "Novo recap: Masmorra do Dragão"
2. Jogador abre Diário → sub-aba 🕰 Diário de Sessão
3. Última sessão tá no topo com badge "novo"
4. Click expande → recap completo renderizado
5. Chips clicáveis pra NPCs/Quests/Locations mencionados
6. Ao fim do recap: "Anotar algo sobre essa sessão?" CTA → cria nota vinculada

### 6.3 Receber nota privada do Mestre (Fluxo 7)
1. Realtime broadcast `note:received`
2. Badge `[N]` aparece no tab Diário global + na sub-aba Do Mestre
3. Se já em Diário > Do Mestre → nota nova aparece com fade-in + highlight 2s
4. Click marca como lida → badge decrementa

---

## 7. Empty states

### 7.1 Minhas Notas vazias
```
      📔
"Sua primeira nota. O que você quer lembrar?"

Sugestões:
• [Minhas impressões da 1ª sessão]
• [Um NPC que encontrei]
• [Livre]

[+ Nova Nota]
```

### 7.2 Sem recaps publicados ainda
```
      📖
"O Mestre ainda não publicou recaps"

Quando ele publicar, aparecem aqui.
```

### 7.3 Sem quests atribuídas
```
      🎯
"Sua participação em quests aparece aqui"

O Mestre vincula vocês às quests —
elas aparecem ordenadas por urgência.
```

---

## 8. Anônimo

**Permissões (conforme PRD §4.3):**
- ✅ Lê: Rápidas (do Mestre se compartilhadas), Diário de Sessão (recaps), NPCs conhecidos, Quests
- ❌ Não escreve: Minhas Notas (precisa conta)
- **Fallback:** sessionStorage temporário com prompt "Crie conta pra salvar permanentemente"

---

## 9. Referências código

- [components/player-hq/PlayerNotesSection.tsx](../../components/player-hq/PlayerNotesSection.tsx) — vira "Rápidas"
- [components/player-hq/QuickNotesList.tsx](../../components/player-hq/QuickNotesList.tsx) — mantido
- [components/player-hq/DmNotesInbox.tsx](../../components/player-hq/DmNotesInbox.tsx) — "Do Mestre"
- [components/player-hq/NpcJournal.tsx](../../components/player-hq/NpcJournal.tsx) + NpcCard — sub-aba NPCs
- [components/player-hq/PlayerQuestBoard.tsx](../../components/player-hq/PlayerQuestBoard.tsx) — sub-aba Quests
- **Novo:** `components/player-hq/diario/DiarioTab.tsx` — compositor de sub-abas
- **Novo:** `components/player-hq/diario/MinhasNotas.tsx` — editor markdown
- **Novo:** `components/player-hq/diario/SessionDiary.tsx` — timeline cronológica
- **Novo:** `components/player-hq/diario/DiarioTimeline.tsx` — Col B universal

---

## 10. A11y & mobile

- Sub-nav é `role="tablist"` + tabs são `role="tab"`
- Timeline é `<ol>` semântico com datetime proper
- Editor markdown: aria-multiline, shortcuts documentados
- Mobile: sub-nav horizontal scroll com fade indicator
- Mobile: timeline vira "ver mais" expansível (economia de tela)
