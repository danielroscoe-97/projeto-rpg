# Pocket DM — Design System v1.0

**Codinome interno:** Grimório
**Versão:** 1.0 (2026-04-21)
**Escopo:** documento-mestre do design system do produto Pocket DM
**Autores:** Sally (UX) + Mary (Analyst) + Winston (Architect) + John (PM) — party mode session
**Relaciona-se com:** [01-design-tokens.md](./01-design-tokens.md) · [02-component-library.md](./02-component-library.md) · [03-interactions-spec.md](./03-interactions-spec.md)

---

## 0. Manifesto

> Pocket DM não é uma ferramenta D&D.
> É um **grimório moderno** — onde o mestre compõe o mundo e o jogador vive nele.
>
> Toda decisão visual deve responder a uma pergunta:
> **"Isso me aproxima ou me afasta da mesa?"**

Uma planilha escura com dados frios não é mesa. Um cockpit barulhento também não é.
A mesa é **quente, íntima, com pouca luz, objetos de ouro**, e vozes que importam.
Nossa interface espelha isso.

---

## 1. Brand Foundation

### 1.1 Personalidade — o Arquétipo

Pocket DM tem **3 facetas**, que nunca brigam:

| Faceta | Quando aparece | Como se manifesta |
|---|---|---|
| 🜃 **O Escriba** | Modo Preparar Sessão, Recaps, Notas | Calmo, paciente, metódico. Cinzel em nomes próprios. Espaço em branco generoso. |
| ⚔ **O Mestre da Mesa** | Modo Rodar Combate | Preciso, sob pressão, ritmado. Alto contraste. Ação em <1 clique. |
| 📜 **O Cronista** | Recaps publicado, Timeline, Stats | Memória viva. Narrativa primeiro, número depois. |

**Nunca somos:**
- Corporativo (não é Jira com tema escuro)
- Genérico-gamer (não é RGB + neon + glow)
- Infantil (não é Kahoot)
- Hardcore-tecnicista (não é spreadsheet)

### 1.2 Mood — o Sentimento

Se o produto entrasse numa sala, seria:
> **"Uma biblioteca à noite, luz dourada de vela, pergaminho aberto na mesa, café ao lado. Silêncio que antecede a história."**

**Referências visuais mentais:**
- Manuscritos medievais iluminados (letras capitulares douradas, tinta escura)
- Interior de taverna iluminada por lanternas
- Papelaria de livraria cult (Moleskine dark + gold foil)
- Aplicativos cult-dev (Linear dark, Arc, Things 3) pela disciplina
- Foundry VTT pelo drama do cockpit — **mas só quando é cockpit**

**Cheiro do produto:** pergaminho + bronze polido + café.
**Som do produto:** pena arranhando papel + carta sendo virada.

### 1.3 Vocabulário ubíquo (já travado)

Do `CLAUDE.md` e memórias do projeto:

| Jamais diga | Sempre diga |
|---|---|
| "Tab" | "Seção", "Modo" |
| "Sidebar" (UI) | "Menu lateral" |
| "History" | "Recap", "Depois da Sessão" |
| "Retro" | "Recap" |
| "Home" | "Próxima Sessão" (se dentro de campanha) |
| "Dashboard" | "Campanhas" (nível global) |
| "CR" traduzido | "CR" preservado |
| "HP" traduzido | "HP" preservado |
| "Quest" → "Missão" | **"Quest"** — não traduz |
| "Session" → "Sessão de jogo" | **"Sessão"** neutro |
| "Combate" → "Luta" | "Combate" canônico |

---

## 2. Design Principles (os 7 do Grimório)

**Nota canônica sobre vocabulário de modes:**
Labels user-facing são **"Preparar Sessão"**, **"Rodar Combate"** e **"Recaps"** (PT-BR, fixos nos dois locales no spirit do vocabulário ubíquo). Code enum é `Mode = 'prep' | 'run' | 'recap' | 'journey' | 'watch'` (EN, rotas `/prep`, `/run`, `/recap`, `/journey`, `/watch`). Em texto didático desse doc, às vezes escrevemos "Preparar" ou "Rodar" de forma curta — isso é informal, **na UI sempre o label completo**.

### P1 — Mesa primeiro, feature depois

Toda tela pergunta: *"Isso me aproxima da mesa real?"* Se não, é cortado. Ex: dashboard de stats com 4 métricas pra 1 combate (F-10) é anti-mesa.

### P2 — Compositor, não formulário

Preparar Sessão é um ato criativo. UI deve parecer papel em branco com poucas guias, **não um form CRUD**. Backlinks com `@`, tags com `#`, quick-add invisível até ser invocado. Notion/Obsidian são o norte.

### P3 — Cockpit sob pressão

Rodar Combate é alta-pressão. Tudo que o mestre precisa em 1 tela, **1 clique, <10s**. Nada colapsado sem affordance, nada escondido. Foundry VTT é o norte.

### P4 — Narrativa primeiro, dado depois

"Grolda encontrou a espada +2" vem antes de `hp: 45/80`. Nomes de NPCs/locais em serif gold. Numbers em mono tabular, discretos. Stats aparecem só quando relevantes (F-10: ≥3 combates).

### P5 — Menos é grimório

Density budget rigoroso. Preparar = ≤8 elementos above-fold. Rodar = 8 visíveis + colapsáveis. Empty state dá espaço pra respirar, não pede preenchimento de form.

### P6 — Um caminho por destino

A campanha tem **um** caminho pra cada surface. Pill bar + sidebar + breadcrumb simultâneos (situação atual, F-03) é o anti-pattern. Um caminho, bem feito.

