# Campaign HQ Redesign — Design Tokens Spec (v1.0, 2026-04-22)

**Autores:** UX + Architect
**Source of truth:** `redesign-proposal.md` v0.2 (decisões §13)
**Estado atual:** `app/globals.css` + `tailwind.config.ts`
**Escopo:** tokens de cor, tipografia, spacing, radii, shadows, motion, breakpoints, z-index para o novo shell Campaign HQ + Player HQ.

> **Regra de leitura:** tokens em **verde** já existem e NÃO devem ser renomeados. Tokens em **roxo** são novos e precisam ser adicionados. Dev deve referenciar tokens **sempre pelo nome** (ex: `bg-card`), nunca pelo valor hex.

---

## 1. Cores

### 1.1 Backgrounds

Dark theme com 4 níveis de profundidade. Regra: quanto mais afundado na hierarquia, mais claro fica o background (contra-intuitivo, mas é o padrão de app escuro moderno — Discord, Linear, Notion dark).

| Token Tailwind | HSL | Hex | RGB | Uso |
|---|---|---|---|---|
| `bg-background` | `hsl(233 26% 10%)` | `#13131E` | `rgb(19, 19, 30)` | Page body, topbar, sidebar externa, layout root |
| `bg-surface-secondary` | — | `#1A1A28` | `rgb(26, 26, 40)` | Painéis de sidebar contextual, drawer mobile, segundo nível |
| `bg-card` | `hsl(233 22% 13%)` | `#1E1E2B` (aprox) | `rgb(30, 30, 43)` | Cards padrão (ChecklistItem, InitiativeRow, ActivityItem) |
| `bg-surface-tertiary` | — | `#222234` | `rgb(34, 34, 52)` | Cards elevados (hero sessão ativa), inputs, nested surfaces |
| `bg-surface-deep` | — | `#0e0e18` | `rgb(14, 14, 24)` | Áreas de scroll (compendium list, chat log), "afundado" |
| `bg-surface-overlay` | — | `#1a1a2e` | `rgb(26, 26, 46)` | Modals, tooltips, popovers |
| `bg-surface-auth` | — | `#16213e` | `rgb(22, 33, 62)` | Dialogs de autenticação (tom azulado — já padrão) |
| `bg-muted` | `hsl(240 21% 17%)` | `#242435` (aprox) | `rgb(36, 36, 53)` | Chips muted, badges neutros, hover ghost |

**Quando usar:**
- Layout root: sempre `bg-background`
- Sidebar + Topbar: `bg-background` + `border-r`/`border-b` (não `bg-card` — senão some na transição)
- Card de conteúdo normal: `bg-card`
- Card "hero" (sessão ativa, combate ativo): `bg-surface-tertiary` + gold border
- Dropdown/popover: `bg-surface-overlay`
- Modal: `bg-surface-auth` (já padrão em `dialog.tsx`)

**Quando NÃO usar:**
- Nunca misturar `bg-card` com `bg-surface-tertiary` lado a lado sem border separadora — fica ambíguo.
- Nunca usar `bg-muted` como fundo de card primário — é só para chips/estados hover.

### 1.2 Text

| Token Tailwind | HSL/Var | Hex | Uso |
|---|---|---|---|
| `text-foreground` | `hsl(40 5% 90%)` | `#E8E6E0` | Body padrão, títulos (override pelo CardTitle com gold) |
| `text-muted-foreground` | `hsl(260 3% 61%)` | `#9896A0` | Descrições secundárias, labels, captions, timestamps |
| `text-[color:var(--text-tertiary)]` | — | `#5C5A65` | Placeholders, text super subtle, helper text disabled |
| `text-primary-foreground` | `hsl(233 26% 10%)` | `#13131E` | Texto sobre fundo gold (buttons primary-gold) |
| `text-gold` | — | `#D4A853` | Links, CTA ghost, nome de entidade (narrative serif) |
| `text-gold-light` | — | `#E8C87A` | Hover state de text-gold |
| `text-success-foreground` | — | `#FFFFFF` | Texto sobre success bg |
| `text-destructive-foreground` | `hsl(40 5% 90%)` | `#E8E6E0` | Texto sobre destructive bg |

