# Fire Trail Full-Page — Quick Spec

**Data:** 2026-03-27
**Status:** Pronto para implementação

---

## Objetivo

Criar uma trilha de fogo pixel art que atravessa a seção "Como Funciona" da landing page de borda a borda (edge-to-edge), com um pixel fire sprite viajando em loop contínuo.

---

## Comportamento Visual

### Trilha (Path)
- **Horizontal**, de borda esquerda a borda direita da página (100vw)
- **Ondulada** — curva suave subindo/descendo ao longo da seção
- **Fade nas bordas** — a trilha e o fogo escurecem/desaparecem nas laterais (mask gradient)
- A trilha passa **atrás** dos 4 RuneCircles (01-04) como o caminho que o fogo segue
- Cor: gradiente fogo (vermelho-escuro → laranja → dourado) com baixa opacidade
- Tracejada (dashed) com animação de flow sutil

### Pixel Fire Sprite
- **Estilo 16-bit pixel art** — retângulos SVG com `shapeRendering="crispEdges"`
- **2 frames alternando** a ~4fps (0.25s por frame) para efeito de flicker
- **Paleta**: vermelho escuro (#7f1d1d) → laranja (#ea580c) → âmbar (#f59e0b) → amarelo (#fbbf24) → branco core
- **Tamanho**: ~12-16px de altura no viewport
- **Glow**: radial gradient blur atrás do sprite para warmth

### Trailing Embers
- 5-8 pequenos quadrados pixelados atrás do fogo
- Cores progressivas (vermelho → laranja)
- Flicker de opacidade independente
- Espaçados com offsets x/y variados

### Loop
- **Contínuo infinito** — o fogo viaja da esquerda pra direita em ~8s
- Quando sai pela borda direita, reaparece pela borda esquerda (seamless)
- O mask de fade nas bordas garante que a transição é suave

### Static Embers no Path
- ~20-30 pequenas partículas pixel fixas ao longo do path
- Opacidade baixa (0.15-0.3) com flicker
- Cores baseadas na posição (vermelho na esquerda → dourado na direita)

---

## Integração na LP

### Posição
- Na seção "Como Funciona" (`HowItWorksSection`)
- Posicionamento `absolute` ocupando full-width da seção
- `z-index` atrás dos RuneCircles e step cards, mas acima do background
- Alinhamento vertical: na mesma altura dos RuneCircles (onde a QuestPath atual fica)

### Relação com QuestPath existente
- O `QuestPath` atual fica APENAS entre os 4 circles (conector)
- O `FireTrail` fica atrás, full-width, como a trilha estendida
- Ou: substituir o QuestPath pelo FireTrail passando as posições dos steps

### Mobile
- Esconder no mobile (a seção já tem layout diferente em mobile)
- `className="hidden md:block"`

---

## Arquivos

- `components/ui/rpg/FireTrail.tsx` — componente (já criado, precisa ajustes)
- `components/ui/rpg/index.ts` — export
- `app/page.tsx` — integrar na HowItWorksSection

---

## Tokens RPG Utilizados

- `FIRE_GRADIENT` cores (dark, mid, warm, ember, gold)
- `getFireStepColor()` para static embers
- Animações: `animate-flow-dash` (existente)

---

## Acessibilidade

- `aria-hidden="true"` no SVG inteiro
- `motion-reduce:hidden` no grupo de animações
- `prefers-reduced-motion: reduce` desabilita o sprite animado

---

## Referências Visuais do Dani_

- Pixel fire sprites 16-bit (firebolt horizontal, chama vertical, fogueira)
- A trilha é uma "estrada de fogo" que vai de ponta a ponta
- Fade/escurece nas bordas da página
- O fogo faz loop contínuo (sai pela direita, entra pela esquerda)
