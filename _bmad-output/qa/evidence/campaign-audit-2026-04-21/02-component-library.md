# Campaign HQ Redesign — Component Library Spec (v1.0, 2026-04-22)

**Source of truth:** `redesign-proposal.md` v0.2 + `01-design-tokens.md`
**Escopo:** 20 componentes necessários para implementar o novo shell (Topbar + Sidebar + Mode switcher + Surfaces) nas 3 audiences (Mestre + Player auth + Player anon).
**Dependências existentes:** shadcn/ui primitives (`components/ui/`), Radix primitives, Lucide icons.

> **Regra de leitura:** cada section tem tudo que o dev precisa para implementar o component sozinho. Tokens referenciam `01-design-tokens.md` pelo nome (ex: `bg-card`, `text-gold`, `duration-150`). Se um dev não entende uma seção, é bug da spec — reportar.

---

## Princípios transversais

1. **Emoji vs SVG:** nav e sistema → Lucide gold (`stroke="#D4A853"`). Decoração narrativa e empty state → emoji OK (🎲 🎯 🎉 ⚠).
2. **Serif só em nome próprio:** campanhas, NPCs, locais, facções, quests usam `font-display`. Tudo mais é `font-sans`.
3. **Focus ring:** nunca custom por component — deixa o global `:focus-visible` (gold 2px) funcionar.
4. **Loading:** usar `Skeleton` nunca `Spinner` — respeita Resilient Reconnection Rule.
5. **Reduced motion:** toda animação respeita `@media (prefers-reduced-motion: reduce)`.
6. **ARIA mínimo:** botão = `<button>`, link = `<a>`, nav = `<nav>`, toggle = `role="switch"` ou `aria-pressed`, tab = `role="tab"` em `role="tablist"`.

---

# PARTE A — PRIMITIVOS (5)

## 1. Button

Expande o component existente em `components/ui/button.tsx` com variantes gold-first.

### Anatomy

```
┌──────────────────────┐
│ [icon] Label [icon]  │
└──────────────────────┘
  ▲       ▲        ▲
  leading content  trailing
```

### Props

```ts
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | 'primary-gold'       // CTA dominante (novo canonical)
    | 'secondary'          // Ghost + bordered (bg transparent + border-white/10)
    | 'ghost'              // Sem border, só hover bg
    | 'destructive'        // Ações irreversíveis (delete, sair do combate)
    | 'success'            // Confirmações positivas (marcar preparado)
    | 'gold-outline'       // Accent alternativo (link-like)
  size?: 'sm' | 'md' | 'lg' | 'icon'
  loading?: boolean         // substitui conteúdo por <Skeleton inline> + desabilita
  asChild?: boolean         // Radix Slot pattern (já existe)
  leadingIcon?: LucideIcon  // opcional (componente, não ReactNode)
  trailingIcon?: LucideIcon
}
```

### Variants

| Variant | Background | Text | Border | Hover |
|---|---|---|---|---|
| `primary-gold` (default) | `bg-gold` | `text-primary-foreground` (quase preto) | none | `bg-gold-hover` + `shadow-gold-glow` + lift `-translate-y-[1px]` |
| `secondary` | `bg-transparent` | `text-foreground` | `border border-white/10` | `border-gold` + `text-gold` + glow |
| `ghost` | `bg-transparent` | `text-foreground` | none | `bg-white/5` |
| `destructive` | `bg-destructive` | `text-destructive-foreground` | none | `bg-destructive/90` |
| `success` | `bg-success` | `text-success-foreground` | none | `bg-success/90` |
| `gold-outline` | `bg-transparent` | `text-gold` | `border border-white/15` | `border-gold` + glow |

**Nota de migração:** `variant="default"` atual vira `primary-gold`. `variant="gold"` atual continua existindo como alias. Usar `primary-gold` em código novo.

### Sizes

| Size | Height | Padding | Font | Radius | Min tap target |
|---|---|---|---|---|---|
| `sm` | `h-8` (32px) | `px-3 py-1` | `text-xs` (12px) | `rounded-md` | 44px (mobile: override via min-h) |
| `md` (default) | `h-10` (40px) | `px-4 py-2` | `text-sm` (14px) | `rounded-lg` | 44px |
| `lg` | `h-11` (44px) | `px-8 py-2` | `text-sm` (14px) | `rounded-lg` | 44px |
| `icon` | `h-10 w-10` | — | — | `rounded-lg` | 44px |

**Regra mobile:** qualquer Button com `size="sm"` em mobile deve ter `min-h-[44px]` override para thumb-zone compliance.

### States

| State | Visual |
|---|---|
| `default` | Conforme variant |
| `hover` | Transition `duration-150` → lift/glow conforme variant |
| `active` (pressed) | `scale-[0.98]` + sombra reduzida |
| `focus-visible` | Global ring-2 gold |
| `disabled` | `opacity-50 cursor-not-allowed pointer-events-none` |
| `loading` | Substitui conteúdo por skeleton inline + desabilita; mostra texto via aria-label |

### Exemplos de uso

```tsx
// CTA dominante
<Button variant="primary-gold" size="lg" leadingIcon={Sparkles}>
  Começar
</Button>

// Ação secundária
<Button variant="secondary" size="md" trailingIcon={ArrowRight}>
  Ver mais
</Button>

// Botão icon-only
<Button variant="ghost" size="icon" aria-label="Notificações">
  <Bell className="h-5 w-5" />
</Button>
```

**Quando NÃO usar:**
- Não usar `variant="ghost"` como CTA dominante — usa `primary-gold`.
- Não empilhar 2 `primary-gold` no mesmo contexto (decisão §13.6: 1 CTA dominante).

### Acessibilidade
- Sempre `type="button"` default; `type="submit"` só em forms.
- `aria-label` obrigatório em `size="icon"`.
- `loading=true` → `aria-busy="true"` e `disabled`.

---

## 2. Badge

### Anatomy

