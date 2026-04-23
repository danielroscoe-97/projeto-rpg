# Responsive Spec — Campaign HQ Redesign

**Escopo:** wireframes ASCII de todos os 8 viewports × role × mode, detalhados pra build em Figma hi-fi
**Breakpoints:** mobile <768 · tablet 768-1023 · desktop 1024-1439 · wide ≥1440
**Viewports de referência:** mobile 390×844 · tablet 1024×768 · desktop 1440×900
**Relaciona-se com:** [DESIGN-SYSTEM.md](./DESIGN-SYSTEM.md) · [02-component-library.md](./02-component-library.md)

---

## 0. Regras globais de responsividade

1. **Shell muda em 1024px.** Abaixo: hamburger drawer + bottom tab bar. Acima: sidebar vertical persistente.
2. **Sidebar em tablet.** 768-1023: collapsed default (80px, só ícones).
3. **Cards 2-column viram 1-column em <768.**
4. **Serif (Cinzel) reduz 1 step em mobile** (display 32→24, h1 24→20).
5. **Touch targets ≥ 44×44 em mobile.**
6. **Safe-area-inset-bottom respeitado em iOS.**
7. **Nenhum texto crítico pode quebrar linha (truncate com ellipsis + tooltip).**
8. **Overflow horizontal: JAMAIS** (antipattern F-01 matou isso no redesign).

---

## 1. W0a — Dashboard vazio (primeiro login, 0 campanhas)

### 1.1 Desktop 1440×900

```
┌───────────────────────────────────────────────────────────────────────────┐
│ [Logo gold] Pocket DM            🔍 Buscar rápida [Ctrl+K]     🔔 [D]▾    │
├──────────┬────────────────────────────────────────────────────────────────┤
│ 📋 Camp.│                                                                 │
│ ⚔ Comb.│                                                                 │
│ 👥 Pers.│              Bem-vindo, Dani                                   │
│ 📚 Comp.│                                                                 │
│          │       Você ainda não tem campanhas.                            │
│          │                                                                │
│          │      ╭──────────────────────────────────╮                     │
│          │      │                                  │                     │
│          │      │    [ico Swords] Criar campanha  │                     │
│          │      │                                  │                     │
│          │      │    Como Mestre: você cria mundo,│                     │
│          │      │    convida até 6 jogadores      │                     │
│          │      │                                  │                     │
│          │      │    [ Começar → ]                │                     │
│          │      │                                  │                     │
│          │      ╰──────────────────────────────────╯                     │
│          │                                                                │
│          │              ─── OU ───                                        │
│          │                                                                │
│          │      Tem um convite do Mestre? Cole o link:                   │
│          │      ┌──────────────────────────────┐                        │
│          │      │ https://pocketdm.com.br/... │  [Entrar]              │
│          │      └──────────────────────────────┘                        │
│          │                                                                │
│          │      [ico Play] Ver como funciona (tour 2min)                │
│          │                                                                │
└──────────┴────────────────────────────────────────────────────────────────┘
```

**Especs:**
- Sidebar: 220px, mostra só itens globais (campanhas globais, combates, personagens, compêndio — 4 itens)
- Main content: centralizado, max-width 560px
- Primary card: border-gold/35%, padding-8, shadow-md
- Divider "OU": text-muted, micro caps, center-aligned com hairline
- CTA "Começar": variante `primary-gold`, size `lg`
- CTA "Entrar": variante `secondary` (ghost), size `md`
- Input de convite: full-width dentro do max 560px, altura 44

### 1.2 Mobile 390×844

```
┌─────────────────────────────┐
│ ☰  Pocket DM            [D] │ ← 56px topbar
├─────────────────────────────┤
│                             │
│   Bem-vindo, Dani           │
│                             │
│   Você ainda não tem        │
│   campanhas.                │
│                             │
│  ╭───────────────────────╮  │
│  │ [ico Swords 24 gold]  │  │
│  │                       │  │
│  │ Criar campanha        │  │
│  │                       │  │
│  │ Como Mestre: você cria│  │
│  │ mundo, convida até 6  │  │
│  │ jogadores             │  │
│  │                       │  │
│  │ [ Começar → ]         │  │ ← button w-full
│  ╰───────────────────────╯  │
│                             │
│        ─── OU ───           │
│                             │
│  Tem um convite do Mestre?  │
│  Cole o link aqui:          │
│  ┌─────────────────────┐    │
│  │ https://pocketdm... │    │
│  └─────────────────────┘    │
│  [ Entrar ]                 │
│                             │
│  [ico Play] Tour 2min       │
│                             │
│  (safe-area-inset-bottom)   │
└─────────────────────────────┘
```

