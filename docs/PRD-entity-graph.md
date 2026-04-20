# PRD — Campaign Entity Graph

> **Status:** Pronto para arquitetura / pré-implementação
> **Origem:** Beta test session 3 (F23) + ROADMAP Onda 3
> **Prioridade:** Alta (diferencial competitivo, bloqueia Onda 3)
> **Data:** 2026-04-19
> **Autor:** Architect (Claude) — pós Party Mode
> **Revisores pendentes:** PM, UX, Dev lead
> **Fonte primária de requisitos:** `docs/beta-test-session-3-2026-04-16.md` §Bloco 3 (F16–F28)
> **Doc relacionado:** `docs/ROADMAP-pos-linguagem-ubiqua.md` (Onda 3), `docs/epic-mind-map.md` (infra existente), `docs/glossario-ubiquo.md`

---

## 1. Problema

Hoje o mestre do PocketDM enxerga sua campanha como **listas desconectadas** — uma lista de NPCs, uma lista de locais, uma lista de facções, uma lista de notas. Isso contradiz como RPGs funcionam: um mundo vivo é **uma rede**. O beta tester reportou 12 feedbacks distintos no Bloco 3 (F16–F28) demonstrando exatamente essa dor:

1. **Não sabe como agrupar:** "Eu tenho 20 NPCs. Qual mora onde? Quais são aliados? Vira caos." (F16, F22, F28)
2. **Não consegue modelar o mundo real:** "Uma cidade tem tavernas. Uma taverna tem dono. Esse dono tem quest. Tudo isso vira nota solta hoje." (F17, F18, F20)
3. **Não acha contexto na hora que precisa:** "No meio da sessão, abro o NPC Viktor e não vejo que ele tá conectado àquela nota secreta da casa do barão." (F24, F26)
4. **Não consegue pesquisar o mundo:** "Quero buscar 'Espada de Fogo' e ver em qual nota, qual NPC, qual local apareceu. Hoje abro cada pasta." (F27)
5. **Não enxerga a rede:** "Queria um mapa — um quadro mental de tudo." (F21)

O beta tester disse literalmente: *"Revisitar tudo e montar PRD/épico para evoluir a estrutura de campanha"* (F23). Este é esse PRD.

Consequência no funil: **sem o grafo, a campanha não vira ferramenta de prep ativa** — vira apenas container de fichas estáticas. Isso ataca retenção diretamente (métrica `sessions_per_DM_per_week` do ROADMAP §2.1).

---

## 2. Visão (o estado desejado)

Ao final desta feature, o mestre do PocketDM **constrói um mundo interconectado** e **navega-o como rede**. Ao abrir o NPC Viktor, vê automaticamente: o local onde mora (taverna), a facção que integra (Círculo da Rosa Negra), as notas que o mencionam, as quests em que aparece. Ao criar uma nota no meio da sessão, linka-a a um ou mais NPCs/locais/facções em 2 cliques. Ao construir uma cidade, aninha tavernas e casas como sub-locais. Ao final, abre o **Mapa de Conexões** e vê toda a campanha como um grafo vivo — a "teia do destino" que a ferramenta promete.

O segundo cenário: na sessão 8, o mestre lembra que "alguém comentou algo sobre uma espada". Ele pesquisa o termo, o app traz 3 notas + 2 NPCs + 1 local, todos linkados entre si. Em 10 segundos ele tem o contexto que antes levava 5 minutos folheando pastas.

---

## 3. Personas e jobs-to-be-done

### 3.1 Persona primária — Mestre em preparação (off-session)

| Job-to-be-done | Situação atual | Após Entity Graph |
|---|---|---|
| "Montar o mapa mental da campanha antes da próxima sessão" | Lista flat de NPCs/locais/notas — não reflete mundo | Cria hierarquia de locais (região > cidade > taverna), linka NPCs a locais, agrupa NPCs em facções, linka notas a entidades |
| "Adicionar um novo NPC já contextualizado" | Cria NPC, escreve "mora em Porto Azul" no campo descrição, perde o link estrutural | Cria NPC, seleciona local "Porto Azul" como morada, seleciona facção "Guarda da Cidade", pronto |
| "Lembrar detalhes enterrados em 20 notas" | Ctrl+F em cada pasta | Pesquisa universal; ao abrir entidade, vê todas notas que a mencionam |

### 3.2 Persona secundária — Mestre em sessão (on-session)

| Job-to-be-done | Situação atual | Após Entity Graph |
|---|---|---|
| "Responder rapidamente quando jogador pergunta 'quem é esse NPC mesmo?'" | Abre NPC, lê descrição curta | Abre NPC, vê painel lateral com: local, facção, notas linkadas, quests ativas — contexto completo em 1 clique |
| "Tomar nota no meio da sessão sem perder contexto" | Cria nota nova, link só a NPC (se lembrar) | Cria nota, linka a N entidades de uma vez, aparece no grafo |

### 3.3 Persona terciária — Jogador buscando contexto (player-facing, Fase futura)

| Job-to-be-done | Situação atual | Após Entity Graph |
|---|---|---|
| "Entender o que meu personagem sabe sobre o mundo" | Mind map do jogador mostra só nós visíveis soltos | Mesma rede filtrada por visibilidade — jogador vê teia do que descobriu |

---

## 4. Requisitos funcionais (P0 bloqueia launch da Onda 3; P1 é core; P2 é polish)

### Hierarquia de locais
- **RF-01 (P0):** Mestre pode definir um local pai ao criar/editar um local (ex: "Taverna do Pêndulo" tem como pai "Porto Azul"). Self-reference, N níveis.
- **RF-02 (P0):** Sistema previne ciclos na hierarquia (A é pai de B, B é pai de A). Validação tanto no cliente quanto em trigger no banco.
- **RF-03 (P1):** UI mostra locais como árvore expansível/colapsável na tab Locais, com breadcrumb no detalhe do local (ex: "Norte > Porto Azul > Taverna do Pêndulo").
- **RF-04 (P1):** Mestre pode mover um local para outro pai por drag-or-select (mudança de `parent_location_id`).
- **RF-05 (P2):** Filtro "mostrar apenas locais raiz" + "expandir tudo" / "colapsar tudo".

### Links entre entidades (cross-entity)
- **RF-06 (P0):** Mestre pode linkar NPC ↔ Local (relação "vive em"). Formulário do NPC tem campo "Mora em" com seleção de local. Formulário do Local tem seção "Habitantes" com NPCs.
- **RF-07 (P0):** Mestre pode linkar NPC ↔ Facção (relação "membro de"). Formulário da Facção tem seção "Membros" com NPCs.
- **RF-08 (P1):** Mestre pode linkar Facção ↔ Local (relação "sede em"). Formulário da Facção tem campo "Sede".
- **RF-09 (P1):** Remover link é operação reversível (confirmação + undo de 5s).
- **RF-10 (P2):** Mestre pode linkar NPC ↔ NPC com tipos: "aliado de", "inimigo de", "familiar de" (custom_label).

