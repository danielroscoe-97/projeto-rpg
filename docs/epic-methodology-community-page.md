# Epic — Methodology Community Page & Dashboard Integration

> Documento derivado da discussao Party Mode (2026-04-04) entre Mary (Analyst), Winston (Architect), John (PM), Sally (UX Designer) e Dani_.
> Epic pai: `docs/epic-metodologia-pocket-dm.md`

## Visao

Criar uma pagina publica `/methodology` que explica a Metodologia Pocket DM para a comunidade, incentiva contribuicao via votacao de dificuldade em combates, e exibe progresso em tempo real com uma **barra de HP dourada** mostrando combates validos coletados vs meta.

Complementar com **hooks no dashboard logado** que direcionam DMs para a pagina e incentivam votacao continua.

## Por que importa

- **Moat competitivo**: nenhum concorrente coleta ratings reais de dificuldade. Mostrar isso publicamente reforeca o diferencial.
- **Growth**: a pagina funciona como landing page de conversao (visitante → cadastro → contribuidor).
- **Retencao**: DMs logados voltam pra ver o progresso da barra e seu impacto pessoal.
- **Engajamento**: gamificacao da coleta aumenta taxa de votacao pos-combate (meta: 60%+ de combates com DM rating).

## Posicionamento

**Headline**: "O DMG chuta. A gente mede."

**Proposta**: O Pocket DM esta construindo o calculo de dificuldade mais preciso de D&D, baseado em dados reais de milhares de combates — nao tabelas estaticas.

---

## Componentes

### 1. Pagina Publica `/methodology`

#### Hierarquia de Informacao (5 secoes)

| # | Secao | Descricao | Funcao |
|---|-------|-----------|--------|
| 1 | **Barra Dourada** | Numero grande + progress bar dourada pixel-art com milestones | Hook visual — prende atencao |
| 2 | **Headline** | "Estamos construindo o calculo de dificuldade mais preciso de D&D" | Contexto rapido |
| 3 | **Como Funciona** | 3 passos pixel-art: Rode combate → Vote → Modelo aprende | Educacao |
| 4 | **Por que o DMG Erra** | Comparacao visual "DMG diz Easy, sua party quase morreu" | Identificacao emocional |
| 5 | **CTA** | "Crie sua conta gratuita e comece a contribuir" (logado: "Rode seu proximo combate") | Conversao |

#### Barra Dourada — Especificacao

```
Design:
- Barra de HP estilo boss raid, textura pixel-art 16-bit
- Cor: gold (#D4A853) com gradiente pro gold-light (#E8C87A)
- Numero grande centralizado: "1,247 / 5,000 combates analisados"
- Particulas douradas sutis (reutilizar ember-float animation)
- Milestones marcados NA barra como divisorias:
  - 500: "Fase 1 — Exploratoria" (icone lupa)
  - 2,000: "Fase 2 — Modelo v1" (icone engrenagem)
  - 5,000: "Fase 3 — Modelo Contextual" (icone cerebro)
- Responsivo: em mobile a barra e full-width, milestones viram tooltips

Dados:
- Endpoint: GET /api/methodology/stats (cached 5min, ISR)
- Response: { valid_combats: number, combats_with_dm_rating: number, unique_dms: number, current_phase: string }
- Filtra: exclui contas admin, QA, test (mesma regra do epic pai)
```

#### Metricas Secundarias (abaixo da barra)

- **DMs contribuindo**: numero de DMs unicos com >= 1 combate votado
- **Taxa de votacao**: % de combates com DM rating
- **Fase atual**: badge com nome da fase ativa

#### Secao "Como Funciona"

3 cards horizontais (coluna em mobile):

| Passo | Icone | Titulo | Descricao |
|-------|-------|--------|-----------|
| 1 | pixel-art espada | "Rode um combate" | "Use o combat tracker normalmente com sua party" |
| 2 | pixel-art estrela | "Vote na dificuldade" | "Apos o combate, voce e seus jogadores votam de 1 a 5" |
| 3 | pixel-art pocao | "O modelo aprende" | "Cada voto calibra o calculo para todos os DMs" |

#### Secao "Por que o DMG Erra"

Comparacao visual lado a lado:

```
┌──────────────────┐    ┌──────────────────┐
│   DMG 2014       │    │   Pocket DM      │
│   "Easy"         │    │   "Dificil (3.8)" │
│   XP: 350        │    │   47 combates    │
│   Estatico       │    │   similares      │
│   Party generica │    │   Sua composicao │
└──────────────────┘    └──────────────────┘
```

#### Teaser Spell Tiers (V2 — nao implementar agora)

Um banner sutil no final: "Em breve: Tier de Magias — vote se Fireball e realmente nivel 3."

Cria hype sem comprometer escopo da V1.

#### SEO & i18n

