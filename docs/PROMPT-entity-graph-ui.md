# Prompt — Entity Graph UI (Ondas 3b–3g)

> **Para:** Nova sessão fresca de Claude Code
> **Repositório:** `c:\Projetos Daniel\projeto-rpg` (branch base: `master`)
> **Pré-requisito:** Release 2026-04-20 em produção (8 ondas deployadas — ver `docs/DELIVERY-RELEASE-2026-04-20.md`)

---

## 🎯 COPY-PASTE: cole o bloco abaixo como PRIMEIRO prompt na nova janela

```
Você vai implementar a UI do Entity Graph do PocketDM (Ondas 3b a 3g).
A foundation SQL + lib + hook já estão em produção desde o release 2026-04-20.
Objetivo: entregar a camada de INTERFACE que o mestre usa para construir e
navegar a rede viva da campanha (NPCs ↔ Locais ↔ Facções ↔ Notas).

## CONTEXTO DO PROJETO

PocketDM (pocketdm.com.br) — Next.js App Router + TypeScript + Supabase.
PT-BR primary (83% BR), EN secondary. Dark mode default. Paleta taverna
(pergaminho + dourado + slate escuro). Shadcn/ui como base.

## O QUE JÁ ESTÁ EM PRODUÇÃO (foundation)

SQL (migrações já aplicadas):
- `supabase/migrations/146_location_hierarchy_guard.sql` — trigger anti-ciclo
  em `campaign_locations` (depth guard 20) + índice parcial para walk
- `supabase/migrations/147_entity_graph_scope_guard.sql` — função
  `entity_belongs_to_campaign(text, uuid, uuid) STABLE` + trigger que
  valida endpoints de `campaign_mind_map_edges` pertencem à campanha
- `supabase/migrations/148_entity_graph_relationships.sql` — expansão do
  CHECK de `relationship` com 18 valores (14 originais + `headquarters_of`,
  `rival_of`, `family_of`, `mentions`)

Typescript (já disponíveis no codebase):
- `lib/types/entity-links.ts` — `EntityType` ('npc'|'location'|'faction'|'note'|'quest'),
  `EdgeRelationship` (union de todos), `MindMapEdge`, `EntityRef`, etc.
- `lib/supabase/entity-links.ts` — API tipada:
  - `linkEntities(campaignId, source, target, relationship)`
  - `upsertEntityLink(...)` (idempotente)
  - `unlinkEntities(edgeId)`
  - `listEntityLinks(campaignId, entity)` (retorna vizinhança)
  - `listCampaignEdges(campaignId)` (todo o grafo)
- `lib/hooks/useEntityLinks.ts` — hook read-only `{ edges, loading, error, refetch }`
- `components/campaign/CampaignMindMap.tsx` — Mind Map visual existente com
  ReactFlow, usando `campaign_mind_map_edges`
- `components/campaign/NpcTagSelector.tsx` — padrão a generalizar para
  `EntityTagSelector`

## DOCS A LER NA ORDEM (antes de tocar em código)

1. `docs/DELIVERY-RELEASE-2026-04-20.md` — contexto do release anterior
2. `docs/PRD-entity-graph.md` §4–§9 — requisitos + UX + fases
3. `docs/UX-benchmarks-modern-ludic.md` §4–§6 — diretrizes visuais
   (iluminação, cartas, copy narrativa, tokens halo-*)
4. `docs/glossario-ubiquo.md` — terminologia oficial PT-BR

## REGRAS IMUTÁVEIS (CLAUDE.md — NÃO NEGOCIÁVEL)

1. **Combat Parity** — toda nova feature checa 3 modos (Guest `/try`,
   Anônimo `/join`, Auth `/invite`). Entity Graph é campaign-scoped →
   Auth-only. Guest/anon não têm acesso.

2. **Resilient Reconnection** — ZERO mudança em:
   - `lib/player-identity-storage.ts`
   - `lib/realtime/*` (canais `session:{id}` e `campaign:{id}:invites`)
   - `useCombatResilience` hook
   - Cadeia de fallbacks L1-L5

3. **SRD Compliance** — monsters/spells do SRD NÃO entram no grafo
   (conteúdo público read-only, não "entidades do mestre"). Se precisar
   linkar, é fora de escopo.

4. **SEO Canonical** — sem mudança em rotas públicas indexadas.

5. **RTK** — todo comando com prefix: `rtk tsc`, `rtk npm test`, `rtk git`,
   `rtk npx`, etc.

## ORDEM DE EXECUÇÃO (fases com entregáveis concretos)

### FASE 3b — Hierarquia de locais (1 sessão)

Foundation: mig 146 + `parent_location_id` já existe (mig 081).

**Criar:**
- `components/campaign/LocationParentSelect.tsx`
  - Dropdown de Locais da campanha atual
  - Filtra automaticamente: exclui o próprio local sendo editado +
    todos os descendentes (prevê ciclo client-side antes do trigger)
  - Suporta "Nenhum pai" (null = local raiz)

**Modificar:**
- `components/campaign/LocationForm.tsx` — novo campo "Local pai"
  (opcional) usando `LocationParentSelect`
- `components/campaign/LocationList.tsx` — renderizar como árvore
  expansível. Desktop: indentação + chevron toggle. Mobile: accordion
  com accordion items aninhados.
- `components/campaign/LocationCard.tsx` — breadcrumb no detalhe
  ("Norte > Porto Azul > Taverna do Pêndulo") quando há ancestrais

**i18n (adicionar em messages/pt-BR.json + en.json):**
- `campaign.locations.parent_label` = "Local pai" / "Parent location"
- `campaign.locations.parent_none` = "Nenhum (local raiz)" / "None (root location)"
- `campaign.locations.tree_view` = "Árvore" / "Tree"
- `campaign.locations.flat_view` = "Lista" / "Flat"
- `campaign.locations.breadcrumb_separator` = " > "
- `campaign.locations.cycle_error` = "Um local não pode ser pai de si mesmo nem de seus ancestrais"

**Critério de pronto:**
- Mestre cria "Porto Azul" (root), depois "Taverna do Pêndulo" com
  pai="Porto Azul"
- Tab Locais mostra árvore; chevron expande/colapsa
- Detalhe do local mostra breadcrumb
- Tentar criar ciclo: app bloqueia client-side (select filtra) E banco
  rejeita se passar (trigger mig 146)
- `rtk tsc --noEmit` clean; `rtk npm test` sem regressões
- Deleta local com filhos: filhos viram root (FK ON DELETE SET NULL já
  garante isso, mas confirme manualmente no UI — talvez confirm modal
  explicando)

**Commits focados:**
- `feat(locations): parent selector + anti-cycle client guard`
- `feat(locations): tree view rendering + breadcrumb`
- `feat(locations): i18n parent/tree keys`

### FASE 3c — Links NPC ↔ Local (1 sessão)

**Criar:**
- `components/campaign/EntityTagSelector.tsx` — generalização de
  `NpcTagSelector`. Props:
  - `type: 'location' | 'npc' | 'faction' | 'quest'`
  - `campaignId: string`
  - `selectedIds: string[]`
  - `onChange: (ids: string[]) => void`
  - `singleSelect?: boolean` (default false)
  - Usa hook próprio pra carregar entidades do tipo especificado

**Modificar:**
- `components/campaign/NpcForm.tsx` — nova seção "Morada" (singleSelect,
  type='location'). Ao salvar, cria edge `npc→location relationship=lives_in`.
- `components/campaign/LocationCard.tsx` — nova seção "Habitantes"
  (read-only, lista NPCs com `lives_in` apontando pra este local)
- Usar `useEntityLinks` pra fetchar vizinhança
- Usar `linkEntities` / `unlinkEntities` pra mudanças

**UX refinements:**
- Optimistic update (update state antes da Supabase confirmar)
- Rollback em erro com toast
- Chip "Remover link" com aria-label descritivo

**Critério de pronto:**
- DM edita NPC Viktor, seleciona local "Taverna do Pêndulo" → chip
  "Vive em: Taverna do Pêndulo" aparece
- DM abre detalhe de "Taverna do Pêndulo" → seção "Habitantes" mostra
  Viktor com link clicável
- Remover link é reversível (undo toast 5s)
- RLS testada: player com NPC invisível não vê link

**Commits:**
- `feat(entity-graph): EntityTagSelector generic component`
- `feat(npc): "Morada" section + lives_in edge`
- `feat(location): "Habitantes" section with edge reverse lookup`

### FASE 3d — Facções (1 sessão)

**Modificar:**
- `components/campaign/FactionForm.tsx` — seções:
  - "Sede" (singleSelect, type='location', edge `faction→location headquarters_of`)
  - "Membros" (multi, type='npc', edge `npc→faction member_of`)
- `components/campaign/FactionCard.tsx` — mostra contagens:
  - N membros (clicável → expande lista)
  - Sede: nome do local (clicável → navega)
- `components/campaign/NpcForm.tsx` — nova seção "Facções" (multi,
  type='faction', edge `member_of`)

**Critério de pronto:**
- DM cria "Círculo da Rosa Negra", adiciona 5 NPCs como membros + 1
  local como sede
- Ficha do NPC mostra chip "Membro de: Círculo da Rosa Negra"
- Ficha do Local mostra "Facções sediadas: Círculo da Rosa Negra"
- Facção vazia não quebra UI (empty state)

**Commits:**
- `feat(faction): "Sede" + "Membros" sections`
- `feat(npc): "Facções" section`
- `feat(faction-card): counts + clickable reverse links`

### FASE 3e — Notas linkadas + migração 151 (1–2 sessões)

**ATENÇÃO:** fase mais delicada. Migra dados existentes. Fazer com cuidado.

**Criar migração 151:**
`supabase/migrations/151_migrate_note_npc_links_to_edges.sql`

```sql
-- Migra note_npc_links existentes pra campaign_mind_map_edges
-- Idempotente — pode rodar 2x sem duplicar
INSERT INTO campaign_mind_map_edges (
  campaign_id, source_type, source_id, target_type, target_id, relationship
)
SELECT
  n.campaign_id,
  'note' AS source_type,
  nnl.note_id AS source_id,
  'npc' AS target_type,
  nnl.npc_id AS target_id,
  'mentions' AS relationship
FROM note_npc_links nnl
JOIN campaign_notes n ON n.id = nnl.note_id
ON CONFLICT (campaign_id, source_type, source_id, target_type, target_id)
  DO NOTHING;
```

**NÃO dropar `note_npc_links` nesta migração.** Drop vira migração 152
em sprint posterior, após 1 sprint de co-existência.

**Modificar:**
- `components/campaign/CampaignNotes.tsx`:
  - Substituir `linkNoteToNpc` por `linkEntities` genérico
  - Adicionar `<EntityTagSelector type="location" />` abaixo do NPC selector
  - Idem para `type="faction"` e `type="quest"`
  - Ao salvar nota, criar edges `mentions` para cada entidade selecionada
- `components/campaign/NpcCard.tsx` + `LocationCard.tsx` + `FactionCard.tsx`:
  - Painel "Notas sobre isto" — lista notas com edge `mentions` apontando
    pra esta entidade. Read-only. Cada nota clicável (navega ou abre preview).

**Critério de pronto:**
- Nota antiga linkada a NPC continua visível no NPC (lê via edges)
- Nova nota pode ser linkada a NPC + Local + Facção + Quest simultaneamente
- Ao abrir NPC: "Notas sobre isto" lista todas as menções
- Testes Jest atualizados para o novo path
- Migração 151 idempotente (rodar 2x não duplica)

**Commits:**
- `feat(notes): migration 151 — note_npc_links → edges (additive)`
- `feat(notes): generic entity links in CampaignNotes`
- `feat(entities): "Notas sobre isto" panel in NPC/Location/Faction cards`

### FASE 3f — Agrupamento e filtros (0.5 sessão)

**Modificar:**
- `components/campaign/LocationList.tsx` — switch de view:
  - "Árvore" (padrão — usa hierarquia)
  - "Lista" (flat, alfabética)
  - "Por tipo" (agrupa por location_type)
- `components/campaign/NpcList.tsx` — filtro novo:
  - Por facção (dropdown: "Todas" + lista de facções + "Sem facção")
  - Por local (dropdown: "Todos" + lista de locais + "Sem morada")
- Persistir preferência por campanha em `localStorage`:
  - Key: `pocketdm:list-view:{campaignId}:{entity}` (ex: `:locations`, `:npcs`)

**Critério de pronto:**
- Tab Locais alterna 3 modos visualmente distintos
- Filtros NPC aplicam instantaneamente (client-side)
- Preferência persiste entre sessões
- Campanha vazia não quebra (empty state com hint)

**Commits:**
- `feat(locations): 3-mode view switcher`
- `feat(npcs): filter by faction + location`
- `feat(lists): localStorage persist preferences`

### FASE 3g — Mapa visual focus + busca universal (1 sessão — OPCIONAL)

Pode ser adiada pra Onda 6 se 3b-3f estourarem prazo.

**Modificar:**
- `components/campaign/CampaignMindMap.tsx`:
  - Nova prop `focusNodeId?: string`
  - Destaca nó selecionado + 1° grau de vizinhança (opacity alta)
  - Demais nós ficam com opacity baixa (context)
- Cada ficha (`NpcCard`, `LocationCard`, `FactionCard`) ganha botão
  "Abrir no Mapa de Conexões" que navega pra `/app/campaigns/[id]?section=mindmap&focus={entityId}`

**Criar:**
- `components/campaign/UniversalSearch.tsx` — input universal na
  Campaign HQ (F27 do beta test, RF-14 do PRD):
  - Debounced search 120ms
  - Resultados agrupados por tipo (NPC/Local/Facção/Nota/Quest)
  - Cada resultado mostra badge com conexões
    (ex: "Viktor — 3 notas, 1 local, 2 facções")
  - Click navega pra ficha
  - Ctrl+F quando dentro de Campaign HQ abre este search
  (respeitar: se já estiver em input/textarea, não dispara)

**Critério de pronto:**
- Click em "Abrir no Mapa" de uma ficha → mapa abre com nó destacado
- UniversalSearch busca em 4 tabelas em paralelo com Promise.all
- Search fora de Campaign HQ não dispara (scope-aware)

**Commits:**
- `feat(mindmap): focus mode with neighborhood highlight`
- `feat(universal-search): cross-entity search in Campaign HQ`

---

## CHECKLIST DE SEGURANÇA (APÓS CADA FASE)

- [ ] `rtk tsc --noEmit` — zero erros
- [ ] `rtk npm test` — comparar com baseline (133 failing, 1184 passing
      em master no release 2026-04-20). Zero regressões.
- [ ] i18n PT-BR + EN em paridade (zero MISSING_MESSAGE)
- [ ] Combat Parity OK — guest/anon não devem ter acesso a campaign features
- [ ] Resilient Reconnection OK — nenhum arquivo em
      `lib/realtime/*`, `useCombatResilience`, `player-identity-storage`
      foi tocado
- [ ] RLS testada quando há migração (mig 151 é aditiva, não muda policies)

## REGRAS DE PUSH

- **Autorizado push direto em origin/master** após validação da fase
- SEMPRE rebase antes de push (`git pull --rebase origin master`)
- Se conflito: PARE e reporte. NÃO force-push.
- Use `rtk` prefix em comandos git
- Commits focados (1-3 por fase)
- Commit message em inglês (padrão do repo), mas conteúdo de spec/i18n
  em PT-BR + EN

## REGRAS DE COMUNICAÇÃO

- Use TodoWrite pra tracking de fases (1 task por fase)
- Reporte ao final de cada fase: commits + resultados de tsc/tests
- Se encontrar ambiguidade no PRD: PARE e pergunte (não improvise)
- Se migração tiver risco de data loss: PARE e peça review humana

## CRITÉRIO DE SUCESSO (release Entity Graph UI completo)

Considerar pronto quando:
1. ✅ Mestre cria hierarquia de 3 níveis de locais e navega via breadcrumb
2. ✅ NPC linka a Local (bidirecional — ficha do NPC e card do Local mostram)
3. ✅ Facção com 5 NPCs como membros + 1 local como sede
4. ✅ Nota linkada a NPC + Local + Facção — aparece nas 3 fichas
5. ✅ Ficha de cada entidade mostra "Conexões" (NPCs/Locais/Facções/Notas)
6. ✅ Tab Locais alterna 3 views (árvore/flat/por tipo)
7. ✅ RLS testada: player com entidade invisível não vê edge
8. ✅ Mind Map existente não regrediu (usa mesma tabela)
9. ✅ `rtk tsc` + `rtk npm test` passam
10. ✅ Performance mantida — carga de ficha com conexões ≤ 300ms P95

## ORDEM DE PRIORIDADE (se rate-limit ou tempo apertar)

Do maior valor de retenção pro menor:

1. **Fase 3b** (hierarquia) — destrava F17/F18, valor alto
2. **Fase 3c** (NPC↔Local) — destrava F20, valor alto
3. **Fase 3d** (Facções) — destrava F22/F28, valor médio
4. **Fase 3e** (Notas linkadas) — destrava F24/F26, valor alto (MAS migração)
5. **Fase 3f** (Filtros) — destrava F16, valor médio
6. **Fase 3g** (Mapa focus + search) — opcional, pode ir pra Onda 6

## VARIAÇÕES

Se quiser rodar em paralelo:
> "Trabalhe em worktrees isolados por fase. Fase 3b + 3c + 3d podem rodar
> paralelamente (arquivos não sobrepõem). Fase 3e depende das outras estarem
> mergeadas antes (migração 151 + lookups de edges)."

Se quiser dry-run:
> "NÃO faça push. Liste todas mudanças em formato diff resumido por fase.
> Aguarde aprovação antes de qualquer commit."

## START

1. Leia `docs/DELIVERY-RELEASE-2026-04-20.md` (contexto)
2. Leia `docs/PRD-entity-graph.md` §4–§9
3. Leia `docs/UX-benchmarks-modern-ludic.md` §4–§6
4. Use TodoWrite para criar plano
5. Execute Fase 3b primeiro
```

---

## Como usar este prompt

1. **Abrir NOVA janela** do Claude Code no mesmo repositório (`c:\Projetos Daniel\projeto-rpg`)
2. **Colar o bloco acima** (entre as aspas triplas) como primeiro prompt
3. O agente vai:
   - Ler os 4 docs referenciados
   - Criar TodoWrite com plano de 6 fases
   - Começar pela Fase 3b (hierarquia de locais)
   - Commit+push a cada fase validada

## O que eu garanto estando em produção antes de começar

- Migrações 146/147/148 aplicadas
- `lib/supabase/entity-links.ts` + `lib/types/entity-links.ts` + `lib/hooks/useEntityLinks.ts` disponíveis
- `CampaignMindMap` existente funciona com `campaign_mind_map_edges`
- `NpcTagSelector` disponível como referência pra generalizar

## Quando vai ter entregue tudo

Estimativa conservadora: **5–7 sessões** (1 por fase, mais margem pra 3e que tem migração).

Estimativa agressiva (paralelismo + worktrees): **3–4 sessões**.
