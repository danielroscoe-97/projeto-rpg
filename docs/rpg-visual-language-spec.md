# Pocket DM — Linguagem Visual RPG (UX Spec)

**Data:** 2026-03-27
**Autora:** Sally (UX Designer), validado por Dani_
**Status:** Aprovado — pronto para implementacao

---

## 1. Principios de Design RPG

### 1.1 Fantasy mas limpo

O Pocket DM evoca o universo de RPG de mesa sem cair em skeuomorphismo pesado. Nao estamos recriando um livro de D&D — estamos construindo uma ferramenta premium que _respira_ fantasia. A diferenca entre nos e um VTT generico e que cada pixel tem intencao tematica, mas nunca sacrifica usabilidade.

**Regra de ouro:** se voce precisa explicar o elemento RPG, ele esta pesado demais.

### 1.2 Sutileza > Espalhafato

Elementos RPG devem complementar a interface, nao dominar. O usuario esta gerenciando combate — precisa de clareza, velocidade, e controle. A tematica entra como _atmosfera_, nao como obstaculo.

| Nivel | Exemplo | Quando usar |
|-------|---------|-------------|
| **Sutil** | Glow dourado no hover de um card | UI funcional (combat, compendium) |
| **Moderado** | Gradiente fogo em timeline de steps | Onboarding, landing page |
| **Expressivo** | Particulas de brasa no hero | Apenas landing page hero e marketing |

### 1.3 Progressao tematica — Fogo como metafora

Fogo e luz sao a metafora central de progresso e energia no Pocket DM:

- **Brasa/vermelho escuro** = inicio, potencial, dormencia
- **Laranja/fogo** = progresso, acao, energia
- **Dourado** = conclusao, maestria, recompensa

Essa progressao se aplica a:
- Barras de progresso (vermelho → dourado)
- Steps de onboarding (brasa → tocha → ouro)
- Pricing tiers (Free = brasa, Pro = dourado)
- Loading states (ember → flame → glow)

---

## 2. Vocabulario Visual RPG

Cada elemento abaixo e um building block reutilizavel. Todos devem ser implementados como componentes isolados.

---

### 2.1 Fire Gradient

| Aspecto | Definicao |
|---------|-----------|
| **Metafora RPG** | Tocha acendendo — a chama nasce no escuro e culmina em ouro |
| **Onde usar** | Barras de progresso, timelines, step indicators, loading bars, pricing highlights |
| **Onde NAO usar** | Texto (acessibilidade), backgrounds inteiros (cansativo), borders finas |
| **Direcao padrao** | Horizontal (left → right) para progresso, vertical (bottom → top) para energia |

**Cores:**

```
from:  #7f1d1d  (red-900)     — brasa apagada
via:   #c2410c  (orange-700)   — chama viva
to:    #D4A853  (gold)         — ouro da coroa
```

**CSS/Tailwind:**

```css
/* CSS */
background: linear-gradient(90deg, #7f1d1d, #c2410c, #D4A853);

/* Tailwind (com extensao) */
class="bg-gradient-to-r from-red-900 via-orange-700 to-gold"
```

**Variantes:**

| Variante | Uso | CSS |
|----------|-----|-----|
| `fire-full` | Progresso completo, CTAs expressivos | `from-red-900 via-orange-700 to-gold` |
| `fire-subtle` | Borders, underlines, dividers | Mesmo gradiente com `opacity: 0.3` |
| `fire-radial` | Backgrounds ambient, glow centers | `radial-gradient(circle, #c2410c 0%, #7f1d1d 50%, transparent 80%)` |

**Regras:**
- Sempre da esquerda (escuro) para direita (claro) em contexto de progresso
- Em contexto vertical, sempre de baixo (escuro) para cima (claro) — fogo sobe
- Nunca aplicar como `background-clip: text` em texto funcional — apenas decorativo se necessario
- Largura minima para o gradiente ser legivel: 120px

---

### 2.2 Torch Glow

| Aspecto | Definicao |
|---------|-----------|
| **Metafora RPG** | Luz de tocha na masmorra — ilumina o que importa, deixa o resto na penumbra |
| **Onde usar** | Hover states, elementos ativos/selecionados, focus rings, highlights de importancia |
| **Onde NAO usar** | Mais de 2 elementos simultaneos na mesma viewport (perde impacto) |

**CSS/Tailwind:**