### P7 — Invisible until invoked

O grande diferencial de DS modernos (Linear, Arc). Busca rápida, quick-add, autocomplete, backlinks — **nenhum deles ocupa pixel até ser chamado**. Ctrl+K é o cerne.

---

## 3. Voice & Tone

### 3.1 Como o produto fala

**PT-BR default** (83% do tráfego per `docs/seo-architecture.md`). Frases curtas. Sem corporativês. D&D jargon preservado.

**Exemplos canônicos:**

| Situação | ❌ Não | ✅ Sim |
|---|---|---|
| Empty state de Quests (Mestre) | "Você não possui quests cadastradas." | "Ainda sem quests. [+ Criar a primeira]" |
| Empty state de Quests (Player) | "Você não possui quests cadastradas." | "Seu mestre ainda não criou quests. Elas aparecerão aqui." |
| Combate iniciado (player) | "Battle started" | "O mestre iniciou o combate — [Entrar]" |
| Reconexão silenciosa | "Tentando reconectar..." (imediato) | *(3s de silêncio + skeleton)* → depois "Reconectando..." |
| Erro de rede | "Failed to fetch data" | "Não foi dessa vez. Tentar de novo?" |
| Tour W0b | "Click aqui pra tour" | "Primeira vez? 30 segundos pra entender Preparar / Rodar / Recap. [Ver tour] [Pular]" |
| Confirmação destrutiva | "Tem certeza?" | "Apagar a sessão 12 e tudo que tem dentro? Isso não volta." |

### 3.2 Tom por mode

- **Preparar Sessão** (`prep`) — tom de escriba. Calmo, com tempo. *"Vamos preparar a sessão."*
- **Rodar Combate** (`run`) — tom de árbitro. Direto, cronometrado. *"Round 3 · Satori · próximo turno"*
- **Recaps** (`recap`) — tom de cronista. Narrativo. *"O que aconteceu na mesa foi isso:"*
- **Minha Jornada** (`journey`) — tom de companheiro. *"Sua próxima sessão é sexta."*
- **Assistindo** (`watch`) — tom de comentarista. *"Sua vez em 2 turnos."*

### 3.3 Regras de copy imutáveis

1. **Empty state condicional por role.** Jamais copy de "crie" para player.
2. **HP tier labels em inglês nos 2 locales.** FULL/LIGHT/MODERATE/HEAVY/CRITICAL (memory).
3. **Datas relativas primeiro.** "há 5min" antes de timestamp ISO.
4. **Números em linguagem humana.** "2m 04s" antes de "124 segundos".
5. **Nunca "aguarde" genérico.** Sempre motivo ("Salvando rascunho..." "Enviando pros jogadores...").
6. **Decisões destrutivas nomeiam a consequência.** "Apagar X e tudo dentro. Isso não volta."

---

## 4. Visual Language

### 4.1 Color System — o Pergaminho e o Ouro

**Filosofia:** escuridão quente (nunca cinza-azulado sem alma), ouro que evoca tinta brilhante de manuscrito iluminado, não neon cyber.

#### 4.1.1 Paleta primária

> **Source-of-truth atômica:** [01-design-tokens.md](./01-design-tokens.md). Este resumo é didático; valores canônicos vivem lá. Em caso de divergência, 01 vence.

```
╔══════════════════════════════════════════════════════════════════╗
║  BACKGROUND LAYERS (3 níveis de profundidade)                    ║
╠══════════════════════════════════════════════════════════════════╣
║  bg          #14161F   base absoluta                             ║
║  bg-elevated #181A25   cards, sidebar                            ║
║  bg-raised   #1F222E   modals, dropdowns                         ║
╚══════════════════════════════════════════════════════════════════╝

╔══════════════════════════════════════════════════════════════════╗
║  GOLD — a tinta iluminada                                         ║
╠══════════════════════════════════════════════════════════════════╣
║  gold         #D4A853   brand, nav ativa (ícones e chips)        ║
║  gold-dim     #A88339   hover, dim states                        ║
║  gold/15%     #D4A85326 fundo de estado ativo                    ║
║  gold/40%     #D4A85366 borda de estado ativo, focus ring base   ║
╚══════════════════════════════════════════════════════════════════╝

╔══════════════════════════════════════════════════════════════════╗
║  TEXT (4 níveis de hierarquia)                                   ║
╠══════════════════════════════════════════════════════════════════╣
║  text          #E6E5E1   alto contraste, body + headers          ║
║  text-muted    #9896A0   meta-info, labels, secondary            ║
║  text-subtle   #6B6A72   placeholders, disabled                  ║
║  text-inverse  #14161F   texto sobre fundo claro (botão gold)    ║
╚══════════════════════════════════════════════════════════════════╝

╔══════════════════════════════════════════════════════════════════╗
║  SEMANTIC                                                         ║
╠══════════════════════════════════════════════════════════════════╣
║  success    #29A36E   quests completas, preparado, HP LIGHT/FULL ║
║  warning    #F59E0B   pendente, alerta suave, HP MODERATE        ║
║  destructive#E05C3B   combate ativo, delete, HP HEAVY            ║
║  critical   #B91C1C   HP CRITICAL (vermelho mais escuro)         ║
║  info       #5B8DEF   tooltips, tours, links secundários         ║
╚══════════════════════════════════════════════════════════════════╝

╔══════════════════════════════════════════════════════════════════╗
║  BORDERS (sempre white com opacity — nunca cor sólida)           ║
╠══════════════════════════════════════════════════════════════════╣
║  border-subtle   #FFFFFF10 (6%)    cards default                 ║
║  border          #FFFFFF1F (12%)   inputs, buttons secondary     ║
║  border-strong   #FFFFFF33 (20%)   modals, dividers emphasis     ║
╚══════════════════════════════════════════════════════════════════╝
```

