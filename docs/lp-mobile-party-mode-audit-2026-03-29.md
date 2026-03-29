# LP Mobile — Party Mode Audit & Decisions

**Data:** 2026-03-29
**Participantes:** Sally (UX), John (PM), Mary (Analyst), Amelia (Dev)
**Contexto:** Dani_ refez a LP mobile e pediu feedback colaborativo. Análise baseada em 16 screenshots da auditoria mobile + código fonte completo.

---

## Decisões Aprovadas

### 1. Hero CTA — Mais destaque ao "Testar" (sem mudar hierarquia)
- **Hierarquia mantida:** "Salvar minhas campanhas" = primary gold, "Testar" = secondary
- **Problema:** botão "Testar" quase invisível (`bg-white/[0.06]`, `border-white/[0.10]`)
- **Solução:** `border-gold/20`, sutil gold glow/shadow, possivelmente `text-lg`
- **Copy:** considerar encurtar para "Testar Grátis" ou "Começar Agora (Grátis)"

### 2. Features Mobile — Lista vertical com descrição
- **Problema:** grid 2x2 com só emoji+título não comunica diferenciais
- **Solução:** trocar `grid-cols-2` por lista `grid-cols-1`, adicionar 1 linha de descrição curta
- **Impacto na altura:** ~20px no máximo

### 3. Comparação Mobile — Condensar rows
- **Problema:** tabela de comparação muito longa no mobile, scroll excessivo
- **Solução:** mostrar 4-5 diferenciais mais fortes, colapsar ou remover os menos impactantes
- **Impacto na altura:** DIMINUI a página

### 4. Padronizar Copy "Sem Cadastro"
- **Problema:** variações inconsistentes — "Testar sem conta", "Começar Grátis", "Sem cadastro necessário"
- **Solução:** unificar linguagem em toda a LP

### 5. Testimonials — Dots indicadores
- **Problema:** carousel sem feedback visual de que há mais cards
- **Solução:** adicionar 3 dots abaixo do carousel, remover texto "Deslize para ver mais"
- **Impacto na altura:** zero

### 6. Menu Mobile — Aproveitar espaço vazio
- **Problema:** menu fullscreen com só 4 links + Login/CTA, muito espaço vazio
- **Solução:** layout mais compacto ou bottom sheet, ou adicionar contexto útil

## Decisões Rejeitadas

### ~~8. Desligar particles em mobile~~
- **Rejeitado por Dani_:** "somos premium afinal"
- Particles mantidas. `HeroParticles` já respeita `prefers-reduced-motion`.

## Pendente (Asset necessário)

### Screenshot/Demo do produto
- **Consenso:** falta visual do produto na LP — nenhum screenshot ou demo
- **Plano:** Dani_ grava screenshot estático ou GIF do tracker em ação
- **Implementação:** preparar espaço no layout, trocar quando asset estiver pronto

## Restrição Global
- **LP mobile NÃO pode crescer.** Todas as mudanças otimizam dentro do espaço existente ou reduzem altura.
