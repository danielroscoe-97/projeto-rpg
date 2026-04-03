# Epic: Player HQ — Companheiro de Mesa do Jogador Logado

**Projeto:** Pocket DM
**Autor:** BMAD Team (PM + Architect + UX + Analyst)
**Data:** 2026-04-03
**Status:** Pronto para Especificacao
**Dependencia:** Epic Area Logada Dual-Role (`docs/epic-campaign-dual-role.md`)

---

## 1. Manifesto de Produto

> *"O grosso pode estar na gente, mas tambem pode estar fora."*

O Player HQ **nao e um VTT. Nao e o D&D Beyond. E o co-piloto de mesa.**

O jogador chega com a ficha impressa (ou no D&D Beyond, ou de cabeca). O PocketDM entra onde o papel falha: **rastrear estado volatil em tempo real**.

| O que o papel faz bem | O que o PocketDM faz melhor |
|---|---|
| Atributos, proficiencias, lore | HP que muda a cada hit |
| Background, personalidade | Wild Shape: 2/3 usos gastos |
| Spell list completa | Slots de 2o nivel: 1/3 restante |
| Historia do personagem | Bag of Holding compartilhada |
| — | Notas rapidas de sessao |
| — | NPC journal pessoal |

**O jogador nao precisa migrar tudo.** Ele migra o que doi gerenciar no papel.
Dois minutos de setup, sessao toda organizada.

### Posicionamento Competitivo

| Ferramenta | Proposta | Gap |
|---|---|---|
| D&D Beyond | Sheet completa online | Nao integra com mesa em tempo real |
| Roll20 | VTT completo | Complexo, pesado, desktop-first |
| Ficha de papel | Zero fricao | Nao rastreia estado volatil |
| **PocketDM Player HQ** | **Co-piloto mobile ao vivo** | **Preenche o gap** |

---

## 2. Rotas do Player HQ

```
/app/dashboard                   → Player Home + DM Home (por role)
/app/campaign/[id]               → Player HQ (membro) ou DM View (owner)
/app/campaign/[id]/sheet         → Character sheet + core stats
/app/campaign/[id]/resources     → Resource trackers + spell slots
/app/campaign/[id]/inventory     → Inventario pessoal + Bag of Holding
/app/campaign/[id]/notes         → Journal + notas rapidas + NPC journal
/app/campaign/[id]/quests        → Quest board (visao do jogador)
```

### Navigation Pattern

- **Mobile:** Bottom navigation bar persistente com 5 icones (Sheet, Resources, Inventory, Notes, Quests)
- **Desktop:** Sidebar fixa com mesmas secoes
- **Regra:** Navegar entre secoes NUNCA pode perder o contexto de combate ativo

---

## 3. Modelo de Dados

### 3.1. Extensao de `player_characters` — migration 056

Adiciona campos opcionais ao personagem. Todos nullable — jogador preenche o que quiser.

```sql
-- 056_player_characters_extended.sql
ALTER TABLE player_characters
  ADD COLUMN IF NOT EXISTS hp_temp       INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS speed         INTEGER,
  ADD COLUMN IF NOT EXISTS initiative_bonus INTEGER,
  ADD COLUMN IF NOT EXISTS inspiration   BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS conditions    JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS str           INTEGER,
  ADD COLUMN IF NOT EXISTS dex           INTEGER,
  ADD COLUMN IF NOT EXISTS con           INTEGER,
  ADD COLUMN IF NOT EXISTS int_score     INTEGER,
  ADD COLUMN IF NOT EXISTS wis           INTEGER,
  ADD COLUMN IF NOT EXISTS cha           INTEGER,
  ADD COLUMN IF NOT EXISTS subrace       TEXT,
  ADD COLUMN IF NOT EXISTS subclass      TEXT,
  ADD COLUMN IF NOT EXISTS background    TEXT,
  ADD COLUMN IF NOT EXISTS alignment     TEXT,
  ADD COLUMN IF NOT EXISTS traits        JSONB,
  ADD COLUMN IF NOT EXISTS currency      JSONB DEFAULT '{"cp":0,"sp":0,"ep":0,"gp":0,"pp":0}';

COMMENT ON COLUMN player_characters.conditions IS
  'Array de condicoes ativas: ["poisoned", "incapacitated", ...]';
COMMENT ON COLUMN player_characters.traits IS
  '{ personality: string, ideal: string, bond: string, flaw: string }';
COMMENT ON COLUMN player_characters.currency IS
  '{ cp: int, sp: int, ep: int, gp: int, pp: int }';
```

### 3.2. Resource Trackers — migration 057

Tracker generico de recursos: Wild Shape, Ki Points, Action Surge, Arcane Recovery, etc.
Reutiliza o mesmo componente de bolinhas do Spell Slots Tracker.