```
┌─────────────┐       ┌──────────────┐       ┌────────┐
│ Label       │       │ [icon] Label │       │  3     │
└─────────────┘       └──────────────┘       └────────┘
  muted                 with icon             counter
```

### Props

```ts
interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'muted' | 'gold' | 'success' | 'warning' | 'destructive' | 'info'
  size?: 'sm' | 'md'
  leadingIcon?: LucideIcon
  count?: number  // Rendereriza como counter pill (max 99+)
}
```

### Variants

| Variant | Background | Text | Border |
|---|---|---|---|
| `muted` (default) | `bg-muted` | `text-muted-foreground` | none |
| `gold` | `bg-gold/10` | `text-gold` | `border border-gold/25` |
| `success` | `bg-success/15` | `text-success` | none |
| `warning` | `bg-warning/15` | `text-warning` | none |
| `destructive` | `bg-destructive/15` | `text-destructive` | none |
| `info` | `bg-info/15` | `text-info` | none |

### Sizes

| Size | Height | Padding | Font | Radius |
|---|---|---|---|---|
| `sm` | `h-5` (20px) | `px-1.5` | `text-[10px]` uppercase tracking-wide | `rounded` |
| `md` (default) | `h-6` (24px) | `px-2.5 py-0.5` | `text-xs` (12px) | `rounded-md` |

### States

| State | Visual |
|---|---|
| `default` | Variant-specific |
| `with icon` | `gap-1` inline + `size-3` (12px) icon |
| `counter` | `tabular-nums` + `min-w-5` centered; "99+" se >99 |

### Exemplos

```tsx
<Badge variant="gold" leadingIcon={Shield}>SRD 5.1</Badge>
<Badge variant="destructive" size="sm">Crítico</Badge>
<Badge variant="info" count={3} />  // bell indicator
```

**Quando NÃO usar:** nunca usar badge para ação clicável — usa Button `size="sm"`.

---

## 3. Card

Expande `components/ui/card.tsx` atual. Compatibility preservada — adicionar variantes.

### Anatomy

```
┌─────────────────────────────────┐
│ ┌─── CardHeader ────────┐       │
│ │ CardTitle              │      │
│ │ CardDescription        │      │
│ └────────────────────────┘      │
│ ┌─── CardContent ───────┐       │
│ │ children              │       │
│ └───────────────────────┘       │
│ ┌─── CardFooter ────────┐       │
│ │ actions               │       │
│ └───────────────────────┘       │
└─────────────────────────────────┘
```

### Props

```ts
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'hero' | 'muted'
  padding?: 'sm' | 'md' | 'lg'
  interactive?: boolean  // hover lift + cursor pointer
  selected?: boolean     // gold border ativo
}
```

### Variants

| Variant | Background | Border | Shadow |
|---|---|---|---|
| `default` | `bg-card` | `border border-border` (8%) | `shadow-card` |
| `hero` | `bg-surface-tertiary` | `border border-gold/25` | `shadow-gold-card` |
| `muted` | `bg-muted` | none | none |

### Padding

| Padding | Internal |
|---|---|
| `sm` | `p-4` |
| `md` (default) | `p-6` (CardHeader atual) |
| `lg` | `p-8` |

### States

| State | Visual |
|---|---|
| `default` | Variant-specific |
| `hover` (interactive=true) | `translate-y-[-2px]` + `shadow-card-hover` (transition-all duration-250) |
| `selected` (selected=true) | border vira `border-gold` + `shadow-gold-subtle` |

### Exemplos

```tsx
// Hero: Próxima Sessão
<Card variant="hero" padding="md">
  <CardHeader>
    <CardTitle className="font-display">Sessão 12 — "Masmorra do Dragão"</CardTitle>
    <CardDescription>📅 Sex 25/Abr · 20h</CardDescription>
  </CardHeader>
  <CardContent>...</CardContent>
</Card>

// Padrão
<Card interactive onClick={handleNavigate}>
  ...
</Card>
```

---

## 4. Input

Expande `components/ui/input.tsx`. Adicionar suporte a prefix/suffix + variantes.

### Anatomy

```
┌───────────────────────────────┐
│ [icon] placeholder... [icon] │
└───────────────────────────────┘
   prefix  value        suffix
```

### Props

```ts
interface InputProps extends React.ComponentProps<'input'> {
  variant?: 'text' | 'search'
  size?: 'sm' | 'md' | 'lg'
  leadingIcon?: LucideIcon
  trailingIcon?: LucideIcon | React.ReactNode  // allows clear button
  error?: boolean
  errorMessage?: string  // renderiza abaixo com id aria-describedby
}
```

### Variants

- `text` (default) — padrão
- `search` — adiciona `leadingIcon={Search}` automaticamente + `type="search"` + clear trailing quando value !== ""

### Sizes

| Size | Height | Padding | Font |
|---|---|---|---|
| `sm` | `h-8` (32px) | `px-2 py-1` | `text-xs` |
| `md` (default) | `h-10` (40px) | `px-3 py-2` | `text-sm` |
| `lg` | `h-11` (44px) | `px-4 py-2` | `text-base` |

### States

| State | Visual |
|---|---|
| `default` | `border-input` (white 18%) + `bg-surface-tertiary` |
| `focus` | Global focus ring (gold 2px) |
| `error` | `border-destructive` + `text-destructive` no errorMessage |
| `disabled` | `opacity-50 cursor-not-allowed` |

### Exemplos

```tsx
<Input
  variant="search"
  size="md"
  placeholder="Buscar NPCs, quests..."
  trailingIcon={value ? <XCircle onClick={clear} /> : undefined}
/>

<Input
  error
  errorMessage="Email inválido"
  aria-describedby="email-error"
/>
```

**Acessibilidade:** `aria-invalid={error}` + `aria-describedby` linkado ao errorMessage.

---

## 5. Checkbox / CheckCircle visual

O checkbox já existe em `components/ui/checkbox.tsx`. Para o redesign, adicionar um `CheckCircleItem` como visual spec pra ChecklistItem (Preparado/Pendente).