### Notas linkadas a entidades
- **RF-11 (P0):** Mestre pode linkar uma nota a 0..N entidades de qualquer tipo (NPC, Local, Facção, Quest). Chips na edição da nota.
- **RF-12 (P0):** Ao abrir uma entidade, vê todas notas linkadas (painel "Notas sobre isto").
- **RF-13 (P1):** Ao criar uma nota no card/ficha de uma entidade, a nota já nasce linkada a ela.
- **RF-14 (P2):** Pesquisa de texto global retorna notas + entidades + mostra quais se conectam a quais.

### Agrupamento e filtragem
- **RF-15 (P1):** Tab Locais permite agrupar por `location_type` (cidade, masmorra, etc.) ou por região (local raiz).
- **RF-16 (P1):** Tab NPCs permite agrupar por facção ou por local.
- **RF-17 (P2):** Tab Notas permite filtro por "notas linkadas a esta entidade" quando navegado via link.

### Navegação do grafo
- **RF-18 (P1):** Ficha de cada entidade (NPC, Local, Facção) exibe painel lateral "Conexões" com links clicáveis para outras entidades.
- **RF-19 (P2):** Botão "Abrir no Mapa de Conexões" foca o nó correspondente no Mind Map existente.
- **RF-20 (P2):** Breadcrumb de navegação mantém histórico da última entidade visitada.

### RLS / segurança (Combat Parity + campaign-scoped)
- **RF-21 (P0):** Todos os RF-01 a RF-20 são **Auth-only** (mestre/jogador logado como membro da campanha). Guest/anônimo não têm acesso.
- **RF-22 (P0):** Membros (jogadores) só veem entidades com `is_visible_to_players=true` + notas com `is_shared=true`. Edges entre nós não visíveis são filtradas pelo RPC.
- **RF-23 (P0):** Mestre (owner) vê tudo irrestrito.

---

## 5. Requisitos não-funcionais

### 5.1 Performance
- **RNF-01:** Carregar ficha de entidade com painel de conexões **≤ 300 ms** no P95 (campanha com até 100 entidades, 500 edges). Query única que carrega entidade + edges + entidades vizinhas (join lateral ou RPC dedicada).
- **RNF-02:** Tab Locais (árvore) com até 200 nós renderiza **≤ 150 ms** no cliente. Árvore montada uma vez em memória a partir da lista flat (já carregada pelo hook `useCampaignLocations`).
- **RNF-03:** Criar/remover link **≤ 200 ms** de latência percebida (optimistic UI + rollback em erro).
- **RNF-04:** RPC `get_player_visible_nodes` continua **≤ 500 ms** no P95 após aumento do número de edges (é o choke point hoje — ver mig 088).

### 5.2 Segurança
- **RNF-05:** Toda nova tabela tem RLS habilitada **antes** de migração ser considerada completa.
- **RNF-06:** Policies sem recursão (padrão `is_campaign_member()` helper — mig 032).
- **RNF-07:** Trigger de validação de ciclo em hierarquia de locais (anti-loop em parent chain).
- **RNF-08:** CHECK ou trigger que garante endpoints do edge pertencem à mesma campanha (protege contra tentativa de linkar NPC global a local de outra campanha).

### 5.3 i18n PT-BR/EN
- **RNF-09:** Todas as strings novas em `messages/pt-BR.json` + `messages/en.json`.
- **RNF-10:** Seguir glossário (NPC, Local, Facção, Nota — PT-BR). Nomes de relacionamentos em EN no DB, traduzidos na UI (ex: `lives_in` → "vive em" / "lives in").
- **RNF-11:** Zero chave `MISSING_MESSAGE` no build (regressão do B02).

### 5.4 Acessibilidade
- **RNF-12:** Árvore de locais tem navegação por teclado (setas, enter, espaço para colapsar).
- **RNF-13:** Chips de link têm `aria-label` descritivo ("Remover link para NPC Viktor").

### 5.5 Mobile
- **RNF-14:** Árvore de locais usa padrão accordion em viewport < 768px (evita indent profunda cortada).
- **RNF-15:** Painel de conexões na ficha de entidade é colapsável em mobile.

---

## 6. Modelo de dados proposto

### 6.1 Hierarquia de locais

**Estado atual:** `campaign_locations.parent_location_id` **já existe** (mig 081). FK self-reference com `ON DELETE SET NULL`. Sem exposição na UI e sem anti-ciclo.

**Estratégias avaliadas:**

| Estratégia | Prós | Contras | Veredito |
|---|---|---|---|
| **Adjacency list (`parent_id`)** — atual | Simples, já migrado, recursão nativa do PG via CTE | Query "ancestrais / descendentes" exige CTE | ✅ **Escolhido** |
| Materialized path (`path text`) | Query rápida de ancestrais por `LIKE` | Writes caros (cascata), difícil reordenar | ❌ |
| Closure table | Query O(1) em ambos sentidos | Mantém tabela extra sincronizada, overhead em writes, exagero p/ 100 locais/campanha | ❌ |

**Decisão:** **manter adjacency list (`parent_location_id`).** Queries de ancestrais/descendentes usando CTE recursiva — cabe perfeitamente em 200 nós/campanha. Quando precisarmos de árvore completa para UI, carregamos toda a tabela da campanha (já é operação barata, RLS único).

**Adições necessárias:**

```sql
-- Migração XXX_location_hierarchy_guard.sql
-- Previne ciclos na hierarquia de locais
CREATE OR REPLACE FUNCTION prevent_location_cycle()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_current uuid := NEW.parent_location_id;
  v_depth integer := 0;
BEGIN
  IF NEW.parent_location_id IS NULL THEN RETURN NEW; END IF;
  IF NEW.parent_location_id = NEW.id THEN
    RAISE EXCEPTION 'Location cannot be its own parent';
  END IF;
  WHILE v_current IS NOT NULL LOOP
    v_depth := v_depth + 1;
    IF v_depth > 20 THEN
      RAISE EXCEPTION 'Location hierarchy exceeds max depth (20)';
    END IF;
    IF v_current = NEW.id THEN
      RAISE EXCEPTION 'Cycle detected in location hierarchy';
    END IF;
    SELECT parent_location_id INTO v_current
      FROM campaign_locations WHERE id = v_current;
  END LOOP;
  RETURN NEW;
END;
$$;

CREATE TRIGGER campaign_locations_prevent_cycle
  BEFORE INSERT OR UPDATE OF parent_location_id ON campaign_locations
  FOR EACH ROW EXECUTE FUNCTION prevent_location_cycle();

CREATE INDEX IF NOT EXISTS idx_campaign_locations_parent_nonull
  ON campaign_locations(parent_location_id) WHERE parent_location_id IS NOT NULL;
```

