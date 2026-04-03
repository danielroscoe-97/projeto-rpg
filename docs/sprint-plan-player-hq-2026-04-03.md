# Sprint Plan — Player HQ Epic (2026-04-03)

> **Versao:** 1.0 — Pos-revisao adversarial com 3 agentes paralelos
> **Estrategia:** Co-piloto de mesa primeiro, inventario compartilhado depois
> **Filosofia:** *"O grosso pode estar na gente, mas tambem pode estar fora."*
> **Docs de referencia:**
> - [epic-player-hq.md](epic-player-hq.md) — Epic completo com schema e stories
> - [epic-campaign-dual-role.md](epic-campaign-dual-role.md) — Infra base (JA IMPLEMENTADA)
> - [backlog-beta-test-2026-04-02.md](backlog-beta-test-2026-04-02.md) — Beta test backlog pendente
> - [bucket-future-ideas.md](bucket-future-ideas.md) — Features adiadas

---

## Contexto: O Que Ja Existe

O Player HQ **nao parte do zero**. A revisao adversarial identificou que a infraestrutura base esta 100% implementada:

- `campaign_members` table + RLS + helpers + convites ✅
- Dashboard dual-role (DM + Player) ✅
- `PlayerCampaignCard`, `PlayerCampaignView`, `PlayerCharacterManager` ✅
- `SpellSlotTracker`, `QuestBoard`, `PlayerChat`, `PlayerSharedNotes` ✅
- Schema `player_characters` com race/class/level/notes/token_url/spell_slots ✅
- Rota `/app/app/campaigns/[id]` com auto-detect de role ✅

**O trabalho e de EXTENSAO, nao de criacao.** Isso reduz o effort total de 72 SP original para 61 SP revisado.

---

## Problemas Criticos Corrigidos

| # | Problema | Correcao aplicada |
|---|---|---|
| C1 | `combat_sessions` nao existe (tabela e `sessions`) | Documentado em edge cases do epic |
| C2 | `cover_image_url` nao existe em campaigns | Incluido na migration 056 |
| C3 | Migration 056 sobrepunha colunas existentes (race, class, ac) | Migration reescrita: so campos NOVOS |
| C4 | F2 dependia de tabelas dos Sprints 2/3 | Status chips agora sao progressivos (sem tabela = sem chip) |
| C5 | Sprint 1 era Bag of Holding (desalinhado com manifesto) | Sprint 1 agora e HP + Trackers ("co-piloto de mesa") |
| C6 | F10 criava trigger para tabela de F11 (circular) | Migration 060 (notifications) criada ANTES do trigger |
| C7 | Join com `auth.users` impossivel via PostgREST | Usar tabela `users` (schema public) |

---

## Sprint 1 — "Co-Piloto de Mesa" (valor de sessao imediato)

**Objetivo:** Entregar o nucleo do Player HQ — HP tracker, resource trackers com bolinhas, spell slots fora de combate. O jogador abre o app na mesa e gerencia estado volatil em tempo real.

**Metrica de validacao:** Jogador real consegue gerenciar HP, Wild Shape e Spell Slots durante uma sessao de 3h sem voltar ao papel.

**SP Total:** ~33 SP | **Duracao estimada:** 2 semanas

### 1.0 Migrations (fundacao)

| Item | Esforco | Arquivo |
|---|---|---|
| Migration 056: cover_image_url em campaigns + extensao player_characters | 2h | `supabase/migrations/056_campaign_cover_and_character_extended.sql` |
| Migration 057: character_resource_trackers | 2h | `supabase/migrations/057_character_resource_trackers.sql` |
| Atualizar tipos TypeScript | 1h | `lib/types/database.ts` |
| Criar diretorio `components/player-hq/` | — | Setup |

### 1.1 PHQ-E1-F1 — Estender Dashboard para Player Home

- **Story:** [PHQ-E1-F1](stories/PHQ-E1-F1-player-home-dashboard.md)
- **SP:** 3
- **Esforco:** 2-3 dias
- **O que ja existe:** `DashboardOverview.tsx`, `PlayerCampaignCard.tsx`, `getUserMemberships()`
- **O que criar:** Estender DashboardOverview com secao Player quando `getUserMemberships()` retorna campanhas. PlayerCampaignCard ja existe — refinar com dados extras (HP status, sessao ativa)
- **Edge case critico:** Jogador sem personagem na campanha → mostrar CTA "Crie seu personagem" em vez de card vazio
- **AC:** Dashboard mostra secao Player com cards de campanhas como jogador; zero regressao na secao DM

