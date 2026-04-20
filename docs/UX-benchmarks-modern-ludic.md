# UX Benchmarks — Moderno × Lúdico

> **Status:** Diretriz UX cross-cutting (afeta todos os specs da Onda 2-4)
> **Data:** 2026-04-19
> **Origem:** Party Mode session — visão do usuário sobre fusão "ferramenta séria + alma de taverna"
> **Aplicação:** TODO spec de UI do PocketDM pós-Linguagem-Ubíqua

---

## 1. Tese central

PocketDM deve ser **"uma ferramenta séria com alma de taverna"** — não "Notion com skin de D&D" nem "D&D Beyond com grafos". A fusão é arquitetural, não estética:

```
┌───────────────────────────────────────────────┐
│  CAMADA 3 — Alma (micro-interactions)         │
│  dice roll animations, iluminação dramática,  │
│  sons opcionais, narrativa em copy            │
├───────────────────────────────────────────────┤
│  CAMADA 2 — Pele (tokens visuais)             │
│  paleta taverna, tipografia serifada,         │
│  texturas sutis, iconografia medieval         │
├───────────────────────────────────────────────┤
│  CAMADA 1 — Esqueleto (lógica de UI moderna)  │
│  grafo bidirecional, blocos componíveis,      │
│  busca universal, navegação por teclado,      │
│  density controlável, mobile-first            │
└───────────────────────────────────────────────┘
```

**Regra de ouro:** se você remover a Camada 2 e 3, a Camada 1 deve continuar sendo uma ferramenta usável por si só. Isso previne que o lúdico "esconda" uma UX fraca.

---

## 2. Benchmarks modernos (O QUE PEGAR)

### 2.1 Obsidian — Gold standard de grafo pessoal

**Features a adotar:**

- **[[Wikilinks]] bidirecionais** — digitar `[[Viktor]]` dentro de uma nota cria link automático. Aplicação no PocketDM: ao escrever nota, digitar `[[` abre autocomplete de entidades (NPCs, Locais, Facções). Link real fica no `campaign_mind_map_edges` (ver PRD Entity Graph §6.2).
- **Painel de backlinks** — em cada entidade, "Notas que mencionam isto" com preview do contexto. Já previsto no PRD Entity Graph §7.5.
- **Graph view filtrável** — Mind Map existente (`CampaignMindMap.tsx`) já cobre. Adicionar: filtros por tipo (NPC/Local/Facção), filtros por "grau de conexão" (mostrar só 2º grau).
- **Atalhos de teclado** — Ctrl+O abre quick-switcher universal (qualquer entidade). Ctrl+K abre command palette.

**Features a IGNORAR:**

- Sistema de plugins de terceiros — fora do escopo do produto.
- Markdown bruto exposto — users de RPG não querem ver sintaxe.

### 2.2 Notion — Gold standard de blocos componíveis + database views

**Features a adotar:**

- **Blocos arrastáveis** — parágrafo, lista, toggle, callout, divider. Aplicação: `CampaignNotes` deve aceitar blocos além de texto corrido (inicialmente: texto, toggle, callout, divider). Incremental.
- **Database views (Table / Board / Gallery)** — mesmo dado, múltiplas visualizações. Aplicação: tab Locais → switch entre lista / árvore / grid de cards.
- **@mentions em qualquer lugar** — digitar `@Viktor` converte em chip clicável. Similar ao `[[wikilink]]` do Obsidian. Escolher UMA sintaxe (recomendação: `@` para entidades, `[[` reservado para notas linkadas).
- **Templates de página** — "Nova NPC (template: comerciante)" pré-preenche campos. Aplicação em Onda 6 — templates de NPC/Local por arquétipo.
- **Toggle blocks (spoilers)** — "clique pra revelar". Perfeito pra notas do DM com segredos.

**Features a IGNORAR:**

- Drag-to-rearrange de tudo — complexidade enorme, valor marginal pra RPG.
- Properties arbitrárias por bloco — abstração pesada demais.

### 2.3 Roam Research — Gold standard de daily notes + backlinks

**Features a adotar:**

- **Daily notes** — "Notas da sessão de 15/03". Aplicação: cada `campaign_sessions.session_date` gera automaticamente uma nota "dailyó" vinculada à sessão; tudo escrito ali linka à sessão (tabela `campaign_sessions`, já existe). Vira diário narrativo.
- **Block references (((id)))** — citar trecho de uma nota em outra. Aplicação avançada (Onda 6+).
- **Pull & push contexto** — abrir qualquer entidade e ver a "teia" ao redor. Já no PRD Entity Graph §7.5.

**Features a IGNORAR:**

- Tudo-como-outline obrigatório — rígido demais.
- Sintaxe complexa de queries — `{{table}}` etc.

