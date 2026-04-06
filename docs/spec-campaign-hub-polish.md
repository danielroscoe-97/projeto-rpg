# Spec: Campaign Hub Polish — Visual Fixes + CRUD Redesign

**Status:** ✅ COMPLETO (Fases 1, 2 e 3 finalizadas + Code Review)  
**Data início:** 2026-04-05  
**Data conclusão:** 2026-04-05  
**Origem:** Feedback do Dani_ (audio + screenshots) + Party Mode session (Sally UX, Winston Architect, John PM, Amelia Dev)

---

## Inventário de Problemas (20 itens)

### BUGS (5) — ✅ TODOS RESOLVIDOS

| # | Problema | Status | Commit |
|---|---------|--------|--------|
| B1 | Seta dupla "← ← Voltar ao Dashboard" | ✅ Fase 1 | `ce3fce2` |
| B2 | "Voltar ao Dashboard" no Focus View deveria ser "← Voltar para {campaignName}" | ✅ Fase 1 | `ce3fce2` |
| B3 | NPC não carrega ao navegar de volta (stale state) | ✅ Fase 2 | `d6f7b8c` |
| B4 | Quest creation sem optimistic UI — delay enorme | ✅ Fase 2 | `d6f7b8c` |
| B5 | Inventory item add não atualiza | ✅ Fase 2 | `d6f7b8c` |

### VISUAL/UX (7) — ✅ TODOS RESOLVIDOS

| # | Problema | Status | Commit |
|---|---------|--------|--------|
| V1 | Header/Hero muito grande | ✅ Fase 1 | `ce3fce2` |
| V2 | Bordas muito brancas em todo lugar | ✅ Fase 1 + 3 | `ce3fce2`, `a99b91e` |
| V3 | Cards amontoados — pouco respiro entre seções | ✅ Fase 1 | `ce3fce2` |
| V4 | Player notes desconectadas do card do jogador | ✅ Fase 2 | `d6f7b8c` |
| V5 | Player cards inferiores aos NPC cards | ✅ Fase 2 | `d6f7b8c` |
| V6 | Quest input bar feia (campo texto livre) | ✅ Fase 3 | `6f5800b` |
| V7 | Locations/Factions com input inline pobre | ✅ Fase 3 | `6f5800b` |

### FEATURES NOVAS (8) — ✅ TODAS IMPLEMENTADAS

| # | Feature | Status | Commit |
|---|---------|--------|--------|
| F1 | Quest statuses (failed, cancelled) | ✅ Fase 3 | `6f5800b` |
| F2 | Quest campos estruturados (context, objective, reward, type) | ✅ Fase 3 | `6f5800b` |
| F3 | Quest/Location/Faction — suporte a imagem | ✅ Fase 3 | `6f5800b` |
| F4 | Encounters carregar personagens da campanha | ✅ Fase 2 | `d6f7b8c` |
| F5 | Bag of Holding pre-slots (potions, moedas, diamantes) | ✅ Fase 3 | `6f5800b` |
| F6 | Formulários consistentes (padrão modal NPC) | ✅ Fase 3 | `6f5800b` |
| F7 | Focus View "Voltar" vai pra campanha | ✅ Fase 1 | `ce3fce2` |
| F8 | Overview "Voltar" vai pro dashboard (sem seta duplicada) | ✅ Fase 1 | `ce3fce2` |

---

## Plano de Execução — Status Final

### FASE 1 — Quick Fixes Visuais ✅ COMPLETA
**Commit:** `ce3fce2`

1. ✅ Remover `&larr;` duplicado do CampaignHero (B1)
2. ✅ Focus View: "← Voltar para {campaignName}" com link pra overview (B2/F7)
3. ✅ Bordas: reduzir opacity em grid cards e hero (V2)
4. ✅ Header: compactar padding e spacing (V1)
5. ✅ Cards: melhorar gap/respiro entre seções (V3)

### FASE 2 — Bugs Funcionais + Player Cards ✅ COMPLETA
**Commits:** `d6f7b8c`, `787066a`

6. ✅ NPC stale state fix (B3)
7. ✅ Quest optimistic UI (B4)
8. ✅ Inventory optimistic update (B5)
9. ✅ Player card redesign — nota dentro do card, visual tipo NPC (V4/V5)
10. ✅ Encounters carregar personagens da campanha (F4)
11. ✅ Code review: mobile a11y, card click, i18n fixes

### FASE 3 — Formulários + Bag of Holding ✅ COMPLETA
**Commits:** `6f5800b`, `a99b91e`, `b689c07`

