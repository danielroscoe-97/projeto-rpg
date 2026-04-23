# Schema Investigation — Campaign HQ v0.3 Redesign

**Para:** Winston (Architect)
**De:** Sally (após descoberta do entity graph existente, 2026-04-21)
**Status:** 🎉 **MUITO SIMPLIFICADO** — entity graph polimórfico já existe (mig 080, 148, 152, 154)

---

## 0. Revisão crítica 2026-04-21 — o que MUDOU vs v1

**Descoberta:** após Dani perguntar "quests atribuíveis já devem existir no graph, certo?", verifiquei `supabase/migrations/` e achei:

- `080_mind_map_edges.sql` — criou `campaign_mind_map_edges` com edges polimórficas
- `148_entity_graph_relationships.sql` — expandiu de 14 → 18 relationships
- `152_entity_graph_edge_cascade.sql` — cascade de delete
- `154_entity_graph_scope_guard_tighten.sql` — RLS reforçado

**Schema `campaign_mind_map_edges`:**
```sql
CREATE TABLE campaign_mind_map_edges (
  id uuid PRIMARY KEY,
  campaign_id uuid REFERENCES campaigns(id),
  source_type text, -- 'npc'|'note'|'quest'|'session'|'location'|'faction'|'encounter'|'player'|'bag_item'
  source_id uuid,
  target_type text, -- idem enum
  target_id uuid,
  relationship text, -- 18 tipos canônicos
  custom_label text,
  created_by uuid,
  created_at timestamptz
);
```

**18 relationships:** `linked_to`, `lives_in`, `participated_in`, `requires`, `leads_to`, `allied_with`, `enemy_of`, `gave_quest`, `dropped_item`, `member_of`, `happened_at`, `guards`, `owns`, `custom`, `headquarters_of`, `rival_of`, `family_of`, **`mentions`**.

**Implicação:** **a maior parte das migrations que eu havia proposto NÃO é necessária.**

---

## 1. Mapeamento: redesign precisa ↔ schema existente

| Feature do redesign | Proposta v1 (Sally errada) | Realidade (graph existente) |
|---|---|---|
| Quest atribuível a jogadores | ❌ `quest_characters` nova table | ✅ `edges(player → quest, rel='participated_in')` |
| Quest localizada | ❌ `quest_locations` nova table | ✅ `edges(quest → location, rel='happened_at')` |
| Quest com NPC quest-giver | ❌ `quest_npcs` nova table | ✅ `edges(npc → quest, rel='gave_quest')` |
| Quest ligada a facção | ❌ `quest_factions` nova table | ✅ `edges(faction → quest, rel='allied_with'/'enemy_of')` |
| Quest requires quest | — | ✅ `edges(quest → quest, rel='requires')` |
| Quest leads to quest | — | ✅ `edges(quest → quest, rel='leads_to')` |
| **Backlinks** (killer-feat 10.1) | ❌ `entity_mentions` nova | ✅ `edges(note → any, rel='mentions')` — **já existe** |
| Mapa Mental polymorphic | (assumido novo) | ✅ **esse é literalmente o propósito da tabela** |
| NPCs em cena do combate | ❌ `scene_entities` nova | 🟡 pode ser `edges(encounter → npc, rel='participated_in')` — verificar |
| Tags | (array) | 🟡 verificar: existe `notes.tags[]` hoje? |

**Score de migrations antes vs depois:** 6 propostas → **1 nova necessária** (+ 2 possíveis refinos).

---

## 2. O que ainda é NOVO (schema gap real)

### 🆕 M1 — `player_notes` (wiki do Jogador)
**Por quê:** decisão #24 do redesign-proposal v0.3 — Jogador precisa de mini-wiki estilo Obsidian dentro de Minha Jornada. Distinto de `notes` (que é do Mestre) e `player_quest_notes` (que é anotação específica de quest, mig 069).

```sql
CREATE TABLE player_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL, -- pode ser user_id (auth) OU session_tokens.id (anônimo — nullable com check)
  session_token_id uuid REFERENCES session_tokens(id), -- nullable, só pra anon
  user_id uuid REFERENCES auth.users(id), -- nullable, só pra auth
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  title text, -- opcional, se null deriva de 1ª linha do content
  content_md text NOT NULL DEFAULT '',
  tags text[] DEFAULT ARRAY[]::text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  CONSTRAINT player_notes_ownership_xor CHECK (
    (user_id IS NOT NULL AND session_token_id IS NULL) OR
    (user_id IS NULL AND session_token_id IS NOT NULL)
  )
);

CREATE INDEX idx_player_notes_campaign_user ON player_notes (campaign_id, user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_player_notes_campaign_anon ON player_notes (campaign_id, session_token_id) WHERE session_token_id IS NOT NULL;
CREATE INDEX idx_player_notes_tags ON player_notes USING gin (tags);

-- RLS: Jogador autenticado vê/edita só as suas; anônimo via session_token
ALTER TABLE player_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth player owns own notes" ON player_notes FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
-- Anônimo: policy via RPC passando token (padrão de player_quest_notes)
```

