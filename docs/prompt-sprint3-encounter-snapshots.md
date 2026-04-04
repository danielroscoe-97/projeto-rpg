# Prompt — Sprint 3: Encounter Snapshots + DM Post-Combat Feedback

## Contexto

Estamos implementando o Encounter Builder logado (epic: `docs/epic-encounter-builder-logado.md`). A Sprint 1 (builder + presets) e Sprint 2 (staging + iniciar combate) estao sendo feitas em paralelo. Esta Sprint 3 implementa a **coleta de dados pos-combate** — snapshots automaticos e feedback do DM.

**IMPORTANTE**: Esta sprint e parcialmente independente das Sprints 1/2. A unica dependencia e o `preset_origin_id` FK que referencia `encounter_presets` (criada na migration 091). A migration 091 ja existe em `supabase/migrations/091_encounter_presets.sql`.

## O que implementar

### 1. Migration `092_encounter_snapshots.sql`

Criar em `supabase/migrations/092_encounter_snapshots.sql`:

```sql
ALTER TABLE encounters
  ADD COLUMN IF NOT EXISTS dm_difficulty_rating SMALLINT
    CHECK (dm_difficulty_rating IS NULL OR dm_difficulty_rating BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS dm_notes TEXT,
  ADD COLUMN IF NOT EXISTS party_snapshot JSONB,
  ADD COLUMN IF NOT EXISTS creatures_snapshot JSONB,
  ADD COLUMN IF NOT EXISTS combat_result TEXT
    CHECK (combat_result IS NULL OR combat_result IN ('victory','tpk','fled','dm_ended')),
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ended_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS preset_origin_id UUID REFERENCES encounter_presets(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS was_modified_from_preset BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_manual_creatures BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_unknown_cr BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_incomplete_party BOOLEAN DEFAULT false;
```

### 2. Data layer `lib/supabase/encounter-snapshot.ts`

Criar com duas funcoes:

```typescript
persistEncounterSnapshot(encounterId, snapshotData) // fire-and-forget no end combat
persistDmFeedback(encounterId, rating, notes) // chamado pelo DM feedback component
```

**party_snapshot** JSONB: `[{member_id, name, level, class, race}]`
**creatures_snapshot** JSONB: `[{name, cr, slug, source, quantity, was_defeated}]`
**combat_result**: detectar automaticamente:
- Todos os monstros derrotados (is_defeated && !is_player) = 'victory'
- Todos os PCs derrotados (is_defeated && is_player) = 'tpk'
- Senao = 'dm_ended'

**Data quality flags**:
- `has_manual_creatures`: algum combatant nao-player sem monster_id
- `has_unknown_cr`: algum monstro sem CR mapeavel
- `has_incomplete_party`: algum player sem classe ou nivel

### 3. Componente `DmPostCombatFeedback.tsx`

Criar em `components/combat/DmPostCombatFeedback.tsx`:

**UI**:
- 5 botoes de dificuldade (1-5) usando os mesmos icones/cores do `DifficultyPoll.tsx` (arquivo em `components/combat/DifficultyPoll.tsx`)
- Textarea opcional para notas do DM
- Botoes "Salvar" e "Pular"

**Props**:
```typescript
interface DmPostCombatFeedbackProps {
  encounterId: string;
  onSubmit: (rating: number, notes: string) => void;
  onSkip: () => void;
}
```

**i18n**: usar namespace `"combat"` com chaves novas:
- `dm_feedback_title`: "How was this encounter?" / "Como foi esse encontro?"
- `dm_feedback_subtitle`: "Your feedback as DM" / "Seu feedback como Mestre"
- `dm_feedback_notes_placeholder`: "Optional notes..." / "Notas opcionais..."
- `dm_feedback_save`: "Save" / "Salvar"
- `dm_feedback_skip`: "Skip" / "Pular"

### 4. Integrar no post-combat flow

**Arquivo principal**: `components/session/CombatSessionClient.tsx`

**State machine atual** (em `useCombatActions.ts` e CombatSessionClient):
```
leaderboard -> poll -> result -> dismiss
```

**Novo flow**:
```
leaderboard -> dm_feedback -> poll -> result -> dismiss
```

**Onde integrar o snapshot automatico**:
Em `proceedAfterNaming()` (hook `useCombatActions.ts`, ~linha 167), APOS o encounter name ser definido e ANTES do broadcast:

1. Montar `partySnapshot` dos combatants onde `is_player === true`
2. Montar `creaturesSnapshot` dos combatants onde `is_player === false`, agrupados por nome base
3. Detectar `combatResult` dos estados de is_defeated
4. Calcular data quality flags
5. Chamar `persistEncounterSnapshot()` fire-and-forget (nao bloquear o flow)

**Onde integrar o DM feedback**:
Na renderizacao do CombatSessionClient, adicionar nova phase `"dm_feedback"`:
- Apos leaderboard fechar, ir pra `dm_feedback` em vez de `poll`
- Renderizar `<DmPostCombatFeedback>` quando `postCombatPhase === "dm_feedback"`
- onSubmit: chamar `persistDmFeedback()` + avancar pra `"poll"`
- onSkip: avancar direto pra `"poll"`
- Players continuam vendo `DifficultyPoll` normalmente (broadcast paralelo)

### 5. Atualizar types

Em `lib/types/database.ts`, adicionar os novos campos ao tipo Encounter (se existir tipagem explicita).

### 6. i18n

Adicionar chaves em `messages/en.json` e `messages/pt-BR.json` no namespace `"combat"`.

## Arquivos de referencia

| Arquivo | O que ver |
|---------|-----------|
| `components/combat/DifficultyPoll.tsx` | Icones e cores dos 5 niveis de dificuldade |
| `components/combat/PollResult.tsx` | Pattern de resultado de votacao |
| `components/session/CombatSessionClient.tsx` | Post-combat state machine e rendering |
| `lib/hooks/useCombatActions.ts` | `proceedAfterNaming()`, `handleEndEncounter()` |
| `lib/types/combat.ts` | Interface `Combatant` com is_player, is_defeated, monster_id |
| `lib/supabase/session.ts` | `persistEndEncounter()` pattern |
| `supabase/migrations/051_add_difficulty_poll.sql` | Pattern de ALTER TABLE em encounters |
| `supabase/migrations/091_encounter_presets.sql` | Tabela encounter_presets (FK target) |

## Verificacao

1. Iniciar e encerrar um combate. Verificar que `party_snapshot` e `creatures_snapshot` estao populados na row de encounters.
2. `combat_result` detectado corretamente (derrotar todos monstros = 'victory').
3. Tela de DM feedback aparece apos leaderboard.
4. Submeter rating 4 + notas. Verificar `dm_difficulty_rating` e `dm_notes` persistidos.
5. Clicar "Pular". Verificar que snapshot foi capturado mesmo sem feedback.
6. Flow existente (player poll, leaderboard, report sharing) continua funcionando.
7. Build passa sem erros: `rtk next build`

## NAO fazer

- NAO implementar a metodologia Pocket DM (F-06)
- NAO criar tabela separada `encounter_snapshots` — estender a tabela `encounters` existente
- NAO quebrar o flow existente de votacao dos jogadores
- NAO tornar o feedback do DM obrigatorio — e bonus opcional
