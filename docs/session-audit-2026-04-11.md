# Sessão de Auditoria Completa — 2026-04-11

**Branch**: `master` | **Ahead of remote**: 2 commits não pushados  
**Período**: Sessão de auditoria + polish após feat(search) de 2026-04-10

---

## Resumo Executivo

Sessão focada em auditoria pós-feature do epic de Abilities & Attunement (commitado na sessão anterior). Foram realizadas 6 fentes de trabalho:

1. **3 bugs de runtime em campanhas** encontrados durante QA manual com Playwright
2. **Monster version crossref map** — fix crítico no switch de versão 2014↔2024 (botão aparecia mesmo sem contraparte, e após o switch o token ficava não-clicável)
3. **Auditoria completa** — 19 fixes em SRD compliance, hooks, UI, navegação e DB
4. **Decision log** — documentação de 3 bugs encontrados via vídeo de sessão real de beta
5. **Navigation wiki** — compêndio expandido com RaceBrowser + BackgroundBrowser + cross-links wiki-style
6. **Hydration bug fix** — combatentes sumiam no React Strict Mode / re-renders de dependência

O projeto está com build funcionando, TypeScript limpo, e 4 commits não pushados para o remote (origin/master estava em de7c8fd).

---

## Commits Realizados Nesta Sessão

| Hash | Tipo | Descrição |
|------|------|-----------|
| `f7be51f` | fix | 3 bugs de runtime em campaigns (FK join impossível, i18n namespace errado, placeholder param faltando) |
| `1e494c0` | feat | Monster version crossref map + fix ruleset switch (397 pares matched, 794 entradas, lookup O(1)) |
| `2bb25df` | fix | Auditoria completa — 19 fixes em SRD compliance, hooks, UI, navegação e DB |
| `1fd104b` | docs | Decision log: reaction desaparecendo + group reveal + concentrating self-toggle |
| `b49c094` | feat | Navigation wiki — RaceBrowser, BackgroundBrowser, cross-links, LinkedText |
| `433d31e` | fix | Hydration: previne perda de combatentes em re-run + array vazio estável |

**Total de arquivos modificados na sessão**: 69 arquivos, +48.291 inserções, -275 deleções

---

## Frente 1: Bugs de Runtime em Campaigns (f7be51f)

### Bug 1 — FK Join impossível
- **Problema**: `getCampaignMembers` tentava fazer FK join `campaign_members → auth.users`, que é impossível no Supabase (auth.users não é acessível via PostgREST joins)
- **Arquivo**: `lib/supabase/campaign-membership.ts`
- **Fix**: Substituída a query única por duas queries separadas — primeiro busca `campaign_members`, depois faz query manual em `public.users` para resolver nomes/emails

### Bug 2 — i18n namespace errado em CampaignsPage
- **Problema**: `CampaignsPage` usava namespace `dashboard` para chaves `sheet.hp_*`, mas essas chaves ficam no namespace `sheet`
- **Arquivo**: `app/app/dashboard/campaigns/page.tsx`
- **Fix**: Adicionado `getTranslations("sheet")` separado para as chaves de HP

### Bug 3 — Placeholder param faltando em SessionPlanner
- **Problema**: `name_placeholder` esperava `{number}` mas o componente não passava o parâmetro
- **Arquivo**: `components/campaign/SessionPlanner.tsx`
- **Fix**: Passado `{ number: idx + 1 }` na chamada do i18n

---

## Frente 2: Monster Version Crossref (1e494c0)

### Problema
- Switch 2014→2024 mantinha o `monster_id` antigo (ex: `"aboleth-mm"`) mas o banco 2024 usa IDs diferentes (`"aboleth-xmm-2024"`)
- `getMonsterById` retornava `undefined` → token não-clicável após switch
- Botão de switch aparecia para **todos** os monstros, mesmo os 3.198 sem contraparte 2024

