# Epic — SEO Supremo: Compêndio Público Completo

## Visão

Transformar o Pocket DM no melhor compêndio D&D 5e bilíngue (EN + PT-BR) da internet, com ferramentas interativas que nenhum concorrente oferece na mesma estética. Cada página é uma porta de entrada para o combat tracker.

## Regras Imutáveis

- **SRD/CC only**: Apenas conteúdo SRD 5.1 (CC-BY-4.0) + SRD 2024 (CC-BY-4.0) + MAD (CC) em páginas públicas
- **Bilíngue**: Toda página tem versão EN + PT-BR com alternates/canonical
- **JSON-LD**: Schema.org em todas as páginas para rich snippets
- **Estética**: Dark theme, gold accents, Cinzel headings — identidade visual Pocket DM
- **Funcionalidade**: Cada página tem pelo menos 1 feature interativa que concorrentes não têm
- **CTA**: Toda página termina com PublicCTA direcionando ao combat tracker

## Páginas do Compêndio

### Wave 1 — Já Implementado (SEO Wave 1 + 2)
| Página | Rota EN | Rota PT | Status |
|--------|---------|---------|--------|
| Monster Stat Blocks | `/monsters/[slug]` | `/monstros/[slug]` | ✅ Live |
| Monster Index | `/monsters` | `/monstros` | ✅ Live |
| Spell Cards | `/spells/[slug]` | `/magias/[slug]` | ✅ Live |
| Spell Index | `/spells` | `/magias` | ✅ Live |
| Conditions | `/conditions` | `/condicoes` | ✅ Pronto (Wave 2) |

### Wave 2 — Data-Ready (dados já existem, implementação rápida)
| Página | Rota EN | Rota PT | Dados | Diferencial |
|--------|---------|---------|-------|-------------|
| Diseases | `/diseases` | `/doencas` | `conditions.json` (category: "disease") | Toggle 2014/2024, busca por sintoma |
| Damage Types | `/damage-types` | `/tipos-de-dano` | `dnd-terms-ptbr.ts` | Visual cards com interações (resistência/imunidade/vulnerabilidade) |
| Ability Scores | `/ability-scores` | `/atributos` | Inline (6 abilities SRD) | Calculadora de modificador interativa |
| Actions in Combat | `/actions` | `/acoes-em-combate` | Inline (10 actions SRD) | Flowchart visual de turno |

### Wave 3 — Ferramentas Interativas (diferencial competitivo)
| Página | Rota EN | Rota PT | Dados | Diferencial |
|--------|---------|---------|-------|-------------|
| Dice Roller | `/dice` | `/dados` | Componentes existentes (`DiceText`, `ClickableRoll`) | Roller visual com histórico, presets por spell/weapon, compartilhável |
| Encounter Builder | `/encounter-builder` | `/calculadora-encontro` | CR/XP dos monstros SRD | Calculadora de dificuldade, sugestão de monstros por tema, party size |

### Wave 4 — Compêndio Expandido (mais conteúdo SRD)
| Página | Rota EN | Rota PT | Dados | Diferencial |
|--------|---------|---------|-------|-------------|
| Classes | `/classes` + `/classes/[name]` | `/classes` + `/classes/[nome]` | Novo `classes-srd.json` (13 classes SRD) | Features por nível, spell list linkada |
| Races/Species | `/races` + `/races/[name]` | `/racas` + `/racas/[nome]` | Novo `races-srd.json` (~9 races SRD) | Traits visuais, racial features |
| Rules Reference | `/rules` | `/regras` | Inline (combat, rest, movement) | Busca rápida, bookmarkable sections |

## Dados SRD Permitidos (Fonte: SRD 5.1 CC-BY-4.0)

### Classes SRD (13)
Barbarian, Bard, Cleric, Druid, Fighter, Monk, Paladin, Ranger, Rogue, Sorcerer, Warlock, Wizard
- Cada uma tem: hit die, proficiencies, features por nível, spellcasting (se aplicável)
- SRD inclui 1 subclass por classe

### Races SRD (9)
Dwarf (Hill), Elf (High), Halfling (Lightfoot), Human, Dragonborn, Gnome (Rock), Half-Elf, Half-Orc, Tiefling
- Cada uma tem: ability score increases, age, size, speed, traits

### Actions in Combat (SRD)
Attack, Cast a Spell, Dash, Disengage, Dodge, Help, Hide, Ready, Search, Use an Object
- Bonus Actions: Two-Weapon Fighting, etc.
- Reactions: Opportunity Attack, Readied Action

### Damage Types (SRD, 13 tipos)
Acid, Bludgeoning, Cold, Fire, Force, Lightning, Necrotic, Piercing, Poison, Psychic, Radiant, Slashing, Thunder

### Ability Scores (SRD, 6)
Strength, Dexterity, Constitution, Intelligence, Wisdom, Charisma
- Modifier table, skills associadas, saves

## Números-Alvo de Conteúdo

| Tipo | Quantidade | Páginas Geradas |
|------|-----------|----------------|
| Monstros | 1,122 | 2,244 (EN + PT) |
| Magias | 604 | 1,208 (EN + PT) |
| Condições | 15 | 2 (index EN + PT) |
| Doenças | ~20 | 2 (index EN + PT) |
| Classes | 13 | 28 (index + 13 detail × 2 locales) |
| Raças | 9 | 20 (index + 9 detail × 2 locales) |
| Ferramentas | 2 | 4 (dice + encounter × 2 locales) |
| Referência | 4 | 8 (damage/ability/actions/rules × 2 locales) |
| **Total** | | **~3,516 páginas indexáveis** |

## Arquitetura Técnica

### Pattern de Página
```
app/[route]/page.tsx           — Server Component (SEO, metadata, JSON-LD)
components/public/Public*.tsx  — Client Component (interatividade)
public/srd/*.json              — Dados estáticos filtrados por whitelist
lib/srd/srd-data-server.ts    — Loader com whitelist enforcement
```

### Checklist por Página
- [ ] Metadata (title, description, OG, Twitter)
- [ ] JSON-LD (schema.org)
- [ ] Canonical + alternates (EN ↔ PT)
- [ ] Bilíngue (labels + dados traduzidos)
- [ ] PublicNav com breadcrumbs
- [ ] PublicCTA no final
- [ ] Footer CC-BY-4.0
- [ ] Mobile responsive
- [ ] Feature interativa diferencial
- [ ] Build passando

## Ordem de Execução

1. ✅ Wave 1 (monsters, spells, conditions) — DONE
2. 🔄 Wave 2 (diseases, damage types, ability scores, actions) — NOW
3. ⏳ Wave 3 (dice roller, encounter builder)
4. ⏳ Wave 4 (classes, races, rules reference)