**Hierarquia:**
1. `foreground` (E8E6E0) — 90% dos textos
2. `muted-foreground` (9896A0) — labels, descriptions
3. `text-tertiary` (5C5A65) — placeholder, dim
4. Nunca usar `text-white` puro — usa contraste demais para dark theme

**Quando NÃO usar:** nunca aplicar `text-foreground` em elemento que já está dentro de `bg-gold` — vira invisível; usar `text-primary-foreground` (quase preto).

### 1.3 Brand (Gold)

| Token Tailwind | Hex | RGB | Uso |
|---|---|---|---|
| `text-gold` / `bg-gold` | `#D4A853` | `rgb(212, 168, 83)` | Accent primário — CTA, mode ativo, ícone nav, chip de backlink |
| `text-gold-light` / `bg-gold-light` | `#E8C87A` | `rgb(232, 200, 122)` | Hover gold text, gradients |
| `text-gold-dark` / `bg-gold-dark` | `#B8903D` | `rgb(184, 144, 61)` | Gold em borders, estado active/pressed |
| `bg-gold-hover` | `#C49A48` | `rgb(196, 154, 72)` | Hover explícito de CTA gold |
| **NOVO:** `bg-gold/10` (Tailwind alpha) | `#D4A8531A` | — | Background sutil de mode ativo |
| **NOVO:** `bg-gold/5` | `#D4A8530D` | — | Hover de mode item inativo |
| **NOVO:** `border-gold/25` | `#D4A85340` | — | Border de card "hero" |

**Regra:** gold NUNCA em texto corrido — só em CTAs, nomes próprios (narrative), indicadores de estado ativo, e backlink chips.

### 1.4 Semantic

| Token | HSL | Hex | Uso |
|---|---|---|---|
| `bg-success` / `text-success` | `hsl(152 60% 40%)` | `#28A569` (aprox) | ChecklistItem checked, HP verde, toast success |
| `bg-success-foreground` | — | `#FFFFFF` | Texto sobre success |
| `bg-warning` / `text-warning` | `hsl(38 92% 50%)` | `#F59E0B` | Banner "Combate ativo" amarelo, HP MODERATE |
| `bg-warning-foreground` | — | `#FFFFFF` | Texto sobre warning |
| `bg-destructive` / `text-destructive` | `hsl(10 79% 57%)` | `#E35D3A` (aprox) | HP CRITICAL, botão "Sair do combate", delete |
| `bg-destructive-foreground` | `hsl(40 5% 90%)` | `#E8E6E0` | Texto sobre destructive |
| `bg-info` / `text-info` | `hsl(217 72% 64%)` | `#5B8DEF` | Banner info, toast info, links secundários |
| `bg-info-foreground` | — | `#FFFFFF` | Texto sobre info |
| **NOVO:** `text-temp-hp` / `bg-temp-hp` | `#9f7aea` | — | HP temporário (purple) — já existe em config, reforçar uso |

**Regra HP tier canônicos (travados 2026-04-21, memory `feedback_hp_legend_sync.md`):**
Cores derivam de `getHpStatus()` em `lib/utils/hp-status.ts` — **única** fonte de verdade. NUNCA hardcode percentage nem classe Tailwind por componente.

| Tier | Threshold legacy | Classe barra (código) | Token semântico DS |
|---|---|---|---|
| `FULL` | `current === max` (100%) | `bg-emerald-400` | `success` |
| `LIGHT` | `> 70% && < 100%` | `bg-green-500` | `success` (dim) |
| `MODERATE` | `> 40% && ≤ 70%` | `bg-amber-400` | `warning` |
| `HEAVY` | `> 10% && ≤ 40%` | `bg-red-500` | `destructive` |
| `CRITICAL` | `≤ 10%` | `bg-red-600` + `animate-critical-glow` | `critical` |

**Labels em inglês nos 2 locales** (memory `feedback_hp_tier_labels.md`) — `FULL` / `LIGHT` / `MODERATE` / `HEAVY` / `CRITICAL`.

**Percentage strings em UI** sempre via `formatHpPct(status, flagV2)` — jamais `"70-100%"` hardcoded (legend desync quando `ff_hp_thresholds_v2` flipa para 75/50/25).