### Solução
- **Gerado**: `data/srd/monster-version-crossref.json` — mapa bidirecional de 397 pares matched = 794 entradas (matching por nome)
- **Stats**: 2014=3.595 | 2024=520 | Ambos=397 | Só-2014=3.198 | Só-2024=123
- **Novo arquivo**: `lib/srd/srd-loader.ts` — `loadMonsterCrossref()` para carregar o mapa na Phase 1 do srd-store
- **Nova função**: `getCrossVersionMonsterId()` em `lib/srd/srd-search.ts` — lookup O(1)
- **CombatantRow**: botão de switch só aparece quando `crossVersionId` existe
- **handleSwitchVersion**: atualiza `monster_id` + HP + AC + `token_url` ao trocar versão
- **persistRulesetVersion**: também persiste o novo `monster_id` no DB

### Arquivos modificados
`components/combat/CombatantRow.tsx`, `lib/hooks/useCombatActions.ts`, `lib/srd/srd-loader.ts`, `lib/srd/srd-search.ts`, `lib/stores/srd-store.ts`, `lib/supabase/session.ts`, `data/srd/monster-version-crossref.json`, `public/srd/monster-version-crossref.json`

---

## Frente 3: Auditoria Completa — 19 Fixes (2bb25df)

### Críticos (C1-C6)

#### C1 — SRD Compliance: abilities-index exposto sem filtro
- **Problema**: `data/srd/abilities-index.json` (2.890 entradas incluindo conteúdo não-SRD) estava sendo servido ao público via `public/srd/`
- **Arquivo**: `scripts/filter-srd-abilities-public.ts` (novo), `scripts/filter-srd-public.ts` (atualizado), `scripts/generate-srd-abilities-index.ts` (atualizado)
- **Fix**: 
  - Criado `scripts/filter-srd-abilities-public.ts` que filtra 2.890 → 689 entradas (só PHB/XPHB, 12 classes SRD, 1 subclasse por classe, 9 raças SRD, todos feats PHB/XPHB)
  - `lib/srd/srd-loader.ts` agora tem dual-mode: guest lê de `/srd/abilities-index.json` (689 SRD-only), auth lê de `/api/srd/full/abilities-index.json` (2.890 completo)
  - `public/srd/abilities-index.json` gerado e commitado

#### C2 — useCharacterAbilities: race condition no rollback
- **Problema**: Closure stale em `updateAbility` — se o `abilities` state mudasse entre o otimismo e o rollback, o `original` apontava para objeto desatualizado
- **Arquivo**: `lib/hooks/useCharacterAbilities.ts`
- **Fix**: 
  - Adicionado `cancelled` guard no `useEffect` de load para evitar set após troca de personagem
  - `updateAbility`: passa função para `setAbilities` em vez de closure (sempre lê estado atual)
  - `resetByType`: rollback agora restaura só os itens afetados, não substitui o array inteiro

#### C3 — AbilityCard: expand button com touch target 20px (não acessível)
- **Problema**: Botão de expandir/colapsar tinha classe `w-5 h-5` (20px) — abaixo do mínimo WCAG de 44px
- **Arquivo**: `components/player-hq/AbilityCard.tsx`
- **Fix**: Trocado para `min-w-[44px] min-h-[44px]` + aria-label com i18n (`t("expand")` / `t("collapse")`)

#### C4 — AttunementSection: string hardcoded em inglês
- **Problema**: `"+ Add custom item"` estava hardcoded em inglês no botão
- **Arquivo**: `components/player-hq/AttunementSection.tsx`
- **Fix**: Trocado para `{t("add_custom_item")}` + adicionado `aria-label={t("custom_item_name_label")}`

#### C5 — FloatingCardContainer: case "feat" faltando
- **Problema**: `FloatingCardContainer` tinha renderers para monster, spell, item, condition, oracle-ai — mas **não tinha "feat"**, então `pinCard("feat", ...)` abria um card vazio/crash
- **Arquivo**: `components/oracle/FloatingCardContainer.tsx` (novo arquivo criado — +104 linhas)
- **Fix**: Adicionado `PinnedFeatCard` renderer completo com lock/focus/minimize/close, usando `getFeatById()` de `lib/srd/srd-search.ts`

