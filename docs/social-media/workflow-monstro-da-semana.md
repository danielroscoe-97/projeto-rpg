# Workflow: Monstro da Semana

Guia completo para criar posts de "Monstro da Semana" no Instagram do Pocket DM (@pocket.dm).
Baseado no template do Owlbear (post-02) que ficou aprovado.

## Estrutura do Post (6 slides)

| Slide | Conteúdo | Fundo |
|-------|----------|-------|
| 1 | **Capa** — Arte do monstro, nome EN + PT-BR, token, CR | `#13131E` |
| 2 | **Stats EN** — Ficha completa em inglês, "DESLIZE PARA PT-BR →" | `#1A1A28` |
| 3 | **Stats PT-BR** — Ficha traduzida, badge "TRADUÇÃO PT-BR" | `#1A1A28` |
| 4 | **Táticas** — Como usar na mesa (3 dicas + combo sugerido) | `#1A1A28` |
| 5 | **Lore** — Citação do SRD + curiosidade | `#1A1A28` |
| 6 | **CTA** — "Vai usar [monstro]?", tradução PT-BR gratuita, link na bio | `#13131E` |

## Passo a passo

### 1. Baixar arte do monstro

```bash
# Substitua pelo nome exato do monstro (case-sensitive como no 5etools)
node docs/social-media/arts/fetch-monster-art.mjs "Ancient Red Dragon" MM

# Resultado em docs/social-media/arts/assets/
#   ancient-red-dragon.png      (ilustração completa, ~800x1000)
#   ancient-red-dragon-token.png (token circular, ~560x560)
```

**Fontes de arte por livro:**
- `MM` — Monster Manual (maioria dos monstros SRD)
- `VGM` — Volo's Guide to Monsters
- `MPMM` — Mordenkainen Presents: Monsters of the Multiverse
- `MTF` — Mordenkainen's Tome of Foes

Se o monstro nao tiver arte no 5etools, buscar alternativa:
1. Verificar se existe em outro livro (tentar VGM, MPMM)
2. Usar o token como fallback (já tem fundo transparente)

### 2. Copiar o template

```bash
# Copiar o template base do Owlbear
cp docs/social-media/arts/post-02-monstro-owlbear.html docs/social-media/arts/post-XX-monstro-SLUG.html
```

### 3. Substituir dados no HTML

Abrir o HTML e substituir em todos os slides:

**Slide 1 (Capa):**
- `assets/owlbear.png` → `assets/SLUG.png`
- `assets/owlbear-token.png` → `assets/SLUG-token.png`
- `OWLBEAR` → `NOME EN` (maiúsculo, Cinzel)
- `Urso-Coruja` → `NOME PT-BR`
- `Large Monstrosity` → `[Size] [Type]`
- `CR 3` → `CR X`

**Slide 2 (Stats EN):**
- Nome EN/PT-BR no header
- Token image path
- `CR X` / `ND X`
- HP, AC, Speed (valores reais do SRD)
- STR/DEX/CON/INT/WIS/CHA (valores reais)
- Ataques (nome, bonus, dano, tipo)
- Special traits

**Slide 3 (Stats PT-BR):**
- Mesmo layout, tudo traduzido:
  - HP → PV, AC → CA, Speed → Deslocamento
  - STR → FOR, DEX → DES, WIS → SAB, CHA → CAR
  - Attack names traduzidos
  - Damage types: piercing→perfurante, slashing→cortante, bludgeoning→contundente, fire→fogo, etc.
  - CR → ND
  - ft → m (dividir por ~3, arredondar: 30ft=9m, 40ft=12m, 60ft=18m)

**Slide 4 (Táticas):**
- 3 seções com SVG icons (não emojis):
  - TERRENO IDEAL — onde o monstro brilha
  - COMPORTAMENTO — como ele age em combate
  - HABILIDADE CHAVE — trait especial que define o combate
- COMBO SUGERIDO — combinação de monstros/terreno

**Slide 5 (Lore):**
- Citação do SRD em itálico (fonte: "SRD 5.1, Bestiário")
- Curiosidade com destaque dourado

**Slide 6 (CTA):**
- "Vai usar [Nome]?" com o nome em itálico dourado
- "Stat block completo traduzido para PT-BR"
- Badge verde: "Tradução PT-BR completa e gratuita"
- Botão: "GRATUITO · LINK NA BIO"

### 4. Atualizar dots de paginação

Todos os slides devem ter 6 dots, com o dot ativo correspondente ao slide atual:
- Slide 1: dot 1 ativo
- Slide 2: dot 2 ativo
- ...e assim por diante

### 5. Exportar PNGs

```bash
node docs/social-media/arts/export-organized.mjs
```

### 6. Verificar qualidade

Abrir cada PNG exportado e verificar:
- [ ] Fontes carregaram corretamente (sem palavras grudadas)
- [ ] Textos com acentos corretos
- [ ] Sem emojis (apenas SVGs)
- [ ] Sem travessões longos
- [ ] DICA/tip-box não está cortada ou colada no footer
- [ ] Espaçamento generoso (premium, não apertado)
- [ ] Token do monstro visível nos slides 1, 2 e 3
- [ ] Dots de paginação corretos (6 dots)
- [ ] @pocket.dm e watermark visíveis
- [ ] "DESLIZE PARA PT-BR →" no slide EN
- [ ] "TRADUÇÃO PT-BR" badge no slide PT-BR

### 7. Adicionar ao export map

No `export-organized.mjs`, adicionar entrada no `POST_MAP`:

```javascript
'post-XX-monstro-SLUG': { folder: 'XX-monstro-SLUG-srd', order: XX, desc: 'Carrossel 6 slides - Conteudo SRD' },
```

## Regras de texto

- Sem emojis. SVGs inline apenas.
- Sem travessões longos (`—`). Usar ponto final ou vírgula.
- Todos os acentos corretos em PT-BR.
- Copy sem cara de IA (sem superlativos vazios, sem "incrível", sem "revolucionário").
- Tom: direto, nerd com orgulho, funcional.

## Traduções padrão

| EN | PT-BR |
|----|-------|
| Hit Points (HP) | Pontos de Vida (PV) |
| Armor Class (AC) | Classe de Armadura (CA) |
| Speed | Deslocamento (Desl.) |
| Challenge Rating (CR) | Nível de Desafio (ND) |
| Strength (STR) | Força (FOR) |
| Dexterity (DEX) | Destreza (DES) |
| Constitution (CON) | Constituição (CON) |
| Intelligence (INT) | Inteligência (INT) |
| Wisdom (WIS) | Sabedoria (SAB) |
| Charisma (CHA) | Carisma (CAR) |
| Multiattack | Ataques Múltiplos |
| Melee Weapon Attack | Ataque com Arma Corpo a Corpo |
| Ranged Weapon Attack | Ataque com Arma à Distância |
| Saving Throw | Teste de Resistência |
| piercing | perfurante |
| slashing | cortante |
| bludgeoning | contundente |
| fire | fogo |
| cold | frio |
| lightning | relâmpago |
| thunder | trovão |
| poison | veneno |
| acid | ácido |
| necrotic | necrótico |
| radiant | radiante |
| psychic | psíquico |
| force | energia |
| Natural Armor | Armadura Natural |
| Keen Sight | Visão Aguçada |
| Keen Smell | Faro Aguçado |
| Keen Sight and Smell | Visão e Faro Aguçados |
| Darkvision | Visão no Escuro |
| Blindsight | Visão Cega |
| Tremorsense | Sentido Sísmico |
| Truesight | Visão Verdadeira |
| Legendary Actions | Ações Lendárias |
| Legendary Resistance | Resistência Lendária |
| Lair Actions | Ações de Covil |
| Frightful Presence | Presença Aterrorizante |
| Breath Weapon | Arma de Sopro |
| ft | m (dividir por ~3.28) |

## Conversão de distância

| ft | m |
|----|---|
| 5 | 1,5 |
| 10 | 3 |
| 15 | 4,5 |
| 20 | 6 |
| 25 | 7,5 |
| 30 | 9 |
| 40 | 12 |
| 50 | 15 |
| 60 | 18 |
| 80 | 24 |
| 90 | 27 |
| 100 | 30 |
| 120 | 36 |

## Fila de monstros por prioridade

### Tier S — Posts obrigatórios (engagement alto)

| # | Monstro | CR | Angulo | Slug |
|---|---------|-----|--------|------|
| 1 | Ancient Red Dragon | 24 | Boss final universal | ancient-red-dragon |
| 2 | Tarrasque | 30 | "Você sobreviveria?" | tarrasque |
| 3 | Lich | 21 | Vilão clássico | lich |
| 4 | Mimic | 2 | Meme tier, engagement fácil | mimic |

> Beholder (CR 13) **NAO está no SRD**. Não usar.

### Tier A — Visuais fortes / histórias prontas

| # | Monstro | CR | Angulo | Slug |
|---|---------|-----|--------|------|
| 5 | Kraken | 23 | Combate naval, épico | kraken |
| 6 | Hydra | 8 | Mecânica única (regeneração) | hydra |
| 7 | Chimera | 6 | Visual 3 cabeças | chimera |
| 8 | Medusa | 6 | Saving throw de CON, tensão | medusa |
| 9 | Minotaur | 3 | Labirintos, dungeons | minotaur |
| 10 | Vampire | 13 | Vilão recorrente, horror | vampire |
| 11 | Werewolf | 3 | Lycanthropy, mistério | werewolf |
| 12 | Death Knight | 17 | Boss épico, dark fantasy | death-knight |

### Tier B — Conteúdo educativo / dicas de DM

| # | Monstro | CR | Angulo | Slug |
|---|---------|-----|--------|------|
| 13 | Goblin | 1/4 | Primeiro inimigo de todo aventureiro | goblin |
| 14 | Skeleton | 1/4 | "Como fazer hordas interessantes" | skeleton |
| 15 | Zombie | 1/4 | Hordas + Undead Fortitude | zombie |
| 16 | Troll | 5 | "Seus jogadores sabem que fogo mata?" | troll |
| 17 | Rust Monster | 1/2 | "O monstro que fighters mais temem" | rust-monster |
| 18 | Gelatinous Cube | 2 | "O corredor tá vazio... será?" | gelatinous-cube |
| 19 | Flameskull | 4 | Puzzle + combate | flameskull |
| 20 | Doppelganger | 3 | Intriga, paranoia, plot twists | doppelganger |
| 21 | Oni | 7 | Vilão inteligente, infiltrador | oni |

## Cadência sugerida

- 1 monstro por semana (toda sexta-feira)
- Alternar tiers: S → A → B → A → S → B...
- Não postar dois monstros do mesmo CR seguidos
- Intercalar com posts de outros pilares (Dicas, Produto, Comunidade)

## Comandos rápidos

```bash
# 1. Baixar arte
node docs/social-media/arts/fetch-monster-art.mjs "Monster Name" MM

# 2. Exportar todos os posts
node docs/social-media/arts/export-organized.mjs

# 3. Ver exports organizados
ls docs/social-media/arts/exports/
```