### 2.4 Tana — Gold standard de entity-first note taking

**Features a adotar:**

- **Supertags** — uma nota pode ser "também um NPC" via tag especial. Aplicação: nota que vira NPC via 1 clique ("promover esta nota a NPC" → cria `campaign_npcs` + edge `mentions` → nota vira ficha estruturada).
- **Schema implícito por tipo** — ao criar "NPC Viktor", Tana sugere campos (raça, classe, alinhamento) baseado em outros NPCs do vault.
- **Smart views** — "todos os NPCs aliados" é uma query live, não uma pasta.

**Features a IGNORAR:**

- Onboarding gigante — PocketDM é mais direto.

### 2.5 Linear — Não é grafo mas é referência de UX moderna em SaaS premium

**Features a adotar:**

- **Command palette (Cmd+K)** — ação universal.
- **Keyboard-first** — toda ação tem atalho.
- **Micro-loading states** — skeleton screens elegantes, nunca spinner.
- **Densidade dupla** — switch "comfy / compact" em listagens (ataca F07/F08 do beta test).

---

## 3. Benchmarks lúdicos RPG (O QUE EVITAR + INSPIRAÇÕES)

### 3.1 D&D Beyond — Gold standard de ficha técnica D&D

**Features a adotar:**

- **Integração precisa com regras** — modificadores auto-calculados, spell slots trackados. PocketDM já faz isso no Player HQ.
- **Copy narrativa** — "Prepare seus feitiços" em vez de "Edit spell list".

**Features a EVITAR:**

- Interface de planilha rígida — PocketDM deve ser mais fluido.
- Monetização agressiva — não se aplica.
- Mobile fraco — PocketDM precisa ser mobile-first (ao contrário deles).

### 3.2 Alchemy RPG — Gold standard de imersão visual

**Features a adotar:**

- **Iluminação dramática** — cards com sombras amber/dourado em fundo escuro. PocketDM já tem isso parcialmente.
- **Texturas sutis** — pergaminho + couro sem virar tema de fantasia genérico.
- **Dice rolls cinematográficos** — animação de dado caindo, não só número aparecendo.
- **Soundscape opcional** — ambient tavern, ambient battle. Toggle off por default.

**Features a EVITAR:**

- Loading lento — Alchemy é pesado. PocketDM tem que ser rápido (B04 spike em andamento).
- Complexidade de setup — Alchemy exige horas. Pocket é em minutos.

### 3.3 Owlbear Rodeo — Gold standard de tabletop-online-simples

**Features a adotar:**

- **Onboarding zero** — guest mode que funciona em 30s. PocketDM já tem `/try`.
- **Respeito pelo tempo do DM** — zero setup desnecessário na mesa.

**Features a IGNORAR:**

- Foco 100% em VTT (virtual tabletop) — PocketDM não é VTT.

### 3.4 Arcane Library (referência estética)

**Inspiração direta para camada visual:**

- Iconografia fina (linework de pena) em vez de ícones flat modernos.
- Numerais romanos para headings decorativos.
- Divisores com ornamento (asterismo ❦, fleuron ❧).
- Estes devem ser **opcionais / sutis** — se você remover, o esqueleto segue funcional.

---

## 4. Princípios de fusão

### 4.1 "Grafo é o esqueleto, não a decoração"

O Entity Graph (Onda 3) não é "feature avançada" — é o modelo mental do app. TUDO que o DM cria deve, eventualmente, estar no grafo. Exemplo:

- ❌ Nota solta na lateral, sem link a nada.
- ✅ Nota criada no contexto do NPC Viktor já nasce linkada (RF-13 do PRD).

### 4.2 "Cartas, não cards"

Terminologia interna: chamamos de **carta** (não card) pra lembrar que cada unidade deve ter "peso" — como carta de tarô ou baralho de encontros. Implementação:

- Bordas arredondadas com tom dourado.
- Elevação via shadow suave (não hard-line).
- Verso/avesso implícito — hover revela "actions por trás" (flip metaphor sutil, sem animação 3D cara).

### 4.3 "Rolagem de dado como recompensa, não decoração"

Toda ação importante que envolve acaso deve ter animação de dado (já implementado parcialmente via `DiceRoller`). Cada rolagem = micro-recompensa sensorial. Regra:

- < 2 segundos.
- Mudo por padrão (som via toggle em settings).
- Resultado claro (número grande), mas dado visual é secundário.

### 4.4 "Iluminação como hierarquia"

Em vez de hierarquia por tamanho/peso de fonte (moderno), usar também **iluminação**:

- Elemento "em foco" = halo dourado sutil.
- Elemento "disponível mas calmo" = borda amber dim.
- Elemento "inativo" = borda slate/esfumaçada.