**Questões pra Winston:**
- Q1. `player_notes` deve usar mesmo padrão de auth dual (user_id XOR session_token_id) que `player_quest_notes` (mig 069)?
- Q2. RLS anônimo: usar RPC ou policy com `current_setting('request.jwt.claims')`?
- Q3. Títulos: derivar de 1ª linha ou campo separado? (Obsidian faz derivar)

### 🟡 M2 (refino, pode não ser necessário) — `npcs.mood` enum
**Status:** depende do Run mode spec final. Proposta anterior:
```sql
ALTER TABLE npcs ADD COLUMN mood text
  CHECK (mood IN ('hostile', 'neutral', 'ally', 'scared', 'curious', 'unknown'))
  DEFAULT 'unknown';
```

**Alternativa usando graph:** `edges(npc → npc_mood_tag, rel='custom')` + `custom_label='mood:preocupada'` — mas fica frágil. Recomendação: **manter M2 como enum explícito na tabela** se o redesign do Run quiser mostrar mood; caso contrário, descartar.

### 🟡 M3 (refino) — `sessions` recap fields
Ver migrations `0XX_sessions_recap.sql` existentes — verificar se `sessions.recap_body`, `recap_published_at`, `recap_updated_at` já existem. Se não, adicionar:
```sql
ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS recap_body text,
  ADD COLUMN IF NOT EXISTS recap_published_at timestamptz,
  ADD COLUMN IF NOT EXISTS recap_updated_at timestamptz;
```

### 🟢 M4 (nice-to-have, v1.5+) — `notes.tags[]`
Se não existir ainda (verificar), adicionar array + GIN index. Enables filter por tag no Mestre mode Preparar. Mesmo padrão do M1.

---

## 3. Migrations ELIMINADAS (não precisamos)

As 6 migrations propostas na v1 dessa investigação viraram:

| Migration proposta | Veredito |
|---|---|
| M1 `npcs.mood` | 🟡 opcional — ver §2 M2 |
| M2 `scene_entities` | ❌ REDUNDANTE — usar `edges(encounter → npc, rel='participated_in')` |
| M3 `entity_mentions` (backlinks) | ❌ REDUNDANTE — usar `edges(note → any, rel='mentions')` |
| M4 `tags` (arrays) | 🟢 talvez — ver §2 M4 |
| M5 `sessions.recap_*` | 🟡 verificar se existe, senão adicionar |
| M6 `character_completion` view | 🟢 trivial, pode ser adicionada a qualquer momento |

**Quantitativo:** de 6 migrations, **apenas 1 é obrigatoriamente nova** (`player_notes`). O resto ou já existe ou é refino menor.

---

## 4. Patterns de uso do graph (pra guiar UI dev)

### Pattern A — Atribuir jogadores a uma quest
```typescript
// UI: Quest edit form → multi-select de personagens
// Backend:
await supabase.from('campaign_mind_map_edges').upsert(
  selectedPlayerIds.map(pid => ({
    campaign_id,
    source_type: 'player', source_id: pid,
    target_type: 'quest', target_id: quest_id,
    relationship: 'participated_in',
    created_by: user.id,
  }))
);

// Query: "todas quests do jogador X nesta campanha"
const { data } = await supabase
  .from('campaign_mind_map_edges')
  .select('target_id, quests:target_id(*)')
  .eq('source_type', 'player')
  .eq('source_id', playerId)
  .eq('target_type', 'quest')
  .eq('relationship', 'participated_in');
```

### Pattern B — Backlinks de um NPC (killer-feat 10.1)
```typescript
// "Quais notas mencionam Grolda?"
const { data } = await supabase
  .from('campaign_mind_map_edges')
  .select('source_type, source_id, notes:source_id(*)')
  .eq('target_type', 'npc')
  .eq('target_id', groldaId)
  .eq('relationship', 'mentions');
```

### Pattern C — Quest → local (onde acontece)
```typescript
await supabase.from('campaign_mind_map_edges').insert({
  campaign_id, source_type: 'quest', source_id: questId,
  target_type: 'location', target_id: locationId,
  relationship: 'happened_at',
  created_by: user.id,
});
```