### 1.5 Borders

| Token | Valor atual | Valor proposto | Uso |
|---|---|---|---|
| `border-border` | `hsl(0 0% 100% / 0.08)` (8%) | **manter** | Border padrão — cards, sidebar divider |
| **NOVO:** `border-border-subtle` | — | `hsl(0 0% 100% / 0.06)` (6%) | Divisores internos quase invisíveis (seções dentro de card) |
| **NOVO:** `border-border-strong` | — | `hsl(0 0% 100% / 0.2)` (20%) | Border active, focus non-gold, modal outline |
| `border-input` | `hsl(0 0% 100% / 0.18)` (18%) | **manter** | Borders de inputs |
| `border-gold` | `#D4A853` | **manter** | Border active de mode/surface, hero card |
| `border-primary` | `hsl(39 56% 67%)` = gold | **manter** | Alias de gold |
| `border-destructive` | `hsl(10 79% 57%)` | **manter** | Error state de form |

**Regra:** 6% para divisores internos ruidosos, 8% para separadores de layout (default), 20% apenas quando precisa de contraste sem gold.

### 1.6 Overlays

| Token | Valor | Uso |
|---|---|---|
| `bg-black/60` | `rgba(0, 0, 0, 0.6)` | Modal overlay padrão (já em `dialog.tsx`) |
| **NOVO:** `bg-black/40` | `rgba(0, 0, 0, 0.4)` | Scrim leve (drawer mobile, lightbox imagem) |
| **NOVO:** `bg-black/80` | `rgba(0, 0, 0, 0.8)` | Overlay "pesado" (combat focus mode) |
| **NOVO CSS var:** `--halo-active` | `0 0 24px rgba(200, 160, 80, 0.35)` | Session ativa no Briefing (já existe) |
| **NOVO CSS var:** `--halo-available` | `0 0 8px rgba(200, 160, 80, 0.1)` | Session disponível (já existe) |

---

## 2. Tipografia

### 2.1 Font families

| Token | Stack | Uso |
|---|---|---|
| `font-sans` | `var(--font-jakarta), 'Plus Jakarta Sans', sans-serif` | **Default** — body, labels, buttons, form, 95% da UI |
| `font-display` | `var(--font-cinzel), 'Cinzel', serif` | **Narrativo apenas** — nomes de campanhas, NPCs, locais, facções, quests |
| `font-mono` | `var(--font-mono), 'JetBrains Mono', monospace` | **Números tabulares** — HP/AC, initiative order, timestamps precisos, dice rolls |

**Regra imutável (§11.2 proposal):**
> Serif SÓ em nomes próprios. Título de surface ("Próxima Sessão", "Combate") é sans. H1/H2/H3 genéricos do layout são sans. Isso mata o ruído visual do caps serif (F-19).

**Exemplos:**
```tsx
// ✅ correto
<h2 className="font-sans text-xl font-semibold">Próxima Sessão</h2>
<span className="font-display text-2xl text-gold">Grolda</span>
<span className="font-mono tabular-nums">83/83</span>

// ❌ errado
<h2 className="font-display text-xl">PRÓXIMA SESSÃO</h2>
```

### 2.2 Scale (desktop + mobile mapping)

| Token name | Desktop | Mobile | Line-height | Weight | Uso |
|---|---|---|---|---|---|
| `text-display` (NOVO) | `32px` (2rem) | `24px` (1.5rem) | `1.15` | 600 | Hero de onboarding, nome de campanha no topbar |
| `text-h1` / `text-2xl` | `24px` | `20px` | `1.2` | 600 | H1 de página (raro em Campaign HQ) |
| `text-h2` / `text-xl` | `20px` | `18px` | `1.25` | 600 | Título de surface ("Próxima Sessão"), mode name |
| `text-h3` / `text-base` | `16px` | `15px` | `1.4` | 600 | Título de card, nome de player |
| `text-body` / `text-sm` | `14px` | `14px` | `1.5` | 400 | Body default, descrições, CTA |
| `text-small` / `text-[13px]` | `13px` | `13px` | `1.5` | 400 | Meta info, secondary text |
| `text-caption` / `text-xs` | `12px` | `12px` | `1.4` | 500 | Timestamps, badges, captions |
| `text-micro` (NOVO) | `10px` | `10px` | `1.3` | 500 uppercase `tracking-[0.08em]` | Labels de form, section headers ("PREPARADO", "PENDENTE") |

