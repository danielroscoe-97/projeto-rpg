# Proposta UX: Compendium Showcase — Polish & Personalidade

**Autora**: Sally (UX Designer)
**Data**: 2026-04-09
**Seção**: Landing Page → `#compendio`
**Arquivos afetados**:
- `components/marketing/CompendiumMockups.tsx`
- `app/page.tsx` (CompendiumShowcaseSection, linhas 418-528)
- `app/globals.css` (animações)

---

## Diagnóstico: O que tá faltando

### Problema 1 — Alturas desiguais entre os 4 cards
Os mockups são **content-driven** (sem altura fixa). Isso faz com que Bestiário e Grimório tenham alturas ligeiramente diferentes de Classes e Raças, quebrando o alinhamento visual do grid. No mobile (2 colunas), fica ainda mais evidente.

### Problema 2 — Zero personalidade Pocket DM
Os cards são funcionais mas genéricos. Não existe nenhum elemento decorativo que diga "isso é do Pocket DM". Falta o dourado ornamental, falta o sabor RPG, falta a coroa d20.

### Problema 3 — Sem SVG ornamental
A seção "Como Funciona" tem floating dice no desktop. A seção Features tem ícones animados. O Compêndio? Só um blur dourado sutil no background. É a seção com **menos identidade visual** de toda a LP.

### Problema 4 — Footer dos mockups é visualmente fraco
As tags "SRD 5.1 | SRD 2024 | MAD" e "hit dice | subclasses | proficiências" são úteis mas parecem texto solto. Não tem peso visual nem hierarquia.

### Problema 5 — Transição abrupta para o texto abaixo do mockup
O mockup termina e o bloco "1100+ MONSTROS" começa sem separação visual. A leitura pula de um contexto (mini-UI) pra outro (marketing copy) sem respiro.

---

## Proposta de Solução

### 1. Padronização de Alturas — `min-h` uniforme

**Regra**: Todos os 4 mockups devem ter a **mesma altura interna**.

```
Implementação:
- Adicionar min-h-[180px] (ou valor calibrado após teste) no CARD constant
- OU usar flex-1 no container das rows (área de conteúdo) para que 
  o espaço restante seja absorvido uniformemente
- Footer (bottom bar) SEMPRE ancorado no bottom via mt-auto
```

**Estrutura proposta do CARD interno**:
```
┌─ Header (título + badge)          ─┐  ← altura fixa
├─ Filters (pills)                   ─┤  ← altura fixa  
├─ Content rows (3 items)            ─┤  ← flex-1 (absorve variação)
├─ Footer (tags)                     ─┤  ← mt-auto, altura fixa
└─────────────────────────────────────┘
```

**Abordagem recomendada**: `flex flex-col` no CARD_INNER + `flex-1` na área de content + `mt-auto` no footer. Isso evita magic numbers e se adapta a qualquer conteúdo.

---

### 2. SVG Ornamentais Dourados — Corner Flourishes

**Conceito**: Adicionar **corner ornaments** SVG dourados nos cantos superior-esquerdo e inferior-direito de cada card. Estilo pergaminho/medieval sutil.

**Design do ornamento**:
```
┌─ ╔══╗ ─────────────────────────────┐
│  ║  corner flourish (top-left)     │
│                                     │
│              [mockup content]       │
│                                     │
│     corner flourish (bottom-right)║ │
└───────────────────────────── ╚══╝ ─┘
```

**Especificações do SVG**:
- Tamanho: `24x24px` (desktop), `20x20px` (mobile)
- Cor: `#D4A853` com opacity 15-25% (idle) → 40% (hover)
- Estilo: Arco com ponto central — inspirado em filigrana de livro medieval
- Animação: `opacity transition 300ms` no `group-hover`

