# Lair Actions & Regional Effects — Feature Documentation

**Data:** 2026-04-03
**Status:** Deployed

## Visao Geral

Monstros do D&D 5e que possuem um covil (lair) podem realizar Lair Actions e projetar Regional Effects na area ao redor. Essa feature adiciona suporte completo a esses dados no PocketDM, tanto na visualizacao das fichas quanto na mecanica de combate.

## O Que Sao Lair Actions e Regional Effects

### Lair Actions
- Acoes especiais que o monstro pode usar **quando estiver lutando dentro do seu covil**
- Acontecem na **initiative count 20** (perdendo empates de iniciativa)
- O monstro escolhe uma acao da lista — nao pode repetir a mesma duas rodadas seguidas
- Exemplos: Adult Blue Dragon pode causar desabamento do teto, nuvem de areia, ou arco de relampago

### Regional Effects
- Efeitos magicos passivos que afetam a **regiao ao redor do covil** (geralmente 1-6 milhas)
- Estao sempre ativos enquanto o monstro estiver vivo
- Desaparecem gradualmente se o monstro morrer
- Exemplos: Tempestades ao redor do covil de um Blue Dragon, vegetacao seca ao redor de um Vampire

## Cobertura de Dados

### Monstros SRD (334 base)

| Monstro | Lair Actions | Regional Effects |
|---------|:---:|:---:|
| Aboleth | 3 | 3 |
| Adult/Ancient Black Dragon | 3 | 3 |
| Adult/Ancient Blue Dragon | 3 | 3 |
| Adult/Ancient Green Dragon | 3 | 3 |
| Adult/Ancient Red Dragon | 3 | 3 |
| Adult/Ancient White Dragon | 3 | 3 |
| Adult/Ancient Brass Dragon | 2 | 3 |
| Adult/Ancient Bronze Dragon | 2 | 3 |
| Adult/Ancient Copper Dragon | 2 | 3 |
| Adult/Ancient Gold Dragon | 2 | 3 |
| Adult/Ancient Silver Dragon | 2 | 3 |
| Androsphinx | 4 | - |
| Gynosphinx | 4 | - |
| Kraken | 3 | 3 |
| Lich | 3 | 3 |
| Mummy Lord | 3 | 3 |
| Unicorn | 3 | 3 |
| Vampire (todas formas) | - | 4 |
| **Total SRD** | **30 monstros** | |

### Pack Completo (5etools, 3037 monstros)

Alem dos SRD acima, o pack completo inclui lair data para:
- Beholder + Death Tyrant (compartilham dados de lair)
- Todas variantes de Vampire (Spellcaster, Warrior, Infernalist, etc.)
- **Total pack completo: 66 monstros com lair/regional data**

## Arquitetura

### Dados

```
scripts/data/monster-lair-data.json    ← Dados curados (fonte verdade)
scripts/fetch-srd-data.ts             ← Merge lair data nos JSONs SRD
scripts/fetch-5etools-bestiary.ts      ← Merge lair data nos JSONs 5etools
public/srd/monsters-*.json             ← Bundles finais com lair data
```

**Por que dados curados?** A 5e-database upstream (API SRD) **nao inclui** lair actions — esse conteudo nao faz parte do SRD 5.1 aberto. Os dados foram curados manualmente a partir do Monster Manual.

### Schema

```typescript
// lib/srd/srd-loader.ts — SrdMonster interface
lair_actions?: MonsterAction[] | null;        // Array de {name, desc}
lair_actions_intro?: string | null;           // Texto introdutorio
regional_effects?: MonsterAction[] | null;    // Array de {name, desc}
regional_effects_intro?: string | null;       // Texto introdutorio + closing
```

```sql
-- supabase/migrations/077_monster_lair_data.sql
ALTER TABLE monsters
  ADD COLUMN IF NOT EXISTS lair_actions JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS lair_actions_intro TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS regional_effects JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS regional_effects_intro TEXT DEFAULT NULL;
```

### Matching Logic (getLairKey)

Monstros compartilham dados de lair por tipo:
- `adult-blue-dragon` e `ancient-blue-dragon` → `blue-dragon`
- `androsphinx` e `gynosphinx` → `sphinx`
- `vampire-*` (exceto spawn) → `vampire`
- `beholder` e `death-tyrant` → `beholder`

### Componentes de Renderizacao

| Componente | Onde aparece | Comportamento |
|-----------|-------------|--------------|
| `PublicMonsterStatBlock.tsx` | Compendium publico | Secoes separadas com DiceText (condicoes clicaveis) |
| `MonsterStatBlock.tsx` | Oracle/Combat (DM view) | Read-only, mesmas secoes |
| `stat-block-parser.ts` | Import de stat blocks | Extrai "Lair Actions" e "Regional Effects" como secoes |
| `StatBlockImporter.tsx` | Homebrew import | Passa lair/regional para o DB |

### i18n

