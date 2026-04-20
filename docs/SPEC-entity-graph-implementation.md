# SPEC — Entity Graph UI Implementation (Ondas 3b–3f)

> **Status:** Ready to code
> **Data:** 2026-04-20
> **Base PRD:** `docs/PRD-entity-graph.md`
> **Base prompt:** `docs/PROMPT-entity-graph-ui.md` (roadmap; esta SPEC sobrescreve discrepâncias)
> **Pré-requisito em prod:** migrações 146/147/148 + `lib/supabase/entity-links.ts` + `lib/hooks/useEntityLinks.ts` + `lib/types/entity-links.ts`
> **Regras imutáveis:** Combat Parity · Resilient Reconnection · SRD Compliance · SEO Canonical · RTK

---

## 0. Decisões fechadas (resolvem Q1-Q7 do PRD + gaps identificados)

| # | Questão | Decisão | Razão |
|---|---------|---------|-------|
| D1 | Numeração de migrações | **152** é a próxima livre (151 já tomada por `151_harden_create_campaign_search_path`) | Verificado em `supabase/migrations/` |
| D2 | Q1: NPC.morada é 0..1 ou 0..N? | **0..1** (singleSelect) | Simplifica UI; expandir se beta pedir |
| D3 | Q2: Delete local com NPCs habitantes | **Cascade edges via trigger 152-a** em `campaign_mind_map_edges` quando qualquer entidade referenciada é deletada. Entidades: não cascadeiam (`ON DELETE SET NULL` permanece em `parent_location_id`) | Edge órfã quebra RLS + consistência; app layer não é confiável |
| D4 | Q3: NPCs globais no grafo | **Sim** (mig 147 já permite) | Sem mudança |
| D5 | Q4: Nome único de local | **Único por pai** via partial unique index | Replica comportamento de filesystem |
| D6 | Q5: Delete facção com membros | **Cascade edges** (mesmo trigger 152-a) | Consistência com D3 |
| D7 | Q6: Feature flag `entity_graph_enabled` | **NÃO** — rollout geral, sem flag | Beta tester já pediu; risco controlado por fases |
| D8 | Q7: `custom_label` validation | **50 chars max**, trim, sem HTML sanitize no server (texto puro). Validar no client | Trigger DB já rejeita `relationship` inválido; label é livre |
| D9 | lib de árvore (react-arborist)? | **NÃO** — recursão manual com `<details>` ou estrutura flat com `depth` | Bundle +14kb não justifica para N<200 |
| D10 | RPC `get_entity_neighborhood` | **NÃO agora** — hook composto `useEntityNeighborhood` client-side usa `listEntityLinks` + fetch das entidades vizinhas | Suficiente para 100 entidades/campanha; RPC quando N>500 |
| D11 | API: `linkEntities` vs `upsertEntityLink`? | **Sempre `upsertEntityLink`** em flows interativos (evita UNIQUE violation no double-click) | Idempotência > descritividade |
| D12 | Cache / invalidação cruzada | **Refetch manual** via `refetch()` do hook após mutation. Sem Realtime, sem SWR | Escopo reduzido — realtime é Onda 6 (§7.5 do PRD) |
| D13 | Strangler de `NpcTagSelector` | **Manter** — `EntityTagSelector` novo é adicional. `NpcTagSelector` fica como está (usado em `CampaignNotes.tsx`); Fase 3e migra consumers | Zero-disruption |

---

## 1. Migrações SQL

### mig 152 — `152_entity_graph_edge_cascade.sql`

Trigger que remove edges quando entidade referenciada (npc/location/faction/note/quest) é deletada. Resolve D3+D6 sem criar FK polimórfica.

**Unique constraint de nome de local por pai** (D5): partial unique index.

Em um único arquivo:

