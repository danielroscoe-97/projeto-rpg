# E2E Test Prompt — Compendium Browser + FloatingCards + OmniSearch

> **Objetivo**: Testar end-to-end toda a funcionalidade de Compendium Browser (9 tabs), FloatingCards click-outside, Command Palette, e verificar Sentry error tracking. Atualizar os testes E2E existentes e criar novos para cobrir as features adicionadas.

---

## Contexto: O que foi implementado

### Features deployadas (commits `ed9c42f` → `a2e7763`)

**1. PlayerCompendiumBrowser — 9 tabs completas**
Arquivo: `components/player/PlayerCompendiumBrowser.tsx`

| Tab | Icone | Dados | Search | Detail View |
|-----|-------|-------|--------|-------------|
| All | Globe | Todas as 8 categorias | Nome (min 2 chars) | Abre detail da categoria correspondente |
| Spells | Sparkles | `useSrdStore.spells` | Nome + level + class + version | SpellCard inline |
| Conditions | HeartPulse | `getCoreConditions()` | Nome | Description pre-line |
| Monsters | Skull | `useSrdStore.monsters` | Nome | MonsterStatBlock inline |
| Items | Sword | `useSrdStore.items` | Nome | ItemCard inline |
| Feats | Star | `getAllFeats()` | Nome | Prerequisite + description |
| **Abilities** | **Zap** | `SRD_ABILITIES` (689 public / 2890 auth) | Nome + name_pt | Type badge (class=amber, racial=emerald, subclass=cyan, feat=purple) + source + level + reset_type + description |
| **Races** | **Users** | `useSrdStore.races` | Nome | Size, speed, darkvision, ability_bonuses, languages, traits list |
| **Backgrounds** | **ScrollText** | `useSrdStore.backgrounds` | Nome | Skills, tools, languages, equipment, feature_name + feature_description |

**2. FloatingCardContainer click-outside fix**
Arquivo: `components/oracle/FloatingCardContainer.tsx` linha ~538

O `handleClickOutside` agora ignora clicks em:
- `[data-testid^="quick-search"]` — botao de busca rapida
- `[data-testid^="compendium-browser"]` — botao do compendium
- `[data-testid^="player-bottom-bar"]` — barra inferior do player

**3. i18n bilingual (EN + PT-BR)**
9 novas keys no namespace `combat`:
- `compendium_tab_abilities` / `Habilidades`
- `compendium_tab_races` / `Raças`
- `compendium_tab_backgrounds` / `Antecedentes`
- `compendium_search_abilities` / `Buscar habilidade...`
- `compendium_search_races` / `Buscar raça...`
- `compendium_search_backgrounds` / `Buscar antecedente...`
- `compendium_abilities_count` / `habilidades`
- `compendium_races_count` / `raças`
- `compendium_backgrounds_count` / `antecedentes`

**4. Code review patches**
- `level_acquired` usa `!= null` (não truthy check — corrige level 0)
- Optional chaining em `languages?.length`, `skill_proficiencies?.length`, `tool_proficiencies?.length`
- Comentário documentando proxy reactivity pattern

---

## Onde o CompendiumBrowser é montado (Combat Parity)

| Modo | Arquivo | Acesso |
|------|---------|--------|
| **Guest** (`/try`) | `components/guest/GuestCombatClient.tsx` (importa PlayerCompendiumBrowser) | Deslogado, Zustand + localStorage |
| **Anônimo** (`/join/[token]`) | `components/player/PlayerInitiativeBoard.tsx` (importa PlayerCompendiumBrowser) | Supabase anon auth |
| **Autenticado** (`/invite/[token]`) | `components/player/PlayerInitiativeBoard.tsx` | Supabase auth |
| **DM** (`/app/session/[id]`) | Command Palette (Ctrl+K) — separado, usa `CommandPalette.tsx` | Autenticado |

---

## Infraestrutura E2E existente

### Playwright Config
- `playwright.config.ts` — `testDir: ./e2e`, `workers: 1`, `timeout: 60s/90s`
- `BASE_URL=https://pocketdm.com.br` para testes remotos
- Projetos: `desktop-chrome` + `mobile-safari` (iPhone 14)

### Test Accounts
- `DM_PRIMARY`: dm.primary@test-taverna.com (PT-BR)
- `DM_ENGLISH`: dm.english@test-taverna.com (EN)
- `PLAYER_WARRIOR`: Thorin (PT-BR)

### Helpers existentes
- `e2e/helpers/auth.ts` — `loginAs()`, `loginAsDM()`
- `e2e/helpers/session.ts` — `goToNewSession()`, `getShareToken()`
- `e2e/helpers/combat.ts` — `waitForSrdReady()`, `searchAndAddMonster()`, `startCombat()`
- `e2e/guest-qa/helpers.ts` — `goToTryPage()`, `skipGuidedTour()`, `addManualCombatant()`