### Anatomy (CheckCircle)

```
Preparado:          Pendente:
 ┌──────┐            ┌──────┐
 │  ✓   │            │      │
 │ gold │            │ dim  │
 └──────┘            └──────┘
```

### Props

```ts
interface CheckCircleProps {
  checked: boolean
  size?: 'sm' | 'md' | 'lg'
  onChange?: (next: boolean) => void
  disabled?: boolean
}
```

### Sizes

| Size | Dimensions |
|---|---|
| `sm` | `h-4 w-4` (16px) |
| `md` (default) | `h-5 w-5` (20px) |
| `lg` | `h-6 w-6` (24px) |

### States

| State | Visual |
|---|---|
| `unchecked` | `border-2 border-white/20 bg-transparent` (circle vazio) |
| `checked` | `bg-success border-success` + `<Check className="text-success-foreground" />` |
| `hover` (unchecked) | `border-gold/50` |
| `focus-visible` | Global ring gold |
| `disabled` | `opacity-50` |

### Exemplos

```tsx
<CheckCircle checked size="md" />  // verde
<CheckCircle checked={false} />    // dim cinza
```

**Acessibilidade:** `role="checkbox"` + `aria-checked` + keyboard Space toggle.

---

# PARTE B — NAV (5)

## 6. Topbar

### Anatomy

```
┌──────────────────────────────────────────────────────────────────────┐
│ [Logo] [Campaign ▾]   🔍 Buscar rápida...       🔔[3] [Avatar ▾]   │
└──────────────────────────────────────────────────────────────────────┘
 48px   auto              center auto        right  auto
 ← 56px height (h-14) ─────────────────────────────────────────────────
```

Mobile (< 768px):
```
┌──────────────────────────────────────┐
│ [☰] [Logo] [Campaign ▾]       🔍 [👤]│
└──────────────────────────────────────┘
```

### Props

```ts
interface TopbarProps {
  campaigns: CampaignSummary[]
  activeCampaignId: string
  onCampaignChange: (id: string) => void
  searchEnabled?: boolean   // default true
  notifications?: { count: number; unread: boolean }
  user: { name: string; avatarUrl?: string }
  onHamburgerClick?: () => void  // mobile only, abre drawer
}
```

### Parts