### 1.2 PHQ-E2-F3 — HP Tracker ao Vivo + Condicoes

- **Story:** [PHQ-E2-F3](stories/PHQ-E2-F3-character-hp-conditions.md)
- **SP:** 5
- **Esforco:** 3-4 dias
- **O que ja existe:** HP tiers em `lib/utils/hp-status.ts` (`getHpBarColor`), `CharacterForm.tsx`
- **O que criar:** `CharacterStatusPanel.tsx`, `HpDisplay.tsx`, `ConditionBadges.tsx`, hook `useCharacterStatus` com realtime
- **Rota nova:** `/app/app/campaigns/[id]/sheet` (pagina base do Player HQ)
- **Notas tecnicas:**
  - Tier "FULL" (>70%) como label extra no HQ — nao altera os 4 tiers imutaveis
  - Exhaustion: dropdown 0-6 em vez de toggle binario
  - Realtime via Supabase subscription em `player_characters`
- **AC:** Jogador edita HP inline com botoes rapidos; DM altera HP via combate → HQ reflete em <2s

### 1.3 PHQ-E2-F4 — Core Stats + Atributos + Edit Sheet

- **Story:** [PHQ-E2-F4](stories/PHQ-E2-F4-character-core-stats.md)
- **SP:** 3
- **Esforco:** 2 dias
- **O que ja existe:** `CharacterForm.tsx` (dialog de edicao basico com nome, raca, classe, hp, ac)
- **O que criar:** `CharacterCoreStats.tsx` (AC/Init/Speed inline), `CharacterAttributeGrid.tsx` (6 atributos com modificadores), `CharacterEditSheet.tsx` (drawer lateral expandido)
- **Nota:** `ac` e NOT NULL no schema — manter constraint. Atributos sao todos nullable.
- **AC:** Cards de AC/Init/Speed em linha; inspiracao como toggle dourado; atributos em accordion com mods auto-calculados

### 1.4 PHQ-E3-F5 — ResourceDots: Componente Generico de Bolinhas

- **Story:** [PHQ-E3-F5](stories/PHQ-E3-F5-resource-tracker-ui.md)
- **SP:** 3
- **Esforco:** 1-2 dias
- **O que ja existe:** `DeathSaveTracker.tsx` e `SpellSlotTracker.tsx` como referencia visual
- **O que criar:** `ResourceDots.tsx` (generico), `ResourceTrackerRow.tsx` (nome + icone reset + dots)
- **Fallback critico:** Recursos com `maxUses > 20` → exibir `<NumericTracker />` em vez de dots (Lay on Hands nivel 10 = 50 HP pool)
- **AC:** 3 tamanhos de dots, toggle com bounce, haptic, readonly mode, fallback numerico

### 1.5 PHQ-E3-F6 — CRUD de Resource Trackers

- **Story:** [PHQ-E3-F6](stories/PHQ-E3-F6-resource-tracker-crud.md)
- **SP:** 5
- **Esforco:** 3-4 dias
- **Deps:** PHQ-E3-F5, migration 057
- **O que criar:** `ResourceTrackerList.tsx`, `AddResourceTrackerDialog.tsx`, hook `useResourceTrackers`, rota `/app/app/campaigns/[id]/resources`
- **Nota:** Adicionar tracker em 3 campos: nome, maximo, reset type. 15 segundos de setup.
- **AC:** CRUD completo, drag-and-drop para reordenar, optimistic updates com debounce

### 1.6 PHQ-E3-F8 — Reset Short Rest / Long Rest / Dawn

- **Story:** [PHQ-E3-F8](stories/PHQ-E3-F8-resource-tracker-reset.md)
- **SP:** 3
- **Esforco:** 1-2 dias
- **Deps:** PHQ-E3-F6
- **O que criar:** `RestResetPanel.tsx` com 3 botoes no topo da aba Resources
- **Regra:** Long Rest reseta trackers `short_rest` + `long_rest` + spell_slots JSONB
- **AC:** Botoes com badges de contagem, confirmacao inline, toast + haptic

