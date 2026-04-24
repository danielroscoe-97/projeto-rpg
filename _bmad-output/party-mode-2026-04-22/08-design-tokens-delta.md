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
- [ ] HP interaction respeita tap target canônico (ver §14 — `min-h-[44px] sm:min-h-[28px]`)

---

## 13. Header linha 2 — Recursos rápidos (decisão 2026-04-23)

Story A4 condensa o header de 4 linhas pra 2. Linha 1 permanece identidade (`◄ Campanha · Nome Personagem · Raça/Classe · Nv`). **Linha 2 = recursos turno-a-turno** + shortcut pra spell slots.

### 13.1 Canonical

```
HD 6/10 · CD 1/1 · Insp 1 · [✨ Slots 3/24 →]
```

| Elemento | Regra |
|---|---|
| `HD x/y` | Hit Dice — current/max. `x=0` muta label pra muted. |
| `CD x/y` | Channel Divinity (ou recurso de classe principal — driver de `class.resources.primary`) |
| `Insp x` | Inspiração. `x=0` fica muted. |
| `[✨ Slots X/Y →]` | Chip clickable. `X` = total spell slots usados. `Y` = total max. Gold accent. |

### 13.2 Comportamento do chip `[✨ Slots X/Y →]`

- Desktop (≥1024px): click → scroll suave até Col B §Spell Slots + highlight ring 600ms
- Mobile (<1024px): click → abre popover inline com mini-summary por nível (`I ●● · II ●●● · III ●●`)
- Icone `✨` = Lucide `Sparkles`, 14px, gold #D4A853
- Tap target: `min-h-[32px]` desktop, `min-h-[44px]` mobile

### 13.3 Typography

- Separador: `·` (U+00B7) em `text-muted-foreground/60`
- Labels (`HD`, `CD`, `Insp`): `text-[11px] uppercase tracking-[0.08em] text-muted-foreground`
- Números: `text-[13px] tabular-nums text-foreground`
- Chip spell slots: `text-[12px] text-gold font-medium`

### 13.4 Mobile 390

Line wraps acceptable — preservar ordem. Se não couber tudo em uma linha, quebrar após `Insp x` mantendo o chip de slots na linha própria.

---

## 14. HP interaction pattern (canonical — adotado de CombatantRow)

**Decisão 2026-04-23:** A5 remove botões `[−5][−1][+1][+5]` do HpDisplay. Adota pattern **idêntico** ao `components/combat/CombatantRow.tsx:540-587` pra mobile E desktop.

### 14.1 Pattern

```
HP read mode:  [ 45 ] / 88    ← button, click to edit
HP edit mode:  [ ___ ] / 88    ← input type="number", autofocus
               onBlur / Enter → calc delta → onApplyDamage or onApplyHealing
               Escape → cancela
```

### 14.2 Spec

| Prop | Valor |
|---|---|
| Button tap target | `min-h-[44px] sm:min-h-[28px]` (mobile 44px, desktop 28px — matches CombatantRow) |
| Input | `type="number"`, `w-14`, `bg-transparent`, `border border-gold/60 rounded`, `text-center`, `font-mono`, `autoFocus` |
| Delta calculation | `const delta = desired - combatant.current_hp; if (delta < 0) onApplyDamage(abs(delta)); else if (delta > 0) onApplyHealing(delta);` |
| HP=0 edge case | If `desired === 0 && !is_defeated`, also call `onSetDefeated(true)` |
| Keyboard | `Enter` → blur/commit · `Escape` → cancela |
| aria-label | `edit_current_hp_aria` key (i18n) |
| data-testid | `current-hp-btn-{id}` (button), `inline-current-hp-input-{id}` (input) |

### 14.3 Por que esse pattern

- **Já em prod e aprovado pelo Mestre** (CombatantRow não mudou em 6 meses de uso)
- **Reflete fala em mesa**: Mestre narra "sofre 7 de dano" → Player tipo `-7` OR digita HP novo (`38` se tinha 45) — ambos funcionam via delta calc
- **Mobile + desktop unified**: sem bifurcação de UX por viewport
- **Tap target ≥40px no mobile** via `min-h-[44px]` — atende guideline a11y

### 14.4 Anti-patterns proibidos

- ❌ Botões `[−5][−1][+1][+5]` (removidos por decisão)
- ❌ Slider drag no HP bar (não discoverable)
- ❌ Popover/drawer separado (adiciona tap extra sem benefício)
- ❌ Auto-commit sem Enter/blur (risco de typo destruir HP)

### 14.5 Combat Parity

A5 agora é **STRICT 3-mode**. HpDisplay `variant="ribbon"` renderiza em `/sheet` (Auth); CombatantRow em `/combat` usa mesmo pattern (já usa). Guest `/try` também tem HP interaction via GuestCombatClient — port do pattern obrigatório.

E2E:
- `sheet-hp-controls-inline.spec.ts` (Auth, /sheet)
- `combat-hp-edit-ribbon-anon.spec.ts` (Anon, /join combat ribbon)
- `guest-hp-edit-consistency.spec.ts` (Guest, /try)

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