**Tailwind mapping existente:**
- `text-xs` → 12px
- `text-sm` → 14px
- `text-base` → 16px
- `text-lg` → 18px
- `text-xl` → 20px
- `text-2xl` → 24px
- `text-3xl` → 30px (evitar — usar 32 ou 24)

**NOVO token custom (adicionar ao tailwind.config.ts extend.fontSize):**
```ts
fontSize: {
  display: ['32px', { lineHeight: '1.15', fontWeight: '600' }],
  micro: ['10px', { lineHeight: '1.3', fontWeight: '500', letterSpacing: '0.08em' }],
}
```

### 2.3 Weight

| Class | Valor | Uso |
|---|---|---|
| `font-normal` | 400 | Body, descrições |
| `font-medium` | 500 | Labels, captions, mode inativo |
| `font-semibold` | 600 | Títulos, CTA, mode ativo |
| `font-bold` | 700 | Raro — apenas números críticos (HP 0, round count) |

**Regra:** nunca usar weight 700 em texto corrido — visualmente pesado em dark theme.

---

## 3. Spacing

Escala Tailwind default `4 / 8 / 12 / 16 / 24 / 32 / 48 / 64` (decisão §11.3). Qualquer valor fora dessa escala é bug visual.

| Token Tailwind | Valor (px) | Valor (rem) | Uso típico |
|---|---|---|---|
| `gap-1` / `p-1` | 4 | 0.25rem | Gap entre ícone + texto inline, border offsets |
| `gap-2` / `p-2` | 8 | 0.5rem | Gap em chip pills, inner spacing de badge |
| `gap-3` / `p-3` | 12 | 0.75rem | Gap entre items de lista compacta, padding de card sm |
| `gap-4` / `p-4` | 16 | 1rem | **Default** — padding interno de card, gap entre blocos |
| `gap-6` / `p-6` | 24 | 1.5rem | Padding de card md (CardHeader atual usa), gap entre sections |
| `gap-8` / `p-8` | 32 | 2rem | Padding de card lg/hero, gap entre mode content + sidebar |
| `gap-12` / `p-12` | 48 | 3rem | Spacing entre grandes blocos de layout (raro) |
| `gap-16` / `p-16` | 64 | 4rem | Spacing top-level de onboarding, empty state vertical rhythm |

**Padrões de uso:**
- Sidebar item gap: `gap-2` vertical, `px-3 py-2` interno
- Card padrão (ChecklistItem, InitiativeRow): `p-4`
- Card hero (Próxima Sessão): `p-6`
- Between sections in a surface: `space-y-6`
- Topbar height: `h-14` (56px) — entre escala, mas consolidado (padrão app)
- Sidebar width: `w-[220px]` expanded, `w-[80px]` collapsed — fora da escala por decisão §6.1 (proposal)

**Anti-pattern:**
```tsx
// ❌ fora da escala
<div className="p-5 gap-[14px]">

// ✅ correto
<div className="p-4 gap-4">
```

---

## 4. Border radii

| Token Tailwind | Valor (px) | Uso |
|---|---|---|
| `rounded-none` | 0 | Divisores full-bleed, nunca em component |
| `rounded-sm` | 4 | Chips, pequenos tags, checkbox |
| `rounded` / `rounded-md` | 6 | Buttons (overrides via Button component), inputs sm |
| `rounded-lg` | 8 | Inputs lg, cards pequenos (via `--radius: 0.75rem = 12px` atual) |
| `rounded-xl` | 12 | **Default Card** (já é assim em `card.tsx`), containers |
| `rounded-2xl` | 16 | Modals, drawers mobile, hero cards |
| `rounded-3xl` | 24 | Evitar — usar 2xl ou full |
| `rounded-full` | 9999 | Avatars, dots indicators, toggle thumbs |