- **Logo:** SVG gold (#D4A853), `h-8 w-8`, clicável → dashboard
- **CampaignSwitcher:** dropdown Radix, nome atual + chevron. Lista todas as campanhas do user.
- **QuickSearch** (component #11): visível em `md:` e acima. Em mobile, vira ícone que abre fullscreen.
- **NotificationBell:** Button `variant="ghost" size="icon"` + Badge count se `unread`
- **UserMenu:** dropdown com avatar + "Perfil" + "Configurações" + "Sair"

### Layout

```tsx
<header className="sticky top-0 z-50 h-14 border-b border-border bg-background/95 backdrop-blur-sm">
  <div className="flex h-full items-center gap-4 px-4">
    <button className="md:hidden" onClick={onHamburgerClick} aria-label="Abrir menu">
      <Menu className="h-5 w-5" />
    </button>
    <Logo />
    <CampaignSwitcher />
    <div className="flex-1 hidden md:block max-w-xl">
      <QuickSearch />
    </div>
    <button className="md:hidden" aria-label="Buscar"><Search /></button>
    <NotificationBell />
    <UserMenu />
  </div>
</header>
```

### States

- Scroll: `backdrop-blur-sm` + `bg-background/95` (subtle transparency)
- Mobile: hamburger replaces campaign switcher opening drawer com sidebar
- Busca: `Ctrl+K` (Win) / `⌘K` (Mac) → abre QuickSearch via portal

---

## 7. Sidebar

### Anatomy

```
Expanded (220px)         Collapsed (80px)
┌────────────┐           ┌──────┐
│ 🛠 Preparar│           │  🛠  │  ← mode switcher
│ ⚔️ Rodar  │           │  ⚔️  │
│ 📖 Recap  │           │  📖  │
│ ─────────── │           │ ───  │
│ Próxima    │           │  📅  │  ← surfaces
│ Quests     │           │  ⚔   │
│ NPCs       │           │  👤  │
│ ...        │           │  ... │
│            │           │      │
│ [ ◀ ]     │           │ [ ▸ ]│
└────────────┘           └──────┘
```

### Props

```ts
interface SidebarProps {
  mode: 'preparar' | 'rodar' | 'recap' | 'minha-jornada' | 'assistindo'
  activeSurface: SurfaceId
  surfaces: SurfaceDef[]  // vem filtrado por mode + role + auth (F-06 fix)
  collapsed: boolean
  onToggleCollapse: () => void
  onModeChange: (mode: Mode) => void
  onSurfaceChange: (surface: SurfaceId) => void
  combatActive: boolean  // aciona lock visual em Preparar/Recap
  role: 'dm' | 'player-auth' | 'player-anon'
}
```

### Parts

1. **Mode switcher** (top, vertical): 3 ModeItems para Mestre; Player não vê (mode derivado do server, §5.5)
2. **Divider** (`gold-divider` existente): linha dourada gradiente sutil
3. **Surface list**: array de SurfaceItems
4. **Collapse toggle**: botão `◀ ▸` bottom

### Layout

```tsx
<aside className={cn(
  "fixed left-0 top-14 bottom-0 hidden md:flex flex-col",
  "bg-surface-secondary border-r border-border",
  "transition-[width] duration-200 ease-in-out",
  collapsed ? "w-[80px]" : "w-[220px]"
)}>
  {role === 'dm' && <ModeSwitcher mode={mode} onChange={onModeChange} collapsed={collapsed} />}
  <div className="gold-divider my-3 mx-3" />
  <nav className="flex-1 overflow-y-auto p-3 space-y-1" aria-label="Seções">
    {surfaces.map(s => <SurfaceItem key={s.id} {...s} active={s.id === activeSurface} collapsed={collapsed} />)}
  </nav>
  <button onClick={onToggleCollapse} className="h-10 border-t border-border hover:bg-white/5">
    {collapsed ? <ChevronRight /> : <ChevronLeft />}
  </button>
</aside>
```

### States

- `expanded` (default desktop): 220px, labels visíveis
- `collapsed`: 80px, só ícones; labels aparecem como tooltip no hover
- `hidden` (mobile): não renderiza; substitui por drawer via Sheet (radix)
- `combat-locked` (combatActive=true + mode diferente de Rodar): ModeItems com ícone 🔒 + opacity 60%

### Acessibilidade
- `<aside>` com `aria-label="Navegação principal"`
- Mode switcher: `role="tablist"`, cada ModeItem `role="tab"` + `aria-selected`
- Collapsed: labels via `aria-label` no ícone + visible tooltip on hover

---

## 8. ModeItem

### Anatomy

```
Inactive         Active                  Locked (combat)
┌────────────┐   ┌────────────┐         ┌────────────┐
│ 🛠 Preparar│   │[🛠 Preparar]│◀        │ 🛠🔒      │
└────────────┘   └────────────┘          └────────────┘
                  gold bg + border         opacity 60%
```

### Props

```ts
interface ModeItemProps {
  mode: Mode
  label: string
  icon: LucideIcon
  active: boolean
  locked?: boolean
  collapsed?: boolean
  onClick: () => void
  shortcut?: string  // "g p", mostrado em tooltip
}
```

### States

| State | Background | Border | Text | Icon color |
|---|---|---|---|---|
| `inactive` | `bg-transparent` | none | `text-muted-foreground` | gold dim (`text-gold/70`) |
| `hover` | `bg-gold/5` | none | `text-foreground` | `text-gold` |
| `active` | `bg-gold/10` | `border-l-2 border-gold` | `text-gold` | `text-gold` |
| `locked` | `bg-transparent` | none | `opacity-60` | + Lock icon 12px |
| `focus-visible` | Ring gold global | — | — | — |

### Layout

```tsx
<button
  role="tab"
  aria-selected={active}
  aria-label={locked ? `${label} (bloqueado durante combate)` : label}
  onClick={onClick}
  className={cn(
    "w-full flex items-center gap-3 px-3 py-2.5 rounded-md",
    "transition-colors duration-150",
    "focus-visible:ring-2 focus-visible:ring-gold",
    active && "bg-gold/10 border-l-2 border-gold text-gold",
    !active && "text-muted-foreground hover:bg-gold/5 hover:text-foreground",
    locked && "opacity-60"
  )}
>
  <Icon className="h-5 w-5 shrink-0" stroke="currentColor" />
  {!collapsed && (
    <>
      <span className="font-medium flex-1 text-left">{label}</span>
      {locked && <Lock className="h-3 w-3" />}
    </>
  )}
</button>
```

**Shortcut visual (tooltip em collapsed/hover):** `Ctrl + G, P`

---

## 9. SurfaceItem

Análogo ao ModeItem mas pra surfaces (próxima sessão, quests, NPCs...).

### Anatomy

```
Inactive                    Active
┌──────────────────────┐    ┌──────────────────────┐
│ 👤 NPCs              │    │▸ 👤 NPCs            │
└──────────────────────┘    └──────────────────────┘
                              gold left indicator
```

### Props

```ts
interface SurfaceItemProps {
  id: SurfaceId
  label: string
  icon: LucideIcon
  active: boolean
  count?: number  // opcional — Badge ao lado (ex: "NPCs (12)")
  collapsed?: boolean
  onClick: () => void
}
```

### States

| State | Visual |
|---|---|
| `inactive` | `text-muted-foreground`, ícone `text-gold/60` |
| `hover` | `bg-white/5` + `text-foreground`, ícone `text-gold` |
| `active` | `bg-gold/8` + border-l-2 gold + `text-gold` |
| `with count` | Badge variant="muted" size="sm" trailing |

### Layout

```tsx
<button
  onClick={onClick}
  aria-current={active ? "page" : undefined}
  className={cn(
    "w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm",
    "transition-colors duration-150",
    active
      ? "bg-gold/8 border-l-2 border-gold text-gold font-medium"
      : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
  )}
>
  <Icon className="h-4 w-4 shrink-0" />
  {!collapsed && <span className="flex-1 text-left truncate">{label}</span>}
  {!collapsed && count !== undefined && (
    <Badge variant="muted" size="sm">{count}</Badge>
  )}
</button>
```

---

## 10. BottomTabBar (mobile)

Substitui Sidebar em `< 768px`. 3 tabs para Mestre (Prep/Mesa/Recap) ou 2 para Player (Jornada/Assistindo).

### Anatomy

```
┌──────────────────────────────────────┐
│                                      │
│         CONTEÚDO                     │
│                                      │
├──────────────────────────────────────┤
│  🛠       ⚔️        📖              │
│  Prep    [Mesa]    Recap           │
└──────────────────────────────────────┘
             ▲ active (gold underline)
+ safe-area-inset-bottom
```

### Props

```ts
interface BottomTabBarProps {
  mode: Mode
  onChange: (mode: Mode) => void
  tabs: { mode: Mode; icon: LucideIcon; label: string }[]
  combatActive: boolean  // lock state em outros tabs
}
```

### Layout

```tsx
<nav
  role="tablist"
  aria-label="Modos"
  className="fixed bottom-0 inset-x-0 z-40 md:hidden
             bg-surface-secondary border-t border-border
             safe-area-pb"
>
  <div className="grid grid-cols-3">  {/* ou 2 para player */}
    {tabs.map(tab => {
      const active = tab.mode === mode;
      const locked = combatActive && tab.mode !== 'rodar';
      return (
        <button
          key={tab.mode}
          role="tab"
          aria-selected={active}
          disabled={locked}
          onClick={() => !locked && onChange(tab.mode)}
          className={cn(
            "h-14 flex flex-col items-center justify-center gap-0.5",
            "transition-colors duration-150",
            active && "text-gold",
            !active && !locked && "text-muted-foreground hover:text-foreground",
            locked && "text-muted-foreground/40"
          )}
        >
          <tab.icon className="h-5 w-5" />
          <span className="text-[10px] font-medium uppercase tracking-wide">
            {tab.label}
            {locked && " 🔒"}
          </span>
          {active && <span className="absolute bottom-0 h-0.5 w-10 bg-gold rounded-full" />}
        </button>
      );
    })}
  </div>
</nav>
```

### States

- `active`: text-gold + underline gold dot
- `inactive`: muted-foreground
- `locked`: opacity reduzida + 🔒 emoji inline + disabled
- Sempre respeitar `safe-area-inset-bottom` em iPhone

---

# PARTE C — COMPOSTO (5)

## 11. QuickSearch (Ctrl+K)

Command palette estilo Linear/Notion. Aciona-se via `Ctrl+K` / `⌘K` ou ícone no Topbar.

### Anatomy

```
Fechado (trigger no topbar):
┌────────────────────────────────────┐
│ 🔍 Buscar rápida...      Ctrl+K   │
└────────────────────────────────────┘

Aberto (portal modal):
┌──────────────────────────────────────────┐
│ 🔍 [cursor]|                          ⎋   │
├──────────────────────────────────────────┤
│ NPCS                                     │
│  👤 Grolda                              │
│  👤 Satori                              │
│ QUESTS                                   │
│  🎯 Caça ao Dragão                      │
│ AÇÕES                                    │
│  ➕ Criar novo NPC                       │
│                                          │
│  ↑↓ navegar · ↵ selecionar · ⎋ sair    │
└──────────────────────────────────────────┘
```

### Props

```ts
interface QuickSearchProps {
  campaignId: string
  onSelectResult: (result: SearchResult) => void
}

type SearchResult =
  | { type: 'npc' | 'quest' | 'location' | 'faction' | 'note'; id: string; title: string }
  | { type: 'action'; id: string; title: string; handler: () => void }
```

### States

| State | Visual |
|---|---|
| `closed` | Trigger como Input-like button no Topbar |
| `open-empty` | Modal + placeholder + mostra "Digite pra buscar" ou actions recentes |
| `open-typing` | Modal + loading skeleton de 3 lines |
| `open-results` | Modal + grouped results por type |
| `open-no-results` | Modal + "Nenhum resultado para '{query}'" + actions disponíveis |

### Layout

```tsx
<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent className="max-w-xl p-0 gap-0 top-[20%] translate-y-0">
    <div className="flex items-center border-b border-border px-4">
      <Search className="h-4 w-4 text-muted-foreground shrink-0" />
      <Input
        autoFocus
        value={query}
        onChange={e => setQuery(e.target.value)}
        className="border-0 h-12 focus-visible:ring-0 bg-transparent"
        placeholder="Buscar NPCs, quests, ações..."
      />
      <kbd className="text-xs text-muted-foreground">ESC</kbd>
    </div>
    <div className="max-h-96 overflow-y-auto p-2">
      {grouped.map(([type, items]) => (
        <div key={type}>
          <div className="text-micro text-muted-foreground px-3 pt-2 pb-1">{type}</div>
          {items.map(item => (
            <ResultItem key={item.id} item={item} />
          ))}
        </div>
      ))}
    </div>
    <div className="border-t border-border px-3 py-2 text-xs text-muted-foreground flex gap-3">
      <span>↑↓ navegar</span>
      <span>↵ selecionar</span>
      <span>⎋ sair</span>
    </div>
  </DialogContent>
</Dialog>
```

### Keyboard

- Global: `Ctrl+K` / `⌘K` abre
- `↑ ↓` navegar results
- `Enter` seleciona
- `Esc` fecha
- `Cmd+Enter` executa action em aba nova (quando aplicável)

---

## 12. Banner

Alertas globais posicionados abaixo do Topbar ou no topo do content. Combat banner é o caso mais importante.

### Anatomy

```
┌────────────────────────────────────────────────────────┐
│ [icon]  Conteúdo do alerta aqui              [CTA]  × │
└────────────────────────────────────────────────────────┘
  48px    flex-1                                auto 32px
```

### Props

```ts
interface BannerProps {
  variant: 'info' | 'warning' | 'success' | 'destructive' | 'combat-active'
  icon?: LucideIcon
  title?: string
  message: React.ReactNode
  cta?: { label: string; onClick: () => void }
  dismissible?: boolean
  onDismiss?: () => void
  sticky?: boolean  // aderente ao topo durante scroll
}
```

### Variants

| Variant | Background | Border | Text | Icon |
|---|---|---|---|---|
| `info` | `bg-info/10` | `border-info/30` | `text-info` | Info |
| `warning` | `bg-warning/10` | `border-warning/30` | `text-warning` | AlertTriangle |
| `success` | `bg-success/10` | `border-success/30` | `text-success` | CheckCircle |
| `destructive` | `bg-destructive/10` | `border-destructive/30` | `text-destructive` | XCircle |
| `combat-active` | `bg-destructive/15` | `border-destructive/50` | `text-foreground` | Swords | pulsa com `animate-pulse` (duration 4s — já override global) |

### Layout

```tsx
<div
  role="alert"
  className={cn(
    "flex items-center gap-3 border rounded-lg px-4 py-3",
    sticky && "sticky top-14 z-[40]",
    variantClasses
  )}
>
  {icon && <Icon className="h-5 w-5 shrink-0" />}
  <div className="flex-1">
    {title && <div className="font-semibold text-sm">{title}</div>}
    <div className="text-sm">{message}</div>
  </div>
  {cta && (
    <Button variant="primary-gold" size="sm" onClick={cta.onClick}>
      {cta.label}
    </Button>
  )}
  {dismissible && (
    <button onClick={onDismiss} aria-label="Dispensar">
      <X className="h-4 w-4" />
    </button>
  )}
</div>
```

### Exemplos

```tsx
// Combate ativo (player)
<Banner
  variant="combat-active"
  icon={Swords}
  sticky
  message="O Mestre iniciou o combate"
  cta={{ label: "Entrar", onClick: () => goToCombat() }}
/>

// Info
<Banner
  variant="info"
  dismissible
  message="Nova versão disponível. [Recarregar]"
/>
```

---

## 13. Skeleton

Placeholder durante loading. **Regra imutável:** usar em vez de spinner em reconnection.

### Anatomy

```
┌─────────────────────────────┐
│ ▓▓▓▓▓▓▓▓▓▓▓▓                │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓             │
│ ▓▓▓▓                        │
└─────────────────────────────┘
```

### Props

```ts
interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text-line' | 'avatar' | 'card' | 'mode-content'
  width?: string | number  // px ou %
  height?: string | number
  lines?: number  // para text-line: quantas linhas
}
```

### Variants

| Variant | Default size | Shape |
|---|---|---|
| `text-line` | `h-4 w-full` | `rounded` |
| `avatar` | `h-10 w-10` | `rounded-full` |
| `card` | `h-40 w-full` | `rounded-xl` |
| `mode-content` | full-height placeholder com 3 sections (header + 2 cards) | custom |

### Base style

```tsx
<div
  role="status"
  aria-live="polite"
  aria-label="Carregando..."
  className={cn(
    "animate-pulse bg-muted/50 rounded",
    variantClasses
  )}
  style={{ width, height }}
/>
```

**Nota:** Tailwind `animate-pulse` já está override pra `duration-4s` em globals.css — dá feel mais calmo, menos epilético.

### Exemplos

```tsx
<Skeleton variant="text-line" lines={3} />
<Skeleton variant="avatar" />
<Skeleton variant="mode-content" />  // full loading state
```

**Quando usar vs Spinner:**
- ✅ Sempre preferir Skeleton — mostra estrutura
- ⚠️ Spinner só em button loading inline (já em Button component)
- ❌ Nunca spinner em reconnection — regra imutável

---

## 14. Modal

Wrapper em cima do `Dialog` existente (`components/ui/dialog.tsx`) com presets.

### Anatomy

```
┌──────────────────────────────────┐
│ Title                          × │
│ Description (opcional)            │
├──────────────────────────────────┤
│                                  │
│ children                         │
│                                  │
├──────────────────────────────────┤
│                 [Cancel] [Confirm]│
└──────────────────────────────────┘
```

### Props

```ts
interface ModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  variant?: 'confirm' | 'form' | 'info'
  size?: 'sm' | 'md' | 'lg'
  title: string
  description?: string
  children: React.ReactNode
  primaryAction?: { label: string; onClick: () => void; variant?: ButtonProps['variant']; loading?: boolean }
  secondaryAction?: { label: string; onClick: () => void }
  destructive?: boolean  // shortcut: primaryAction.variant="destructive"
}
```

### Sizes

| Size | Max width |
|---|---|
| `sm` | `max-w-sm` (384px) |
| `md` (default) | `max-w-md` (448px) |
| `lg` | `max-w-2xl` (672px) |

### Variants

- `confirm`: 2 botões (Cancel + Confirm); padding md; headline clara
- `form`: 1 botão primary (Submit) + close; max-h overflow-y-auto no body
- `info`: 1 botão (OK); usado pra "Sobre" / tour / tooltip grande

### Base structure

```tsx
<Dialog open={open} onOpenChange={onOpenChange}>
  <DialogContent className={cn("rounded-2xl", sizeClasses[size])}>
    <DialogHeader>
      <DialogTitle>{title}</DialogTitle>
      {description && <DialogDescription>{description}</DialogDescription>}
    </DialogHeader>
    <div className="py-2">{children}</div>
    {(primaryAction || secondaryAction) && (
      <div className="flex justify-end gap-2 pt-4 border-t border-border">
        {secondaryAction && (
          <Button variant="secondary" onClick={secondaryAction.onClick}>
            {secondaryAction.label}
          </Button>
        )}
        {primaryAction && (
          <Button
            variant={destructive ? "destructive" : (primaryAction.variant ?? "primary-gold")}
            onClick={primaryAction.onClick}
            loading={primaryAction.loading}
          >
            {primaryAction.label}
          </Button>
        )}
      </div>
    )}
  </DialogContent>
</Dialog>
```

### Acessibilidade
- Foco trap automático via Radix
- Esc fecha (já padrão)
- `aria-labelledby` linkado ao DialogTitle
- Primary button NÃO deve ser submit default — só se variant="form"

---

## 15. Toast

Usa `sonner` já instalado (`components/ui/sonner.tsx`). Wrapper tipado pra padronizar chamadas.

### Anatomy

```
┌──────────────────────────────────────┐
│ [icon] Title                         │
│        description                   │
│                               [UNDO] │
└──────────────────────────────────────┘
```

### Helpers API

```ts
// em lib/toast.ts
export const toast = {
  info: (message: string, options?: ToastOptions) => sonner.info(message, options),
  success: (message: string, options?: ToastOptions) => sonner.success(message, options),
  warning: (message: string, options?: ToastOptions) => sonner.warning(message, options),
  error: (message: string, options?: ToastOptions) => sonner.error(message, options),
}

interface ToastOptions {
  description?: string
  action?: { label: string; onClick: () => void }
  duration?: number  // ms, default 4000
  id?: string  // para replace/dismiss
}
```

### Variants

| Variant | Icon | Accent |
|---|---|---|
| `info` | Info | `text-info` |
| `success` | CheckCircle | `text-success` |
| `warning` | AlertTriangle | `text-warning` |
| `error` | XCircle | `text-destructive` |

### Timing

| Variant | Duration |
|---|---|
| `info` | 4000ms |
| `success` | 3000ms |
| `warning` | 5000ms |
| `error` | 6000ms (+ dismiss-only se critical) |

### Stacking

Sonner default: empilha bottom-right. Máximo 3 visíveis. Novos empurram antigos.

### Exemplos

```tsx
toast.success("NPC criado", {
  description: "Grolda foi adicionada à campanha",
  action: { label: "Desfazer", onClick: () => deleteNpc(id) }
})
```

---

# PARTE D — DOMAIN-SPECIFIC (5)

## 16. ChecklistItem

Usado em W1 (Preparar) para Preparado/Pendente.

### Anatomy

```
┌─────────────────────────────────────────────┐
│ ✓ Encontro: Kobolds prontos      [Editar] │
│ □ Boss final                     [+ add]  │
└─────────────────────────────────────────────┘
```

### Props

```ts
interface ChecklistItemProps {
  checked: boolean
  label: string
  description?: string
  onToggle: () => void
  action?: { label: string; onClick: () => void; icon?: LucideIcon }
  category?: 'preparado' | 'pendente'  // visual group (opcional)
}
```

### Layout

```tsx
<div className={cn(
  "flex items-center gap-3 p-3 rounded-lg",
  "transition-colors duration-150 hover:bg-white/[0.03]"
)}>
  <CheckCircle checked={checked} onChange={onToggle} />
  <div className="flex-1 min-w-0">
    <div className={cn("text-sm", checked && "text-muted-foreground line-through")}>
      {label}
    </div>
    {description && <div className="text-xs text-muted-foreground">{description}</div>}
  </div>
  {action && (
    <Button variant="ghost" size="sm" onClick={action.onClick} leadingIcon={action.icon}>
      {action.label}
    </Button>
  )}
</div>
```

### States

- `unchecked`: muted check + text normal
- `checked`: green check + label strikethrough muted
- `hover`: bg white/3%

---

## 17. HPBar

Progress bar de HP com cores por tier. Respeita HP tier labels canônicos (memory: FULL/LIGHT/MODERATE/HEAVY/CRITICAL em inglês).

### Anatomy

```
Label (esquerda)                         Values (direita)
VOCÊ                                     88/88
████████████████████████████████████   ← full bar
 └── colorido por tier ─────────────┘
```

### Props

```ts
interface HPBarProps {
  current: number
  max: number
  tempHp?: number
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  label?: string
  variant?: 'player' | 'npc' | 'monster'  // afeta label layout e precision
}
```

### Cor por tier (derivar de `getHpStatus()`)

| Tier | Threshold | Bar bg | Label |
|---|---|---|---|
| FULL | 100% | `bg-success/80` | "FULL" |
| LIGHT | 75-99% | `bg-success/60` | "LIGHT" |
| MODERATE | 25-74% | `bg-warning` | "MODERATE" |
| HEAVY | 1-24% | `bg-destructive/70` | "HEAVY" |
| CRITICAL | ≤0% / dying | `bg-destructive` + `animate-critical-glow` | "CRITICAL" |
| TempHP | bonus | segmento `bg-temp-hp` à direita do bar principal | "+{X}" |

### Sizes

| Size | Height | Font (label) |
|---|---|---|
| `sm` | `h-1.5` | `text-xs` |
| `md` (default) | `h-2` | `text-sm` |
| `lg` | `h-3` | `text-base` |

### Layout

```tsx
<div className="space-y-1">
  {showLabel && (
    <div className="flex justify-between text-xs">
      <span className="text-muted-foreground uppercase tracking-wide">{label}</span>
      <span className="font-mono tabular-nums">
        {current}{current !== max && `/${max}`}
        {tempHp && <span className="text-temp-hp ml-1">+{tempHp}</span>}
      </span>
    </div>
  )}
  <div className={cn("w-full bg-surface-deep rounded-full overflow-hidden", sizeClasses.bar)}>
    <div
      className={cn("h-full transition-all duration-300", tierClasses)}
      style={{ width: `${(current / max) * 100}%` }}
      role="progressbar"
      aria-valuenow={current}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={`HP ${current} de ${max}, ${tierLabel}`}
    />
  </div>
</div>
```

**Importante (regra memory):** nunca hardcodar thresholds em componente — sempre consumir `getHpStatus(current, max)` que retorna `{ tier, pct, color }`.

---

## 18. InitiativeRow

Linha de combatente em tabela de iniciativa (W2, W6, W7).

### Anatomy

```
Inactive:
┌──────────────────────────────────────────────────────────┐
│ 12 │ [👤] Satori            [███████████] 83/83    AC 23│
└──────────────────────────────────────────────────────────┘

Active (turno atual):
▶┌──────────────────────────────────────────────────────────┐
 │ 12 │ [👤] Satori            [███████████] 83/83    AC 23│  + gold border + glow
 └──────────────────────────────────────────────────────────┘
```

### Props

```ts
interface InitiativeRowProps {
  initiative: number
  name: string
  avatarUrl?: string
  hp: { current: number; max: number; tempHp?: number }
  ac: number
  active: boolean  // turno atual → chevron gold + border
  kind: 'pc' | 'npc' | 'monster'
  isSelf?: boolean  // player view: destaca "Você"
  onClick?: () => void
  reacting?: boolean  // pending optimistic action
}
```

### States

| State | Visual |
|---|---|
| `default` | `bg-card border border-border` |
| `active` | border-gold + `shadow-gold-subtle` + chevron gold à esquerda |
| `self` (player view) | Badge "Você" à direita + `bg-gold/5` |
| `hover` | `bg-white/5` (se clicável) |
| `reacting` | `animate-pending-pulse` (gold) |
| `dying` (hp=0) | `bg-destructive/5` + `animate-pulse-red` border |

### Layout

```tsx
<li
  role="row"
  aria-current={active ? "true" : undefined}
  onClick={onClick}
  className={cn(
    "flex items-center gap-3 p-3 rounded-lg border transition-all duration-200",
    "bg-card border-border",
    active && "border-gold shadow-gold-subtle",
    isSelf && "bg-gold/5",
    hp.current === 0 && "bg-destructive/5",
    reacting && "animate-pending-pulse"
  )}
>
  {active && <ChevronRight className="h-4 w-4 text-gold shrink-0" />}
  <span className="font-mono tabular-nums text-sm text-muted-foreground w-6 text-right">
    {initiative}
  </span>
  <Avatar className="h-8 w-8 shrink-0">
    {avatarUrl ? <img src={avatarUrl} /> : <span>{name[0]}</span>}
  </Avatar>
  <div className="flex-1 min-w-0">
    <div className="flex items-center gap-2">
      <span className={cn(
        "truncate font-medium",
        kind === 'pc' && "font-display",  // serif for character names
      )}>
        {name}
      </span>
      {isSelf && <Badge variant="gold" size="sm">Você</Badge>}
    </div>
    <HPBar size="sm" current={hp.current} max={hp.max} tempHp={hp.tempHp} />
  </div>
  <div className="text-xs text-muted-foreground font-mono">
    AC {ac}
  </div>
</li>
```

---

## 19. ActivityItem

Item de atividade recente / timeline (W1 scrollable region + W8 Timeline).

### Anatomy

```
┌──────────────────────────────────────────────────────────┐
│ [🎯] @Grolda foi adicionada como NPC          há 2h     │
└──────────────────────────────────────────────────────────┘
  icon  content (com backlinks)                  timestamp
```

### Props

```ts
interface ActivityItemProps {
  type: 'npc-added' | 'quest-updated' | 'session-ended' | 'note-created' | 'combat-started' | 'player-joined' | ...
  content: React.ReactNode  // pode conter <BacklinkChip /> inline
  timestamp: Date
  actor?: { name: string; avatarUrl?: string }
  onClick?: () => void
}
```

### Icon mapping

| Type | Icon (Lucide) |
|---|---|
| `npc-added` | UserCircle |
| `quest-updated` | Target |
| `session-ended` | BookOpen |
| `note-created` | FileText |
| `combat-started` | Swords |
| `player-joined` | Users |

### Layout

```tsx
<li
  onClick={onClick}
  className={cn(
    "flex items-start gap-3 p-3 rounded-md",
    "transition-colors duration-150",
    onClick && "hover:bg-white/5 cursor-pointer"
  )}
>
  <div className="h-8 w-8 shrink-0 rounded-full bg-muted flex items-center justify-center">
    <Icon className="h-4 w-4 text-gold" />
  </div>
  <div className="flex-1 min-w-0">
    <div className="text-sm text-foreground">{content}</div>
    <time className="text-xs text-muted-foreground tabular-nums" dateTime={timestamp.toISOString()}>
      {formatRelative(timestamp)}
    </time>
  </div>
</li>
```

**Backlinks inline:** content pode conter `<BacklinkChip name="Grolda" />` que renderiza `@Grolda` em gold.

---

## 20. BacklinkChip

Chip inline que representa link para entidade (Notion-style `@Grolda`). Killer-feature §10.1.

### Anatomy

```
@Grolda        [[@Grolda]]         [📍 Cavernas]
  plain           with brackets        with icon (local)
```

### Props

```ts
interface BacklinkChipProps {
  entityType: 'npc' | 'location' | 'faction' | 'quest' | 'session'
  entityId: string
  name: string
  icon?: LucideIcon  // opcional override (usa default por type)
  variant?: 'inline' | 'block'  // inline = chip dentro de texto; block = card mini
}
```

### Style

| State | Visual |
|---|---|
| `default` | `bg-gold/10 border border-gold/25 text-gold rounded-md px-1.5 py-0.5 text-sm` |
| `hover` | `bg-gold/20` + underline + cursor pointer |
| `focus-visible` | ring gold |
| `broken` (entidade deletada) | `text-muted-foreground line-through bg-muted` + tooltip "Entidade removida" |

### Layout

```tsx
<a
  href={`/campaigns/${campaignId}/${entityType}s/${entityId}`}
  className={cn(
    "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5",
    "bg-gold/10 border border-gold/25 text-gold",
    "hover:bg-gold/20 hover:underline",
    "transition-colors duration-150 cursor-pointer",
    "font-display"  // nome próprio → serif
  )}
  aria-label={`Abrir ${entityType}: ${name}`}
>
  {icon && <Icon className="h-3 w-3" />}
  <span>@{name}</span>
</a>
```

### Icon mapping (fallback por type)

| Type | Icon | Exemplo prefix |
|---|---|---|
| `npc` | UserCircle | `@Grolda` |
| `location` | MapPin | `📍Cavernas` |
| `faction` | Flag | `🏴Culto` |
| `quest` | Target | `🎯Caça ao Dragão` |
| `session` | BookOpen | `#12` |

**Regra:** nome da entidade SEMPRE em `font-display` (serif) — é nome próprio.

---

# Checklist de completude

Antes de aprovar implementação de qualquer component, dev deve validar:

- [ ] Anatomy documentada com ASCII
- [ ] Props TypeScript definidas
- [ ] Variants listadas com token references (não hex hardcoded)
- [ ] Sizes (quando aplicável) com height/padding/font
- [ ] States: default / hover / active / focus / disabled (+ loading/empty/error quando aplicável)
- [ ] Exemplo de uso tsx completo
- [ ] Regras de ARIA + keyboard
- [ ] "Quando NÃO usar" documentado onde houver ambiguidade

## Gaps conhecidos (NOT scope de V1)

- Drag-and-drop (handout drop §10.4) — Fase C
- Rich text editor (Recap editor com backlinks) — Fase C
- Mindmap canvas (W3) — Fase C; usa lib externa (react-flow ou similar)
- Soundboard player widget (§10.5) — Fase C
- Autocomplete inline `@` parser — Fase C

Todos os 20 componentes acima cobrem W0a, W0b, W1, W2, W4, W5, W6, W7, W8 em Mestre + Player auth + Player anon. Próximo passo: spec de páginas/rotas usando esses componentes como blocos.
