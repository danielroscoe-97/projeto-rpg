# Workflow e Boas Praticas: Reels Pocket DM

> Padrao de qualidade para TODOS os Reels animados em HTML.
> Baseado no estilo aprovado do R3 (Top 5 Monstros).

---

## 1. Specs Tecnicas Obrigatorias

| Item | Valor |
|---|---|
| Resolucao | 1080x1920 (9:16 vertical) |
| Duracao ideal | 25-35 segundos |
| Safe zone topo | 200px (interface do Instagram/TikTok) |
| Safe zone fundo | 320px (botoes, legenda, @) |
| Formato final | Screen recording do HTML (OBS ou similar) |
| Audio | Adicionar no CapCut pos-gravacao (musica trending ou epica) |

---

## 2. Estrutura de 3 Atos (obrigatoria)

```
ATO 1 -- HOOK (0-4s)
  Texto forte na tela, prende atencao nos primeiros 3 segundos.
  Visual impactante. Sem enrolacao.

ATO 2 -- CONTEUDO (4-28s)
  Revelacao de conteudo com transicoes dramaticas.
  Cada "cena" tem 4-6 segundos (nao apressar).
  Textos legíveis, stats claros, frases de impacto.

ATO 3 -- CTA (28-35s)
  Logo Crown d20 com glow.
  "POCKET DM" + "Master your table."
  Subtexto: chamada para acao (link na bio, vote, etc.)
```

---

## 3. Timing por Cena

| Tipo de cena | Duracao minima | Duracao ideal |
|---|---|---|
| Intro/Hook | 3s | 4s |
| Monstro/personagem reveal | 4s | 5s |
| Monstro #1 (destaque) | 5s | 6s |
| CTA final | 3s | 5s |

Regra: o espectador precisa ter tempo de LER todos os textos da cena antes dela sumir.

---

## 4. Efeitos Visuais Obrigatorios

### Fundo
- Background: gradiente radial escuro (`#070710` para `#12111E`)
- Vinheta: `radial-gradient` escurecendo as bordas
- Scan lines: linhas horizontais sutis (3px repeat, 15% opacidade)
- Borda pulsante: 1px solid gold com animacao `borderPulse`

### Particulas
- Minimo 15 particulas flutuantes douradas
- Tamanhos variados (2px a 7px)
- As maiores (6-7px) tem `box-shadow: 0 0 8px #D4A853`
- Animacao: subindo do fundo (`particleRise`), duracao 5-11s variada

### Glow do monstro
- Radial gradient dourado atras da arte (700x700px)
- Opacidade: 20% no centro
- Animacao: `glowReveal` com scale de 0.5 para 1

### Energy ring
- Circulo com borda dourada (2px) atras do monstro
- `box-shadow` interno e externo dourado
- Animacao: `ringPulse` expandindo e sumindo

### Speed lines
- `conic-gradient` radial saindo do centro do monstro
- Flash de 1-1.5s no reveal, depois some

### Impact flash
- Flash dourado (nao branco) na tela inteira no momento do reveal
- `mix-blend-mode: screen`
- Duracao: 0.3s

### Ornamentos nos cantos
- SVG com formato L + circulo dourado
- Opacidade: 20%
- Presentes nos 4 cantos

---

## 5. Tipografia