12. ✅ Quest: novo schema (status failed/cancelled, campos estruturados) + migration 106
13. ✅ Quest: formulário modal com campos (QuestForm + QuestCard + QuestBoard rewrite)
14. ✅ Location: formulário modal com campos + image (LocationForm + LocationCard + LocationList rewrite)
15. ✅ Faction: formulário modal com campos + image (FactionForm + FactionCard + FactionList rewrite)
16. ✅ Bag of Holding: pre-slots essenciais (potions, moedas, diamantes, goodberries)
17. ✅ i18n: ~80 novas keys PT-BR + EN
18. ✅ Code review: 3 CRITICALs + 2 WARNs corrigidos

---

## Arquivos Criados/Modificados

### Migration
- `supabase/migrations/106_campaign_crud_redesign.sql` — Quest fields + expanded status, Location image+visibility, Faction image, Bag essentials JSONB

### Types (novos/modificados)
- `lib/types/quest.ts` — QuestType, expanded QuestStatus, novos campos
- `lib/types/mind-map.ts` — CampaignLocation +image_url +is_visible_to_players, CampaignFaction +image_url
- `lib/types/bag-essentials.ts` — **NOVO** — BagEssentials interface

### Hooks (novos/modificados)
- `lib/hooks/use-campaign-quests.ts` — createQuest(QuestFormData), optimistic UI, expanded status
- `lib/hooks/use-campaign-locations.ts` — addLocation(LocationFormData), optimistic UI
- `lib/hooks/use-campaign-factions.ts` — addFaction(FactionFormData), optimistic UI
- `lib/hooks/use-bag-essentials.ts` — **NOVO** — fetch/update com debounce 800ms
- `lib/hooks/usePlayerQuestBoard.ts` — +failedQuests, +cancelledQuests

### Components (novos)
- `components/campaign/QuestForm.tsx` — Modal form (8 campos, dirty state, discard dialog)
- `components/campaign/QuestCard.tsx` — Card com borda por status, badges por tipo, expand
- `components/campaign/LocationForm.tsx` — Modal form (6 campos, discovered toggle, visibility)
- `components/campaign/LocationCard.tsx` — Card com ícone por tipo, badge discovered/hidden
- `components/campaign/FactionForm.tsx` — Modal form (5 campos, alignment com dots coloridos)
- `components/campaign/FactionCard.tsx` — Card com borda por alignment, dot colorido

### Components (reescritos)
- `components/campaign/QuestBoard.tsx` — Grid + filtros (all/active/available/completed/failed/cancelled)
- `components/campaign/LocationList.tsx` — Grid + filtros (all/discovered/hidden) + toolbar NPC-style
- `components/campaign/FactionList.tsx` — Grid + filtros (all/allies/neutral/hostile) + toolbar NPC-style
- `components/player-hq/BagOfHolding.tsx` — Essentials grid + custom items section
- `components/player-hq/PlayerQuestBoard.tsx` — +seções failed/cancelled
- `components/player-hq/PlayerQuestCard.tsx` — +status failed/cancelled

### i18n
- `messages/pt-BR.json` — ~80 novas keys (campaign.quests, locations, factions, player_hq.inventory.essentials, player_hq.quests)
- `messages/en.json` — ~80 novas keys (paridade completa)

---

## Code Review — Issues Remanescentes (não-críticos)

| # | Severidade | Issue | Nota |
|---|-----------|-------|------|
| W1 | WARN | Save errors silenciosos em Location/Faction (hooks retornam {error} sem throw) | Form fecha, optimistic rollback funciona, mas sem feedback visual |
| W3 | WARN | `campaignId` prop não usado em QuestForm/LocationForm/FactionForm | Dead prop, sem impacto funcional |
| W5 | WARN | Stale closure em `deleteLocation` rollback | Race condition rara no rollback path |
| W6 | WARN | Filtered-empty reusa msg genérica de empty | Minor UX — "Nenhum local" quando na verdade existem mas estão filtrados |
| W7 | WARN | Player view não mostra Locations/Factions/Bag | Intencional — essas seções são DM-only no CampaignFocusView |
| W8 | WARN | `_deprecated/CampaignSections.tsx` ainda no disco | Dead code, não importado por nada |

---

## Design System Aplicado

Todos os novos componentes seguem o padrão **NPC (gold standard)**:
- **Cards:** `bg-card border border-border/40 rounded-xl` + hover glow amber + top accent line
- **Forms:** Dialog modal com `space-y-4`, Labels + Inputs, dirty state + discard dialog
- **Lists:** Toolbar com filtros (`bg-amber-400/15 text-amber-400` ativo) + grid responsivo + empty state
- **Badges:** `inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium` + cores por tipo
- **Actions:** Hover-reveal (Eye/EyeOff, Pencil, Trash2) com `opacity-0 group-hover:opacity-100`
- **Paleta:** Gold/amber accent, surfaces escuros, bordas `border-border/40`, text `foreground/muted-foreground`
