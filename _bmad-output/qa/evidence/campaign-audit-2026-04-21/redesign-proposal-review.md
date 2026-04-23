# Campaign HQ Redesign Proposal v0.1 — Review Adversarial

**Data:** 2026-04-21
**Reviewers:** Blind Hunter (Mestre iniciante) + Edge Case Hunter + Acceptance Auditor + Design Critic (Sally auto-review + Mary competitive deep-dive)
**Alvo:** [redesign-proposal.md](redesign-proposal.md)
**Regra do projeto:** 3-reviewer adversarial + visual é default (CLAUDE.md `feedback_adversarial_review_default.md`)

---

## 🎯 TL;DR — o que mudou depois do review

A proposta v0.1 **acertou o diagnóstico e o rumo** (modes + shell unificado), mas tem **buracos sérios de execução** que, se forem ignorados, vão fazer o release quebrar regras imutáveis (Combat Parity + Resilient Reconnection) e ou devolver o problema da pill bar em forma nova.

**Veredito agregado:**
- ✅ **Rumo:** mantém (modes + command palette + sidebar contextual)
- 🔴 **Bloqueios antes de Figma:** 5 decisões que tocam regras imutáveis ou invalidam wireframes
- 🟠 **Gaps de execução:** 11 requisitos NOVOS sem critério de aceite + 5 findings parciais + 6 ignorados
- 🟡 **Risco estratégico:** proposta usa Notion/Obsidian/Roll20/Foundry como inspiração vaga, não como padrão executável

**Recomendação:** antes de subir no Figma, **v0.2 do documento** resolvendo os 5 blockers do Edge Case Hunter + W0 (empty state dia-1) + microcopy rewrite do Blind Hunter.

---

## 1. Sumário das 4 lentes

| Lente | Foco | Severidade top | Output |
|---|---|---|---|
| **Blind Hunter** (Mestre iniciante) | "Abro a app e saberia o que fazer?" | 🔴 falta W0 + vocabulário "retro/surface/mode switcher" aliena | 4 eixos de crítica |
| **Edge Case Hunter** | "Que cenários quebram a modelagem de modes?" | 🔴 3 blockers (Run state, Combat Parity, Reconnection) | 10 cenários mapeados |
| **Acceptance Auditor** | "A proposta fecha os 24 findings?" | 🟠 11 requisitos NOVOS sem AC + 6 findings ignorados | Tabela F-01 a F-24 + top 3 |
| **Design Critic** (abaixo) | "A inspiração se materializa em decisão executável?" | 🟠 "Notion/Foundry" é promessa abstrata | Análise competitiva + self-critique |

---

## 2. 🔴 Decisões bloqueantes antes da v0.2

Consolidando Edge Case Hunter + Acceptance Auditor:

### BL-1 — Run Mode é state exclusivo ou sidebar read-only?
**De onde veio:** Edge Case Hunter §1
**Problema:** Proposta não define o que acontece quando Mestre clica Prep com combate ativo.
**Por que é blocker:** Broadcast realtime; editar NPC em Prep durante Run vaza HP/AC pro player no meio do turno.
**Decisão necessária:** (a) Run é modal state (trocar mata ou força volta), (b) Prep/Retro ficam **read-only** durante Run, (c) sidebar desabilita mode switcher com lock visual.
**Recomendação do time:** (b) — read-only lock + badge "Combate ativo — modo edição pausado".

### BL-2 — Matriz Surface × Modo de Acesso (Guest / Anônimo / Auth)
**De onde veio:** Edge Case Hunter §5 (conflita com Combat Parity Rule do CLAUDE.md)
**Problema:** W2 (Run) tem painel Chat/Roll, W4 (Player MyStory) tem banner combate ativo — mas **Guest não tem realtime** (CLAUDE.md explícito). Proposta não distingue os 3 modos de acesso.
**Por que é blocker:** Viola regra imutável. Toda feature de combate tem que ter parity-check nos 3 modos.
**Decisão necessária:** tabela explícita "surface × auth state" — quais paineis existem em cada.
**Recomendação:** **Guest e Anônimo só têm Watch mode simplificado** (iniciativa + HP + turno atual); Chat/Roll é auth-only.

### BL-3 — Mode é stateless derivado do server, não persistido em localStorage
**De onde veio:** Edge Case Hunter §6 (conflita com Resilient Reconnection Rule)
**Problema:** Player volta em 1h; se mode foi persistido em localStorage, cai em MyStory quando Mestre já está em Run há 40min.
**Por que é blocker:** Quebra "reconexão invisível" — player perde cenário.
**Decisão necessária:** mode é **derivado do server state**: combate ativo → Watch forçado; sem combate → MyStory. Idem Mestre: combate ativo → Run oferecido (banner "continuar em Run").
**Recomendação:** mode nunca é fonte de verdade. Server state decide.

