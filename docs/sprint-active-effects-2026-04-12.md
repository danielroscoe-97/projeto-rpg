# Sprint: Active Effects & Consumable Tracker

**Data:** 2026-04-12
**Epic:** Spell Duration Tracker + Consumable Counter
**Status:** IMPLEMENTADO + MIGRATION APLICADA + CODE REVIEW DONE + COMBAT INTEGRATION DONE

---

## Contexto

DMs e players perdem o controle de magias ativas (Aid, Death Ward, Haste, Gift of Alacrity) e consumiveis (Goodberries) entre sessoes. Nao havia forma de persistir "o que esta ativo no meu personagem" — todos dependiam de memoria ou Discord.

**Decisao de design**: Duracao e tempo in-game (narrativo), nao tempo real. O app mostra duracao como referencia visual ("8 hours") mas expiracao e sempre **dismiss manual** — o DM controla o tempo narrativo, nao o relogio.

---

## Escopo Implementado

### 1. Supabase Migration (134)

- **Tabela:** `character_active_effects`
- **Campos:** name, effect_type (spell/consumable/potion/item/other), spell_level, is_concentration, duration_minutes (referencia in-game), quantity (para consumiveis), notes, source, cast_by, is_active, dismissed_at
- **RLS:** Owner (player edita os proprios) + DM (edita todos da campanha)
- **Index:** Partial index em `(player_character_id, is_active) WHERE is_active = true`

### 2. TypeScript Types

- **Arquivo:** `lib/types/database.ts`
- **Types:** `ActiveEffect`, `ActiveEffectInsert`, `ActiveEffectUpdate`, `EffectType`

### 3. React Hook: useActiveEffects

- **Arquivo:** `lib/hooks/useActiveEffects.ts`
- **Pattern:** Identico a `useCharacterAbilities` (optimistic updates, rollback on error, dedup)
- **Metodos:** addEffect, updateEffect, decrementQuantity, incrementQuantity, dismissEffect, dismissAll, getConcentrationConflict

### 4. Player HQ — Active Effects Panel

| Componente | Arquivo | Funcao |
|---|---|---|
| `ActiveEffectCard` | `components/player-hq/ActiveEffectCard.tsx` | Card individual com dismiss, notes inline, +/- consumivel |
| `AddActiveEffectDialog` | `components/player-hq/AddActiveEffectDialog.tsx` | Dialog de adicao com presets de duracao, tipo, concentracao |
| `ActiveEffectsPanel` | `components/player-hq/ActiveEffectsPanel.tsx` | Container com header, lista agrupada (concentration first), empty state |

**Integracao:** Inserido em `PlayerHqShell.tsx` na tab Resources, entre SpellSlotsHq e ResourceTrackerList.

### 5. DM Campaign Home — Consolidated View

| Componente | Arquivo | Funcao |
|---|---|---|
| `CampaignActiveEffects` | `components/campaign/CampaignActiveEffects.tsx` | Painel consolidado: todos os players + seus efeitos ativos como chips |

**Integracao:** Inserido em `CampaignHero.tsx` apos CampaignStatusCards. Oculto quando nenhum personagem tem efeitos ativos.

### 6. i18n

- EN + PT-BR completos
- Namespaces: `player_hq.active_effects` + `campaign.active_effects`

---

## Arquivos Criados

| Arquivo | LOC |
|---|---|
| `supabase/migrations/134_character_active_effects.sql` | ~50 |
| `lib/hooks/useActiveEffects.ts` | ~160 |
| `components/player-hq/ActiveEffectCard.tsx` | ~180 |
| `components/player-hq/AddActiveEffectDialog.tsx` | ~220 |
| `components/player-hq/ActiveEffectsPanel.tsx` | ~120 |
| `components/campaign/CampaignActiveEffects.tsx` | ~190 |

## Arquivos Modificados

| Arquivo | Mudanca |
|---|---|
| `lib/types/database.ts` | Tabela + aliases |
| `components/player-hq/PlayerHqShell.tsx` | Hook + panel na tab Resources |
| `app/app/campaigns/[id]/CampaignHero.tsx` | Import + render consolidated view |
| `messages/en.json` | +30 keys |
| `messages/pt-BR.json` | +30 keys |

---

## Verificacao

