# Epic: Player HQ — Companheiro de Mesa do Jogador Logado

**Projeto:** Pocket DM
**Autor:** BMAD Team (PM + Architect + UX + Analyst)
**Data:** 2026-04-03
**Status:** Revisado pos-critica adversarial
**Dependencia:** Epic Area Logada Dual-Role (`docs/epic-campaign-dual-role.md`) — **JA IMPLEMENTADO**

---

## 0. Estado Atual — O Que Ja Existe

> Revisao adversarial de 2026-04-03 revelou que a infraestrutura base esta **100% implementada**.
> O Player HQ parte de fundacao solida, nao do zero.

### Infraestrutura ja pronta

| Componente | Status | Arquivos |
|---|---|---|
| `campaign_members` table + RLS | Implementado | migrations 032-036 |
| `is_campaign_member()` function | Implementado | migration 032 |
| `accept_campaign_invite()` RPC | Implementado | migration 036 |
| Dashboard dual-role (DM + Player) | Implementado | `DashboardOverview.tsx`, `DashboardContent.tsx` |
| `PlayerCampaignCard.tsx` | Implementado | `components/dashboard/PlayerCampaignCard.tsx` |
| `PlayerCampaignView.tsx` | Implementado | `components/campaign/PlayerCampaignView.tsx` |
| `PlayerCharacterManager.tsx` | Implementado | `components/dashboard/PlayerCharacterManager.tsx` |
| `MyCharactersPage.tsx` | Implementado | `components/dashboard/MyCharactersPage.tsx` |
| `MembersList` + `MemberCard` + Convites | Implementado | `components/campaign/` |
| Merge players+members unificado | Implementado | `merge-players-members.ts` |
| `SpellSlotTracker.tsx` + migration 054 | Implementado | `components/player/SpellSlotTracker.tsx` |
| `QuestBoard.tsx` + migration 055 | Implementado | `components/campaign/QuestBoard.tsx` |
| `PlayerChat` + `DmPostit` (F-38) | Implementado | `components/player/` |
| Player Notes com RLS (F-40) | Implementado | migration 053, `PlayerSharedNotes.tsx` |
| `EncounterHistory.tsx` (W36) | Implementado | `components/campaign/EncounterHistory.tsx` |
| `NpcTagSelector` + NPC links (W35) | Implementado | migration 045, `NpcTagSelector.tsx` |
| `player_characters` com race/class/level/notes/token_url/spell_slots | Implementado | migrations 001/027/038/044/054 |
| Storage bucket `player-avatars` | Implementado | migration 044 |
| Role store (DM/Player/Both) | Implementado | `lib/stores/role-store.ts` |
| `getUserMemberships()` API | Implementado | `lib/supabase/campaign-membership.ts` |
| HP tier system (LIGHT/MODERATE/HEAVY/CRITICAL) | Implementado | `lib/utils/hp-status.ts` |
| `PlayerSpellBrowser.tsx` | Implementado | `components/player/PlayerSpellBrowser.tsx` |

### Rotas existentes

```
/app/app/dashboard              → Dashboard unificado (DashboardOverview)
/app/app/dashboard/characters   → Meus Personagens (MyCharactersPage)
/app/app/campaigns/[id]         → CampaignView (auto-detect role: DM ou Player)
```

### Tabelas `player_characters` — schema ATUAL

```sql
player_characters (
  id UUID PK, campaign_id FK, user_id FK,
  name TEXT NOT NULL,
  race TEXT, class TEXT, level INTEGER,       -- ja existem (038)
  max_hp INTEGER NOT NULL, current_hp INTEGER,
  ac INTEGER NOT NULL,                        -- NOT NULL no schema original
  spell_save_dc INTEGER,
  notes TEXT, token_url TEXT, dm_notes TEXT,
  spell_slots JSONB,                          -- migration 054
  created_at, updated_at
)
```

> **ATENCAO:** `race`, `class`, `level`, `ac` **ja existem**. A migration 056 NAO deve recria-los.
> `ac` e NOT NULL no schema original — a filosofia "tudo opcional" deve manter essa constraint.

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