```sql
-- 152_entity_graph_edge_cascade.sql
-- Entity Graph Phase 3b+ — see docs/SPEC-entity-graph-implementation.md §D3, §D5, §D6
--
-- (a) Cascade edges when a referenced entity is deleted.
-- (b) Unique location name per parent (null parent = root siblings).

-- (a) Edge cascade: one trigger per source table. Polymorphic FK not natively
-- supported by Postgres, so we emulate via AFTER DELETE triggers.

CREATE OR REPLACE FUNCTION delete_edges_referencing_entity()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_type text := TG_ARGV[0];
BEGIN
  DELETE FROM campaign_mind_map_edges
  WHERE (source_type = v_type AND source_id = OLD.id)
     OR (target_type = v_type AND target_id = OLD.id);
  RETURN OLD;
END;
$$;

COMMENT ON FUNCTION delete_edges_referencing_entity() IS
  'Entity Graph: AFTER DELETE trigger helper that removes polymorphic edges pointing at the deleted entity. First TG_ARGV is entity type string.';

DROP TRIGGER IF EXISTS campaign_npcs_cleanup_edges ON campaign_npcs;
CREATE TRIGGER campaign_npcs_cleanup_edges
  AFTER DELETE ON campaign_npcs
  FOR EACH ROW EXECUTE FUNCTION delete_edges_referencing_entity('npc');

DROP TRIGGER IF EXISTS campaign_locations_cleanup_edges ON campaign_locations;
CREATE TRIGGER campaign_locations_cleanup_edges
  AFTER DELETE ON campaign_locations
  FOR EACH ROW EXECUTE FUNCTION delete_edges_referencing_entity('location');

DROP TRIGGER IF EXISTS campaign_factions_cleanup_edges ON campaign_factions;
CREATE TRIGGER campaign_factions_cleanup_edges
  AFTER DELETE ON campaign_factions
  FOR EACH ROW EXECUTE FUNCTION delete_edges_referencing_entity('faction');

DROP TRIGGER IF EXISTS campaign_notes_cleanup_edges ON campaign_notes;
CREATE TRIGGER campaign_notes_cleanup_edges
  AFTER DELETE ON campaign_notes
  FOR EACH ROW EXECUTE FUNCTION delete_edges_referencing_entity('note');

DROP TRIGGER IF EXISTS campaign_quests_cleanup_edges ON campaign_quests;
CREATE TRIGGER campaign_quests_cleanup_edges
  AFTER DELETE ON campaign_quests
  FOR EACH ROW EXECUTE FUNCTION delete_edges_referencing_entity('quest');

-- (b) Unique location name per parent. Partial index covers NULL parent
-- ("root siblings") via coalesce to zero-uuid sentinel so NULL rows also
-- conflict on duplicate name.

CREATE UNIQUE INDEX IF NOT EXISTS idx_campaign_locations_unique_name_per_parent
  ON campaign_locations (
    campaign_id,
    COALESCE(parent_location_id, '00000000-0000-0000-0000-000000000000'::uuid),
    lower(name)
  );

COMMENT ON INDEX idx_campaign_locations_unique_name_per_parent IS
  'Entity Graph (D5): unique location name per (campaign, parent). Case-insensitive. NULL parent mapped to zero-uuid sentinel.';
```

### mig 153 — `153_migrate_note_npc_links_to_edges.sql` (Fase 3e)

Copia `note_npc_links` → `campaign_mind_map_edges`. Idempotente. **Não dropa** `note_npc_links` — fica como legacy co-existente.

```sql
-- 153_migrate_note_npc_links_to_edges.sql
-- Entity Graph Phase 3e — see docs/PRD-entity-graph.md §6.3

INSERT INTO campaign_mind_map_edges (
  campaign_id, source_type, source_id, target_type, target_id,
  relationship, created_by, created_at
)
SELECT
  n.campaign_id,
  'note' AS source_type,
  nnl.note_id AS source_id,
  'npc' AS target_type,
  nnl.npc_id AS target_id,
  'mentions' AS relationship,
  COALESCE(nnl.created_by, n.author_id) AS created_by,
  COALESCE(nnl.created_at, now()) AS created_at
FROM note_npc_links nnl
JOIN campaign_notes n ON n.id = nnl.note_id
ON CONFLICT (campaign_id, source_type, source_id, target_type, target_id)
  DO NOTHING;

COMMENT ON TABLE note_npc_links IS
  'LEGACY: superseded by campaign_mind_map_edges (source_type=note, target_type=npc, relationship=mentions) after mig 153. To be dropped in a later migration after 1 sprint of co-existence.';
```

> **Não dropar** `note_npc_links` nesta sprint. Drop vira mig futura em sprint posterior.

### mig 154 — `154_entity_graph_scope_guard_tighten.sql` (security hardening)

Adicionada após review adversarial (2026-04-20) — fecha dois defeitos latentes em `entity_belongs_to_campaign` (mig 147):

1. Unknown entity types (`session`/`encounter`/`player`/`bag_item`) agora retornam **FALSE** (fail-closed) em vez de **TRUE** — tightens attack surface antes de edges de sessão (Fase 3g).
2. NPCs globais (`campaign_id IS NULL`) agora exigem `user_id = auth.uid()` — impede que DM-A embute NPC de DM-B no próprio grafo.