**Nota de reconciliação (B1 fix):** valores hex acima são derivados dos tokens atômicos de [01-design-tokens.md](./01-design-tokens.md) — qualquer ajuste fino (variações HSL, tailwind defaults preservados) está documentado lá. Este bloco mostra o essencial pra designer ler sem sair deste doc.

#### 4.1.2 Por que gold?

Gold evoca **tinta de manuscrito iluminado** — não é "primário arbitrário". Significa: *"aqui está um nó da história que importa"*. Usar gold em botão genérico dilui o significado. Reserva: brand identity, nav ativa, CTAs primárias, nomes próprios (via serif gold quando aplicável).

#### 4.1.3 Por que dark?

Dark é o ambiente da mesa de jogo. É noite, é baixa luz, é lanterna acesa no centro. Light mode **não faz sentido** pro cerne do produto (combate de sexta à noite). Aceitamos dark-only v1; light mode é v3+ se ROI justificar.

#### 4.1.4 Anti-patterns de cor

```
❌ Gold em botão de delete (confunde com brand)
❌ Cor sólida em border (sempre white com opacity)
❌ Mais de 3 níveis de bg numa tela (hierarquia confusa)
❌ Usar destructive pra alertas não-urgentes (desgasta atenção)
❌ Hex inline no código (SEMPRE token via Tailwind/CSS var)
```

### 4.2 Typography — a Caligrafia Moderna

**2 famílias, uma regra simples:**

#### 4.2.1 Cinzel (ou alternativa serif) — "O Nome Próprio"

Reservada para **nomes que têm peso narrativo**:
- Nomes de campanhas (Krynn, Curse of Strahd)
- Nomes de NPCs (Grolda, Capa Barsavi)
- Nomes de Locais (Cavernas de Krynn, Câmara 3)
- Nomes de Facções (Culto Negro)
- Nomes de Sessões (Masmorra do Dragão)

**Nunca usar serif em:**
- Body text
- Labels de form
- Números (stats, HP, AC)
- Microcopy
- Botões

**Razão:** serif cria **gravitas narrativa** — ao ver `𝔊𝔯𝔬𝔩𝔡𝔞` numa lista, o cérebro trata como personagem, não como row de planilha. Mas serif em excesso (body, labels) vira decoração barata. Restrição é o que preserva o efeito.

#### 4.2.2 Inter — "A Voz Funcional"

Todo o resto. Inter é moderno, neutro, multilíngue, e respira em densidade alta. Pesos permitidos:

| Peso | Uso |
|---|---|
| 400 Regular | Body, descrições |
| 500 Medium | Labels, meta-info |
| 600 Semi Bold | Headers, títulos de cards |
| 700 Bold | Numbers em destaque (HP, AC, level) |

#### 4.2.3 Escala tipográfica

```
display      32/40  semi-bold  →  hero campaign name
h1           24/32  semi-bold  →  heading da surface
h2           20/28  semi-bold  →  títulos de cards importantes
h3           16/24  semi-bold  →  títulos de sub-sections
body-lg      15/22  regular    →  body em cards de destaque
body         14/20  regular    →  body default
small        13/18  regular    →  meta-info, timestamps
caption      12/16  medium     →  badges, labels curtos
micro        11/14  semi-bold  →  section labels caps (LS +8%)
nano         10/12  semi-bold  →  eyebrow labels caps (LS +8%)
```

**Mono tabular (JetBrains Mono ou similar):**
Usada **apenas em números de combate** (HP, AC, iniciativa, dano).
Mantém alinhamento vertical de colunas. 16/20 semi-bold.

#### 4.2.4 Regras de casing

- **CAPS + letter-spacing +8%** nos micro/nano labels (PRÓXIMA SESSÃO, PREPARADO)
- **Title Case** em headers de card ("Masmorra do Dragão")
- **Sentence case** em body e descriptions
- **lowercase** quase nunca (só em placeholders discretos)

### 4.3 Iconography — A Lâmina Dupla

**Regra imutável** (memory `feedback_svg_sem_emojis.md`):

```
SE é nav / sistema / repetido  →  SVG Lucide em GOLD #D4A853
SE é decoração narrativa        →  Emoji permitido (🎲 🎯 🎉 ⚠)
```

#### 4.3.1 Set base — Lucide Icons

Lucide é a biblioteca escolhida (já usada em `CampaignNavBar.tsx`). Open-source, consistente, 1200+ ícones.

**Tamanhos canônicos:**
- Small: 14px (dentro de text, em chips)
- Base: 16px (sidebar, botões padrão)
- Medium: 20px (topbar, cards headers)
- Large: 24px (empty states, hero icons)

**Stroke width:** sempre `2` (Lucide default). Nunca mudar.

#### 4.3.2 Mapeamento core de ícones