| Elemento | Fonte | Tamanho | Cor |
|---|---|---|---|
| Titulo principal | Cinzel 900 | 68-88px | Gold `#D4A853` com text-shadow glow |
| Nome do monstro | Cinzel 900 | 50-68px | Gold `#D4A853` com text-shadow |
| Stats (CR, HP, AC) | JetBrains Mono 700 | 52px | Creme `#E8E6E0` com text-shadow |
| Labels (CR, HP, AC) | JetBrains Mono | 18px | Cinza `#9896A0` |
| Texto vermelho (skills) | Plus Jakarta Sans 700 | 24px | Vermelho `#EF4444` com text-shadow |
| Frase de impacto | Plus Jakarta Sans 600 italic | 26px | Creme 60% opacidade |
| Subtextos | Plus Jakarta Sans 600 | 22-28px | Cinza `#9896A0` |
| Badge (#1, #2...) | JetBrains Mono 700 | 32px | Gold com borda |
| Watermark | Plus Jakarta Sans | 22px | Gold 35% opacidade |

### Regras de texto
- Acentuação correta SEMPRE (é, á, ã, õ, ç, ê, etc.)
- Sem emojis (SVGs apenas)
- Sem travessões longos
- Texto dentro da safe zone (200px topo, 320px fundo)
- Legível em tela de celular pequeno

### Termos PROIBIDOS (shadowban no Instagram)

Nunca usar essas palavras em captions, textos de Reels ou hashtags:

| Proibido | Alternativa |
|---|---|
| morte, morrer | derrota, cair, fim de linha |
| matar | derrotar, vencer, abater |
| sangue | dano, ferimento |
| violência | combate, confronto |
| assassino | caçador, eliminador |
| suicídio | sacrifício (com contexto RPG) |
| arma | equipamento, item, arsenal |

Regra geral: se a palavra soa violenta fora do contexto RPG, trocar por alternativa.

---

## 6. Animacoes Padrao

| Animacao | Uso | Duracao |
|---|---|---|
| `slamIn` | Titulos, badges (escala 2.5 → 0.9 → 1.05 → 1) | 0.4-0.6s |
| `monsterReveal` | Arte do monstro (scale 0 + rotate → bounce) | 0.7-0.8s |
| `slideUp` | Stats, textos secundarios (sobe 40px com fade) | 0.3-0.4s |
| `fadeIn` | Elementos suaves (glow, frases) | 0.3-0.5s |
| `fadeInOut` | Cenas inteiras (fade in, permanece, fade out) | Duracao da cena |
| `separatorGrow` | Linha dourada expandindo do centro | 0.3-0.5s |
| `flashIn` | Impact flash no reveal | 0.3s |
| `ringPulse` | Energy ring expandindo e sumindo | 1.2-1.5s |
| `glowReveal` | Glow radial aparecendo | 0.5-0.6s |
| `speedLinesIn` | Speed lines radiais no reveal | 1-1.5s |
| `borderPulse` | Borda pulsando (loop infinito) | 3s |
| `particleRise` | Particulas subindo (loop infinito) | 5-11s |

### Sequencia de entrada por cena (ordem)

```
0.0s  Impact flash
0.0s  Speed lines radiais
0.1s  Energy ring pulse
0.1s  Rank number background (gigante, 6% opacidade)
0.2s  Monster glow reveal
0.2s  Rank badge (#N) slam in
0.4s  Monster art reveal (bounce)
1.2s  Monster name slide up
1.5s  Separator grow
1.7s  Stats slide up
2.2s  Danger text slide up
2.7s  Impact phrase fade in
```

---

## 7. Paleta de Cores

| Cor | Hex | Uso |
|---|---|---|
| BG Deep | `#070710` | Fundo principal |
| BG Surface | `#12111E` | Centro do gradiente |
| Gold | `#D4A853` | Titulos, glow, particulas, bordas |
| Gold Light | `#E8C87A` | Gradientes |
| Gold Dark | `#B8903D` | Sombras |
| Creme | `#E8E6E0` | Texto principal |
| Cinza | `#9896A0` | Subtextos, labels |
| Vermelho | `#EF4444` | Danger text, skills |

---

## 8. Checklist Pre-Producao

```
ROTEIRO
[ ] Hook definido (texto que prende em 3s)
[ ] Conteudo principal (monstros, build, ranking)
[ ] Frase de impacto por cena
[ ] CTA final definido

HTML
[ ] Resolucao 1080x1920
[ ] Background com gradiente radial escuro
[ ] Vinheta nas bordas
[ ] Scan lines
[ ] 15+ particulas flutuantes
[ ] Ornamentos nos 4 cantos
[ ] Borda pulsante
[ ] Glow radial atras do conteudo principal
[ ] Energy ring no reveal
[ ] Speed lines no reveal
[ ] Impact flash no reveal
[ ] Watermark @pocket.dm
[ ] Acentuacao correta em todos os textos
[ ] Safe zones respeitadas (200px topo, 320px fundo)
[ ] Timing: 4-6s por cena, total 25-35s

GRAVACAO
[ ] Screen recording em 1080x1920 (vertical)
[ ] HTML auto-play do inicio ao fim sem interrupcao
[ ] Exportar video sem compressao

POS-PRODUCAO (CapCut)
[ ] Musica adicionada (trending ou epica instrumental)
[ ] Sincronizar beat da musica com reveals
[ ] Legenda automatica (se tiver narracao)
[ ] Exportar 1080x1920

PUBLICACAO
[ ] Caption escrita (IG, FB, TikTok)
[ ] 3-4 hashtags (#PocketDM #DnD5e #RPGBrasil #MestreDeRPG)
[ ] Publicar: IG Reels → TikTok → YouTube Short → FB
[ ] Responder comentarios nos primeiros 60 min
```

---

## 9. Formatos de Reel Aprovados

| Formato | Descricao | Exemplo |
|---|---|---|
| **Top N Ranking** | Countdown com reveals dramaticos | R3: Top 5 Monstros |
| **Spotlight** | 1 monstro/personagem/build em destaque | R5: Build Capa Barsavi |
| **Twist Reveal** | Suspense com revelacao surpresa | R4: Seu Bau e um Mimic |
| **Comparacao** | Antes vs Depois / X vs Y | R2: Nossa Mesa vs Normal |
| **App Demo** | Screen recording animado do app | R1: O que e o Pocket DM |
| **Ranking Interativo** | Top N com CTA pra votar | R6: Top 5 Magias Xeretas |

---

## 10. Arquivos de Referencia

| Arquivo | Conteudo |
|---|---|
| `reel-03-top5-monstros.html` | Template aprovado (Top 5 Ranking) |
| `assets/` | Artes de monstros (PNG) |
| `public/art/blog/capa-barsavi-portrait.png` | Arte do Capa Barsavi |
| `public/art/brand/logo-icon.svg` | Crown d20 logo |
| `brand-social-guidelines.md` | Regras gerais de marca |
| `design-system-social.md` | Design system completo |

---

> Ultima atualizacao: 2026-04-12
