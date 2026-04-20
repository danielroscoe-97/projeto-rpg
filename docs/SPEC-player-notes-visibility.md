# SPEC — Notas Jogador↔Mestre com Visibilidade

> **Status:** Pronto para implementação
> **Origem:** Beta test F01 + F02 (Onda 4, `docs/ROADMAP-pos-linguagem-ubiqua.md` §ONDA 4)
> **Gap referido:** #7 do roadmap (`Spec notas mestre↔jogador com visibilidade`)
> **Data:** 2026-04-19

---

## 1. Problema

Beta tester (2026-04-16) apontou duas lacunas:

- **F01:** O mestre NÃO consegue acessar as notas dos jogadores. Hoje `player_journal_entries` (migração 063) tem RLS `owner_only` — DM não tem SELECT. O mestre não consegue acompanhar anotações da ficha do jogador nem colaborar via ficha.
- **F02:** Não existe canal de nota "privada mestre↔jogador específico". `campaign_notes.is_shared` (migração 042) só distingue `true` (todos os membros) vs `false` (só DM). Não há direcionamento a um jogador único.

**Observação sobre nomenclatura:** O doc beta diz "tabela `player_notes` já existe". A tabela real chama-se `player_journal_entries`. Manteremos o nome existente — NÃO renomear (Combat Parity / migração grande desnecessária). O spec estende `player_journal_entries` e ajusta `campaign_notes` com um campo de target opcional.

---

## 2. Modelo de visibilidade proposto

### 2.1 Níveis

| Valor | Semântica | Tabela onde vive |
|---|---|---|
| `private` | Só o autor vê (default para entradas existentes) | `player_journal_entries` |
| `shared_with_dm` | Autor (jogador) + DM da campanha | `player_journal_entries` |
| `dm_private_to_player` | Autor (DM) + jogador dono do `target_character_id` | `campaign_notes` (novo fluxo DM→player) |
| `campaign_public` | Todos membros ativos da campanha (equivalente ao `is_shared=true` atual de `campaign_notes`) | `campaign_notes` |

**Rejeitado:** adicionar `dm_private_to_player` em `player_journal_entries`. Motivo: o autor passaria a ser o DM, não o jogador, invalidando a invariante `player_character_id.user_id = auth.uid()`. Separar em tabela própria (`campaign_notes` com `target_character_id`) mantém RLS limpo por autor.

**Deprecação planejada:** `campaign_notes.is_shared` é absorvido pelo `visibility` novo (backfill: `true → campaign_public`, `false → private`). Coluna mantida por compatibilidade até Onda 6.

### 2.2 Campos

**`player_journal_entries`** (acréscimos):
- `visibility TEXT NOT NULL DEFAULT 'private'` — `CHECK (visibility IN ('private','shared_with_dm'))`

**`campaign_notes`** (acréscimos):
- `visibility TEXT NOT NULL DEFAULT 'campaign_public'` — `CHECK (visibility IN ('private','campaign_public','dm_private_to_player'))`
- `target_character_id UUID REFERENCES player_characters(id) ON DELETE CASCADE`
- `CHECK ((visibility = 'dm_private_to_player' AND target_character_id IS NOT NULL) OR (visibility <> 'dm_private_to_player' AND target_character_id IS NULL))`

### 2.3 Invariantes de RLS

- DM = `campaigns.owner_id = auth.uid()` (fonte canônica; `campaign_members.role='dm'` é espelho).
- Jogador-alvo = `player_characters.user_id = auth.uid()` AND `id = campaign_notes.target_character_id`.
- `is_campaign_member(campaign_id)` existe (migração 052) e é `SECURITY DEFINER STABLE`.

---

## 3. Migração SQL

**Arquivo:** `supabase/migrations/142_player_notes_visibility.sql`