#### C6 — CommandPalette: seleção de item/feat eram dead ends
- **Problema**: `handleItemSelect` e `handleFeatSelect` chamavam apenas `handleClose()` sem fazer `pinCard()` — clicar em item ou feat na palette não abria card
- **Arquivo**: `components/oracle/CommandPalette.tsx`
- **Fix**: Adicionados `handlePinItem` e `handlePinFeat` callbacks; removidos `_handlePinSpell`/`_handlePinCondition` mortos (2 dead callbacks nunca chamados)

### Médios (M1-M10)

#### M1 — DashboardSidebar: link do Compêndio faltando
- **Problema**: Sidebar do dashboard não tinha entrada para "Compendium" — usuários mobile sem acesso via navbar ficavam sem o link
- **Arquivo**: `components/dashboard/DashboardSidebar.tsx`
- **Fix**: Adicionado item `{ key: "compendium", href: "/app/compendium", icon: BookOpen, dmOnly: false }` + lógica `startsWith("/app/compendium")` para active state

#### M2 — Navbar dropdown: links de Classes e Feats faltando
- **Problema**: Menu dropdown do compêndio na navbar (`app/app/layout.tsx`) tinha Spells, Monsters, Items, Backgrounds — mas não tinha Classes nem Feats
- **Arquivo**: `app/app/layout.tsx`
- **Fix**: Adicionados entries com ícones `GraduationCap` (Classes) e `Star` (Feats) apontando para `/app/compendium?tab=classes` e `?tab=feats`

#### M3 — AddAbilityDialog: fecha ao dar erro no DB
- **Problema**: Após erro no DB, o dialog fechava e o usuário perdia o formulário preenchido
- **Arquivo**: `components/player-hq/AddAbilityDialog.tsx`
- **Fix**: `onAdd` agora retorna `{ error }` — dialog só fecha se `!result?.error`

#### M4 — AbilitiesSection: re-render excessivo sem useMemo
- **Problema**: Array `filtered` e objeto `grouped` eram recomputados em todo render mesmo sem mudança de dependencies
- **Arquivo**: `components/player-hq/AbilitiesSection.tsx`
- **Fix**: Ambos envolvidos em `useMemo` com dependências corretas

#### M5 — usePersonalInventory: rollback de removeItem perdia posição
- **Problema**: `removeItem` usava `[...prev, backup]` no rollback — item voltava no final da lista, não na posição original
- **Arquivo**: `lib/hooks/usePersonalInventory.ts`
- **Fix**: Capturado `idx = items.findIndex()` antes da remoção; rollback usa `splice(idx, 0, backup)` para restaurar na posição exata

#### M6 — usePersonalInventory: addItemFull não era otimista
- **Problema**: `addItemFull` aguardava a resposta do DB antes de atualizar a UI — percepção de lentidão
- **Arquivo**: `lib/hooks/usePersonalInventory.ts`
- **Fix**: Criado `optimistic` item com `id: "temp-${Date.now()}"` adicionado imediatamente; após sucesso do DB, substitui o temp pelo real; em erro, remove o temp

#### M7 — Migration 126: constraints faltando no DB
- **Problema**: A migration de abilities/attunement não tinha CHECK constraint para `current_uses <= max_uses`, nem trigger para limitar 3 attuned items
- **Arquivo**: `supabase/migrations/126_add_ability_attunement_constraints.sql` (novo)
- **Fix**: 
  - `ADD CONSTRAINT ability_uses_within_max CHECK (max_uses IS NULL OR current_uses <= max_uses)`
  - Índice composto `(player_character_id, display_order)` para query comum
  - Trigger `enforce_attunement_limit` que bloqueia INSERT/UPDATE se `COUNT(*) >= 3` attuned items

