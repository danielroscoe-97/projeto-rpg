# Campaign HQ + Player HQ — Findings (2026-04-21)

**Capturas realizadas:** 12 screenshots (Mestre desktop 8, Mestre mobile 2, Player desktop 1, Player mobile 1)
**Console:** 1 erro consistente em todas as páginas (não investigado — fora do escopo desta auditoria)
**Fonte:** `https://pocketdm.com.br` em produção, conta de Dani, campanha `Krynn` (5 jogadores, combate ativo) como Mestre e `Curse of Strahd` como player

---

## 🔴 Blockers (resolver antes do redesign)

### F-01 — Pill nav bar corta 10/13 items no mobile (1157px ocultos)
- **Onde:** Mestre / todos viewports / todas as seções
- **Evidência:** `screenshots/dm-mobile-05-npcs.png` + medida via `scrollWidth=1467 / clientWidth=310 / overflowPx=1157` em mobile; `overflowPx=363` em desktop 1440
- **Tag:** `mobile-broken` + `discoverability`
- **Job impactado:** Mestre-Prep-1, Mestre-Prep-2, Mestre-Run-1 (tudo)
- **Severidade:** 🔴 blocker
- **Descrição:** A `CampaignNavBar` usa `overflow-x-auto scrollbar-hide` com 13 pills (12 + Overview). Em desktop 1440 já esconde ~2 pills. Em mobile 390px, **apenas 3 de 13 pills aparecem** — o usuário precisa scrollar 1157px lateralmente **sem nenhum indicador visual** de que existem mais seções. É literalmente o "menu que aparece e some" que Dani reportou. Usuário novo JAMAIS descobre settings, mindmap, inventory, factions no mobile.
- **Sugestão:** substituir por (a) seletor dropdown + breadcrumb + search, ou (b) sidebar lateral persistente em desktop + bottom-sheet no mobile — ver wireframes.

### F-02 — i18n key `campaign.player_hq_button` aparecendo RAW na UI
- **Onde:** Player / desktop + mobile / overview — card "Meu Personagem"
- **Evidência:** `screenshots/player-desktop-00-overview.png`, `screenshots/player-mobile-00-overview.png`
- **Tag:** `copy` + `consistency`
- **Job impactado:** Player-Read-1
- **Severidade:** 🔴 blocker (é bug de produção, não de UX)
- **Descrição:** O botão abaixo do status do personagem (CA 21) exibe a string literal `campaign.player_hq_button` em vez da tradução. Falta a chave em `messages/pt-BR.json` (e provavelmente `en.json` também).
- **Sugestão:** adicionar chave no arquivo de i18n. Verificar outras `player_hq_*` faltando.

### F-03 — 4 níveis de navegação competindo
- **Onde:** Mestre / desktop / qualquer seção interna
- **Evidência:** `screenshots/dm-desktop-01-sessions.png`, `screenshots/dm-desktop-02-encounters.png`
- **Tag:** `tab-misfit` + `density-issue`
- **Job impactado:** Todos (ruído cognitivo global)
- **Severidade:** 🔴 blocker
- **Descrição:** Simultaneamente visíveis:
  1. Sidebar global esquerda (Buscar, Visão Geral, Campanhas, Combates, Personagens, Compêndio, Soundboard, Presets, Configurações)
  2. Sidebar "CAMPANHA ATUAL" no meio da esquerda (OPERACIONAL + MUNDO + REGISTRO — duplicando itens da pill bar)
  3. Breadcrumb topo ("← Voltar para Krynn" + avatares + nome do combate)
  4. Pill bar horizontal (13 pills)
  5. Em algumas seções, sub-tabs internas (Builder/Histórico em Encontros; Todos/Visíveis/Ocultos em NPCs; 6 sub-tabs em Quests)
  
  Resultado: **usuário tem 3+ caminhos para a mesma seção, com estados de "ativo" não-sincronizados** entre sidebar e pill bar.
- **Sugestão:** eliminar UM caminho. Ver proposta §3 — recomendação é manter sidebar contextual à campanha + eliminar pill bar, OU o inverso.

---

## 🟠 High (corrigir na 1ª onda do redesign)