**Atenção ao CSS var `--radius`:**
- Valor atual: `0.75rem` = **12px**
- `rounded-lg` em Tailwind = `var(--radius)` = 12px (NÃO 8px como no default)
- `rounded-md` = `calc(var(--radius) - 2px)` = 10px
- `rounded-sm` = `calc(var(--radius) - 4px)` = 8px

**Decisão:** manter valor `--radius: 0.75rem` para não quebrar components existentes. Quando precisar de 4px/6px exatos, usar `rounded-[4px]` ou `rounded-[6px]` (arbitrary values). Adicionar ao Tailwind config se aparecer 3+ vezes.

**Padrões:**
- Button: `rounded-lg` (via component, 12px)
- Input: `rounded-lg` (12px)
- Card: `rounded-xl` (12px — sim, igual Input por coincidência)
- Badge/Chip: `rounded-md` (10px) ou `rounded-full` (pill)
- Avatar: `rounded-full`
- Modal: `rounded-2xl` (16px) — **NOVO** (hoje usa `rounded-lg`; atualizar dialog.tsx no refactor)

---

## 5. Shadows

Dark theme usa sombras sutis — excesso de drop shadow fica amador. Gold glow é o "signature effect" do tema.

| Token Tailwind | Valor | Uso |
|---|---|---|
| `shadow-none` | — | Flat, default em cards de lista |
| `shadow-sm` | default Tailwind `0 1px 2px 0 rgba(0,0,0,0.05)` | Lift mínimo — buttons secondary, inputs em focus |
| `shadow-card` | `0 4px 32px rgba(0, 0, 0, 0.4)` | **Default de Card** — lift de profundidade (já existe) |
| `shadow-card-hover` | `0 8px 32px rgba(0, 0, 0, 0.5), 0 0 15px rgba(212, 168, 83, 0.15)` | Card hover interactive (já existe) |
| `shadow-lg` | default Tailwind | Dropdown, popover, toast |
| `shadow-gold-subtle` | `0 0 15px rgba(212, 168, 83, 0.15)` | Gold glow sutil em hero cards (já existe) |
| `shadow-gold-glow` | `0 0 15px rgba(212, 168, 83, 0.4)` | Hover em CTA gold, button primary-gold (já existe) |
| `shadow-gold-glow-lg` | `0 0 25px rgba(212, 168, 83, 0.5)` | Foco/destaque máximo (evitar overuse) |
| `shadow-gold-card` | `0 4px 20px rgba(212, 168, 83, 0.12), 0 0 15px rgba(212, 168, 83, 0.08)` | Hero card "Próxima Sessão" (já existe) |

**Focus ring (gold 2px):**
Definido em `globals.css` via `:focus-visible { @apply ring-2 ring-ring ring-offset-2 ring-offset-background; }`. `--ring` = gold. Nunca customizar focus ring por component — respeitar o global.

**Regra:** em dark theme, preferir glow sobre drop-shadow. Se precisar de elevation, usar `bg-surface-tertiary` (background mais claro) em vez de aumentar shadow.

---

## 6. Motion

### 6.1 Durations

| Token (proposto) | Valor | Uso |
|---|---|---|
| `duration-instant` | `0ms` | **Mode switch** — server-driven, navegação entre `/prep` ↔ `/run` ↔ `/recap` deve ser instantânea (sem transição de conteúdo; apenas sidebar contextual re-renderiza) |
| `duration-75` (Tailwind) | `75ms` | Hover muito rápido — só em micro-interactions (focus ring) |
| `duration-150` | `150ms` | **Hover transitions** — buttons, chips, nav items, tooltips appear |
| `duration-200` | `200ms` | **Dropdowns, toasts, popovers** — entrada + saída |
| `duration-250` | `250ms` | Card hover lift (já padrão em `button.tsx` e `card.tsx`) |
| `duration-300` | `300ms` | **Modals, drawer mobile** — entrada dramatic; usar com easing out |
| `duration-500` | `500ms` | Reveal animations (empty state fade-in), bem raros |

**Tokens ausentes hoje — adicionar se necessário:**
```ts
transitionDuration: {
  instant: '0ms',
  base: '200ms',
  slow: '300ms',
}
```
Mas Tailwind default (`duration-150`, `duration-200`, `duration-300`) resolve a maioria.

### 6.2 Easing

