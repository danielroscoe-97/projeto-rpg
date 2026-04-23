# Design Tokens — Delta vs DESIGN-SYSTEM.md v1.0

**Prereq:** [PRD §9](./PRD-EPICO-CONSOLIDADO.md) + [DESIGN-SYSTEM.md v1.0](../qa/evidence/campaign-audit-2026-04-21/DESIGN-SYSTEM.md) + [01-design-tokens.md](../qa/evidence/campaign-audit-2026-04-21/01-design-tokens.md)

**Escopo:** O que muda nos tokens pra habilitar o redesign do Player HQ.

---

## 1. Decisão resumida

**Nada de token novo.** Todos os tokens (colors, spacings, typography) já existem no DS v1.0. O que muda é **como aplicamos** na ficha.

Princípio: **`space-2` e `space-3` são os novos padrões** no Player HQ (antes predominava `space-4`).

---

## 2. Spacing — aplicação nova

### 2.1 Containers (cards, panels)

| Container | Antes | Depois | Economia vertical |
|---|---|---|---|
| Card default | `p-4` (16px) | `px-4 py-3` (16/12) | 8px por card |
| Card hero (ribbon, sheet status) | `p-5` (20) | `p-4` (16) | 8px |
| Card compacto (spell row, skill row) | `p-3` (12) | `p-2.5` (10) | 4px |
| Modal | `p-6` (24) | `p-5` (20) | 8px |
| Empty state | `py-10 px-6` (40/24) | `py-8 px-5` (32/20) | 16px |

### 2.2 Between elements (gap / space-y)

| Context | Antes | Depois |
|---|---|---|
| Wrapper main de tab | `space-y-4` (16) | `space-y-3` (12) |
| Between irmãos em card | `space-y-3` (12) | `space-y-2` (8) |
| Between headings e body | `space-y-2` (8) | mantido |
| Between cards irmãos | `space-y-4` (16) | `space-y-3` (12) |
| Grid columns gap | `gap-4` (16) | `gap-5` (20) — mais ar entre colunas |

**Regra mnemônica:** Dentro do card, aperta. Entre cards, respira.

### 2.3 Ability score chip

| Atributo | Antes | Depois |
|---|---|---|
| Padding | `p-3` (12) | `p-2.5` (10) |
| Height | `h-20` (~88px com padding) | `h-[72px]` |
| Width | `min-w-24` | `flex-1 min-w-20` (responsivo) |

### 2.4 Skill row

| Atributo | Antes | Depois |
|---|---|---|
| Height | `~56px` (com padding e margin) | `36px` (densidade Linear) |
| Padding vertical | `py-3` | `py-2` |
| Gap entre 3 cols | — | `gap-4` |

---

## 3. Typography — rhythm mais agressivo

### 3.1 Body text em listas densas

| Context | Antes | Depois |
|---|---|---|
| Skill name row | `text-sm` (14/20) | `text-[13px] leading-[18px]` |
| Meta info muted | `text-xs` (12/16) | `text-[11px] leading-[14px]` |
| Number em chip | `text-lg` (18) | `text-xl` (20) — mais peso |
| Label caps (CAPS) | `text-xs` + `uppercase` | `text-[11px]` + `uppercase` + `tracking-[0.08em]` |
| Nano eyebrow | `text-[10px]` | mantém |

### 3.2 Headings em card

| Level | Antes | Depois |
|---|---|---|
| Section title (EFEITOS ATIVOS) | `text-xs uppercase tracking-wide` | `text-[11px] uppercase tracking-[0.08em]` muted |
| Card heading | `text-base font-medium` | `text-sm font-semibold` |
| Hero card title (ex: "Masmorra do Dragão") | Cinzel `text-xl` | mantém |

### 3.3 Numbers tabular

- Sempre `font-variant-numeric: tabular-nums` em HP, AC, slots counts
- Font family: Inter (não mono) — deciso em DS v1.0

---

## 4. Border & Background changes (sutis)

### 4.1 Border subtle vs border

Regra antiga: usar `border` (white/12%) por default.
Regra nova: **default = `border-subtle` (white/6%)**. Usar `border` só em cards hero ou focus.

**Impacto:** visualmente mais leve, sem virar invisível.

### 4.2 Background layers