```sql
-- ============================================================================
-- Migration 142: Player ↔ DM notes visibility
-- Adds `visibility` to player_journal_entries (default 'private').
-- Adds `visibility` + `target_character_id` to campaign_notes for DM→player
-- targeted notes. Expands RLS so DM reads `shared_with_dm` entries and
-- targeted player reads `dm_private_to_player` entries.
-- ============================================================================

-- 1. player_journal_entries.visibility ---------------------------------------
ALTER TABLE player_journal_entries
  ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'private';

ALTER TABLE player_journal_entries
  DROP CONSTRAINT IF EXISTS player_journal_entries_visibility_check;

ALTER TABLE player_journal_entries
  ADD CONSTRAINT player_journal_entries_visibility_check
  CHECK (visibility IN ('private', 'shared_with_dm'));

CREATE INDEX IF NOT EXISTS idx_journal_campaign_visibility
  ON player_journal_entries (campaign_id, visibility);

-- 2. campaign_notes.visibility + target_character_id -------------------------
ALTER TABLE campaign_notes
  ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'campaign_public';

ALTER TABLE campaign_notes
  ADD COLUMN IF NOT EXISTS target_character_id UUID
  REFERENCES player_characters(id) ON DELETE CASCADE;

-- Backfill from legacy is_shared (migration 042) -----------------------------
UPDATE campaign_notes
   SET visibility = CASE WHEN is_shared THEN 'campaign_public' ELSE 'private' END
 WHERE visibility = 'campaign_public';

ALTER TABLE campaign_notes
  DROP CONSTRAINT IF EXISTS campaign_notes_visibility_check;

ALTER TABLE campaign_notes
  ADD CONSTRAINT campaign_notes_visibility_check
  CHECK (visibility IN ('private', 'campaign_public', 'dm_private_to_player'));

ALTER TABLE campaign_notes
  DROP CONSTRAINT IF EXISTS campaign_notes_target_check;

ALTER TABLE campaign_notes
  ADD CONSTRAINT campaign_notes_target_check
  CHECK (
    (visibility = 'dm_private_to_player' AND target_character_id IS NOT NULL)
    OR (visibility <> 'dm_private_to_player' AND target_character_id IS NULL)
  );

CREATE INDEX IF NOT EXISTS idx_campaign_notes_target
  ON campaign_notes (target_character_id)
  WHERE target_character_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_campaign_notes_campaign_visibility
  ON campaign_notes (campaign_id, visibility);

-- 3. RLS — player_journal_entries -------------------------------------------
DROP POLICY IF EXISTS journal_owner_only ON player_journal_entries;

DROP POLICY IF EXISTS journal_author_select ON player_journal_entries;
CREATE POLICY journal_author_select ON player_journal_entries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM player_characters
      WHERE id = player_journal_entries.player_character_id
        AND user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS journal_dm_select_shared ON player_journal_entries;
CREATE POLICY journal_dm_select_shared ON player_journal_entries
  FOR SELECT USING (
    visibility = 'shared_with_dm'
    AND EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = player_journal_entries.campaign_id
        AND campaigns.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS journal_author_insert ON player_journal_entries;
CREATE POLICY journal_author_insert ON player_journal_entries
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM player_characters
      WHERE id = player_journal_entries.player_character_id
        AND user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS journal_author_update ON player_journal_entries;
CREATE POLICY journal_author_update ON player_journal_entries
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM player_characters
      WHERE id = player_journal_entries.player_character_id
        AND user_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM player_characters
      WHERE id = player_journal_entries.player_character_id
        AND user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS journal_author_delete ON player_journal_entries;
CREATE POLICY journal_author_delete ON player_journal_entries
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM player_characters
      WHERE id = player_journal_entries.player_character_id
        AND user_id = auth.uid()
    )
  );

-- 4. RLS — campaign_notes (add targeted-player read) ------------------------
DROP POLICY IF EXISTS campaign_notes_target_player_select ON campaign_notes;
CREATE POLICY campaign_notes_target_player_select ON campaign_notes
  FOR SELECT USING (
    visibility = 'dm_private_to_player'
    AND target_character_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM player_characters
      WHERE id = campaign_notes.target_character_id
        AND user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "campaign_notes_shared_read" ON campaign_notes;
CREATE POLICY "campaign_notes_shared_read" ON campaign_notes
  FOR SELECT USING (
    (is_shared = true OR visibility = 'campaign_public')
    AND public.is_campaign_member(campaign_id)
  );
```

### 3.1 Backfill

- `player_journal_entries` existentes → `visibility='private'` (DEFAULT da coluna). Nenhuma nota antiga vaza.
- `campaign_notes` existentes → `visibility` derivado de `is_shared` (ver UPDATE acima). Comportamento atual preservado.

### 3.2 Reversibilidade

- `DROP COLUMN visibility` + `DROP COLUMN target_character_id` + restaurar policy `journal_owner_only` único. Scriptável em `142_rollback.sql` se necessário (não obrigatório para o merge, mas deixar o SQL documentado no PR).

---

## 4. UX / fluxos