- Metadata bilingual (pt-BR + en)
- JSON-LD tipo ResearchProject
- `<link rel="alternate">` pra ambas linguas
- Canonical: `/methodology`

---

### 2. Dashboard Hooks (Area Logada)

#### 2a. Pocket DM Lab Badge

```
Localizacao: Dashboard header, ao lado do StreakBadge
Design: 
- Icone beaker/pocao pixel-art (16x16)
- Pulsa suavemente a cada ~4s (reutilizar rune-pulse animation)
- Tooltip on hover: "Ajude a ciencia do RPG — Metodologia Pocket DM"
- Click → navega pra /methodology
Visibilidade: sempre visivel pra DMs
```

#### 2b. Post-Combat Nudge

```
Localizacao: Apos encerrar combate com DM rating, na tela de recap
Design:
- Card sutil abaixo do recap: 
  "Seu combate alimentou a Metodologia Pocket DM. Veja o progresso →"
- Link pra /methodology
- Dismissable (localStorage flag pra nao mostrar por 7 dias)
Trigger: so aparece se DM deu rating E encontro foi salvo com snapshot valido
```

#### 2c. Milestone Toast

```
Trigger: quando barra cruza milestone (500, 1000, 2000, 3000, 5000)
Design:
- Toast dourado no topo: "A comunidade atingiu 1,000 combates analisados! Veja →"
- Auto-dismiss em 8s
- Link pra /methodology
Implementacao: 
- Flag em localStorage com ultimo milestone visto
- Checa no mount do dashboard se current > last_seen_milestone
```

#### 2d. Contribuicao Pessoal (Easter Egg)

```
Localizacao: card de stats no dashboard
Trigger: DM tem >= 10 combates com rating
Design:
- Um dos cards de stats muda borda pra dourada
- Ao clicar, revela:
  "Voce e um Pesquisador Pocket DM. 
   Seus 23 combates estao moldando o futuro do calculo de dificuldade."
- Badge: "Pesquisador Pocket DM" (desbloqueavel)
Dados: count de encounters do user com dm_difficulty_rating IS NOT NULL
```

---

## Dependencias Tecnicas

### Ja Existe (pronto pra uso)
- [x] `encounter_snapshots` com party + creatures + ratings
- [x] `encounter_votes` + `dm_difficulty_rating` + `dm_notes`
- [x] `DifficultyPoll` e `DmPostCombatFeedback` components
- [x] `combat_reports` com stats completos
- [x] Paleta dourada, animacoes (ember-float, rune-pulse, torch-flicker)
- [x] Pixel art assets em `/public/art/icons/`
- [x] Exclusao de contas admin/QA definida no epic pai

### Precisa Criar
- [ ] Pagina `/methodology` (app/methodology/page.tsx)
- [ ] API `/api/methodology/stats` (contagem de combates validos)
- [ ] Componente `MethodologyProgressBar` (barra dourada)
- [ ] Componente `PocketDmLabBadge` (dashboard hook)
- [ ] Componente `PostCombatMethodologyNudge` (recap hook)
- [ ] Componente `MethodologyMilestoneToast` (dashboard toast)
- [ ] Componente `ResearcherBadge` (easter egg no dashboard)
- [ ] RPC ou query pra contar combates validos (excluindo admin/QA/test)
- [ ] Traducoes pt-BR + en pra toda a pagina e hooks

### Precisa na DB (migrations)
- [ ] View materializada `methodology_stats` (combates validos, DMs unicos, taxa de votacao)
- [ ] OU RPC `get_methodology_stats()` com cache
- [ ] Tabela `excluded_accounts` (ref: epic pai) — se ainda nao existir

---

## Fases de Entrega

### Fase 0: Foundation (Sprint atual — agora)

**Objetivo**: documentar, alinhar, e preparar infra basica.

| Item | Status | Notas |
|------|--------|-------|
| Documentar epic completo (este doc) | Em andamento | |
| Criar `excluded_accounts` table ou RPC | Pendente | Dependencia do epic pai |
| Criar RPC `get_methodology_stats()` | Pendente | Count basico de encounters validos |

### Fase 1: Pagina Publica MVP (1 sprint)

**Objetivo**: pagina `/methodology` funcional com barra dourada real.

| # | Task | Estimativa | Prioridade |
|---|------|------------|------------|
| 1.1 | API `/api/methodology/stats` | P | P0 |
| 1.2 | Componente `MethodologyProgressBar` | M | P0 |
| 1.3 | Pagina `/methodology` com 5 secoes | G | P0 |
| 1.4 | SEO metadata + JSON-LD | P | P0 |
| 1.5 | i18n pt-BR + en | M | P0 |
| 1.6 | Link no footer/navbar pra `/methodology` | P | P1 |

**Entregavel**: pagina publica acessivel mostrando progresso real.