### F-04 — Mestre HQ e Player HQ usam modelos de navegação incompatíveis
- **Onde:** Player / desktop / overview vs Mestre / desktop / overview
- **Evidência:** `player-desktop-00-overview.png` vs `dm-desktop-00-overview.png`
- **Tag:** `consistency`
- **Job impactado:** Player-Read-1, Player-Next-1
- **Severidade:** 🟠 high
- **Descrição:** Player HQ é layout de **accordions empilhados** (Meu Personagem / Companheiros / Histórico / Quests) + sidebar mostra todas as seções globais. **Não tem pill bar.** Mestre HQ é pill bar + subsections. Quando Dani troca de papel em campanhas diferentes, o modelo mental trocar totalmente.
- **Sugestão:** unificar shell da campanha (mesmo header, mesma nav model) — variar apenas **densidade** e **acesso** por papel (player tem menos pills; Mestre tem mais).

### F-05 — Empty state "Nenhuma quest ainda / Crie a primeira quest" aparece pra player
- **Onde:** Player / desktop / overview (accordion Quests)
- **Evidência:** `player-desktop-00-overview.png` (bottom)
- **Tag:** `tab-misfit` + `copy`
- **Job impactado:** Player-Read-1
- **Severidade:** 🟠 high
- **Descrição:** Copy do empty state orienta o player a criar uma quest — **mas player não tem permissão**. Resultado: player vê CTA que não pode acionar.
- **Sugestão:** empty state condicional por role. Player vê "Seu mestre ainda não criou nenhuma quest. Ela aparecerá aqui."

### F-06 — Sidebar "Campanha Atual" mostra "Inventário do Grupo" para player
- **Onde:** Player / desktop / sidebar
- **Evidência:** `player-desktop-00-overview.png` (sidebar esquerda)
- **Tag:** `tab-misfit`
- **Job impactado:** Player-Read-1
- **Severidade:** 🟠 high
- **Descrição:** "Inventário do Grupo" é marcado `dmOnly: true` em `CampaignNavBar.tsx`, mas a sidebar esquerda (que é componente diferente) exibe pra player. Clicar provavelmente redireciona ou mostra vazio.
- **Sugestão:** auditar `components/nav/*` — garantir que a source-of-truth de role-gating está UNIFICADA (um único array `NAV_ITEMS` + filter por role).

### F-07 — Triplicata de CTA para combate ativo
- **Onde:** Player / desktop + mobile / overview
- **Evidência:** `player-desktop-00-overview.png`, `player-mobile-00-overview.png`
- **Tag:** `density-issue`
- **Job impactado:** Player-Next-1
- **Severidade:** 🟠 high
- **Descrição:** Quando há combate ativo aparecem **três CTAs idênticos** no mesmo viewport:
  1. Banner vermelho topo ("O Mestre iniciou o combate" + "Entrar no combate")
  2. Card verde "Combate Ativo / Quick Encounter" + "Entrar no Combate"
  3. (Mestre tem também o banner amarelo "Entrar no combate ativo" na overview)
- **Sugestão:** 1 CTA dominante (banner persistente topo). Remover card duplicado.

### F-08 — Label "Histórico" na aba Mestre mostra sessões planejadas (futuro), não passado
- **Onde:** Mestre / desktop / `?section=sessions`
- **Evidência:** `dm-desktop-01-sessions.png`
- **Tag:** `copy` + `consistency`
- **Job impactado:** Mestre-Prep-1, Mestre-Retro-1
- **Severidade:** 🟠 high
- **Descrição:** H1 "HISTÓRICO" + lista de 5 sessões **todas com badge azul "PLANEJADA"** (exceto 1 "ATIVA"). Histórico sugere passado; o conteúdo é futuro. Modelo mental trocado.
- **Sugestão:** renomear seção para "Sessões" (neutro) + dividir em 2 tabs: "Próximas" (planejadas/ativa) vs "Passadas" (finalizadas).

### F-09 — Sessões sem identidade ("QUICK ENCOUNTER" × 5)
- **Onde:** Mestre / desktop / sessions
- **Evidência:** `dm-desktop-01-sessions.png`
- **Tag:** `density-issue`
- **Job impactado:** Mestre-Prep-1, Mestre-Run-1
- **Severidade:** 🟠 high
- **Descrição:** 5 sessões listadas com nome idêntico "QUICK ENCOUNTER". O único diferenciador é a data relativa ("há 2sem" vs "há 3sem"). Quando Dani estiver em campanha real com 20 sessões, vira caos.
- **Sugestão:** nome da sessão DEVE ser editável + default gerado com contexto ("Sessão 12 — 18 Abr" ou similar). Ajudar o Mestre a dar identidade cedo.