- [x] `tsc --noEmit` — zero errors
- [ ] Migration aplicada no Supabase remoto (`npx supabase db push`)
- [ ] Player HQ → Resources → panel renderiza empty state
- [ ] Adicionar spell (Aid, 8h) → aparece com badge de duracao
- [ ] Adicionar concentration (Haste) → badge amber "Concentration"
- [ ] Adicionar segunda concentration → warning de conflito
- [ ] Consumivel (Goodberries x10) → botoes +/- funcionam, auto-dismiss em 0
- [ ] Dismiss → efeito some
- [ ] DM campaign home → painel consolidado mostra efeitos de todos os players
- [ ] DM dismiss da campaign view → funciona

---

## Design Decisions

| Decisao | Escolha | Motivo |
|---|---|---|
| Tempo | In-game, nao real | DM controla narrativa |
| Expiracao | Manual dismiss | Impossivel calcular automaticamente |
| `created_at` | Timestamp real | Auditoria/controle apenas |
| `duration_minutes` | Referencia visual | "Essa magia dura 8h" como lembrete |
| Contexto temporal | Campo `notes` livre | v1 simples, flexivel |
| Consumiveis | `quantity` + decrement | Goodberries, pocoes, etc. |
| Concentration | Warning no client | Nao enforcement no banco |
| Soft delete | `is_active` + `dismissed_at` | Manter historico |

---

## Wave 2: Code Review Fixes + Combat Integration (mesma sessao)

### Code Review Fixes (6 findings corrigidos)

| # | Severidade | Finding | Fix |
|---|---|---|---|
| #1 | CRITICAL | Stale closure `decrementQuantity` → `dismissEffect` | Reordenei funcoes + adicionei ao deps array |
| #3 | IMPORTANT | `spell_level` i18n mostrava literal `{level}` | Mudei para "Spell Level" / "Nivel da Magia" |
| #7 | IMPORTANT | `characters` prop causava re-fetch infinito no DM view | Derivei `charIdKey` string estavel |
| #17 | IMPORTANT | Dismiss button 32px (abaixo do minimo mobile) | Aumentei para 44px |
| #18+19 | IMPORTANT | DM dismiss invisivel em mobile (hover-only) | `opacity-100 sm:opacity-0` pattern |
| P1 | BMAD | Long Rest nao limpava active effects | Wirei `dismissAll` no `RestResetPanel` |

### Combat Integration

| Item | Arquivo | Descricao |
|---|---|---|
| `ActiveEffectsBadges` | `components/player/ActiveEffectsBadges.tsx` | Read-only badges durante combate |
| `PlayerInitiativeBoard` | Modificado | Prop `characterId`, render badges apos SpellSlotTracker |
| `PlayerJoinClient` | Modificado | Passa `characterId` resolvido de `prefilledCharacters` |

### Realtime Subscription

| Item | Descricao |
|---|---|
| `useActiveEffects.ts` | Supabase channel `postgres_changes` em `character_active_effects` |
| Eventos | INSERT (adiciona), UPDATE (atualiza ou dismiss remoto), DELETE (remove) |
| Beneficio | DM muda efeito → player ve em tempo real, e vice-versa |

### Rest System Integration

| Item | Descricao |
|---|---|
| `RestResetPanel.tsx` | Props `onDismissAllEffects` + `activeEffectCount` adicionados |
| Long Rest | Dismiss all active effects automaticamente (com count no badge) |

### Arquivos adicionais criados/modificados nesta wave

| Arquivo | Mudanca |
|---|---|
| `components/player/ActiveEffectsBadges.tsx` | CRIADO — read-only combat display |
| `lib/hooks/useActiveEffects.ts` | Realtime subscription adicionada |
| `components/player-hq/RestResetPanel.tsx` | Props + wire dismissAll no long rest |
| `components/player-hq/PlayerHqShell.tsx` | Passa dismissAll + count pro RestResetPanel |
| `components/player/PlayerInitiativeBoard.tsx` | Prop characterId + render ActiveEffectsBadges |
| `components/player/PlayerJoinClient.tsx` | Passa characterId resolvido |
| `components/player-hq/ActiveEffectCard.tsx` | Touch target 32→44px |
| `components/campaign/CampaignActiveEffects.tsx` | Stable dep + mobile dismiss visibility |
| `messages/en.json` | spell_level fix |
| `messages/pt-BR.json` | spell_level fix |
