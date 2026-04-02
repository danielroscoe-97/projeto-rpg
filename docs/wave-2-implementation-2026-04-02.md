# Wave 2 — Implementação (2026-04-02)

> Sprint focado nas duas stories de Wave 2 (médio) que requerem tocar broadcast/types.
> Referência: [backlog-beta-test-2026-04-02.md](backlog-beta-test-2026-04-02.md)

---

## W2.1 — B.08 HP Percentage Display ✅ CONCLUÍDO

**Estimativa original:** ~3h
**Tempo real:** ~30min (pipeline já estava 90% pronto)

### Diagnóstico

O pipeline ponta-a-ponta já existia, mas havia um bug silencioso no store update:

| Camada | Arquivo | Status antes | Status depois |
|--------|---------|-------------|---------------|
| Cálculo | `lib/utils/hp-status.ts:getHpPercentage` | ✅ Existia | ✅ Inalterado |
| Sanitização broadcast | `lib/realtime/broadcast.ts:sanitizeCombatant` | ✅ Incluía `hp_percentage` | ✅ Inalterado |
| Tipo | `lib/types/realtime.ts:SanitizedMonsterHpUpdate` | ✅ Campo tipado | ✅ Inalterado |
| **Store update** | **`components/player/PlayerJoinClient.tsx:737`** | **❌ Não propagava `hp_percentage`** | **✅ Corrigido** |
| Display | `components/player/PlayerInitiativeBoard.tsx:HpStatusBadge` | ✅ Renderizava quando não-null | ✅ Guard FULL adicionado |

### Mudanças realizadas

#### 1. `components/player/PlayerJoinClient.tsx` — Fix do store update

```diff
- if (payload.hp_status && payload.current_hp === undefined) {
-   return { ...c, hp_status: payload.hp_status };
- }
+ if (payload.hp_status && payload.current_hp === undefined) {
+   return { ...c, hp_status: payload.hp_status, hp_percentage: payload.hp_percentage };
+ }
```

**Por quê:** O broadcast `SanitizedMonsterHpUpdate` já enviava `hp_percentage`, mas o handler só salvava `hp_status` no estado local. O badge exibia `undefined` em vez do número real.

#### 2. `components/player/PlayerInitiativeBoard.tsx` — Guard tier FULL

```diff
- {percentage != null && (
+ {percentage != null && status !== "FULL" && (
    <span className="font-normal opacity-70">· {percentage}%</span>
  )}
```

**Por quê (UX):** Tier FULL significa 100% — exibir "Pleno · 100%" seria redundante. O status já é autoexplicativo.

### Parity

| Modo | Impacto | Ação |
|------|---------|------|
| Guest (`/try`) | N/A — DM vê HP exato, sem `HpStatusBadge` | Sem mudança |
| Anônimo (`/join`) | ✅ Corrigido via `PlayerJoinClient.tsx` | Fix aplicado |
| Autenticado (`/invite`) | ✅ Corrigido via `PlayerJoinClient.tsx` | Fix aplicado (mesmo componente) |

### Fluxo corrigido

```
DM inflige dano em monstro
  → broadcast.ts:sanitizeCombatant() calcula hp_percentage ✅
  → SanitizedMonsterHpUpdate.hp_percentage enviado via Supabase Realtime ✅
  → PlayerJoinClient:combat:hp_update handler salva hp_status + hp_percentage ✅ (corrigido)
  → HpStatusBadge renderiza "[ícone] Moderado · 65%" ✅
  → Tier FULL não exibe "· 100%" ✅ (guard adicionado)
```

### Cenários de teste

| # | Cenário | Resultado esperado |
|---|---------|-------------------|
| T1 | DM inflige dano em monstro (→ 65% HP) | Badge atualiza: "Moderado · 65%" |
| T2 | DM cura monstro de volta a 100% | Badge mostra "Pleno" (sem %) |
| T3 | DM inflige dano pesado (→ 9% HP) | Badge: "Crítico · 9%" |
| T4 | Player abre a tela com monstro já ferido | Badge correto no primeiro render (via state_sync) |
| T5 | Monstro com `max_hp = 0` | Badge "Crítico" sem percentual |
| T6 | Dano em player character | Sem mudança — player vê HP numérico exato |

---

## W2.2 — Notas com Pastas 🟡 PARCIALMENTE IMPLEMENTADO

### Status atual

O componente DM (`CampaignNotes.tsx`) está **completo**. O trabalho restante é a **player read view** para notas `is_shared = true`.

### DM side — já implementado

| Feature | Componente | Status |
|---------|-----------|--------|
| Sidebar de pastas | `NotesFolderTree` | ✅ Completo |
| Criar/renomear/excluir pasta | `handleCreateFolder`, `handleRenameFolder`, `handleDeleteFolder` | ✅ Completo |
| Mover nota para pasta | `handleMoveToFolder` + select nativo | ✅ Completo |
| Toggle `is_shared` | `handleToggleShared` + ícone Lock/Eye | ✅ Completo |
| Filtro por pasta no sidebar | `filteredNotes` useMemo | ✅ Completo |
| Contador de notas por pasta | `noteCounts` useMemo | ✅ Completo |

### Player side — PENDENTE (próxima wave)

| Feature | Status | Decisão necessária |
|---------|--------|-------------------|
| Aba "Notas" na player view | 🔲 Não implementado | Onde fica na UI do player? |
| Query `is_shared = true` | 🔲 Não implementado | Via polling ou trigger realtime? |
| RLS policy `is_shared` | ⚠️ A verificar no Supabase | — |

### Arquitetura recomendada (Winston)

**Pull simples para Wave 3:**
```sql
-- RLS sugerida para notas shared
-- SELECT: owner OU campaign_member
CREATE POLICY "players_can_read_shared_notes"
  ON campaign_notes FOR SELECT
  USING (
    is_shared = true
    AND campaign_id IN (
      SELECT campaign_id FROM campaign_members WHERE user_id = auth.uid()
    )
  );
```

**Componente sugerido:** aba "Notas" na `PlayerJoinClient` → lista read-only flat (sem estrutura de pastas para players), query direta ao Supabase.

### O que você precisa fazer para W2.2 (player side)

1. **Verificar RLS no Supabase** — a policy acima existe? `campaign_notes` tem RLS habilitado?
2. **Decisão UX** — onde fica a aba de notas no player view? (tab no header? seção separada?)
3. Confirmar e a gente implementa

---

## Pendências abertas

| Item | Responsável | Blocker? |
|------|------------|---------|
| ✅ Fix `PlayerJoinClient.tsx:737` | Implementado | — |
| ✅ Guard tier FULL no `HpStatusBadge` | Implementado | — |
| ✅ Backlog atualizado (BT-08 → DONE) | Feito | — |
| 🔲 W2.2 Player side — RLS check | **Você** | Verificar no Supabase Dashboard |
| 🔲 W2.2 Player side — decisão UX | **Você** | Onde fica a aba no player? |
| 🔲 W2.2 Player side — implementação | Próxima wave | Depende das 2 linhas acima |