### F-10 — 4 métricas de combate para 1 combate registrado
- **Onde:** Mestre / desktop + mobile / overview (bottom)
- **Evidência:** `dm-desktop-00-overview.png` (stats "Taxa de Vitória, Duração Média, Combates, Dificuldade Média")
- **Tag:** `empty-state-poor` + `density-issue`
- **Job impactado:** Mestre-Prep-1
- **Severidade:** 🟠 high
- **Descrição:** Campanha com 1 combate registrado mostra painel com 4 métricas, 3 delas vazias ("—"). Mobile: 2×2 grid consome meia tela pra dizer "sem dados ainda".
- **Sugestão:** ocultar painel até ≥3 combates. Ou substituir por "histórico simples" (lista) até ter dados.

### F-11 — Sub-tabs dentro da seção = 5 níveis de nav em Encontros
- **Onde:** Mestre / desktop / encounters
- **Evidência:** `dm-desktop-02-encounters.png` (tabs "Builder / Histórico" logo abaixo da pill bar)
- **Tag:** `tab-misfit`
- **Job impactado:** Mestre-Prep-1, Mestre-Run-1
- **Severidade:** 🟠 high
- **Descrição:** Encounters tem Builder/Histórico; Quests tem 6 sub-tabs (Todas/Ativas/Disponíveis/Concluídas/Falhadas/Canceladas); NPCs tem Todos/Visíveis/Ocultos + grid/list toggle + 2 dropdowns. É **sub-navegação inconsistente** entre seções — cada uma inventou o próprio padrão.
- **Sugestão:** padrão global de "filtro + busca" (right-sidebar ou toolbar consistente) em vez de sub-tabs. Notion + Linear resolvem com views salvos.

---

## 🟡 Medium

### F-12 — Nomes dos nodes do Mindmap ilegíveis em zoom padrão
- **Onde:** Mestre / desktop / mindmap
- **Evidência:** `dm-desktop-07-mindmap.png`
- **Tag:** `truncation`
- **Job impactado:** Mestre-Prep-1, Mestre-Run-1
- **Severidade:** 🟡 medium
- **Descrição:** Nodes renderizados pequenos demais — texto aparece como borrão em zoom inicial. Obsidian/Notion usam labels persistentes fora do node + zoom level que revela mais info.
- **Sugestão:** labels sempre visíveis embaixo do node + auto-fit initial zoom baseado em viewport.

### F-13 — Mindmap sem legenda de cores
- **Onde:** Mestre / desktop / mindmap
- **Evidência:** `dm-desktop-07-mindmap.png` — topbar tem pills coloridas (NPCs roxo, Notas azul, Jogadores verde, Histórico amarelo, Quests laranja, Bag amarelo, Locais verde, Facções vermelho)
- **Tag:** `discoverability`
- **Job impactado:** Mestre-Prep-1
- **Severidade:** 🟡 medium
- **Descrição:** As pills coloridas no topo funcionam como **filtros E legenda de cores**, mas isso não é sinalizado. Usuário não sabe que clicar oculta o tipo.
- **Sugestão:** título "Filtrar por tipo" + tooltip por pill + estado visual "oculto" claro.

### F-14 — Players section: apenas 1 de 5 personagens com classe/nível visível
- **Onde:** Mestre / desktop / players
- **Evidência:** `dm-desktop-04-players.png`
- **Tag:** `consistency` + `empty-state-poor`
- **Job impactado:** Mestre-Run-1, Mestre-Prep-1
- **Severidade:** 🟡 medium
- **Descrição:** Torin mostra "Half-Elf Druid · Nv 5 + XP 22 + badge Nv5"; os outros 4 (Noknik, Askelad, Satori, Kai) só HP + AC, sem raça/classe/nível. Provavelmente dados incompletos no DB — mas o card não comunica isso (não há placeholder "Ficha incompleta / Pedir ao jogador").
- **Sugestão:** skeleton de ficha + CTA "Convidar a completar".

### F-15 — "Companheiros (1)" mostra o próprio jogador
- **Onde:** Player / desktop / overview
- **Evidência:** `player-desktop-00-overview.png` accordion "Companheiros"
- **Tag:** `copy` + `consistency`
- **Job impactado:** Player-Read-1
- **Severidade:** 🟡 medium
- **Descrição:** Se há só 1 player na campanha, "Companheiros" mostra o próprio player com badge "Você". Labeling estranho.
- **Sugestão:** ocultar accordion quando `count === 1 && único === self`. Ou renomear "Party (2)" e ter "Você + Outros".

