# Compendium i18n Audit — 2026-04-12

## O que foi feito nesta sessao

### 1. Contagem dinamica de monstros no hero
- O numero "776 monstros" no hero agora atualiza quando o usuario loga (mostra ~4472)
- Componente `MonsterHeroCount` + store `monster-count-store.ts` (useSyncExternalStore)
- `CompendiumMonsterHydrator` chama `setHeroMonsterCount()` ao carregar dados completos

### 2. Aspas removidas dos nomes de monstros
- `cleanDisplayName()` em `lib/utils/monster.ts` remove aspas retas e curly quotes
- Afeta: "The Demogorgon" e "Size-of-a-Field" Mouse
- Aplicado no displayName, subtitleName e agrupamento alfabetico

### 3. Letras acentuadas agrupadas (A+A, I+I)
- `baseFirstLetter()` normaliza via NFD decomposition
- Monstros como "Arvore Desperta" (A) e "Incubo" (I) agora ficam nos grupos A e I

### 4. Filtro de CR com selecao de valores
- Dois `<select>` dropdowns (Min / Max) com 31 valores: 0, 1/8, 1/4, 1/2, 1..30
- Substituiu os chips de range fixo (0-1, 2-4, etc.)
- Auto-corrige min > max e vice-versa

### 5. Traducao PT-BR de nomes de monstros
- Script: `scripts/translate-monster-names.ts` (dicionario + regex, sem API)
- Resultado: **4085/4085 monstros com nome PT-BR** (antes: 731)
  - 738 traducoes manuais preservadas (com abilities/actions)
  - 1382 traduzidos por padroes
  - 1955 nomes proprios mantidos como-is (NPCs)
- Para re-rodar: `npx tsx scripts/translate-monster-names.ts --force`

---

## Auditoria de paginas do compendio — Status de traducao

### Totalmente traduzidos (EN + PT com dados)

| Conteudo | Rota EN | Rota PT | Dados PT | Status |
|----------|---------|---------|----------|--------|
| Monstros | /monsters | /monstros | monster-descriptions-pt.json, monster-names-pt.json | COMPLETO |
| Magias | /spells | /magias | spell-descriptions-pt.json, spell-names-pt.json | COMPLETO (~198 SRD) |

### UI traduzida, dados em ingles (GAP)

| Conteudo | Rota EN | Rota PT | Itens | Prioridade |
|----------|---------|---------|-------|------------|
| Itens | /items | /itens | ~1164 SRD | MEDIA |
| Talentos | /feats | /talentos | 265 SRD | MEDIA |
| Racas | /races | /racas | 9 core + subraces | MEDIA |
| Classes | /classes | /classes-pt | 12 classes + features | MEDIA |
| Antecedentes | /backgrounds | /antecedentes | 156 SRD | BAIXA |
| Condicoes | /conditions | /condicoes | ~64 tipos | BAIXA |
| Doencas | /diseases | /doencas | subset de conditions | BAIXA |

### Estaticos — sem gap de traducao

| Conteudo | Rota EN | Rota PT | Status |
|----------|---------|---------|--------|
| Acoes | /actions | /acoes-em-combate | COMPLETO (hardcoded) |
| Atributos | /ability-scores | /atributos | COMPLETO (hardcoded) |
| Tipos de dano | /damage-types | /tipos-de-dano | COMPLETO (hardcoded) |

---

## Fontes externas de traducao PT-BR

### Usaveis em paginas publicas (licenca CC)

| Fonte | Conteudo | Licenca | URL |
|-------|----------|---------|-----|
| Artificio RPG SRD 5.2 PT-BR | SRD completo (monstros, magias, itens, classes) | CC-BY-4.0 | https://artificiorpg.com/dd/dnd-srd-52-portugues-download/ |
| Aventureiros dos Reinos | 400+ termos traduzidos | Creative Commons (variante nao especificada) | https://aventureirosdosreinos.com/tabela-de-traducoes/ |

### Usaveis apenas em conteudo auth-gated

| Fonte | Conteudo | Formato | URL |
|-------|----------|---------|-----|
| decito/dnd5e-pt-br (Foundry VTT) | 331 monstros, 319 magias, 791 itens em JSON | JSON estruturado | https://github.com/decito/dnd5e-pt-br |
| comic-code Gist | 318 magias com descricoes completas | JSON array | https://gist.github.com/comic-code/e7693a7ff162c4cf9726e682445fc57f |
| Guia do Tiferino | Dicionario oficial Galapagos | PDF (DMsGuild) | https://www.dmsguild.com/product/308596 |

### Apenas referencia (NAO usar diretamente)

| Fonte | Motivo |
|-------|--------|
| Galapagos Jogos (publicacoes oficiais) | Copyright — convencoes oficiais sao referencia |
| 5etools PT-BR mirrors | Dados em ingles, traducao e so UI |
| hotaydev/dnd-beyond-kit | Frases de UI, nao nomes de monstros/magias |

---

## Proximos passos recomendados

1. **Extrair traducoes do Artificio RPG SRD 5.2 PDF** (CC-BY-4.0) — unica fonte segura para paginas publicas
2. **Cross-validar nossas traducoes** com o repo decito/dnd5e-pt-br para qualidade
3. **Criar scripts similares ao translate-monster-names.ts** para: magias, itens, talentos, racas
4. **Priorizar**: Magias (gap de ~163 SRD) > Itens > Talentos > Racas > Classes > Antecedentes > Condicoes

---

## Arquivos modificados nesta sessao

- `components/public/MonsterHeroCount.tsx` — NOVO
- `lib/stores/monster-count-store.ts` — NOVO
- `scripts/translate-monster-names.ts` — NOVO (reescrito, sem API)
- `app/monsters/page.tsx` — MonsterHeroCount
- `app/monstros/page.tsx` — MonsterHeroCount
- `components/public/CompendiumMonsterHydrator.tsx` — setHeroMonsterCount
- `components/public/PublicMonsterGrid.tsx` — CR filter, cleanDisplayName, baseFirstLetter
- `lib/utils/monster.ts` — ALL_CR_VALUES, cleanDisplayName, baseFirstLetter
- `data/srd/monster-descriptions-pt.json` — 4085 nomes PT-BR
- `data/srd/monster-names-pt.json` — slug mappings atualizados

Commit: `5fab53a`