```sql
-- 057_character_resource_trackers.sql
CREATE TABLE character_resource_trackers (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_character_id UUID NOT NULL REFERENCES player_characters(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  max_uses            INTEGER NOT NULL DEFAULT 1,
  current_uses        INTEGER NOT NULL DEFAULT 0,
  reset_type          TEXT NOT NULL DEFAULT 'long_rest'
    CHECK (reset_type IN ('short_rest', 'long_rest', 'dawn', 'manual')),
  source              TEXT NOT NULL DEFAULT 'manual'
    CHECK (source IN ('srd', 'manual')),
  srd_ref             TEXT,
  display_order       INTEGER NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT max_uses_positive CHECK (max_uses >= 1),
  CONSTRAINT current_uses_valid CHECK (current_uses >= 0 AND current_uses <= max_uses)
);

CREATE INDEX idx_resource_trackers_character ON character_resource_trackers(player_character_id);

ALTER TABLE character_resource_trackers ENABLE ROW LEVEL SECURITY;

-- Jogador gerencia seus proprios trackers
CREATE POLICY resource_trackers_owner ON character_resource_trackers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM player_characters pc
      WHERE pc.id = character_resource_trackers.player_character_id
      AND pc.user_id = auth.uid()
    )
  );

-- DM pode ler trackers dos personagens da sua campanha
CREATE POLICY resource_trackers_dm_read ON character_resource_trackers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM player_characters pc
      JOIN campaigns c ON c.id = pc.campaign_id
      WHERE pc.id = character_resource_trackers.player_character_id
      AND c.owner_id = auth.uid()
    )
  );
```

### 3.3. Bag of Holding — migrations 058 + 059

Inventario compartilhado da party por campanha.

```sql
-- 058_party_inventory.sql
CREATE TABLE party_inventory_items (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id          UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  item_name            TEXT NOT NULL,
  quantity             INTEGER NOT NULL DEFAULT 1,
  notes                TEXT,
  added_by             UUID NOT NULL REFERENCES auth.users(id),
  added_at             TIMESTAMPTZ DEFAULT now(),
  status               TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'pending_removal', 'removed')),
  removed_by           UUID REFERENCES auth.users(id),
  removed_at           TIMESTAMPTZ,
  removal_approved_by  UUID REFERENCES auth.users(id),
  CONSTRAINT quantity_positive CHECK (quantity >= 1)
);

CREATE INDEX idx_party_inventory_campaign ON party_inventory_items(campaign_id);
CREATE INDEX idx_party_inventory_status   ON party_inventory_items(campaign_id, status);

ALTER TABLE party_inventory_items ENABLE ROW LEVEL SECURITY;

-- Qualquer membro pode ver itens ativos
CREATE POLICY party_inventory_member_select ON party_inventory_items
  FOR SELECT USING (public.is_campaign_member(campaign_id));

-- Qualquer membro pode adicionar itens
CREATE POLICY party_inventory_member_insert ON party_inventory_items
  FOR INSERT WITH CHECK (
    public.is_campaign_member(campaign_id)
    AND added_by = auth.uid()
  );

-- DM pode atualizar (aprovar remocoes)
CREATE POLICY party_inventory_dm_update ON party_inventory_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM campaigns WHERE id = campaign_id AND owner_id = auth.uid()
    )
  );

-- 059_inventory_removal_requests.sql
CREATE TABLE inventory_removal_requests (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id       UUID NOT NULL REFERENCES party_inventory_items(id) ON DELETE CASCADE,
  campaign_id   UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  requested_by  UUID NOT NULL REFERENCES auth.users(id),
  requested_at  TIMESTAMPTZ DEFAULT now(),
  status        TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'denied')),
  approved_by   UUID REFERENCES auth.users(id),
  approved_at   TIMESTAMPTZ,
  denial_reason TEXT
);

CREATE INDEX idx_removal_requests_campaign ON inventory_removal_requests(campaign_id, status);
CREATE INDEX idx_removal_requests_item     ON inventory_removal_requests(item_id);

ALTER TABLE inventory_removal_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY removal_requests_member ON inventory_removal_requests
  FOR SELECT USING (
    public.is_campaign_member(campaign_id)
  );

CREATE POLICY removal_requests_insert ON inventory_removal_requests
  FOR INSERT WITH CHECK (
    public.is_campaign_member(campaign_id)
    AND requested_by = auth.uid()
  );

CREATE POLICY removal_requests_dm_update ON inventory_removal_requests
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM campaigns WHERE id = campaign_id AND owner_id = auth.uid()
    )
  );
```

### 3.4. Notificacoes de Jogador — migration 060