### 1.7 PHQ-E5-F12 — Spell Slots no Player HQ

- **Story:** [PHQ-E5-F12](stories/PHQ-E5-F12-spell-slots-hq.md)
- **SP:** 3
- **Esforco:** 1-2 dias
- **O que ja existe:** `SpellSlotTracker.tsx` + migration 054 (spell_slots JSONB)
- **O que criar:** `SpellSlotsHq.tsx` wrapper com layout expandido + edicao de max inline
- **Nota:** Reutiliza dados do F-41. Sem nova migration. ResourceDots como base visual.
- **AC:** Spell slots expandidos na aba Resources; edicao de max inline; Long Rest do F8 reseta slots

---

## Sprint 2 — "Bag of Holding" (inventario compartilhado)

**Objetivo:** Entregar o inventario compartilhado da party com fluxo de aprovacao do DM e notificacoes. Jogadores adicionam itens, DM controla remocoes.

**Metrica de validacao:** DM real cria campanha com imagem, jogadores adicionam itens na Bag, DM aprova remocao — fluxo completo funciona sem fricao.

**SP Total:** ~18 SP | **Duracao estimada:** 1 semana

### 2.0 Migrations

| Item | Esforco | Arquivo |
|---|---|---|
| Migration 058: party_inventory_items | 2h | `supabase/migrations/058_party_inventory.sql` |
| Migration 059: inventory_removal_requests | 1h | `supabase/migrations/059_inventory_removal_requests.sql` |
| Migration 060: player_notifications + trigger | 2h | `supabase/migrations/060_player_notifications.sql` |

### 2.1 PHQ-E1-F2 — Campaign Card com Imagem DM

- **Story:** [PHQ-E1-F2](stories/PHQ-E1-F2-campaign-card-player.md)
- **SP:** 3
- **Esforco:** 1-2 dias
- **O que ja existe:** `PlayerCampaignCard.tsx` (basico)
- **O que criar:** Estender card com imagem hero + overlay gradiente + status chips progressivos
- **Nota:** Status chips mostram dados disponiveis. Sem tabela de trackers = sem chip de tracker (graceful degradation)
- **Nota tecnica:** Usar `users` (public schema) em vez de `auth.users` para nome do DM
- **AC:** Card com imagem hero, overlay gradiente, status chips, badge de notificacao

### 2.2 PHQ-E4-F9 — Bag of Holding Core

- **Story:** [PHQ-E4-F9](stories/PHQ-E4-F9-bag-of-holding-core.md)
- **SP:** 5
- **Esforco:** 3-4 dias
- **O que criar:** `BagOfHolding.tsx`, `BagOfHoldingItem.tsx`, `AddItemForm.tsx`, hook `useBagOfHolding`, rota `/app/app/campaigns/[id]/inventory`
- **Dual view:** Secao no dashboard DM (accordion) + aba Inventario no Player HQ
- **AC:** Adicionar itens, log de quem adicionou, busca, realtime entre membros

### 2.3 PHQ-E4-F10 — Fluxo de Remocao + Aprovacao DM

- **Story:** [PHQ-E4-F10](stories/PHQ-E4-F10-bag-removal-flow.md)
- **SP:** 5
- **Esforco:** 3-4 dias
- **FIX I4:** `approveRemoval` deve popular `removed_by` com `requested_by` da solicitacao
- **AC:** Jogador solicita remocao → DM ve badge → DM aprova/nega → item muda de estado

### 2.4 PHQ-E4-F11 — Notificacoes In-App

- **Story:** [PHQ-E4-F11](stories/PHQ-E4-F11-bag-notifications.md)
- **SP:** 5
- **Esforco:** 2-3 dias
- **O que criar:** `NotificationBell.tsx`, `NotificationFeed.tsx`, hook `useNotifications`
- **Nota:** Trigger de notificacao ja criado na migration 060. F11 apenas consome.
- **Nota tecnica:** Resolver userId ANTES de criar realtime subscription (fix do Promise interpolation bug)
- **AC:** Sino com badge no header, feed de notificacoes, mark as read ao abrir

---