`CREATE OR REPLACE FUNCTION` — idempotente, sem realocação do trigger.

---

## 2. Estrutura de arquivos — novos e modificados

### Fase 3b — Hierarquia de locais

**Novos:**
- `components/campaign/LocationParentSelect.tsx` — dropdown que filtra ciclos client-side
- `components/campaign/LocationBreadcrumb.tsx` — renderiza ancestrais

**Modificados:**
- `lib/types/mind-map.ts` — já tem `parent_location_id` (nenhuma mudança)
- `lib/hooks/use-campaign-locations.ts` — adicionar `parent_location_id` ao `LocationFormData` + `addLocation`
- `components/campaign/LocationForm.tsx` — adicionar campo "Local pai" (opcional) usando `LocationParentSelect`
- `components/campaign/LocationList.tsx` — renderizar como árvore (flat-list com `depth` computed; expand/collapse via `useState<Set<string>>`)
- `components/campaign/LocationCard.tsx` — breadcrumb no detalhe quando há ancestrais + indentação baseada em `depth` prop opcional
- `messages/pt-BR.json` + `messages/en.json` — novas chaves em `locations.*`
- `supabase/migrations/152_entity_graph_edge_cascade.sql` — cria

### Fase 3c — Links NPC ↔ Local

**Novos:**
- `components/campaign/EntityTagSelector.tsx` — componente genérico parametrizável
- `lib/hooks/useEntityNeighborhood.ts` — hook composto que hidrata edges com dados das entidades vizinhas

**Modificados:**
- `components/campaign/NpcForm.tsx` — seção "Morada" (singleSelect `EntityTagSelector type="location"`)
- `components/campaign/NpcCard.tsx` — chip "Vive em: X" (se existe edge)
- `components/campaign/LocationCard.tsx` — seção "Habitantes" (reverse lookup)
- `lib/hooks/use-campaign-npcs.ts` — adicionar `location_id` derivado (via hook helper) OU manter edges separados no NpcForm
- `messages/*` — chaves `campaign.npc.morada`, `campaign.location.habitantes`

### Fase 3d — Facções

**Modificados:**
- `components/campaign/FactionForm.tsx` — seções "Sede" + "Membros"
- `components/campaign/FactionCard.tsx` — contagens de membros + badge sede
- `components/campaign/NpcForm.tsx` — seção "Facções" (multi)
- `components/campaign/NpcCard.tsx` — chips de facções
- `components/campaign/LocationCard.tsx` — seção "Facções sediadas"

### Fase 3e — Notas linkadas

**Modificados:**
- `components/campaign/CampaignNotes.tsx` — adicionar seletores de Local/Facção/Quest (além do NPC existente)
- `components/campaign/NpcCard.tsx` + `LocationCard.tsx` + `FactionCard.tsx` — painel "Notas sobre isto"
- `supabase/migrations/153_migrate_note_npc_links_to_edges.sql` — cria

### Fase 3f — Agrupamento e filtros

**Modificados:**
- `components/campaign/LocationList.tsx` — switch 3 modos (árvore/flat/por tipo)
- `components/campaign/NpcList.tsx` — filtros por facção + local
- Util novo: `lib/hooks/use-list-view-preference.ts` — persiste em localStorage

---

## 3. Acceptance Criteria (rastreáveis)

### Fase 3b

- **AC-3b-01** Mestre cria local "Porto Azul" sem pai → aparece como raiz na tab Locais
- **AC-3b-02** Mestre cria "Taverna do Pêndulo" com pai="Porto Azul" → aparece indentado
- **AC-3b-03** Mestre clica chevron de "Porto Azul" → colapsa/expande filhos; preferência persiste em memória durante a sessão
- **AC-3b-04** Detalhe de "Taverna do Pêndulo" mostra breadcrumb "Porto Azul > Taverna do Pêndulo"
- **AC-3b-05** Dropdown "Local pai" ao editar "Porto Azul" NÃO lista "Taverna do Pêndulo" (descendente) nem "Porto Azul" (self)
- **AC-3b-06** Tentativa de ciclo via API (bypass UI) rejeitada pelo trigger mig 146
- **AC-3b-07** Tentar criar "Porto Azul" duplicado no mesmo nível falha (mig 152 unique index)
- **AC-3b-08** Deletar "Porto Azul" → "Taverna do Pêndulo" vira root (FK ON DELETE SET NULL); confirm modal alerta
- **AC-3b-09** `rtk tsc --noEmit` clean
- **AC-3b-10** Zero chave `MISSING_MESSAGE` nos dois locales

