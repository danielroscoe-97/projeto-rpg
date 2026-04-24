# Implementation Plan — 4 Fases, 22 Stories

**Prereq:** [PRD §11](./PRD-EPICO-CONSOLIDADO.md) + [07-spec-funcional.md](./07-spec-funcional.md)
**Owner:** Amelia (dev) com review Winston (arch)
**Feature flag:** `NEXT_PUBLIC_PLAYER_HQ_V2=true` (default OFF em prod)

---

## 📊 Visão geral

| Fase | Duração | Depende de | Entregável |
|---|---|---|---|
| **A** Quick wins | 3-4 dias | Nada | Ficha atual densificada (sem mudar topologia) |
| **B** Topologia 7→4 | 5-7 dias | A mergeada | 4 tabs (Herói/Arsenal/Diário/Mapa) + redirects |
| **C** Ribbon + Combate Auto | 5-7 dias | B + realtime consolidado | Ribbon Vivo + Modo Combate Auto + layout 2-col |
| **D** Wiki + Backlinks + Biblioteca | 10-14 dias | Winston schema aprovado | player_notes + player_favorites + parser @ + cross-nav + Ctrl+K favoritos |
| **E** Wizard de Level Up | 10-14 dias | D mergeada | level_up_invitations + UI Mestre + Wizard 6 passos + audit trail |

**Total:** 3-4 semanas (1 dev part-time), paralelo com outros sprints.

---

## 🎯 FASE A — Quick Wins (sem topologia nova)

**Objetivo:** Densificar a ficha atual aplicando os tokens novos, sem mexer em nav. Ganho imediato 30-40% de densidade.