Exemplo: combate ativo tem halo visível ao redor. Combate finalizado tem apenas borda. Isso dá sensação de "vela acesa" em vez de apenas "elemento selecionado".

### 4.5 "Copy narrativa com precisão técnica"

Cada label deve ser **narrativo E preciso**. Exemplos:

| Label genérico (evitar) | Label narrativo (adotar) |
|---|---|
| "Create NPC" | "Dar vida a um NPC" (PT-BR) / "Breathe life into an NPC" (EN) |
| "Delete location" | "Apagar do mapa" |
| "Save draft" | "Guardar no pergaminho" |
| "No items found" | "O baú está vazio" |

**Regra:** se o texto narrativo cria ambiguidade técnica, prefira o técnico. Ambiguidade mata produtividade.

### 4.6 "Mobile não é depois"

O DM beta tester usa mobile em sessão (contexto presencial, mesa). Portanto:

- Todo padrão moderno acima deve ter equivalente mobile.
- Mobile NÃO é subset — é target primário em contextos de sessão.
- Densidade "compact" é default em viewport < 768px.

---

## 5. Impacto em specs já escritos

Este doc é diretriz — a aplicação concreta deve permear:

### 5.1 PRD Entity Graph (`docs/PRD-entity-graph.md`) — **atualização recomendada**

**Adicionar:**
- §7.8 Sintaxe de linking — `@entidade` para chips, `[[nota]]` para notas linkadas. Consistência com benchmarks modernos.
- §7.9 Quick switcher (Ctrl+K / Cmd+K) — abrir qualquer entidade em 1 tecla.
- §7.10 Daily notes — cada `campaign_sessions` gera nota automática linkada (Roam-style).
- §7.11 Supertag promoção — "promover nota a NPC" (Tana-style). Fase 3g ou Onda 6.

### 5.2 SPEC Campaign Dashboard (`docs/SPEC-campaign-dashboard-briefing.md` — **a produzir**)

**Deve incluir:**
- Dashboard como "daily note" automático da campanha (inspiração Roam).
- Widgets reordenáveis (Notion-style) — "próxima sessão", "últimos NPCs", "combates recentes".
- Hero visual: iluminação dramática (§4.4) com halo no "próximo combate agendado".
- Mobile: stack vertical, compact por default.

### 5.3 SPEC Menu Redesign (`docs/SPEC-navigation-redesign.md` — **a produzir**)

**Deve incluir:**
- Sidebar esquerda estilo Notion (collapse to icons) — F13 do beta.
- Grafo mini-mapa navegável no rodapé da sidebar (Obsidian-style).
- Command palette Cmd+K no topo da sidebar.
- Dark mode default (taverna = fundo escuro).

### 5.4 SPEC Campaign HQ Cards (`docs/SPEC-campaign-hq-cards-crud.md`) — **atualização recomendada**

**Adicionar:**
- §3.4 Terminologia "carta" em vez de "card" em copy narrativa (mas mantém `Card` component name em code — separação ubíqua/técnica).
- §3.5 Elevação + halo em carta ativa; borda dim em cartas não-focadas (§4.4).

### 5.5 SPEC Player Notes Visibility (`docs/SPEC-player-notes-visibility.md`) — **pequeno ajuste**

**Adicionar:**
- §4.1 Toggle visibilidade com ícone narrativo: pergaminho lacrado (privado) ↔ pergaminho aberto (compartilhado).

### 5.6 SPEC Auto-invite Combat (`docs/SPEC-auto-invite-combat.md`) — **já alinhado**

Toast de convite pode ter micro-efeito de "chamado ao combate" — som de corneta opcional (ver §4.3 — mudo por default). Adicionar em polish.

### 5.7 Onda 4 — Player HQ compact (F07/F08)

**Aplicar benchmark Linear (§2.5):**
- Switch "comfy / compact" nas seções.
- Compact default em mobile.
- Densidade alta sem perder legibilidade (inspiração Notion tabela).

---

## 6. Pattern library proposta (tokens + componentes)

### 6.1 Tokens de iluminação (CSS variables)

```css
/* Já existentes (confirmar nomes reais no codebase) */
--gold: rgb(200, 160, 80);
--parchment: rgb(244, 230, 200);
--tavern-dark: rgb(30, 20, 10);

/* Novos propostos */
--halo-active: 0 0 24px rgba(200, 160, 80, 0.35);   /* §4.4 elemento em foco */
--halo-available: 0 0 8px rgba(200, 160, 80, 0.1);  /* elemento disponível calmo */
--dim-inactive: 1px solid rgba(100, 80, 40, 0.3);   /* elemento inativo */
```

### 6.2 Componentes-chave a criar / consolidar

