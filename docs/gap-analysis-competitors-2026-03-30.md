# Analise de Gaps Criticos — Pocket DM vs 9 Concorrentes

> **Objetivo:** Cruzar os 9 concorrentes mapeados com as features do Pocket DM e identificar onde estamos expostos (gaps que um concorrente pode explorar contra nos).
> **Data:** 2026-03-30
> **Metodo:** Matriz feature x concorrente + classificacao de risco por gap

---

## Os 9 Concorrentes Mapeados

| # | Concorrente | Tipo | Preco | Publico |
|---|-------------|------|-------|---------|
| 1 | **D&D Beyond** | Plataforma oficial WotC | Free / $2.99 / $5.99/mo | Todos (15M users) |
| 2 | **Roll20** | VTT online | Free / $5.99 / $10.99/mo | Mesas online |
| 3 | **Foundry VTT** | VTT self-hosted | $50 one-time | Power users tecnicos |
| 4 | **Fantasy Grounds** | VTT + marketplace | **Gratuito** (nov 2025) | Mesas online, catalogo oficial |
| 5 | **Alchemy RPG** | VTT narrativo | Free / $8/mo | Narrativa-first |
| 6 | **Shieldmaiden** | Combat tracker | Free / Patreon | DMs de mesa |
| 7 | **Owlbear Rodeo** | VTT minimalista | Free / ~$6/mo | Simplicidade |
| 8 | **Improved Initiative** | Combat tracker OSS | Free | DMs budget-zero |
| 9 | **MasterApp RPG** | Gestao campanha BR | Free / R$10 / R$25/mo | DMs brasileiros |

---

## Matriz de Features — Pocket DM vs Todos

### Legenda
- **PDM** = Pocket DM tem
- **---** = Pocket DM NAO tem
- Numeros = quantos dos 9 concorrentes tem aquela feature
- **RISCO** = classificacao do gap

### CATEGORIA 1: Combat Tracking (Nosso Core)

| Feature | Pocket DM | Quem tem | Qtd | Gap? |
|---------|-----------|----------|-----|------|
| Initiative tracker | PDM | Todos exceto Owlbear | 8/9 | Nao — table stakes |
| HP management (damage/heal) | PDM | 7/9 (exceto Owlbear, Alchemy) | 7/9 | Nao |
| Conditions tracking com icones | PDM | Shieldmaiden (basico), D&D Beyond (fraco) | 2/9 | **VANTAGEM** |
| Death saves SRD | PDM | Nenhum tracker tem completo | 0/9 | **VANTAGEM** |
| Turn timer | PDM | Nenhum | 0/9 | **VANTAGEM** |
| Leaderboard de dano | PDM | Nenhum | 0/9 | **VANTAGEM** |
| Keyboard shortcuts p/ DM | PDM | Improved Initiative (parcial) | 1/9 | **VANTAGEM** |
| Add combatant mid-combat | PDM (parcial) | Improved Initiative, Shieldmaiden | 2/9 | Nao — em dev |
| Monster grouping | --- (em dev) | Improved Initiative, Shieldmaiden | 2/9 | **GAP MEDIO** |
| Undo/redo em combate | PDM | Nenhum | 0/9 | **VANTAGEM** |

**Veredito Combat:** Estamos bem. 7 vantagens exclusivas no core. Monster grouping e mid-combat add estao em dev (Track B).

---

### CATEGORIA 2: Player Experience