| Surface/ação | Lucide icon | Uso |
|---|---|---|
| Preparar | `Hammer` | Mode switcher |
| Rodar | `Swords` | Mode switcher + combat |
| Recap | `BookOpen` | Mode switcher |
| Próxima Sessão | `CalendarDays` | Surface |
| Quests | `ScrollText` | Surface |
| NPCs | `UserCircle` | Surface |
| Locais | `MapPin` | Surface |
| Facções | `Flag` | Surface |
| Notas | `FileText` | Surface |
| Mapa Mental | `Network` | Surface |
| Trilha | `Music` | Surface |
| Busca | `Search` | Topbar |
| Notificações | `Bell` | Topbar |
| Editar | `Pencil` | Actions |
| Adicionar | `Plus` | Actions |
| Fechar | `X` | Actions |
| Play/continuar | `Play` | Actions |
| Lock | `Lock` | Mode bloqueado em combate |
| Raio rápido | `Zap` | Quick-add (pode coexistir com emoji ⚡) |

#### 4.3.3 Emojis permitidos (narrative set)

| Emoji | Contexto canônico |
|---|---|
| 🎉 | Celebração one-off (campanha criada, primeira sessão) |
| 🎯 | "Gancho" da sessão — marcador narrativo |
| 🎲 | Cultura D&D, referência a dado |
| ⚠ | Alerta contextual leve |
| 🎬 | Tour / vídeo tutorial |
| ⚡ | Quick-add prefix |
| 📖 | Tom de livro/cronista — usar com parcimônia |

**Jamais emojis em:**
- Sidebar, topbar, navegação
- Botões padrão
- Badges de status (usar SVG + cor semântica)
- Repetição ≥3x na mesma tela (vira ruído)

### 4.4 Motion — O Mínimo Necessário

**Filosofia:** pocket Mestre não é app de entretenimento passivo. Motion **ajuda a entender estado**, não decora. Mesa sob pressão não tolera splash screens.

#### 4.4.1 Durations

```
instant   0ms    mode switch (server-driven, nunca aguarda animação)
fast      150ms  hover states, button press
base      200ms  dropdowns, toasts in, tooltip
medium    300ms  modals, drawer slide-in, banner combat
slow      400ms  quick-add slideover, tour step
```

#### 4.4.2 Easings

- `ease-out` default (95% dos casos — entrada de elementos)
- `ease-in-out` só em movimento simétrico (drawer toggle)
- `ease-in` quase nunca (só exit de toast)

#### 4.4.3 Motion language

| Comportamento | Sem motion | Com motion |
|---|---|---|
| Mode switch | Conteúdo troca instantaneamente | 🚫 nunca anima (instant) |
| Card hover | Background muda | Border opacity 0.08→0.20 em 150ms |
| Modal abre | — | Fade-in 300ms + scale 0.97→1 |
| Toast entra | — | Slide-from-bottom 200ms + fade |
| Combat banner | — | Slide-from-top 300ms (urgência) |
| Skeleton | — | Pulse 1.5s loop |
| Sidebar collapse | Largura muda | 200ms ease-out |

#### 4.4.4 `prefers-reduced-motion`

**Respeitar sempre.** Em `@media (prefers-reduced-motion: reduce)`:
- Fade-ins viram `instant`
- Slide-ins viram opacity-only
- Skeleton pulse pausa
- Mode switch continua instant (já era)

### 4.5 Space & Rhythm — o Compasso

Escala **4/8 rígida** (Tailwind default). Nenhum valor fora dela. Se alguém precisar `padding: 11px`, está errado.

```
space-0  0     usado só pra reset
space-1  4px   gap entre ícone e label em chip
space-2  8px   gap entre items densos em lista
space-3  12px  padding vertical de botão
space-4  16px  padding de card pequeno
space-5  20px  gap entre cards irmãos
space-6  24px  padding de card médio
space-8  32px  padding de surface main, gap entre seções
space-10 40px  padding de empty state hero
space-12 48px  espaço entre blocos visuais grandes
space-16 64px  raro, só em hero sections
```

#### 4.5.1 Ritmo vertical

Surface segue batimento regular: título (h1) → gap-6 → hero card → gap-5 → 2-column row → gap-5 → quick-add → gap-5 → activity. Regular respira.

#### 4.5.2 Padding de containers canônicos

| Container | Padding |
|---|---|
| Topbar | `py-3 px-5` (12/20) |
| Sidebar | `py-5 px-4` (20/16) |
| Card default | `p-5` (20) |
| Card hero | `p-6` (24) |
| Button (md) | `py-2 px-4` (8/16) |
| Modal | `p-6` (24) |
| Empty state | `py-10 px-6` (40/24) |

### 4.6 Elevation & Depth — a Luz da Vela

Dark mode não usa sombras do jeito clássico. Usamos **borders sutis + mudança de background layer**:

```
Level 0  bg #14161F       ─  chão absoluto, body
Level 1  bg-elevated      ─  cards, sidebar, topbar
Level 2  bg-raised        ─  modal, dropdown, drawer
Level 3  overlay #00000099 ─  scrim atrás de modal
```

**Sombras apenas em level 2+ (modals, dropdowns) e focus ring gold:**

```
shadow-sm:  0 1px 2px rgba(0,0,0,0.2)
shadow-md:  0 4px 8px rgba(0,0,0,0.3)
shadow-lg:  0 8px 24px rgba(0,0,0,0.4)
shadow-gold-focus:  0 0 0 2px rgba(212,168,83,0.5)   ← focus ring
```

#### 4.6.1 Regra da vela

O olho busca luz. Gold concentra **onde há ação**. Border subtle white/6% marca território **sem gritar**. Evite sombra pesada; evita também "pop" de background claro. A luz é de vela, não de fluorescente.

---

## 5. Components — Resumo e Filosofia

**Doc-referência completo:** [02-component-library.md](./02-component-library.md) — 20 componentes especificados com props, variants, states.

**Filosofia resumida:**

