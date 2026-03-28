# Pocket DM — Arquitetura Visual RPG

**Data:** 2026-03-27
**Autor:** Winston (Architect), baseado na spec de Sally (UX)
**Status:** Aprovado — pronto para implementacao
**Referencia UX:** `docs/rpg-visual-language-spec.md`

---

## 1. Estrutura de Arquivos

```
lib/design/
  rpg-tokens.ts              — constantes: gradientes, shadows, cores RPG
  rpg-animations.ts          — keyframes e animation configs para Tailwind/CSS

components/ui/rpg/
  TorchGlow.tsx              — wrapper que adiciona glow de tocha ao children
  FireGradient.tsx            — div/span com gradiente fogo (horizontal, vertical, radial)
  RuneCircle.tsx              — circulo ornamental numerado (steps, badges, loading)
  QuestPath.tsx               — timeline/connector tematico com RuneCircles
  ParchmentCard.tsx           — card com textura de pergaminho sutil
  EmberParticles.tsx          — particulas ambient (CSS-only, canvas opcional)
  StoneEdge.tsx               — divider/border com textura de pedra
  ArcaneShimmer.tsx           — overlay de brilho passando (shimmer effect)

public/art/textures/
  parchment-noise.svg         — noise texture para ParchmentCard (tileable)
  stone-pattern.svg           — pattern repetivel para StoneEdge (tileable, 200px wide)
```

### Convencoes

- Todos os componentes RPG vivem em `components/ui/rpg/` — separados dos componentes base de `components/ui/`
- Tokens e animacoes vivem em `lib/design/` — nao em arquivos CSS globais
- Textures sao SVG, nunca PNG/JPG (escalabilidade, tamanho)
- Cada componente exporta seu tipo de props (ex: `TorchGlowProps`)
- Componentes RPG sao puramente visuais — zero logica de negocio, zero state management
- Todos suportam `className` prop para composicao com Tailwind

---

## 2. API dos Componentes

### 2.1 TorchGlow

Wrapper que adiciona box-shadow de tocha ao seu children. Pode ser aplicado a qualquer elemento.

```typescript
interface TorchGlowProps {
  /** Intensidade do glow */
  intensity?: "low" | "medium" | "high";
  /** Cor base do glow. Default: "gold" */
  color?: "gold" | "warm" | "arcane";
  /** Conteudo que recebe o glow */
  children: React.ReactNode;
  /** Classes adicionais para o wrapper */
  className?: string;
}
```

**Comportamento:**
- Renderiza um `<div>` wrapper com box-shadow aplicado
- Transicao: `transition: box-shadow 300ms ease-out`
- Se `prefers-reduced-motion`, glow e estatico (sem transicao)
- Wrapper herda layout do parent — usa `display: contents` como fallback ou aceita className para controle

**Mapeamento intensity → shadow:**

| Intensity | Gold | Warm | Arcane |
|-----------|------|------|--------|
| `low` | `0 0 15px rgba(212,168,83,0.15), 0 0 40px rgba(212,168,83,0.05)` | `0 0 15px rgba(232,89,60,0.15), 0 0 40px rgba(232,89,60,0.05)` | `0 0 15px rgba(91,141,239,0.15), 0 0 40px rgba(91,141,239,0.05)` |
| `medium` | `0 0 15px rgba(212,168,83,0.3), 0 0 40px rgba(212,168,83,0.1)` | `0 0 15px rgba(232,89,60,0.3), 0 0 40px rgba(232,89,60,0.1)` | `0 0 15px rgba(91,141,239,0.3), 0 0 40px rgba(91,141,239,0.1)` |
| `high` | `0 0 20px rgba(212,168,83,0.4), 0 0 60px rgba(212,168,83,0.15)` | `0 0 20px rgba(232,89,60,0.4), 0 0 60px rgba(232,89,60,0.15)` | `0 0 20px rgba(91,141,239,0.4), 0 0 60px rgba(91,141,239,0.15)` |

**Exemplo de uso:**

```tsx
<TorchGlow intensity="medium" color="gold">
  <Button>Comecar Aventura</Button>
</TorchGlow>
```

---

### 2.2 FireGradient

Container com gradiente fogo. Pode ser usado como background decorativo ou como wrapper visual.