**Justificativa do depth guard de 20:** limite prático de fantasia; Multiversos D&D típicos chegam a 4–6 níveis (Plano > Mundo > Continente > Região > Cidade > Bairro > Edifício). 20 cobre edge-cases exóticos sem degenerar busca.

### 6.2 Cross-entity links — tabela de junção genérica

**Estado atual:** `campaign_mind_map_edges` **já existe** (mig 080). Tabela polimórfica genérica perfeitamente adequada. Já tem: `source_type`, `source_id`, `target_type`, `target_id`, `relationship`, `custom_label`, `UNIQUE(campaign_id, source_type, source_id, target_type, target_id)`, RLS owner + member read.

**Estratégias avaliadas:**

| Estratégia | Prós | Contras | Veredito |
|---|---|---|---|
| **Tabela única polimórfica (existente)** | 1 tabela, 1 RLS, 1 índice; extensível | FK não pode ser nativa (polimorfismo); valida integridade por trigger | ✅ **Escolhido — já existe** |
| N tabelas de junção (`npc_location_links`, `npc_faction_links`, `faction_location_links`) | FK nativa, query mais simples | 6+ tabelas novas (combinação 4C2), 6+ RLS, 6+ hooks, explosão de manutenção | ❌ |
| Grafo em JSONB na entidade | Zero nova tabela | Query reversa impossível, RLS impossível, cache inválida | ❌ |

**Decisão:** **reutilizar `campaign_mind_map_edges`** como tabela oficial do Entity Graph. É precisamente "`campaign_entity_links`" proposta pelo beta-test §Bloco 3 — só está com outro nome. Usar a tabela existente evita migração de dados, evita duplicação conceitual, evita "a mesma coisa com dois nomes" (pecado do glossário ubíquo).

**Ações sobre tabela existente:**

1. **Comentário explícito** para deixar claro que é o Entity Graph:
   ```sql
   COMMENT ON TABLE campaign_mind_map_edges IS
     'Entity Graph: relacionamentos polimórficos entre entidades da campanha (NPCs, Locais, Facções, Notas, Quests, etc). Utilizada tanto pelo Mind Map visual quanto pelas fichas de entidade.';
   ```

2. **Trigger de validação de escopo** — garante que ambos endpoints do edge pertencem à campanha indicada (previne link cross-campaign via NPC global):
   ```sql
   CREATE OR REPLACE FUNCTION validate_edge_scope()
   RETURNS TRIGGER LANGUAGE plpgsql AS $$
   DECLARE
     v_src_ok boolean;
     v_tgt_ok boolean;
   BEGIN
     v_src_ok := entity_belongs_to_campaign(NEW.source_type, NEW.source_id, NEW.campaign_id);
     v_tgt_ok := entity_belongs_to_campaign(NEW.target_type, NEW.target_id, NEW.campaign_id);
     IF NOT v_src_ok OR NOT v_tgt_ok THEN
       RAISE EXCEPTION 'Edge endpoints must belong to campaign %', NEW.campaign_id;
     END IF;
     RETURN NEW;
   END; $$;

   CREATE OR REPLACE FUNCTION entity_belongs_to_campaign(
     p_type text, p_id uuid, p_campaign uuid
   ) RETURNS boolean LANGUAGE plpgsql STABLE AS $$
   BEGIN
     CASE p_type
       WHEN 'npc' THEN RETURN EXISTS (
         SELECT 1 FROM campaign_npcs
         WHERE id = p_id AND (campaign_id = p_campaign OR campaign_id IS NULL));
       WHEN 'location' THEN RETURN EXISTS (
         SELECT 1 FROM campaign_locations
         WHERE id = p_id AND campaign_id = p_campaign);
       WHEN 'faction' THEN RETURN EXISTS (
         SELECT 1 FROM campaign_factions
         WHERE id = p_id AND campaign_id = p_campaign);
       WHEN 'note' THEN RETURN EXISTS (
         SELECT 1 FROM campaign_notes
         WHERE id = p_id AND campaign_id = p_campaign);
       WHEN 'quest' THEN RETURN EXISTS (
         SELECT 1 FROM campaign_quests
         WHERE id = p_id AND campaign_id = p_campaign);
       ELSE RETURN TRUE;
     END CASE;
   END; $$;

   CREATE TRIGGER campaign_mind_map_edges_scope
     BEFORE INSERT OR UPDATE ON campaign_mind_map_edges
     FOR EACH ROW EXECUTE FUNCTION validate_edge_scope();
   ```

3. **Adicionar relationship types faltantes** para cobrir os casos do PRD:
   ```sql
   ALTER TABLE campaign_mind_map_edges
     DROP CONSTRAINT mind_map_edges_relationship_check;
   ALTER TABLE campaign_mind_map_edges
     ADD CONSTRAINT mind_map_edges_relationship_check
     CHECK (relationship IN (
       'linked_to', 'lives_in', 'participated_in', 'requires', 'leads_to',
       'allied_with', 'enemy_of', 'gave_quest', 'dropped_item', 'member_of',
       'happened_at', 'guards', 'owns', 'custom',
       'headquarters_of', 'rival_of', 'family_of', 'mentions'
     ));
   ```

### 6.3 Notas linkadas a entidades

**Estado atual:** `note_npc_links` (mig 045) cobre só Note↔NPC. Adicionar Note↔Location, Note↔Faction, Note↔Quest.

**Estratégias avaliadas:**

| Estratégia | Prós | Contras | Veredito |
|---|---|---|---|
| **A) Migrar `note_npc_links` → `campaign_mind_map_edges`** (edges com `source_type='note', target_type='npc'`) | Uma tabela única, unificação conceitual | Migração de dados + refatoração de `lib/supabase/note-npc-links.ts` + `NpcTagSelector` + testes | ⚠️ Custo alto mas é o "fim do caminho" |
| B) Criar `note_entity_links` genérica (manter `note_npc_links` como legacy) | Sem refactor imediato, tabela dedicada a notas | Redundância com edges; 2 modelos para mesma coisa | ❌ Gera dívida técnica |
| C) Estender `note_npc_links` com `entity_type` nullable | Zero refactor no código NPC | Schema polimórfico inconsistente; "note_npc_links" com linha que não é NPC é confuso | ❌ |

**Decisão:** **Estratégia A — migrar para `campaign_mind_map_edges`.** A dívida técnica de manter duas tabelas polimórficas para a mesma coisa é pior do que o custo da migração. A Fase 3e executa:

1. Copiar linhas de `note_npc_links` para `campaign_mind_map_edges` como `source_type='note', source_id=note_id, target_type='npc', target_id=npc_id, relationship='mentions'`.
2. Refatorar `lib/supabase/note-npc-links.ts` para nova API `lib/supabase/entity-links.ts` (genérica).
3. Dropar `note_npc_links` em migração separada (após 1 sprint de convivência, com cobertura de teste).

**Nome da nova API:**

```ts
// lib/supabase/entity-links.ts
export type EntityType = 'npc' | 'location' | 'faction' | 'note' | 'quest';
export async function linkEntities(
  campaignId: string,
  source: { type: EntityType; id: string },
  target: { type: EntityType; id: string },
  relationship: EdgeRelationship,
): Promise<MindMapEdge>;
export async function unlinkEntities(edgeId: string): Promise<void>;
export async function listEntityLinks(
  campaignId: string,
  entity: { type: EntityType; id: string },
): Promise<MindMapEdge[]>;
```

### 6.4 Migrações SQL esperadas

Ordem de execução:

| # | Arquivo | Conteúdo | Reversível? |
|---|---|---|---|
| 1 | `142_location_hierarchy_guard.sql` | Trigger anti-ciclo em `campaign_locations`; índice parcial | ✅ (drop trigger/index) |
| 2 | `143_entity_graph_scope_guard.sql` | Função `entity_belongs_to_campaign`; trigger em `campaign_mind_map_edges`; COMMENT na tabela | ✅ |
| 3 | `144_entity_graph_relationships.sql` | Expansão do CHECK de `relationship` (adiciona `headquarters_of`, `rival_of`, `family_of`, `mentions`) | ✅ (DROP/ADD CHECK) |
| 4 | `145_migrate_note_npc_links_to_edges.sql` | INSERT ... SELECT de `note_npc_links` → `campaign_mind_map_edges` (idempotente, ON CONFLICT DO NOTHING) | ✅ |
| 5 | `146_drop_note_npc_links.sql` | DROP TABLE `note_npc_links` (depois de 1 sprint com `145` em produção) | ⚠️ Backup antes |
| 6 | `147_entity_graph_covering_indexes.sql` | Índices compostos para queries de vizinhança: `(campaign_id, source_type, source_id)` e `(campaign_id, target_type, target_id)` | ✅ |

Todas as migrações seguem convenção existente: prefixo numérico sequencial, sem transação única em mig destrutiva (mig 146 requer revisão humana).

---

## 7. UX / fluxos principais

### 7.1 Criar hierarquia de locais

**Fluxo:**
1. Mestre cria local "Porto Azul" (tipo `city`). Salva. Aparece na tab Locais como raiz.
2. Mestre cria local "Taverna do Pêndulo" (tipo `building`) e seleciona "Porto Azul" no novo campo **"Local pai"** do form.
3. Na árvore da tab Locais, "Taverna do Pêndulo" aparece indentada sob "Porto Azul" com ícone de accordion.
4. Mestre clica no chevron de "Porto Azul" — colapsa/expande filhos.
5. Mestre edita "Taverna do Pêndulo" e muda pai para "Norte" — app valida (sem ciclo) e move.
6. Mestre deleta "Porto Azul" — filhos têm `parent_location_id → NULL` (já é comportamento do FK ON DELETE SET NULL). Confirmação explicita "Seus 3 sub-locais viram locais raiz."

**UI:** novo `<LocationParentSelect />` — dropdown filtrado (exclui self e descendentes para evitar ciclo no client antes de bater no trigger).

### 7.2 Linkar NPC a local (da ficha do NPC + do card do local)

**Do lado do NPC:**
1. Mestre abre form do NPC "Viktor".
2. Nova seção **"Morada"** — campo autocomplete com locais da campanha.
3. Seleciona "Taverna do Pêndulo" — cria edge `npc→location relationship=lives_in`.
4. Chip "Vive em: Taverna do Pêndulo" aparece abaixo. X remove o edge.

**Do lado do Local:**
1. Mestre abre detalhe/form do local "Taverna do Pêndulo".
2. Nova seção **"Habitantes"** — lista de NPCs que têm edge `lives_in` apontando pra ele.
3. Botão "+ Adicionar habitante" abre selector de NPCs da campanha.

**UI:** reutilizar `<NpcTagSelector />` generalizado para `<EntityTagSelector type="location"|"npc"|"faction" />`.

### 7.3 Criar facção e adicionar NPCs

1. Mestre cria facção "Círculo da Rosa Negra" (tipo `neutral`). Salva.
2. Na ficha da facção, nova seção **"Membros"**:
   - `<NpcTagSelector />` já generalizado — multi-select de NPCs da campanha.
   - Cada seleção cria edge `npc→faction relationship=member_of`.
3. Seção **"Sede"** — seletor de Local único (cria edge `faction→location relationship=headquarters_of`).

Reverso: ficha do NPC mostra chip "Membro de: Círculo da Rosa Negra"; ficha do Local mostra seção "Facções sediadas".

### 7.4 Criar nota linkada a múltiplas entidades

1. Mestre cria nota "O que ouvi na taverna" em `CampaignNotes`.
2. Já existente: `<NpcTagSelector />` dentro da nota permite linkar NPCs.
3. **Novo:** abaixo, blocos análogos: `<LocationTagSelector />`, `<FactionTagSelector />`, `<QuestTagSelector />` (cada um cria edges com `relationship='mentions'`).
4. Ao abrir NPC "Viktor", painel **"Notas sobre isto"** lista "O que ouvi na taverna" com link pra abrir nota.

### 7.5 Navegar conexões (clicar NPC → ver locais, notas, facções)

**Painel "Conexões" na ficha de entidade:**
- Seção por tipo: "Locais", "Facções", "NPCs relacionados", "Notas", "Quests".
- Cada item clicável → navega para aquela entidade.
- Relação descrita entre parênteses ("vive em", "membro de", etc.).
- Botão flutuante **"Ver no Mapa de Conexões"** — abre Mind Map com nó selecionado e 1° grau de vizinhança destacado.

**Requerido:** nova query/RPC que carrega todas edges onde entidade é source OU target, + dados básicos das entidades vizinhas (nome, tipo, visibility). Preferir RPC `get_entity_neighborhood(p_type text, p_id uuid)`.

### 7.6 Visão de mapa de conexões (F21 — Fase 3g)

**Já existente:** `CampaignMindMap.tsx` com ReactFlow + 10 node types + dagre layout + drag-to-connect. Precisa apenas de:
- Botão **"Focar em..."** que recebe entidade selecionada da ficha.
- Destaque visual do nó focado + 1° grau de vizinhança.
- Filtro adicional por região (grupo de locais) — aproveitar `GroupNode.tsx` já existente.