Labels traduzidos em `PublicMonsterStatBlock.tsx`:
- EN: "Lair Actions" / "Regional Effects"
- PT-BR: "Acoes de Covil" / "Efeitos Regionais"

## Lair Actions no Combate (Initiative Count 20)

### Como Funciona

1. **DM adiciona** um monstro com lair_actions ao combate (qualquer modo: compendium search, grupo, encounter generator)
2. **Automaticamente** aparece uma entrada "Lair Actions" na ordem de iniciativa com initiative fixo em **20**
3. **Apenas uma** entrada por combate — mesmo com multiplos monstros com lair
4. Quando o turno chega na Lair Action:
   - A row fica destacada (tema amber/dourado)
   - DM clica para **expandir** e ver as lair actions disponiveis
   - DM escolhe uma e executa manualmente
   - DM avanca o turno com o botao ▶
5. DM pode **remover** a entrada manualmente via botao ✕

### Visual

- Icone de castelo (🏰)
- Badge de initiative "20" em amber
- Sem HP, AC, condicoes — nao e uma criatura
- Clicavel para expandir/colapsar a lista de lair actions
- Tema amber/dourado diferenciado do restante

### Tie-breaking (D&D 5e)

- `sortByInitiative()` em `lib/utils/initiative.ts` possui tiebreaker explicito
- Lair actions com initiative 20 sao colocadas DEPOIS de combatants reais no mesmo initiative
- `initiative_order: 999` como fallback adicional

### Auto-cleanup (Orphaned Entry)

- Quando o ultimo monstro com lair actions e removido do combate, a entrada e automaticamente removida
- `cleanupOrphanedLairEntry()` verifica via `hasAnyLairMonster()` (exclui monstros defeated)
- Integrado em `removeCombatant()` tanto no `combat-store` quanto no `guest-combat-store`

### Persistencia (Client-Side Only)

- A entrada sintetica **NAO** e persistida no Supabase (`is_lair_action` nao existe no DB schema)
- `combat-sync.ts` filtra entries com `is_lair_action` antes de enviar ao DB
- `hydrateCombatants()` re-cria a entrada automaticamente no reload se houver monstros com lair
- Guest mode: persiste via localStorage (Zustand persist middleware)

### i18n (Combat Tracker)

Chaves no namespace `combat` em `messages/{locale}.json`:
- `lair_actions_label` — "Lair Actions"
- `lair_actions_init_20` — "Initiative Count 20"
- `lair_actions_init_fixed` — "Init 20 (fixo)" / "Init 20 (fixed)"
- `lair_no_monsters` — Mensagem de empty state quando expandido sem monstros com lair

### Arquivos

```
lib/types/combat.ts              ← is_lair_action?: boolean no Combatant
lib/utils/lair-action.ts         ← Helpers: hasLairActions, createLairActionCombatant,
                                    cleanupOrphanedLairEntry, hasAnyLairMonster
lib/utils/initiative.ts          ← Tiebreak para lair actions no sortByInitiative
lib/stores/combat-store.ts       ← Cleanup em removeCombatant, re-create em hydrateCombatants
lib/stores/guest-combat-store.ts ← Cleanup em removeCombatant
lib/supabase/combat-sync.ts      ← Filtra lair entries antes de sync ao DB
components/combat/
  EncounterSetup.tsx              ← Auto-add em handleSelectMonster/Group
  CombatantRow.tsx                ← LairActionRow component (hooks-compliant, i18n, empty state)
  CombatantSetupRow.tsx           ← Row especial no setup (i18n)
components/guest/
  GuestCombatClient.tsx           ← Mesma logica (parity Guest/Auth)
messages/pt-BR.json               ← Chaves i18n
messages/en.json                  ← Chaves i18n
```

### Parity Rule

| Modo | Lair na ficha | Lair no combate |
|------|:---:|:---:|
| Guest (`/try`) | ✅ | ✅ |
| Anonimo (`/join`) | ✅ | ✅ (via DM) |
| Autenticado (`/invite`) | ✅ | ✅ |

## Como Adicionar Lair Data para Novos Monstros

1. Editar `scripts/data/monster-lair-data.json`
2. Adicionar nova entrada com a key sendo o slug do monstro
3. Se necessario, atualizar `getLairKey()` nos dois scripts de fetch
4. Rodar `npx tsx scripts/fetch-srd-data.ts` (SRD) ou `npx tsx scripts/fetch-5etools-bestiary.ts` (pack completo)
5. Verificar com: `node -e "const d=require('./public/srd/monsters-2014.json'); console.log(d.find(m=>m.id==='SLUG').lair_actions)"`

## Limitacoes Conhecidas

- **Lair actions nao sao automatizadas no combate** — o DM escolhe e executa manualmente (a entrada na initiative e informativa)
- **Regional effects sao apenas informativos** — nao afetam mecanicamente o combate
- **MAD monsters nao possuem lair data** — nao e padrao em homebrew
- **A entrada sintetica nao persiste no DB** — `is_lair_action` e client-side only, re-criada no hydrate