| Token | Valor | Uso |
|---|---|---|
| `ease-in` | `cubic-bezier(0.4, 0, 1, 1)` | Saída rápida (elemento sai da tela) |
| `ease-out` | `cubic-bezier(0, 0, 0.2, 1)` | **Default para entrada** — modal appear, toast slide |
| `ease-in-out` | `cubic-bezier(0.4, 0, 0.2, 1)` | Transições bidirecionais, hover states (já em `transitionTimingFunction.theme`) |
| `ease-[cubic-bezier(0.34,1.56,0.64,1)]` | bounce/spring | Icon hover (já em globals.css `group:hover` animations) |

**Regra:**
- Mode switch: **zero transição no conteúdo** (server state drive), apenas URL muda
- Sidebar collapse: `transition-[width] duration-200 ease-in-out`
- Modal/drawer: `duration-300 ease-out` (entrada) + `duration-200 ease-in` (saída)
- Hover: `transition-colors duration-150` ou `transition-all duration-250` (se tiver transform)
- Respeitar sempre `@media (prefers-reduced-motion: reduce)` — já configurado no globals.css

### 6.3 Principles

1. **Mode transitions são gratuitas** (duration-instant): Mestre troca de Preparar pra Rodar sem esperar animation.
2. **Reconnection NUNCA mostra spinner** (memory: skeleton during reconexão): usar skeleton fade-in em vez de spinner.
3. **Combat banner** aparece com `duration-300 ease-out` + slide-down — dramático, intencional.

---

## 7. Breakpoints responsivos

Decisão §6.3 (proposal) fecha em 4 breakpoints:

| Token Tailwind | min-width | Nome interno | Uso |
|---|---|---|---|
| (default) | `0px` | mobile | Stack vertical, bottom tab bar, drawer sidebar |
| `md:` | `768px` | tablet | Sidebar colapsada default (80px), sem bottom tab |
| `lg:` | `1024px` | desktop | **Breakpoint primário** — sidebar expandida, 2-col layout |
| `xl:` | `1280px` | — | Tailwind default — usar com parcimônia |
| `2xl:` | `1440px` | wide | Densidade alta (W1, W2 target) — sidebar + conteúdo 3-col |

**Decisão (proposal §6.3):**
- `< 768px` (mobile): drawer sidebar + bottom tab bar fixo (respeitar `safe-area-inset-bottom`)
- `768–1023px` (tablet): sidebar colapsada default (80px), sem bottom tab
- `≥ 1024px` (desktop): sidebar visível colapsável (80 ↔ 220), mode switcher vertical no topo
- `≥ 1440px` (wide): mesmo layout desktop, conteúdo ganha largura mas sidebar fixa

**Tailwind mapping:**
```tsx
// Sidebar collapse behavior
<aside className="hidden md:flex md:w-[80px] lg:w-[220px]">

// Bottom tab bar (mobile only)
<nav className="fixed bottom-0 md:hidden safe-area-pb">

// Topbar search (esconde em mobile, vira ícone)
<div className="hidden md:block">
  <QuickSearch />
</div>
<button className="md:hidden">
  <SearchIcon />
</button>
```

---

## 8. Z-index scale

Nomenclatura explícita para prevenir stacking context hell. Já há regras em `globals.css` (`nav[aria-label="Main navigation"]` force z-50).

| Camada | Tailwind class | Valor | Uso |
|---|---|---|---|
| Base content | `z-0` / `z-auto` | 0 | Conteúdo normal |
| Raised | `z-10` | 10 | Dropdowns inline, hover cards |
| Dropdown | `z-20` | 20 | Popover, Select dropdown, autocomplete |
| Sticky | `z-30` | 30 | CampaignNavBar atual (sticky top-0) |
| **Banner combat** | `z-40` (NOVO) | 40 | Combat active banner (sticky, acima da sidebar) |
| Modal | `z-50` | 50 | Dialog overlay + content (já padrão Radix/dialog.tsx) |
| Topbar global | `z-50` | 50 | Main nav (conflito com modal — decisão: modal sobe pra z-60) |
| **Toast** | `z-60` (NOVO) | 60 | Sonner toasts (acima de modals — erro urgente sobrepõe dialog) |
| **Tooltip** | `z-70` (NOVO) | 70 | Radix tooltip — acima de toast e modal |

