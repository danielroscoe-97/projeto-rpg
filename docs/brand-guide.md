# Pocket DM — Brand Guide

> **Master your table.**

---

## 1. Marca

| Aspecto          | Definição                                                        |
| ---------------- | ---------------------------------------------------------------- |
| **Nome**         | Pocket DM                                                        |
| **Grafia**       | Sempre "Pocket DM" — P e D maiúsculos. Nunca "pocket dm", "PocketDM", "pocketDM" |
| **Tagline**      | *Master your table.*                                             |
| **Domínio**      | pocketdm.com.br (canônico) · pocketdm.app (redirect)            |
| **Posicionamento** | Combat tracker premium para DMs presenciais de D&D 5e → evolui para assistente de sessão |
| **Tom de voz**   | Premium, funcional, direto. Fantasy mas limpo.                   |

### Significado da Tagline

"Master your table" funciona em três níveis:

1. **DM = Dungeon Manager** — você gerencia a dungeon, o combate, a sessão
2. **Domine sua mesa** — controle total do combate
3. **Sua mesa, sua ferramenta** — presencial, não virtual

> **Nota legal:** O termo "Dungeon Master" é trademark da Wizards of the Coast. O "DM" em Pocket DM significa **Dungeon Manager** — somos uma ferramenta de gestão que ajuda Game Masters (mestres) a gerenciar suas sessões.

---

## 2. Logo — Crown d20

O logo do Pocket DM é uma **coroa de 3 pontas flutuando acima de um d20 (icosaedro)**. A coroa é um elemento SEPARADO que paira sobre o dado. A coroa reforça o "Master" (gestão, domínio da mesa), e o d20 é o símbolo universal de RPG.

**NÃO é um escudo. NÃO é integrado ao dado.** É uma coroa flutuante sobre um d20.

### Anatomia do Ícone

- **Coroa:** Forma preenchida (filled) com gradiente gold. 3 pontas triangulares afiadas — a central é a mais alta, as laterais inclinam levemente para fora. A base da coroa segue o formato das arestas superiores do d20 (V invertido) com gap sutil acima do hexágono
- **d20:** Hexágono regular (pointy-top) representando a projeção frontal de um icosaedro. Linhas internas de face conectam os vértices. Triângulo central com stroke levemente mais grosso que as outras linhas internas
- **Integração:** A coroa FLUTUA acima do d20 — não toca nem se integra. A base da coroa acompanha a forma do topo do hex, criando continuidade visual sem contato
- **Estilo:** Coroa = filled gold gradient. D20 = outline/stroke gold, sem preenchimento
- Cor padrão: Gold `#D4A853` sobre Dark `#0A0A0F`
- Respiro mínimo (padding) = 50% da altura do ícone ao redor

### Variantes

| Variante       | Uso                                      | Arquivo                        |
| -------------- | ---------------------------------------- | ------------------------------ |
| **Icon**       | Favicon, app icon, avatar                | `public/art/brand/logo-icon.svg`       |
| **Horizontal** | Navbar, header, email                    | `public/art/brand/logo-horizontal.svg` |
| **Stacked**    | Landing page hero, social media          | `public/art/brand/logo-stacked.svg`    |
| **Full**       | Landing page + tagline, apresentações    | `public/art/brand/logo-full.svg`       |

---

## 3. Paleta de Cores

### Cores Primárias da Marca

| Papel            | Nome           | Hex       | HSL                | Uso                            |
| ---------------- | -------------- | --------- | ------------------ | ------------------------------ |
| **Primary Gold** | Gold           | `#D4A853` | `39 56% 67%`       | Cor da marca, destaques, CTAs  |
| **Gold Light**   | Gold Light     | `#E8C87A` | `40 71% 69%`       | Hover, highlight               |
| **Gold Dark**    | Gold Dark      | `#B8903D` | `39 50% 48%`       | Pressed, accent secundário     |

### Backgrounds

| Papel            | Nome           | Hex       | HSL                | Uso                            |
| ---------------- | -------------- | --------- | ------------------ | ------------------------------ |
| **BG Deep**      | Background     | `#13131E` | `233 26% 10%`      | Background principal do app    |
| **BG Surface**   | Surface        | `#13131E` | `233 22% 13%`      | Cards, panels                  |
| **BG Elevated**  | Elevated       | `#1A1A28` | `240 21% 13%`      | Modais, dropdowns, popovers    |
| **BG Tertiary**  | Tertiary       | `#222234` | `240 21% 17%`      | Nested surfaces                |

### Texto