### BL-4 — W0 (empty state dia-1) precisa existir no documento
**De onde veio:** Blind Hunter "onde você me perdeu #1"
**Problema:** Todos os wireframes W1-W5 pressupõem campanha populada (Krynn, Sess 12, Grolda). Não existe "acabei de criar conta, 0 campanhas".
**Por que é blocker:** Mestre novo recebe link, cadastra, abre — se a tela mostra "Próxima Sessão #12" genérico ou erro, abandona.
**Decisão necessária:** wireframes W0a (dashboard vazio — 0 campanhas) + W0b (Campaign HQ vazia — 0 sessões / 0 NPCs / 0 quests em Prep mode).
**Recomendação:** fazer antes do Figma, não depois.

### BL-5 — Vocabulário: Retro / Mode switcher / Surface / Command palette
**De onde veio:** Blind Hunter "vocabulário que não sobrevive ao Dia 1"
**Problema:** "Retro" soa corporativo (retrospectiva de sprint), "surface" e "mode switcher" são jargão de designer, "command palette" é power-user (VS Code / Linear / Notion).
**Por que é blocker:** afasta Mestre novato de cara — aumenta curva de aprendizado em vez de reduzir.
**Decisão necessária:** rename agora, antes de marcar isso em i18n e virar dívida.
**Recomendação (palpite inicial):**
  - Retro → **"Recap"** ou **"Depois da Sessão"**
  - Mode switcher → apenas visual (ícones grandes com labels), sem termo técnico
  - Surface → apenas "seção" ou "área" (terminologia interna de design, não user-facing)
  - Command palette → **"Busca rápida"** (placeholder no input) + atalho `Ctrl+K` (não ⌘K exclusivo — Dani é Windows)

---

## 3. 🟠 Gaps de execução (v0.2 precisa cobrir)

### 3.1 Requisitos NOVOS sem critério de aceite
Auditor identificou **11 requisitos novos** que a proposta introduz sem dizer como testar. Transcritos em ordem de prioridade:

1. **Mode switcher** — teste: Mestre em Prep vê APENAS surfaces Prep; clicar Run troca sem recarregar; estado sincroniza com URL
2. **Command palette ⌘K** (renomear pra "Busca rápida") — busca cross-domain; escopo por campanha atual; mobile como aciona?
3. **Rotas segmentadas `/prep`, `/run`, `/retro`** — link compartilhado abre no modo certo; redirect de `?section=X` antigo por 90 dias
4. **Sidebar contextual persistente vs bottom-sheet mobile** — como decide breakpoint; não cobre CTA combate ativo
5. **Quick add card** — cada CTA cria item e volta sem perder contexto
6. **"Cena" panel em Run** — requisito de dados não validado: "humor do NPC" existe no DB? "pode fugir em R5" é heurística?
7. **Watch mode do player** — auto-switch quando combate inicia, ou opt-in?
8. **Surface "Notas do Mestre" em Retro** — private dmOnly? Relação com player-notes atual?
9. **Surface "Timeline" em Retro** — escopo não definido: turnos de combate? eventos narrativos? auto ou manual?
10. **Feature flag `CAMPAIGN_HQ_V2`** — flag off volta ao estado atual; métricas do A/B com 5 Mestres
11. **Atalhos de mode (`g p / g r / g e`)** — não mencionados; afetam a11y

### 3.2 Findings parcialmente endereçados (5)
Do audit:
- **F-06** (role-gating da sidebar) — Fase A.2 patches sintoma mas não unifica source-of-truth
- **F-10** (stats vazios de 1 combate) — W1 substitui overview mas não diz "ocultar até ≥3 combates"
- **F-11** (sub-tabs inconsistentes Builder/Histórico/etc) — modes cobrem nav top, interno fica desalinhado
- **F-12** (mindmap ilegível) — W3 menciona mas não detalha auto-fit inicial
- **F-19** (grid 2×2 stats caixa alta mobile) — implicitamente removido, não explicitado

### 3.3 Findings ignorados (6)
- **F-09** (sessões sem identidade — "Quick Encounter" × 5) — W1 mostra nome bonito mas proposta nunca define default + editabilidade
- **F-14** (Players sem raça/classe/nível) — wireframes assumem dados completos
- **F-15** ("Companheiros (1)" mostra o próprio player) — accordion continua na proposta
- **F-16** ("Por facção" cortado mobile) — proposta não toca dropdowns/filtros internos
- **F-21** (card "Pocket DM Beta" misterioso) — não mencionado
- **F-22** (HP "—" em personagens) — não mencionado

