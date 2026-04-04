# Prompt — SEO Wave 2: Traduções + Página de Condições

## Contexto

O Pocket DM (pocketdm.com.br) é um combat tracker D&D 5e. Temos páginas públicas de monstros e magias para SEO. Hoje fizemos:

1. **Tradução PT-BR dos stat blocks** — lib/i18n/dnd-terms-ptbr.ts traduz size, type, alignment, damage types, conditions, skills, saves, senses, speed
2. **Toggle "Traduzir ficha"** — tudo é inglês RAW por padrão. Quando clica "Traduzir ficha", labels E dados traduzem juntos via useMonsterTranslation hook (lib/hooks/useMonsterTranslation.ts)
3. **334 monstros SRD 2014 traduzidos** — descriptions em public/srd/monster-descriptions-pt.json (nome PT, special_abilities, actions, reactions, legendary_actions, lair_actions, regional_effects)
4. **Redesign do PublicCTA** — lore em card full-width com abas (Em Combate / No Mundo / Dicas) + CTA horizontal com headline contextual
5. **Reddit Snoo SVG** no MonsterADayAttribution
6. **Fix crítico SRD** — restauramos filtro de whitelist. Só conteúdo CC-BY-4.0 nas páginas públicas

## O que falta fazer (4 frentes)

### Frente 1 — Traduzir magias (PRIORIDADE ALTA)
- 302 spells SRD 2014 + 302 SRD 2024 precisam de `spell-descriptions-pt.json`
- Já existe `public/srd/spell-names-pt.json` com 333 nomes traduzidos
- Página EN: `/spells/[slug]` — verificar que locale="en" 
- Página PT: `/magias/[slug]` — verificar que locale="pt-BR" e usa nomes PT
- Script: adaptar `scripts/translate-monsters.mjs` para spells (usar claude CLI com stdin)
- Campos a traduzir: `description`, `higher_levels`
- Spell fields: id, name, ruleset_version, level, school, casting_time, range, components, duration, description, higher_levels, classes, ritual, concentration

### Frente 2 — Traduzir monstros SRD 2024 + MAD
- 346 monstros SRD 2024 passam no whitelist mas NÃO têm tradução PT
- 357 monstros MAD (CC) também não têm tradução PT
- Rodar `scripts/translate-monsters.mjs` para esses (adaptar --source)
- O script usa `claude --print` via stdin, batches de 5, salva progressivamente

### Frente 3 — Página de Condições (NOVA)
- **Não existe** `/conditions` nem `/condicoes` — criar do zero
- Dados existem em `public/srd/conditions.json` (35 entries incluindo 2014 e 2024 versions)
- 15 condições core: Blinded, Charmed, Deafened, Exhaustion, Frightened, Grappled, Incapacitated, Invisible, Paralyzed, Petrified, Poisoned, Prone, Restrained, Stunned, Unconscious
- Referência de design: https://roll20.net/compendium/dnd5e/Conditions (mas muito melhor)
- Design proposto:
  - Card grid responsivo (3 cols desktop)
  - Cada card: ícone + nome + resumo compacto, clicável para expandir texto completo
  - Filtros por categoria: Debuff, Control, Movement, Sensory
  - Toggle 2014/2024 (algumas mudaram, especialmente Exhaustion)
  - Exhaustion especial: tabela visual com 6 níveis
  - Bilíngue: EN + PT-BR
  - SEO: metadata, JSON-LD, canonical

### Frente 4 — Badge de versão 2014/2024 nos monstros
- Badge discreto ao lado do nome no stat block: "2014" ou "2024"
- Puramente visual, sem impacto em SEO
- O campo `ruleset_version` já existe nos dados do monstro

## Arquitetura Existente

### Filtro SRD (REGRA IMUTÁVEL — ver CLAUDE.md)
- `public/srd/srd-monster-whitelist.json` — 419 slugs permitidos
- `public/srd/srd-spell-whitelist.json` — 361 slugs permitidos
- `lib/srd/srd-data-server.ts` — filtra por whitelist, MAD sempre incluído
- **NUNCA** remover ou bypassar esses filtros

### Componentes Públicos
- `components/public/PublicMonsterStatBlock.tsx` — stat block com toggle tradução
- `components/public/PublicCTA.tsx` — lore tabs + CTA banner (client component)
- `components/public/PublicNav.tsx` — nav com locale
- `components/public/PublicMonsterSearch.tsx` — search bar colapsável
- `components/public/MonsterADayAttribution.tsx` — attribution com Snoo SVG

### Hooks de Tradução
- `lib/hooks/useMonsterTranslation.ts` — lazy-loads monster-descriptions-pt.json, toggle EN/PT
- `lib/i18n/dnd-terms-ptbr.ts` — maps de termos D&D (size, type, alignment, damage, conditions, skills, saves, senses, speed)

### Páginas
| Rota | Arquivo | Locale |
|---|---|---|
| `/monsters/[slug]` | `app/monsters/[slug]/page.tsx` | en |
| `/monstros/[slug]` | `app/monstros/[slug]/page.tsx` | pt-BR |
| `/spells/[slug]` | `app/spells/[slug]/page.tsx` | en |
| `/magias/[slug]` | `app/magias/[slug]/page.tsx` | pt-BR |
| `/conditions` | NÃO EXISTE — criar | en |
| `/condicoes` | NÃO EXISTE — criar | pt-BR |

### Script de Tradução
- `scripts/translate-monsters.mjs` — usa `claude --print` via spawnSync com stdin
- Batches de 5, salva após cada batch, resume-safe
- Pode ser adaptado para spells

## Números Atuais
- Monstros públicos: 1,122 (419 SRD + 346 SRD 2024 + 357 MAD)
- Magias públicas: 604 (302 SRD 2014 + 302 SRD 2024)
- Traduções PT monstros: 336 (só SRD 2014)
- Traduções PT magias: 0
- Traduções PT condições: 0
- Páginas de condições: 0

## Ordem de Execução Sugerida
1. Rodar tradução de magias em background (Wave 1)
2. Rodar tradução de monstros 2024 + MAD em background (Wave 1)
3. Criar página de condições EN + PT (Wave 2)
4. Adicionar badge 2014/2024 no stat block (Wave 3)
5. Verificar todas as páginas via Playwright