### A1. Aplicar spacing tokens novos na ficha
**Size:** S (2-4h)
**Files:**
- [components/player-hq/PlayerHqShell.tsx:171](../../components/player-hq/PlayerHqShell.tsx#L171) — `space-y-4` → `space-y-3`
- [components/player-hq/PlayerHqShell.tsx:249](../../components/player-hq/PlayerHqShell.tsx#L249) (sheet tab) — mesmo
- [components/player-hq/PlayerHqShell.tsx:289](../../components/player-hq/PlayerHqShell.tsx#L289) (resources tab) — mesmo
- [components/player-hq/CharacterStatusPanel.tsx:53](../../components/player-hq/CharacterStatusPanel.tsx#L53) — `p-4` → `px-4 py-3`
- Todos os cards `.bg-card border border-border rounded-xl p-4` → `p-3`

**AC:**
- [ ] Screenshot comparativa mostra altura total do conteúdo reduzido em ≥20%
- [ ] Nenhum texto corta ou sobrepõe
- [ ] Mobile (390px) permanece legível

**Risco:** Nenhum, puramente visual.

### A2. Remover accordion de atributos
**Size:** S (2-3h)
**Files:**
- [components/player-hq/CharacterCoreStats.tsx](../../components/player-hq/CharacterCoreStats.tsx) — remove state `showAttributes`, expõe ABILITY_SCORES sempre
- Ajustar testes unit `components/player-hq/__tests__/CharacterCoreStats.test.tsx` se existir

**AC:**
- [ ] Ability scores (STR/DEX/CON/INT/WIS/CHA) sempre visíveis
- [ ] Modifier calculado sempre ("+0", "+2", etc)
- [ ] Mobile 3×2 grid, desktop 6×1
- [ ] Zero clique pra ver modifier

### A3. Densificar rows de perícias
**Size:** M (4-6h)
**Files:**
- [components/player-hq/ProficienciesSection.tsx](../../components/player-hq/ProficienciesSection.tsx) — reorganizar em grid 3-col em desktop (mantém 1-col mobile)
- Row height de ~56px → 36px

**AC:**
- [ ] 18 perícias cabem em ≤240px de altura em desktop
- [ ] Tooltip mostra descrição da perícia (roadmap) — MVP sem tooltip
- [ ] Dot proficient clicável em modo edit

### A4. Header em 2 linhas (era 4)
**Size:** S (2h)
**Files:**
- [components/player-hq/PlayerHqShell.tsx:175-231](../../components/player-hq/PlayerHqShell.tsx#L175) — reorganizar header

**AC:**
- [ ] Linha 1: `◄ [campanha] · [personagem] · [meta]`
- [ ] Linha 2 removida — meta absorvida na linha 1
- [ ] Ações `[PDF]` `[✎]` alinhadas à direita da linha 1
- [ ] Altura total do header ≤56px

### A5. HP controls inline no HpDisplay
**Size:** M (3-5h)
**Files:**
- [components/player-hq/HpDisplay.tsx](../../components/player-hq/HpDisplay.tsx) — `[−5][−1][+1][+5]` na mesma linha do HP bar (não abaixo)
- HP Temp ganha row mini abaixo, só se > 0

**AC:**
- [ ] HP + controles ocupam <80px de altura total
- [ ] HP Temp row aparece só se `hp_temp > 0` (senão esconde)
- [ ] Controles ainda funcionam em mobile (tap target ≥40px)

### A6. Pós-combate redireciona pro Herói (decisão #43)
**Size:** M (5-7h)
**Files:**
- [components/conversion/RecapCtaCard.tsx](../../components/conversion/RecapCtaCard.tsx) — ajustar `redirectTo` default
- [components/conversion/GuestRecapFlow.tsx](../../components/conversion/GuestRecapFlow.tsx) — idem
- [components/guest/GuestUpsellModal.tsx](../../components/guest/GuestUpsellModal.tsx) — atualizar default redirect
- `components/player-hq/PostCombatBanner.tsx` (novo) — banner "🎉 Combate vencido!" no topo do Herói
- `lib/hooks/usePostCombatState.ts` (novo) — detecta `combat:ended` recente (<5min) e expõe stats do combate

**Comportamento:**
- Autenticado: combat:ended → toast com CTA pra `/sheet?tab=heroi`, auto-redirect 5s
- Anônimo via /join: RecapCtaCard com `redirectTo=/sheet?tab=heroi`, OAuth claim auto
- Banner pós-combate: HP final + duração + dano tomado + slots usados + "Anotar →" CTA

**AC:**
- [ ] Combate encerra → autenticado vai pro Herói em <2 cliques (1 click + auto-redirect 5s)
- [ ] Anônimo vê CTA de criação de conta no fim do combate; OAuth redireciona pro Herói
- [ ] Banner aparece quando jogador chega no Herói pós-combate (<5min de combat:ended)
- [ ] Banner some em 30s ou ao clicar "Anotar →" (vai pra Diário > Rápidas)
- [ ] sessionStorage preserva HP/slots/efeitos do anon por 24h mesmo sem login
- [ ] dismissal-store respeita cap 3x por sessão
- [ ] E2E: cobre 3 cenários (auth member, anon via /join, guest via /try)

---

## 🎯 FASE B — Topologia 7→4

**Objetivo:** Substituir as 7 tabs por 4 (Herói/Arsenal/Diário/Mapa). Zero refactor de componentes internos — apenas reorganização.

### B1. Novo PlayerHqShell com 4 tabs
**Size:** L (6-10h)
**Files:**
- [components/player-hq/PlayerHqShell.tsx](../../components/player-hq/PlayerHqShell.tsx) — refactor TABS array + switch de conteúdo
- Criar wrappers: `<HeroiTab />`, `<ArsenalTab />`, `<DiarioTab />`, `<MapaTab />`

**AC:**
- [ ] 4 tabs renderizam conteúdo correto
- [ ] Icons: Heart / Package / BookOpen / Network (todos Lucide gold)
- [ ] Zero regressão funcional
- [ ] TypeScript check limpo

### B2. Composição dos componentes existentes nos tabs novos
**Size:** M (4-6h)
**Files:**
- `<HeroiTab />` compõe: CharacterStatusPanel + CharacterCoreStats + ProficienciesSection + ActiveEffectsPanel + SpellSlotsHq + ResourceTrackerList + SpellListSection
- `<ArsenalTab />` compõe: AbilitiesSection + AttunementSection + BagOfHolding + PersonalInventory
- `<DiarioTab />` compõe: PlayerNotesSection + DmNotesInbox + NpcJournal + PlayerQuestBoard
- `<MapaTab />` compõe: PlayerMindMap (inalterado)

**AC:**
- [ ] Cada wrapper é self-contained (não vaza estado entre tabs sem motivo)
- [ ] Rest/descanso afeta todos os componentes relevantes (já testado hoje via hooks)

### B3. Back-compat de deep links
**Size:** M (3-5h)
**Files:**
- `app/app/campaigns/[id]/sheet/page.tsx` — aceitar `?tab=` param; se valor antigo (ficha/recursos/etc), redirect com novo param

**Mapping:**
```
?tab=ficha        → ?tab=heroi
?tab=recursos     → ?tab=heroi&section=recursos
?tab=habilidades  → ?tab=arsenal&section=habilidades
?tab=inventario   → ?tab=arsenal
?tab=notas        → ?tab=diario&section=notas
?tab=quests       → ?tab=diario&section=quests
?tab=map          → ?tab=mapa
```

**AC:**
- [ ] URL antigo copiado de recap do Mestre ainda funciona
- [ ] Browser history não quebra
- [ ] SSR renderiza tab correta sem flash

### B4. Default tab = Herói + persistência
**Size:** S (2-3h)
**Files:**
- `app/app/campaigns/[id]/sheet/page.tsx` — default `tab=heroi`
- `lib/hooks/usePlayerHqTabState.ts` (novo) — localStorage 24h TTL

**AC:**
- [ ] Primeira visita: Herói
- [ ] Segunda visita (mesmo browser, mesma campanha, <24h): última tab usada
- [ ] >24h: volta pra Herói
- [ ] Query param override tudo

### B5. Atalhos de teclado 1-4 + `?` (help)
**Size:** S (2-3h)
**Files:**
- `components/player-hq/PlayerHqKeyboardShortcuts.tsx` (novo) — event listener global
- `components/player-hq/KeyboardHelpOverlay.tsx` (novo) — mostra atalhos ao pressionar `?`

**AC:**
- [ ] 1/2/3/4 trocam tab
- [ ] `N` abre nota rápida overlay (MVP: pode ser só navigate `?tab=diario&section=quick-note` — spec completo na Fase D)
- [ ] `?` abre overlay listando atalhos
- [ ] Atalhos ignorados quando foco em input/textarea

### B6. E2E Playwright: topologia basic
**Size:** M (4-6h)
**Files:**
- `e2e/features/player-hq-topology.spec.ts` (novo)

**Cenários:**
- Default tab = Herói ao abrir
- Click em cada tab muda conteúdo
- Deep link ?tab=ficha redireciona pra ?tab=heroi
- Atalho `2` leva pra Arsenal
- Tab persistida em 2ª visita dentro de 24h

**AC:**
- [ ] 5 testes passando em CI
- [ ] Zero flakiness em 10 runs

---

## 🎯 FASE C — Ribbon Vivo + Modo Combate Auto

**Objetivo:** Ribbon sticky no topo + layout 2-col desktop + detecção automática de combate.

### C1. Componente `<RibbonVivo />`
**Size:** L (8-12h)
**Files:**
- `components/player-hq/RibbonVivo.tsx` (novo)
- Composição: HpDisplay (existente, adaptado) + AC badge + Init badge + Speed + Inspiration + CD Magia + Slot summary + Conditions

**AC:**
- [ ] Sticky `top:0 z-20`
- [ ] Height 56px desktop, 48px mobile com expand
- [ ] HP bar full-width atrás do texto
- [ ] Pulse gold 1.5s ao mudar HP (usar `.glow-gold-flash`)
- [ ] Mobile compacto + expand button

### C2. Resumo de slots no ribbon
**Size:** S (2-3h)
**Files:**
- `components/player-hq/SlotSummary.tsx` (novo, sub-componente do RibbonVivo)

**AC:**
- [ ] Format: `Slots: R{restantes} D{disponíveis} A{ativos}` OR mini-grid compacto
- [ ] Atualiza em tempo real ao consumir slot na coluna B
- [ ] Esconde se não-caster (spell_slots null ou empty)

### C3. Layout 2-col desktop
**Size:** M (4-6h)
**Files:**
- `components/player-hq/HeroiTab.tsx` — CSS Grid 2-col ≥1280px, single-col <1280px
- Ajustar composição: coluna A (ABILITY + SAVES + SKILLS) / coluna B (EFFECTS + RESOURCES + SLOTS + SPELLS)

**AC:**
- [ ] Desktop 1440px: 2 cols de ~560px + gap 40px
- [ ] Desktop 1280px: 2 cols de ~500px (menor gap)
- [ ] <1280px: single-col
- [ ] Zero regressão mobile

### C4. Hook `useCampaignCombatState`
**Size:** M (4-6h)
**Files:**
- `lib/hooks/useCampaignCombatState.ts` (novo)

**Spec:**
- Subscribe ao canal `campaign:${id}` (já consolidado)
- Eventos: `combat:started` → state.combat_active = true + round + turno; `combat:ended` → state.combat_active = false
- Fallback polling `campaigns.combat_active` a cada 10s se realtime silencioso >30s
- Retorna `{ active, round, currentTurn, nextTurn }`

**AC:**
- [ ] Reconnection-safe (re-subscreve em background)
- [ ] Ponte com useCharacterStatus pra pulse gold ao dano
- [ ] Zero leaks de canal (cleanup em unmount)

### C5. Modo Combate Auto
**Size:** L (6-10h)
**Files:**
- `components/player-hq/CombatBanner.tsx` (novo)
- `components/player-hq/HeroiTab.tsx` (adaptar)

**Comportamento:**
- Quando hook retorna `active=true`:
  - Banner aparece acima do ribbon (slide-from-top 300ms)
  - Badge ⚡ pulsante na aba Herói
  - Coluna A: perícias colapsam em accordion
  - Coluna B: efeitos/slots/resources expandem
  - FAB 📝 aparece bottom-right
  - CTA "Entrar no Combate →" aparece no ribbon
- Quando `active=false`:
  - Banner fade-out 400ms
  - Layout volta ao normal

**AC:**
- [ ] Transição suave sem content layout shift (CLS <0.1)
- [ ] Nunca força troca de tab (só destaca)
- [ ] Funciona em mobile (simplificado)

### C7. Ability chip rolável (decisão #44)
**Size:** L (8-12h)
**Files:**
- `components/player-hq/AbilityChip.tsx` (novo) — substitui o markup atual em CharacterCoreStats
- `components/player-hq/RollResultToast.tsx` (novo) — popover/toast de resultado
- `lib/hooks/useAbilityRoll.ts` (novo)
- `lib/utils/dice-roller.ts` (existe? senão criar) — `rollD20WithMod(mod, advantage?)`
- (se existir) `roll_history` table — verificar; senão schema novo simples

**Comportamento:**
- Click zona CHECK → rola 1d20 + mod → toast "STR check: 14 (12+2)"
- Click zona SAVE → rola 1d20 + mod + PB (se prof) → toast "CON save: 22 (14+8)"
- Modificadores temporários do ribbon (Bless +1d4, Bardic Inspiration) podem ser auto-aplicados via dropdown contextual
- Realtime broadcast pro Mestre (mesmo canal)
- Salva em log local (24h sessionStorage) + persistido se auth
- Long-press abre menu com Advantage/Disadvantage/+manual

**AC:**
- [ ] 12 ability chips (6 desktop + 6 mobile) viram componente único
- [ ] Touch targets 44px
- [ ] Hover mostra 🎲 desktop
- [ ] Toast com cálculo detalhado
- [ ] Broadcast pro Mestre em <500ms
- [ ] Long-press funciona em mobile (Advantage menu)
- [ ] E2E: clicar em CON save com prof = 1d20+8

### C6. E2E Playwright: Modo Combate Auto
**Size:** M (4-6h)
**Files:**
- `e2e/features/player-hq-combat-auto.spec.ts` (novo)

**Cenários:**
- Broadcast `combat:started` → badge aparece em <2s
- Jogador em Diário + broadcast → banner em Herói, Diário permanece ativo
- Click "Entrar no Combate" → navega pra `/app/combat/[id]`
- Broadcast `combat:ended` → banner some em <400ms
- Layout volta pro estado leitura

**AC:**
- [ ] 5 cenários passando
- [ ] Zero flakiness

---

## 🎯 FASE D — Mini-wiki + Backlinks + Cross-nav

**Objetivo:** Entregar a decisão #24 (mini-wiki) + #20 (backlinks) + cross-nav entre Diário e Mapa.

### D1. Migration `player_notes` + RLS + hooks
**Size:** M (4-6h)
**Files:**
- `supabase/migrations/11X_player_notes.sql` (novo) — spec em [schema-investigation-winston §2 M1](../architecture/schema-investigation-winston.md)
- `lib/hooks/usePlayerNotes.ts` (novo)

**AC:**
- [ ] Dual-auth (user_id XOR session_token_id)
- [ ] RLS enforcing ownership
- [ ] Hook CRUD: list / create / update / delete por campanha
- [ ] Tags array + GIN index funciona

### D2. Editor markdown (Diário > Minhas Notas)
**Size:** L (8-12h)
**Files:**
- `components/player-hq/diario/MinhasNotas.tsx` (novo)
- `components/ui/MarkdownEditor.tsx` (novo ou reuso se existir)

**Features MVP:**
- CRUD básico
- Título (opcional — deriva da 1ª linha se null)
- Tags (chips inline)
- Search local (text + tag filter)
- Auto-save 30s

**AC:**
- [ ] Criar nota em <30s
- [ ] Edit inline sem modal
- [ ] Mobile OK
- [ ] Anônimo vê "Crie conta pra salvar" CTA

### D3. Parser `@` frontend + batch insert edges
**Size:** L (8-12h)
**Files:**
- `lib/parser/backlinks-parser.ts` (novo) — parse content_md, extrai `@{nome}` menções
- Usar `campaign_mind_map_edges` existente via `edges(note → npc/quest/location, rel='mentions')`

**AC:**
- [ ] `@Grolda` vira chip clicável no preview
- [ ] Autocomplete ao digitar `@` sugere entidades da campanha (NPCs/Quests/Locations/Factions)
- [ ] Edges inseridas em transaction ao salvar nota
- [ ] Edges removidas ao apagar menção

### D4. Cross-nav Diário ↔ Mapa
**Size:** M (3-5h)
**Files:**
- `components/player-hq/NpcCard.tsx` — adicionar link "Ver no Mapa"
- `components/player-hq/PlayerMindMap.tsx` — drawer de NPC tem tab "Notas" que linka pra Diário

**AC:**
- [ ] Click em "Ver no Mapa" em NPC card navega pra `?tab=mapa&drawer=npc:{id}`
- [ ] Click em "Ver no Diário" em drawer do Mapa navega pra `?tab=diario&section=npcs&id={id}`
- [ ] URL é compartilhável (pode copiar e mandar pro Mestre)

### D5. Notificações in-app de notas do Mestre + quests
**Size:** M (4-6h)
**Files:**
- `lib/hooks/usePlayerNotifications.ts` (novo)
- Badge em Diário na tab bar
- `components/player-hq/diario/DmNotesInbox.tsx` (refactor se existir)

**Realtime events a subscribar:**
- `note:received` (Mestre envia nota ao jogador)
- `quest:assigned` (Mestre atribui quest)
- `quest:updated` (Mestre muda status)

**AC:**
- [ ] Badge aparece em <2s após broadcast
- [ ] Badge some ao marcar como lida
- [ ] Toast discreto opcional (config do Jogador)

### D6. Migration `player_favorites` + RLS + hook (decisão #40)
**Size:** M (4-6h)
**Files:**
- `supabase/migrations/11Y_player_favorites.sql` (novo) — spec em [PRD §10.1.b](./PRD-EPICO-CONSOLIDADO.md)
- `lib/hooks/usePlayerFavorites.ts` (novo)

**AC:**
- [ ] Dual-auth (user_id XOR session_token_id) com unique constraint
- [ ] RLS enforcing ownership
- [ ] Hook CRUD: list / favorite / unfavorite / updateNote por entity_type
- [ ] Anônimo via RPC com session_token (padrão mig 069)

### D7. Botão ⭐ Favoritar em fichas do compêndio
**Size:** M (5-7h)
**Files:**
- `components/compendium/MonsterCard.tsx` — adicionar `<FavoriteToggle />`
- `components/compendium/SpellCard.tsx` — idem
- `components/compendium/ItemCard.tsx` — idem
- `components/compendium/FavoriteToggle.tsx` (novo) — componente reutilizável

**AC:**
- [ ] Botão `⭐` aparece em todo card de SRD/MAD do compêndio
- [ ] Click toggle favorita/desfavorita (optimistic + pulse gold)
- [ ] Estado persiste cross-session
- [ ] Anônimo: prompt "Crie conta pra salvar" no primeiro click
- [ ] Atalho `F` quando ficha aberta em drawer

### D8. Sub-aba Biblioteca em Diário
**Size:** L (8-10h)
**Files:**
- `components/player-hq/diario/Biblioteca.tsx` (novo)
- `components/player-hq/diario/FavoriteCard.tsx` (novo) — card unificado pra spell/monster/item/feat/npc
- `components/player-hq/diario/FavoriteFilters.tsx` (novo) — chips por entity_type
- `components/player-hq/diario/DiarioTab.tsx` — adicionar sub-aba

**Features MVP:**
- Lista de favoritos agrupada por tipo
- Filtros: `[Todos] [🪄 Magias] [👹 Monstros] [⚔ Itens] [🎯 Feats] [🧝 NPCs]`
- Search local por nome
- Click no card → drawer com ficha completa
- Anotação inline editável
- Cross-nav: monstros/NPCs com edges no graph mostram link "Ver no Mapa"
- Magias favoritadas têm link "Ver em Spells > Favoritas"

**AC:**
- [ ] 7ª sub-aba aparece no Diário
- [ ] Lista carrega <500ms até 100 favoritos
- [ ] Filtros funcionam combinados com search
- [ ] Empty state amigável: "Favorite magias, monstros e itens no compêndio pra acesso rápido aqui"
- [ ] Mobile single-col com cards densos

### D9. Ctrl+K busca favoritos junto com compêndio
**Size:** S (3-4h)
**Files:**
- `components/global-search/QuickSearch.tsx` (existente) — adicionar source 'favorites'
- Result item ganha badge `⭐` se for favoritado

**AC:**
- [ ] Busca retorna favoritos primeiro (boost score)
- [ ] Badge ⭐ visível em todo resultado favoritado
- [ ] Ordering: favoritos > compêndio do app > entidades da campanha

---

## 🎯 FASE E — Wizard de Level Up (decisão #41 · 7 stories)

**Objetivo:** Mestre libera level up via UI; Jogador roda wizard guiado de 6 passos. Broadcast realtime + audit trail.
**Duração:** 10-14 dias (mais complexa por causa das regras 5e validadas).

### E1. Migration `level_up_invitations` + RLS
**Size:** M (4-6h)
**Files:**
- `supabase/migrations/11Z_level_up_invitations.sql` (novo) — spec em [PRD §10.1.c](./PRD-EPICO-CONSOLIDADO.md)

**AC:**
- [ ] Schema completo com checks
- [ ] RLS: Mestre full CRUD, Player read/update próprio
- [ ] Indexes pra perf (pending por character)
- [ ] TTL default 7 dias

### E2. UI do Mestre — botão "Liberar Level Up"
**Size:** L (8-10h)
**Files:**
- `components/dm/LevelUpRelease.tsx` (novo) — modal com lista de characters + nível alvo + mensagem
- Trigger no painel da campanha do Mestre (CampaignDmViewServer)

**AC:**
- [ ] Lista characters com nível atual
- [ ] Multi-select (1, alguns, todos)
- [ ] Input de "nível alvo" (default = current+1)
- [ ] Textarea opcional pra mensagem narrativa
- [ ] Confirm + INSERT batch das invitations
- [ ] Realtime broadcast `levelup:offered` automaticamente

### E3. Sinal no Player HQ — chip dourado no ribbon
**Size:** S (3-4h)
**Files:**
- `components/player-hq/RibbonVivo.tsx` — adicionar suporte a `pendingLevelUp`
- Hook `useLevelUpInvitation(characterId)` (novo)

**AC:**
- [ ] Chip "🎉 Subir de Nível →" aparece no ribbon row 1 quando invitation pending
- [ ] Pulse gold animado
- [ ] Click abre wizard (E4-E6)
- [ ] Persiste mesmo após reload (estado do servidor)
- [ ] Some quando completed/declined/expired

### E4. Wizard de Level Up — esqueleto + steps 1-2
**Size:** L (8-12h)
**Files:**
- `components/player-hq/levelup/LevelUpWizard.tsx` (novo) — drawer/modal com stepper
- `components/player-hq/levelup/Step1ChooseClass.tsx` (multiclass)
- `components/player-hq/levelup/Step2Hp.tsx` (rolar ou média)

**AC:**
- [ ] Stepper visual (●○○○○○ progress)
- [ ] Step 1 skip auto se single-class
- [ ] Step 2: botões "Rolar 1dN+CON" (animação) ou "Pegar média"
- [ ] Validação: HP mínimo (1 + CON mod)
- [ ] Estado salvo em `choices jsonb` em cada step (resume se fechar)

### E5. Wizard steps 3-4 — ASI/Feat + Spells
**Size:** L (10-14h)
**Files:**
- `components/player-hq/levelup/Step3AsiOrFeat.tsx` (níveis canônicos: 4, 8, 12, 16, 19)
- `components/player-hq/levelup/Step4Spells.tsx` (se caster, com filtro por classe)

**AC:**
- [ ] Step 3 só aparece em níveis canônicos
- [ ] ASI: UI de distribuir 2 pontos (cap em 20)
- [ ] Feat: search com auto-complete + half-feats (1 pt + meio-feat)
- [ ] Step 4: lista spells aprendidas/preparadas atualizadas conforme classe + nível
- [ ] Slots novos calculados auto

### E6. Wizard steps 5-6 — Features + Subclass + Resumo
**Size:** M (6-8h)
**Files:**
- `components/player-hq/levelup/Step5Features.tsx` (preview do que ganha)
- `components/player-hq/levelup/Step6Subclass.tsx` (níveis canônicos por classe)
- `components/player-hq/levelup/StepFinalReview.tsx` (resumo + confirm)

**AC:**
- [ ] Step 5: lista features ganhas com descrição SRD
- [ ] Step 6: só aparece se for nível de subclass choice (varia por classe)
- [ ] Resumo final mostra todas as mudanças
- [ ] Confirm: UPDATE character + status='completed' + broadcast
- [ ] Cancel: invitation fica pending

### E7. UI do Mestre — feedback de completion + cancelamento
**Size:** S (3-4h)
**Files:**
- Toast/notification quando jogador completa
- Lista de pending invitations em alguma seção do Mestre
- Botão "Cancelar invitation"

**AC:**
- [ ] Toast "Capa Barsavi subiu pro lv 11" ao receber `levelup:completed`
- [ ] Lista de pending invitations no painel do Mestre
- [ ] Cancel atualiza status + broadcast `levelup:cancelled`
- [ ] Auto-expire job (cron diário ou trigger Postgres) marca expired quando passa TTL

---

## 📊 Riscos consolidados

| Risco | Fase | Prob | Impacto | Mitigação |
|---|---|---|---|---|
| Realtime quota estoura | C, D | M | A | Canais consolidados; monitorar métrics |
| Backlinks parser lento em nota grande | D | M | M | Parser frontend MVP; worker v1.5 |
| Mobile 390px fica apertado | A, C | B | A | Ribbon compacto; single-col; breakpoints |
| Usuários confundem por topologia nova | B | M | A | Tour atualizado; redirect transparente de URLs |
| Regressão em combate (Combat Parity) | todo | A | A | E2E obrigatório; Guest/Anon/Auth coverage |
| PWA push complexo | D | A | B | Sair do MVP — só in-app notifications |

---

## 🏁 Definition of Done (por fase)

**Fase A:**
- [ ] 5 stories merged
- [ ] Zero regressão visual (screenshots compared)
- [ ] TypeScript + lint limpo
- [ ] Manual QA em desktop + mobile

**Fase B:**
- [ ] 6 stories merged
- [ ] E2E Playwright 5 testes passando
- [ ] Feature flag defaulted OFF em prod
- [ ] Tour atualizado

**Fase C:**
- [ ] 6 stories merged
- [ ] E2E Playwright 5 testes de Modo Combate Auto
- [ ] Combat Parity verificada (Guest/Anon/Auth)
- [ ] Métricas baseline capturadas (largura útil, cliques)

**Fase D:**
- [ ] 5 stories merged
- [ ] Schema migration aplicada em prod
- [ ] RLS validada com testes
- [ ] Telemetria de uso de Minhas Notas instrumentada

**Pré-release global:**
- [ ] Feature flag ligada em 10% dos usuários → 50% → 100%
- [ ] Métricas §12 do PRD medidas
- [ ] Retrospective documentado
