# Brand Social Guidelines — Pocket DM

> Specs visuais para TODAS as pecas de redes sociais.
> Referencia completa: `docs/brand-guide.md`

---

## 1. Paleta de Cores

### Cores Primarias

| Cor | Hex | Uso em Social |
|---|---|---|
| **Gold** | `#D4A853` | Titulos, destaques, bordas, CTA |
| **Gold Light** | `#E8C87A` | Hover, highlights, gradientes |
| **Gold Dark** | `#B8903D` | Sombras, detalhes secundarios |

### Backgrounds

| Cor | Hex | Uso em Social |
|---|---|---|
| **BG Deep** | `#13131E` | Fundo principal de posts |
| **BG Surface** | `#1A1A28` | Cards internos de carrossei |
| **BG Elevated** | `#222234` | Slides secundarios |

### Texto

| Cor | Hex | Uso |
|---|---|---|
| **Creme** | `#F5F0E8` | Texto principal (NAO usar branco puro) |
| **Gold** | `#D4A853` | Titulos, numeros, destaques |
| **Cinza Quente** | `#9896A0` | Subtextos, creditos |

### Cores de Acento (por pilar)

| Pilar | Cor | Hex |
|---|---|---|
| Dicas de Mesa | Verde Esmeralda | `#2ECC71` |
| Conteudo SRD | Vermelho D20 | `#C0392B` |
| Produto | Gold | `#D4A853` |
| Comunidade | Roxo Arcano | `#8E44AD` |

---

## 2. Tipografia

| Fonte | Uso em Social | Fallback |
|---|---|---|
| **Cinzel** | Titulos, headings, nome da marca | Georgia, serif |
| **Plus Jakarta Sans** | Corpo do texto, legendas | Inter, sans-serif |
| **JetBrains Mono** | Stats, numeros, dados de combate | Courier New, monospace |

### Hierarquia de Tamanhos (1080x1080)

| Elemento | Tamanho | Peso |
|---|---|---|
| Titulo principal | 48-64px | Bold |
| Subtitulo | 32-40px | SemiBold |
| Corpo | 24-28px | Regular |
| Legenda/credito | 18-20px | Regular |
| Stats/numeros | 28-36px | Mono Bold |

---

## 3. Logo e Watermark

- **Watermark em todo post:** Crown d20 icon no canto inferior direito
- Opacidade: 15-25% (sutil, nao compete com conteudo)
- Tamanho: ~80px no post 1080x1080
- Usar variante icon (`public/art/brand/logo-icon.svg`)

### Posicao do Logo

| Formato | Posicao | Tamanho |
|---|---|---|
| Post feed | Bottom-right, 15% opacity | 80px |
| Carrossel capa | Centro ou top, 100% opacity | 120px |
| Carrossel slides | Bottom-right, 15% opacity | 60px |
| Story/Reel | Top-center ou bottom-right | 60px |

---

## 4. Formatos de Post

### Post Estatico (1080x1080)

```
┌────────────────────────────┐
│  [Tag do pilar — cor]      │
│                            │
│   TITULO EM CINZEL         │
│   Subtitulo em Jakarta     │
│                            │
│  ┌──────────────────────┐  │
│  │  Conteudo visual     │  │
│  │  (ilustracao, stats, │  │
│  │   screenshot, pixel  │  │
│  │   art)               │  │
│  └──────────────────────┘  │
│                            │
│  Texto de apoio            │
│  @pocket.dm     [logo] │
└────────────────────────────┘
```

- Fundo: `#13131E`
- Borda: `#D4A853` 2px (opcional — usar em posts premium)
- Padding: 60px em todos os lados
- Safe zone: 40px de cada borda (conteudo critico dentro)

### Carrossel (1080x1080, 5-10 slides)

- **Slide 1 (capa):** Titulo forte + ilustracao + tag pilar
- **Slides 2-N:** Conteudo, fundo `#1A1A28` levemente mais claro
- **Slide final:** CTA suave + @pocket.dm + logo
- Indicador de "deslize" sutil na capa (seta ou dots)

### Story/Reel Cover (1080x1920)

- Logo centralizado no topo
- Titulo em Cinzel no centro
- Gradiente gold sutil de baixo pra cima
- Thumbnail legivel em miniatura

---

## 5. Elementos Visuais Especiais

### Pixel Art

- Usar sprites pixel art como elemento de destaque (NAO dominar a peca)
- Estilo 16-bit, fundo transparente, bordas crisp
- Perfeito para: icones de monstros, itens, classes, spells
- Manter resolucao crisp — shapeRendering="crispEdges" no SVG
- GIFs animados de sprites: diferencial forte (ninguem faz no BR)

### Stat Blocks

- Estilo D&D stat block adaptado: borda pergaminho, fundo creme suave
- Stats em JetBrains Mono
- HP bar com cores do app (green/yellow/orange/red conforme tier)
- Sempre conteudo SRD-only em posts publicos

### Screenshots do App

- Mockup em device frame (celular dark)
- Crop focado na feature, nao tela inteira
- Shadow suave + fundo `#13131E`
- Highlight com glow dourado no elemento principal

---

## 6. Tom de Voz (Copy)

### Personalidade

- **Direto** — sem enrolacao, sem corporativismo
- **Nerd com orgulho** — referencia RPG naturalmente
- **Inclusivo** — "mestres" generico, nao "o mestre"
- **Funcional** — fala de resolver problemas reais da mesa

### Formulas de Copy

| Tipo | Formula | Exemplo |
|---|---|---|
| Dica | [Numero] + [beneficio] | "3 formas de tornar seus combates 2x mais rapidos" |
| Monstro | [Nome] + [hook emocional] | "Beholder: o monstro que seus jogadores vao odiar amar" |
| Produto | [Situacao] + [solucao] | "Quando o DM dropa 15 goblins e voce precisa de iniciativa em 3 segundos" |
| Comunidade | [Pergunta/enquete] | "Qual classe voce NUNCA jogou? Responde nos comentarios" |

### Hashtags Padrao

```
Fixas (toda postagem):
#PocketDM #DnD #RPG #DnD5e #RPGBrasil

Rotativas (variar conforme conteudo):
#MestreDeRPG #DungeonMaster #CombatTracker #MesaDeRPG
#D20 #RPGBrasileiro #JogoDeRPG #Nerd #Geek
#TTRPG #TabletopRPG #DungeonsAndDragons

Por pilar:
- Dicas: #DicaDeRPG #DicaDeMestre #RPGTips
- Monstros: #MonstroDoRPG #BestiarioRPG #MonsterManual
- Spells: #MagiaRPG #SpellsRPG #Magia5e
- Produto: #AppRPG #FerramentaRPG #TechRPG
```

---

## 7. Checklist Pre-Publicacao

- [ ] Cores conferidas (gold, dark bg, creme texto)?
- [ ] Titulo em Cinzel, corpo em Jakarta Sans?
- [ ] Crown d20 watermark presente?
- [ ] Safe zone respeitada (40px de cada borda)?
- [ ] Texto legivel em mobile (fonte >= 24px)?
- [ ] Conteudo SRD-only (nada de fontes nao-SRD)?
- [ ] Hashtags incluidas (5 fixas + 5-10 rotativas)?
- [ ] Copy revisada (tom direto, sem corporativismo)?
- [ ] Adaptacao pra Stories criada (se aplicavel)?