1. **Composição antes de variant-explosion.** Button tem 4 variants (primary/secondary/destructive/ghost), não 14. Pra casos fora, compor (Button + Icon + custom color token).
2. **Variants sempre derivam de tokens.** Nenhum componente tem hex hardcoded. Se não está em `01-design-tokens.md`, não existe.
3. **States explícitos: default/hover/active/focus/disabled/loading/empty/error.** Cada um renderizado testável.
4. **Skeleton > spinner.** Per Resilient Reconnection Rule — nunca tela branca, sempre skeleton com shape do conteúdo esperado.
5. **Primitive → Composite → Domain.** 3 camadas:
   - **Primitive:** Button, Input, Badge, Card, CheckCircle (agnóstico de domínio)
   - **Composite:** Topbar, Sidebar, Modal, Toast, QuickSearch (genérico SaaS)
   - **Domain:** ChecklistItem, HPBar, InitiativeRow, ActivityItem, BacklinkChip (específico Pocket DM)

**Os 5 componentes-âncora do brand:**

| Componente | Por que é âncora |
|---|---|
| **ModeItem** | Gold active state + lock icon = essência da nav nova |
| **BacklinkChip** | `@Grolda` em gold = killer-feat visível em toda surface |
| **HPBar** | Tier color transitions = tensão do combate visível |
| **InitiativeRow** | Serif + mono + chevron gold = DNA de cockpit |
| **Card (hero variant)** | Gold border @35% = o nó importante da tela |

---

## 6. Patterns — Receitas Prontas

### 6.1 Card Patterns

#### 6.1.1 Hero card (destaque de surface)
Usado quando a surface tem **um** objeto principal: Próxima Sessão em Preparar, Meu Personagem em Minha Jornada.

```
┌────────────────────────────────────────────────────┐ ← border-gold/35%
│ [ico] PRÓXIMA SESSÃO  [#12]           [✎ Editar]  │
│                                                    │
│ Masmorra do Dragão                      ← Cinzel  │
│                                                    │
│ [ico] Sex 25/Abr · 20h  [ico] ~4h  [ico] Cavernas │
│                                                    │
│ 🎯 Grupo persegue o dragão fugido...               │
└────────────────────────────────────────────────────┘
```

**Rules:** border gold/35% (indica "primário"), padding-6, hierarchy: label micro → h2 title → meta row → gancho narrativo. Máximo 1 hero card por surface.

#### 6.1.2 Default card (conteúdo padrão)
Border-subtle white/6%, padding-5, usado em 2-column rows, lists, seções secundárias.

#### 6.1.3 Muted card (informação tangencial)
Fill levemente mais escuro, border ainda mais sutil. Usado para estatísticas discretas, meta-info.

### 6.2 Banner Patterns

4 variants baseadas em cor semântica:

| Variant | Quando usar | Estrutura |
|---|---|---|
| **Combat banner (destructive)** | Combate iniciado pelo mestre | Sticky top, ícone Swords, CTA "Entrar" primário gold |
| **Info banner** | Tour, onboarding, tips | Inline, cor info, CTA secundário, botão "Pular" |
| **Warning banner** | Modo read-only (campanha arquivada) | Sticky top, ícone AlertTriangle, sem CTA destrutivo |
| **Success banner (rare)** | Action bem-sucedida persistente | Toast-like mas fixo, auto-dismiss após 10s |

**Regra de ouro:** um banner ativo por viewport. Se tem combate ativo + campanha arquivada simultâneos, **combate vence** (prioridade de urgência).

### 6.3 List Patterns

#### 6.3.1 Navigation list (sidebar surfaces)
Ícone gold + label, gap-2.5, padding-2/3, active state = bg white/4%.

#### 6.3.2 Entity list (NPCs, Quests, Locais)
Card por item, 2-column grid desktop, 1-column mobile. Busca inline no topo. Filter chips removíveis (F-11 fix).

#### 6.3.3 Checklist (Preparado/Pendente)
CheckCircle verde (feito) ou Circle muted (pendente) + texto. Sem hover state (é display, não interação em Preparar — em outras surfaces pode ser clicável).

#### 6.3.4 Activity feed (Recap timeline)
Ícone do tipo (user/file/scroll) gold + texto com backlinks + timestamp relativo à direita.

#### 6.3.5 Initiative list (Rodar)
Row densa, chevron gold na vez ativa, HP bar inline, AC em mono, nome em Cinzel (PCs) ou Inter (monstros).

### 6.4 Form Patterns

#### 6.4.1 Slideover pattern (preferido sobre modal pra forms de create/edit)
Slide-in 400ms da direita, 480px desktop / full-screen mobile. Click em overlay ou Esc fecha. Contém form com auto-save de rascunho a cada 30s.

#### 6.4.2 Inline edit
Pra campos simples (nome de NPC): click → input aparece, Enter salva, Esc cancela. Sem modal.

#### 6.4.3 Confirm dialog (destructive)
Modal pequeno, título nomeia consequência ("Apagar sessão 12"), body descreve escopo ("Isso apaga também 4 notas, 2 encontros e 1 recap."), CTA destrutivo à direita, cancel à esquerda, **autofocus no cancel** (per a11y spec).

### 6.5 Empty State Patterns

**Regra de ouro:** empty state **é o primeiro conteúdo visível em muitas surfaces**. Nunca é filler — é onboarding narrativo.

Estrutura canônica:

```
         [Ícone gold 24px]
         
         Frase descritiva curta
         Linha 2 com tom amigável
         
         [Primary CTA]   [Link secundário]
```

**Variantes por role/auth** (fix F-05):