### Teste existente a expandir
- `e2e/journeys/j7-compendium-oracle.spec.ts` — cobre J7.1-J7.4 (Ctrl+K + Spells + Conditions + Combat)

---

## O QUE FAZER

### Parte 1: Atualizar `j7-compendium-oracle.spec.ts`

Expandir o arquivo existente com novos testes para as 3 tabs adicionadas + click-outside fix:

```
J7.5 — Compendium tab Abilities busca e mostra detail
J7.6 — Compendium tab Races busca e mostra detail  
J7.7 — Compendium tab Backgrounds busca e mostra detail
J7.8 — Compendium tab All busca global inclui abilities/races/backgrounds
J7.9 — FloatingCard NÃO fecha ao clicar no botão de search (click-outside fix)
```

### Parte 2: Criar `j18-compendium-full-coverage.spec.ts`

Teste completo e detalhado de TODAS as 9 tabs, cobrindo:

#### Desktop (DM logado)
1. **Abrir CompendiumBrowser** — via botão no PlayerInitiativeBoard ou GuestCombatClient
2. **Tab All** — digitar "Fire" → verificar que resultados incluem spells (Fireball), monsters, e items
3. **Tab Spells** — buscar "Cure" → verificar spell card detail com casting_time, components
4. **Tab Conditions** — buscar "Frightened" → verificar description no detail
5. **Tab Monsters** — buscar "Dragon" → verificar MonsterStatBlock com HP, AC, CR
6. **Tab Items** — buscar "Sword" → verificar ItemCard com type, rarity
7. **Tab Feats** — buscar "Alert" → verificar prerequisite + description
8. **Tab Abilities** — buscar "Rage" → verificar badge "Class" amber + source "Barbarian" + level
9. **Tab Races** — buscar "Elf" → verificar ability_bonuses + languages + traits list
10. **Tab Backgrounds** — buscar "Acolyte" → verificar skill_proficiencies + feature_name + feature_description
11. **Tab bar scroll** — no mobile, verificar que 9 tabs são scrolláveis (overflow-x-auto)
12. **Pagination** — tab com muitos resultados mostra "Load more" e carrega mais ao clicar

#### Guest mode (`/try`)
13. **CompendiumBrowser abre** — clicar no botão de compendium no GuestCombatClient
14. **Tab Abilities funciona** — buscar "Sneak Attack" → verificar badge + detail
15. **Tab Races funciona** — buscar "Dwarf" → verificar traits
16. **Tab Backgrounds funciona** — buscar "Criminal" → verificar skills

#### Player mode (`/join/[token]`)
17. **CompendiumBrowser abre** — clicar no botão de compendium no PlayerBottomBar
18. **Tabs funcionam** — verificar pelo menos 3 tabs carregam dados

#### FloatingCards
19. **Click-outside fecha card** — abrir floating card, clicar fora → card fecha
20. **Click em search NÃO fecha** — abrir floating card, clicar no botão de search → card permanece
21. **Click em compendium NÃO fecha** — abrir floating card, clicar no botão de compendium → card permanece

#### i18n
22. **PT-BR** — com locale pt-BR, verificar que tabs mostram "Habilidades", "Raças", "Antecedentes"
23. **EN** — com locale en, verificar que tabs mostram "Abilities", "Races", "Backgrounds"

### Parte 3: Verificação Sentry

#### Config Sentry do projeto
- `sentry.client.config.ts` — DSN: `NEXT_PUBLIC_SENTRY_DSN`
- `sentry.server.config.ts` — DSN: `SENTRY_DSN`
- `instrumentation.ts` + `instrumentation-client.ts` — Turbopack compatible
- Error boundaries em: `/try/error.tsx`, `/join/[token]/error.tsx`, `/app/error.tsx`
- `lib/errors/capture.ts` — dual-layer: Sentry + Supabase `error_logs`
- `components/ErrorTrackingProvider.tsx` — global unhandled errors

#### O que verificar
1. **Abrir DevTools → Console** durante os testes — NÃO deve haver erros JS uncaught
2. **Verificar Sentry dashboard** (org `o4511202325364736`, project `4511202327855104`):
   - Filtrar por últimas 24h
   - Verificar que NÃO há novos erros related a "compendium", "ability", "race", "background"
   - Se houver erros: capturar screenshot, copiar stack trace, reportar
3. **Verificar Supabase `error_logs`** table:
   - `SELECT * FROM error_logs WHERE created_at > NOW() - INTERVAL '1 hour' ORDER BY created_at DESC;`
   - Verificar que NÃO há erros novos durante os testes
4. **Forçar erro** para verificar que capture funciona:
   - No DevTools console: `throw new Error("E2E test error — compendium verification")`
   - Verificar que aparece no Sentry dentro de 30s
   - Deletar o evento de teste depois

---

## Selectors importantes

