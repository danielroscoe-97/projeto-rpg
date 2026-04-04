# QA Prompt — Crítica Estratégica do SEO Supremo

## Missão

Você é um auditor crítico do Pocket DM. Sua missão é **visitar cada página pública do compêndio SEO** e avaliar se ela está alinhada com a identidade, moats, PRD, e visão do produto. Você deve ser implacável — não estamos buscando "tá bom", estamos buscando "isso é excelente e coerente com quem somos".

## Contexto do Produto

### Quem somos
- **Pocket DM** — Combat tracker para D&D 5e otimizado para jogo presencial
- **Tagline**: "Master your table."
- **Posicionamento**: Quadrante único "Simples + Presencial" — nenhum concorrente direto
- **Público**: DMs que jogam presencialmente (Rafael, 28 anos, 3-4 sessions/mês) e Players (Camila, 24 anos, quer participar mais sem ser DM)

### 5 Moats Defensivos (docs/competitive-moats-strategy.md)
1. **Real-Time Combat Broadcast** — nenhum outro combat tracker tem isso
2. **Zero-Friction Player Access** — sem login, QR code, pronto
3. **Dual SRD Versioning** — 2014 + 2024 coexistem
4. **In-Person First Design** — não é VTT adaptado
5. **Radical Simplicity** — uma ferramenta, feita bem

### Anti-Proposições (docs/value-proposition-canvas.md)
- NÃO somos VTT (sem mapas, tokens de grid, fog of war)
- NÃO somos character builder (sem criação de ficha)
- NÃO somos plataforma online-first (somos presencial-first)
- NÃO somos repositório de conteúdo (somos ferramenta de combate)

### Brand Guide (docs/brand-guide.md)
- **Paleta**: Gold #D4A853, Dark backgrounds (#0F0F0F, #1A1A2E), functional colors
- **Tipografia**: Cinzel (headers), Plus Jakarta Sans (body), JetBrains Mono (stats/dados)
- **Tom**: Premium, dark fantasy, sem ser infantil. Inspiração: Liberty Ragnarok Online, 5e.tools
- **Icons**: SVG stroke-based, currentColor. NUNCA emojis.
- **Logo**: Crown d20 — coroa sobre icosaedro

### Monetização (docs/monetization-strategy.md)
- **Free**: Combat tracker efêmero, player view, SRD, guest mode
- **Pro** (R$14,90/mês): Campanhas persistentes, encounter builder avançado, export, homebrew, analytics
- **Funil**: /try → Free → Pro. Cada página pública é um topo de funil.

### Gaps Críticos (docs/gap-analysis-competitors-2026-03-30.md)
- G-01: Turn notifications (CRITICAL — prometido, não entregue)
- G-02: PWA/offline (HIGH)
- G-03: D&D Beyond character import (HIGH)
- G-04: Shared notes (HIGH)

## Páginas para Auditar

Visite CADA uma dessas URLs e avalie contra os critérios abaixo:

### Referências e Compêndio
| # | URL | O que é |
|---|-----|---------|
| 1 | https://www.pocketdm.com.br/conditions | Conditions EN |
| 2 | https://www.pocketdm.com.br/condicoes | Conditions PT |
| 3 | https://www.pocketdm.com.br/diseases | Diseases EN |
| 4 | https://www.pocketdm.com.br/doencas | Diseases PT |
| 5 | https://www.pocketdm.com.br/damage-types | Damage Types EN |
| 6 | https://www.pocketdm.com.br/tipos-de-dano | Damage Types PT |
| 7 | https://www.pocketdm.com.br/ability-scores | Ability Scores EN |
| 8 | https://www.pocketdm.com.br/atributos | Ability Scores PT |
| 9 | https://www.pocketdm.com.br/actions | Actions in Combat EN |
| 10 | https://www.pocketdm.com.br/acoes-em-combate | Actions PT |
| 11 | https://www.pocketdm.com.br/classes | Classes EN |
| 12 | https://www.pocketdm.com.br/classes/barbarian | Class Detail |
| 13 | https://www.pocketdm.com.br/races | Races EN |
| 14 | https://www.pocketdm.com.br/racas | Races PT |
| 15 | https://www.pocketdm.com.br/races/dwarf | Race Detail |
| 16 | https://www.pocketdm.com.br/racas/dwarf | Race Detail PT |

### Ferramentas Interativas
| # | URL | O que é |
|---|-----|---------|
| 17 | https://www.pocketdm.com.br/dice | Dice Roller EN |
| 18 | https://www.pocketdm.com.br/dados | Dice Roller PT |
| 19 | https://www.pocketdm.com.br/encounter-builder | Encounter Builder EN |
| 20 | https://www.pocketdm.com.br/calculadora-encontro | Encounter Builder PT |

### Regras
| # | URL | O que é |
|---|-----|---------|
| 21 | https://www.pocketdm.com.br/rules | Rules Reference EN |
| 22 | https://www.pocketdm.com.br/regras | Rules Reference PT |

### Páginas Existentes (verificar badge e traduções)
| # | URL | O que é |
|---|-----|---------|
| 23 | https://www.pocketdm.com.br/monsters/adult-red-dragon | Monster EN (verificar badge 2014) |
| 24 | https://www.pocketdm.com.br/monstros/dragao-vermelho-adulto | Monster PT (verificar lair actions traduzidas) |

## Critérios de Avaliação

Para CADA página, avaliar:

### 1. Alinhamento com Brand (0-10)
- [ ] Paleta gold + dark correta?
- [ ] Cinzel em headings?
- [ ] Sem emojis? (SVG icons ou initial circles apenas)
- [ ] Tom premium, não infantil?
- [ ] Crown d20 no nav?
- [ ] Footer com CC-BY-4.0?

### 2. Alinhamento com Moats (0-10)
- [ ] **Moat 3 (Dual SRD)**: Toggle 2014/2024 presente onde aplicável?
- [ ] **Moat 5 (Radical Simplicity)**: A página é simples e focada? Ou está sobrecarregada?
- [ ] A página não tenta ser um VTT/character builder? (Anti-proposição)
- [ ] A página serve como topo de funil pro combat tracker? (CTA visível?)

### 3. CTA e Funil (0-10)
- [ ] CTA pro combat tracker está presente e visível?
- [ ] Headline do CTA é contextual? (não genérica)
- [ ] "Combat Tracker" aparece como marca (não traduzido)?
- [ ] Link "Try Free" / "Testar Grátis" funciona?
- [ ] O funil faz sentido? (pessoa lê referência → quer jogar → clica CTA)

### 4. SEO Técnico (0-10)
- [ ] Title tag inclui "Pocket DM"?
- [ ] Meta description é compelling? (não genérica)
- [ ] JSON-LD presente? (verificar via View Source)
- [ ] Canonical URL correta?
- [ ] Alternates EN ↔ PT-BR corretos?
- [ ] h1 único e descritivo?

### 5. Qualidade do Conteúdo (0-10)
- [ ] Dados são SRD-accurate? (verificar contra SRD 5.1 oficial)
- [ ] Tradução PT-BR é natural? (não machine-translate robótico)
- [ ] Descrições são úteis para um DM na mesa?
- [ ] A página tem algo que 5e.tools/Roll20 NÃO tem?

### 6. UX e Responsividade (0-10)
- [ ] Mobile: legível em 375px?
- [ ] Desktop: bom uso do espaço em 1440px?
- [ ] Interações funcionam? (toggles, expand, search, dice rolls)
- [ ] Loading rápido? (sem spinners longos)
- [ ] Navegação clara? (breadcrumbs, nav links)

### 7. Diferencial Competitivo (0-10)
- [ ] O que essa página oferece que 5e.tools NÃO oferece?
- [ ] O que essa página oferece que Roll20/D&D Beyond NÃO oferece?
- [ ] A tradução PT-BR é um diferencial real? (poucos concorrentes têm)
- [ ] A interatividade é diferencial? (dice roller, modifier calculator, death save tracker)

## Red Flags para Reportar

Marcar como CRITICAL se encontrar:
- Conteúdo não-SRD em página pública (violação de copyright)
- Emoji visível em qualquer lugar (violação de brand)
- CTA ausente ou quebrado (funil quebrado)
- Página 404 ou erro de build
- Texto em inglês em página PT-BR (ou vice-versa)
- Dado incorreto (spell level errado, CR errado, trait errada)

Marcar como HIGH se encontrar:
- Toggle 2014/2024 ausente onde deveria existir
- JSON-LD ausente ou malformado
- Canonical/alternates incorretos
- Design inconsistente com outras páginas do compêndio
- Interação quebrada (botão não funciona, search não filtra)

Marcar como MEDIUM se encontrar:
- Tradução awkward (não errada, mas não natural)
- Espaçamento inconsistente
- Componente que poderia ser mais interativo
- Metadata que poderia ser mais compelling

## Output Esperado

Para cada página, gerar:

```
### Página: [nome] ([url])
**Score**: X/70 (soma dos 7 critérios)

**Brand**: X/10 — [comentário]
**Moats**: X/10 — [comentário]
**CTA/Funil**: X/10 — [comentário]
**SEO Técnico**: X/10 — [comentário]
**Conteúdo**: X/10 — [comentário]
**UX/Responsividade**: X/10 — [comentário]
**Diferencial**: X/10 — [comentário]

**Red Flags**: [lista ou "Nenhum"]
**Quick Wins**: [melhorias de 5 min que dariam salto de qualidade]
**Visão de Futuro**: [o que essa página deveria ser daqui 6 meses]
```

### Relatório Final
Depois de auditar todas as 24 páginas:
1. **Top 5 páginas** (maior score) — o que está funcionando
2. **Bottom 5 páginas** (menor score) — o que precisa de trabalho urgente
3. **Padrões sistêmicos** — problemas que aparecem em várias páginas
4. **Roadmap sugerido** — priorização de fixes por impacto
5. **Nota estratégica** — como o compêndio SEO se encaixa na visão de 12 meses do Pocket DM

## Documentos de Referência

Leia estes documentos ANTES de começar a auditoria:
- `docs/brand-guide.md` — identidade visual
- `docs/competitive-moats-strategy.md` — 5 moats
- `docs/value-proposition-canvas.md` — anti-proposições
- `docs/prd-v2.md` — PRD atual
- `docs/monetization-strategy.md` — modelo de negócio
- `docs/gap-analysis-competitors-2026-03-30.md` — gaps competitivos
- `docs/epic-seo-supremo.md` — plano das páginas SEO
- `CLAUDE.md` — regras do projeto (SRD compliance, combat parity)

## Ferramentas

Use Playwright (browser MCP) para visitar as páginas, tirar screenshots, verificar responsividade (mobile + desktop), inspecionar source para JSON-LD, e testar interações.

Salve o relatório em `docs/qa-report-seo-supremo-critica.md`.
Salve screenshots em `qa-evidence/seo-supremo/` (criar pasta se necessário).
