# QA Tier 1 Report — Anti-Gremlin Critico (Demo-Ready)

**Data:** 2026-04-04
**Testador:** Claude Code (Playwright MCP)
**Ambiente:** localhost:3000, viewport 1280x720 (desktop) + 390x844 (mobile)
**Browser:** Chromium (Playwright)

---

## CHECKLIST FINAL — TIER 1

| # | Jornada | Status | Bugs Criticos | Bugs Menores | Observacoes UX |
|---|---------|--------|---------------|--------------|----------------|
| 1 | Landing + SEO + Funil | **PASS** | 0 | 2 | Landing excelente, funil <=6 cliques |
| 2 | Guest Combat | **PASS** | 2 | 5 | Core combat solido, recap com bugs |
| 3 | Login + Onboarding | **PASS** | 0 | 1 | Login funcional, dashboard completo |
| 10 | Combate Multiplayer | **MANUAL** | — | — | Requer 2 contextos de browser |
| 12 | Mobile (390x844) | **FAIL** | 3 | 4 | Overflow, touch targets, toolbar |
| 16 | Reconnection & Network | **MANUAL** | — | — | Requer network throttling |
| 19 | Funil Organico | **PASS** | 0 | 0 | Integrado na Jornada 1 |

---

## METRICAS

- **Cliques ate primeiro combate** (funil organico): **5-6 cliques** (<=7 PASS)
- **Overflow horizontal mobile:** **SIM** (setup mode, start-combat-btn area: 411px > 390px)
- **Touch targets <44px encontrados:** HP btn (33x28), Cond (48x28), Derrotar (64x28), Editar (50x28), Remover (67x28), current-turn-indicator (12x14), hp-value btns (36x16), initiative-badge (60x20)

---

## BUGS CRITICOS (Bloqueiam Demo)

### BUG-C1: Combat Recap mostra nomes obfuscados para o DM
- **Onde:** Post-combat recap modal (guest + auth)
- **Esperado:** DM ve nomes reais dos combatentes (Goblin 1, Fighter 1)
- **Atual:** DM ve nomes de player-view ("Vulto Armado", "Ameaca Oculta", "Vulto Sombrio")
- **Impacto:** O recap e inutilizavel para o DM — nao sabe quem fez o que
- **Screenshot:** `qa-evidence/tier1/j2-05-end-combat-click.png`

### BUG-C2: Combat Recap mostra "0 vs 2" em vez de contagem real
- **Onde:** Subtitulo do Combat Recap: "Combate de Teste - 0 vs 2 - 1 rounds"
- **Esperado:** "1 vs 1" ou "X PCs vs Y Monsters"
- **Atual:** "0 vs 2" — conta incorreta de lados
- **Impacto:** Confuso, parece bug para o usuario

### BUG-C3: Mobile — Horizontal overflow no setup (390x844)
- **Onde:** `/try` setup mode, area do botao "Iniciar Combate"
- **Esperado:** scrollWidth <= viewportWidth (390px)
- **Atual:** scrollWidth = 411px (21px overflow)
- **Causa:** `start-combat-btn` e parent `flex gap-4` ultrapassam viewport
- **Impacto:** Scroll horizontal involuntario em mobile

### BUG-C4: Mobile — Touch targets abaixo de 44px
- **Onde:** Botoes de acao em combate ativo (HP, Cond, Derrotar, Editar, Remover)
- **Esperado:** Minimo 44x44px (Apple HIG)
- **Atual:** Todos com height=28px. Pior caso: current-turn-indicator = 12x14px
- **Impacto:** DMs vao errar cliques durante combate. Critico para demo em bar de RPG

### BUG-C5: Mobile — Guest banner ausente no setup mode
- **Onde:** `/try` setup mode em 390x844
- **Esperado:** Banner "Modo Visitante" com timer visivel
- **Atual:** `data-testid="guest-banner"` nao encontrado no DOM
- **Impacto:** Visitante mobile nao sabe que esta em modo temporario

---

## BUGS IMPORTANTES (Nao bloqueiam, mas afetam qualidade)

### BUG-I1: Combat Log vazio apos aplicar dano
- **Onde:** "Log de Combate" side panel
- **Esperado:** Log registra acoes de HP (ex: "Goblin 1 recebeu 5 de dano")
- **Atual:** "Nenhuma acao de combate ainda" — vazio
- **Impacto:** Log perde utilidade como historico de combate

### BUG-I2: Combat Log + Recap abrem simultaneamente
- **Onde:** Ao encerrar combate
- **Esperado:** Apenas recap aparece (ou log fecha automaticamente)
- **Atual:** Ambos overlapping, layout confuso
- **Screenshot:** `qa-evidence/tier1/j2-06-debug-state.png`

### BUG-I3: Combate permite iniciar com 1 combatente
- **Onde:** Setup mode, botao "Iniciar Combate"
- **Esperado:** Minimo 2 combatentes ou warning
- **Atual:** Habilita com 1 — combate sem oponente nao faz sentido

### BUG-I4: Acid Splash duplicado no compendio de magias
- **Onde:** `/magias` — Cantrips section
- **Esperado:** Versoes 2014/2024 diferenciadas visualmente
- **Atual:** Dois cards identicos "Acid Splash Conj" sem indicador de versao

### BUG-I5: Titulo duplicado "Pocket DM | Pocket DM"
- **Onde:** Paginas do compendio (`/monstros`, `/magias`)
- **Esperado:** "Bestiario D&D 5e | Pocket DM"
- **Atual:** "Bestiario D&D 5e — Lista de Monstros SRD | Pocket DM | Pocket DM"

---

## ANALISE UX COMPLETA