| Feature | Pocket DM | Quem tem | Qtd | Gap? |
|---------|-----------|----------|-----|------|
| Real-time sync com players | PDM | D&D Beyond (dentro do VTT), Roll20/Foundry (VTT) | 3/9 (VTTs) | **VANTAGEM** (unico como companion) |
| Guest access sem login | PDM | Nenhum combat tracker | 0/9 | **VANTAGEM** |
| Player view no celular | PDM | Shieldmaiden (tela separada, nao sync) | 1/9 | **VANTAGEM** |
| Turn notifications push | --- (em dev) | Nenhum | 0/9 | **GAP CRITICO** — prometido mas nao entregue |
| Player character sheet view | --- | D&D Beyond, Roll20, Foundry, FG, MasterApp | 5/9 | **GAP ALTO** |
| Player spell lookup | PDM | D&D Beyond | 1/9 | **VANTAGEM** |
| Player dice rolling | --- | Roll20, Foundry, FG, MasterApp, Alchemy | 5/9 | **GAP MEDIO** |
| Voice/video chat | --- | Roll20, Foundry, Alchemy | 3/9 | Nao — fora de escopo (mesa presencial) |

**Veredito Player:** Dominamos a experiencia presencial. Gaps em notifications (critico, em dev), character sheet view (alto, bucket futuro). Dice rolling descartado (mesa presencial usa dados fisicos).

---

### CATEGORIA 3: Conteudo & Referencia

| Feature | Pocket DM | Quem tem | Qtd | Gap? |
|---------|-----------|----------|-----|------|
| SRD monsters completo | PDM | Improved Initiative, D&D Beyond (pago) | 2/9 | **VANTAGEM** |
| SRD spells completo | PDM | Improved Initiative, D&D Beyond (pago) | 2/9 | **VANTAGEM** |
| Dual version 2014+2024 | PDM | Nenhum (D&D Beyond botched isso) | 0/9 | **VANTAGEM** |
| Conteudo licenciado oficial | --- | D&D Beyond, Fantasy Grounds (3000+ produtos), Roll20 | 3/9 | **GAP ALTO** mas intencional |
| Homebrew content creation | --- (em dev) | Foundry (modulos), Roll20 (API), FG (marketplace) | 3/9 | **GAP MEDIO** — em dev (C.2.4) |
| Compendium in-combat | PDM | MasterApp (basico) | 1/9 | **VANTAGEM** |
| CR calculator | --- (em dev) | D&D Beyond, Improved Initiative | 2/9 | **GAP BAIXO** — em dev (C.2.3) |

**Veredito Conteudo:** SRD e dual versioning sao vantagens fortes. Conteudo licenciado e gap intencional (nao competimos). Homebrew em dev.

---

### CATEGORIA 4: Campanha & Gestao

| Feature | Pocket DM | Quem tem | Qtd | Gap? |
|---------|-----------|----------|-----|------|
| Criar/gerenciar campanhas | PDM | D&D Beyond, Roll20, Foundry, FG, Alchemy, MasterApp | 6/9 | Nao — temos |
| Convite por link | PDM | MasterApp, Alchemy | 2/9 | Nao — temos |
| Historico de sessoes | PDM (basico) | D&D Beyond, Roll20, FG, MasterApp | 4/9 | **GAP MEDIO** |
| Character builder/wizard | --- | D&D Beyond, Roll20, FG, MasterApp (AI art cards) | 4/9 | **GAP ALTO** |
| XP/level tracking auto | --- | D&D Beyond, MasterApp | 2/9 | **GAP MEDIO** |
| Notas privadas DM | PDM (basico) | D&D Beyond, Roll20, Foundry, FG, MasterApp (pastas) | 5/9 | **GAP MEDIO** — MasterApp tem pastas |
| Notas compartilhadas | --- (em dev) | D&D Beyond, Roll20, Foundry, MasterApp | 4/9 | **GAP ALTO** |
| Calendar/scheduling | --- | Roll20, Alchemy, StartPlaying | 3/9 | **GAP BAIXO** — fora de escopo |
| Campaign image/banner | --- | MasterApp (AI art), D&D Beyond | 2/9 | **GAP BAIXO** |

**Veredito Campanha:** Temos o basico. Character builder e gap alto mas intencional ("nao somos D&D Beyond"). Notas compartilhadas em dev. Historico de sessoes precisa melhorar.

---

### CATEGORIA 5: Visual & Imersao