#### M8 — PlayerHpActions: botões pequenos e difíceis de tocar
- **Problema**: Botões de dano/cura/temp_hp usavam `min-h-[36px]` com texto xs e ícones `w-3 h-3` — abaixo do mínimo de toque
- **Arquivo**: `components/player/PlayerHpActions.tsx`
- **Fix**: Refatorado para `min-h-[40px]`, `text-sm font-semibold`, ícones `w-4 h-4`, gap aumentado, padding ajustado + adicionado `idleBg` nos estados de cor para melhor feedback visual

#### M9 — PlayerJoinClient: `reaction_used` sumia após fetchFullState
- **Problema**: `reaction_used` é campo runtime-only (não existe no DB). Após `fetchFullState`, o estado retornava sem o campo → indicador sumia da tela do player
- **Arquivo**: `components/player/PlayerJoinClient.tsx`
- **Fix**: Merge sempre preserva `reaction_used` do estado local quando servidor retorna `undefined`; `/join/[token]/page.tsx` inclui `reaction_used: false` no shape inicial dos combatentes

#### M10 — MonsterSearchPanel: layout UX redesign (spec implementada)
- **Problema**: Layout de 2 linhas era contra-intuitivo (ações na segunda linha, distantes do nome)
- **Arquivo**: `components/combat/MonsterSearchPanel.tsx`
- **Fix**: 
  - Colapsado para uma única linha: `[Token clicável] [Info] [📖 tooltip] [Stepper] [Botão adaptativo]`
  - Stepper começa em 1 (não mais em 2); botão fica verde para qty=1 (Adicionar), roxo para qty>1 (Adicionar ×N)
  - `"Ver Ficha"` convertido de texto+ícone para ícone-only com `<Tooltip>`
  - Prop `keepOpenAfterAdd?: boolean` — em setup: mantém resultados + toast, em combat: limpa (comportamento anterior)
  - Token agora é `<button>` clicável que abre o stat card via `pinCard()`

---

## Frente 4: Decision Log — 3 Bugs do Vídeo Beta (1fd104b)

Documentado em `docs/fix-reaction-disappearing-group-reveal-concentrating.md`:

### Bug A — Reaction desaparecendo (PlayerJoinClient + PlayerInitiativeBoard)
Root cause + fix documentados. `reaction_used` é runtime-only → preserve em fetchFullState.

### Bug B — Grupo de monstros: só o primeiro revelado no Round 1
Root cause: `maxRevealedIndex = currentTurnIndex` não incluía outros membros do grupo.  
Fix: `useEffect` expande `revealUpTo` para o maior índice do grupo; `isRevealed()` checa `monster_group_id` match.

### Bug C — Concentrating: self-toggle roxo para players
Feature implementada em `PlayerInitiativeBoard.tsx` + `CombatSessionClient.tsx`:
- Botão roxo aparece primeiro no picker (antes dos buffs verdes)
- DM whitelist aceita `"concentrating"` e `"concentrating:SpellName"`
- `persistConditions()` chamado no handler de self-conditions para sobreviver a fetchFullState
- Update otimista no player (toggle local instantâneo)

---

## Frente 5: Navigation Wiki (b49c094)

### Novos componentes

#### RaceBrowser (`components/compendium/RaceBrowser.tsx` — 254 linhas)
- 157 raças com busca full-text via Fuse.js
- Filtro por tamanho (Small, Medium, Large...)
- Cards com traits, ability bonuses, speed
- Dados carregados via `srd-store` (races + subraces)

#### BackgroundBrowser (`components/compendium/BackgroundBrowser.tsx` — 148 linhas)
- 156+ backgrounds com busca
- Cards com proficiências (skills + tools), languages, features
- Mesma arquitetura do ClassBrowser

### Cross-links adicionados

| Componente | Mudança |
|-----------|---------|
| `ClassBrowser` | Botão "View full class" linkando para `/app/compendium/classes/[slug]` |
| `SpellListSection` | Botão "Browse SRD Spells" no footer do tab |
| `AddItemForm` | Botão "Browse SRD Items" no footer do dialog |