### 7.7 Pesquisa universal (F27 — Fase 3g ou pós)

Input de busca global na Campaign HQ:
- Query a NPCs + Locais + Facções + Notas por substring no nome/título/descrição/conteúdo.
- Resultados agrupados por tipo.
- Para cada resultado, badge com quantas conexões tem ("Viktor — 3 notas, 1 local, 2 facções").

### 7.8 Sintaxe de linking dentro de texto (`@entidade` e `[[nota]]`)

**Problema:** hoje, mesmo com `<EntityTagSelector />` (§7.2-§7.4) o mestre ainda precisa sair do fluxo de escrita para abrir um seletor e escolher qual entidade linkar. Em benchmarks modernos (Obsidian, Notion, Roam) o linking é inline — parte do ato de escrever.

**Decisão:** adotar duas sintaxes inline, complementares aos seletores visuais:

- `@entidade` → chip clicável para NPCs, Locais, Facções, Quests. Inspirado em Notion `@mentions`.
- `[[nota]]` → link para outra nota da campanha. Inspirado em Obsidian wikilinks. Reservado a notas para manter diferenciação semântica (`@` = entidade concreta, `[[` = documento).

**Fluxo de autocomplete:**
1. Mestre digita `@` em qualquer textarea/editor de rich text (CampaignNotes, campo descrição de NPC/Local/Facção/Quest).
2. Popover abaixo do cursor abre com busca fuzzy sobre NPCs + Locais + Facções + Quests da campanha atual (escopo estrito — nunca cross-campaign).
3. Seta ↑/↓ navega, Enter confirma, Esc cancela. Tecla `@` sem match ainda digitado mostra top 8 entidades mais recentes da campanha.
4. Ao confirmar, o token no editor vira chip visual (`@Viktor` com avatar/ícone + cor por tipo) e o texto bruto salvo no banco contém marcador canônico `@[npc:uuid]` (ou equivalente JSON se editor for rich-text).
5. Mesmo fluxo para `[[` — popover busca em `campaign_notes` da campanha.

**Persistência de edges:**
- Ao salvar a nota/descrição, parser varre o conteúdo procurando tokens `@[type:id]` e `[[note:id]]`.
- Para cada token, faz upsert em `campaign_mind_map_edges` com `relationship='mentions'`, `source_type=<container>`, `target_type=<entidade>`. Container = tipo da entidade que hospeda o texto (ex.: `source_type='note'` quando o texto é conteúdo de nota; `source_type='npc'` quando é a descrição de um NPC).
- Ao remover o token do texto, edge é removido (diff entre tokens antes/depois do save).
- Idempotente via UNIQUE existente em `(campaign_id, source_type, source_id, target_type, target_id)`.

**UI:**
- Novo componente `<EntityMentionEditor />` como wrapper sobre textarea/Tiptap (reusar se já existir no projeto).
- Chip renderizado com cor por tipo: NPC amber, Local verde-musgo, Facção violeta, Quest dourado, Nota pergaminho.
- Click no chip navega para ficha da entidade (respeita visibility — jogador clicando chip de NPC invisível cai em fallback "Referência oculta pelo mestre").

**i18n:** popover tem placeholder "Digite para buscar entidade…" / "Type to search entity…".

**Combat Parity / RLS:** busca do autocomplete é feita via RPC `search_campaign_entities(p_campaign uuid, p_query text, p_viewer_role text)` — mestre vê tudo, jogador vê só visíveis. Zero query cross-campaign. Auth-only.

### 7.9 Quick switcher universal (Ctrl+K / Cmd+K)

**Problema:** mesmo com navegação por abas (NPCs, Locais, Facções, Notas, Quests), pular entre entidades em meio à sessão custa 3-5 cliques. Inspirado em Linear, Obsidian, Raycast — command palette é o atalho universal.

**Decisão:** implementar componente global `<QuickSwitcher />`, acessível de qualquer rota `/app/*`. Ver spec dedicado em `docs/SPEC-navigation-redesign.md` §3.4 — este componente é **compartilhado** entre PRD Entity Graph e SPEC Navigation Redesign.

**Ativação:**
- Ctrl+K (Windows/Linux) ou Cmd+K (macOS) — detecção via `event.metaKey`/`event.ctrlKey`.
- Ícone de lupa com badge "⌘K" no topo da sidebar (§5.3 do UX benchmark doc) para descoberta visual.
- Esc fecha. Click fora fecha.

**Fluxo:**
1. Mestre pressiona Ctrl+K em qualquer tela.
2. Modal flutuante abre no centro-topo da viewport (estilo Linear).
3. Input focado automaticamente. Placeholder: "Pular para…" / "Jump to…".
4. Lista inicial (zero query): últimas 8 entidades visitadas (stack em `localStorage` por usuário + campanha).
5. Ao digitar, busca fuzzy unificada em: NPCs, Locais, Facções, Notas, Quests, Sessões. Agrupado por tipo na lista (header com contagem).
6. Cada item mostra: ícone de tipo, nome, breadcrumb curto (ex.: "Local → Norte → Porto Azul"), tag opcional.
7. Setas ↑/↓ navegam, Enter abre a ficha da entidade selecionada (push em router).
8. Shift+Enter abre em nova aba (preserva contexto anterior).

**Filtros rápidos (atalho dentro do switcher):**
- `>` no início da query = comandos (ex.: "> criar NPC", "> iniciar sessão", "> abrir mapa de conexões"). Inspirado em VS Code command palette.
- `@` = apenas entidades (NPCs + Locais + Facções + Quests).
- `#` = apenas tags/labels.
- `/` = apenas notas.

**Performance:** mesma RPC `search_campaign_entities` do §7.8 (reuso). Debounce 120ms. Limite 50 resultados, paginação implícita ("Ver mais" ao final).

**Combat Parity / RLS:** tudo campaign-scoped e Auth-only. Guest em `/try` não vê o Ctrl+K (atalho desabilitado). Jogador só vê entidades visíveis.

**Acessibilidade:** `role="dialog"`, `aria-label="Quick switcher"`, trap de foco, anúncio por screen reader ao abrir/fechar. `prefers-reduced-motion` → fade simples em vez de slide.

### 7.10 Daily notes automáticas por sessão

**Problema:** em sessão, mestre tem muita fricção para registrar o que acontece — abrir nota nova, escolher título, linkar a sessão, linkar a NPCs mencionados. O lúdico se perde na burocracia. Inspirado em Roam Research (daily notes) + Obsidian (templated notes).

**Decisão:** cada `campaign_sessions` (identificada por `session_date` + `campaign_id`) gera automaticamente uma **nota diária de sessão** já linkada. Mestre escreve livremente; links para entidades emergem via `@` (ver §7.8) sem passos manuais extras.