| Feature | Pocket DM | Quem tem | Qtd | Gap? |
|---------|-----------|----------|-----|------|
| Soundboard/ambience | PDM | MasterApp (Bardo), Alchemy, Shieldmaiden (YouTube) | 3/9 | Nao — temos |
| Dice roller 3D | --- | MasterApp (Babylon.js), Roll20, Foundry, FG | 4/9 | **GAP MEDIO** |
| Maps/grid VTT | --- | Roll20, Foundry, FG, Alchemy, Owlbear, D&D Beyond | 6/9 | **GAP INTENCIONAL** |
| Fog of war | --- | Roll20, Foundry, FG, Alchemy | 4/9 | **GAP INTENCIONAL** |
| Token art AI | --- | MasterApp (arte AI por monstro) | 1/9 | **GAP BAIXO** |
| Dark mode | PDM | Maioria | 7/9 | Nao — temos |
| Animated effects | --- | Alchemy, Foundry (modulos) | 2/9 | **GAP BAIXO** |
| Perfil com banner/avatar | --- | MasterApp | 1/9 | **GAP BAIXO** |

**Veredito Visual:** Maps/VTT e gap intencional (nosso manifesto). Dice roller 3D e um nice-to-have que MasterApp usa como diferencial visual. Nao e critico.

---

### CATEGORIA 6: Plataforma & Tecnico

| Feature | Pocket DM | Quem tem | Qtd | Gap? |
|---------|-----------|----------|-----|------|
| Mobile-first | PDM (player) | Game Master 5e (nativo), Owlbear | 2/9 | **VANTAGEM** |
| PWA/offline | --- (planejado H2) | Game Master 5e (nativo), Foundry (self-hosted) | 2/9 | **GAP ALTO** |
| API publica | --- (planejado H3) | Foundry (modulos), Roll20 (API scripting) | 2/9 | **GAP MEDIO** |
| Multi-system (PF2e, etc) | --- (planejado H3) | Foundry (200+ sistemas), FG (50+), Roll20 (varios) | 3/9 | **GAP ALTO** |
| D&D Beyond sync/import | --- | Shieldmaiden, Foundry (modulos) | 2/9 | **GAP ALTO** |
| i18n (PT-BR) | PDM | MasterApp | 1/9 | **VANTAGEM** (maioria e EN-only) |
| Open source | --- | Improved Initiative, Shieldmaiden | 2/9 | Neutro |
| Self-hosted option | --- | Foundry | 1/9 | Neutro |

**Veredito Plataforma:** PWA e D&D Beyond import sao gaps altos. Multi-system e importante para TAM futuro mas nao urgente.

---

## Consolidacao: Top 10 Gaps Criticos por Risco

### Classificacao de Risco
- **CRITICO** = Concorrente pode usar contra nos AGORA, afeta proposta de valor core
- **ALTO** = Gap significativo, muitos concorrentes tem, DMs vao sentir falta
- **MEDIO** = Gap real mas nao deal-breaker, pode esperar 1-2 sprints
- **BAIXO** = Nice-to-have, nao afeta decisao de compra