| Papel            | Hex        | Uso                            |
| ---------------- | ---------- | ------------------------------ |
| **Text Primary** | `#E8E6E0`  | Texto principal, headings      |
| **Text Secondary** | `#9896A0` | Labels, texto auxiliar         |
| **Text Tertiary** | `#5C5A65`  | Placeholders, disabled         |

### Cores Funcionais

| Papel            | Hex       | Uso                            |
| ---------------- | --------- | ------------------------------ |
| **Destructive**  | `#C43C3C` | Dano, HP crítico, erros, delete |
| **Info / Arcano**| `#5B8DEF` | Mana, informação, links        |
| **Success / Cura** | `#4A9E5C` | Cura, confirmações, online     |
| **Warning**      | `#E89B2D` | Alertas, concentração          |
| **Warm**         | `#E8593C` | Fogo, urgência                 |

---

## 4. Tipografia

| Uso              | Fonte               | Peso         | Estilo                         | CSS Variable       |
| ---------------- | -------------------- | ------------ | ------------------------------ | ------------------- |
| **Logo/Brand**   | Cinzel               | 700 (Bold)   | Uppercase, tracking +2%        | `--font-cinzel`     |
| **Headings**     | Cinzel               | 600 (Semi)   | Título das seções              | `--font-cinzel`     |
| **Body/UI**      | Plus Jakarta Sans    | 400-700      | Texto corrido, labels, buttons | `--font-jakarta`    |
| **Stats/Mono**   | JetBrains Mono       | 400-700      | HP, AC, rolls, números         | `--font-mono`       |

---

## 5. Elementos Visuais

### Ornamental Dividers

Linha gradient gold com dot central — usada entre seções da landing page e dentro de cards.

```css
background: linear-gradient(90deg, transparent, #D4A853, transparent);
```

### Card Borders

- Border: `1px solid rgba(212, 168, 83, 0.08)` (gold/8)
- Hover glow: `box-shadow: 0 0 15px rgba(212, 168, 83, 0.4)`

### Noise Texture

SVG fractal noise overlay com `opacity: 0.025` sobre o background — evita flat morto, adiciona textura orgânica.

### Gold Glow

Usado em CTAs, ícones ativos, e elementos de destaque:

```css
box-shadow: 0 0 15px rgba(212, 168, 83, 0.4);  /* gold-glow */
box-shadow: 0 0 25px rgba(212, 168, 83, 0.5);  /* gold-glow-lg */
```

---

## 6. Regras de Uso

### DO (Faça)

- Sempre use "Pocket DM" com P e D maiúsculos
- Logo sempre com respiro mínimo (padding = 50% da altura do ícone)
- Tagline sempre em peso mais leve que o nome
- Em texto corrido, bold na primeira menção: **Pocket DM**
- Gold `#D4A853` é a cor da marca — use em todo ponto de contato principal

### DON'T (Não Faça)

- Nunca coloque o logo sobre fundo colorido que não seja dark ou branco
- Nunca integre a coroa ao dado — a coroa FLUTUA acima, separada
- Nunca use a tagline sem o nome junto
- Nunca substitua a Cinzel por outra serif no logo
- Nunca use gold como cor de texto corrido — é para destaques e brand elements
- Nunca escreva "PocketDM", "pocketDM", "pocket dm", ou "POCKET DM" (exceto no logo, que é uppercase por design)

---

## 7. Análise Competitiva Visual

| Concorrente         | Paleta            | Logo              | Gap                          |
| ------------------- | ----------------- | ----------------- | ---------------------------- |
| D&D Beyond          | Vermelho + branco | Tipográfico       | Corporativo, não premium     |
| Roll20              | Vermelho + preto  | d20 ícone         | Genérico, desktop-first      |
| Foundry VTT         | Laranja + cinza   | Bigorna/forja     | Técnico, complexo            |
| Improved Initiative | Verde + preto     | Minimal           | Sem identidade forte         |
| Owlbear Rodeo       | Azul pastel       | Mascote owlbear   | Casual, não premium          |
| **Pocket DM**       | **Gold + dark**   | **Crown d20**     | **Premium fantasy, mobile-first** |

---

## 8. Distinctive Brand Assets

1. **Crown d20 dourado flutuante** → Ícone único, coroa filled + d20 outlined
2. **Dark + Gold em contexto RPG** → Território visual exclusivo
3. **"Master your table"** → Tagline com triplo significado

---

*Documento criado em 2026-03-27. Atualizado 2026-03-28 com logo final (coroa flutuante triangular).*
