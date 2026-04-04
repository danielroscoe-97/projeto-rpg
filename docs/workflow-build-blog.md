# Workflow: Ficha de Personagem -> Blog Post de Build

Documento de referencia para gerar blog posts de builds otimizadas a partir de fichas de personagem (PDF).
Cada ficha gera **dois posts**: PT-BR e EN.

---

## 1. Pasta de Fichas

Os PDFs ficam em `public/fichas/`. Nomear como: `nome-personagem.pdf` (slug-friendly).

---

## 2. Etapa 1 — Extracao do PDF

Ler o PDF da ficha e extrair **todos** os campos abaixo:

| Campo | Exemplo |
|---|---|
| Nome do personagem | Capa Bachave |
| Raca (race) | Half-Orc |
| Classe(s) e subclasse(s) | Fighter (Champion) |
| Nivel (level) | 8 |
| Background | Soldier |
| Atributos (STR/DEX/CON/INT/WIS/CHA) | 18/14/16/10/12/8 |
| Metodo de atributos usado | Dados rolados (4d6 drop lowest) |
| Feats | Great Weapon Master, Sentinel |
| Equipamento relevante | Greatsword +1, Plate Armor |
| Spells (se houver) | — |
| Multiclass (se houver) | — |
| Proficiencias notaveis | Athletics, Intimidation |
| Jogador que criou a build | Dani Dias / Lucas Galupo / etc. |

---

## 3. Etapa 2 — Analise da Build

Com os dados extraidos, identificar:

1. **Foco de otimizacao**: DPR (damage per round)? Tank? Controle? Suporte? Utilidade? Nova/gimmick?
2. **Sinergias principais**: quais combinacoes de raca + classe + feats fazem a build funcionar
3. **Pontos fortes**: o que essa build faz melhor que a media
4. **Pontos fracos**: onde ela sofre (saves fracos, falta de range, etc.)
5. **Tier da subclasse**: onde a comunidade posiciona essa subclasse (S/A/B/C/D)

---

## 4. Etapa 3 — Reconstrucao Point Buy

**OBRIGATORIO em todo post.** Aviso padrao:

> *"Esta build foi criada com dados rolados (4d6 drop lowest). Abaixo mostramos como reconstrui-la usando Point Buy para quem prefere um metodo padronizado. As prioridades de atributo se mantem, com pequenos ajustes."*

### Algoritmo de reconstrucao:

1. **Base Point Buy**: 27 pontos, atributos entre 8 e 15 antes de bonus
2. **Aplicar bonus raciais (ASI)**:
   - Consultar a raca do personagem e seus +2/+1 (ou +1/+1/+1 com Tasha's)
   - Documentar: "Half-Orc: +2 STR, +1 CON"
3. **Aplicar ASIs de nivel**:
   - Niveis 4, 8, 12, 16, 19 (Fighter ganha extras em 6 e 14)
   - Decidir: +2 em um atributo OU +1/+1 OU feat que da +1
   - Documentar cada escolha por nivel
4. **Aplicar feats que alteram atributos**:
   - Resilient (+1 ao atributo escolhido)
   - Fey Touched, Shadow Touched (+1 INT/WIS/CHA)
   - Skill Expert (+1 qualquer)
   - Outros half-feats
5. **Verificar itens magicos** que alteram atributos:
   - Headband of Intellect (INT 19), Belt of Giant Strength, Amulet of Health, etc.
   - Se o personagem tem, documentar mas marcar como "dependente de item"
6. **Montar tabela comparativa**:

```
| Atributo | Rolled (original) | Point Buy (reconstruido) | Diferenca |
|----------|-------------------|--------------------------|-----------|
| STR      | 18                | 17                       | -1        |
| DEX      | 14                | 14                       |  0        |
| CON      | 16                | 16                       |  0        |
| INT      | 10                | 8                        | -2        |
| WIS      | 12                | 10                       | -2        |
| CHA      | 8                 | 8                        |  0        |
```

7. **Documentar trade-offs**: "Com Point Buy, voce perde 1 de STR e 2 de INT/WIS, mas a build continua funcional porque o core (STR + CON) se mantem intacto."

### Progressao completa de atributos:

Documentar nivel a nivel como os atributos evoluem:

```
Nivel 1:  Point Buy base (15/14/15/8/10/8) + racial (+2 STR, +1 CON) = 17/14/16/8/10/8
Nivel 4:  ASI +2 STR -> 19/14/16/8/10/8  OU  feat GWM (sem ASI)
Nivel 6:  (Fighter extra) ASI +1 STR +1 CON -> 20/14/17/8/10/8
...
```

---

## 5. Etapa 4 — Pesquisa Externa

Pesquisar na internet builds similares para contextualizar:

### Fontes obrigatorias:
1. **RPGBot** (rpgbot.net) — guides de classe/subclasse, tier ratings
2. **TabletopBuilds** (tabletopbuilds.com) — builds otimizadas, benchmark DPR
3. **r/3d6** (reddit.com/r/3d6) — discussoes da comunidade de otimizacao
4. **Treantmonk's Temple** — tier lists de subclasses em video

### O que buscar:
- Rating/tier da subclasse escolhida
- Builds populares com a mesma classe+raca
- Combos de feats recomendados pela comunidade
- DPR benchmarks para o nivel do personagem
- Opinioes divergentes ("e considered fraco mas funciona porque...")

### Como integrar no post:
- "A comunidade internacional considera Champion Fighter um tier [X]. Aqui esta como implementamos na mesa e por que funciona."
- Linkar fontes quando relevante (nao copiar conteudo)
- Se a build diverge do meta, explicar a decisao consciente

---

## 6. Etapa 5 — Template do Blog Post

### Estrutura PT-BR:

```
---
Slug: build-[raca]-[classe]-nivel-[X]-[foco]
Titulo: "[Raca] [Classe] Nivel [X] — Build Otimizada para [Foco]"
Descricao: "Build otimizada de [Raca] [Classe] nivel [X] para D&D 5e.
  [Frase sobre o foco]. Com versao Point Buy e dados rolados."
Categoria: build
Reading time: calcular (~10-14 min)
Keywords PT:
  - "build [classe] D&D 5e"
  - "build [classe] [subclasse] D&D 5e"
  - "ficha pronta [classe] D&D 5e"
  - "personagem [raca] [classe] D&D"
  - "[classe] nivel [X] build"
  - "[subclasse] build D&D 5e"
  - "point buy [classe] D&D 5e"
  - "build otimizada [classe]"
ogTitle: "[Raca] [Classe] Nivel [X] — Build para [Foco] | Pocket DM"
---
```

### Secoes do post (nesta ordem):

#### Abertura: Frase do Personagem
> *"[Frase iconica do personagem]"* — [Nome do Personagem]

Paragrafo de abertura: quem e esse personagem em 2-3 frases, e por que essa build e interessante.

---

#### Secao 1: Resumo da Build
Tabela-resumo rapida:

| | |
|---|---|
| **Raca** | Half-Orc |
| **Classe** | Fighter (Champion) 8 |
| **Foco** | DPR corpo-a-corpo |
| **Feats** | GWM, Sentinel |
| **Dificuldade de jogar** | Facil / Medio / Dificil |

---

#### Secao 2: Atributos — Dados Rolados vs Point Buy

- Aviso padrao (ver Etapa 3)
- Tabela comparativa rolled vs point buy
- Progressao de atributos nivel a nivel
- Trade-offs documentados

---

#### Secao 3: Por Que Essas Escolhas?

- Raca: por que essa raca para essa classe
- Subclasse: o que ela traz pra build
- Feats: por que cada feat foi escolhido e em qual nivel
- Background: como complementa a build

---

#### Secao 4: Combate — O Que Essa Build Faz de Melhor

- Rotacao de combate tipica (round 1, round 2, etc.)
- DPR estimado no nivel atual
- Situacoes onde a build brilha
- Situacoes onde a build sofre e como mitigar

---

#### Secao 5: Comparacao com Builds Populares

- Dados da pesquisa externa (Etapa 4)
- Tier da subclasse segundo a comunidade
- Como essa build se compara ao "meta"
- O que foi escolhido diferente e por que

---

#### Secao 6: Progressao — Para Onde Ir nos Proximos Niveis

- Proximos ASIs/feats recomendados
- Quando pegar multiclass (se aplicavel)
- Como a build escala do nivel atual ate 20
- Itens magicos que complementam

---

#### Secao 7: A Historia de [Nome do Personagem]

**Tom**: narrativo, em terceira pessoa, como se contasse uma lenda.
**Tamanho**: 3-4 paragrafos.
**Regras**:
- Sem spoilers da campanha
- Contar em linhas gerais: quem era, de onde veio, o que enfrentou
- Momentos marcantes (sem revelar desfechos)
- Como a build se refletiu na historia ("seu treinamento marcial o preparou para...")
- Credito ao jogador: "Build criada e jogada por [Nome do Jogador]"

---

#### Secao 8: CTA — Baixe a Ficha

```
Gostou dessa build?

- Baixe a ficha completa em PDF [link para /fichas/nome-personagem.pdf]
- Monte o encontro perfeito para testar essa build — use o Pocket DM gratuitamente
- [Botao: Testar Gratis -> /try]
- [Botao: Criar Conta -> /auth/login]
```

---

## 7. Versao EN (Ingles)

Gerar uma versao **completa em ingles** do mesmo post, nao apenas traduzida mas **localizada**:

### Diferencas na versao EN:

```
---
Slug: build-[race]-[class]-level-[X]-[focus]
Title: "[Race] [Class] Level [X] — Optimized Build for [Focus]"
Description: "Optimized [Race] [Class] level [X] build for D&D 5e.
  [Focus sentence]. Includes Point Buy and rolled stats versions."
Category: build
Keywords EN:
  - "[class] build D&D 5e"
  - "[class] [subclass] build D&D 5e"
  - "[class] character sheet D&D 5e"
  - "[race] [class] D&D build"
  - "level [X] [class] build"
  - "[subclass] build guide D&D 5e"
  - "point buy [class] D&D 5e"
  - "optimized [class] build"
ogTitle: "[Race] [Class] Level [X] — [Focus] Build | Pocket DM"
---
```

### Regras de localizacao:
- Termos tecnicos em ingles nativo (nao traduzir "Great Weapon Master" pro PT, por ex.)
- Adaptar referencias culturais se necessario
- Usar nomenclatura padrao da comunidade EN (DPR, AC, HP, etc.)
- Manter a mesma estrutura de secoes
- Historia do personagem tambem em ingles, mesmo tom narrativo
- Keywords devem ser pesquisadas separadamente (volume EN e diferente de PT)

---

## 8. SEO Checklist

Antes de publicar, verificar:

- [ ] Titulo com menos de 60 caracteres (sem o "| Pocket DM")
- [ ] Meta description com 120-155 caracteres
- [ ] H2s contem keywords primarias
- [ ] Slug contem classe + nivel + foco
- [ ] Keywords incluem subclasse especifica (ex: "Champion Fighter", "Draconic Sorcerer")
- [ ] Keywords incluem nivel especifico (ex: "level 8 fighter build")
- [ ] Tabela de atributos presente (Google adora tabelas)
- [ ] Links internos: pelo menos 2 links para outros posts do blog
- [ ] Link para compendio do Pocket DM quando mencionar monstros/magias
- [ ] CTA com link para /try e /auth/login
- [ ] Ambas versoes (PT + EN) geradas

---

## 9. Implementacao Tecnica

### Categoria no blog system:

Adicionar `"build"` em `lib/blog/posts.ts`:

```ts
export type BlogCategory = "tutorial" | "guia" | "lista" | "comparativo" | "build";

export const BLOG_CATEGORIES: Record<BlogCategory, string> = {
  tutorial: "Tutorial",
  guia: "Guia",
  lista: "Lista",
  comparativo: "Comparativo",
  build: "Build",
};
```

### Novo post entry:

```ts
{
  slug: "build-half-orc-fighter-nivel-8-dpr",
  title: "Half-Orc Fighter (Champion) Nivel 8 — Build Otimizada para DPR",
  description: "Build otimizada de Half-Orc Fighter Champion nivel 8 para D&D 5e. Foco em dano corpo-a-corpo com GWM e Sentinel. Com versao Point Buy e dados rolados.",
  date: "2026-04-XX",
  readingTime: "12 min",
  keywords: [
    "build fighter D&D 5e",
    "build fighter champion D&D 5e",
    "ficha pronta fighter D&D 5e",
    "personagem half-orc fighter",
    "fighter nivel 8 build",
    "champion fighter build D&D 5e",
    "point buy fighter D&D 5e",
    "build otimizada fighter",
  ],
  ogTitle: "Half-Orc Fighter Nivel 8 — Build para DPR | Pocket DM",
  category: "build",
}
```

### Componente do post:

Criar em `components/blog/BlogPostContent.tsx` seguindo o padrao existente (usar H2, H3, P, Ul, Li, Tip, etc.).

### PDF da ficha:

Colocar em `public/fichas/[nome-personagem].pdf` e linkar no CTA do post.

---

## 10. Checklist de Execucao (por ficha)

Quando uma nova ficha chegar:

1. [ ] Receber PDF e colocar em `public/fichas/`
2. [ ] Ler e extrair todos os campos (Etapa 1)
3. [ ] Analisar a build (Etapa 2)
4. [ ] Reconstruir Point Buy (Etapa 3)
5. [ ] Pesquisar builds similares (Etapa 4)
6. [ ] Escrever post PT-BR seguindo template (Etapa 5)
7. [ ] Escrever post EN seguindo localizacao (Etapa 7)
8. [ ] Passar pelo SEO checklist (Etapa 8)
9. [ ] Adicionar entry em `lib/blog/posts.ts`
10. [ ] Adicionar componente em `BlogPostContent.tsx`
11. [ ] Mapear no `CONTENT_MAP` em `app/blog/[slug]/page.tsx`
12. [ ] Importar os componentes no import do `page.tsx`
13. [ ] Verificar build: `next build`
14. [ ] Commit e deploy

---

## 11. Licoes Aprendidas (atualizado apos primeiro post: Capa Barsavi)

### Sobre extracao de fichas

- Fichas podem vir em **multiplos PDFs por nivel** (ex: Level 5, 6, 7, 8, 10). Ler TODOS.
- Frequentemente vem tambem um **docx com backstory** e um **PNG com art** — verificar pasta inteira.
- A notacao de classe no PDF pode ter typos (ex: "Sorc 7" quando deveria ser "Sorc 6"). Validar pela contagem de HP, spell slots, e features.
- Hit Dice no PDF podem mostrar os **restantes**, nao os totais. Nao confiar cegamente.
- O campo de Sorcery Points, Pearl of Power, Bloodwell Vial e Favored by the Gods aparece como circulos (O) na ficha — ler com atencao.

### Sobre reconstrucao de Point Buy

- **Perguntar ao jogador** qual +1 racial foi pra qual stat — nao tentar adivinhar. Principalmente pra Half-Elf (2 escolhas livres).
- Verificar a **ordem de aplicacao**: racial -> ASI de nivel (feats) -> itens magicos (Tomes, etc.)
- O cost de Point Buy (tabela de referencia):
  - 8=0, 9=1, 10=2, 11=3, 12=4, 13=5, 14=7, 15=9 (total: 27 pontos)
- Se sobrar 1 ponto depois de priorizar stats, colocar em INT ou STR (dump stats) para nao desperdicar.
- **Documentar o trade-off principal** em uma frase clara (ex: "CON +3 vs +4, -1 HP/nivel, -1 concentration saves").

### Sobre copyright e nomes

- **NUNCA** usar nomes de cenarios, cidades, deuses ou NPCs da Wizards of the Coast:
  - Barovia, Strahd, Waterdeep, Neverwinter, Baldur's Gate, Tyr, Mystra, Vallaki, etc.
- Generalizar para: "terras sombrias", "um deus da ordem", "uma academia arcana", etc.
- "D&D 5e" pode ser usado (e um produto, nao IP de cenario).
- Nomes de mecanicas (Divine Soul Sorcerer, Order Domain, Voice of Authority) sao seguros — sao OGL/SRD.

### Sobre o formato do post

- A **frase de abertura** do personagem funciona muito bem como elemento visual — manter sempre.
- A secao de **historia** no final complementa sem atrapalhar quem so quer a build.
- O **credito ao jogador** deve ser simples: "Build criada e jogada por [Nome]"
- O CTA deve ter **dois botoes**: "Testar Gratis" (/try) + "Criar Conta" (/auth/login)
- Usar entidades HTML para simbolos especiais no JSX: `&minus;`, `&dagger;`, `&Dagger;`, `&middot;`, `&rarr;`, `&ldquo;`, `&rdquo;`, `&apos;`, `&amp;`

### Sobre o slug e SEO

- Slug PT nao precisa de "pt" — o padrao e portugues: `build-half-elf-order-cleric-divine-soul-sorcerer`
- Slug EN leva "-en" no final: `build-half-elf-order-cleric-divine-soul-sorcerer-en`
- Incluir AMBAS subclasses no slug quando e multiclass
- Nao incluir nivel no slug (pode mudar se o jogador continuar jogando)
- Keywords devem incluir: subclasse completa, "point buy", "ficha pronta" (PT) / "character sheet" (EN)

### Sobre multiclass

- Para multiclass, documentar a **progressao de classe** nivel a nivel (quando pegou cada nivel em cada classe)
- Documentar em qual nivel de CLASSE (nao personagem) cada ASI foi pego
- A tabela de spell slots para multiclass segue a tabela de multiclass do PHB, nao a soma das tabelas individuais