| # | Gap | Risco | Quem explora | Status Pocket DM | Acao recomendada |
|---|-----|-------|-------------|-----------------|-----------------|
| **G-01** | Turn notifications push ("E sua vez!") | **CRITICO** | Ninguem tem — mas e nossa promessa | Em dev (B.2.1) | **Prioridade maxima Sprint 1** — sem isso, real-time sync perde 50% do valor |
| **G-02** | PWA / offline mode | **ALTO** | Game Master 5e (nativo) | Planejado H2 | WiFi na mesa e instavel. Sem PWA, perdemos para app nativo em confiabilidade |
| **G-03** | D&D Beyond character import | **ALTO** | Shieldmaiden, Foundry | Nao planejado | 80%+ dos DMs tem personagens no D&D Beyond. Import via API publica do Beyond = killer integration |
| **G-04** | Notas compartilhadas com jogadores | **ALTO** | D&D Beyond, Roll20, Foundry, MasterApp | Em dev (B.3.x) | MasterApp tem com pastas. Nosso basico precisa chegar rapido |
| **G-05** | Character builder (simplificado) | **ALTO** | D&D Beyond, MasterApp (wizard visual) | Bucket futuro F-34 | NAO competir com D&D Beyond. Fazer versao "quick add" com classe+nivel+stats. Suficiente para mesa |
| **G-06** | Multi-system (Pathfinder 2e) | **ALTO** | Foundry (200+), FG (50+), Roll20 | Planejado H3 | Foundry tem 18% do mercado PAGO. PF2e e o segundo maior sistema. Sem isso, TAM limitado a D&D |
| **G-07** | Dice roller (pelo menos basico) | **MEDIO** | MasterApp (3D), Roll20, Foundry, FG | **Decision: Bucket (confirmed by user 2026-03-30)** | Mesa presencial — dados fisicos sao parte da experiencia. Nao incluir no roadmap |
| **G-08** | Homebrew content creation | **MEDIO** | Foundry, Roll20, FG | Em dev (C.2.4) | Mestres criam monstros/spells custom. Sem isso, ficamos limitados ao SRD |
| **G-09** | Historico de sessoes detalhado | **MEDIO** | D&D Beyond, Roll20, FG, MasterApp | Basico implementado | Combat log existe mas precisa de resumo, timeline, stats por sessao |
| **G-10** | XP/level tracking | **MEDIO** | D&D Beyond, MasterApp | Bucket futuro F-02/03/04 | DMs perguntam isso. Pode ser modulo Pro simples |

---

## Gaps INTENCIONAIS (Nao Fechar)

Estes gaps sao decisoes estrategicas, NAO vulnerabilidades:

| Gap | Por que NAO fechar | Concorrentes que tem |
|-----|-------------------|---------------------|
| Maps/VTT grid | "Faz UMA coisa e faz bem" — competir com Roll20/Foundry = perder | 6/9 |
| Fog of war | Idem | 4/9 |
| Voice/video | Mesa presencial — jogadores estao na mesma sala | 3/9 |
| Conteudo licenciado oficial | Exige acordo com WotC + investimento massivo | 3/9 |
| Character builder completo | D&D Beyond faz melhor. Complementar, nao substituir | 4/9 |
| Calendar/scheduling | Fora do core loop de combate | 3/9 |

---

## Analise de Vulnerabilidade por Concorrente

### Quem pode nos atacar DIRETAMENTE?

| Concorrente | Risco | Cenario de ataque | Nossa defesa |
|-------------|-------|-------------------|-------------|
| **Shieldmaiden** | **ALTO** | Adiciona real-time sync (e open source, comunidade pode contribuir) | 12+ meses de polish, dual versioning, soundboard, anti-metagaming HP tiers |
| **MasterApp** | **MEDIO** | Adiciona player sync + melhora estabilidade (corrige hydration errors) | Real-time broadcast superior, guest access, SRD real, UX mais polida |
| **D&D Beyond** | **MEDIO-ALTO** | Rebuild 2027 inclui combat companion mode | Simplicidade, zero-friction, dual versioning, preco BRL. Mas 15M users e gravitacional |
| **Improved Initiative** | **BAIXO** | UX datada, sem manutencao ativa | Ja somos superior em tudo exceto ser gratuito |
| **Owlbear Rodeo** | **BAIXO** | Adiciona combat tracking | Foco deles e maps. Combat tracking nativo exigiria pivot |
| **Game Master 5e** | **BAIXO** | Mobile nativo e vantagem real | App datado, sem sync, iOS-first |

### Quem NAO nos ameaca?