```typescript
interface FireGradientProps {
  /** Direcao do gradiente */
  direction?: "horizontal" | "vertical" | "radial";
  /** Intensidade (opacity geral). Default: 1 */
  intensity?: number;
  /** Classes adicionais */
  className?: string;
  /** Conteudo dentro do gradiente */
  children?: React.ReactNode;
}
```

**Comportamento:**
- Renderiza um `<div>` com `background` aplicado via inline style
- `direction: "horizontal"` → `linear-gradient(90deg, ...)`
- `direction: "vertical"` → `linear-gradient(180deg, ...)`
- `direction: "radial"` → `radial-gradient(circle, ...)`
- `intensity` controla `opacity` do container (0-1, default 1)
- Cores fixas: `#7f1d1d → #c2410c → #D4A853`

**Exemplo de uso:**

```tsx
{/* Barra decorativa */}
<FireGradient direction="horizontal" className="h-1 w-full rounded-full" />

{/* Background de secao */}
<FireGradient direction="radial" intensity={0.15} className="absolute inset-0">
  <div className="relative z-10">
    <h2>Conteudo sobre o gradiente</h2>
  </div>
</FireGradient>
```

---

### 2.3 RuneCircle

Circulo ornamental com numero, icone ou check. Usado em step indicators e badges.

```typescript
interface RuneCircleProps {
  /** Numero ou conteudo exibido no centro */
  step: number;
  /** Total de steps (para contexto de acessibilidade) */
  total?: number;
  /** Tamanho do circulo */
  size?: "sm" | "md" | "lg";
  /** Variante visual */
  variant?: "fire" | "gold" | "arcane";
  /** Estado do step */
  state?: "active" | "complete" | "future";
  /** Classes adicionais */
  className?: string;
}
```