```sql
-- 060_player_notifications.sql
CREATE TABLE player_notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  type        TEXT NOT NULL,
  title       TEXT NOT NULL,
  message     TEXT NOT NULL,
  meta        JSONB DEFAULT '{}',
  read_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_notifications_user   ON player_notifications(user_id, read_at);
CREATE INDEX idx_notifications_unread ON player_notifications(user_id) WHERE read_at IS NULL;

ALTER TABLE player_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY notifications_owner ON player_notifications
  FOR ALL USING (user_id = auth.uid());
```

**Tipos de notificacao:**
- `removal_approved` — DM aprovou remocao de item da Bag
- `removal_denied` — DM negou remocao (com motivo opcional)
- `item_added` — outro jogador adicionou item na Bag (opcional, configuravel)

### 3.5. NPC Journal Pessoal — migration 061

```sql
-- 061_player_npc_notes.sql
CREATE TABLE player_npc_notes (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_character_id  UUID NOT NULL REFERENCES player_characters(id) ON DELETE CASCADE,
  campaign_id          UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  npc_name             TEXT NOT NULL,
  relationship         TEXT NOT NULL DEFAULT 'unknown'
    CHECK (relationship IN ('ally', 'enemy', 'neutral', 'unknown')),
  notes                TEXT,
  created_at           TIMESTAMPTZ DEFAULT now(),
  updated_at           TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_npc_notes_character ON player_npc_notes(player_character_id);

ALTER TABLE player_npc_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY npc_notes_owner ON player_npc_notes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM player_characters
      WHERE id = player_character_id AND user_id = auth.uid()
    )
  );
```

### 3.6. Journal de Sessoes — migration 062

```sql
-- 062_player_journal.sql
CREATE TABLE player_journal_entries (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_character_id  UUID NOT NULL REFERENCES player_characters(id) ON DELETE CASCADE,
  campaign_id          UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  type                 TEXT NOT NULL DEFAULT 'journal'
    CHECK (type IN ('journal', 'quick_note', 'lore')),
  title                TEXT,
  content              TEXT NOT NULL,
  created_at           TIMESTAMPTZ DEFAULT now(),
  updated_at           TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_journal_character ON player_journal_entries(player_character_id, created_at DESC);

ALTER TABLE player_journal_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY journal_owner ON player_journal_entries
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM player_characters
      WHERE id = player_character_id AND user_id = auth.uid()
    )
  );
```

---

## 4. Stories por Epic

### E1 — Player Home

| ID | Story | Prioridade | SP | Dependencias |
|---|---|---|---|---|
| [PHQ-E1-F1](stories/PHQ-E1-F1-player-home-dashboard.md) | Player Home — Dashboard refatorado DM+Player | Alta | 5 | epic-campaign-dual-role |
| [PHQ-E1-F2](stories/PHQ-E1-F2-campaign-card-player.md) | Campaign Card com imagem DM + status rapido | Alta | 3 | PHQ-E1-F1 |

### E2 — Character Sheet Basica

| ID | Story | Prioridade | SP | Dependencias |
|---|---|---|---|---|
| [PHQ-E2-F3](stories/PHQ-E2-F3-character-hp-conditions.md) | HP Tracker ao vivo + Condicoes ativas | Alta | 5 | PHQ-E1-F1, migration 056 |
| [PHQ-E2-F4](stories/PHQ-E2-F4-character-core-stats.md) | Core Stats: AC, Iniciativa, Speed, Inspiration | Media | 3 | PHQ-E2-F3 |

### E3 — Resource Trackers (core)

| ID | Story | Prioridade | SP | Dependencias |
|---|---|---|---|---|
| [PHQ-E3-F5](stories/PHQ-E3-F5-resource-tracker-ui.md) | UI de Bolinhas — componente reutilizavel | Alta | 3 | DeathSaveTracker, SpellSlotTracker |
| [PHQ-E3-F6](stories/PHQ-E3-F6-resource-tracker-crud.md) | CRUD de Resource Trackers | Alta | 5 | PHQ-E3-F5, migration 057 |
| [PHQ-E3-F7](stories/PHQ-E3-F7-resource-tracker-srd.md) | Autocomplete do SRD para feats/resources | Media | 5 | PHQ-E3-F6 |
| [PHQ-E3-F8](stories/PHQ-E3-F8-resource-tracker-reset.md) | Reset Short Rest / Long Rest / Dawn | Alta | 3 | PHQ-E3-F6 |

### E4 — Bag of Holding