| Surface | Mestre empty | Player auth empty | Player anon empty |
|---|---|---|---|
| Quests | "Crie a primeira quest" + CTA | "Seu mestre ainda não criou quests" | idem player auth |
| Notas | "Capture a primeira ideia" + CTA | "Escreva suas primeiras observações" | "Notas precisam de conta — [Criar conta]" |
| Timeline | "A história começa aqui" | "Ainda sem eventos registrados" | idem |

### 6.6 Modal & Drawer Patterns

**Decisão travada:** **drawer/slideover preferido a modal** pra forms de create/edit. Modal reservado para:
1. Confirmations destrutivas (Apagar X?)
2. Info overlays (Atalhos de teclado via `?`)
3. Blocking actions (Iniciar combate? Pausar combate?)

**Nunca modal pra:**
- Create/edit de entidade (use drawer)
- Conteúdo que podia ser surface inteira
- Warnings que podem ser toast/banner

### 6.7 Toast Patterns

Sonner lib já integrada. Posicionamento:
- Desktop: bottom-right
- Mobile: bottom-center (acima do bottom tab bar)

Durações:
- Info: 4s
- Success: 3s
- Warning: até dismiss manual
- Error: até dismiss manual

Stack máximo 3. Nunca toast pra ação crítica (use modal).

---

## 7. Illustrations & Imagery

### 7.1 MVP v1.0 — "Sem ilustração própria"

**Decisão pragmática (John):** não criamos sistema de ilustração v1. Custo alto, ROI baixo no MVP. Usamos:
- Lucide icons gold (cobrem nav + sistema)
- Emojis narrativos permitidos (lista em §4.3.3)
- Character portraits via upload do usuário (já existe)

### 7.2 Imagens dos usuários

**Tratamento canônico:**
- Character portrait: círculo 40px (avatar), 64px (card), 128px (ficha completa)
- Background: border-subtle; sem overlay gradiente (não somos app de fotos)
- Fallback: initial em gold sobre bg-elevated (já feito nos wireframes)
- Aspect ratio livre pra handouts; max-width 800px

### 7.3 Handouts (killer-feat 10.4)

- Imagem/link arrastado pela Mestre em Rodar
- Aparece no card "Handouts desta sessão" no Recap
- Max 5 MB (compressão automática)
- Tratamento: border gold/35% na thumb, click abre lightbox

### 7.4 v2.0+ — Sistema próprio (roadmap)

Se ROI justificar:
- Set de 20-30 ilustrações pra empty states narrativos (biblioteca vazia, mesa vazia, dungeon)
- Estilo: line-art gold em fundo dark, inspirado em manuscritos
- Artist-directed, não AI genérico (AI gera "fantasy-art genérico" = dilui brand)

---

## 8. Data Visualization

### 8.1 HP Bar

**Regra sagrada** (memory `feedback_hp_legend_sync.md`): cor da barra deriva de `getHpStatus()` do arquivo `lib/utils/hp-status.ts`. Esse arquivo é a **única** fonte de verdade. Nunca hardcode thresholds ou labels.

**Tiers canônicos (legacy thresholds — travados 2026-04-21 por Dani):**

| Tier | Threshold | Cor barra | Cor texto | Token semântico |
|---|---|---|---|---|
| **FULL** | `current === max` (100%) | `#29A36E` emerald-400 | emerald-400 | `success` |
| **LIGHT** | `70% < pct < 100%` | `#22C55E` green-500 | green-400 | `success` (dim) |
| **MODERATE** | `40% < pct ≤ 70%` | `#F59E0B` amber-400 | amber-400 | `warning` |
| **HEAVY** | `10% < pct ≤ 40%` | `#EF4444` red-500 | red-500 | `destructive` |
| **CRITICAL** | `pct ≤ 10%` | `#DC2626` red-600 | white + bg red-700 | `critical` |

**Regras imutáveis:**
1. Labels em **inglês nos 2 locales** (memory `feedback_hp_tier_labels.md`) — FULL/LIGHT/MODERATE/HEAVY/CRITICAL
2. Qualquer percentage string em UI usa `formatHpPct(status, flagV2)` — **jamais** hardcoded "70-100%"
3. Se `ff_hp_thresholds_v2` estiver on, bandas viram 75/50/25 (`HP_THRESHOLDS_V2` no código). Legend DEVE refletir.
4. "DEFEATED" é display-only state via `deriveDisplayState()` — nunca persistido na union `HpStatus`

**Fonte-de-verdade no código:** `lib/utils/hp-status.ts` — `HP_STATUS_STYLES`, `HP_THRESHOLDS_LEGACY`, `HP_THRESHOLDS_V2`.

### 8.2 Combat stats (Recap Números)

**Regra F-10:** só aparece após ≥3 combates finalizados. Antes disso: "Estatísticas aparecem depois da 3ª sessão rodada".

Quando aparece:
- Tempo médio de combate
- Tentativas de fuga
- Tipos de monstros mais usados
- Distribuição de XP

Apresentação: números grandes em Inter Bold, contexto em small text abaixo. Sem gráficos pesados (não somos dashboard de BI).

### 8.3 Progress indicators

- Linear (HP bar, XP bar): 8px height, full-width
- Circular (evitar v1; usa LoadingSpinner só quando sem contexto)
- Step indicator (onboarding W0b): 3 círculos numerados, active gold
- Counter badges: `Badge` component em muted ou semantic color

### 8.4 Timeline (Recap)

Vertical, lado esquerdo tem dot colorido por tipo de evento + linha conectora subtle. Direita tem timestamp + descrição + backlinks.