## Sprint 3 — "Notas + Quests" (entre-sessoes)

**Objetivo:** Jogador tem espaco privado para registrar o que aconteceu, quem conheceu, e quais missoes estao ativas. Gera habito de abrir o app entre sessoes.

**Metrica de validacao:** Jogador real usa notas rapidas durante sessao e journal apos sessao sem atrito.

**SP Total:** ~11 SP | **Duracao estimada:** 1 semana

### 3.0 Migrations

| Item | Esforco | Arquivo |
|---|---|---|
| Migration 061: player_npc_notes | 1h | `supabase/migrations/061_player_npc_notes.sql` |
| Migration 062: player_journal_entries | 1h | `supabase/migrations/062_player_journal.sql` |

### 3.1 PHQ-E6-F14 — Journal Privado + Notas Rapidas

- **Story:** [PHQ-E6-F14](stories/PHQ-E6-F14-player-notes.md)
- **SP:** 5
- **Esforco:** 3-4 dias
- **Distincao de F-40:** `campaign_notes` (F-40) = notas visiveis ao DM. `player_journal_entries` = journal 100% privado por RLS (DM NAO tem SELECT)
- **O que criar:** `PlayerNotesSection.tsx`, `QuickNotesList.tsx`, `JournalEntryCard.tsx`, hook `usePlayerNotes`, rota `/app/app/campaigns/[id]/notes`
- **AC:** Notas rapidas com autosave; journal por sessao; icone de cadeado; privacidade verificada

### 3.2 PHQ-E6-F15 — NPC Journal Pessoal

- **Story:** [PHQ-E6-F15](stories/PHQ-E6-F15-npc-journal.md)
- **SP:** 3
- **Esforco:** 2 dias
- **O que criar:** `NpcJournal.tsx`, `NpcCard.tsx`, hook `useNpcJournal`
- **Nota:** Distinto do NPC system do DM (campaign_npcs). Este e o caderninho pessoal do jogador.
- **AC:** CRUD de NPCs com relacao (aliado/inimigo/neutro/desconhecido); badge toggle; busca

### 3.3 PHQ-E7-F16 — Quest Board com Notas Pessoais

- **Story:** [PHQ-E7-F16](stories/PHQ-E7-F16-quest-board-player.md)
- **SP:** 3
- **Esforco:** 2 dias
- **O que ja existe:** `QuestBoard.tsx` com view readonly do player em `PlayerCampaignView`
- **O que criar:** `PlayerQuestBoard.tsx` (extensao), `PlayerQuestCard.tsx`, hook `usePlayerQuestBoard`, migration 064 (player_quest_notes)
- **AC:** Notas privadas por quest; favoritar com estrela; badge "Nova" para quests recem-criadas pelo DM

---

## Sprint 4 — "Polimento + SRD" (completude)

**Objetivo:** Autocomplete inteligente de recursos de classe via SRD e lista de magias do personagem. Features que elevam a experiencia mas nao sao bloqueantes.

**Metrica de validacao:** Jogador adiciona Ki Points e Rage com 2 taps (autocomplete preenche tudo).

**SP Total:** ~10 SP | **Duracao estimada:** 1 semana (pode ser paralelo com outro trabalho)

### 4.1 PHQ-E3-F7 — SRD Autocomplete para Resources

- **Story:** [PHQ-E3-F7](stories/PHQ-E3-F7-resource-tracker-srd.md)
- **SP:** 5
- **Esforco:** 3 dias
- **O que criar:** `srd-resources-index.json` (15+ entradas), `srd-class-resources.ts` (busca + pre-fill), combobox no AddResourceTrackerDialog
- **FIX M2:** Sneak Attack removido do index SRD (nao e resource trackavel). `cunning_action` corrigido.
- **AC:** Autocomplete client-side; pre-fill por nivel do personagem; "Usar como esta" para nomes livres

### 4.2 PHQ-E5-F13 — Lista de Magias

- **Story:** [PHQ-E5-F13](stories/PHQ-E5-F13-spell-list.md)
- **SP:** 5
- **Esforco:** 3-4 dias
- **O que ja existe:** `PlayerSpellBrowser.tsx` (15.9K) — reutilizar como base
- **O que criar:** `SpellListSection.tsx`, `SpellCard.tsx`, hook `useCharacterSpells`, migration 063 (character_spells)
- **AC:** Lista de magias do personagem com filtros; adicao via compendio SRD; status prepared/favorite