> **IMPORTANTE:** O app usa `/app/app/` como route group autenticado. NAO existe `(authenticated)`.

```
/app/app/dashboard                     → Player Home + DM Home (ja existe, estender)
/app/app/campaigns/[id]                → Player HQ (ja existe: PlayerCampaignView, estender)
/app/app/campaigns/[id]/sheet          → Character sheet + core stats (NOVO)
/app/app/campaigns/[id]/resources      → Resource trackers + spell slots (NOVO)
/app/app/campaigns/[id]/inventory      → Inventario pessoal + Bag of Holding (NOVO)
/app/app/campaigns/[id]/notes          → Journal privado + notas rapidas (NOVO)
/app/app/campaigns/[id]/quests         → Quest board (estender QuestBoard existente)
```

### Navigation Pattern

- **Mobile:** Bottom navigation bar persistente com 5 icones (Sheet, Resources, Inventory, Notes, Quests)
- **Desktop:** Sidebar fixa com mesmas secoes (estender DashboardSidebar existente)
- **Regra:** Navegar entre secoes NUNCA pode perder o contexto de combate ativo

---

## 3. Modelo de Dados

### 3.1. Migration 056 — Imagem de Campanha + Extensao de `player_characters`

> **FIX C2/C3:** `cover_image_url` precisa existir em campaigns. Campos race/class/ac ja existem em player_characters.

```sql
-- 056_campaign_cover_and_character_extended.sql

-- Imagem de capa da campanha (usada no card do jogador)
ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS cover_image_url TEXT;

-- Extensao de player_characters (apenas campos NOVOS)
-- NOTA: race, class, level, ac, max_hp JA EXISTEM — NAO recriar
ALTER TABLE player_characters
  ADD COLUMN IF NOT EXISTS hp_temp          INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS speed            INTEGER,
  ADD COLUMN IF NOT EXISTS initiative_bonus INTEGER,
  ADD COLUMN IF NOT EXISTS inspiration      BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS conditions       JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS str              INTEGER,
  ADD COLUMN IF NOT EXISTS dex              INTEGER,
  ADD COLUMN IF NOT EXISTS con              INTEGER,
  ADD COLUMN IF NOT EXISTS int_score        INTEGER,
  ADD COLUMN IF NOT EXISTS wis              INTEGER,
  ADD COLUMN IF NOT EXISTS cha_score        INTEGER,
  ADD COLUMN IF NOT EXISTS subrace          TEXT,
  ADD COLUMN IF NOT EXISTS subclass         TEXT,
  ADD COLUMN IF NOT EXISTS background       TEXT,
  ADD COLUMN IF NOT EXISTS alignment        TEXT,
  ADD COLUMN IF NOT EXISTS traits           JSONB,
  ADD COLUMN IF NOT EXISTS currency         JSONB DEFAULT '{"cp":0,"sp":0,"ep":0,"gp":0,"pp":0}';

COMMENT ON COLUMN player_characters.conditions IS
  'Array de condicoes ativas: ["poisoned", "incapacitated", ...]';
COMMENT ON COLUMN player_characters.traits IS
  '{ personality: string, ideal: string, bond: string, flaw: string }';
```

### 3.2. Migration 057 — Resource Trackers

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

CREATE POLICY resource_trackers_owner ON character_resource_trackers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM player_characters pc
      WHERE pc.id = character_resource_trackers.player_character_id
      AND pc.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM player_characters pc
      WHERE pc.id = character_resource_trackers.player_character_id
      AND pc.user_id = auth.uid()
    )
  );

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

### 3.3. Migrations 058-060 — Bag of Holding + Notificacoes

> **FIX C6:** Migration 060 (notifications + trigger) criada junto com 058/059 para evitar dependencia circular.

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
-- + indexes + RLS (ver stories F9/F10 para detalhes)

-- 059_inventory_removal_requests.sql
CREATE TABLE inventory_removal_requests ( ... );
-- + indexes + RLS (ver story F10)