### Landing Page (Nota: 9/10)
**Pontos fortes:**
- Hero section com headline forte e CTAs claros
- Social proof numerico (1200+ monstros, 750+ magias, R$0)
- Tabela comparativa Roll20/DDB/PocketDM — muito persuasiva
- Dark theme coerente com sessoes noturnas de RPG
- Stats bar de credibilidade antes do fold

**Pontos a melhorar:**
- Badge "Rendering..." do Next.js visivel no demo (producao OK)

### Compendio de Monstros (Nota: 8.5/10)
**Pontos fortes:**
- Busca com filtros CR + tipo instantaneos
- Stat blocks lindos com dados clicaveis (roll to hit, roll damage)
- Secao "Sobre" com tabs Em Combate/No Mundo/Dicas — conteudo unico
- Traducao EN/PT-BR estavel sem layout shift
- CTA contextual "Iniciar Combate" em cada monstro

**Pontos a melhorar:**
- Counter "776 monstros" mostra total da view 2014, nao os 1122 reais
- Slug inexistente retorna 404 generico do Next.js (poderia ter 404 custom RPG-themed)

### Compendio de Magias (Nota: 8/10)
**Pontos fortes:**
- Filtros triplos (Nivel + Escola + Classe) + Concentracao/Ritual
- Spell detail page limpa e informativa
- Class tags coloridos

**Pontos a melhorar:**
- Acid Splash duplicado sem diferenciacao visual 2014/2024
- Counter nao atualiza com filtro ativo
- 302 console errors (dev mode)

### Guest Combat — Setup (Nota: 8/10)
**Pontos fortes:**
- Guest banner informativo sem ser blocante
- SRD search rapido com CR/HP/AC inline
- Auto-populate HP/AC do SRD
- "+2 grupo" para adicionar multiplos monstros
- Starter encounter ("4 aventureiros vs 3 Goblins") e genial para onboarding

**Pontos a melhorar:**
- Tab order: Nome -> Init -> HP -> AC (deveria ser Nome -> HP -> AC -> Init)
- Aceita 1 combatente para iniciar (deveria exigir 2+)

### Guest Combat — Ativo (Nota: 7.5/10)
**Pontos fortes:**
- HP bar tiers (FULL/LIGHT/MODERATE/HEAVY/CRITICAL) com % claros
- Condition picker completo (13 condicoes + bonus)
- Initiative tracking com highlight no turno atual
- Persistence via localStorage — F5 restaura tudo
- Combat Recap com gamificacao (ranking de dano, duracao, media/turno)

**Pontos a melhorar:**
- Nomes obfuscados ("Vulto Armado") no recap do DM [BUG-C1]
- Combat Log vazio apos aplicar dano [BUG-I1]
- Mid-combat add empurra initiative list pra baixo em vez de usar drawer/modal
- Condition picker nao fecha automaticamente apos aplicar
- "Fechar" no painel mid-add e discreto demais

### Login + Dashboard (Nota: 8.5/10)
**Pontos fortes:**
- Login page limpa, erro inline em PT-BR sem revelar qual campo errou
- Redirect com ?next= param para retornar apos login
- "Encontro encontrado!" detecta guest combat e oferece importar — excelente conversao
- Streak badge ("2 semanas consecutivas") gamifica
- Quick actions proeminentes (Novo Combate, Criar NPC, Convidar Jogador)
- Sidebar organizada com todas as secoes

**Pontos a melhorar:**
- "Crie sua primeira mesa!" aparece mesmo com 3 combates ativos — logica de empty state incompleta
- Dashboard nao mostra campanhas como player (spec pedia `player-campaigns`)

### Mobile 390x844 (Nota: 5.5/10)
**Pontos fortes:**
- Landing page responsiva sem overflow
- Hamburger menu espaçoso com items de toque generosos
- Context-aware CTAs (logado vs guest)

**Problemas criticos:**
- Horizontal overflow no setup mode (21px)
- TODOS os botoes de acao do combate abaixo de 44px de altura (28px)
- Toolbar do combate desorganizado — botoes espalhados sem grid
- "Proximo Turno" nao e sticky — requer scroll em combates longos
- Subtitulos flavor ("Vulto Armado") desperdicam espaco vertical precioso
- Sem bottom nav ou FAB para acoes frequentes

---

## RECOMENDACOES PARA O DEMO (bares de RPG em BH, maio 2026)

### Must-Fix antes do demo:
1. **Fix touch targets no mobile** — Todos os botoes de acao precisam de height >= 44px
2. **Fix horizontal overflow no setup mobile** — Limitar width do start-combat area
3. **Fix nomes no Combat Recap** — DM deve ver nomes reais, nao obfuscados
4. **Adicionar sticky "Proximo Turno" no mobile** — FAB ou bottom bar

### Nice-to-have:
5. Fix Combat Log para registrar HP changes
6. Tab order do manual add: Nome -> HP -> AC -> Init
7. Diferenciar Acid Splash 2014/2024 no compendio
8. Empty state do dashboard condicional (esconder "Crie sua primeira mesa" se ha combates)

### O que JA esta otimo para o demo:
- Landing page e funil organico
- SRD search e stat blocks
- Guest combat core loop (add, roll, fight, damage, conditions)
- Persistence (F5 restaura tudo)
- Login + Dashboard + Quick Actions
- Dark theme RPG aesthetic
- Comparativo com concorrentes

---

**Veredicto geral:** O app esta **80% pronto para demo**. O core loop de combate funciona muito bem. Os problemas criticos sao todos no mobile (touch targets, overflow) e no Combat Recap (nomes obfuscados). Fixando esses 4 items, o demo fica solido.

Screenshots salvos em: `qa-evidence/tier1/`