**SVG sugerido** (inline, ~200 bytes cada):
```svg
<!-- Top-left corner -->
<svg width="24" height="24" viewBox="0 0 24 24" fill="none">
  <path d="M2 22V8C2 4.7 4.7 2 8 2h14" 
        stroke="#D4A853" stroke-width="1" stroke-linecap="round" opacity="0.2"/>
  <path d="M2 16V8C2 4.7 4.7 2 8 2h8" 
        stroke="#D4A853" stroke-width="0.5" stroke-linecap="round" opacity="0.12"/>
  <circle cx="2" cy="22" r="1.5" fill="#D4A853" opacity="0.15"/>
</svg>

<!-- Bottom-right corner (rotação 180°) -->
<!-- Mesma SVG com transform="rotate(180 12 12)" -->
```

**Posicionamento**: `absolute top-0 left-0` e `absolute bottom-0 right-0` dentro do card, com `pointer-events-none`.

---

### 3. Separador Dourado entre Mockup e Texto — "Golden Seam"

**Conceito**: Uma linha decorativa dourada horizontal entre o mockup e o bloco de texto, funcionando como uma "costura" visual.

**Design**:
```
  [mockup content]
  ─── footer tags ───
  ✦─────────────────✦   ← golden seam (SVG inline)
  1100+ MONSTROS
  Stat blocks prontos...
```

**Especificações**:
- SVG de 100% width, ~8px height
- Linha gradiente horizontal: `transparent → gold/20 → gold/30 → gold/20 → transparent`
- Diamante central opcional (2px, gold/40) — reutilizando o padrão do section divider existente
- Animação: `scaleX(0) → scaleX(1)` com delay staggered por card (0.1s incremental)

---

### 4. Header do Mockup — Badge com Ícone Temático

**Conceito**: Substituir o badge de texto puro (ex: "1.100+") por um mini-ícone temático + contagem.

| Card | Ícone | Descrição |
|------|-------|-----------|
| Bestiário | Crânio de dragão (SVG 10px) | Remete a monstro |
| Grimório | Estrela mágica / sparkle | Remete a magia |
| Classes | Escudo / shield | Remete a classe |
| Raças | Máscara / face silhouette | Remete a raça |

**Especificações**:
- Ícone: SVG inline, `10x10px`, stroke-only, cor da categoria
- Posição: À esquerda do número no badge do header
- Alternativa simples: usar emoji de texto (ex: `⚔️ 12`) — mas SVG dá mais controle

---

### 5. Background Decorativo — Grid Pattern Sutil

**Conceito**: Adicionar o mesmo **grid pattern** usado na seção "Como Funciona" como background por trás dos 4 cards. Isso dá textura sem competir com o conteúdo.

**Especificações (já existem no codebase)**:
```css
background-image: 
  linear-gradient(rgba(212,168,83,0.025) 1px, transparent 1px),
  linear-gradient(90deg, rgba(212,168,83,0.025) 1px, transparent 1px);
background-size: 48px 48px;
```
- Aplicar dentro do container `max-w-5xl` como pseudo-element ou div absolute
- Fade nas bordas com `mask-image: radial-gradient(ellipse, black 40%, transparent 75%)`

---

### 6. Floating Accent — D20 Dourado (Desktop Only)

**Conceito**: Um d20 dourado sutil flutuando no canto superior-direito da seção, similar ao padrão de floating dice da seção Features.

**Especificações**:
- Ícone: Reutilizar `D20Icon` existente (page.tsx, linhas 97-122)
- Tamanho: `w-12 h-12`
- Cor: `text-gold/10`
- Animação: `float-gentle` (já existe em globals.css)
- Posição: `absolute -top-4 -right-8` (parcialmente fora do frame)
- Visibilidade: `hidden md:block` (desktop only)

---

## Prioridades de Implementação