| Componente | Inspiração | Usado em |
|---|---|---|
| `<QuickSwitcher />` | Obsidian Ctrl+O, Linear Cmd+K | Global (sidebar + atalho) |
| `<EntityMention />` | Notion @, Obsidian [[]] | Notas + descrições |
| `<DailyNoteAutoCreate />` | Roam Research | Session start hook |
| `<LitCard />` | Arcane Library + CSS halo | Cards de combate ativo, NPC em cena |
| `<DensityToggle />` | Linear | Topo de listagens |
| `<ToggleBlock />` (spoiler) | Notion toggle | Notas do DM com segredos |
| `<DiceRollAnimation />` | D&D Beyond (ver existente) | Toda rolagem importante |

### 6.3 Princípios de micro-animação

- Todas as animações ≤ 300ms por default.
- Easing: `cubic-bezier(0.4, 0, 0.2, 1)` (material standard).
- Respeitar `prefers-reduced-motion` — zero animação se user pediu.
- Dice roll é exceção (2s), mas também respeita reduced-motion (cai pra número direto).

---

## 7. Anti-patterns (o que proibir explicitamente)

1. **Ícones emoji decorativos misturados com iconografia medieval** — escolher uma linha e seguir.
2. **Fontes cursivas em corpo de texto** — reservar para display/headings decorativos.
3. **Cores saturadas puras (vermelho #FF0000)** — paleta deve ser amber/parchment/slate com saturação baixa.
4. **Sombras drop pesadas (blur 30px+)** — preferir halos sutis (§4.4).
5. **Scroll horizontal em mobile (exceto tabs bar)** — maldição de UX.
6. **Loading spinners genéricos** — skeleton screens temáticos (pergaminho carregando, dado rolando).
7. **Confirmações destrutivas sem context** — sempre narrativo: "Tem certeza que deseja apagar este NPC? Todas as suas notas e conexões serão perdidas."
8. **Empty states genéricos** — cada um narrativo + CTA (ex.: "O baú está vazio. Dar vida a um NPC?" em vez de "No items").

---

## 8. Processo de validação

Toda nova tela/feature grande passa por 3 checks antes de merge:

1. **Teste "remova a pele"** — se eu remover cores/fontes/ícones, a UX ainda é usável? (esqueleto sólido)
2. **Teste "adicione a alma"** — o lúdico emerge sem ser tema cosplay? (micro-interactions coerentes)
3. **Teste mobile** — funciona em iPhone SE (iOS 15, viewport 375px)? (mobile não é afterthought)

---

## 9. Referências externas (inspiração — não copiar)

- Obsidian: https://obsidian.md — note-taking + graph
- Notion: https://notion.so — blocks + databases
- Roam Research: https://roamresearch.com — daily notes + backlinks
- Tana: https://tana.inc — entity-first notes
- Linear: https://linear.app — keyboard-first SaaS
- Alchemy RPG: https://alchemyrpg.com — iluminação dramática
- Arcane Library: https://arcane-library.com — estética ornamental
- Shadcn/ui: https://ui.shadcn.com — já base técnica do PocketDM

---

## 10. Log de decisões

| Data | Decisão | Origem |
|---|---|---|
| 2026-04-19 | Fusão "ferramenta séria + alma de taverna" (§1) | User (Dani_) |
| 2026-04-19 | Grafo é o esqueleto, não feature avançada (§4.1) | Party Mode |
| 2026-04-19 | Cartas em vez de cards (§4.2) — terminologia interna | Party Mode |
| 2026-04-19 | Copy narrativa com precisão técnica (§4.5) | Party Mode |
| 2026-04-19 | Mobile é target primário (§4.6) | Beta test feedback (DM usa mobile) |
| 2026-04-19 | Benchmarks: Obsidian + Notion + Roam + Linear como esqueleto | Sally (UX) |
| 2026-04-19 | Benchmarks lúdicos: Alchemy + Arcane Library como inspiração (não copy) | Sally (UX) |

---

## 11. Próximos passos

1. **Aprovar este doc** — sem aprovação, é aspiração.
2. **Atualizar PRD Entity Graph** — adicionar §7.8 a 7.11 (sintaxe linking, quick switcher, daily notes, supertag).
3. **Produzir SPEC Campaign Dashboard** (gap #3 do ROADMAP) incorporando §5.2.
4. **Produzir SPEC Navigation Redesign** (gap #4) incorporando §5.3.
5. **Propor spike UX — protótipo Figma** dos 3 elementos mais novos:
   - LitCard (iluminação dramática)
   - QuickSwitcher (Ctrl+K)
   - Daily note automática
6. Validar com 1-2 beta testers antes de codar — custo de Figma < custo de refactor.