### CompendiumBrowser (Dialog)
```
[role="dialog"]                           — o dialog container
button:has-text("Abilities")              — tab Abilities
button:has-text("Habilidades")            — tab Abilities (PT-BR)
button:has-text("Races")                  — tab Races
button:has-text("Raças")                  — tab Races (PT-BR)
button:has-text("Backgrounds")            — tab Backgrounds
button:has-text("Antecedentes")           — tab Backgrounds (PT-BR)
input[placeholder*="ability"]             — search input Abilities tab
input[placeholder*="habilidade"]          — search input Abilities (PT-BR)
input[placeholder*="race"]               — search input Races tab
input[placeholder*="raça"]               — search input Races (PT-BR)
input[placeholder*="background"]          — search input Backgrounds tab
input[placeholder*="antecedente"]         — search input Backgrounds (PT-BR)
```

### Ability badges (dentro do dialog)
```
span:has-text("Class")                    — badge class_feature (amber)
span:has-text("Racial")                   — badge racial_trait (emerald)
span:has-text("Subclass")                — badge subclass_feature (cyan)
span:has-text("Feat")                     — badge feat (purple)
```

### Command Palette
```
[cmdk-root]                               — palette container
[cmdk-input]                              — search input
[cmdk-item]                               — result items
```

### FloatingCards
```
[data-floating-card]                      — floating card element
[data-testid="floating-cards-container"]  — portal container
[data-testid="quick-search-btn"]          — search button (GuestCombatClient)
[data-testid="compendium-browser-btn"]    — compendium button (GuestCombatClient)
[data-testid^="player-bottom-bar"]        — player bottom bar (PlayerBottomBar)
```

### Combat setup
```
[data-testid="add-row-name"]              — manual add name input
[data-testid="add-row-btn"]               — add combatant button
[data-testid="start-combat-btn"]          — start combat
[data-testid="active-combat"]             — active combat container
[data-testid="srd-status"][data-ready]    — SRD loaded indicator
```

---

## Como rodar

### Local (dev server)
```bash
# Instalar Playwright browsers (se necessário)
npx playwright install chromium webkit

# Rodar todos os testes E2E
npx playwright test e2e/journeys/j7-compendium-oracle.spec.ts e2e/journeys/j18-compendium-full-coverage.spec.ts --headed

# Rodar só um teste específico
npx playwright test e2e/journeys/j18-compendium-full-coverage.spec.ts -g "J18.8" --headed

# Rodar em mobile
npx playwright test e2e/journeys/j18-compendium-full-coverage.spec.ts --project=mobile-safari --headed
```

### Contra produção (pocketdm.com.br)
```bash
BASE_URL=https://pocketdm.com.br npx playwright test e2e/journeys/j7-compendium-oracle.spec.ts e2e/journeys/j18-compendium-full-coverage.spec.ts --headed
```

### Ver relatório
```bash
npx playwright show-report
```

---

## Regras obrigatórias

1. **Combat Parity**: Guest (`/try`) + Anônimo (`/join`) + Autenticado devem ter a mesma experiência
2. **SRD Compliance**: conteúdo non-SRD NUNCA visível para deslogados
3. **Touch targets >= 44px** em todo mobile
4. **i18n bilingual** (EN + PT-BR) para todas as strings
5. **tsc --noEmit** deve passar com 0 erros após alterações
6. **Zero console errors** durante os testes (exceto warnings conhecidos do Next.js dev)
7. **Sentry deve estar limpo** — sem novos erros após os testes

---

## Arquivos de referência

| Arquivo | Propósito |
|---------|-----------|
| `components/player/PlayerCompendiumBrowser.tsx` | Componente principal — 9 tabs |
| `components/oracle/CommandPalette.tsx` | Command Palette (Ctrl+K) — referência de UI |
| `components/oracle/FloatingCardContainer.tsx` | Click-outside handler fixado |
| `lib/srd/srd-search.ts` | Search functions (searchAbilities, searchRaces, etc.) |
| `lib/data/srd-abilities.ts` | SrdAbility type + SRD_ABILITIES data |
| `lib/srd/srd-loader.ts` | SrdRace, SrdBackground types |
| `lib/stores/srd-store.ts` | Zustand store — Phase 2b deferred loading |
| `e2e/journeys/j7-compendium-oracle.spec.ts` | Teste existente a expandir |
| `e2e/helpers/combat.ts` | Helper: waitForSrdReady, searchAndAddMonster |
| `e2e/guest-qa/helpers.ts` | Helper: goToTryPage, skipGuidedTour |
| `e2e/fixtures/test-accounts.ts` | Contas de teste (DM_PRIMARY, DM_ENGLISH) |
| `playwright.config.ts` | Config Playwright (BASE_URL, projects) |
| `sentry.client.config.ts` | Sentry client config |
| `lib/errors/capture.ts` | Dual-layer error capture (Sentry + Supabase) |
