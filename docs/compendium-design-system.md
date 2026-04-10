# Compendium Design System — Pocket DM

> Documento de referencia para manter consistencia visual em todas as paginas publicas do compendio.

## Paleta de Cores Quentes (Dark Gold RPG)

### Backgrounds (do mais profundo ao mais claro)

| Token | Hex | HSL | Uso |
|-------|-----|-----|-----|
| `--background` | `#13131E` | `233 26% 10%` | Fundo da pagina (body) |
| `bg-card` / `--card` | `#1A1A28` | `233 22% 13%` | Cards, paineis, surfaces |
| `surface-tertiary` | `#222234` | — | Cards internos, nested surfaces |
| `surface-overlay` | `#1a1a2e` | — | Modais, tooltips |
| `surface-deep` | `#0e0e18` | — | Areas de scroll do compendio |

### Accent Colors

| Token | Hex | Uso |
|-------|-----|-----|
| Gold (primary) | `#D4A853` | Botoes, links ativos, badges, highlights |
| Gold Light | `#E8C87A` | Feature names, gradientes |
| Gold Dark | `#B8903D` | Gradientes, hover states |
| Gold Hover | `#C49A48` | Hover em botoes |
| Oracle Gold | `#C9A959` | Stat blocks, AI cards |
| SRD Red | `#922610` | Headers de secao (HIT POINTS, PROFICIENCIES) |
| SRD Accent | `#7a200d` | Dividers, bordas de stat block |

### Text Colors

| Token | Hex | Uso |
|-------|-----|-----|
| `--text-primary` | `#E8E6E0` | Texto principal (corpo) |
| `text-gray-200` | `#E5E7EB` | Nomes de cards |
| `text-gray-400` | `#9CA3AF` | Descricoes, labels |
| `text-gray-500` | `#6B7280` | Meta info, contagens |
| `--text-secondary` | `#9896A0` | Texto secundario |
| `--text-tertiary` | `#5C5A65` | Texto terciario/mudo |

### Borders

| Classe | Uso |
|--------|-----|
| `border-white/[0.04]` | Borda sutil de cards |
| `border-white/[0.06]` | Borda de containers (search box) |
| `border-white/[0.08]` | Borda de inputs |
| `border-[#D4A853]/30` | Borda gold em hover |
| `border-amber-400/30` | Borda gold em hover (alias) |

---

## Componentes Padrao — Index Pages

Todas as 4 paginas de indice (Monsters, Spells, Classes, Races) DEVEM seguir este padrao:

### Search Container
```
rounded-xl bg-card/80 border border-white/[0.06] p-4 space-y-3
```

### Search Input
```
w-full h-11 pl-10 pr-4 rounded-lg bg-white/[0.04] border border-white/[0.08]
text-sm text-gray-200 placeholder:text-gray-500
focus:outline-none focus:border-[#D4A853]/40 transition-colors
```

### Collapsible Filters
- Botao "Filters" com chevron rotacionavel
- Badge de contagem ativa: `w-5 h-5 rounded-full bg-[#D4A853] text-gray-950 text-[10px] font-bold`
- Chips: ativo = `bg-[#D4A853] text-gray-950`, inativo = `bg-white/[0.06] text-gray-400 hover:bg-white/[0.1]`

### Count + EN/PT Toggle
```
Linha com count a esquerda (text-xs text-gray-500) e toggle a direita
Toggle: rounded-md border border-white/[0.08] overflow-hidden
  Ativo:  bg-[#D4A853] text-gray-950
  Inativo: bg-white/[0.04] text-gray-500 hover:text-gray-300
```

### Cards de Entidade
```
bg-card border border-white/[0.04] rounded-xl
hover:border-amber-400/30 hover:shadow-[0_0_15px_rgba(212,168,83,0.15)]
transition-all duration-200 group
```
- Nome: `text-gray-200 group-hover:text-white font-[family-name:var(--font-cinzel)]`
- Subtitulo PT: `text-gray-500 italic text-sm`
- Descricao: `text-gray-400`
- Meta/stats: `text-gray-500 text-xs`

---

## Componentes Padrao — Detail Pages

### Hero Section
```
rounded-xl border border-white/[0.06] bg-card overflow-hidden
Border-left accent: 4px solid gradient (gold)
```
- Icone: `text-[#D4A853]` com `w-12 h-12`
- Nome: `font-[family-name:var(--font-cinzel)] text-3xl md:text-4xl text-gray-100`
- Descricao: `text-gray-400 text-lg`
- Badges: role badge colorido + hit die mono + spellcasting badge