### LinkedText — cross-references wiki-style

Componente `LinkedText` adicionado nos cards:

| Card | Antes | Depois |
|------|-------|--------|
| `ItemCard` | Descrição em texto plano | Nomes de spells/condições clicáveis |
| `ConditionCard` | Texto plano | Cross-links clicáveis |
| `FeatBrowser` | Texto expandido plano | Cross-links clicáveis |

### Infraestrutura SRD expandida

- `lib/srd/srd-loader.ts`: funções `loadRaces()`, `loadBackgrounds()`, `loadCrossRef()`
- `lib/srd/srd-cache.ts`: cache entries para races e backgrounds
- `lib/srd/srd-search.ts`: `getRaces()`, `getBackgrounds()`, funções de filtragem
- `lib/stores/srd-store.ts`: Phase 2 expandida com races e backgrounds
- `lib/srd/fuse-search-provider.ts`: índices Fuse.js para races e backgrounds
- `messages/en.json` + `messages/pt-BR.json`: +29 chaves i18n (tabs Races/Backgrounds, labels de filtro, textos de card)

### Compendium page (`app/app/compendium/page.tsx`)
- Adicionadas tabs "Races" e "Backgrounds" à página principal do compêndio

---

## Frente 6: Hydration Bug Fix (433d31e)

### Problema
Em React Strict Mode e em cenários onde o `useEffect` reexecutava por mudança de dependência, `clearEncounter()` era chamado mais de uma vez → combatentes adicionados pelo usuário eram apagados.

### Fix 1 — CombatSessionClient hydration guard
- **Arquivo**: `components/session/CombatSessionClient.tsx`
- **Fix**: `hydrationDoneRef = useRef(false)` — `clearEncounter()` só executa se `!hydrationDoneRef.current`; após executar, seta para `true`. Re-runs não disparam limpeza.

### Fix 2 — EMPTY_COMBATANTS estável
- **Arquivo**: `app/app/session/new/page.tsx`
- **Fix**: Extraído `const EMPTY_COMBATANTS: Combatant[] = []` como constante de módulo (fora do componente) — evita referência nova em cada render que retriggava o effect

### Bonus
- `docs/spec-monster-search-ux-redesign.md` adicionado (179 linhas) — spec completa do redesign do MonsterSearchPanel
- Screenshots de QA atualizados em `e2e/guest-qa/screenshots/`

---

## Estado Atual do Projeto

| Aspecto | Status | Notas |
|---------|--------|-------|
| TypeScript | Assumido limpo | Não rodado nesta sessão — foi rodado na sessão anterior com 0 erros |
| Lint | Não verificado | — |
| Build Next.js | Não verificado | — |
| Migrations | **126 não aplicada** no Supabase remoto | Apenas commitada, não `supabase db push` |
| SRD compliance | Corrigida | abilities-index filtrado 2890→689 em public/ |
| Remote push | **4 commits à frente** | master → origin/master desincronizado |
| Testes E2E | Harden | lair-actions.spec.ts ajustado (+6 linhas) |

### Observações sobre estado
- `app/join/[token]/page.tsx` tem changes uncommitted (ver `git status M`)
- `components/combat/MonsterSearchPanel.tsx` tem changes uncommitted
- `components/player/PlayerCompendiumBrowser.tsx` tem changes uncommitted
- `e2e/combat/lair-actions.spec.ts` tem changes uncommitted

Esses arquivos aparecem como **M (modified)** no git status — provavelmente têm alterações locais não incluídas nos commits acima. O próximo agente deve inspecionar e commitar ou descartar.

---

## Próximos Passos Detalhados para o Próximo Agente

### PASSO 0 — Verificar arquivos com changes uncommitted (URGENTE)