### Pattern D — Autocomplete filtrado por visibility (player backlinks v1.5)
```typescript
// Jogador digitando @ em nota → autocomplete
// Filtra: só NPCs com visibility='public', locais visitados, quests atribuídas
const { data: visibleNpcs } = await supabase
  .from('npcs')
  .select('id, name')
  .eq('campaign_id', campaign_id)
  .eq('visibility', 'public')
  .ilike('name', `${query}%`);
// Idem locations (visited_locations), quests (participated_in via edges)
```

---

## 5. Novas perguntas pra Winston

Substituem Q1-Q8 da versão anterior:

**Q1. `player` como source_type no graph — `player_id` refere a quê?**
Em `campaign_mind_map_edges`, `source_id` quando `source_type='player'` é:
- (a) `auth.users.id`
- (b) `characters.id` (personagem dentro da campanha)
- (c) `campaign_members.id`

Decisão crítica pra UI de atribuição de quest. Me parece (b) personagem, mas confirmar.

**Q2. `player_notes` dual-auth (XOR user_id / session_token_id) — pattern OK?**
Já usamos esse pattern em `player_quest_notes` (mig 069). Replicar? Ou novo approach?

**Q3. Backlinks `mentions` já tem parser/trigger?**
Quando alguém escreve `@Grolda` numa nota, quem insere o edge `note→npc rel=mentions`?
- (a) Frontend faz parse + insert manual
- (b) Trigger PostgreSQL no `notes.body` que parseia e popula
- (c) Job async worker
- (d) Ainda não existe — precisa construir (c/d)

**Q4. Performance de queries polimórficas**
`campaign_mind_map_edges` cresce fast. Em campanha com 50 NPCs × 20 quests × 30 notas × 100 menções, fica como?
- Index atual: `(campaign_id)`, `(source_type, source_id)`, `(target_type, target_id)`
- OK pra scale esperada? Ou precisa partial indexes por relationship?

**Q5. Anon player no graph**
`source_type='player'` funciona pra jogador anônimo (sem `auth.users.id`)? Se não, como tratar?

**Q6. `encounter` como source_type de cena**
Pro "Cena" panel em Rodar Combate: pode usar `edges(encounter → npc, rel='participated_in')`? Ou precisa outro relationship específico (tipo `in_scene`)?

**Q7. Cleanup de edges quando entidade é deletada**
Mig 152 fez cascade. Verificar: se eu deletar NPC Grolda, os edges `mentions` dela em notas antigas são removidos ou mantidos (pra history)?

**Q8. UI component pra atribuir (RELATIONSHIPS_UI.md?)**
Existe component "AttachEntity" reutilizável? Ou cada surface implementa do zero?
Proposta: criar um `<EntityAttachmentChips source={...} allowedRelationships={...} />` que usa o graph.

---

## 6. Escopo revisado da investigação

**Entregável esperado do Winston (reduzido):**
1. Confirmar mapeamento §1 (quest/mentions/etc usam edges existentes)
2. Responder Q1-Q8 (§5)
3. Refinar migration `player_notes` (§2 M1) — RLS, indexes, ownership pattern
4. Decidir se M2 (npcs.mood) entra ou não
5. Verificar estado atual de M3 (sessions recap fields) e M4 (tags arrays)
6. Estimar tempo de implementação

**Timebox sugerido:** 2h de investigação + 1h de spec review. (Antes era 4h+2h — reduzido em 50%.)

**Blocker:** Fase C do redesign (Rodar + killer-features) fica destravada pra começar com `player_notes` + usar graph existente pro resto.

---

## 7. Ordem de prioridade (pra implementação)

1. **M1 `player_notes`** — único bloqueador absoluto (wiki do Jogador MVP)
2. **Q3 backlinks parser** — dev UI precisa saber se parseia no frontend ou server
3. **Q1 player_id semantics** — dev UI precisa saber o shape dos chips de atribuição
4. **M3 sessions recap fields** — check se falta

Tudo o mais é bônus ou refino pós-MVP.

---

## 8. Documentos de referência

- [`redesign-proposal.md` v0.3](../qa/evidence/campaign-audit-2026-04-21/redesign-proposal.md) — decisões #23-26
- [`docs/glossario-ubiquo.md`](../../docs/glossario-ubiquo.md) — adendo 2026-04-21
- `supabase/migrations/080_mind_map_edges.sql`
- `supabase/migrations/148_entity_graph_relationships.sql`
- `supabase/migrations/069_player_quest_notes.sql` (pattern dual-auth)
- `docs/PRD-entity-graph.md` — PRD do entity graph (citado em mig 148)

---

**Changelog:**
- **v1 (2026-04-21 manhã):** 6 migrations propostas, 8 perguntas
- **v2 (2026-04-21 tarde):** descoberta do graph existente — 1 migration obrigatória + 3 refinos + 8 novas perguntas focadas