**Decisão:**
- Modal do Radix atualmente usa z-50 — **manter** (shadcn default).
- Main nav / Topbar também z-50 — **manter**; se modal e topbar empilharem, modal tem preferência porque é portaled ao body (renderiza depois no DOM).
- Adicionar tokens customizados apenas se conflitos aparecerem. Prefira ordem DOM/portal.

---

## 9. Mapeamento atual vs proposto

### 9.1 O que já existe e NÃO muda

- Todas as cores semantic (`success`, `warning`, `destructive`, `info`)
- Todos os gold tokens (`gold`, `gold-light`, `gold-dark`, `gold-hover`)
- Surface scale (`surface-primary`, `secondary`, `tertiary`, `deep`, `overlay`, `auth`)
- Shadows (`card`, `gold-glow`, `gold-glow-lg`, `gold-subtle`, `gold-card`, `card-hover`)
- Font families (`sans`, `display`, `mono`)
- CSS vars de briefing (`--halo-active`, `--halo-available`, `--dim-inactive`)
- Motion tokens (keyframes `torch-flicker`, `shimmer-sweep`, `fade-in`, `rune-pulse`, animations helpers)
- `--radius: 0.75rem` — manter pra não quebrar components existentes

### 9.2 O que PRECISA ser adicionado

**No `tailwind.config.ts` extend:**
```ts
fontSize: {
  display: ['32px', { lineHeight: '1.15', fontWeight: '600' }],
  micro: ['10px', { lineHeight: '1.3', fontWeight: '500', letterSpacing: '0.08em' }],
},
colors: {
  // Aliases para clareza — todos já existem, mas usar nomes consistentes
  'border-subtle': 'hsl(0 0% 100% / 0.06)',
  'border-strong': 'hsl(0 0% 100% / 0.2)',
},
zIndex: {
  'banner-combat': '40',
  'toast': '60',
  'tooltip': '70',
},
transitionDuration: {
  instant: '0ms',
  base: '200ms',
  slow: '300ms',
},
```

**No `globals.css` `:root`:**
```css
/* Borders explícitos */
--border-subtle: 0 0% 100% / 0.06;
--border-strong: 0 0% 100% / 0.2;
```

### 9.3 O que deve ser DEPRECIADO/banido na nova shell

- ❌ `rounded-3xl` — nunca usar (substitui por `rounded-2xl` ou `rounded-full`)
- ❌ `text-white` puro — substituir por `text-foreground`
- ❌ `text-black` puro — substituir por `text-primary-foreground`
- ❌ Qualquer spacing fora da escala 4/8/12/16/24/32/48/64 sem justificativa
- ❌ Qualquer cor hex hardcoded dentro de component novo — sempre via token
- ❌ Emojis em nav/system (usar Lucide gold) — emojis OK em decoração narrativa apenas

### 9.4 Priority de tokens para v1 do redesign

**Must-have (Fase B):**
1. `text-display`, `text-micro` (novos font sizes)
2. `border-subtle`, `border-strong` aliases
3. `z-banner-combat` (para banner de combate ativo)

**Nice-to-have (Fase C):**
4. `duration-instant`, `duration-base`, `duration-slow` named aliases
5. `z-toast`, `z-tooltip` named aliases

Tudo mais já existe e está pronto para consumo.

---

## 10. Checklist de consumo (dev)

Ao implementar qualquer component novo do redesign:

- [ ] Usei tokens Tailwind em vez de hex hardcoded?
- [ ] Meu spacing está na escala 4/8/12/16/24/32/48/64?
- [ ] Minha tipografia usa `font-sans` default (não `font-display` exceto pra nome próprio)?
- [ ] Meu focus state usa `:focus-visible` global (não custom)?
- [ ] Meu dark/light color contrast respeita WCAG AA (`foreground` vs `background` ≥ 4.5:1)?
- [ ] Meu motion respeita `prefers-reduced-motion`?
- [ ] Meu z-index usa escala nomeada (z-20/30/40/50/60/70)?
- [ ] Meu hover tem `duration-150` ou `duration-250`?