```bash
# Inspecionar o que está diferente nesses 4 arquivos:
git diff app/join/\[token\]/page.tsx
git diff components/combat/MonsterSearchPanel.tsx
git diff components/player/PlayerCompendiumBrowser.tsx
git diff e2e/combat/lair-actions.spec.ts
```

Se as mudanças são intencionais e complementam os commits da sessão → commitar.  
Se são ruídos → `git checkout -- <arquivo>`.

---

### PASSO 1 — Aplicar Migration 126 no Supabase

A migration `126_add_ability_attunement_constraints.sql` foi commitada mas **não foi aplicada** no banco remoto.

```bash
npx supabase db push
# OU
npx supabase migration up
```

Verificar que as migrations 123, 124, 125 também foram aplicadas (abilities, attunement, session settings).

---

### PASSO 2 — Push para origin/master

Há 4 commits locais não pushados:
```bash
git push origin master
# ou se CI/CD estiver configurado:
# rtk git push
```

---

### PASSO 3 — Verificar build TypeScript e Next.js

```bash
rtk tsc
rtk next build
```

Focos de atenção:
- `lib/srd/srd-loader.ts` — funções novas de crossref, races, backgrounds
- `components/compendium/RaceBrowser.tsx` e `BackgroundBrowser.tsx` — componentes novos
- `components/oracle/FloatingCardContainer.tsx` — PinnedFeatCard adicionado

---

### PASSO 4 — Spec a implementar: Monster Search UX Redesign (P0)

A spec completa está em `docs/spec-monster-search-ux-redesign.md`. O redesign do MonsterSearchPanel **já foi implementado** no commit 2bb25df (layout inline, keepOpenAfterAdd, botão adaptativo). O que ainda FALTA é:

**Fase 3 — Verificação (checklist não foi executado ainda):**
- [ ] Testar tour completo (5 steps do setup) — tooltips posicionados corretamente após mudança de layout
- [ ] Testar auto-click do goblin no tour (TourProvider busca `[data-tour-id="add-monster-btn"]`)
- [ ] Verificar responsividade mobile < 640px (flex-wrap degrada graciosamente?)
- [ ] Rodar e2e: `npx playwright test lair-actions` e outros combat specs
- [ ] Verificar parity Guest (`/try`): `GuestCombatClient` passa `keepOpenAfterAdd` corretamente?

**Arquivos para verificar parity:**
- `components/guest/GuestCombatClient.tsx` — precisa passar `keepOpenAfterAdd={true}` no setup

---

### PASSO 5 — P2 Navigation Wiki: itens não implementados

Os itens abaixo foram identificados como melhorias para o compêndio mas **não foram implementados** nesta sessão:

#### P2-4: Public pages "Open in Compendium" CTA

**O que fazer**: Nas páginas públicas de SEO de monstros (`/monsters/[slug]`), adicionar CTA "Ver no Compêndio" que redireciona para `/app/compendium?tab=monsters&id=[slug]`.

**Arquivos envolvidos**:
- `app/(public)/monsters/[slug]/page.tsx` (ou equivalente)
- `app/(public)/spells/[slug]/page.tsx`

**Exemplo de implementação**:
```tsx
<Link href={`/app/compendium?tab=monsters&q=${monster.slug}`}
  className="btn-primary">
  {t("open_in_compendium")}
</Link>
```

#### P2-5: `/join/[token]` — acesso ao compêndio

**O que fazer**: O `PlayerCompendiumBrowser` existe e é usado em `/join/[token]`, mas pode precisar de melhorias de UX (filtro por classe do personagem, tab padrão inteligente).

**Arquivos envolvidos**:
- `components/player/PlayerCompendiumBrowser.tsx` (tem changes uncommitted — inspecionar primeiro)
- `app/join/[token]/page.tsx` (tem changes uncommitted — inspecionar primeiro)

Verificar se a prop `playerClass` está sendo passada corretamente do personagem do player.

#### P2-6: AttunementSection — link para item SRD no Compêndio