---

## Integracao com Backlog Existente

### Items do Beta Test Backlog que bloqueiam ou complementam o PHQ

| Item | Impacto no PHQ | Acao |
|---|---|---|
| **A.1** State Machine Polling/Realtime | PHQ usa realtime — se A.1 nao funciona, sync HP falha | Resolver A.1 ANTES ou em paralelo ao Sprint 1 |
| **C.13** Player HP Self-Management | Sobrepoe com PHQ-E2-F3 | PHQ-E2-F3 SUBSTITUI C.13 com implementacao mais completa |
| **C.14** Spells tab combat | Complementa PHQ-E5-F12/F13 | PHQ implementa a versao fora-de-combate; C.14 e a versao em-combate |
| **B.06** Tier FULL | Documentado no PHQ como tier extra | Implementar junto com PHQ-E2-F3 |
| **B.07** AC/Save DC display | Complementa PHQ-E2-F4 | Pode ser feito junto |
| **B.11** Damage log | Complementa HP tracker | Sprint futuro |
| **B.12** Legendary Actions | DM-only, sem impacto no PHQ | Sprint futuro |

### Recomendacao de Sequencia Global

```
Semana 1-2: Sprint 1 PHQ (co-piloto de mesa) + fix A.1 (realtime)
Semana 3:   Sprint 2 PHQ (bag of holding)
Semana 4:   Sprint 3 PHQ (notas + quests) + C.14 (spells em combate)
Semana 5:   Sprint 4 PHQ (polimento) — pode ser paralelo com B-stream
```

---

## Resumo de Esforco

| Sprint | Stories | SP | Migrations | Duracao |
|---|---|---|---|---|
| Sprint 1 — Co-Piloto | F1, F3, F4, F5, F6, F8, F12 | 25 | 056, 057 | ~2 semanas |
| Sprint 2 — Bag of Holding | F2, F9, F10, F11 | 18 | 058, 059, 060 | ~1 semana |
| Sprint 3 — Notas + Quests | F14, F15, F16 | 11 | 061, 062, 064 | ~1 semana |
| Sprint 4 — Polimento + SRD | F7, F13 | 10 | 063 | ~1 semana |
| **Total** | **16 stories** | **64 SP** | **9 migrations** | **~5 semanas** |

---

## Riscos e Mitigacoes

| Risco | Probabilidade | Impacto | Mitigacao |
|---|---|---|---|
| Conflito de numeros de migration com trabalho paralelo | Media | Medio | Usar proximo numero disponivel ao implementar, nao o planejado |
| Realtime nao funciona bem (depende de A.1) | Alta | Alto | Resolver A.1 antes/paralelo ao Sprint 1 |
| Regressao no combate existente (Player HQ e combate compartilham dados) | Media | Alto | Testes manuais apos cada sprint; componentes existentes nao sao alterados |
| Drag-and-drop sem biblioteca definida | Baixa | Baixo | Usar `@hello-pangea/dnd` (fork mantido do react-beautiful-dnd) |
| Email de notificacao nao configurado | Certa | Baixo | MVP entrega notificacao in-app apenas; email documentado no bucket |
| Escopo do Sprint 1 muito grande (33 SP) | Media | Medio | F12 (spell slots HQ) pode ser movido para Sprint 2 se necessario |

---

## Definicao de Done do Epic Completo

- [ ] Todas as 9 migrations aplicadas em staging
- [ ] 16 stories implementadas e verificadas
- [ ] Player HQ funcional em mobile (375px+) e desktop
- [ ] HP + resource trackers usaveis durante sessao real
- [ ] Bag of Holding com fluxo completo (adicao + remocao + aprovacao + notificacao)
- [ ] Notas privadas verificadas por RLS (DM nao acessa)
- [ ] Quest board com notas pessoais e favoritos
- [ ] Zero regressao no combate existente (DeathSaveTracker, SpellSlotTracker, PlayerJoinClient)
- [ ] Build sem erros (`next build`)
- [ ] Validacao com 3+ jogadores reais em mesa
