# Prompt para Proximo Agente — Sprint Feature Expansion

> **Cole este prompt inteiro no inicio de uma nova sessao do Claude Code.**
> Ele contem todo o contexto necessario para continuar o desenvolvimento.

---

## Contexto do Projeto

**Pocket DM** — Combat Tracker D&D 5e com realtime multiplayer.
- **Brand**: Pocket DM (pocketdm.app / pocketdm.com.br)
- **Stack**: Next.js 16 (Turbopack), Supabase (auth + DB + realtime + storage), Zustand, Tailwind CSS, Framer Motion, next-intl (EN + PT-BR), Playwright E2E
- **Branch**: `master` (monorepo, deploy direto)
- **HEAD**: `a2e7763` — 38/50 features DONE (76%)
- **tsc**: limpo, build limpo, 584 E2E tests
- **Migrations**: 129 aplicadas

### Regras Imutaveis (CLAUDE.md)
1. **Combat Parity Rule**: Toda mudanca em combate DEVE verificar Guest (`/try`), Anonimo (`/join`), Autenticado (`/invite`)
2. **SRD Compliance**: `public/srd/` = SRD-only, `data/srd/` = full (auth-gated). NUNCA expor conteudo nao-SRD em publico
3. **RTK**: SEMPRE prefixar comandos com `rtk` (token optimizer)
4. **i18n**: SEMPRE `messages/en.json` + `messages/pt-BR.json` simultaneamente
5. **Touch targets**: Minimo WCAG 44px

### Arquivos de Referencia
- `CLAUDE.md` — Regras do projeto (ler primeiro)
- `docs/bucket-future-ideas.md` — Backlog completo com status atualizado
- `docs/tech-stack-libraries.md` — Todas as libs disponveis com exemplos
- `docs/epic-character-abilities-attunement.md` — Epic de abilities (ja implementado, referencia de arquitetura)
- `lib/types/database.ts` — 1177 linhas, todos os tipos do DB

---

## O QUE IMPLEMENTAR (5 frentes, em ordem de prioridade)

### FRENTE 1 — F-01: Ficha Completa de Personagem (~3-4 semanas)

**O que existe hoje:**
- `components/player-hq/` — 35 componentes: HP display, abilities, attunement, spell slots, inventory (bag of holding), quest board, notes, NPC journal, resource trackers, condition badges
- `components/character/wizard/CharacterWizard.tsx` — 3 steps (Identity, Stats, Preview)
- `components/player-hq/CharacterEditSheet.tsx` — Edita: name, class, level, race, HP, AC, speed, spell save DC
- `components/player-hq/CharacterAttributeGrid.tsx` — STR/DEX/CON/INT/WIS/CHA com modifiers
- `components/player-hq/CharacterCoreStats.tsx` — Bloco de stats
- `components/player-hq/SpellListSection.tsx` — Lista de spells do personagem
- `components/player-hq/AbilitiesSection.tsx` — Class features, racial traits, feats
- `components/player-hq/BagOfHolding.tsx` — Inventario completo
- `components/player-hq/AttunementSection.tsx` — 3 slots de attunement
- DB: `player_characters`, `character_abilities`, `character_inventory_items`, `character_spell_slots`
- Migrations: 123-126 (abilities, attunement, constraints)

**O que FALTA para full sheet:**
1. **Proficiencies section** — Saving throws, skills, tools, languages, armor, weapons
   - Novo componente `ProficienciesSection.tsx`
   - Nova tabela `character_proficiencies` (ou campo JSONB em `player_characters`)
   - Checkmarks visuais por proficiency + expertise (dobra)
   
2. **Spells Prepared / Known** — Gerenciamento de spells preparadas
   - `SpellListSection.tsx` ja existe mas precisa: prepared toggle, spell slots integration, ritual marking
   - Ligacao com `SpellSlotsHq.tsx` (slots ja funcionam)
   - Filtro por nivel, school, concentration
   
3. **Equipment section expandida** — Weight, currency (GP/SP/CP), encumbrance
   - `BagOfHolding.tsx` ja tem items mas falta: peso total, moedas, encumbrance rules
   - Adicionar campos `weight`, `cost`, `currency_gp/sp/cp` ao `character_inventory_items`
   
4. **Features & Traits detail** — Descricao completa com regras inline
   - `AbilityCard.tsx` ja mostra nome + descricao + uses
   - Falta: cross-reference com SRD (abrir card do compendium), level progression table
   
5. **Character PDF export** — Gerar PDF da ficha completa
   - Usar `@react-pdf/renderer` ou HTML-to-PDF via headless browser
   - Template estilo oficial D&D 5e character sheet

**Arquitetura sugerida:**
- Expandir `PlayerHqShell.tsx` com nova tab "Full Sheet" ao lado das tabs existentes
- Cada secao e um componente independente (ja e o padrao atual)
- Usar JSONB pra proficiencies (evita mais tabelas)

---

### FRENTE 2 — F-09/10/11/12: Cenarios Tematicos + Cinematics (~60h)

**O que existe hoje:**
- `components/audio/DmSoundboard.tsx` — 151 presets de som em 9 categorias
- `components/audio/DmAtmospherePanel.tsx` — Painel flutuante draggable do DM
- `lib/utils/audio-presets.ts` — 271 linhas, definicoes de todos os presets
- `public/sounds/` — 159 MP3s (136 SFX + 14 music + 9 ambient)
- Combat tracker ja tem: dark theme, gold accents, pixel art icons

**O que implementar:**