-- 060_player_notifications.sql
-- CRIADA ANTES do trigger de F10 para evitar dependencia circular
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
-- + trigger notify_removal_decision (ver story F10)
```

### 3.4. Migrations 061-062 — NPC Journal + Player Journal

```sql
-- 061_player_npc_notes.sql
CREATE TABLE player_npc_notes ( ... );
-- RLS: somente owner. DM NAO tem SELECT.

-- 062_player_journal.sql
CREATE TABLE player_journal_entries (
  ...
  type TEXT NOT NULL DEFAULT 'quick_note'
    CHECK (type IN ('quick_note', 'journal', 'lore')),
  ...
);
-- RLS: somente owner. DM NAO tem SELECT.
-- NOTA: tipo 'lore' mantido para notas de worldbuilding do jogador.
```

> **Distincao F-40 vs F14:** `campaign_notes` (F-40) = notas visiveis ao DM. `player_journal_entries` (F14) = journal 100% privado. Tabelas separadas com propositos diferentes.

### 3.5. Migrations 063-064 — Spell List + Quest Notes

```sql
-- 063_character_spells.sql (Sprint 4)
CREATE TABLE character_spells ( ... );

-- 064_player_quest_notes.sql (Sprint 4)
CREATE TABLE player_quest_notes ( ... );
-- COM WITH CHECK na policy de INSERT
```

> **NOTA sobre numeros de migration:** Estes numeros podem conflitar se outras features forem desenvolvidas em paralelo. Ao implementar, usar o proximo numero disponivel, nao o planejado aqui.

---

## 4. Stories por Epic

### E1 — Player Home (ESTENDER componentes existentes)

| ID | Story | Prioridade | SP | Dependencias |
|---|---|---|---|---|
| [PHQ-E1-F1](stories/PHQ-E1-F1-player-home-dashboard.md) | Player Home — Estender DashboardOverview | Alta | 3 | Nenhuma (infra ja existe) |
| [PHQ-E1-F2](stories/PHQ-E1-F2-campaign-card-player.md) | Campaign Card — imagem DM + status rapido | Alta | 3 | PHQ-E1-F1, migration 056 (cover_image_url) |

> **NOTA revisao:** F1 baixou de 5 para 3 SP porque DashboardOverview, PlayerCampaignCard e PlayerCampaignView ja existem. E extensao, nao criacao.
> **NOTA F2:** Status chips (spell slots, trackers) exibem dados progressivamente conforme tabelas existam. Sem tabela = sem chip. Sem crash.

### E2 — Character Sheet Basica

| ID | Story | Prioridade | SP | Dependencias |
|---|---|---|---|---|
| [PHQ-E2-F3](stories/PHQ-E2-F3-character-hp-conditions.md) | HP Tracker ao vivo + Condicoes ativas | Alta | 5 | migration 056 |
| [PHQ-E2-F4](stories/PHQ-E2-F4-character-core-stats.md) | Core Stats + Atributos + Edit Sheet | Media | 3 | PHQ-E2-F3 |

> **NOTA HP tiers:** O Player HQ adiciona tier "FULL" (>70%) como estado de display. Os 4 tiers imutaveis (LIGHT/MODERATE/HEAVY/CRITICAL) sao mantidos. FULL e um label extra, nao altera as cores dos tiers existentes.

### E3 — Resource Trackers (core)

| ID | Story | Prioridade | SP | Dependencias |
|---|---|---|---|---|
| [PHQ-E3-F5](stories/PHQ-E3-F5-resource-tracker-ui.md) | UI de Bolinhas — componente reutilizavel | Alta | 3 | Nenhuma |
| [PHQ-E3-F6](stories/PHQ-E3-F6-resource-tracker-crud.md) | CRUD de Resource Trackers | Alta | 5 | PHQ-E3-F5, migration 057 |
| [PHQ-E3-F7](stories/PHQ-E3-F7-resource-tracker-srd.md) | Autocomplete do SRD para feats/resources | Media | 5 | PHQ-E3-F6 |
| [PHQ-E3-F8](stories/PHQ-E3-F8-resource-tracker-reset.md) | Reset Short Rest / Long Rest / Dawn | Alta | 3 | PHQ-E3-F6 |

> **NOTA Lay on Hands (M4):** Recursos com max_uses > 20 devem exibir input numerico em vez de dots. ResourceDots deve ter fallback: `if (maxUses > 20) return <NumericTracker />`.
> **NOTA Exhaustion (M5):** Exhaustion tem 6 niveis em 5e. Para manter simplicidade, usar dropdown 0-6 em vez de toggle binario. Documentar como "simplificacao consciente".

### E4 — Bag of Holding

| ID | Story | Prioridade | SP | Dependencias |
|---|---|---|---|---|
| [PHQ-E4-F9](stories/PHQ-E4-F9-bag-of-holding-core.md) | Bag of Holding — CRUD de itens + log | Alta | 5 | migrations 058+059+060 |
| [PHQ-E4-F10](stories/PHQ-E4-F10-bag-removal-flow.md) | Fluxo de Remocao + aprovacao DM | Alta | 5 | PHQ-E4-F9 |
| [PHQ-E4-F11](stories/PHQ-E4-F11-bag-notifications.md) | Notificacoes assincronas | Media | 5 | PHQ-E4-F10 |

> **FIX I1:** SP ajustados de 8+8+5 para 5+5+5 (total E4: 15 em vez de 21). Bag of Holding e CRUD + estados, menos complexo que Resource Trackers.
> **FIX I4:** `approveRemoval` deve popular `removed_by` com `requested_by` da solicitacao.

### E5 — Spell Slots no Player HQ

| ID | Story | Prioridade | SP | Dependencias |
|---|---|---|---|---|
| [PHQ-E5-F12](stories/PHQ-E5-F12-spell-slots-hq.md) | Spell Slots no Player HQ (reutiliza E3) | Alta | 3 | PHQ-E3-F5 |
| [PHQ-E5-F13](stories/PHQ-E5-F13-spell-list.md) | Lista de Magias por personagem | Media | 5 | migration 063, PlayerSpellBrowser |

> **NOTA F12:** SpellSlotTracker.tsx e migration 054 JA EXISTEM. F12 cria wrapper SpellSlotsHq.
> **NOTA F13:** `PlayerSpellBrowser.tsx` ja existe (15.9K). Reutilizar como base.

### E6 — Notas & Journal

| ID | Story | Prioridade | SP | Dependencias |
|---|---|---|---|---|
| [PHQ-E6-F14](stories/PHQ-E6-F14-player-notes.md) | Player Notes — journal privado + notas rapidas | Media | 5 | migration 062 |
| [PHQ-E6-F15](stories/PHQ-E6-F15-npc-journal.md) | NPC Journal pessoal do jogador | Baixa | 3 | migration 061 |

> **Distincao F-40 vs F14:** F-40 (campaign_notes) = notas compartilhadas com DM. F14 (player_journal_entries) = journal privado. Propositos diferentes, tabelas separadas.

### E7 — Quest Board (visao jogador)

| ID | Story | Prioridade | SP | Dependencias |
|---|---|---|---|---|
| [PHQ-E7-F16](stories/PHQ-E7-F16-quest-board-player.md) | Quest Board — notas pessoais + favoritos | Media | 3 | QuestBoard existente (F-39), migration 064 |

> **NOTA:** QuestBoard read-only do player JA EXISTE em PlayerCampaignView. F16 adiciona: notas pessoais, favoritar, badge "nova".

**Total estimado revisado: 61 SP** (de 72 original)

---

## 5. Sequencia de Implementacao (REVISADA)

> **FIX I7:** Sprint 1 agora comeca com HP + Resource Trackers (o "co-piloto de mesa") em vez de Bag of Holding. Bag of Holding vai pro Sprint 2. Isso alinha com o manifesto.

```
Sprint 1 — Co-piloto de Mesa (valor de sessao imediato)
  migration 056 (cover_image + character extended)
  migration 057 (resource trackers)
  PHQ-E1-F1 (estender dashboard)
  PHQ-E2-F3 (HP tracker + condicoes)
  PHQ-E2-F4 (core stats + edit sheet)
  PHQ-E3-F5 (ResourceDots componente)
  PHQ-E3-F6 (CRUD trackers)
  PHQ-E3-F8 (reset short/long rest)
  PHQ-E5-F12 (spell slots no HQ)
  Total: ~33 SP

