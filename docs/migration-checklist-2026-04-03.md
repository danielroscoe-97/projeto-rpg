# Migration Checklist — 2026-04-03

> Todas as migrations abaixo foram commitadas hoje (2026-04-03).
> **ACAO NECESSARIA:** Verificar no Supabase Dashboard (SQL Editor) se cada tabela/coluna existe.
> Supabase project: `tsjmonpipobigvqeuugi` (referencia: [project_supabase.md](../C:\Users\dani_\.claude\projects\c--Users-dani--Downloads-projeto-rpg\memory\project_supabase.md))

---

## Como Verificar

No Supabase Dashboard → SQL Editor, rodar:

```sql
-- Verificar todas as tabelas novas de uma vez
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'character_resource_trackers',
    'content_whitelist',
    'content_agreements',
    'encounter_votes',
    'player_journal_entries',
    'player_npc_notes',
    'character_spells',
    'party_inventory_items',
    'inventory_removal_requests',
    'player_notifications',
    'player_quest_notes'
  )
ORDER BY table_name;

-- Verificar colunas novas em tabelas existentes
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'campaigns'
  AND column_name = 'cover_image_url';

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'player_characters'
  AND column_name IN ('inspiration', 'speed', 'strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma', 'exhaustion_level');

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'sessions'
  AND column_name IN ('dm_last_seen_at', 'state_version');
```

---

## Checklist por Migration

| # | Migration | Tabela/Coluna | Verificar | Status |
|---|-----------|---------------|-----------|--------|
| 054 | spell_slots_column | `player_characters.spell_slots` (JSONB) | `SELECT column_name FROM information_schema.columns WHERE table_name='player_characters' AND column_name='spell_slots'` | [ ] |
| 055 | campaign_quests | `campaign_quests` table | Ver query acima | [ ] |
| 056 | campaign_cover_and_character_extended | `campaigns.cover_image_url` + 9 colunas em `player_characters` | Ver queries acima | [ ] |
| 057 | character_resource_trackers | `character_resource_trackers` table | Ver query acima | [ ] |
| 058 | content_whitelist | `content_whitelist` table | Ver query acima | [ ] |
| 059 | content_agreements | `content_agreements` table | Ver query acima | [ ] |
| 060 | encounter_votes | `encounter_votes` table | Ver query acima | [ ] |
| 063 | player_journal | `player_journal_entries` table | Ver query acima | [ ] |
| 064 | player_npc_notes | `player_npc_notes` table | Ver query acima | [ ] |
| 065 | character_spells | `character_spells` table | Ver query acima | [ ] |
| 066 | party_inventory | `party_inventory_items` table | Ver query acima | [ ] |
| 067 | inventory_removal_requests | `inventory_removal_requests` table | Ver query acima | [ ] |
| 068 | player_notifications | `player_notifications` table + trigger | Ver query acima | [ ] |
| 069 | player_quest_notes | `player_quest_notes` table | Ver query acima | [ ] |
| 070 | reconcile_combat_state | `sessions.state_version`, `sessions.dm_last_seen_at` | Ver query acima | [ ] |
| 071 | dm_heartbeat | Func `reconcile_combat_state()` | `SELECT proname FROM pg_proc WHERE proname='reconcile_combat_state'` | [ ] |
| 072 | reconcile_force_delete | Func update | Mesma query acima | [ ] |

---

## Se Alguma NAO Estiver Aplicada

Copiar o conteudo do arquivo `.sql` correspondente e rodar no SQL Editor do Supabase Dashboard.
Ordem importa — aplicar em sequencia numerica.

**Migrations que criam tabelas (seguro rodar a qualquer momento):**
054, 055, 056, 057, 058, 059, 060, 063, 064, 065, 066, 067, 068, 069

**Migrations que alteram tabelas existentes (cuidado com conflitos):**
070, 071, 072

---

> **Criado:** 2026-04-03
> **Responsavel:** Dani_