**Gatilhos de criação:**
- Quando mestre cria uma `campaign_sessions` (agendamento prévio) — cria nota imediatamente.
- Quando mestre inicia um combate novo **e** não existe sessão para a data de hoje — cria sessão + nota juntas (on-the-fly session).
- Quando mestre clica botão "Iniciar sessão de hoje" no Campaign HQ (novo CTA de sidebar).

**Estrutura da nota criada:**
- Row em `campaign_notes` com:
  - `note_type = 'session_note'` (novo valor — adicionar ao enum/CHECK em migração separada da Fase 3g se o tipo ainda não existir; se só texto livre hoje, usar `tag = 'session'`).
  - `title = 'Notas da sessão — {date_formatted}'` (PT-BR) / `'Session notes — {date_formatted}'` (EN).
  - `content = ''` (em branco, mestre preenche).
  - `campaign_id = <current>`, `author_id = <DM user id>`.
  - `is_shared = false` por default (privada do mestre; mestre pode compartilhar depois).
- Edge automático em `campaign_mind_map_edges`:
  - `source_type='note'`, `source_id=<nova nota>`, `target_type='session'`, `target_id=<campaign_sessions.id>`, `relationship='happened_at'`.
  - (Requer `session` como source_type/target_type válido em `entity_belongs_to_campaign` — adicionar case na Fase 3g.)

**Fluxo de uso:**
1. Mestre abre Campaign HQ, clica "Iniciar sessão de hoje".
2. Sistema cria `campaign_sessions` com `session_date = today` (se ainda não existe) + nota diária + edge.
3. Mestre é redirecionado para editor da nota em modo foco. Placeholder: "Descreva o que aconteceu… use @ para linkar NPCs, locais, facções."
4. Mestre digita: "O grupo chegou na @Taverna do Pêndulo e conversou com @Viktor sobre o @Círculo da Rosa Negra."
5. Ao salvar (auto-save a cada 10s + manual), edges `mentions` são criadas para cada `@`.
6. Ao abrir ficha do NPC Viktor depois, painel "Notas sobre isto" (§7.5) mostra a nota da sessão automaticamente.

**Reverso:**
- Ao abrir uma `campaign_sessions` no futuro, aba "Notas da sessão" lista a nota diária (e quaisquer outras notas linkadas com `happened_at=session`).
- Sessões antigas sem daily note podem opcionalmente ser "retro-populadas" via ação manual "Criar nota para esta sessão".

**UI:** novo componente `<DailyNoteAutoCreate />` disparado via hook `useSessionBootstrap(sessionId)`. Toast de confirmação: "Nota da sessão de {date} criada — pronta para suas anotações."

**Combat Parity / RLS:** nota é campaign-scoped, criada com `is_shared=false` (invisível a jogadores até mestre decidir). RPC de criação idempotente (retorna nota existente se já foi criada para aquela sessão).

**i18n:** título formatado via `date-fns` com locale correto; "Notas da sessão — 19 de abril de 2026" vs "Session notes — April 19, 2026".

### 7.11 Supertag — promover nota a NPC (Fase 3g opcional, P2)

**Problema:** durante uma sessão, mestre frequentemente improvisa NPCs e só depois percebe que aquela "nota sobre um taverneiro chamado Grim" mereceria virar NPC estruturado (com ficha, stats, ganchos). Hoje isso exige: criar NPC manualmente, copiar conteúdo da nota, relinkar. Inspirado em Tana supertags.

**Decisão:** adicionar ação **"Promover a NPC"** no menu de contexto de qualquer `campaign_notes`. Priorizado **P2 — Fase 3g opcional ou Onda 6**, não bloqueia launch da Onda 3.

**Fluxo:**
1. Mestre abre nota "O taverneiro enrolado do Pêndulo".
2. Menu "…" na toolbar da nota → "Promover a NPC" (com ícone de pergaminho virando ficha).
3. Modal "Promover nota a NPC" abre pré-preenchido:
   - Nome sugerido: título da nota (editável).
   - Bio sugerida: primeiras 300 chars do conteúdo da nota (editável).
   - Checkbox "Manter nota como memória deste NPC" (default marcado).
4. Mestre confirma → sistema:
   - Cria row em `campaign_npcs` com nome/bio preenchidos, `campaign_id=<current>`, `is_visible_to_players=false`.
   - Cria edge em `campaign_mind_map_edges`: `source_type='note'`, `source_id=<nota>`, `target_type='npc'`, `target_id=<novo npc>`, `relationship='mentions'`.
   - Redireciona para ficha do NPC com toast: "Nota promovida — Grim agora tem ficha própria."
5. Nota original permanece (texto livre como "nasceu" a entidade) e aparece no painel "Notas sobre isto" do novo NPC.

**Restrições P2:**
- Apenas DM (owner) pode promover. Jogadores não têm a ação.
- Apenas notas com `note_type != 'session_note'` podem ser promovidas (daily notes de sessão não viram NPCs — são diário, não entidade).
- Não implementar reversão inicialmente (despromover NPC de volta a nota) — fica para Onda 6+ se demanda aparecer.

**Extensões futuras (fora deste PRD):**
- Promover nota a Local ("Promover a Local").
- Promover nota a Facção.
- Detecção sugestiva — IA sugere "Esta nota parece descrever um NPC — promover?". Respeita regra de IA opcional + campaign-scoped.

**Combat Parity / RLS:** ação executa via RPC que valida ownership (DM da campanha) + escopo (nota e npc criados na mesma campanha). Auth-only.

---

## 8. Fases de implementação (incremental)

Cada fase = 1 sprint (≈ 1 semana). Ordem obrigatória pelas dependências.

### Fase 3a — Foundation (schema + migrações)

**Entregáveis:**
- Migrações 142, 143, 144 (ver §6.4).
- Lib `lib/supabase/entity-links.ts` + tipos `lib/types/entity-links.ts`.
- Hook genérico `useEntityLinks(campaignId, entity)`.
- Testes unitários de trigger de ciclo e de scope guard.

**Critério de pronto:**
- Scripts de migração aplicam e revertem limpos em staging.
- `pnpm rtk vitest` verde com coverage > 80% nas novas funções.
- Triggers testados com casos de erro (cycle, cross-campaign).

**Dependências:** nenhuma.

### Fase 3b — Hierarquia de locais

**Entregáveis:**
- `<LocationParentSelect />` novo componente.
- `LocationForm.tsx` atualizado para incluir campo "Local pai".
- `LocationList.tsx` renderiza árvore (usando recursão ou lib `react-arborist` — validar bundle size).
- Breadcrumb de ancestrais no detalhe do local.
- i18n de novas labels.
- E2E: criar local raiz, criar filho, colapsar/expandir, mover filho.

