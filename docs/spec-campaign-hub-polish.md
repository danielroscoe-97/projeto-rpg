# Spec: Campaign Hub Polish — Visual Fixes + CRUD Redesign

**Status:** Em andamento  
**Data:** 2026-04-05  
**Origem:** Feedback do Dani_ (audio + screenshots) + Party Mode session (Sally UX, Winston Architect, John PM, Amelia Dev)

---

## Inventario de Problemas (20 itens)

### BUGS (5)

| # | Problema | Causa raiz | Arquivo |
|---|---------|-----------|---------|
| B1 | Seta dupla "← ← Voltar ao Dashboard" | Traducao `back_to_dashboard` ja tem "←" E o codigo adiciona `&larr;` | `CampaignHero.tsx:73` + `pt-BR.json:458` |
| B2 | "Voltar ao Dashboard" no Focus View deveria ser "← Voltar para {campaignName}" | Link aponta para `/app/dashboard` em vez de voltar para visao geral da campanha | `CampaignHeroCompact.tsx:47-52` |
| B3 | NPC nao carrega ao navegar de volta | Stale state — component nao re-fetch no remount | `NpcList.tsx` |
| B4 | Quest creation sem optimistic UI — delay enorme | Espera INSERT retornar antes de atualizar lista | `QuestBoard.tsx` |
| B5 | Inventory item add nao atualiza | Mesmo padrao — falta optimistic update | `BagOfHolding.tsx` |

### VISUAL/UX (7)

| # | Problema | Solucao |
|---|---------|---------|
| V1 | Header/Hero muito grande | Reduzir padding `p-5` → `p-4`, compactar KPI cards, `space-y-4` → `space-y-3` |
| V2 | Bordas muito brancas em todo lugar | Grid cards: `border-border/60` → `border-border/30`. Hero: `border-border` → `border-border/40` |
| V3 | Cards amontoados — pouco respiro entre secoes | Aumentar gap entre grupos do grid, mais espaco entre sections |
| V4 | Player notes desconectadas do card do jogador | Nota DEVE estar DENTRO do card, como campo integrado |
| V5 | Player cards inferiores aos NPC cards | Redesenhar player cards para usar layout visual do NpcCard (avatar, stat badges, campo de nota) |
| V6 | Quest input bar feia (campo texto livre) | Substituir por formulario estruturado modal (padrao NPC) |
| V7 | Locations/Factions com input inline pobre | Mesmo: substituir por formulario modal com campos especificos |

### FEATURES NOVAS (8)

| # | Feature | Detalhes |
|---|---------|---------|
| F1 | Quest statuses | Adicionar "failed" e "cancelled" ao enum |
| F2 | Quest campos estruturados | Context (textarea), Objective (textarea), Reward (textarea), Type (select: main/side/bounty/escort/fetch) |
| F3 | Quest/Location/Faction — suporte a imagem | Campo `image_url` (igual NPC tem `avatar_url`) |
| F4 | Encounters carregar personagens da campanha | Buscar `player_characters` da campanha, nao so `campaign_members` |
| F5 | Bag of Holding pre-slots | Slots fixos pre-definidos (potions, goodberries, moedas, diamantes) |
| F6 | Formularios consistentes | Todos usam padrao modal com campos tipados (padrao NPC) |
| F7 | Focus View "Voltar" deve ir pra campanha | `← Voltar para {campaignName}` → link para `/app/campaigns/{id}` |
| F8 | Overview "Voltar" deve ir pro dashboard | Mantem `← Voltar ao Dashboard` (sem seta duplicada) |

---

## Bag of Holding Pre-Slots

Slots fixos que ja aparecem na bag, campos numericos editaveis:

```
POCOES DE HP:
  Small Healing    [___]
  Greater Healing  [___]
  Superior Healing [___]
  Supreme Healing  [___]

CONSUMIVEIS:
  Goodberries      [___]

MOEDAS:
  Gold             [___]
  Silver           [___]
  Platinum         [___]

COMPONENTES:
  Diamonds         [___]
  Revivify Pack    [___]
```

Modelagem: coluna JSON `essentials` na tabela `campaigns` ou tabela dedicada `campaign_essentials`.

---

## Design: Formularios Unificados (Padrao NPC)

Todos os CRUD sections (Quests, Locations, Factions) devem seguir o padrao do NPC:

- Botao "+ Novo [X]" abre MODAL
- Modal com campos tipados: Nome*, campos especificos por tipo, imagem, visibilidade, observacoes
- Cards na lista usam visual tipo NpcCard: icone/imagem, nome em destaque, badges de metadata, expand

### Campos por tipo:

**QUEST:** Nome, Tipo (main/side/bounty/escort/fetch), Contexto, Objetivo, Recompensa, Status (available/active/completed/failed/cancelled), Imagem  
**LOCATION:** Nome, Tipo (city/dungeon/wilderness/building/region), Descricao, Imagem, Descoberto?  
**FACTION:** Nome, Alinhamento (ally/neutral/hostile), Descricao, Imagem, Visivel?

---

## Plano de Execucao

### FASE 1 — Quick Fixes Visuais (esta sessao)

1. Remover `&larr;` duplicado do CampaignHero (B1)
2. Focus View: "← Voltar para {campaignName}" com link pra overview (B2/F7)
3. Bordas: reduzir opacity em grid cards e hero (V2)
4. Header: compactar padding e spacing (V1)
5. Cards: melhorar gap/respiro entre secoes (V3)

### FASE 2 — Bugs Funcionais + Player Cards

6. NPC stale state fix (B3)
7. Quest optimistic UI (B4)
8. Inventory optimistic update (B5)
9. Player card redesign — integrar nota dentro do card, visual tipo NPC (V4/V5)
10. Encounters carregar personagens da campanha (F4)

### FASE 3 — Formularios + Bag of Holding

11. Quest: novo schema (status failed/cancelled, campos estruturados) + migration (F1/F2)
12. Quest: formulario modal com campos (V6/F6)
13. Location: formulario modal com campos + image (V7/F3/F6)
14. Faction: formulario modal com campos + image (V7/F3/F6)
15. Bag of Holding: pre-slots essenciais (F5) + migration
16. Imagem support em quests (F3)