### Fase 3c

- **AC-3c-01** Ao editar NPC Viktor, seção "Morada" permite selecionar 1 local; salva cria edge `npc→location lives_in`
- **AC-3c-02** Card do Viktor (fechado) mostra chip "Vive em: Taverna do Pêndulo" em ≤300ms
- **AC-3c-03** Detalhe de "Taverna do Pêndulo" mostra seção "Habitantes" com Viktor + link clicável
- **AC-3c-04** ~~Remover link via X no chip é reversível dentro de 5s (toast undo)~~ — **DEFERIDO para Onda 6** (UX depth pass). `upsertEntityLink` + `unlinkEntities` são idempotentes, então re-linkar tem custo baixo; toast undo entrará junto com mention editor inline (§7.8 do PRD).
- **AC-3c-05** RLS: jogador membro não vê edge para NPC invisível (`is_visible_to_players=false`)
- **AC-3c-06** Double-click no botão "Salvar" não cria 2 edges (usa `upsertEntityLink`)

### Fase 3d

- **AC-3d-01** Facção "Círculo da Rosa Negra" criada com 5 NPCs como membros
- **AC-3d-02** FactionCard mostra "5 membros · Sede: Porto Azul" com links
- **AC-3d-03** NpcCard do membro mostra chip "Círculo da Rosa Negra"
- **AC-3d-04** LocationCard da sede mostra "Facções sediadas: Círculo da Rosa Negra"
- **AC-3d-05** Deletar facção → triggers mig 152 removem todas edges `member_of` e `headquarters_of`

### Fase 3e

- **AC-3e-01** Mig 153 roda 2x idempotente (sem duplicar rows)
- **AC-3e-02** Nota existente linkada a NPC continua visível no NPC (via edge)
- **AC-3e-03** Nova nota pode linkar NPC + Local + Facção + Quest simultaneamente
- **AC-3e-04** Painel "Notas sobre isto" em NpcCard/LocationCard/FactionCard lista menções
- **AC-3e-05** Jest: testes do `note_npc_links` passam com dual-read (path edges + path legacy)

### Fase 3f

- **AC-3f-01** Tab Locais alterna entre 3 modos (árvore / flat alfabética / por tipo)
- **AC-3f-02** NpcList filtra por facção (dropdown) e por local (dropdown) — client-side, instantâneo
- **AC-3f-03** Preferência de view persiste em `localStorage` com key `pocketdm:list-view:{campaignId}:{entity}`
- **AC-3f-04** Campanha vazia mostra empty state sem quebrar filtros

### Regressão (todas as fases)

- **AC-REG-01** `rtk tsc --noEmit` clean em cada fase
- **AC-REG-02** `rtk npm test` sem regressões vs baseline (133 failing / 1184 passing em master em 2026-04-20)
- **AC-REG-03** `CampaignMindMap.tsx` continua renderizando edges existentes (mesma tabela)
- **AC-REG-04** Guest `/try` e anônimo `/join` não têm acesso a nenhuma feature nova (Combat Parity)
- **AC-REG-05** Nenhum arquivo em `lib/realtime/*`, `lib/player-identity-storage.ts` ou `useCombatResilience` alterado (Resilient Reconnection)

---

## 4. i18n — chaves adicionadas

### Fase 3b (locations)

| Chave | PT-BR | EN |
|-------|-------|-----|
| `locations.parent_label` | "Local pai" | "Parent location" |
| `locations.parent_none` | "Nenhum (local raiz)" | "None (root location)" |
| `locations.parent_help` | "Organize locais em hierarquia (região > cidade > construção)" | "Organize locations in hierarchy (region > city > building)" |
| `locations.tree_view` | "Árvore" | "Tree" |
| `locations.flat_view` | "Lista" | "Flat" |
| `locations.by_type_view` | "Por tipo" | "By type" |
| `locations.breadcrumb_separator` | " › " | " › " |
| `locations.cycle_error` | "Um local não pode ser pai de si mesmo nem de seus descendentes" | "A location cannot be its own parent nor parent of its descendants" |
| `locations.duplicate_name_error` | "Já existe um local com esse nome neste nível" | "A location with this name already exists at this level" |
| `locations.delete_has_children_warning` | "Este local tem {count} sub-locais. Eles virarão locais raiz." | "This location has {count} sub-locations. They will become root locations." |
| `locations.expand_all` | "Expandir tudo" | "Expand all" |
| `locations.collapse_all` | "Recolher tudo" | "Collapse all" |

