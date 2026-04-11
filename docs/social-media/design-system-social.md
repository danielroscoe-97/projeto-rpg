# Design System - Social Media Pocket DM

Referência visual construída a partir do Press Kit 2026 e da Landing Page. Todo material de Instagram (posts, carrosséis, reels, stories) deve seguir estas regras.

## Cores

| Nome | Hex | Uso |
|------|-----|-----|
| Background | `#13131E` | Fundo principal de todos os slides |
| Surface | `#1A1A28` | Fundo de slides internos de carrossel |
| Elevated | `#222234` | Cards, boxes, elementos em destaque |
| Gold | `#D4A853` | Cor da marca. Títulos, destaques, borders |
| Gold Light | `#E8C87A` | Gradientes, glows |
| Gold Dark | `#B8903D` | Gradientes, sombras |
| Text Primary | `#E8E6E0` | Texto principal (creme, nunca branco puro) |
| Text Secondary | `#9896A0` | Texto de apoio, descrições |
| Red (SRD) | `#C0392B` | Pilar "Conteúdo SRD", monstros |
| Red Token | `#EF4444` | Ícones de monstros (orc, badges) |
| Purple (Spell) | `#A855F7` | Ícone de magias, spell star |
| Green (Comun) | `#22C55E` | Pilar "Comunidade", raças |
| Success | `#4A9E5C` | Checkmarks, validações |
| Arcane Purple | `#8E44AD` | Pilar "Comunidade" |
| Warm/Fire | `#E8593C` | Alertas, destaques quentes |

### Regra de fundo

- **Nunca usar branco, cinza claro ou fundo colorido.** Sempre dark.
- Capa e CTA: `#13131E`
- Slides internos de carrossel: `#1A1A28`
- Glow sutil atrás de elementos: `radial-gradient` com gold a 5-10% opacidade

## Tipografia

| Fonte | Peso | Uso |
|-------|------|-----|
| Cinzel | 700-900 | Títulos, headings, nome da marca |
| Plus Jakarta Sans | 400-600 | Corpo, descrições, CTAs |
| JetBrains Mono | 400-700 | Stats, números, labels técnicos |

### Tamanhos (1080x1080)

- Título principal: Cinzel 56-64px
- Subtítulo: Plus Jakarta Sans 28-34px
- Corpo: Plus Jakarta Sans 24-28px
- Stats/números: JetBrains Mono 36-48px
- Labels: JetBrains Mono 14-18px, uppercase, letter-spacing 2px

## Ícones e elementos visuais

### PROIBIDO: Emojis

Nunca usar emojis como ícones em posts. Emojis quebram a identidade premium e parecem amadores.

### OBRIGATÓRIO: SVGs inline ou assets do projeto

Usar os SVGs que já existem no projeto. Referência principal: `components/marketing/FeatureIcons.tsx` e `app/page.tsx`.

#### Ícones disponíveis por categoria

**Combate:**
- Espadas cruzadas (SwordsIcon) - combat tracker
- Escudo (ShieldIcon) - defesa, AC, anti-metagaming

**Player/Mobile:**
- Celular com signal (LivePhoneIcon) - player view, realtime

**Conteúdo:**
- Bola de cristal (OracleIcon) - compêndio, busca
- Livro aberto (BookIcon) - regras, rulesets
- Estrela mágica (SparkleIcon) - magias, destaque

**Monstros:**
- Orc silhouette (`public/art/decorations/orc-silhouette.svg`) - monstros, bestiário
- Dragon silhouette (`public/art/decorations/dragon-silhouette.svg`) - decoração, épico
- Monster badge (cabeça de criatura 16x16) - badge inline

**Classes:**
- 12 ícones SVG em `public/art/icons/classes/` (barbarian.svg, bard.svg, etc.)

**Compêndio (cards grandes 80x80):**
- Orc vermelho com orelhas pontudas - Monstros
- Spell star roxa com órbitas - Magias
- Escudo dourado com cruz - Classes
- Personagem verde com orelhas - Raças

**UI:**
- Checkmark verde (circle + check) - validações, listas de features
- Cross vermelho - comparações negativas
- Partial amarelo - comparações parciais
- Diamond dourado - separador ornamental
- Corner flourish - ornamento de canto (arco medieval)

### Logo e watermark

- Crown d20 SVG em todos os posts de feed
- Opacidade: 15-25% (watermark sutil, nunca dominante)
- Posição: canto inferior direito, com 40px de margem
- Nunca usar o logo como emoji ou PNG pixelado

### Dragões decorativos

- Usar `dragon-silhouette.svg` como elemento decorativo em slides épicos
- Opacidade: 5-8% (bem sutil, quase invisível)
- Posicionar nas laterais ou cantos, nunca no centro

## Layout

### Safe zones

- Margem mínima: 40px em todos os lados
- Área segura para texto: 60px do topo, 80px da base
- Logo/watermark dentro da safe zone

### Estrutura de carrossel

1. **Slide 1 (Capa):** Fundo `#13131E`, título Cinzel grande, badge de pilar, swipe indicator
2. **Slides 2-N (Conteúdo):** Fundo `#1A1A28`, informação com ícones SVG, corner ornaments
3. **Slide Final (CTA):** Fundo `#13131E`, logo proeminente, call to action, link

### Cards e boxes

- Background: `rgba(255,255,255,0.03)` ou `#222234`
- Border: `1px solid rgba(212,168,83,0.08)`
- Border radius: 12px
- Hover/destaque: border gold a 20% opacidade, box-shadow gold sutil

### Separadores

- Linha gradiente: `linear-gradient(90deg, transparent, #D4A853, transparent)` a 40% opacidade
- Diamond ornament no centro (SVG 8x8)

## Texto e copy

### Tom de voz

- Direto, sem enrolação
- Nerd com orgulho
- Funcional (resolve problemas reais do Mestre)
- Inclusivo ("mestres", não "o mestre")

### PROIBIDO no texto

- Travessões longos (em-dash `—`). Usar ponto final, vírgula ou reestruturar a frase
- Linguagem corporate/genérica
- Superlativos vazios ("incrível", "revolucionário", "o melhor")
- Texto com cara de gerado por IA

### Formatos de copy por pilar

- **Dicas de Mesa** (verde): "[Número] + [benefício]"
- **Conteúdo SRD** (vermelho): "[Nome do monstro/magia] + [hook emocional]"
- **Produto** (dourado): "[Situação] + [solução]"
- **Comunidade** (roxo): "[Pergunta/enquete]"

## Checklist antes de publicar

- [ ] Fundo é `#13131E` ou `#1A1A28`?
- [ ] Títulos usam Cinzel?
- [ ] Corpo usa Plus Jakarta Sans?
- [ ] Stats/números usam JetBrains Mono?
- [ ] Zero emojis como ícones? (SVGs apenas)
- [ ] Zero travessões longos no texto?
- [ ] Crown d20 watermark presente (15-25% opacidade)?
- [ ] Safe zones respeitadas (40px mínimo)?
- [ ] Cores da paleta oficial?
- [ ] Texto não parece gerado por IA?