---

## 9. Do's & Don'ts — As 10 Regras de Ouro

```
┌─────────────────────────────────────────────────────────────────┐
│                    OS 10 MANDAMENTOS DO GRIMÓRIO                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. ✅ Gold é brand. Reserve.                                   │
│     ❌ Gold em botão genérico, banner info, every-other-thing   │
│                                                                 │
│  2. ✅ Serif (Cinzel) só em nomes próprios                      │
│     ❌ Serif em body, labels, números, botões                   │
│                                                                 │
│  3. ✅ SVG gold em sistema/nav/repetido                         │
│     ❌ Emoji em sidebar, topbar, botões de ação                 │
│                                                                 │
│  4. ✅ Tokens via Tailwind/CSS vars sempre                      │
│     ❌ Hex inline ou cor sólida em border                       │
│                                                                 │
│  5. ✅ Skeleton durante reconexão/loading                       │
│     ❌ Spinner genérico ou tela branca                          │
│                                                                 │
│  6. ✅ Density budget: ≤8 elementos above-fold                  │
│     ❌ 14 elementos competindo por atenção                      │
│                                                                 │
│  7. ✅ Empty state condicional por role + auth                  │
│     ❌ "Crie o primeiro X" pra quem não pode criar              │
│                                                                 │
│  8. ✅ Mode é derivado do server, nunca localStorage            │
│     ❌ Persistir "mode=run" em localStorage (quebra reconexão)  │
│                                                                 │
│  9. ✅ Motion minimal e semântica (150-300ms)                   │
│     ❌ Animações decorativas, bouncing, parallax                │
│                                                                 │
│ 10. ✅ Um caminho por destino (modes + surfaces)                │
│     ❌ Pill bar + sidebar + breadcrumb simultâneos              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 10. Implementation Guide

### 10.1 Tailwind Config (arquivo: `tailwind.config.ts`)

```typescript
// Trecho relevante — adicionar ao config existente SEM remover tokens legados
export default {
  theme: {
    extend: {
      colors: {
        // Grimório tokens (v1)
        bg: { DEFAULT: "#14161F", elevated: "#181A25", raised: "#1F222E" },
        gold: { DEFAULT: "#D4A853", dim: "#A88339" },
        text: { DEFAULT: "#E6E5E1", muted: "#9896A0", subtle: "#6B6A72", inverse: "#14161F" },
        success: { DEFAULT: "#29A36E", dim: "#207352" },
        warning: { DEFAULT: "#F59E0B" },
        destructive: { DEFAULT: "#E05C3B" },
        info: { DEFAULT: "#5B8DEF" },
      },
      fontFamily: {
        sans: ["Inter", ...defaultTheme.fontFamily.sans],
        display: ["Cinzel", "serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      fontSize: {
        display: ["32px", { lineHeight: "40px", fontWeight: "600" }],
        micro: ["11px", { lineHeight: "14px", fontWeight: "600", letterSpacing: "0.08em" }],
        nano: ["10px", { lineHeight: "12px", fontWeight: "600", letterSpacing: "0.08em" }],
      },
      borderColor: {
        subtle: "rgba(255,255,255,0.06)",
        DEFAULT: "rgba(255,255,255,0.12)",
        strong: "rgba(255,255,255,0.20)",
        gold: "rgba(212,168,83,0.40)",
      },
      zIndex: {
        dropdown: "20",
        sticky: "30",
        "banner-combat": "40",
        modal: "50",
        toast: "60",
        tooltip: "70",
      },
      transitionDuration: {
        instant: "0ms",
        fast: "150ms",
        base: "200ms",
        medium: "300ms",
        slow: "400ms",
      },
    },
  },
}
```

### 10.2 CSS Variables (arquivo: `app/globals.css`)

Mantém o legado `--accent-gold` etc. Adiciona os novos em camada semântica:

```css
@layer base {
  :root {
    /* Grimório v1 tokens (duplicam como CSS vars pros componentes legados consumirem) */
    --grim-bg: 233 26% 10%;
    --grim-bg-elevated: 233 22% 13%;
    --grim-gold: 39 56% 58%;
    --grim-text: 40 5% 90%;
    /* ... */
  }
}
```

### 10.3 Figma Variables (mapping)

Quando rate limit destravar, criar no Figma:
- **Collection:** "Grimório v1"
- **Modes:** Dark (only; light é v3)
- **Groups:** Color / Typography / Spacing / Radius / Motion
- Tokens bindados a variables via Figma Plugin API (`use_figma`)

### 10.4 Component implementation order (Fase B)

1. Tokens → Tailwind + CSS vars (1h)
2. Primitives: Button, Input, Badge, Card, CheckCircle (4h)
3. Composites: Topbar, Sidebar, BottomTabBar, ModeItem (6h)
4. Modal/Drawer/Toast patterns (3h)
5. Domain: HPBar, InitiativeRow, BacklinkChip (4h)
6. QuickSearch (Ctrl+K) integração com `cmdk` existente (3h)

**Total Fase B estimada:** 3 dias de dev focado.

---

## 11. Evolution Roadmap

### v1.0 — MVP (release atual)
Tudo deste documento. Dark-only. Sem ilustração própria.

### v1.5 — Backlinks & tags viventes (~1 sprint pós-MVP)
- `@autocomplete` com chip renderizado
- Tag system com autocomplete
- Backlink page (todas menções de um NPC)

### v2.0 — Permissões + Handouts (~2 sprints)
- Sistema de permissões granular (player edita própria ficha apenas)
- Handout drop (Mestre arrasta imagem → player recebe)
- Mapa Mental com view "público"

### v2.5 — Themes (~1 sprint)
- Light mode (se ROI por comunidade pedir)
- Tema "High contrast" (a11y)
- Tema "Sepia reading" (pra Recap lido em celular)

### v3.0 — Sistema de ilustração próprio (~3 sprints)
- 20-30 ilustrações originais line-art gold
- Empty states narrativos ilustrados
- Onboarding com mini-história

### v3.5 — Sound design (~2 sprints)
- Soundboard com biblioteca curada
- Ambientes sonoros por mood
- Sincronização DM→Player de faixa atual

---

## 12. Anti-Patterns Catalog

Mantido como **living document**. Se dev/designer erra, registra aqui pra não repetir.

### AP-01 — Gold genérico
"Coloquei gold no botão de excluir pra ficar bonito."
**Erro:** gold é brand/primário. Confunde. Use destructive.

### AP-02 — Serif em labels de form
"Achei que ficaria sofisticado."
**Erro:** serif em labels vira decoração vazia. Reserve pra nomes próprios.

### AP-03 — Pill bar no topo
"Já tem sidebar, mas preciso de acesso rápido."
**Erro:** fere P6. Se tem sidebar, não tem pill bar. Escolha um.

### AP-04 — Modal pra create NPC
"Modal é menos disruptivo que nova página."
**Erro:** modal roube o contexto. Use slideover (§6.4.1).

### AP-05 — Spinner global
"App carregando..."
**Erro:** vazou na tela branca. Use skeleton do shape específico (Resilient Reconnection).

### AP-06 — Hex inline
`color: "#D4A853"`
**Erro:** perde update do token. Sempre `text-gold` ou `var(--grim-gold)`.

### AP-07 — Emoji em botão "+ NPC"
"Fica mais amigável."
**Erro:** inconsistência. + e ícone do tipo entity são SVG Lucide.

### AP-08 — `localStorage.setItem('mode', 'run')`
"Pra lembrar onde o user tava."
**Erro:** quebra Resilient Reconnection. Mode é server-derived.

### AP-09 — Animação decorativa em mode switch
"Achei que precisava de transição."
**Erro:** mode switch é instant (§4.4.3). Server decide, UI segue.

### AP-10 — Empty state genérico "Nada aqui"
**Erro:** empty state é onboarding narrativo, não filler. Role-conditional copy.

---

## 13. Contribution Guide

### 13.1 Como propor mudança no DS

1. Abrir issue em `_bmad-output/design-system-proposals/`
2. Descrever: token/componente/pattern novo + razão + exemplos de uso
3. Review de Sally (UX lead) + Winston (implementação)
4. Se aprovado: atualizar este doc + tokens + components em PR único
5. Changelog versionado no topo deste doc

### 13.2 Como reportar anti-pattern

PR que identifica AP em código existente:
1. Criar entrada em §12 deste doc
2. Link pro arquivo/linha onde AP apareceu
3. Patch aplicando o pattern correto
4. Memory entry em `.claude/memory/` se for recorrente

### 13.3 Versionamento

Semver adaptado:
- **Major (2.0):** mudança de filosofia (ex: introdução de light mode)
- **Minor (1.1):** novo componente ou token
- **Patch (1.0.1):** correção de token existente, fix de anti-pattern

---

## 14. Apêndices

### A. Glossário

- **Surface** — área navegável dentro de um Mode (ex: Próxima Sessão dentro de Preparar)
- **Mode** — contexto primário do usuário (Preparar, Rodar, Recap, Minha Jornada, Assistindo)
- **Shell** — esqueleto comum (Topbar + Sidebar + Main) compartilhado por todos os modes
- **Token** — variável semântica (cor, spacing, etc) referenciada em código
- **Primitive** — componente atômico sem domínio (Button)
- **Composite** — componente composto de primitives (Topbar)
- **Domain** — componente específico Pocket DM (HPBar)

### B. Arquivos correlatos

| Arquivo | Papel |
|---|---|
| [01-design-tokens.md](./01-design-tokens.md) | Spec atômica dos tokens |
| [02-component-library.md](./02-component-library.md) | 20 componentes com props/variants/states |
| [03-interactions-spec.md](./03-interactions-spec.md) | 12 interações frame-by-frame |
| [04-states-catalog.md](./04-states-catalog.md) | States por surface × role × condição |
| [06-i18n-strings.md](./06-i18n-strings.md) | ~180 strings PT-BR × EN |
| [07-accessibility-spec.md](./07-accessibility-spec.md) | ARIA, keyboard, contrast |
| [08-edge-cases-catalog.md](./08-edge-cases-catalog.md) | ~40 edge cases |
| [redesign-proposal.md](./redesign-proposal.md) | v0.2 spec source-of-truth |

### C. Referências externas
- Lucide Icons: https://lucide.dev/
- Inter font: https://rsms.me/inter/
- Cinzel font: Google Fonts (fallback acceptable: Playfair Display, Cormorant)
- JetBrains Mono: https://www.jetbrains.com/lp/mono/
- WCAG 2.1 AA: https://www.w3.org/TR/WCAG21/

---

## Changelog

**v1.0 (2026-04-21)** — Primeira versão publicada. Party mode session com Sally + Mary + Winston + John. Consolida findings da auditoria 2026-04-21, redesign-proposal v0.2, e docs 01-02-03-04-06-07-08.

---

**Fim do documento. Alma do produto consolidada. Próxima pedra: implementação.**