#### F-09: Cenarios tematicos com presets (~15h)
- **Tema = ambiente visual + audio preset bundle**
- Criar `lib/types/scenario.ts` com `ScenarioTheme { id, name, bgImage, bgColor, ambientPresets[], sfxPresets[], musicPreset }`
- Criar ~8 temas: Dungeon, Forest, Tavern, Castle, Underwater, Desert, Mountain, Underdark
- UI: Dropdown no EncounterSetup para selecionar tema
- Ao selecionar: background muda, ambient loop inicia, SFX presets filtrados
- Backgrounds: usar gradients CSS (nao imagens pesadas) ou SVG patterns

#### F-10: Geracao aleatoria de cenarios (~20h)
- `EncounterGeneratorDialog.tsx` ja gera encontros aleatorios por ambiente
- Expandir: ao gerar encontro, sugerir tema visual baseado no ambiente selecionado
- Adicionar: "Random Scenario" button que gera ambiente + monstros + tema de uma vez

#### F-11: Efeitos cinematograficos visuais (~15h)
- Efeitos visuais durante combate: critical hit flash, defeat animation, round transition
- Usar Framer Motion (ja no projeto) para: 
  - Flash dourado em crit (overlay + scale)
  - Shake da tela em dano massivo (>50% HP)
  - Fade-to-black em defeat
  - Particle burst em spell cast
- Toggle nas settings do DM (nao forcar em todos)

#### F-12: Presets de cenario com musica (~10h)
- Cada tema tem 1-2 music tracks pre-selecionadas
- Auto-play da music ao ativar tema (DM pode mutar)
- Transicao suave (fade out/in) ao trocar de tema mid-combat

---

### FRENTE 3 — F-31: Hardcoded Colors Cleanup (~4h)

**O que fazer:**
- Grep por cores hardcoded: `#D4A853`, `#1a1a2e`, `bg-gray-800`, `text-gray-400`, etc.
- Substituir por CSS variables ou Tailwind theme tokens
- Ja existe: `--gold`, `--surface-*` no CSS. Falta: aplicar consistentemente
- Foco nos componentes public/ (landing page, SEO pages) que mais usam cores hardcoded

---

### FRENTE 4 — F-45b: Demo Video Completo (NOVO)

**O que fazer:**
- `public/video/pocket-dm-demo.html` existe como slideshow animado
- Criar VIDEO NOVO que mostra o fluxo completo:
  1. Landing page → "Start Combat" CTA
  2. Guest mode: adicionar monstros, rolar iniciativa, combat tracker
  3. Soundboard + atmosphere
  4. Combat recap (Spotify Wrapped)
  5. Player join via QR code
  6. Player view com notifications
  7. Campaign management (mind map, sessions, quest board)
  8. Compendium (command palette, spell cards, monster stat blocks)
- Formato: HTML/CSS slideshow com animacoes (ou gerar via Playwright screenshots + CSS transitions)
- Duracao alvo: 60-90 segundos
- Resolucao: 1920x1080 (desktop) + 390x844 (mobile)

---

### FRENTE 5 — F-18/19: Mind Map IA + Session Intelligence

**O que existe:**
- `components/player-hq/PlayerMindMap.tsx` — Mind map basico dos players
- `components/campaign/` — Campaign management completo
- `lib/analytics/` — Event tracking + admin dashboard

**O que implementar:**

#### F-18: Mind Map com IA (~2-3 semanas)
- Depende de ter API key do Claude/OpenAI configurada
- Features:
  - "Suggest connections" — IA analisa nodes existentes e sugere links
  - "Generate NPC" — IA cria NPC com background, personality, motivations
  - "Summarize arc" — IA resume o arco narrativo baseado nos nodes

#### F-19: Session Intelligence (~1-2 semanas)  
- Analise pos-sessao automatica:
  - "Session highlights" — momentos marcantes detectados do combat log
  - "Player engagement" — quem participou mais/menos (baseado em turn time)
  - "Difficulty assessment" — comparar CR vs party level vs resultado
- Dashboard em `/app/campaigns/[id]?section=analytics`

**Pre-requisito:** Configurar env var `ANTHROPIC_API_KEY` ou `OPENAI_API_KEY`. Usar Claude API (Anthropic SDK ja no projeto como dev tool, mas precisa adicionar como dependencia de producao).

---

## ORDEM DE EXECUCAO SUGERIDA

```
Semana 1:  F-31 (4h, warm-up) → F-45b (demo video)
Semana 2:  F-01 proficiencies + spells prepared
Semana 3:  F-01 equipment + features detail + PDF export
Semana 4:  F-09 (temas) + F-12 (music presets)
Semana 5:  F-10 (random scenarios) + F-11 (cinematics)
Semana 6:  F-18 (mind map IA)
Semana 7:  F-19 (session intelligence)
```

## COMANDOS INICIAIS

```bash
# Verificar estado
rtk git status
rtk tsc
rtk git log --oneline -5

# Ler regras
cat CLAUDE.md
cat docs/bucket-future-ideas.md
cat docs/tech-stack-libraries.md

# Ler tipos do DB
head -100 lib/types/database.ts

# Ler componentes existentes do Player HQ
ls components/player-hq/
cat components/player-hq/PlayerHqShell.tsx | head -50
```

## REGRAS PARA O AGENTE

1. Ler `CLAUDE.md` ANTES de comecar qualquer trabalho
2. Rodar `rtk tsc` antes e depois de cada frente
3. i18n SEMPRE em EN + PT-BR
4. Combat parity: verificar Guest/Anon/Auth quando relevante
5. Commitar com mensagens descritivas no padrao do projeto
6. Rodar `rtk git push` apos cada commit
7. Atualizar `docs/bucket-future-ideas.md` conforme completar itens