| ID | Story | Prioridade | SP | Dependencias |
|---|---|---|---|---|
| [PHQ-E4-F9](stories/PHQ-E4-F9-bag-of-holding-core.md) | Bag of Holding — CRUD de itens + log | Alta | 8 | migrations 058+059 |
| [PHQ-E4-F10](stories/PHQ-E4-F10-bag-removal-flow.md) | Fluxo de Remocao — solicitacao + aprovacao DM | Alta | 8 | PHQ-E4-F9 |
| [PHQ-E4-F11](stories/PHQ-E4-F11-bag-notifications.md) | Notificacoes assincronas de aprovacao/negacao | Media | 5 | PHQ-E4-F10, migration 060 |

### E5 — Spell Slots no Player HQ

| ID | Story | Prioridade | SP | Dependencias |
|---|---|---|---|---|
| [PHQ-E5-F12](stories/PHQ-E5-F12-spell-slots-hq.md) | Spell Slots no Player HQ (reutiliza bolinhas E3) | Alta | 3 | PHQ-E3-F5, F-41 |
| [PHQ-E5-F13](stories/PHQ-E5-F13-spell-list.md) | Lista de Magias por personagem | Media | 5 | PHQ-E5-F12 |

### E6 — Notas & Journal

| ID | Story | Prioridade | SP | Dependencias |
|---|---|---|---|---|
| [PHQ-E6-F14](stories/PHQ-E6-F14-player-notes.md) | Player Notes — journal + notas rapidas | Media | 5 | PHQ-E1-F1, migration 062 |
| [PHQ-E6-F15](stories/PHQ-E6-F15-npc-journal.md) | NPC Journal pessoal do jogador | Baixa | 3 | PHQ-E6-F14, migration 061 |

### E7 — Quest Board (visao jogador)

| ID | Story | Prioridade | SP | Dependencias |
|---|---|---|---|---|
| [PHQ-E7-F16](stories/PHQ-E7-F16-quest-board-player.md) | Quest Board — visao do jogador logado | Media | 3 | F-39 (quest board DM), PHQ-E1-F1 |

**Total estimado: 72 SP**

---

## 5. Sequencia de Implementacao

```
Sprint 1 — MVP: Player Home + Bag of Holding (valor imediato)
  PHQ-E1-F1 (dashboard)
  PHQ-E1-F2 (campaign card)
  PHQ-E4-F9 (bag of holding core)
  PHQ-E4-F10 (remocao + aprovacao)
  PHQ-E4-F11 (notificacoes)

Sprint 2 — Sheet + Trackers (co-piloto de mesa)
  PHQ-E2-F3 (HP + condicoes)
  PHQ-E2-F4 (core stats)
  PHQ-E3-F5 (UI bolinhas)
  PHQ-E3-F6 (CRUD trackers)
  PHQ-E3-F8 (reset short/long rest)

Sprint 3 — Spell Slots + Notas (completude de mesa)
  PHQ-E5-F12 (spell slots no HQ)
  PHQ-E6-F14 (journal + notas)
  PHQ-E7-F16 (quest board player)

Sprint 4 — Polimento
  PHQ-E3-F7 (SRD autocomplete)
  PHQ-E5-F13 (lista de magias)
  PHQ-E6-F15 (NPC journal)
```

---

## 6. Principios Imutaveis

1. **Anti-metagaming** — jogador NUNCA ve HP, AC ou DC de monstros
2. **Mobile-first** — toda interacao pensada para toque com uma mao
3. **Complementar, nao substituir** — PocketDM ajuda o papel, nao compete
4. **Bolinhas para tudo volatil** — qualquer recurso com X usos usa o componente generico de dots
5. **Imagem da campanha sempre visivel** — o DM define a arte, o jogador vive nela
6. **Tudo opcional** — nenhum campo obrigatorio alem de nome do personagem
7. **Paridade de acesso** — DM ve tudo da campanha (incluindo sheets dos jogadores), jogador ve so o seu

---

## 7. Acessibilidade e i18n

- Todas as strings em `messages/pt-BR.json` e `messages/en.json` no namespace `player_hq`
- Todos os elementos interativos com `aria-label` descritivo
- Navegacao por teclado suportada no desktop
- Contraste minimo 4.5:1 em todos os estados de cor

---

## 8. Notas de Paridade (Guest / Anon / Auth)

| Feature | Guest (`/try`) | Anonimo (`/join`) | Autenticado |
|---|---|---|---|
| Player Home | NAO — DM-only | NAO | SIM |
| Bag of Holding | NAO | NAO | SIM (por campanha) |
| Resource Trackers | NAO | NAO | SIM |
| Character Sheet | NAO | NAO | SIM |
| Notas | NAO | NAO | SIM |
| Quest Board | Ver quests da sessao | Ver quests da sessao | Ver + historico |

Todas as features deste epic sao **Auth-only** — requerem conta e membership em campanha.