### Fase 2: Dashboard Hooks (1 sprint)

**Objetivo**: integrar hooks no dashboard e recap pra incentivar contribuicao.

| # | Task | Estimativa | Prioridade |
|---|------|------------|------------|
| 2.1 | `PocketDmLabBadge` no dashboard header | P | P0 |
| 2.2 | `PostCombatMethodologyNudge` no recap | M | P1 |
| 2.3 | `MethodologyMilestoneToast` no dashboard | M | P1 |
| 2.4 | Traducoes dos hooks pt-BR + en | P | P0 |

**Entregavel**: DMs logados sao direcionados pra /methodology organicamente.

### Fase 3: Easter Egg & Gamificacao (1 sprint)

**Objetivo**: recompensar contribuidores e criar senso de ownership.

| # | Task | Estimativa | Prioridade |
|---|------|------------|------------|
| 3.1 | `ResearcherBadge` no dashboard | M | P1 |
| 3.2 | Contador pessoal de contribuicao | M | P1 |
| 3.3 | Post-combat "voce contribuiu X combates" | P | P2 |
| 3.4 | Teaser de Spell Tiers na pagina | P | P2 |

**Entregavel**: DMs com 10+ combates desbloqueiam badge e veem impacto pessoal.

### Fase 4: Evolucao (alinhada com Fase 2+ do epic pai)

**Objetivo**: atualizar pagina conforme modelo evolui.

| # | Task | Prioridade |
|---|------|------------|
| 4.1 | Mostrar "precisao atual do modelo" quando existir | P2 |
| 4.2 | Top 3 hipoteses sendo testadas (transparencia) | P2 |
| 4.3 | Comparativo descritivo: "47 combates similares votaram 3.4/5" | P2 |
| 4.4 | Spell tier voting system | P2 |
| 4.5 | Leaderboard "Avaliador Confiavel" | P3 |

---

## Metricas de Sucesso

| Metrica | Target Fase 1 | Target Fase 2 | Target Fase 3 |
|---------|--------------|--------------|--------------|
| Visitas unicas /methodology | 100/mes | 300/mes | 500/mes |
| CTR pagina → cadastro | 5% | 8% | 10% |
| DMs que votam pos-combate | 30% (baseline) | 50% | 60%+ |
| DMs com badge "Pesquisador" | - | - | 20% dos DMs ativos |
| Bounce rate /methodology | < 60% | < 50% | < 40% |

---

## Decisoes de Design (Party Mode Consensus)

1. **Barra primeiro, headline depois**: o numero grande e dourado e o hook visual. Headline explica o contexto. (Sally)
2. **V1 so combates, spell tiers teased**: foco total em uma metrica. Spell voting e Fase 4. (John)
3. **3 opcoes > 5 opcoes pra DM rating**: considerar simplificar pra "mais facil / esperado / mais dificil" pra aumentar adocao. Converter internamente pra escala 1-5. (John — backlog de UX pra avaliar)
4. **Preview descritivo antes do modelo**: com ~300 dados Gold, mostrar lookup descritivo ("47 combates similares foram votados 3.4/5") em vez de esperar o modelo preditivo. (Mary)
5. **Quality tiers (Gold/Silver/Bronze)**: classificar dados por qualidade pra analise limpa. Gold = 3+ votos + snapshot completo. (Mary)
6. **Trigger > batch pra materializacao**: features computadas no insert do snapshot, nao em cron. (Winston)
7. **Easter egg por discovery, nao push**: card dourado que revela ao clicar, nao notificacao. (Sally)

---

## Relacao com Epic Pai

Este epic e uma **extensao de comunidade e growth** do epic `epic-metodologia-pocket-dm.md`.

| Epic Pai (Fases) | Este Epic (Fases) | Relacao |
|---|---|---|
| Fase 0: Coleta | Fase 0: Foundation | Prepara infra de exclusao + stats |
| Fase 1: Analise (~500) | Fase 1: Pagina MVP | Mostra progresso real da coleta |
| Fase 2: Modelo v1 (~2000) | Fase 2-3: Hooks + Easter egg | Incentiva mais dados via gamificacao |
| Fase 3: Modelo v2 (~5000) | Fase 4: Evolucao | Atualiza pagina com resultados do modelo |

---

## Notas Finais

- A pagina `/methodology` e **publica** — todo conteudo deve ser SRD-safe (nao expoe dados de combate individuais, so agregados)
- Dados sao **anonimizados** — nunca mostrar dados por usuario/campanha individual
- O endpoint de stats deve ser **lightweight e cached** — ISR 5min ou Supabase RPC com cache
- A barra dourada precisa funcionar com dados reais desde o dia 1 — se tiver 12 combates, mostra 12/5000
- Pixel art de icones novos (beaker, lupa, engrenagem, cerebro) pode ser gerado no estilo existente