```css
/* Torch Glow — padrao (gold) */
box-shadow:
  0 0 15px rgba(212, 168, 83, 0.3),
  0 0 40px rgba(212, 168, 83, 0.1);

/* Torch Glow — intenso (hover/active) */
box-shadow:
  0 0 20px rgba(212, 168, 83, 0.4),
  0 0 60px rgba(212, 168, 83, 0.15);

/* Torch Glow — warm (fogo, urgencia) */
box-shadow:
  0 0 15px rgba(232, 89, 60, 0.3),
  0 0 40px rgba(232, 89, 60, 0.1);
```

**Tailwind (com extensoes propostas):**

```html
<div class="shadow-torch">          <!-- glow gold padrao -->
<div class="shadow-torch-lg">       <!-- glow gold intenso -->
<div class="shadow-torch-warm">     <!-- glow fogo/warm -->
```

**Intensidades:**

| Intensidade | Opacity do glow | Uso |
|-------------|----------------|-----|
| `low` | 0.15 / 0.05 | Elementos inativos com hint de destaque |
| `medium` | 0.3 / 0.1 | Padrao — hover, active, selected |
| `high` | 0.4 / 0.15 | CTAs principais, hero elements |

**Regras:**
- Transicao de entrada: `transition: box-shadow 300ms ease-out`
- Nunca combinar torch glow com outro box-shadow (sobreposicao confusa)
- Em dark backgrounds (< #1A1A28), glow fica mais visivel — usar intensidade `low`
- Em surfaces mais claras (#222234+), pode usar `medium`

---

### 2.3 Parchment Surface

| Aspecto | Definicao |
|---------|-----------|
| **Metafora RPG** | Mapa do mestre, pergaminho antigo, carta de taverna |
| **Onde usar** | Cards especiais (stat blocks, pricing cards, feature highlights), secoes de destaque na LP |
| **Onde NAO usar** | Cards funcionais do combate (precisa ser limpo), backgrounds inteiros |

**Implementacao:**

```css
/* Background base — marrom escuro quente, muito sutil */
background-color: #2a2520;

/* Noise overlay via SVG */
background-image: url('/art/textures/parchment-noise.svg');
background-blend-mode: overlay;
opacity: /* do noise */ 0.03;

/* Borda sutil gold */
border: 1px solid rgba(212, 168, 83, 0.12);
```

**Niveis de intensidade:**

| Nivel | Background | Noise opacity | Border gold | Uso |
|-------|-----------|---------------|-------------|-----|
| `subtle` | `#1e1c1a` | 0.02 | 0.08 | Dentro de surfaces escuras, diferenciacao sutil |
| `standard` | `#2a2520` | 0.03 | 0.12 | Cards de feature, stat blocks |
| `expressive` | `#332e28` | 0.05 | 0.18 | Hero sections, pricing cards destaque |

**Regras:**
- A textura de noise DEVE ser SVG (nao PNG) para escalar sem artefatos
- O noise e overlay sobre a cor base — nunca substitui o background
- Maximo 2 parchment surfaces visiveis ao mesmo tempo na viewport
- Em mobile, reduzir noise opacity pela metade (performance)
- Nunca usar com texto claro fino (< 500 weight) — contraste insuficiente

---

### 2.4 Rune Circle

| Aspecto | Definicao |
|---------|-----------|
| **Metafora RPG** | Circulo magico, simbolo arcano, glifo de poder |
| **Onde usar** | Step indicators (onboarding, wizards), badges numerados, loading spinners, achievement badges |
| **Onde NAO usar** | Mais de 5 em sequencia (vira ruido), tamanhos abaixo de 24px (perde detalhe) |

**Anatomia:**

```
┌─────────────┐
│  ╭── ring ──╮│   Ring externo: borda dourada 2px
│  │  inner   ││   Inner glow: radial gradient sutil
│  │  ┌───┐   ││   Content: numero, icone, ou check
│  │  │ 1 │   ││
│  │  └───┘   ││
│  ╰──────────╯│
└─────────────┘
```

**CSS/Tailwind:**

```css
/* Rune Circle base */
.rune-circle {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: 2px solid #D4A853;
  background: radial-gradient(circle, rgba(212, 168, 83, 0.1) 0%, transparent 70%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-cinzel);
  color: #D4A853;
}

/* Variante ativa (step atual) */
.rune-circle--active {
  border-color: #D4A853;
  box-shadow: 0 0 12px rgba(212, 168, 83, 0.3);
  background: radial-gradient(circle, rgba(212, 168, 83, 0.2) 0%, transparent 70%);
}

/* Variante completa */
.rune-circle--complete {
  background: #D4A853;
  color: #13131E;
  border-color: #D4A853;
}

/* Variante futura (ainda nao atingido) */
.rune-circle--future {
  border-color: rgba(212, 168, 83, 0.3);
  color: rgba(212, 168, 83, 0.3);
  background: transparent;
}
```

**Tamanhos:**

| Size | Dimensao | Font size | Border | Uso |
|------|----------|-----------|--------|-----|
| `sm` | 32px | 14px | 1.5px | Badges inline, mobile steps |
| `md` | 48px | 18px | 2px | Step indicators padrao |
| `lg` | 64px | 24px | 2.5px | Hero sections, achievements |

**Variantes de cor:**

| Variante | Ring color | Glow color | Uso |
|----------|-----------|------------|-----|
| `fire` | Fire gradient (animado) | Warm orange | Steps de progresso |
| `gold` | Gold solido | Gold | Padrao, generico |
| `arcane` | Cool blue (#5B8DEF) | Blue | Features magicas, info |

**Regras:**
- Fonte do numero DEVE ser Cinzel (reforco de marca)
- Ring pulse animation apenas no step ativo (nao em todos)
- Em sequencia, conectar com QuestPath (ver 2.5)

---

### 2.5 Quest Path

| Aspecto | Definicao |
|---------|-----------|
| **Metafora RPG** | Trilha no mapa de dungeon — o caminho entre salas, a jornada do heroi |
| **Onde usar** | Timelines (how-it-works), wizards multi-step, onboarding flows, roadmaps |
| **Onde NAO usar** | Navegacao funcional (tabs, breadcrumbs — devem ser limpos) |

**Anatomia:**

```
  [Rune 1] ───●────────●────── [Rune 2] ────●──────── [Rune 3]
              dot      dot                  dot

  ← completo →│← progresso atual →│← futuro (dimmed) →
  (gold solido) (fire gradient)     (gold/30 tracejado)
```

**Segmentos:**

| Estado | Estilo da linha | Dots | Cor |
|--------|----------------|------|-----|
| Completo | Solida, 2px | Gold solido | `#D4A853` |
| Atual | Fire gradient, 2px | Animados (pulse) | `#7f1d1d → #D4A853` |
| Futuro | Tracejada, 1px | Gold/30 | `rgba(212, 168, 83, 0.3)` |

**CSS/Tailwind:**

```css
/* Segmento completo */
.quest-segment--complete {
  height: 2px;
  background: #D4A853;
}

/* Segmento ativo — fire gradient */
.quest-segment--active {
  height: 2px;
  background: linear-gradient(90deg, #7f1d1d, #c2410c, #D4A853);
  background-size: 200% 100%;
  animation: fire-flow 3s ease-in-out infinite;
}

/* Segmento futuro */
.quest-segment--future {
  height: 1px;
  border-top: 1px dashed rgba(212, 168, 83, 0.3);
}

/* Dots de trilha */
.quest-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #D4A853;
}

@keyframes fire-flow {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
```

**Variantes:**

| Variante | Descricao | Uso |
|----------|-----------|-----|
| `fire` | Gradiente animado no segmento ativo | Onboarding, how-it-works |
| `linear` | Sem animacao, gold solido em tudo | Timelines estaticas, roadmap |

**Regras:**
- Minimo 2 steps, maximo 6 (alem disso, agrupar)
- Em mobile, Quest Path pode virar vertical (top → bottom)
- Dots sao opcionais — usar quando ha espaco entre Rune Circles
- Spacing entre circles: minimo 80px desktop, 48px mobile
- `prefers-reduced-motion`: desabilitar fire-flow animation

---

### 2.6 Ember Particles

| Aspecto | Definicao |
|---------|-----------|
| **Metafora RPG** | Brasas e fagulhas flutuando de uma fogueira — calor, vida, magia |
| **Onde usar** | Hero sections da LP, backgrounds ambient de marketing, loading screens fullpage |
| **Onde NAO usar** | Mobile (performance), UI funcional (combat, compendium), qualquer area com texto denso |

**Especificacao das particulas:**

| Propriedade | Valor | Racional |
|-------------|-------|----------|
| Contagem max | 15 | Mais que isso impacta performance e distrai |
| Tamanho | 2-6px | Sutil, nao domina |
| Cor | `#D4A853` a `#c2410c` | Gradiente gold→fogo |
| Opacity range | 0.1 — 0.4 | Nunca opaco — sao brasas, nao botoes |
| Velocidade | 0.5-2px/frame (30fps) | Lento, flutuante, organico |
| Direcao | Predominante ascendente | Brasas sobem (fisica) |
| Blur | 0.5-1.5px | Simula profundidade de campo |
| Lifecycle | Fade in 1s → live 3-8s → fade out 1s | Nascem e morrem suavemente |

**Implementacao recomendada:**

```css
/* CSS-only (preferido para <= 8 particulas) */
@keyframes ember-float {
  0% {
    transform: translateY(0) translateX(0) scale(1);
    opacity: 0;
  }
  10% {
    opacity: 0.3;
  }
  90% {
    opacity: 0.3;
  }
  100% {
    transform: translateY(-200px) translateX(30px) scale(0.5);
    opacity: 0;
  }
}

.ember {
  position: absolute;
  width: 4px;
  height: 4px;
  background: radial-gradient(circle, #D4A853, #c2410c);
  border-radius: 50%;
  animation: ember-float 5s ease-out infinite;
  pointer-events: none;
}
```

Para > 8 particulas, usar Canvas 2D (nao WebGL — overkill).

**Regras criticas:**
- `@media (prefers-reduced-motion: reduce)` → DESABILITAR completamente
- Mobile (< 768px) → DESABILITAR completamente
- `pointer-events: none` obrigatorio — particulas nunca interferem com cliques
- Container deve ter `overflow: hidden` — particulas nao vazam
- Z-index ABAIXO do conteudo (z-index: 0 ou negativo)
- NUNCA em areas com `position: sticky` ou `fixed` (flicker)
- Performance budget: < 2ms por frame no Performance tab do DevTools

---

### 2.7 Stone Border

| Aspecto | Definicao |
|---------|-----------|
| **Metafora RPG** | Muralha de castelo, porta de dungeon, limiar entre ambientes |
| **Onde usar** | Dividers de secao (LP), bordas de tabelas comparativas, separadores de areas distintas |
| **Onde NAO usar** | Dentro de cards (muito pesado), entre items de lista, em mobile (escala mal) |

**Implementacao:**

```css
/* Stone divider horizontal */
.stone-edge {
  height: 4px;
  background:
    url('/art/textures/stone-pattern.svg') repeat-x,
    linear-gradient(90deg, transparent, #5C5A65 20%, #5C5A65 80%, transparent);
  background-blend-mode: overlay;
  opacity: 0.5;
}

/* Variante com gold accent */
.stone-edge--gold {
  background:
    url('/art/textures/stone-pattern.svg') repeat-x,
    linear-gradient(90deg, transparent, rgba(212, 168, 83, 0.3) 50%, transparent);
  background-blend-mode: overlay;
}
```

**Regras:**
- Altura fixa: 4px (desktop), 3px (mobile)
- Sempre com fade-in/fade-out lateral (transparent nas pontas)
- Pattern SVG deve ser tileable e ter no maximo 200px de largura
- Maximo 3 stone borders por pagina (senao vira castelo medieval)

---

### 2.8 Arcane Shimmer

| Aspecto | Definicao |
|---------|-----------|
| **Metafora RPG** | Magia sendo canalizada, energia arcana fluindo, encantamento ativo |
| **Onde usar** | CTAs premium, badges especiais (Pro, novo), loading states de acoes magicas, hover em items raros |
| **Onde NAO usar** | Texto funcional, elementos frequentes (fadiga visual), mais de 1 shimmer visivel |

**CSS:**

```css
@keyframes arcane-shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}

.arcane-shimmer {
  position: relative;
  overflow: hidden;
}

.arcane-shimmer::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(212, 168, 83, 0.15) 50%,
    transparent 100%
  );
  background-size: 200% 100%;
  animation: arcane-shimmer 3s ease-in-out infinite;
  pointer-events: none;
}
```

**Variantes:**

| Variante | Cor do shimmer | Velocidade | Uso |
|----------|---------------|------------|-----|
| `gold` | Gold/15 | 3s | CTAs premium, badges Pro |
| `arcane` | Blue (#5B8DEF)/15 | 4s | Features magicas, info |
| `fire` | Warm (#E8593C)/15 | 2.5s | Urgencia, timers |

**Regras:**
- `prefers-reduced-motion` → substituir por borda estatica gold
- Shimmer so aparece APOS o elemento ser visivel (IntersectionObserver)
- Nunca em elementos < 80px de largura (shimmer nao tem espaco)
- Maximo 1 shimmer visivel na viewport — se 2 competem, desabilitar o menos importante
- Duracao do ciclo: 3s minimo (mais rapido = epileptico)

---

## 3. Paleta RPG Estendida

Extensao da paleta existente do Brand Guide com cores especificas para o vocabulario RPG.

### Cores RPG

| Token | Nome | Hex | HSL | Uso primario | Relacao com Brand Guide |
|-------|------|-----|-----|-------------|------------------------|
| `rpg-fire-dark` | Fire Dark | `#7f1d1d` | `0 61% 31%` | Inicio do fire gradient, backgrounds de urgencia | Complementa `destructive` (#C43C3C) |
| `rpg-fire-mid` | Fire Mid | `#c2410c` | `17 88% 40%` | Centro do fire gradient, progresso ativo | Entre `warm` e `destructive` |
| `rpg-fire-warm` | Fire Warm | `#E8593C` | `9 79% 57%` | Ja existe como `warm` — reutilizar | = `warm` existente |
| `rpg-ember` | Ember | `#f59e0b` | `38 92% 50%` | Particulas, accent quente, warnings expressivos | Proximo a `warning` (#E89B2D) |
| `rpg-torch` | Torch Light | `#fbbf24` | `43 96% 56%` | Glow de tocha, hover intenso | Mais claro que `gold-light` |
| `rpg-parchment` | Parchment | `#2a2520` | `24 10% 15%` | Background de cards especiais | Warm variant de `surface-primary` |
| `rpg-stone` | Stone | `#1e1e2a` | `240 17% 14%` | Bordas, dividers pesados | Proximo a `surface-secondary` |

### Relacao com paleta existente

```
Paleta Brand (existente)          Paleta RPG (nova)
─────────────────────────         ────────────────────
gold (#D4A853)          ────────→ Ponto final do fire gradient
gold-light (#E8C87A)    ────────→ Torch glow mais claro
gold-dark (#B8903D)     ────────→ Rune circle borders (pressed)
warm (#E8593C)          ────────→ = rpg-fire-warm (reuso)
destructive (#C43C3C)   ────────→ Funcional, NAO e RPG
surface-primary (#13131E) ──────→ Background padrao (nao muda)
surface-secondary (#1A1A28) ────→ Proximo de rpg-stone
```

**Regra:** cores RPG sao SEMPRE opcionais e decorativas. Cores funcionais (destructive, success, warning, info) NUNCA mudam. Se uma cor RPG conflitar com uma funcional, a funcional vence.

---

## 4. Mapa de Aplicacao

### Landing Page

| Secao | Elementos RPG permitidos | Intensidade | Notas |
|-------|------------------------|-------------|-------|
| **Hero** | Ember Particles, Torch Glow (no CTA), Fire Gradient (no heading accent) | Expressiva | Maximo impacto — e o primeiro contato |
| **Features** | Rune Circles (icones), Parchment Cards, Torch Glow (hover) | Moderada | Informacional, nao distrai |
| **How It Works** | Quest Path (conectando steps), Rune Circles (numeracao) | Moderada | Metafora perfeita: e literalmente uma quest |
| **Comparison** | Stone Border (tabela), Parchment Surface (nosso card), Torch Glow (destaque) | Moderada | Diferenciar visualmente do competidor |
| **Pricing** | Arcane Shimmer (card Pro), Fire Gradient (badge beta), Parchment Card | Moderada | Premium feel sem exagero |
| **CTA Final** | Torch Glow (botao), Fire Gradient (accent), Ember Particles (se hero nao tiver) | Expressiva | Fechar com impacto |

### Combat UI

| Area | Elementos RPG permitidos | Intensidade | Notas |
|------|------------------------|-------------|-------|
| **Setup** | Rune Circles (contagem), Quest Path (steps do setup) | Sutil | Funcional primeiro |
| **Active Combat** | Torch Glow (turno ativo APENAS), Fire Gradient (HP bars*) | Sutil | *HP bars ja usam tiers — fire gradient so no container |
| **Player View** | Torch Glow (turno do player), Parchment Surface (stat summary) | Sutil | Minimalismo — jogador precisa de info rapida |

**Regra critica para Combat UI:** maximo 1 elemento RPG ativo por vez. O foco e a informacao, nao a decoracao.

### Compendium

| Area | Elementos RPG permitidos | Intensidade | Notas |
|------|------------------------|-------------|-------|
| **Search** | Nenhum | — | Deve ser rapido e limpo |
| **Stat Blocks** | Parchment Card, Stone Border (dividers) | Sutil | Evoca o Monster Manual |
| **Detail View** | Torch Glow (hover em actions), Rune Circle (CR badge) | Sutil | Funcional com toque tematico |

### Auth Pages

| Area | Elementos RPG permitidos | Intensidade | Notas |
|------|------------------------|-------------|-------|
| **Login/Register** | Fire Gradient (accent line), Torch Glow (CTA) | Sutil | Nao distrai do formulario |
| **Onboarding** | Quest Path (steps), Rune Circles, Fire Gradient | Moderada | E uma quest! Perfeito para a metafora |

### Settings

| Area | Elementos RPG permitidos | Intensidade | Notas |
|------|------------------------|-------------|-------|
| **Todas** | Nenhum | — | Settings e utilitario puro. Zero RPG. |

---

## 5. Anti-padroes

### NAO fazer — com racional

| Anti-padrao | Por que e ruim | O que fazer em vez |
|-------------|---------------|-------------------|
| Texturas pesadas que parecem Geocities | Destroi credibilidade premium. Parece 2003. | Noise SVG com opacity <= 0.05 |
| Mais de 2 elementos RPG na mesma superficie | Competicao visual, poluicao, fadiga | Escolher 1 primario + 1 secundario max |
| Fire gradient em texto | Falha WCAG, ilegivel em tamanhos pequenos | Usar como accent line, bar, ou background |
| Ember particles em mobile | Drena bateria, consome CPU, distrai em tela pequena | Desabilitar completamente < 768px |
| Ignorar `prefers-reduced-motion` | Acessibilidade nao e opcional. Pode causar nausea. | Toda animacao RPG DEVE ter fallback estatico |
| Torch Glow em mais de 2 elementos simultaneos | Perde significado — se tudo brilha, nada brilha | Glow so no elemento mais importante |
| Rune Circle abaixo de 24px | Perde detalhe, vira circulo generico | Usar dot/badge simples em tamanhos < 24px |
| Stone Border dentro de cards | Muito pesado para espacos confinados | Usar `border-border` padrao do design system |
| Arcane Shimmer em multiplos elementos visiveis | Compete por atencao, parece amador | Maximo 1 shimmer visivel na viewport |
| Parchment Surface no background inteiro | Tela inteira marrom = sufocante | Usar apenas em cards isolados e destaques |
| Animacoes RPG com duracao < 2s | Rapido demais = ansiedade, nao magia | Minimo 2s para shimmer, 3s para particles |
| Usar RPG elements em error states | Erro deve ser funcional e claro, nao tematico | Manter error states com destructive red padrao |

### Checklist antes de adicionar elemento RPG

- [ ] Tem proposito funcional ou e puramente decorativo?
- [ ] Ja tem outro elemento RPG nessa superficie?
- [ ] Funciona sem animacao (reduced motion)?
- [ ] Nao conflita com cor funcional (destructive, success, etc)?
- [ ] Nao atrapalha leitura de texto?
- [ ] Funciona em mobile? (se nao, tem fallback?)
- [ ] O usuario nota se remover? (se nao, talvez nao precise)

---

## Apendice: Glossario Rapido

| Termo | Significado no Pocket DM |
|-------|-------------------------|
| **Superficie** | Qualquer area retangular da UI (card, section, modal, page) |
| **Intensidade** | Quanto o RPG se manifesta: sutil (quase invisivel), moderada (perceptivel), expressiva (impactante) |
| **Elemento funcional** | Qualquer coisa que o usuario precisa ler, clicar, ou entender (botoes, texto, inputs) |
| **Elemento decorativo** | Qualquer coisa que cria atmosfera sem ser essencial (glow, particles, textures) |
| **Fallback estatico** | Versao sem animacao de um elemento RPG — para `prefers-reduced-motion` |

---

*Documento criado em 2026-03-27 por Sally (UX Designer). Para duvidas de implementacao, ver `docs/rpg-visual-architecture.md`.*