### 4.1 Jogador cria nota (Player HQ)

- Campo padrão: `visibility = 'private'`
- Novo toggle visual no `QuickNotesList` / `JournalEntryCard`: ícone **Lock** (privado) ↔ ícone **Eye** (compartilhado com DM), com label `Compartilhar com mestre`.
- Ao togglar ON, badge persistente inline na nota: "Visível ao mestre".
- Strings em `messages/{en,pt}.json` em `player_hq.notes.visibility_*`.

### 4.2 Mestre vê notas dos jogadores (Campaign HQ)

- Nova seção dentro do tab `players` (ver `CampaignNavBar`) ou sub-view `players?view=notes`.
- Listagem agrupada por `player_character.name`.
- Filtro: `Jogador X | Todos`.
- Entradas visíveis: `player_journal_entries.visibility = 'shared_with_dm'` (via RLS `journal_dm_select_shared`) + entradas `campaign_notes.visibility = 'dm_private_to_player'` do próprio DM para cada jogador.
- **Somente leitura** sobre notas do jogador. DM não edita `player_journal_entries` alheio.

### 4.3 Mestre cria nota privada para jogador (DM→Player)

- CTA: `Nova nota privada para X` no painel de um `player_character`.
- Form: `title`, `content`, `target_character_id` (obrigatório), `visibility = 'dm_private_to_player'` (fixo).
- Grava em `campaign_notes` (autor = DM via `user_id = auth.uid()`).
- Validação cliente + constraint CHECK no banco.

### 4.4 Jogador vê notas recebidas do DM

- Novo sub-tab em `PlayerNotesSection` → `Do mestre` (ícone `Scroll`).
- Query: `campaign_notes` onde `target_character_id = player_character.id` AND `visibility='dm_private_to_player'` (RLS cobre).
- Read-only. Badge `Do mestre`.
- Notificação opcional (fora deste spec) via `player_notifications` em migração posterior.

---

## 5. Componentes a criar / modificar

### Criar

- `components/campaign/PlayerNotesInspector.tsx` — view do DM listando `shared_with_dm` + `dm_private_to_player` agrupadas por `player_character`.
- `components/campaign/DmPrivateNoteForm.tsx` — form para criar nota `dm_private_to_player` com seletor de `target_character_id`.
- `components/player-hq/DmNotesInbox.tsx` — lista read-only das notas que o DM mandou a este personagem.
- `lib/hooks/useDmPlayerNotes.ts` (DM side) — SELECT união de `player_journal_entries` shared_with_dm + `campaign_notes` dm_private_to_player.
- `lib/hooks/useDmInboxNotes.ts` (player side) — SELECT `campaign_notes` dm_private_to_player para meu character.
- `lib/supabase/player-notes-visibility.ts` — helper `updateNoteVisibility(id, visibility)`.

### Modificar

- `components/player-hq/PlayerNotesSection.tsx` — adicionar sub-tab `Do mestre` (renderiza `DmNotesInbox`); remover/ajustar `privacy_notice` (já não é "privado" absoluto).
- `components/player-hq/QuickNotesList.tsx` — toggle `Compartilhar com mestre` por nota; chamar `updateNoteVisibility`.
- `components/player-hq/JournalEntryCard.tsx` — idem toggle.
- `lib/hooks/usePlayerNotes.ts` — expor `updateEntry({ visibility })`; incluir `visibility` em `JournalEntry` type.
- `lib/types/database.ts` — regenerar tipos (`JournalEntry.visibility`, `CampaignNote.visibility`, `CampaignNote.target_character_id`).
- `components/campaign/CampaignNotes.tsx` — aceitar `visibility` e exibir selector `private | campaign_public | dm_private_to_player` (quando último, obriga `target_character_id`).
- `components/player/PlayerSharedNotes.tsx` — trocar filtro `.eq("is_shared", true)` por `.eq("visibility","campaign_public")` OU aceitar ambos durante transição.
- `messages/{en,pt}.json` — chaves i18n novas: `notes.visibility.private`, `notes.visibility.shared_with_dm`, `notes.visibility.dm_private_to_player`, `notes.visibility.campaign_public`, `campaign.players.notes_tab`, `player_hq.notes.tab_dm_inbox`.

---

## 6. Critérios de aceitação