| # | Item | Impacto Visual | Esforço | Prioridade |
|---|------|---------------|---------|------------|
| 1 | Padronização de alturas | Alto — alinhamento | Baixo (~15 min) | **P0** |
| 2 | Corner flourishes SVG | Alto — personalidade | Médio (~30 min) | **P1** |
| 3 | Golden seam separator | Médio — polish | Baixo (~15 min) | **P1** |
| 4 | Header badge com ícone | Baixo-Médio | Médio (~20 min) | **P2** |
| 5 | Background grid pattern | Médio — textura | Baixo (~10 min) | **P2** |
| 6 | Floating D20 accent | Baixo — atmosphere | Baixo (~5 min) | **P3** |

---

## Regras de Implementação

1. **Todos os SVGs inline** — sem arquivos externos, pra manter bundle mínimo
2. **Animações respeitam `prefers-reduced-motion`** — já existe o seletor em globals.css
3. **Mobile-first**: corner ornaments menores (20px) no mobile, 24px no desktop
4. **Hover states coordenados**: corner ornaments + border + gradient devem reagir juntos no `group-hover`
5. **Nenhum SVG deve ultrapassar 300 bytes** — manter leve
6. **Testar em grid 1-col (mobile), 2-col (tablet), 4-col (desktop)** — alturas devem bater em todos

---

## Mockup Visual (ASCII)

### Antes (atual):
```
┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐
│ Bestiár.│ │ Grimório│ │ Classes │ │  Raças  │
│  ░░░░░  │ │  ░░░░░  │ │  ░░░░░  │ │  ░░░░░  │
│  ░░░░░  │ │  ░░░░░  │ │  ░░░░░  │ │  ░░░░░  │
│  ░░░░░  │ │  ░░░░   │ │  ░░░░░  │ │  ░░░░   │ ← alturas inconsistentes
│ tags    │ │ tags    │ │ tags    │ │ tags    │
├─────────┤ ├─────────┤ ├─────────┤ ├─────────┤
│ 1100+   │ │ 600+    │ │ 12      │ │ 9       │
│ desc... │ │ desc... │ │ desc... │ │ desc... │
│ Explorar│ │ Explorar│ │ Explorar│ │ Explorar│
└─────────┘ └─────────┘ └─────────┘ └─────────┘
```

### Depois (proposta):
```
          ✦ d20 (floating, desktop)
┌─╔═╗─────────┐ ┌─╔═╗─────────┐ ┌─╔═╗─────────┐ ┌─╔═╗─────────┐
│  ║ Bestiár. │ │  ║ Grimório │ │  ║ Classes  │ │  ║  Raças   │
│  ░░░░░░░░░  │ │  ░░░░░░░░░  │ │  ░░░░░░░░░  │ │  ░░░░░░░░░  │
│  ░░░░░░░░░  │ │  ░░░░░░░░░  │ │  ░░░░░░░░░  │ │  ░░░░░░░░░  │
│  ░░░░░░░░░  │ │  ░░░░░░░░░  │ │  ░░░░░░░░░  │ │  ░░░░░░░░░  │ ← alturas iguais
│  tags       │ │  tags       │ │  tags       │ │  tags       │
│─✦──────────✦│ │─✦──────────✦│ │─✦──────────✦│ │─✦──────────✦│ ← golden seam
│  1100+  💀  │ │  600+   ✦   │ │  12    🛡   │ │  9     👤   │
│  desc...    │ │  desc...    │ │  desc...    │ │  desc...    │
│  Explorar → │ │  Explorar → │ │  Explorar → │ │  Explorar → │
└─────────╚═╝─┘ └─────────╚═╝─┘ └─────────╚═╝─┘ └─────────╚═╝─┘
     ░░░░░░░░ grid pattern background ░░░░░░░░
```

---

## Referências Internas

- Section divider (diamond + gradient lines): `page.tsx:279-285`
- Floating dice pattern: `page.tsx:344-355`
- Grid pattern: `page.tsx` seção HowItWorks (background-image inline)
- Float animations: `globals.css:195-244`
- Mockup animations: `globals.css:554-580`
- Brand gold: `tailwind.config.ts:65-70` (#D4A853)