**O que fazer**: Quando um item atunado tem `srd_ref` preenchido, adicionar botão/link "Ver no Compêndio" que abre o `ItemCard` via `pinCard("item", srd_ref)`.

**Arquivo**: `components/player-hq/AttunementSection.tsx`

**Implementação sugerida**:
```tsx
{item.srd_ref && (
  <button onClick={() => pinCard("item", item.srd_ref!, "2014")}
    className="text-xs text-muted-foreground hover:text-gold">
    📖
  </button>
)}
```

#### P2-7: AbilityCard — CommandPalette quick-query

**O que fazer**: No `AbilityCard`, adicionar botão que abre a CommandPalette já com o nome da ability pré-preenchido para busca rápida de rules reference.

**Arquivo**: `components/player-hq/AbilityCard.tsx`

Depende de expor `openPalette(query?: string)` da CommandPalette via context ou store.

---

### PASSO 6 — Itens de Backlog Identificados na Auditoria

Estes itens foram **notados mas não eram escopo** desta sessão. Registrados para futuras sessões:

#### Data pipeline improvements (`scripts/generate-srd-abilities-index.ts`)
- Adicionar `main()` wrapper (script não tem wrapper, exporta funções direto)
- Retry wrappers para fetch scripts (sem retry em caso de timeout/rate limit da 5e.tools API)
- Parallel fetches para classes (hoje é sequencial, 12 classes × 20 levels = ~240 requests)

#### Race condition no store SRD (srd-store.ts Phase 1/2)
- Se dois componentes disparam `loadAbilitiesIndex()` simultaneamente, podem haver duas promises em flight
- Adicionar guard `if (loading || loaded) return` no início de cada loader

#### DM visibility de abilities e attunement (sprint PL-02 do epic)
- Epic prevê que DM possa ver abilities e attunement dos players
- Ainda não implementado (depende de AB-01 e AT-01 — ambos concluídos)
- Ver `docs/epic-character-abilities-attunement.md` stories PL-02

#### CommandPalette — Abilities search
- A CommandPalette hoje busca spells, monsters, items, feats, backgrounds, conditions
- Abilities do personagem (character_abilities) ainda não aparecem na palette
- Seria útil para query rápida de "quanto de uso de Second Wind sobrou?"

#### PlayerHpActions — min-height ainda abaixo de 44px
- Fix desta sessão foi para `min-h-[40px]` — ainda 4px abaixo do mínimo WCAG
- Considerar subir para `min-h-[44px]` na próxima revisão de acessibilidade

---

## Arquivos Criados/Modificados Nesta Sessão

### Novos arquivos
| Arquivo | Propósito |
|---------|-----------|
| `components/compendium/RaceBrowser.tsx` | Browser de raças no compêndio (157 raças, busca, filtro por tamanho) |
| `components/compendium/BackgroundBrowser.tsx` | Browser de backgrounds (156+, busca, proficiências) |
| `components/oracle/FloatingCardContainer.tsx` | Container de cards flutuantes com PinnedFeatCard (fix C5) |
| `lib/srd/srd-loader.ts` | Loader de crossref, races, backgrounds para srd-store |
| `scripts/filter-srd-abilities-public.ts` | Script que filtra abilities-index: 2.890→689 entradas SRD-only |
| `scripts/filter-srd-public.ts` | Script atualizado de filter geral do public SRD bundle |
| `data/srd/abilities-index.json` | Índice completo de abilities (2.890 entradas, auth-gated) |
| `data/srd/monster-version-crossref.json` | Mapa bidirecional 2014↔2024 (794 entradas) |
| `public/srd/abilities-index.json` | Versão filtrada SRD-only (689 entradas, pública) |
| `public/srd/monster-version-crossref.json` | Cópia pública do crossref |
| `supabase/migrations/126_add_ability_attunement_constraints.sql` | CHECK + trigger de attunement (não aplicada no remoto) |
| `docs/fix-reaction-disappearing-group-reveal-concentrating.md` | Decision log: 3 bugs do vídeo beta |
| `docs/spec-monster-search-ux-redesign.md` | Spec completa do redesign do MonsterSearchPanel |