| Level | Uso antes | Uso novo |
|---|---|---|
| `bg` (#14161F) | main | main |
| `bg-elevated` | cards | cards + ribbon (com blur) |
| `bg-raised` | modals | modals + drawers |

**Novo:** ribbon usa `bg-elevated/80` com `backdrop-blur(8px)` pra efeito glass (mobile-safe).

---

## 5. Grid layout (novos patterns)

### 5.1 Herói tab desktop ≥1280px

```css
.heroi-tab {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2.5rem; /* 40px */
  padding: 1.5rem 2rem; /* 24/32 */
}
```

### 5.2 Herói tab desktop 1024-1279px

```css
@media (min-width: 1024px) and (max-width: 1279px) {
  .heroi-tab {
    grid-template-columns: 1fr 1fr;
    gap: 1.5rem; /* 24px — menor */
    padding: 1rem 1.5rem;
  }
}
```

### 5.3 Herói tab mobile <1024px

```css
@media (max-width: 1023px) {
  .heroi-tab {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 0.75rem 1rem;
  }
}
```

### 5.4 Skill grid 3-col

```css
.skills-grid-dense {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.25rem 1rem; /* 4px vertical (denso), 16px horizontal */
}

@media (max-width: 1023px) {
  .skills-grid-dense {
    grid-template-columns: 1fr;
    gap: 0;
  }
}
```

---

## 6. Motion

Tokens inalterados do DS v1.0. Novos usos:

| Ação | Duration | Easing |
|---|---|---|
| Combate banner slide-down | 300ms | ease-out |
| Combate banner fade-up | 400ms | ease-in |
| Col A ↔ Col B re-balance ao entrar combate | 300ms | ease-in-out |
| Pulse gold em HP change | 1.5s | already defined (.glow-gold-flash) |
| Badge pulse em tab Herói (combate) | 2s infinite | ease-in-out |
| Nota rápida overlay slide-up | 200ms | ease-out |
| FAB aparece/some | 150ms | ease-out |

---

## 7. Iconography

| Tab | Ícone Lucide | Cor |
|---|---|---|
| Herói | `Heart` (recomendado) | gold #D4A853 |
| Arsenal | `Package` ou `Backpack` | gold |
| Diário | `BookOpen` | gold |
| Mapa | `Network` (mantém) | gold |

Todos tamanho `16` em tab bar, stroke width `2`.

---

## 8. Responsive spacing multipliers

Regra da SCR (spacing contextual responsive):

```ts
// tailwind.config.ts ou util
const space = {
  desktop: { sm: 2, md: 3, lg: 4, xl: 5 },
  mobile:  { sm: 1, md: 2, lg: 3, xl: 4 },
};
```

Aplicação: `p-${space[device][size]}`. MVP pode hardcodar por breakpoint via Tailwind responsive classes (`sm:p-2 md:p-3 lg:p-4`).

---

## 9. Sem tokens novos a criar

- Colors: usar paleta existente (`bg-card`, `border-subtle`, `gold`, `text-muted-foreground`, etc)
- Spacing scale: Tailwind default 4/8/12/16/20/24/32/40...
- Typography: font families + weights do DS v1.0
- Radii: usar `rounded-lg` (8px) como default, `rounded-xl` (12) para cards hero

---

## 10. Validação de aplicação

### 10.1 Checklist pré-merge (por story)

- [ ] Zero `#hex` inline em novo código (grep `#[0-9a-fA-F]{6}` em diffs)
- [ ] Sem `p-5` em rows densas (apenas em cards hero)
- [ ] Sem `space-y-4` em wrappers de tab (usar `space-y-3`)
- [ ] Ability chips têm altura ≤72px
- [ ] Skill rows têm altura ≤36px
- [ ] Nenhum `leading-normal` — sempre específico

### 10.2 Métricas automáticas (roadmap)

- Bundle: `stylelint-declaration-strict-value` pra forçar tokens
- Visual regression: Percy comparison

---

## 11. Refs para implementação

- Arquivo central: [app/globals.css](../../app/globals.css) — adicionar apenas `.heroi-tab`, `.skills-grid-dense`, `.ribbon-vivo` CSS específicos
- Tailwind config: [tailwind.config.ts](../../tailwind.config.ts) — não precisa mexer
- DS tokens canônicos: [01-design-tokens.md](../qa/evidence/campaign-audit-2026-04-21/01-design-tokens.md) — **source of truth**

---

## 12. Exemplos concretos

### 12.1 Antes
```tsx
// CharacterStatusPanel.tsx line 53 (hoje)
<div className="space-y-4 bg-card border border-border rounded-xl p-4">
```

### 12.2 Depois
```tsx
<div className="space-y-2 bg-card border border-subtle rounded-xl px-4 py-3">
```

Economia: 4px top + 4px bottom + 8px entre items = ~16px por StatusPanel. Multiplicado por 5 panels por tab = 80px. Multiplicado por 7 tabs (hoje) = 560px de scroll evitado. Multiplicado pelos ~10k usuários = significativo.