---

## 4. Design Critic — análise competitiva e self-critique

### 4.1 Quão fundo vai a inspiração Notion / Obsidian / Roll20 / Foundry?

A proposta v0.1 cita os 4 refs como inspiração, mas **usa só as camadas mais superficiais**. Olha de perto:

| Ref | O que a proposta pegou | O que a proposta IGNOROU (e deveria pegar) |
|---|---|---|
| **Notion** | "Compositor linkável" (mencionado §2), Quick add (W1), Home com "hoje" (Linear-like) | **Backlinks** (se NPC "Grolda" aparece em 3 sessões, Grolda deveria listar essas 3 sessões automaticamente — é a killer-feature do Notion/Obsidian). **Database views** (mesmo dado, múltiplas views: board/list/timeline). **Templates** (criar sessão parte de template, não do zero) |
| **Obsidian** | Graph view no Mindmap | **Bi-directional linking automático** via `[[Grolda]]` em notas. **Local-first / offline** (não abordado). **Tags** — proposta não menciona tag system |
| **Roll20** | Referência genérica "cockpit de mesa" (W2) | **Dynamic lighting** / visibilidade de área. **Handouts** (passar mapa/imagem pros players mid-combat). **Macros** de ataque salvos por jogador |
| **Foundry** | Citado como inspiração de W2 | **Modularidade** (modules/packs). **Sistema de permissões granular** (player pode editar ficha própria mas não dos outros). **Compendium integration** (monstros/spells puxados em contexto) |

**Crítica da Mary:** proposta vende "Notion pra prep + Foundry pra run" mas entrega **dashboards bonitos sem a magia relacional** que é a razão das pessoas escolherem Notion/Obsidian. Sem backlinks e tags, Pocket DM vira mais uma "ferramenta de fichinha bonita" — não um second brain de campanha.

**Recomendação:** v0.2 precisa escolher **1 killer-feature por ref** e prometer pelo menos 1 no MVP:
- Notion → **backlinks automáticos** (NPC mencionado em nota → aparece na ficha do NPC)
- Obsidian → **tags com autocomplete** (`#dragao #masmorra`)
- Foundry → **permissões granulares** (player edita ficha própria apenas)
- Roll20 → **handout drop** (Mestre arrasta imagem → aparece pro player em Watch)

### 4.2 Sally auto-review: 5 pontos onde a proposta v0.1 foi preguiçosa

Lendo meu próprio draft com 24h de distância:

**1. §3 "Modes" é prescritivo, não descritivo.**
Eu saltei pra solução (3 modos) sem mostrar o **user journey** que justifica. Deveria ter:
- "Às 18h de sexta (2h antes da sessão), Mestre faz X, Y, Z → isso é Prep"
- "Às 20h05, combate inicia → X, Y muda"
- "Domingo à tarde, Mestre escreve recap → Z"

Sem essa narrativa, modes parece arbitrário. O Blind Hunter tem razão: caiu no meu próprio modelo mental de designer.