**Comportamento:**
- Renderiza `<div role="listitem">` com `aria-label="Step {step} de {total}"`
- Se `state: "complete"`, exibe check icon em vez do numero
- Se `state: "active"`, aplica Torch Glow + rune-pulse animation
- Se `state: "future"`, opacity reduzido (0.3)
- Fonte do numero: Cinzel (`font-display`)
- Variante `fire`: ring border usa fire gradient (animado via `background-image` no border)
- Variante `gold`: ring border gold solido
- Variante `arcane`: ring border cool blue (#5B8DEF)

**Mapeamento size → dimensoes:**

| Size | Width/Height | Font Size | Border Width |
|------|-------------|-----------|-------------|
| `sm` | 32px | 14px | 1.5px |
| `md` | 48px | 18px | 2px |
| `lg` | 64px | 24px | 2.5px |

**Exemplo de uso:**

```tsx
<div className="flex items-center gap-4">
  <RuneCircle step={1} total={3} state="complete" variant="gold" />
  <RuneCircle step={2} total={3} state="active" variant="fire" />
  <RuneCircle step={3} total={3} state="future" variant="gold" />
</div>
```

---

### 2.4 QuestPath

Timeline tematica que conecta RuneCircles. Combina steps + segmentos conectores.

```typescript
interface QuestStep {
  label: string;
  description?: string;
}

interface QuestPathProps {
  /** Lista de steps da quest */
  steps: QuestStep[];
  /** Indice do step atual (0-based) */
  currentStep: number;
  /** Variante visual dos segmentos */
  variant?: "fire" | "linear";
  /** Orientacao. Default: "horizontal" */
  orientation?: "horizontal" | "vertical";
  /** Classes adicionais */
  className?: string;
}
```

**Comportamento:**
- Renderiza `<nav role="navigation" aria-label="Progresso">` com `<ol role="list">`
- Para cada step: `<RuneCircle>` + label + segmento conector (exceto o ultimo)
- Steps antes de `currentStep` → state `complete`, segmento solido gold
- Step no `currentStep` → state `active`, segmento com fire gradient animado
- Steps apos `currentStep` → state `future`, segmento tracejado gold/30
- `variant: "fire"` → segmento ativo com `fire-flow` animation
- `variant: "linear"` → todos os segmentos solidos, sem animacao
- `orientation: "vertical"` → flex-col, segmentos verticais (para mobile)
- `prefers-reduced-motion` → fire animation desabilitada, fallback para gold solido

**Exemplo de uso:**

```tsx
<QuestPath
  steps={[
    { label: "Crie a sessao", description: "Nomeie sua aventura" },
    { label: "Adicione combatentes", description: "PCs e monstros" },
    { label: "Role iniciativa", description: "A batalha comeca" },
  ]}
  currentStep={1}
  variant="fire"
/>
```

---

### 2.5 ParchmentCard

Card com textura de pergaminho. Extends do card base com overlay visual.

```typescript
interface ParchmentCardProps {
  /** Intensidade da textura */
  intensity?: "subtle" | "standard" | "expressive";
  /** Conteudo do card */
  children: React.ReactNode;
  /** Classes adicionais */
  className?: string;
}
```

**Comportamento:**
- Renderiza `<div>` com background-color warm + noise SVG overlay via pseudo-element `::before`
- Overlay usa `background-image: url('/art/textures/parchment-noise.svg')` com `mix-blend-mode: overlay`
- Border sutil gold (opacity varia por intensidade)
- `pointer-events: none` no pseudo-element overlay

**Mapeamento intensity:**

| Intensity | Background | Noise Opacity | Border Gold Opacity |
|-----------|-----------|---------------|---------------------|
| `subtle` | `#1e1c1a` | 0.02 | 0.08 |
| `standard` | `#2a2520` | 0.03 | 0.12 |
| `expressive` | `#332e28` | 0.05 | 0.18 |

**Exemplo de uso:**

```tsx
<ParchmentCard intensity="standard" className="p-6">
  <h3 className="font-display text-gold">Stat Block</h3>
  <p className="text-muted-foreground">Monster details aqui...</p>
</ParchmentCard>
```

---

### 2.6 EmberParticles

Particulas flutuantes ambient. CSS-only por padrao, com opcao de Canvas para maior contagem.

```typescript
interface EmberParticlesProps {
  /** Numero de particulas (max 15) */
  count?: number;
  /** Intensidade visual (afeta opacity e tamanho) */
  intensity?: "low" | "medium" | "high";
  /** Classes adicionais para o container */
  className?: string;
}
```

**Comportamento:**
- Renderiza `<div>` container com `position: relative; overflow: hidden`
- Gera `count` elementos `<span>` com positions, delays e durations aleatorias (determinadas via seed no mount, nao a cada render)
- Cada particula: `position: absolute`, `pointer-events: none`, `border-radius: 50%`
- Cor: radial gradient de `#D4A853` a `#c2410c`
- Animation: `ember-float` keyframe (ascendente + leve drift horizontal)
- `count` eh clamped a `Math.min(count, 15)` — nunca mais de 15
- Se `prefers-reduced-motion` → NAO renderiza nada (return null)
- Se viewport < 768px → NAO renderiza nada (return null) — usar media query hook
- Z-index: 0 — content children devem ter `position: relative; z-index: 1`

**Mapeamento intensity:**

| Intensity | Opacity range | Size range | Speed |
|-----------|-------------|------------|-------|
| `low` | 0.1 — 0.2 | 2-4px | 6-10s |
| `medium` | 0.15 — 0.3 | 3-5px | 5-8s |
| `high` | 0.2 — 0.4 | 3-6px | 4-7s |

**Exemplo de uso:**

```tsx
<section className="relative">
  <EmberParticles count={10} intensity="medium" className="absolute inset-0" />
  <div className="relative z-10">
    <h1>Hero Content</h1>
  </div>
</section>
```

---

### 2.7 StoneEdge

Divider horizontal com textura de pedra.

```typescript
interface StoneEdgeProps {
  /** Variante visual */
  variant?: "neutral" | "gold";
  /** Classes adicionais */
  className?: string;
}
```

**Comportamento:**
- Renderiza `<hr>` estilizado com `aria-hidden="true"`
- Background composto: stone-pattern.svg repeat-x + gradient fade nas pontas
- `variant: "neutral"` → gradient cinza (`#5C5A65`)
- `variant: "gold"` → gradient gold (`rgba(212,168,83,0.3)`)
- Altura: 4px desktop, 3px mobile
- Largura: 100% do parent com `max-width` opcional via className

**Exemplo de uso:**

```tsx
<StoneEdge variant="gold" className="my-16 max-w-4xl mx-auto" />
```

---

### 2.8 ArcaneShimmer

Overlay de brilho que passa pelo elemento. Usado em CTAs premium e badges.

```typescript
interface ArcaneShimmerProps {
  /** Cor do shimmer */
  variant?: "gold" | "arcane" | "fire";
  /** Conteudo que recebe o shimmer */
  children: React.ReactNode;
  /** Classes adicionais */
  className?: string;
}
```

**Comportamento:**
- Renderiza `<div>` wrapper com `position: relative; overflow: hidden`
- Pseudo-element `::after` com gradient shimmer animado
- Animation: `arcane-shimmer` keyframe — sweep horizontal infinito
- `pointer-events: none` no pseudo-element
- Triggered via IntersectionObserver — so anima quando visivel
- `prefers-reduced-motion` → borda gold estatica em vez de shimmer

**Mapeamento variant → timing:**

| Variant | Cor (rgba) | Duracao do ciclo |
|---------|-----------|-----------------|
| `gold` | `rgba(212,168,83,0.15)` | 3s |
| `arcane` | `rgba(91,141,239,0.15)` | 4s |
| `fire` | `rgba(232,89,60,0.15)` | 2.5s |

**Exemplo de uso:**

```tsx
<ArcaneShimmer variant="gold">
  <Badge className="bg-gold/20 text-gold">Pro</Badge>
</ArcaneShimmer>
```

---

## 3. Tokens de Design — `lib/design/rpg-tokens.ts`

```typescript
// ─── Cores RPG ───────────────────────────────────────────────
export const RPG_COLORS = {
  fire: {
    dark: "#7f1d1d",
    mid: "#c2410c",
    warm: "#E8593C",
  },
  ember: "#f59e0b",
  torch: "#fbbf24",
  parchment: "#2a2520",
  stone: "#1e1e2a",
} as const;

// ─── Gradientes ──────────────────────────────────────────────
export const RPG_GRADIENTS = {
  fire: {
    horizontal: "linear-gradient(90deg, #7f1d1d, #c2410c, #D4A853)",
    vertical: "linear-gradient(180deg, #D4A853, #c2410c, #7f1d1d)",
    radial: "radial-gradient(circle, #c2410c 0%, #7f1d1d 50%, transparent 80%)",
  },
  gold: {
    horizontal: "linear-gradient(90deg, transparent, #D4A853, transparent)",
    radial: "radial-gradient(circle, rgba(212,168,83,0.2) 0%, transparent 70%)",
  },
} as const;

// ─── Shadows (Torch Glow) ───────────────────────────────────
export const RPG_SHADOWS = {
  torch: {
    gold: {
      low: "0 0 15px rgba(212,168,83,0.15), 0 0 40px rgba(212,168,83,0.05)",
      medium: "0 0 15px rgba(212,168,83,0.3), 0 0 40px rgba(212,168,83,0.1)",
      high: "0 0 20px rgba(212,168,83,0.4), 0 0 60px rgba(212,168,83,0.15)",
    },
    warm: {
      low: "0 0 15px rgba(232,89,60,0.15), 0 0 40px rgba(232,89,60,0.05)",
      medium: "0 0 15px rgba(232,89,60,0.3), 0 0 40px rgba(232,89,60,0.1)",
      high: "0 0 20px rgba(232,89,60,0.4), 0 0 60px rgba(232,89,60,0.15)",
    },
    arcane: {
      low: "0 0 15px rgba(91,141,239,0.15), 0 0 40px rgba(91,141,239,0.05)",
      medium: "0 0 15px rgba(91,141,239,0.3), 0 0 40px rgba(91,141,239,0.1)",
      high: "0 0 20px rgba(91,141,239,0.4), 0 0 60px rgba(91,141,239,0.15)",
    },
  },
} as const;

// ─── Parchment ──────────────────────────────────────────────
export const RPG_PARCHMENT = {
  subtle: { bg: "#1e1c1a", noiseOpacity: 0.02, borderOpacity: 0.08 },
  standard: { bg: "#2a2520", noiseOpacity: 0.03, borderOpacity: 0.12 },
  expressive: { bg: "#332e28", noiseOpacity: 0.05, borderOpacity: 0.18 },
} as const;

// ─── Sizes (RuneCircle) ─────────────────────────────────────
export const RPG_RUNE_SIZES = {
  sm: { size: 32, fontSize: 14, borderWidth: 1.5 },
  md: { size: 48, fontSize: 18, borderWidth: 2 },
  lg: { size: 64, fontSize: 24, borderWidth: 2.5 },
} as const;

// ─── Ember Particles ────────────────────────────────────────
export const RPG_EMBER = {
  maxCount: 15,
  intensity: {
    low: { opacityMin: 0.1, opacityMax: 0.2, sizeMin: 2, sizeMax: 4, durationMin: 6, durationMax: 10 },
    medium: { opacityMin: 0.15, opacityMax: 0.3, sizeMin: 3, sizeMax: 5, durationMin: 5, durationMax: 8 },
    high: { opacityMin: 0.2, opacityMax: 0.4, sizeMin: 3, sizeMax: 6, durationMin: 4, durationMax: 7 },
  },
} as const;
```

---

## 4. Animacoes — `lib/design/rpg-animations.ts`

```typescript
/**
 * Keyframes para uso no tailwind.config.ts e nos componentes RPG.
 * Importar no tailwind config via: extend.keyframes
 */
export const RPG_KEYFRAMES = {
  "ember-float": {
    "0%": {
      transform: "translateY(0) translateX(0) scale(1)",
      opacity: "0",
    },
    "10%": {
      opacity: "var(--ember-opacity, 0.3)",
    },
    "90%": {
      opacity: "var(--ember-opacity, 0.3)",
    },
    "100%": {
      transform: "translateY(-200px) translateX(30px) scale(0.5)",
      opacity: "0",
    },
  },

  "torch-flicker": {
    "0%, 100%": {
      boxShadow: "var(--torch-shadow-base)",
    },
    "50%": {
      boxShadow: "var(--torch-shadow-peak)",
    },
  },

  "rune-pulse": {
    "0%, 100%": {
      boxShadow: "0 0 8px rgba(212,168,83,0.2)",
    },
    "50%": {
      boxShadow: "0 0 16px rgba(212,168,83,0.4)",
    },
  },

  "fire-flow": {
    "0%": {
      backgroundPosition: "0% 50%",
    },
    "50%": {
      backgroundPosition: "100% 50%",
    },
    "100%": {
      backgroundPosition: "0% 50%",
    },
  },

  "arcane-shimmer": {
    "0%": {
      backgroundPosition: "-200% 0",
    },
    "100%": {
      backgroundPosition: "200% 0",
    },
  },
} as const;

export const RPG_ANIMATIONS = {
  "ember-float": "ember-float 6s ease-out infinite",
  "torch-flicker": "torch-flicker 3s ease-in-out infinite",
  "rune-pulse": "rune-pulse 2s ease-in-out infinite",
  "fire-flow": "fire-flow 3s ease-in-out infinite",
  "arcane-shimmer": "arcane-shimmer 3s ease-in-out infinite",
} as const;
```

---

## 5. Extensoes do Tailwind

Adicoes propostas ao `tailwind.config.ts` existente. Todas ficam sob `theme.extend`.

### 5.1 Cores RPG (namespace `rpg`)

```typescript
// Dentro de theme.extend.colors
rpg: {
  fire: {
    dark: "#7f1d1d",
    mid: "#c2410c",
    warm: "#E8593C",   // = warm existente, alias para consistencia
  },
  ember: "#f59e0b",
  torch: "#fbbf24",
  parchment: "#2a2520",
  stone: "#1e1e2a",
},
```

**Uso:** `bg-rpg-fire-dark`, `text-rpg-ember`, `border-rpg-parchment`, etc.

### 5.2 Keyframes e Animations

```typescript
// Dentro de theme.extend.keyframes
"ember-float": {
  "0%": { transform: "translateY(0) translateX(0) scale(1)", opacity: "0" },
  "10%": { opacity: "0.3" },
  "90%": { opacity: "0.3" },
  "100%": { transform: "translateY(-200px) translateX(30px) scale(0.5)", opacity: "0" },
},
"torch-flicker": {
  "0%, 100%": { boxShadow: "0 0 15px rgba(212,168,83,0.3)" },
  "50%": { boxShadow: "0 0 20px rgba(212,168,83,0.4)" },
},
"rune-pulse": {
  "0%, 100%": { boxShadow: "0 0 8px rgba(212,168,83,0.2)" },
  "50%": { boxShadow: "0 0 16px rgba(212,168,83,0.4)" },
},
"fire-flow": {
  "0%": { backgroundPosition: "0% 50%" },
  "50%": { backgroundPosition: "100% 50%" },
  "100%": { backgroundPosition: "0% 50%" },
},
"arcane-shimmer": {
  "0%": { backgroundPosition: "-200% 0" },
  "100%": { backgroundPosition: "200% 0" },
},

// Dentro de theme.extend.animation
"ember-float": "ember-float 6s ease-out infinite",
"torch-flicker": "torch-flicker 3s ease-in-out infinite",
"rune-pulse": "rune-pulse 2s ease-in-out infinite",
"fire-flow": "fire-flow 3s ease-in-out infinite",
"arcane-shimmer": "arcane-shimmer 3s ease-in-out infinite",
```

**Uso:** `animate-ember-float`, `animate-torch-flicker`, `animate-rune-pulse`, etc.

### 5.3 Box Shadows adicionais

```typescript
// Dentro de theme.extend.boxShadow (complementa gold-glow e gold-glow-lg existentes)
"torch": "0 0 15px rgba(212,168,83,0.3), 0 0 40px rgba(212,168,83,0.1)",
"torch-lg": "0 0 20px rgba(212,168,83,0.4), 0 0 60px rgba(212,168,83,0.15)",
"torch-warm": "0 0 15px rgba(232,89,60,0.3), 0 0 40px rgba(232,89,60,0.1)",
"torch-arcane": "0 0 15px rgba(91,141,239,0.3), 0 0 40px rgba(91,141,239,0.1)",
```

**Uso:** `shadow-torch`, `shadow-torch-lg`, `shadow-torch-warm`, `shadow-torch-arcane`

### 5.4 Tailwind Config Completo (diff)

Abaixo, o diff exato do que adicionar ao `tailwind.config.ts` atual:

```diff
  theme: {
    extend: {
      // ... (existente: fontFamily, colors, borderRadius, boxShadow, transitionTimingFunction)

      colors: {
        // ... (tudo existente permanece)
+       rpg: {
+         fire: {
+           dark: "#7f1d1d",
+           mid: "#c2410c",
+           warm: "#E8593C",
+         },
+         ember: "#f59e0b",
+         torch: "#fbbf24",
+         parchment: "#2a2520",
+         stone: "#1e1e2a",
+       },
      },

      boxShadow: {
        card: "0 4px 32px rgba(0, 0, 0, 0.4)",
        "gold-glow": "0 0 15px rgba(212, 168, 83, 0.4)",
        "gold-glow-lg": "0 0 25px rgba(212, 168, 83, 0.5)",
+       "torch": "0 0 15px rgba(212,168,83,0.3), 0 0 40px rgba(212,168,83,0.1)",
+       "torch-lg": "0 0 20px rgba(212,168,83,0.4), 0 0 60px rgba(212,168,83,0.15)",
+       "torch-warm": "0 0 15px rgba(232,89,60,0.3), 0 0 40px rgba(232,89,60,0.1)",
+       "torch-arcane": "0 0 15px rgba(91,141,239,0.3), 0 0 40px rgba(91,141,239,0.1)",
      },

+     keyframes: {
+       "ember-float": {
+         "0%": { transform: "translateY(0) translateX(0) scale(1)", opacity: "0" },
+         "10%": { opacity: "0.3" },
+         "90%": { opacity: "0.3" },
+         "100%": { transform: "translateY(-200px) translateX(30px) scale(0.5)", opacity: "0" },
+       },
+       "torch-flicker": {
+         "0%, 100%": { boxShadow: "0 0 15px rgba(212,168,83,0.3)" },
+         "50%": { boxShadow: "0 0 20px rgba(212,168,83,0.4)" },
+       },
+       "rune-pulse": {
+         "0%, 100%": { boxShadow: "0 0 8px rgba(212,168,83,0.2)" },
+         "50%": { boxShadow: "0 0 16px rgba(212,168,83,0.4)" },
+       },
+       "fire-flow": {
+         "0%": { backgroundPosition: "0% 50%" },
+         "50%": { backgroundPosition: "100% 50%" },
+         "100%": { backgroundPosition: "0% 50%" },
+       },
+       "arcane-shimmer": {
+         "0%": { backgroundPosition: "-200% 0" },
+         "100%": { backgroundPosition: "200% 0" },
+       },
+     },
+
+     animation: {
+       "ember-float": "ember-float 6s ease-out infinite",
+       "torch-flicker": "torch-flicker 3s ease-in-out infinite",
+       "rune-pulse": "rune-pulse 2s ease-in-out infinite",
+       "fire-flow": "fire-flow 3s ease-in-out infinite",
+       "arcane-shimmer": "arcane-shimmer 3s ease-in-out infinite",
+     },
    },
  },
```

---

## 6. Padrao de Integracao

### Antes vs Depois

```tsx
// ❌ ANTES — ad-hoc, sem consistencia, impossivel manter
<div
  style={{
    background: "linear-gradient(90deg, #7f1d1d, #c2410c, #D4A853)",
    boxShadow: "0 0 15px rgba(212,168,83,0.3)",
  }}
  className="rounded-lg p-4"
>
  <div
    style={{
      width: 48,
      height: 48,
      borderRadius: "50%",
      border: "2px solid #D4A853",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}
  >
    1
  </div>
  <span>Passo um</span>
</div>
```

```tsx
// ✅ DEPOIS — componentes compostos, tokens centralizados
<TorchGlow intensity="medium">
  <FireGradient direction="horizontal" className="rounded-lg p-4">
    <RuneCircle step={1} total={4} state="active" variant="fire" size="md" />
    <span>Passo um</span>
  </FireGradient>
</TorchGlow>
```

### Composicao de componentes

Os componentes RPG sao componiveis — cada um faz uma coisa, e podem ser aninhados:

```tsx
{/* Timeline completa de onboarding */}
<section className="relative py-24">
  {/* Particulas ambient no background */}
  <EmberParticles count={8} intensity="low" className="absolute inset-0" />

  {/* Conteudo sobre as particulas */}
  <div className="relative z-10 max-w-4xl mx-auto">
    <h2 className="font-display text-gold text-3xl text-center mb-12">
      Como funciona
    </h2>

    {/* Quest Path com steps */}
    <QuestPath
      steps={[
        { label: "Crie a sessao", description: "De um nome a sua aventura" },
        { label: "Adicione combatentes", description: "PCs, NPCs e monstros" },
        { label: "Role iniciativa", description: "O sistema ordena automaticamente" },
        { label: "Gerencie o combate", description: "HP, condicoes, turnos" },
      ]}
      currentStep={1}
      variant="fire"
    />
  </div>

  {/* Divider de pedra antes da proxima secao */}
  <StoneEdge variant="gold" className="mt-24" />
</section>
```

### Uso com Tailwind utilities

Componentes RPG aceitam `className` para composicao direta com Tailwind:

```tsx
{/* Spacing, sizing, positioning via Tailwind */}
<ParchmentCard intensity="standard" className="p-8 max-w-lg mx-auto mt-12">
  <ArcaneShimmer variant="gold">
    <span className="font-display text-gold text-sm uppercase tracking-wider">
      Pro
    </span>
  </ArcaneShimmer>
</ParchmentCard>

{/* Usando Tailwind RPG utilities diretamente (sem componente) */}
<div className="bg-rpg-fire-dark shadow-torch animate-torch-flicker rounded-lg">
  Conteudo com glow
</div>
```

### Decisao: Componente vs Utility Class

| Usar componente quando... | Usar utility class quando... |
|--------------------------|------------------------------|
| Precisa de logica (state, reduced motion, responsive) | E puramente visual e estatico |
| Tem pseudo-elements (shimmer, parchment overlay) | E uma cor ou shadow simples |
| Precisa de acessibilidade (aria-labels, roles) | E um override pontual |
| Vai ser reutilizado em 3+ lugares | E unico e ad-hoc |

**Exemplos:**

```tsx
// RuneCircle = componente (tem logica de state, a11y, sizing)
<RuneCircle step={2} total={5} state="active" variant="fire" />

// Cor de fogo = utility class (so cor)
<div className="bg-rpg-fire-dark">...</div>

// Torch shadow = utility class (so shadow)
<button className="shadow-torch hover:shadow-torch-lg">...</button>

// Shimmer = componente (pseudo-element + IntersectionObserver)
<ArcaneShimmer variant="gold">Badge</ArcaneShimmer>
```

---

## 7. Performance e Acessibilidade

### Performance Budget

| Componente | CPU Budget (por frame) | Regras |
|-----------|----------------------|--------|
| EmberParticles | < 2ms | Max 15 particulas, CSS-only preferido |
| ArcaneShimmer | < 1ms | Max 1 visivel, `will-change: background-position` |
| TorchGlow | Negligivel | Apenas box-shadow, GPU-accelerated |
| FireGradient | Negligivel | Apenas background, estatico |
| QuestPath (fire variant) | < 1ms | `will-change: background-position` no segmento ativo |

### Acessibilidade

| Regra | Implementacao |
|-------|---------------|
| `prefers-reduced-motion` | Todas as animacoes respeitam. EmberParticles retorna null. |
| Contraste | Cores RPG sao decorativas — texto funcional usa paleta de texto existente |
| Screen readers | RuneCircle e QuestPath tem aria-labels. Elementos decorativos tem `aria-hidden="true"` |
| Focus indicators | Nunca substituir focus ring padrao por torch glow — glow e ADICIONAL |
| pointer-events | Overlays (shimmer, ember, parchment noise) SEMPRE com `pointer-events: none` |

### Media Queries

```css
/* Ember particles — desabilitar em mobile */
@media (max-width: 767px) {
  .ember-container { display: none; }
}

/* Reduced motion — desabilitar todas as animacoes RPG */
@media (prefers-reduced-motion: reduce) {
  .animate-ember-float,
  .animate-torch-flicker,
  .animate-rune-pulse,
  .animate-fire-flow,
  .animate-arcane-shimmer {
    animation: none !important;
  }
}
```

---

## 8. Dependencias

### Nenhuma dependencia nova necessaria

Todos os componentes propostos usam tecnologias ja presentes no stack:

| Tecnologia | Ja no projeto? | Uso RPG |
|-----------|---------------|---------|
| React 19 | Sim | Componentes |
| Tailwind CSS | Sim | Utilities, tokens |
| tailwindcss-animate | Sim | Keyframes base |
| CSS animations/keyframes | Nativo | Ember, shimmer, pulse |
| SVG | Nativo | Textures (parchment, stone) |
| IntersectionObserver | Nativo | Trigger de shimmer animation |
| CSS `prefers-reduced-motion` | Nativo | Acessibilidade |

**Zero novas dependencias de npm.** Tudo e CSS nativo + React + Tailwind.

---

## 9. Ordem de Implementacao Sugerida

Sprint minimo para ter a linguagem visual funcional:

| # | Componente | Esforco | Depende de | Racional |
|---|-----------|---------|------------|----------|
| 1 | `rpg-tokens.ts` | P | — | Fundacao: cores, shadows, gradientes |
| 2 | `rpg-animations.ts` + tailwind config | P | #1 | Keyframes para todos os componentes |
| 3 | `FireGradient` | P | #1 | Componente mais simples, usado por muitos |
| 4 | `TorchGlow` | P | #1 | Segundo mais simples, alta reutilizacao |
| 5 | `RuneCircle` | M | #1, #2 | Precisa de tokens + rune-pulse animation |
| 6 | `QuestPath` | M | #3, #5 | Compoe FireGradient + RuneCircle |
| 7 | `ParchmentCard` | M | #1, textures | Precisa de SVG texture pronta |
| 8 | `StoneEdge` | P | #1, textures | Simples mas precisa de SVG texture |
| 9 | `ArcaneShimmer` | M | #2 | Precisa de keyframe + IntersectionObserver |
| 10 | `EmberParticles` | G | #2 | Mais complexo: particulas, lifecycle, responsive |

**P** = Pequeno (~1-2h), **M** = Medio (~2-4h), **G** = Grande (~4-6h)

**Total estimado:** ~20-30h de implementacao para todos os 10 items.

---

*Documento criado em 2026-03-27 por Winston (Architect). UX spec de referencia: `docs/rpg-visual-language-spec.md`.*