### F-16 — "Por facção" dropdown cortado em mobile
- **Onde:** Mestre / mobile / npcs
- **Evidência:** `dm-mobile-05-npcs.png`
- **Tag:** `truncation` + `mobile-broken`
- **Job impactado:** Mestre-Run-1
- **Severidade:** 🟡 medium

### F-17 — "KRYNN" colado na borda esquerda mobile (sem padding)
- **Onde:** Mestre / mobile / overview
- **Evidência:** `dm-mobile-00-overview.png`
- **Tag:** `truncation`
- **Severidade:** 🟡 medium

### F-18 — "CURSE OF STRA..." título cortado mobile
- **Onde:** Player / mobile / overview
- **Evidência:** `player-mobile-00-overview.png`
- **Tag:** `truncation` + `mobile-broken`
- **Severidade:** 🟡 medium
- **Sugestão:** `text-ellipsis` ok, mas título merecia +1 linha OU fonte reduzida no mobile (serif atual está em 32px+ no viewport 390).

### F-19 — Histórico de combates mobile: grid 2×2 de labels CAIXA ALTA consumindo 50% da tela
- **Onde:** Mestre / mobile / overview (scroll down)
- **Evidência:** `dm-mobile-00-overview--full.png`
- **Tag:** `density-issue` + `mobile-broken`
- **Severidade:** 🟡 medium

### F-20 — Quests sub-tabs mobile cortam "Falhadas/Canceladas"
- **Onde:** Player / mobile / overview (Quests accordion)
- **Evidência:** `player-mobile-00-overview.png` — só aparece "Todas / Ativas / Disponíveis / Concluídas"
- **Tag:** `truncation` + `mobile-broken`

---

## 🔵 Low (catch-all)

### F-21 — Card misterioso "Pocket DM (Beta)" no rail direito de Encounters
- **Evidência:** `dm-desktop-02-encounters.png` canto inferior direito
- **Descrição:** Aparece junto aos níveis dos jogadores. Propósito ambíguo.
- **Tag:** `discoverability`

### F-22 — Personagens na aba Encounters com HP "—"
- **Evidência:** `dm-desktop-02-encounters.png`
- **Descrição:** 4 de 5 personagens mostram HP atual como "—". Deveria ser current HP do combate anterior ou HP cheio default.
- **Tag:** `consistency`

### F-23 — Estados visuais conflitantes: Mestre sidebar "Histórico" não reflete pill ativa
- **Evidência:** `dm-desktop-01-sessions.png` — pill "Histórico" ativa (dourado) mas sidebar "Histórico" sem highlight
- **Tag:** `consistency`

### F-24 — Botões CTA "Combate/Encontro/Nota/NPC" na overview duplicam navegação
- **Evidência:** `dm-desktop-00-overview.png` — 4 botões coloridos logo abaixo dos stats cards
- **Descrição:** Todos esses CTAs já são acessíveis via sidebar OU pill bar. Triplicata.
- **Tag:** `density-issue`

---

## 📊 Resumo executivo

| Categoria | Count | Blockers | High | Medium | Low |
|---|---|---|---|---|---|
| `mobile-broken` | 4 | 1 | 0 | 3 | 0 |
| `truncation` | 5 | 0 | 0 | 5 | 0 |
| `tab-misfit` | 4 | 1 | 2 | 1 | 0 |
| `consistency` | 6 | 1 | 3 | 1 | 2 (inclui i18n + role gating) |
| `density-issue` | 4 | 0 | 2 | 1 | 1 |
| `copy` | 4 | 1 | 2 | 1 | 0 |
| `empty-state-poor` | 2 | 0 | 1 | 1 | 0 |
| `discoverability` | 3 | 1 (F-01) | 0 | 1 | 1 |

**Total:** 24 findings | 4 blockers | 7 high | 10 medium | 3 low

**Top 3 root-causes:**
1. **IA não foi desenhada por papel.** Mesma pill bar + sidebar tenta servir Mestre-compositor e Player-leitor. Precisa split.
2. **Pill bar horizontal não escala pra 13 items.** Mobile perde 10/13. Precisa padrão diferente (sidebar persistente, command palette, ou dropdown + breadcrumb).
3. **Falta hierarquia de densidade.** Overview, empty states e listas não reduzem complexidade quando há poucos dados — o produto "parece vazio e confuso" pra novo Mestre e "parece pesado" pra Mestre experiente no mobile.