- [ ] Migração 142 aplica sem erro em banco com dados existentes (smoke em preview deploy).
- [ ] Todas `player_journal_entries` pré-existentes retornam `visibility='private'` e só o autor consegue `SELECT` (validar via `supabase sql` autenticado como outro user).
- [ ] Todas `campaign_notes` pré-existentes retornam `visibility` consistente com `is_shared` anterior; nenhum membro perde nem ganha acesso.
- [ ] Jogador alterna visibilidade de uma nota para `shared_with_dm` → DM lê no Campaign HQ.
- [ ] DM cria nota `dm_private_to_player` para jogador X → apenas o jogador X (e o DM autor) consegue `SELECT`; outros jogadores da mesma campanha NÃO leem.
- [ ] Constraint CHECK bloqueia INSERT com `visibility='dm_private_to_player'` e `target_character_id=NULL` (smoke em Postgres).
- [ ] Build limpo (`rtk tsc`), testes unit+e2e passando (`rtk vitest`, `rtk playwright`).
- [ ] i18n: nenhuma chave faltando em `pt` ou `en`.

### 6.1 Testes de RLS explícitos (adicionar em `scripts/audit-rls.ts` ou `tests/rls/*.sql`)

1. Autor lê própria nota `private` — ✅ retorna.
2. Autor lê própria nota `shared_with_dm` — ✅.
3. DM da campanha lê `shared_with_dm` do jogador — ✅.
4. DM da campanha lê `private` do jogador — ❌ 0 rows (vazamento = FALHA crítica).
5. Outro jogador da campanha lê `shared_with_dm` de outro jogador — ❌ 0 rows.
6. DM não-autor (outra campanha) lê `shared_with_dm` — ❌ 0 rows.
7. Jogador-alvo lê `dm_private_to_player` direcionada a ele — ✅.
8. Jogador não-alvo (mesma campanha) lê `dm_private_to_player` — ❌ 0 rows.
9. Anon/guest lê qualquer nota — ❌ 0 rows (todas as policies exigem `auth.uid()`).
10. Jogador tenta UPDATE `player_journal_entries` de outro jogador — ❌ rejeitado.

Cada teste é uma linha em `pg_test` SQL ou função `rpc` que valida com contas de teste seed. Não merge sem os 10 verdes.

---

## 7. Riscos

- **RLS mal escrita vaza `private`:** mitigar com 10 testes de RLS acima, rodados em CI via `scripts/audit-rls.ts`.
- **`SECURITY DEFINER` em `is_campaign_member` — não usada diretamente nas novas policies** (policies olham `campaigns.owner_id` e `player_characters.user_id` diretamente). Reduz superfície.
- **Duplicação temporária `is_shared` vs `visibility`:** manter ambos até Onda 6; remover `is_shared` em migração de limpeza separada.
- **Performance:** índice composto `(campaign_id, visibility)` e `(target_character_id)` WHERE NOT NULL — cobre queries típicas.
- **Combat Parity:** feature é Auth-only, nenhum código adicionado em rotas guest/anon. `PlayerSharedNotes` já exige `campaignId` autenticado.

---

## 8. Fora de escopo

- Notas linkadas a NPC/Local/Facção (F24/F26) — **Entity Graph** (Onda 3, PRD separado).
- Notificação in-app quando DM envia nota nova a um jogador (push/toast) — migração posterior (`player_notifications` já existe em 068, integração em ticket dedicado).
- Editor rico / markdown nas notas.
- Compartilhamento jogador→jogador (sempre passa pelo DM).
- Migração de `player_characters.dm_notes` (free-text legacy do DM sobre o PC) para `campaign_notes` — pode virar task futura; por ora mantido independente.

---

## 9. Plano de execução (sequência)

1. **PR 1 — Migration 142** (SQL puro + 10 testes RLS). Merge sozinho para reduzir blast radius.
2. **PR 2 — Types + hooks:** regenerar `lib/types/database.ts`, criar `useDmPlayerNotes`, `useDmInboxNotes`, `updateNoteVisibility`.
3. **PR 3 — UI Player HQ:** toggle visibility + tab `Do mestre`.
4. **PR 4 — UI Campaign HQ:** Player Notes Inspector + DM Private Note Form.
5. **PR 5 — Cleanup:** deprecation-log de `campaign_notes.is_shared` (drop agendado para Onda 6).

Comandos RTK:
- `rtk tsc --noEmit`
- `rtk vitest run`
- `rtk playwright test --grep "notes visibility"`
- `rtk supabase db reset` (local) e `rtk supabase migration up` (preview).