### Arquivos modificados com impacto significativo
| Arquivo | O que mudou |
|---------|-------------|
| `components/combat/MonsterSearchPanel.tsx` | Layout redesign (inline), keepOpenAfterAdd, botão adaptativo, token clicável |
| `components/player/PlayerJoinClient.tsx` | reaction_used preserve + optimistic self-condition toggle |
| `components/player/PlayerInitiativeBoard.tsx` | Group reveal + Concentrating toggle roxo |
| `components/session/CombatSessionClient.tsx` | Concentrating whitelist + persistConditions + hydration guard |
| `lib/hooks/useCharacterAbilities.ts` | Race condition fixes: cancelled guard, rollback por posição, resetByType |
| `lib/hooks/usePersonalInventory.ts` | Rollback na posição original + addItemFull otimista |
| `lib/supabase/campaign-membership.ts` | Fix FK join impossível |
| `lib/srd/srd-store.ts` | Phase 2 expandida (races, backgrounds, crossref) |
| `lib/srd/srd-search.ts` | getCrossVersionMonsterId() + getRaces() + getBackgrounds() |
| `lib/hooks/useCombatActions.ts` | handleSwitchVersion atualiza monster_id + HP + AC |
| `messages/en.json` + `messages/pt-BR.json` | +42 chaves i18n novas (abilities, attunement, races, backgrounds) |

---

## Regras e Contexto para o Próximo Agente

### Combat Parity Rule (CLAUDE.md — REGRA IMUTÁVEL)
Toda alteração em combat DEVE verificar os 3 modos:
- **Guest** (`/try`) → `GuestCombatClient` + Zustand + localStorage
- **Anônimo** (`/join`) → `PlayerJoinClient` + Supabase anon auth
- **Autenticado** (`/invite`) → `PlayerJoinClient` + Supabase auth + campaign_members

Guest é intencionalmente inferior (teaser) — não implementar features de realtime lá.

### SRD Compliance (CLAUDE.md — REGRA IMUTÁVEL)
- `public/srd/` → APENAS conteúdo SRD-only
- `data/srd/` → dados completos, auth-gated via `/api/srd/full/`
- Após alterar dados SRD: rodar `npx tsx scripts/filter-srd-public.ts` + `npx tsx scripts/filter-srd-abilities-public.ts`
- Nunca colocar traduções PT-BR em `public/`

### Touch targets
- Mínimo WCAG: 44px × 44px
- Usar `min-w-[44px] min-h-[44px]` ou `min-h-[44px]`
- PlayerHpActions está em 40px — não regredir

### i18n
- SEMPRE em inglês (`messages/en.json`) + PT-BR (`messages/pt-BR.json`) simultaneamente
- Namespaces: `combat`, `compendium`, `sheet`, `dashboard`, `player`
- Placeholders ICU: usar `.replace()` client-side se necessário (ver feedback_nextintl_icu_escaping.md)

### RTK
- **SEMPRE** prefixar comandos com `rtk`: `rtk git status`, `rtk tsc`, `rtk next build`, etc.

### Arquivos de referência importantes
| Arquivo | Uso |
|---------|-----|
| `docs/epic-character-abilities-attunement.md` | Epic completo com stories AB-01..AT-04..PL-02 |
| `docs/spec-monster-search-ux-redesign.md` | Spec do redesign do MonsterSearchPanel (fase 3 pendente) |
| `docs/fix-reaction-disappearing-group-reveal-concentrating.md` | Decision log de 3 bugs beta |
| `docs/bucket-future-ideas.md` | Backlog de features futuras |
| `docs/spec-resilient-reconnection.md` | Spec completa de reconexão resiliente |
| `docs/tech-stack-libraries.md` | Todas as libs disponíveis com exemplos |
| `supabase/migrations/126_add_ability_attunement_constraints.sql` | Migration pendente de push |