### Fase 3c (npcs + locations)

| Chave | PT-BR | EN |
|-------|-------|-----|
| `npcs.morada_label` | "Morada" | "Home location" |
| `npcs.morada_placeholder` | "Onde este NPC vive?" | "Where does this NPC live?" |
| `npcs.morada_none` | "Nenhuma" | "None" |
| `npcs.lives_in_chip` | "Vive em: {name}" | "Lives in: {name}" |
| `locations.habitantes_label` | "Habitantes" | "Inhabitants" |
| `locations.habitantes_empty` | "Nenhum NPC vive aqui ainda" | "No NPC lives here yet" |
| `locations.facoes_sediadas_label` | "Facções sediadas" | "Factions headquartered here" |
| `entity_graph.undo_unlink` | "Vínculo removido. Desfazer" | "Link removed. Undo" |
| `entity_graph.link_saved` | "Vínculo salvo" | "Link saved" |
| `entity_graph.save_failed` | "Falha ao salvar vínculo" | "Failed to save link" |

### Fase 3d (factions + npcs)

| Chave | PT-BR | EN |
|-------|-------|-----|
| `factions.sede_label` | "Sede" | "Headquarters" |
| `factions.sede_placeholder` | "Onde esta facção opera?" | "Where does this faction operate?" |
| `factions.sede_none` | "Nenhuma" | "None" |
| `factions.membros_label` | "Membros" | "Members" |
| `factions.membros_empty` | "Nenhum membro ainda" | "No members yet" |
| `factions.membros_count` | "{count, plural, =0 {sem membros} =1 {1 membro} other {# membros}}" | "{count, plural, =0 {no members} =1 {1 member} other {# members}}" |
| `npcs.facoes_label` | "Facções" | "Factions" |
| `npcs.facoes_chip` | "Membro de: {name}" | "Member of: {name}" |

### Fase 3e (notes)

| Chave | PT-BR | EN |
|-------|-------|-----|
| `notes.related_locations` | "Locais mencionados" | "Locations mentioned" |
| `notes.related_factions` | "Facções mencionadas" | "Factions mentioned" |
| `notes.related_quests` | "Quests mencionadas" | "Quests mentioned" |
| `entity_graph.notes_about_this` | "Notas sobre isto" | "Notes about this" |
| `entity_graph.notes_about_this_empty` | "Nenhuma nota menciona isto ainda" | "No note mentions this yet" |

### Fase 3f (lists)

| Chave | PT-BR | EN |
|-------|-------|-----|
| `npcs.filter_by_faction` | "Por facção" | "By faction" |
| `npcs.filter_by_location` | "Por local" | "By location" |
| `npcs.filter_all` | "Todas" | "All" |
| `npcs.filter_no_faction` | "Sem facção" | "No faction" |
| `npcs.filter_no_location` | "Sem morada" | "No location" |

---

## 5. Commits por fase

### Fase 3b
1. `feat(entity-graph): mig 152 edge cascade + unique name per parent`
2. `feat(locations): LocationParentSelect with cycle-safe filter`
3. `feat(locations): tree view rendering + breadcrumb + i18n`

### Fase 3c
4. `feat(entity-graph): EntityTagSelector generic component`
5. `feat(entity-graph): useEntityNeighborhood composite hook`
6. `feat(npc): Morada section with lives_in edge`
7. `feat(location): Habitantes section with reverse lookup`

### Fase 3d
8. `feat(faction): Sede + Membros sections`
9. `feat(npc): Facoes section + chips`
10. `feat(faction-card): counts + clickable reverse links`

### Fase 3e
11. `feat(entity-graph): mig 153 migrate note_npc_links to edges`
12. `feat(notes): generic entity links in CampaignNotes`
13. `feat(entities): Notas sobre isto panel in NPC/Location/Faction cards`

### Fase 3f
14. `feat(locations): 3-mode view switcher`
15. `feat(npcs): filter by faction + location`
16. `feat(lists): localStorage persist view preferences`

---

## 6. Checklist de segurança — após cada fase

- [ ] `rtk tsc --noEmit` clean
- [ ] `rtk npm test` — zero regressões vs baseline
- [ ] i18n PT-BR + EN paridade (zero `MISSING_MESSAGE`)
- [ ] Combat Parity — guest/anon sem acesso
- [ ] Resilient Reconnection — arquivos protegidos intactos
- [ ] `CampaignMindMap` abre sem regressão visual
- [ ] RLS testada se migração nova