**Diffs vs desktop:**
- Topbar 56px com hamburger (sidebar-drawer acionado)
- Sem bottom tab bar (ainda não tem campanha, não faz sentido)
- Primary CTA: w-full dentro do card
- Input de convite: empilhado sobre o botão Entrar (não side-by-side)

### 1.3 Tablet 1024×768

Igual desktop, mas:
- Sidebar: collapsed (80px)
- Main content max-width 560px → 640px (aproveita espaço)
- Logo+label no topbar podem encolher pra só logo

---

## 2. W0b — Campaign HQ vazia (campanha recém-criada, Preparar mode)

### 2.1 Desktop 1440×900
*(já spec'd nos wireframes no Figma — ver screenshot)*

**Especs não cobertos:**
- Welcome banner com 🎉 emoji (narrativo) — Inter Semi Bold 24px
- 3 step cards com badge numerada gold/15% fill + border gold/35%
- Step CTA primary: background gold, text BG, padding y-2 x-4
- Tour banner: `info` variant, border info/30%, chevron de "Pular ×" à direita
- Spacing vertical: h1 → gap-5 → step 1 → gap-4 → step 2 → gap-4 → step 3 → gap-5 → tour

### 2.2 Mobile 390×844

```
┌─────────────────────────────┐
│ ☰  Krynn · Prep         [D] │
├─────────────────────────────┤
│                             │
│  🎉 Campanha criada!        │
│                             │
│  Vamos preparar a primeira  │
│  sessão? 3 passos — ou pule │
│  e explore.                 │
│                             │
│  ╭─────────────────────╮    │
│  │ [1]  Convide jogadores│  │
│  │                       │  │
│  │ Mande link de convite │  │
│  │                       │  │
│  │ [ico Mail] Convidar   │  │
│  │ por link              │  │
│  │ [ Pular ]             │  │
│  ╰─────────────────────╯    │
│                             │
│  ╭─────────────────────╮    │
│  │ [2]  Primeira sessão  │  │
│  │ Quando é? Dê um nome  │  │
│  │ [ico Cal] Agendar →   │  │
│  ╰─────────────────────╯    │
│                             │
│  ╭─────────────────────╮    │
│  │ [3]  Preencher mundo  │  │
│  │ Templates do compêndio│  │
│  │ [+NPC][+Loc][+Facç][+Q]│ │ ← horizontal scroll chips
│  ╰─────────────────────╯    │
│                             │
│  ╭─────────────────────╮    │
│  │ [ico Play] Tour 30s   │  │
│  │ Preparar/Rodar/Recap  │  │
│  │ [ Pular × ]           │  │
│  ╰─────────────────────╯    │
│                             │
├─────────────────────────────┤
│ [Prep*] [ Mesa ] [Recap]   │ ← bottom tab bar
└─────────────────────────────┘
```

**Diffs mobile-specific:**
- Badge numerada: 32px em vez de 40
- CTAs empilhadas ao invés de row
- Step 3: chips horizontal-scroll (overflow-x-auto OK aqui porque **são CTAs de ação, não nav principal** — safe-area horizontal)
- Bottom tab bar: 64px + safe-area; active state com gold/15% bg

### 2.3 Tablet 1024×768

Layout desktop mas:
- Sidebar collapsed (80px)
- Cards em grid 1-column (não 2, não tem 2 itens competindo)
- Welcome: padding reduzido

---

## 3. W1 — Preparar populada (Krynn, Sess. 12)

### 3.1 Desktop 1440×900
*(já no Figma — ver screenshot + redesign-proposal §7)*

### 3.2 Mobile 390×844 — redesign W5 original

```
┌─────────────────────────────┐
│ ☰  Krynn · Prep    [bell][D]│
│   Sess. 12 em 2 dias [gold] │
├─────────────────────────────┤
│                             │
│  PRÓXIMA SESSÃO #12  [✎]    │
│  Masmorra do Dragão         │ ← Cinzel 20
│                             │
│  [ico Cal] Sex 25/Abr · 20h │
│  [ico Clock] ~ 4h           │
│  [ico Pin] Cavernas · Câm.3 │
│                             │
│  🎯 Grupo persegue o dragão │ ← narrative emoji OK
│  fugido para a masmorra.    │
│                             │
│ ─────────────────────────── │
│                             │
│  PREPARADO (2)              │
│  [✓gold] Encontro: Kobolds  │ ← CheckCircle SVG success
│  [✓gold] NPC: Grolda        │
│                             │
│  PENDENTE (2)               │
│  [○muted] Encontro boss     │ ← Circle SVG muted
│  [○muted] Recap sess. 11    │
│                             │
│ ─────────────────────────── │
│                             │
│  ⚡ Adicionar rápido:       │ ← narrative emoji OK
│  [+Enc][+NPC][+Not][+Qst]   │ ← horizontal scroll chips
│                             │
│ ─────────────────────────── │
│                             │
│  ATIVIDADE RECENTE          │
│  [ico User] NPC Grolda      │
│  editada — @preocupada      │
│  há 5min                    │
│                             │
│  [ico File] Nota @masmorra  │
│  'segredo da espada +2'     │
│  há 20min                   │
│                             │
├─────────────────────────────┤
│ [Prep*] [ Mesa ] [Recap]   │
└─────────────────────────────┘
```

**Diffs mobile:**
- Título serif "Masmorra do Dragão": 20px (era 22 desktop)
- Meta items: empilhados verticalmente (era horizontal desktop)
- Hero card: sem border-gold (visual fica denso demais em mobile)
- Quick-add: horizontal scroll chips (não 4 botões empilhados — thumb scroll OK aqui)
- Activity feed: divisor subtle entre rows pra respirar
- Bottom tab bar sempre visível

### 3.3 Tablet 1024×768

- Sidebar collapsed (80px)
- Hero card full-width
- Preparado/Pendente 2-column ainda cabe
- Quick-add: 4 botões em row, mesmos do desktop
- Activity feed: 1-column

---

## 4. W2 — Rodar / Combate ativo

### 4.1 Desktop 1440×900

```
┌───────────────────────────────────────────────────────────────────────────┐
│ ⚔ Krynn · Combate: Quick Encounter · Round 3    [Pausar] [Sair]          │ ← combat topbar
├──────────┬────────────────────────────────────────────────────────────────┤
│ [🔒]Prep │                                                                 │
│ ⚔ Mesa* │  INICIATIVA (vez: Satori)          [⚡ Próx. turno ✓]           │
│ [🔒]Recp│  ╭──────────────────────────────────╮                           │
│          │  │ ▶ Satori    [83/83 ███] AC 23  │  [▼ Expandir cena]       │
│ ─────    │  │   Goblin 1  [18/18 ███] AC 12  │  [▼ Ações do turno]      │
│ Combate  │  │   Torin     [86/86 ███] AC 22  │  [▼ Chat/Roll]           │
│ Party    │  │   Goblin 2  [ 5/18 ▒▓▒] AC 12  │  [▼ Nota rápida]         │
│ Cena     │  │   Kai       [71/71 ███] AC 14  │                           │
│ Quest    │  │   Dragão    [120/200 ▓▓░] AC 17│                           │
│ ➕ Add   │  ╰──────────────────────────────────╯                           │
│          │                                                                 │
│          │  [+ Adicionar monstro] [+ Adicionar PC] [+ Nota deste round]   │
│          │                                                                 │
│ ◀ ▸     │                                                                 │
└──────────┴────────────────────────────────────────────────────────────────┘
```

**Especs críticas:**
- Topbar variant `combat` — altura mantida (56px) mas bg `bg-destructive/10` + border-destructive/35%
- Sidebar: modes Preparar e Recap mostram `[🔒]` + opacity 40% (BL-1 lock)
- Sidebar active mode `⚔ Mesa` em gold
- Initiative row: active tem `▶` gold + bg gold/5%
- HP bars inline, cor deriva de `getHpStatus()` (memory)
- Cena / Ações / Chat / Nota: colapsáveis (accordion pattern) — **Foundry VTT-like**
- CTAs de add: secondary ghost, no rail bottom
- "Próx. turno": primary gold fixed à direita, hotkey `Space`

### 4.2 Mobile 390×844

```
┌─────────────────────────────┐
│ ⚔ Round 3 · Satori     [X] │ ← combat header, X = sair
├─────────────────────────────┤
│  INICIATIVA                 │
│  ▶ Satori   [83/83███] 23  │ ← HP bar + AC
│    Goblin 1 [18/18███] 12  │
│    Torin    [86/86███] 22  │
│    Goblin 2 [ 5/18▒▓▒] 12  │
│    Kai      [71/71███] 14  │
│    Dragão   [120/200▓░] 17 │
│                             │
│  [▼ Cena + NPCs]            │ ← accordion collapsed
│  [▼ Ações do turno]         │
│  [▼ Chat / Roll]            │
│  [▼ Nota rápida]            │
│                             │
│  ╭─────────────────────╮    │
│  │ [⚡] Próximo turno  │    │ ← sticky thumb-zone
│  ╰─────────────────────╯    │
│                             │
├─────────────────────────────┤
│ [🔒]  [Mesa*]  [🔒]        │ ← outros modes locked
└─────────────────────────────┘
```

**Diffs mobile críticos:**
- Header: X sai do combate (não é fechar tab, é pausar combate — confirm modal)
- Iniciativa densa, 6-8 linhas visíveis
- Accordions colapsadas por default — 1 expandida por vez no mobile (radio-like)
- "Próximo turno" CTA sticky bottom, acima do bottom tab bar — thumb-friendly
- Bottom tab bar mostra lock em outros modes (🔒 Prep, 🔒 Recap durante combate)

### 4.3 Tablet 1024×768

Transição: sidebar ainda visível (collapsed 80px), accordions abertas por default, "Próx. turno" pode ir no rail direito em vez de sticky bottom.

---

## 5. W3 — Mapa Mental

### 5.1 Desktop 1440×900

```
┌───────────────────────────────────────────────────────────────────────────┐
│ [Logo] Krynn ▾    🔍 Buscar rápida              [Ctrl+K]     🔔 [D]       │
├──────────┬────────────────────────────────────────────────────────────────┤
│ 🛠 Prep*│  MAPA MENTAL                                                    │
│ ⚔ Mesa  │                                                                  │
│ 📖 Recp │  ╭────────────────────────────────────────────────────────────╮ │
│          │  │ Filtrar: [✓NPCs] [✓Locais] [✓Quests] [ ]Notas [ ]Facções │ │
│ ─────    │  │ Layout: [Hierárquico ▾] [⊞ Ajustar auto] [⊙ Reset zoom]  │ │
│ Próxima  │  │                                                             │ │
│ Quests   │  │ Legenda: ● NPC ▲ Local ⬢ Quest ■ Facção ♦ Nota           │ │
│ NPCs     │  │ ─────────────────────────────────────────────────────────  │ │
│ Locais   │  │                                                             │ │
│ Facções  │  │                ╔══════╗                                    │ │
│ Notas    │  │                ║KRYNN║                                     │ │
│ Mapa M.* │  │                ╚═╤══╤╝                                     │ │
│ Trilha   │  │         ┌──────┘  └──────┐                                 │ │
│          │  │         ▼                 ▼                                 │ │
│          │  │    [▲ Cavernas]     [● Grolda]                             │ │
│          │  │         │                 │                                 │ │
│          │  │    [⬢ Caça Dragão]  [■ Culto Negro]                        │ │
│          │  │                                                             │ │
│          │  │ ┌─[Minimap]─┐                                               │ │
│          │  │ └───────────┘                                               │ │
│          │  ╰────────────────────────────────────────────────────────────╯ │
└──────────┴────────────────────────────────────────────────────────────────┘
```

**Especs:**
- Canvas fill whole main area minus controls top
- Nodes: labels ALWAYS visible below shape (F-12 fix)
- Shapes por tipo: ● (circle) NPC, ▲ (triangle) Local, ⬢ (hex) Quest, ■ (square) Facção, ♦ (diamond) Nota
- Cores: NPC gold, Local success, Quest info, Facção destructive, Nota warning
- Legend: inline no controls row (F-13 fix) — não flutuante
- Minimap: bottom-right, 120×90, não overlap conteúdo (bottom-right, margin 16)
- Click node → painel lateral direito 320px slide-in com details + CTAs

### 5.2 Mobile 390×844

Mindmap é **desafio em mobile**. Opções:

**Opção A (recomendada):** read-only mode em mobile. Zoom/pan gestual. Controls em drawer.

```
┌─────────────────────────────┐
│ ☰  Krynn · Mapa Mental [D] │
├─────────────────────────────┤
│ [⚙ Filtros]      [⊞ Reset] │ ← controls row
├─────────────────────────────┤
│                             │
│                             │
│       ╔══════╗              │
│       ║KRYNN║               │
│       ╚══╤══╝               │
│       ┌──┴──┐               │
│       ▼     ▼               │
│    [Cav] [Grolda]           │ ← pinch-zoom gestual
│                             │
│       [Culto]               │
│                             │
│                             │
│                             │
│      [⊞ Minimap]            │ ← bottom-right
├─────────────────────────────┤
│ [Prep*] [ Mesa ] [Recap]   │
└─────────────────────────────┘
```

**Especs mobile:**
- Canvas full-viewport height minus topbar (56) + controls (44) + bottom-tab (64)
- Filtros abrem bottom-sheet quando tapped
- Tap em node abre bottom-sheet com details (não side panel)
- Edit mode disabled em mobile (Mestre edita em desktop/tablet)
- Pinch-zoom habilitado, pan 1-finger, double-tap auto-fit

---

## 6. W4 — Player Minha Jornada

### 6.1 Desktop 1440×900
*(já spec'd em redesign-proposal §7 — ver ASCII completo)*

**Especs adicionais:**
- Combat banner: condicional (só aparece se `combat.active`)
- Character hero card: border gold/35%, HP bar full-width com cor de `getHpStatus()`
- Party card: "Você" primeiro, depois outros em ordem de iniciativa se em combate / alfabética se não
- Fichas incompletas: badge warning `⚠ ficha incompleta` + CTA só Mestre (mas aqui é view do player, sem CTA)

### 6.2 Mobile 390×844

```
┌─────────────────────────────┐
│ ☰  Curse of Strahd     [D] │
│   Mestre: lucasgaluppo17        │
├─────────────────────────────┤
│ ╭───── [destructive] ──╮    │
│ │ ⚔ O MESTRE INICIOU  │    │ ← banner sticky
│ │   O COMBATE          │    │
│ │ Earth Elementals     │    │
│ │ [Entrar no combate→] │    │
│ ╰──────────────────────╯    │
│                             │
│  MEU PERSONAGEM             │
│  Capa Barsavi               │ ← Cinzel 20
│  Half-Elf Clérigo/Sorc · Nv10│
│  ████████████████  88/88    │ ← HP bar full-width
│  CA: 21                     │
│  [ Abrir ficha completa → ] │
│                             │
│  ÚLTIMA SESSÃO (3 dias)     │
│  Masmorra do Dragão         │ ← Cinzel 16
│  O grupo encontrou a...     │
│  [Ler recap →]              │
│                             │
│  PRÓXIMA SESSÃO             │
│  Sex 25/Abr · 20h           │
│  [ico Pin] Cavernas de Krynn│
│  ⚠ Trazer ficha impressa    │
│                             │
│  QUESTS ATIVAS (2)          │
│  • Destruir o dragão        │
│  • Culto Negro              │
│                             │
│  MINHAS NOTAS               │
│  "@Grolda mentiu sobre..."  │
│  [+ Nova nota]              │
│                             │
│  PARTY (5)                  │
│  ● Daniel [Você] Capa Bars. │
│  ● Torin · Half-Elf Druid   │
│  ⚠ 3 fichas incompletas     │
│                             │
├─────────────────────────────┤
│ [📖 Jornada*] [👁 Watch]   │ ← 2 tabs pro player
└─────────────────────────────┘
```

**Diffs mobile:**
- Combat banner sticky topo (acima do content)
- Todos cards 1-column, full-width
- Bottom tab bar: apenas 2 tabs (Minha Jornada, Assistindo)
- Assistindo pode estar locked se sem combate ativo (🔒 opcional)

---

## 7. W6 — Player Assistindo (combate) Mobile 390

**NOVO — não existia em v0.1/v0.2**

```
┌─────────────────────────────┐
│ 👁 Combate · Round 3       │
├─────────────────────────────┤
│                             │
│  SUA VEZ EM 2 TURNOS        │ ← gold highlight
│                             │
│  VOCÊ — Capa Barsavi        │ ← Cinzel
│  ████████████████ 88/88     │
│  CA: 21                     │
│                             │
│  ─────────────────────────  │
│                             │
│  TURNO ATUAL                │
│  Satori (aliado)            │
│                             │
│  INICIATIVA                 │
│  ▶ Satori    [83/83]       │
│    Goblin 1  [18/18]       │
│  ★ Você      [88/88]        │ ← destaque seu lugar
│    Torin     [86/86]        │
│    Goblin 2  [ 5/18]        │
│    Kai       [71/71]        │
│                             │
│  ╭─────────────────────╮    │
│  │ [📖 Minha ficha]    │    │ ← stacked CTAs
│  ╰─────────────────────╯    │
│  ╭─────────────────────╮    │
│  │ [✎ Anotar algo]     │    │
│  ╰─────────────────────╯    │
│                             │
├─────────────────────────────┤
│ (sem tab bar durante combate)│ ← sticky mode
└─────────────────────────────┘
```

**Especs:**
- Mode sticky durante combate (player não pode voluntariamente sair pra Minha Jornada se Mestre bloqueou)
- Header mostra round + quem é a vez
- "SUA VEZ EM N TURNOS" calculado pelo server, destacado gold quando N ≤ 2
- Player destaque (★) na initiative pra achar sua posição em <1s
- CTAs primários: Ficha (abre slideover) e Nota rápida (abre input inline)

---

## 8. W7 — Player Assistindo Tablet/Desktop

```
┌───────────────────────────────────────────────────────────────────────────┐
│ 👁 Curse of Strahd · COMBATE ATIVO · Round 3                              │
├──────────┬────────────────────────────────────────────────────────────────┤
│[🔒]Jorn. │                                                                 │
│👁 Watch* │  SUA VEZ EM 2 TURNOS                                           │
│          │                                                                 │
│ ─────    │  VOCÊ — Capa Barsavi · Clérigo/Sorc Nv10                       │
│ Combate  │  ████████████████████████████████  88/88     CA 21              │
│ Party    │                                                                 │
│ Ficha    │  ────────────────────────────────────────────────────────────  │
│          │                                                                 │
│          │  INICIATIVA (Round 3)              AÇÕES RÁPIDAS                │
│          │  ╭──────────────────────╮          ╭──────────────────╮        │
│          │  │ ▶ Satori   [83/83]  │          │ [📖] Minha ficha │        │
│          │  │   Goblin 1 [18/18]  │          │ [✎] Anotar       │        │
│          │  │ ★ Você     [88/88]  │          │ [🎲] Rolar dado  │        │
│          │  │   Torin    [86/86]  │          ╰──────────────────╯        │
│          │  │   Goblin 2 [ 5/18]  │                                        │
│          │  │   Kai      [71/71]  │                                        │
│          │  ╰──────────────────────╯                                        │
│          │                                                                 │
└──────────┴────────────────────────────────────────────────────────────────┘
```

**Especs desktop/tablet Assistindo:**
- Sidebar mostra modes com 🔒 em Minha Jornada (durante combate)
- Sidebar surfaces: Combate, Party, Ficha (subset do player)
- Main content: 2 columns — iniciativa + ações rápidas
- Chat/roll: auth-only (nova matriz surface×auth §4.1 DS)

---

## 9. W8 — Mestre Recap

### 9.1 Desktop 1440×900

```
┌───────────────────────────────────────────────────────────────────────────┐
│ [Logo] Krynn ▾    🔍                                        🔔 [D]        │
├──────────┬────────────────────────────────────────────────────────────────┤
│ 🛠 Prep  │  📖 RECAP — Sessão 12 (terminou há 2h)                          │
│ ⚔ Mesa  │                                                                 │
│ 📖 Recap*│  ESCREVA O QUE ACONTECEU (o player vai ler)                    │
│          │  ╭────────────────────────────────────────────────────────╮   │
│ ─────    │  │ # Masmorra do Dragão                                    │   │
│ Última   │  │                                                         │   │
│ Recap*   │  │ O grupo @Torin e @Capa Barsavi desceram nas            │   │
│ Timeline │  │ @Cavernas e encontraram @Grolda, que implorou          │   │
│ Números  │  │ ajuda...                                                │   │
│ Notas Mestre │  │                                                         │   │
│          │  │ [Tab] pra abrir autocomplete de entidades              │   │
│          │  ╰────────────────────────────────────────────────────────╯   │
│          │                                                                 │
│          │  Tags: [#masmorra ×] [#dragão ×] [+ adicionar]                 │
│          │                                                                 │
│          │  ─────── NÚMEROS (discretos) ───────                           │
│          │  ⏱ 2h 14min · ⚔ 2 combates · 🎲 47 rolagens                    │
│          │                                                                 │
│          │  [ Salvar rascunho ]   [ Publicar pros jogadores → ]           │
│          │                                                                 │
└──────────┴────────────────────────────────────────────────────────────────╯
```

**Especs:**
- Editor markdown-like com autocomplete `@` e `#`
- Backlinks `@Grolda` renderizados como chip gold clicáveis
- Tags como chips com × pra remover
- "Números" discretos (F-10: só aparece ≥3 combates finalizados)
- 2 CTAs no fim: Salvar rascunho (secondary) + Publicar (primary gold)
- Autosave a cada 30s + toast "Rascunho salvo"

### 9.2 Mobile 390×844

```
┌─────────────────────────────┐
│ ☰  Krynn · Recap       [D] │
├─────────────────────────────┤
│                             │
│  📖 RECAP — Sessão 12       │
│  (terminou há 2h)           │
│                             │
│  ESCREVA O QUE ACONTECEU    │
│  (o player vai ler)         │
│                             │
│  ╭─────────────────────╮    │
│  │ # Masmorra do Dragão│    │
│  │                     │    │
│  │ O grupo @Torin e    │    │
│  │ @Capa Barsavi...    │    │
│  │                     │    │
│  │                     │    │
│  ╰─────────────────────╯    │
│                             │
│  [@] pra pessoa/lugar       │ ← hints
│  [#] pra tag                │
│                             │
│  Tags: [#masmorra×] [+]     │
│                             │
│  ⏱ 2h · ⚔ 2 · 🎲 47         │ ← inline compact
│                             │
│  [ Salvar rascunho ]        │
│  [ Publicar pros jogadores →]│
│                             │
├─────────────────────────────┤
│ [ Prep ] [ Mesa ] [Recap*] │
└─────────────────────────────┘
```

---

## 10. Matriz de decisões responsivas

| Elemento | Mobile <768 | Tablet 768-1023 | Desktop ≥1024 |
|---|---|---|---|
| Sidebar | Hamburger drawer | Collapsed 80px | 220px colapsável |
| Mode switcher | Bottom tab bar | Vertical (ícones) | Vertical (full) |
| Busca rápida | Ícone topbar | Input 200px topbar | Input 320px topbar |
| Cards 2-col | 1-col stacked | 2-col | 2-col ou 3-col |
| Quick add | Chips h-scroll | 4 botões row | 4 botões row |
| Combat banner | Full-width sticky | Full-width sticky | Full-width sticky |
| HP bar | Full-width | Full-width | Full-width |
| Char name (Cinzel) | 20px | 22px | 24px |
| H1 surface | 20px | 22px | 24px |
| Body | 14px | 14px | 14px |
| Padding card | 16px | 20px | 20-24px |
| Gap entre cards | 12px | 16px | 20px |
| Accordion em Rodar | 1 aberta por vez | Auto default | Todas abertas |
| Mindmap | Pinch-zoom read | Mouse + zoom | Full + painel lateral |

---

## 11. Breakpoint-specific bugs a evitar

**Já sabidos da auditoria 2026-04-21:**

| Bug | Fix responsivo |
|---|---|
| F-01 Pill bar escondendo 10/13 items em mobile | **Eliminada** — substituída por mode switcher bottom + drawer de surfaces |
| F-16 Dropdown "Por facção" cortado em mobile | Filtros abrem bottom-sheet em mobile (§8.2 interactions-spec) |
| F-17 "KRYNN" colado na borda esquerda mobile | Padding-4 mínimo em topbar + safe-area |
| F-18 "CURSE OF STRA..." cortado | text-ellipsis + tooltip on long-press |
| F-19 Grid 2×2 stats caixa alta em mobile | Stats inline compact `⏱ 2h · ⚔ 2 · 🎲 47` |
| F-20 Quests sub-tabs cortadas mobile | Sub-tabs viram chips horizontal-scroll (OK porque SÃO filtros, não nav principal) |

---

**Fim do responsive spec. 8 wireframes × 3 breakpoints = 24 combinações cobertas.**