**Critério de pronto:**
- Árvore funcional até 5 níveis.
- Validação client-side bloqueia ciclos antes do banco.
- Performance RNF-02 atingida (200 nós ≤ 150ms).

**Dependências:** 3a (não depende, mas faz sentido juntar com scope guard).

### Fase 3c — Links NPC ↔ Local

**Entregáveis:**
- `<EntityTagSelector />` — generalização do `<NpcTagSelector />` com prop `type`.
- `NpcForm.tsx` adiciona seção "Morada" (1 local).
- `LocationCard.tsx` adiciona seção "Habitantes".
- Hook `useEntityLinks(campaignId, { type, id })` para fetchar vizinhança.
- E2E: criar NPC, selecionar local, ver no card do local.

**Critério de pronto:**
- Criar/remover link é optimistic + rollback em erro.
- RLS testada: jogador com NPC não visível não vê link.

**Dependências:** 3a, 3b.

### Fase 3d — Facções (NPCs + local)

**Entregáveis:**
- `FactionForm.tsx` ganha seções "Sede" (1 local) e "Membros" (N NPCs).
- `FactionCard.tsx` mostra contagens de membros + sede.
- `NpcForm.tsx` ganha seção "Facções" (N facções).
- E2E: criar facção, adicionar 3 NPCs, ver recíproco em cada NPC.

**Critério de pronto:**
- Membros da facção aparecem corretamente em ambas direções.
- Remover NPC da facção persiste.

**Dependências:** 3a, 3c.

### Fase 3e — Notas linkadas (migração)

**Entregáveis:**
- Migração 145 (INSERT…SELECT para edges).
- `CampaignNotes.tsx` refatorado: `linkNoteToNpc` → `linkEntity` genérico.
- Seletores de Local/Facção/Quest dentro da nota (além de NPCs).
- Painel "Notas sobre isto" em cada ficha de entidade.
- Migração 146 (DROP `note_npc_links`) **apenas após 1 sprint de co-existência** com código lendo edges.

**Critério de pronto:**
- Zero regressão em notas pré-existentes (dados preservados).
- Testes garantem edge `source_type='note', target_type='npc'` substitui `note_npc_links`.

**Dependências:** 3a, 3c, 3d.

### Fase 3f — Agrupamento e filtros

**Entregáveis:**
- Tab Locais: switch "Lista flat / Árvore / Por tipo".
- Tab NPCs: filtro por facção / por local.
- Tab Notas: quando navegada via link de entidade, chip mostra "filtrada por: NPC Viktor".
- Contagem nas abas ("NPCs (12)").

**Critério de pronto:**
- Filtros persistem por sessão (localStorage).
- Filtros não quebram em campanhas vazias.

**Dependências:** 3b, 3c, 3d.

### Fase 3g — Mapa visual + polish (opcional, se tempo)

**Entregáveis:**
- Botão "Abrir no Mapa de Conexões" em cada ficha (foca o nó).
- Filtros do Mind Map: "mostrar apenas X grau de vizinhança".
- Busca universal na Campaign HQ (F27).

**Critério de pronto:**
- Performance do Mind Map estável com 500+ edges.

**Dependências:** 3a-3f. Pode ser movido para Onda 6 (polish) se Onda 3 estourar prazo.

---

## 9. Critérios de aceitação

A Onda 3 é considerada "pronta" quando:

1. ✅ Mestre cria hierarquia de locais de 3 níveis e navega por breadcrumb (RF-01 a RF-04).
2. ✅ Mestre linka NPC a local pela ficha do NPC **e** pelo card do local; relação persiste (RF-06).
3. ✅ Mestre cria facção com 5 NPCs como membros e 1 local como sede (RF-07, RF-08).
4. ✅ Mestre cria uma nota linkada a 1 NPC + 1 local + 1 facção; ao abrir cada uma das 3 entidades, a nota aparece na seção "Notas sobre isto" (RF-11, RF-12).
5. ✅ Ao abrir NPC Viktor, painel de conexões mostra seu local + facção + 2 notas que o mencionam, com links clicáveis (RF-18).
6. ✅ Tab Locais permite alternar entre árvore e lista flat (RF-15).
7. ✅ Jogador membro da campanha só vê entidades com `is_visible_to_players=true` + notas com `is_shared=true`; edges entre invisíveis não aparecem (RF-22).
8. ✅ Guest/anônimo não consegue acessar nenhuma das APIs novas (RF-21).
9. ✅ Ciclo em hierarquia de locais retorna erro explícito, tanto no client quanto no server.
10. ✅ Link cross-campaign (NPC global apontado a local de outra campanha) é rejeitado pelo trigger.
11. ✅ Zero regressão em `note_npc_links` durante co-existência (Fase 3e antes de mig 146).
12. ✅ `pnpm rtk tsc`, `pnpm rtk vitest`, `pnpm rtk build` verdes.
13. ✅ Performance RNF-01, RNF-02, RNF-03, RNF-04 medidas em staging com campanha seed de 100/500 entidades/edges.

---

## 10. Riscos e mitigações

| # | Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|---|
| R1 | Migração de `note_npc_links` (mig 145) perde dados | Baixa | Alto | Migração idempotente com `ON CONFLICT DO NOTHING`; mig 146 só dropa DEPOIS de 1 sprint com leitura via edges; backup manual do `note_npc_links` antes de mig 146. |
| R2 | Trigger de scope guard degrada performance de insert em edges | Média | Médio | Função helper marcada `STABLE`; índice coberto em `(campaign_npcs.id, campaign_id)`, idem para locais, facções; bench isolado antes do merge. |
| R3 | UX de árvore de locais confusa em mobile | Média | Médio | Spike de UX em Onda 6 (F18 já é spike no ROADMAP); fallback accordion em viewport < 768px (RNF-14); validar com beta tester antes de GA. |
| R4 | RLS + edges genéricas caras em campanhas grandes (centenas de entidades) | Média | Alto | Manter RPC `get_player_visible_nodes` como ponto único de filtro; não fazer queries separadas RLS por edge; índice `(campaign_id, source_type, source_id)` já proposto. |
| R5 | `campaign_mind_map_edges` já sendo usada pelo Mind Map — mudanças quebram feature existente | Baixa | Alto | Mudanças são aditivas: adicionar relationship types ao CHECK, adicionar trigger. Zero alteração em source_type/target_type existentes. Testar Mind Map antes e depois de cada migração. |
| R6 | Performance da árvore de locais explode em campanhas com 500+ locais | Baixa | Médio | Virtualização (react-window) se passar de 200; hoje beta tester tem < 30 locais — aceitar simples primeiro. |
| R7 | Jogador vê edge para entidade que "teoricamente" não deveria ver (vazamento via grafo) | Média | Alto | RPC `get_player_visible_nodes` já filtra edges por conjunto visível (mig 088) — estender para cada nova RPC `get_entity_neighborhood`; teste de RLS com jogador no player-hq. |
| R8 | Feature flag `entity_graph_enabled` por campanha pode criar estado misto | Baixa | Médio | Feature flag por usuário (DM), não por campanha; campanha nunca fica "meio" com hierarquia/meio sem. |