**2. Wireframes são aspiracionais, não realistas.**
W1 mostra "Próxima Sessão #12 | Masmorra do Dragão | 🎯 Gancho: grupo persegue o dragão". **Em que campo no DB mora esse "gancho"?** Hoje o schema de sessão tem `name` + `scheduled_at` + talvez `description`. "Gancho", "PREPARADO (3) / PENDENTE (3)" — **inventei dados que não existem**. O Auditor flagou isso como risco (req #6 Cena panel).

**3. Não tratei conflito entre modes e o realtime existente.**
Edge Case Hunter pegou isso direto: Mestre muda de Run pra Prep com broadcast ativo. Eu literalmente não pensei nesse cenário ao escrever §3. Violei uma das nossas próprias `REGRA IMUTÁVEL` do CLAUDE.md.

**4. Proposta mistura 3 níveis de detalhe sem separar.**
Tem diagnóstico (§1), framework (§2), IA nova (§3-4), wireframes (§5), plano de execução (§8), riscos (§9), decisões abertas (§7). Isso é **4 documentos em 1**. Dani disse "doc de teste + wireframes", eu empurrei roadmap+riscos pra dentro. Deveria ter separado:
- `vision.md` (§1-4)
- `wireframes.md` (§5)
- `execution-plan.md` (§7-9)

**5. Mobile foi "adaptação", não co-design.**
W5 é o único mobile wireframe. W1-W4 são desktop-first e W5 tem "inspiração: Linear mobile" — mas Linear é **primariamente desktop**. O usuário-alvo do Pocket DM é híbrido (desktop pra prep em casa, mobile pra run na mesa). Mobile precisa ser wireframe par a par, não coadjuvante.

### 4.3 Densidade visual e tipografia — não coberto pelas outras lentes

Olhando os wireframes ASCII com olho de designer:

- **W1 (Prep)** tem 4 zonas densas: Card "Próxima Sessão" (3 linhas de meta) + 2 colunas "Preparado/Pendente" (6 items) + linha de Quick add (4 CTAs) = **14 elementos clicáveis na dobra desktop**. Notion Home tem ~5. Linear Home ~8. **Está 2x acima do target.**
- **W2 (Run)** tem 7 zonas em 1 viewport: Iniciativa (6 linhas) + Cena (NPCs + humor) + Ações (6 botões) + Chat + Nota + mode switcher + header = **30+ elementos**. Foundry divide isso em painéis colapsáveis; W2 coloca tudo aberto.
- **W3 (Mindmap)** — comentei bem F-13, mas não resolvi: se campanha tem 200 nodes, auto-fit inicial = pixels de 3×3. **Precisa zoom-level inicial baseado em cluster density**, não em viewport.
- **Tipografia** — proposta não fala de hierarquia de fontes. Hoje o app mistura serif (títulos tipo "KRYNN") e sans. No wireframe W1 `PRÓXIMA SESSÃO — #12` é caixa alta grande — visualmente pesado. **Decisão pendente:** serif só em nomes próprios (campanhas, NPCs) e sans pra TUDO o resto?

### 4.4 O elefante na sala: **trilha sonora / soundboard**

CLAUDE.md menciona Soundboard como surface top-level no sidebar global atual. Proposta v0.1 **não menciona nenhuma vez**. Isso é surface órfã. Mestre iniciante deveria saber "cadê o botão de música da taverna?" → hoje está no sidebar global, no redesign está… onde?

**Decisão pendente:** Soundboard é surface de Run mode? Ou fica no sidebar global (fora da campanha)?

---

## 5. Matriz consolidada: decisões pendentes por dono

| ID | Decisão | Dono proposto | Bloqueia |
|---|---|---|---|
| **BL-1** | Run mode = exclusive state ou read-only lock? | Sally + Winston | Wireframes W1 vs W2 transition |
| **BL-2** | Matriz surface × auth (Guest/Anon/Auth) | Winston + Sally | W2 Chat/Roll visibility |
| **BL-3** | Mode = stateless derivado do server | Winston | Resilient Reconnection parity |
| **BL-4** | W0 (empty state dia-1 + 0 campanhas) | Sally | Figma hi-fi |
| **BL-5** | Vocabulário (Retro → Recap etc.) | Sally + Mary | i18n + Figma |
| **D-1** | Backlinks automáticos (Notion killer-feat) | Mary + Winston | v0.2 escopo |
| **D-2** | Sistema de tags (Obsidian-like) | Mary | v0.2 escopo |
| **D-3** | Permissões granulares (Foundry-like) | John + Winston | Roadmap fase C+ |
| **D-4** | Soundboard: surface de Run ou sidebar global? | Sally + John | W2 completeness |
| **D-5** | Mobile wireframes par a par (W2m, W3m, W4m) | Sally | Figma mobile |
| **D-6** | Tipografia serif vs sans | Sally | Figma |
| **D-7** | Density budget (W1 14 elementos → target 8) | Sally | Figma |
| **D-8** | Rotas `/prep /run /retro` vs `?mode=X&surface=Y` | Winston | URL migration |
| **D-9** | Atalhos de mode (`g p/r/e`) + a11y ARIA | Sally + a11y | Figma interaction |
| **D-10** | Requisito de dados p/ "Cena" panel Run (humor, "pode fugir") | Winston | W2 realismo |

---

## 6. Plano de ataque revisado (v0.2 → Figma)

**Antes da v0.2:** resolver BL-1 a BL-5 (5 decisões bloqueantes acima). Isso é ~1 dia de design work.

**v0.2 do documento** deve incluir:
- §0 novo: user journeys (18h sexta, 20h05, domingo retro) — resolve crítica 4.2.1
- §3 revisado: modes com estado transição definido (resolve BL-1)
- §3.5 novo: matriz surface × auth state (resolve BL-2)
- §4 revisado: mode é derivado do server (resolve BL-3)
- §5 revisado: W0a + W0b + W2m + W3m + W4m (resolve BL-4 + D-5)
- §5 revisado: vocabulário renomeado (resolve BL-5)
- §6 novo: 1 killer-feature por ref (resolve D-1, D-2, D-3)
- §7 revisado: density budget + tipografia (resolve D-6, D-7)
- Acceptance criteria pros 11 requisitos novos (tabela)

**Depois da v0.2:**
1. Review rápido de 1 hora Dani + Sally
2. Se aprovado, **entra no Figma** (via MCP) — priorizar W1 (Prep) + W2 (Run) + W4 (Player) em desktop + W2m + W4m em mobile
3. Hi-fi cobre: cores finais, spacing escala 4/8, estados (hover/active/disabled/empty), tipografia definida
4. Segunda rodada adversarial (visual agora: Playwright visual regression vs referência Figma)

---

## 7. Reviewers' raw outputs (append-only)

### 7.1 Blind Hunter (Mestre iniciante)

> "A proposta me ajuda a imaginar um produto final bonito, mas me perde completamente em como eu, Mestre novato, chego lá sexta-feira às 20h sem travar. O doc tá falando com designer/dev, não com o usuário-alvo. Antes de hi-fi no Figma, escreve um W0 (empty state do primeiro login) e um roteiro de 3min do dia 1 do Mestre novo. Se esses dois não couberem na proposta, qualquer mode switcher do mundo vai me assustar."

Pontos-chave:
- 🟥 Falta W0 (dia-1)
- 🟥 W2 (Run) é bomba de informação sem path de aprendizado
- 🟥 §7 (decisões abertas) mistura concerns de arquiteto e Mestre
- 🟧 Vocabulário: Retro / surface / mode switcher / command palette / chrome global / shell unificado / JTBD / ⌘K-centric (Dani é Windows)
- 🟨 Proposta assume campanha existente + separação Prep/Run/Retro intuitiva
- 🟨 Nenhum plano de tutorial/tour/tooltip/primeiro-uso
- 🟨 Mobile é só W5 (adaptação), não co-design
- 🟨 Zero affordance de UNDO / reversibilidade
- 🟩 W4 (Player MyStory) é digerível de primeira
- 🟩 Fase A honesta (mata 6 blockers em 2d)

### 7.2 Edge Case Hunter

10 cenários mapeados:
1. **Transição mode durante ação** 🔴 — Run switching undefined
2. **Multi-device** 🟠 — mode per-session ou broadcast?
3. **Papel duplo** 🟠 — navegação entre campanhas não endereçada
4. **Estados vazios por mode** 🟠 — Run/Retro vazios sem wireframe
5. **Combat Parity conflict** 🔴 — W2 Chat/Roll ignora Guest
6. **Reconnection Rule conflict** 🔴 — mode persist quebra zero-drop
7. **Mobile rotation** 🟠 — Run/Retro/Player mobile sem wireframe
8. **A11y + atalhos** 🟡 — ARIA/Tab order/atalhos de mode missing
9. **Backwards compat** 🟠 — redirect section→mode sem regra clara
10. **Dados extremos** 🟠 — W2 assume ≤6 entities; virtualização missing

Recomendação: **não aprovar Fase B (spike) sem resolver blockers 1, 5, 6**.

### 7.3 Acceptance Auditor

Tracking completo F-01 a F-24:
- ✅ **13 resolvidos** (3 blockers, 4 highs, 4 mediums, 2 lows)
- 🟡 **5 parciais** (F-06, F-10, F-11, F-12, F-19)
- ❌ **6 ignorados** (F-09, F-14, F-15, F-16, F-21, F-22)
- ⚠️ **0 piorados**

**Top 3 riscos de aceite:**
1. F-09 (sessões sem identidade) — wireframe promete nome bonito, proposta nunca define regra
2. F-11 (sub-tabs internas inconsistentes) — modes cobrem top, interno sobrevive
3. F-06 (role-gating sidebar) — patch de sintoma, não source-of-truth unificada

**11 requisitos NOVOS sem AC** (enumerados na §3.1 deste review).

### 7.4 Design Critic (self + competitive)

- Proposta usa Notion/Obsidian/Roll20/Foundry como inspiração superficial — ignora killer-features (backlinks, tags, permissões, handouts)
- 5 auto-críticas da Sally: prescritivo demais, dados inventados, não tratei conflito com realtime, mistura níveis, mobile foi adaptação
- Densidade: W1 tem 14 elementos (target 8), W2 tem 30+ (Foundry usa painéis colapsáveis)
- Tipografia: decisão pendente serif vs sans
- Elefante na sala: Soundboard nunca mencionado