| Concorrente | Por que |
|-------------|---------|
| Roll20 | Online-first, complexo, nao otimizado pra mesa presencial |
| Foundry VTT | Publico tecnico, self-hosted, curva de aprendizado ingreme |
| Fantasy Grounds | Desktop-only, UI datada, impossivel retrofit mobile-first |
| Alchemy RPG | Narrativa-first, combat tracking fraco |

---

## Plano de Acao: Fechar os Gaps Criticos

### Sprint 1 (Imediato) — Proteger o Core

| Gap | Acao | Story ref | Esforco |
|-----|------|-----------|---------|
| G-01 | Implementar turn notifications | B.2.1 + B.2.2 | G |
| G-04 | Notas compartilhadas basicas | B.3.x | M |

### Sprint 2 (Curto prazo) — Expandir Defesas

| Gap | Acao | Story ref | Esforco |
|-----|------|-----------|---------|
| G-02 | PWA com offline queue | H2.1 | G |
| G-08 | Homebrew monsters/spells | C.2.4 | G |

### Sprint 3 (Medio prazo) — Ampliar TAM

| Gap | Acao | Story ref | Esforco |
|-----|------|-----------|---------|
| G-03 | D&D Beyond character import | **NOVO — criar spec** | G |
| G-05 | Quick character creator (classe+nivel+stats) | **NOVO — simplificar F-34** | M |
| G-09 | Session history com resumo e stats | **NOVO — criar spec** | M |
| G-10 | XP tracking basico (manual) | **NOVO — simplificar F-02** | P |

### Horizonte 3 (Longo prazo)

| Gap | Acao | Story ref | Esforco |
|-----|------|-----------|---------|
| G-06 | Multi-system PF2e | H3.2 | XG |

---

## Metricas de Sucesso da Gap Analysis

| Metrica | Como medir | Target |
|---------|-----------|--------|
| Gaps criticos abertos | Contagem de G-01 a G-10 em status "nao iniciado" | 0 criticos, <=2 altos ate Sprint 3 |
| Features onde vencemos vs perdemos | Ratio PDM wins / total features | >65% |
| Concorrentes que podem atacar direto | Count de risco ALTO | <=1 (so Shieldmaiden) |
| Churn por "feature missing" | Feedback de usuarios que saem | <10% citam feature que concorrente tem |

---

## Conclusao Executiva

### Onde estamos FORTES (manter e ampliar):
1. **Combat tracking** — 7 vantagens exclusivas no core loop
2. **Real-time sync** — unico combat tracker com broadcast para players
3. **Zero friction** — guest access sem login e imbativel
4. **SRD dual versioning** — ninguem mais tem
5. **Mesa presencial first** — quadrante competitivo que ocupamos sozinhos

### Onde estamos EXPOSTOS (fechar urgente):
1. **Turn notifications** — prometido, nao entregue. E a segunda metade do real-time
2. **PWA/offline** — WiFi na mesa e instavel. App nativo ganha aqui
3. **D&D Beyond import** — 80%+ dos DMs tem PCs la. Bridge = conversao

### Onde estamos VULNERAVEIS (monitorar):
1. **Shieldmaiden** pode adicionar real-time sync (open source, comunidade ativa)
2. **D&D Beyond rebuild** (~2027) pode incluir combat companion mode
3. **Multi-system** — sem PF2e, TAM e limitado

### Decisao G-07 (Dice Roller): RESOLVIDA

> **Decision: Bucket (confirmed by user 2026-03-30)**
>
> G-07 (Dice Roller) fica no bucket futuro. Pocket DM e focado em mesas presenciais onde dados fisicos sao parte da experiencia. Se analytics mostrarem demanda no futuro, reavaliar.
>
> Opcao escolhida: **B — Bucket futuro**

---

> **Ultima atualizacao:** 2026-03-30
> **Gerado por:** Analise de Gaps Criticos — Brainstorming Session
> **Documentos cruzados:** competitive-analysis-masterapp, market-research-ttrpg, value-proposition-canvas, competitive-moats-strategy, monetization-strategy, brainstorming-session radiografia