---

## 11. Fora de escopo (NÃO neste PRD)

Explicitamente **fora**:

1. **Visual map 3D / geo-map real (coordenadas lat/lng).** Locais são narrativos, não geográficos.
2. **Timeline de eventos (quem estava onde, quando).** Essa é outra feature — "Campaign Timeline".
3. **Relações temporais** (A aliou-se a B até o momento X, depois virou inimigo). Edges são estáticas com `custom_label` de texto livre. Histórico de edges = versionamento = fora.
4. **Importação/exportação de grafo** (formato GraphML, JSON).
5. **AI-assisted linking** ("sugerir que NPC X mora no local Y" baseado em descrição). Fora — fica para Onda 6+.
6. **Compartilhamento de grafos entre campanhas** (template de facções, por exemplo).
7. **Edição colaborativa em tempo real** do grafo por múltiplos DMs.
8. **Grafo com edges de SRD monsters/spells.** SRD é read-only, não entra no grafo (respeita SRD Compliance Rule).
9. **Notificações quando edge é criada** ("Jogador descobriu link entre X e Y").
10. **Search semântica** (embedding-based). Search é substring simples (F27 fase 3g).

---

## 12. Questões abertas (pra decisão)

| # | Questão | Opções | Recomendação tentativa |
|---|---|---|---|
| Q1 | Relação "morada" de NPC é 0..1 ou 0..N? | (A) 1 só; (B) múltiplas ("mora em Porto Azul, passa temporadas em Luanda") | (A) inicialmente — simplifica UI; expandir se beta test 4 pedir. |
| Q2 | Deletar local com 20 NPCs habitantes — o que acontece aos edges? | (A) Cascade delete; (B) SET NULL/manter edge órfã; (C) bloquear delete | (A) cascade via `ON DELETE CASCADE` do `campaign_mind_map_edges.target_id` (não existe hoje — avaliar). **Precisa de decisão do produto.** |
| Q3 | NPCs globais (sem campaign_id) podem participar do grafo? | (A) Sim, ao linkar "anexa" a campanha; (B) Não, só NPCs campaign-bound; (C) Ambos, mas edge carrega o contexto | (B) NPCs precisam estar em campanha para ter edges. Trigger já proposto valida isso. |
| Q4 | Mesma campanha pode ter 2 locais com nome idêntico (ex: 2 "Tavernas")? | (A) Permitir; (B) Único por pai; (C) Único globalmente | (B) único por pai — replica comportamento de sistemas de arquivos. |
| Q5 | Quando mestre deleta facção com 10 NPCs membros, edges são cascadeadas ou preservadas? | (A) Cascade; (B) Preservar como edge órfã; (C) Bloquear | (A) Cascade. Edge sem endpoint não faz sentido. |
| Q6 | Mind Map visual: deve ficar atrás de feature flag `entity_graph_enabled` ou liberado para todos? | (A) Feature flag por usuário; (B) GA após Fase 3e | (A) Feature flag para os betas testers primeiro; GA após 2 semanas sem bug crítico. |
| Q7 | Relacionamento `custom` com `custom_label` livre — limitar caracteres? Validar contra injeção? | (A) 50 chars max, sanitize; (B) sem limite; (C) blocklist | (A) 50 chars, trim, sanitize HTML. |

---

## 13. Referências

- `docs/beta-test-session-3-2026-04-16.md` §Bloco 3 (feedbacks F16–F28)
- `docs/ROADMAP-pos-linguagem-ubiqua.md` (Onda 3)
- `docs/glossario-ubiquo.md` (terminologia)
- `docs/epic-mind-map.md` (infraestrutura existente, Fases 1–4a implementadas)
- `supabase/migrations/080_mind_map_edges.sql` (tabela polimórfica existente)
- `supabase/migrations/081_campaign_locations.sql` (hierarquia já modelada)
- `supabase/migrations/043_campaign_npcs.sql` + `074_global_npcs.sql` (NPCs com escopo global)
- `supabase/migrations/082_campaign_factions.sql`
- `supabase/migrations/045_note_npc_links.sql` (tabela a migrar)
- `supabase/migrations/087_rpc_player_visible_nodes.sql` + `088_fix_rpc_player_visible_nodes.sql` (RPC canônica de grafo filtrado)
- `components/campaign/CampaignMindMap.tsx` (UI existente)
- `components/campaign/NpcTagSelector.tsx` (base para `EntityTagSelector`)
- `components/campaign/LocationForm.tsx` (gap: sem campo `parent_location_id`)
- `CLAUDE.md` Regras imutáveis (Combat Parity, SRD Compliance, SEO Canonical, RTK)

---

## 14. Log de decisões deste PRD

| Data | Decisão | Autor | Justificativa |
|---|---|---|---|
| 2026-04-19 | Reutilizar `campaign_mind_map_edges` como `campaign_entity_links` — é a mesma coisa | Architect | Já existe (mig 080), evitar duplicação conceitual, alinhar com princípio do glossário ubíquo |
| 2026-04-19 | Adjacency list em locais (não closure table nem materialized path) | Architect | Simplicidade, N ≤ 200 nós por campanha torna CTE recursiva barata |
| 2026-04-19 | Trigger de anti-ciclo com depth guard de 20 | Architect | Compromisso entre fantasia rica (D&D planares) e proteção contra loop |
| 2026-04-19 | Migrar `note_npc_links` para edges (Fase 3e) em 2 passos (insert + drop com sprint de intervalo) | Architect | Reduz risco de perda de dados; permite rollback |
| 2026-04-19 | Fase 3g (mapa visual) é opcional / movível para Onda 6 | PM | Infraestrutura visual já existe (Mind Map); priorizar fichas/navegação primeiro |
| 2026-04-19 | Adicionadas §7.8 (`@entidade`/`[[nota]]`), §7.9 (Quick switcher Ctrl+K), §7.10 (daily notes automáticas), §7.11 (supertag promover nota a NPC — P2) | Architect + UX | Incorporação das diretrizes em `docs/UX-benchmarks-modern-ludic.md` §5.1 — alinhamento com Obsidian/Notion/Roam/Tana/Linear; mantém Combat Parity + RLS + RTK. Quick switcher é **compartilhado** com `docs/SPEC-navigation-redesign.md` §3.4. |