Sprint 2 — Bag of Holding + Imagem de Campanha
  migrations 058+059+060 (inventory + notifications)
  PHQ-E1-F2 (campaign card com imagem)
  PHQ-E4-F9 (bag of holding core)
  PHQ-E4-F10 (remocao + aprovacao DM)
  PHQ-E4-F11 (notificacoes in-app)
  Total: ~18 SP

Sprint 3 — Notas + Quest Board
  migrations 061+062 (npc notes + journal)
  PHQ-E6-F14 (journal + notas privadas)
  PHQ-E6-F15 (NPC journal)
  PHQ-E7-F16 (quest board com notas/favoritos)
  Total: ~11 SP

Sprint 4 — Polimento + SRD
  migration 063 (character spells)
  PHQ-E3-F7 (SRD autocomplete)
  PHQ-E5-F13 (lista de magias)
  Total: ~10 SP (opcionalmente paralelo com outro trabalho)
```

---

## 6. Edge Cases Documentados

| Edge Case | Resolucao |
|---|---|
| Jogador membro da campanha SEM personagem criado | Onboarding flow: "Crie seu personagem" no Player HQ. Bloqueia abas ate personagem existir. |
| Campanha SEM imagem de capa | Gradient padrao da paleta do projeto (background escuro). |
| Resource com max_uses > 20 (Lay on Hands, Ki Points alto nivel) | ResourceDots exibe input numerico em vez de dots. Threshold: 20. |
| Exhaustion (6 niveis em 5e, nao binario) | Dropdown 0-6 no ConditionBadges em vez de toggle. |
| Join com `auth.users` via PostgREST (impossivel) | Usar tabela `users` (schema public) ou view publica para nome de display. |
| Tabela `sessions` vs `combat_sessions` | O banco usa `sessions` (migration 002). Queries devem referenciar `sessions`, nao `combat_sessions`. |

---

## 7. Principios Imutaveis

1. **Anti-metagaming** — jogador NUNCA ve HP, AC ou DC de monstros
2. **Mobile-first** — toda interacao pensada para toque com uma mao
3. **Complementar, nao substituir** — PocketDM ajuda o papel, nao compete
4. **Bolinhas para tudo volatil** — qualquer recurso com X usos usa o componente generico de dots (fallback numerico para > 20)
5. **Imagem da campanha sempre visivel** — o DM define a arte, o jogador vive nela
6. **Tudo opcional** — nenhum campo obrigatorio alem de nome do personagem (exceto `ac` e `max_hp` que sao NOT NULL no schema original)
7. **Paridade de acesso** — DM ve tudo da campanha (incluindo sheets), jogador ve so o seu
8. **Privacidade do journal** — DM NAO tem acesso a notas privadas do jogador (RLS enforced)

---

## 8. Acessibilidade e i18n

- Todas as strings em `messages/pt-BR.json` e `messages/en.json` no namespace `player_hq.*`
  - `player_hq.dashboard.*` — strings do dashboard
  - `player_hq.sheet.*` — strings da character sheet
  - `player_hq.resources.*` — strings de resource trackers
  - `player_hq.inventory.*` — strings da Bag of Holding
  - `player_hq.notes.*` — strings de notas
  - `player_hq.quests.*` — strings do quest board
- Todos os elementos interativos com `aria-label` descritivo
- Navegacao por teclado suportada no desktop
- Contraste minimo 4.5:1 em todos os estados de cor

---

## 9. Notas de Paridade (Guest / Anon / Auth)

| Feature | Guest (`/try`) | Anonimo (`/join`) | Autenticado |
|---|---|---|---|
| Player Home | NAO — DM-only | NAO | SIM |
| Bag of Holding | NAO | NAO | SIM (por campanha) |
| Resource Trackers | NAO | NAO | SIM |
| Character Sheet | NAO | NAO | SIM |
| Notas Privadas | NAO | NAO | SIM |
| Quest Board | Ver quests da sessao | Ver quests da sessao | Ver + notas + favoritos |

Todas as features deste epic sao **Auth-only** — requerem conta e membership em campanha.