### Section Cards (stat-block style)
```
bg-[#1A1A28]/80 rounded-xl border border-white/[0.04]
Background texture: micro noise pattern SVG
```

### Section Headers (SRD style)
```
text-[#922610] font-[family-name:var(--font-cinzel)] text-sm font-bold
uppercase tracking-wider italic
```

### Gold Divider
```css
height: 2px;
background: linear-gradient(to right, transparent, #922610, #c9a959, #922610, transparent);
```

### Feature Cards
```
bg-[#1A1A28]/80 rounded-lg border border-white/[0.04]
hover:border-white/[0.08] transition-all
```
- Level badge: circulo dourado com numero
- Nome: `font-[family-name:var(--font-cinzel)] text-[#E8C87A]`
- Descricao: `text-[#E8E6E0]/90 leading-relaxed`
- Collapsible para descricoes > 500 chars

### Table of Contents (Sticky Desktop)
```
sticky top-20
Header: text-[#D4A853] uppercase tracking-[0.15em] font-cinzel
Linha vertical: w-px bg-white/[0.06]
Dots: 7x7 rounded-full
  Ativo: bg-[#D4A853] border-[#D4A853] shadow gold glow
  Inativo: bg-[#13131E] border-white/[0.15]
Items: text-[13px]
  Ativo: text-[#D4A853] font-medium
  Inativo: text-[#9896A0] hover:text-[#E8E6E0]
Sub-items (features): text-[11px] ml-6 border-l border-white/[0.06]
```

### Class Table
```
Header: bg-gradient gold/10, text-[#D4A853], font-cinzel, uppercase
Level column: text-[#D4A853] font-mono font-bold
Zebra: odd rows bg-white/[0.02]
Hover: bg-[#D4A853]/[0.04]
Border: divide-y divide-white/[0.06]
```

---

## Navegacao (PublicNav)

### Ordem dos links (IMUTAVEL):
1. Monsters
2. Spells
3. Conditions
4. Items
5. Classes
6. Races
7. Dice
8. Rules
9. Combat Tracker

### Links em PT-BR:
1. Monstros → /monstros
2. Magias → /magias
3. Condicoes → /condicoes
4. Itens → /itens
5. Classes → /classes-pt
6. Racas → /racas
7. Dados → /dados
8. Regras → /regras
9. Combat Tracker → /try

### Estilos
- Container: `max-w-7xl`
- Links: `text-gray-400 hover:text-gray-200 text-sm transition-colors`
- Gap: `gap-4`
- Visivel: `lg:flex` (hidden em telas menores)

---

## Fonts

| Font | CSS Variable | Tailwind | Uso |
|------|-------------|----------|-----|
| Cinzel | `--font-cinzel` | `font-display` | Headers, titulos, nomes |
| Plus Jakarta Sans | `--font-jakarta` | `font-sans` | Corpo, UI, labels |
| JetBrains Mono | `--font-mono` | `font-mono` | Dados, numeros, tabelas |

---

## Animacoes e Efeitos

### Hover Glow (cards)
```
hover:border-amber-400/30 hover:shadow-[0_0_15px_rgba(212,168,83,0.15)]
```

### Shimmer Sweep (XP bar, botoes)
```css
@keyframes shimmer-sweep {
  0%   { transform: translateX(-100%); }
  50%  { transform: translateX(100%); }
  100% { transform: translateX(100%); }
}
```

### Gold Glow Pulse (icones)
```
drop-shadow-[0_0_8px_rgba(212,168,83,0.3)]
```

### Glass Nav
```
backdrop-filter: blur(18px);
background: rgba(19, 19, 30, 0.85);
```

---

## Regra de Ouro

> Nunca usar `bg-gray-*` puro para backgrounds de cards ou containers.
> Sempre usar as CSS variables do design system (`bg-card`, `bg-background`)
> ou os tokens custom (`surface-primary`, `surface-secondary`).
>
> Tailwind grays sao FRIOS (azulados). A paleta do Pocket DM e QUENTE (purple-dark com gold).

---

## Checklist — Nova Pagina de Compendio

- [ ] Search container com `bg-card/80 border-white/[0.06]`
- [ ] Search input com `bg-white/[0.04] border-white/[0.08]`
- [ ] Filtros colapsiveis com badge de contagem dourada
- [ ] Count + EN/PT toggle na mesma linha
- [ ] Cards com `bg-card border-white/[0.04]` e hover glow
- [ ] Nomes em Cinzel, subtitulo PT em italic
- [ ] Link adicionado na PublicNav (ordem correta)
- [ ] Rota PT-BR criada
- [ ] Footer com link "Also available in..."
