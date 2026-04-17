# Spec: Polymorph + Wild Shape (Transformações em Combate)

**Autores:** Winston (Architect) + Sally (UX)
**Data:** 2026-04-17
**Ship target:** Beta 4 (2026-04-23)
**Feature flag:** `ff_transformation_v1` (default OFF)
**Origem:** Beta Test 3 — feedback do DM Lucas (16/04/2026)

> "Na visão do jogador, deve ter opção dele se transformar num monstro, seja via polymorph e tal pra ele mudar a vida máxima e ele ter uma segunda barrinha de vida que vai começar a morrer antes... vai mudar a CA, vai mudar tudo."

---

## 0. Resumo Executivo

Permitir que um jogador **troque temporariamente sua ficha** por uma criatura do SRD (Polymorph do mago/feiticeiro e Wild Shape do druida), exibindo **duas barras de HP sobrepostas** (forma atual acima, forma original abaixo), CA/velocidade/ataques da fera e botão de reverter. Deve funcionar em **Guest / Anon / Auth** (parity rule) atrás de feature flag.

**Estimativa total: ~13-14h** (mais honesta que os 10-12h originais, dado que envolve schema change + novo evento de broadcast + matemática de dano condicional + 2 variações de regra 5e).

---

## 1. Data Model

### 1.1. Nova migration — `139_combatant_transformation.sql`

```sql
-- Migration 139: Combatant transformation state (Polymorph + Wild Shape)
-- Idempotent: IF NOT EXISTS guards permitem replays sem erro
-- Reversível: ver bloco DOWN no final

ALTER TABLE combatants
  ADD COLUMN IF NOT EXISTS transformed_into_monster_id TEXT NULL,
  ADD COLUMN IF NOT EXISTS transformed_hp INTEGER NULL,
  ADD COLUMN IF NOT EXISTS transformed_max_hp INTEGER NULL,
  ADD COLUMN IF NOT EXISTS transformed_ac INTEGER NULL,
  ADD COLUMN IF NOT EXISTS transform_type TEXT NULL
    CHECK (transform_type IS NULL OR transform_type IN ('polymorph','wildshape')),
  ADD COLUMN IF NOT EXISTS transformed_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS original_stats JSONB NULL;

-- Invariante: ou está totalmente transformado, ou nada
ALTER TABLE combatants
  ADD CONSTRAINT chk_transform_consistency
  CHECK (
    (transformed_into_monster_id IS NULL
     AND transformed_hp IS NULL
     AND transformed_max_hp IS NULL
     AND transform_type IS NULL
     AND original_stats IS NULL)
    OR
    (transformed_into_monster_id IS NOT NULL
     AND transformed_hp IS NOT NULL
     AND transformed_max_hp IS NOT NULL
     AND transform_type IS NOT NULL
     AND original_stats IS NOT NULL)
  );

-- Index parcial — apenas ~1% das linhas estarão transformadas em qualquer momento
CREATE INDEX IF NOT EXISTS idx_combatants_transformed
  ON combatants(encounter_id, transform_type)
  WHERE transform_type IS NOT NULL;

-- DOWN (para rollback manual):
--   ALTER TABLE combatants DROP CONSTRAINT chk_transform_consistency;
--   DROP INDEX idx_combatants_transformed;
--   ALTER TABLE combatants
--     DROP COLUMN transformed_into_monster_id,
--     DROP COLUMN transformed_hp,
--     DROP COLUMN transformed_max_hp,
--     DROP COLUMN transformed_ac,
--     DROP COLUMN transform_type,
--     DROP COLUMN transformed_at,
--     DROP COLUMN original_stats;
```

**Nota sobre `transformed_into_monster_id`:** é `TEXT` (não UUID) porque `combatants.monster_id` já é TEXT desde a migration `014_monster_id_to_text.sql` — os IDs SRD são slugs (`"brown-bear"`, `"dire-wolf"`).

### 1.2. Shape do `original_stats` JSONB

```ts
// Snapshot imutável do estado pré-transformação. Usado para reverter.
interface OriginalStats {
  max_hp: number;
  current_hp: number;   // HP no momento da transformação
  temp_hp: number;
  ac: number;
  spell_save_dc: number | null;
  // NÃO snapshotar: name, conditions, death_saves, initiative — esses
  // permanecem vinculados ao personagem e não mudam com a transformação.
}
```

### 1.3. Atualização em [lib/types/combat.ts:9](lib/types/combat.ts#L9)

Adicionar ao interface `Combatant`:

```ts
  /** SRD monster slug para a forma transformada (polymorph/wildshape). Null = não transformado. */
  transformed_into_monster_id: string | null;
  /** HP atual da forma-fera. Null quando não transformado. */
  transformed_hp: number | null;
  /** HP máximo da forma-fera (= max_hp do bestiário). Null quando não transformado. */
  transformed_max_hp: number | null;
  /** CA da forma-fera (pode diferir da CA do personagem). Null quando não transformado. */
  transformed_ac: number | null;
  /** Tipo de transformação — afeta regra de dano no HP = 0. */
  transform_type: 'polymorph' | 'wildshape' | null;
  /** ISO timestamp de quando a transformação iniciou. Usado para timer de duração. */
  transformed_at: string | null;
  /** Snapshot JSONB para reverter. Null quando não transformado. */
  original_stats: OriginalStats | null;
```

### 1.4. RLS

Nenhuma política nova — as colunas herdam do row-level existente em `combatants`. DM do encontro (owner) pode ler/escrever tudo; jogador lê via broadcast sanitizado (ver §2).

**Importante:** `original_stats` JSONB contém HP real do personagem pré-transformação. Em broadcast para jogadores não-donos, essa coluna **não é enviada** (stripped em [lib/realtime/sanitize.ts:23](lib/realtime/sanitize.ts#L23)). Monstros transformados (caso DM transforme um NPC) seguem a mesma sanitização de HP por status.

---

## 2. Broadcast Events (Realtime)

### 2.1. Princípio de backwards-compat

**Regra:** não posso quebrar clientes antigos. Campos novos viajam como **opcionais** nos eventos existentes sempre que possível, e só o evento novo de "transform" é inédito — e fica atrás do feature flag.

### 2.2. Novos tipos em [lib/types/realtime.ts:6](lib/types/realtime.ts#L6)

Adicionar à união `RealtimeEventType`:

```ts
  | "combat:transform_apply"
  | "combat:transform_revert"
```

Novos interfaces:

```ts
export interface RealtimeTransformApply {
  type: "combat:transform_apply";
  combatant_id: string;
  transformed_into_monster_id: string;
  transformed_hp: number;
  transformed_max_hp: number;
  transformed_ac: number;
  transform_type: 'polymorph' | 'wildshape';
  transformed_at: string; // ISO
  /** Sender validation (player-initiated transforms) */
  sender_token_id?: string;
}

export interface RealtimeTransformRevert {
  type: "combat:transform_revert";
  combatant_id: string;
  /** HP a restaurar ao personagem após reverter (regra depende de transform_type) */
  restored_current_hp: number;
  restored_temp_hp: number;
  /** Razão — 'manual' | 'hp_zero' | 'dm_force' | 'duration_ended' | 'concentration_broken' */
  reason: 'manual' | 'hp_zero' | 'dm_force' | 'duration_ended' | 'concentration_broken';
  sender_token_id?: string;
}
```

### 2.3. Extensão de `combat:hp_update` (backwards-compat)

O evento existente em [lib/types/realtime.ts:43](lib/types/realtime.ts#L43) ganha campos opcionais:

```ts
export interface RealtimeHpUpdate {
  // ... campos existentes ...
  /** Quando presente, o dano/cura foi aplicado à forma transformada */
  applied_to_transformed?: boolean;
  /** HP da forma-fera após a mudança (apenas quando applied_to_transformed=true) */
  transformed_hp?: number;
}
```

Clientes antigos ignoram os campos extras sem quebrar — o HP que eles já esperavam continua populado.

### 2.4. Sanitização player-side

Em [lib/realtime/sanitize.ts:23](lib/realtime/sanitize.ts#L23), adicionar ao `sanitizeCombatant()`:

- Para `is_player=true`: manter todos os campos `transformed_*` (jogador precisa vê-los).
- Para `is_player=false` (NPC/monstro transformado pelo DM — edge case): expor apenas `transformed_into_monster_id` + status relativo (sem HP exato), e **strip `original_stats`** sempre.
- **Sempre strip `original_stats`** do payload enviado a qualquer jogador que não seja o dono do combatant (`session_token_id`).

### 2.5. Feature flag

Adicionar a [lib/flags.ts:20](lib/flags.ts#L20):

```ts
  /** B4 — Polymorph + Wild Shape transformations. */
  | "ff_transformation_v1";
```

Default `false`. Env var: `NEXT_PUBLIC_FF_TRANSFORMATION_V1=1` para ligar em staging.

**Gating behavior quando OFF:**
- Botão "Transformar" não renderiza.
- Handlers de `combat:transform_apply` / `transform_revert` são no-op (logam warning).
- Nada no schema precisa ser revertido — colunas ficam null.

---

## 3. UI Flow — Player Side

### 3.1. Entry point: botão "Transformar"

**Onde:** na linha do próprio personagem em [components/player/PlayerInitiativeBoard.tsx](components/player/PlayerInitiativeBoard.tsx), ao lado de Conditions/HP Actions.

**Visibilidade:** apenas no combatant cujo `session_token_id === meu tokenId` E `is_player === true` E `ff_transformation_v1` estiver ON.

**Ícone:** `<Sparkles />` (lucide) com label `t('combat.transform_title')` = "Transformar".

**Estado visual:**
- Não transformado → botão outline discreto.
- Transformado → botão preenchido roxo/âmbar + badge "Em forma de [nome da fera]".

### 3.2. Modal de escolha — `TransformationPicker.tsx` (NOVO)

Caminho: `components/combat/TransformationPicker.tsx`.

**Fluxo:**
1. Usuário clica "Transformar" → modal abre.
2. Tabs: "Polymorph" | "Wild Shape" (se não for druida, Wild Shape desabilita com tooltip).
3. Input numérico **CR máximo** (default: 1 para polymorph / CR baseado em nível druida se personagem conhecido; **se desconhecido, default 1 com nota**).
4. Filtro lateral: tipo (beast/etc), ambiente. Reusa `MonsterSearchPanel` pattern.
5. Lista de feras do SRD filtradas por `cr <= maxCR` AND `type === "beast"` (para wild shape — polymorph aceita qualquer `beast`). Usar `getSrdMonsters()` client-side ([lib/srd/](lib/srd/)).
6. Click em card → preview com stat block resumido (HP, CA, velocidade, ataques).
7. Botão "Confirmar transformação" → emite `combat:transform_apply`.

**Validação client-side:**
- Já transformado? → bloquear, mostrar toast "Reverta antes de se transformar novamente".
- Morto/inconsciente (current_hp = 0)? → bloquear.
- CR além do permitido? → warning amarelo + opção "DM permite override?" (não envia pedido automático — jogador explica por voz/chat, DM aprova por confiança).

### 3.3. Display em combate — Duas barras de HP

**Componente novo:** `components/combat/TransformedHpBars.tsx`

**Layout (vertical stack no card do personagem):**
```
┌─────────────────────────────────────┐
│ Duckbill · URSO PARDO (Polymorph)   │  ← nome + badge
│ ╔═══════════════════════════════╗   │
│ ║ HP FERA    34/34 ▓▓▓▓▓▓░░░░   ║   │  ← forma atual (morre primeiro)
│ ╚═══════════════════════════════╝   │
│   HP real    22/45 ▓▓▓▓▓▓░░░░        │  ← forma original (dimmed, menor)
│                                      │
│ CA 11 (era 16) · Vel 40ft           │  ← stats swap com delta
│ [Reverter]                           │
└─────────────────────────────────────┘
```

**Regras visuais:**
- Borda do card: gradiente roxo→âmbar quando transformado.
- Barra de cima: altura cheia, cor verde/amarelo/vermelho por threshold (reusa [lib/utils/hp-status.ts](lib/utils/hp-status.ts) via `getHpBarColor`).
- Barra de baixo: `opacity-50`, altura menor, cor fixa cinza-azulado (é "congelada" durante polymorph).
- Stats alterados: badge "(era X)" ao lado do valor novo, apenas se diferente.
- Motion: fade-in da borda gradiente (framer-motion) ao entrar em transformação, fade-out ao reverter.

### 3.4. Revert button

- Posição: dentro do card transformado, próximo aos HP bars.
- Label: `t('combat.transform_revert')` = "Reverter".
- Confirmação: inline AlertDialog ("Reverter para forma original? HP da fera será perdido.").
- Emite `combat:transform_revert` com `reason: 'manual'`.

### 3.5. Para jogador que NÃO é o dono

Vê o combatant transformado com:
- Nome: "Duckbill (URSO PARDO)" — nome do personagem + forma em maiúsculas entre parênteses.
- HP bar: apenas a barra-fera (cópia do que jogador dono mostra no topo), com status band, não exato.
- Sem botões de ação (padrão já existente).

---

## 4. UI Flow — DM Side

### 4.1. Visualização em [components/session/CombatSessionClient.tsx:1684](components/session/CombatSessionClient.tsx#L1684)

O DM vê o jogador transformado com:
- **Linha do combatant** mostra badge "Transformado · [Fera]" ao lado do nome.
- **Stat block lateral** (quando DM clica no combatant): abas "Personagem" | "Fera" — padrão aproveita o `MonsterStatBlock` já usado em pinned cards.
- **Duas HP bars** idênticas ao layout do player (DM vê ambas exatas).

### 4.2. Force revert

- Menu contextual do DM (3-dots no CombatantRow) → "Forçar reverter".
- Emite `combat:transform_revert` com `reason: 'dm_force'`.
- Caso de uso: jogador saiu, concentration quebrada por mecânica que o DM julgou, bug, etc.

### 4.3. Combat log entries

Adicionar a [components/combat/CombatActionLog.tsx](components/combat/CombatActionLog.tsx) dois novos event types:
- `transform_applied` → "🐻 Duckbill se transformou em Urso Pardo (Polymorph)."
- `transform_reverted` → "👤 Duckbill voltou à forma original. [razão]"

**Persistência do log:** usa [lib/stores/combat-log-store.ts](lib/stores/combat-log-store.ts) + migration `116_combat_log_persistence.sql` (já existente, schema suporta novos tipos sem mudança).

### 4.4. Initiative

**RAW D&D 5e:** não muda. A criatura mantém o mesmo turno na ordem de iniciativa. **Portanto, zero mudança aqui** — `initiative_order` é imutável durante a transformação.

---

## 5. Damage Flow

### 5.1. Regra RAW resumida

| Situação | Polymorph | Wild Shape |
|----------|-----------|------------|
| Dano aplicado | Reduz `transformed_hp` | Reduz `transformed_hp` |
| `transformed_hp` chega a 0 | Reverte com HP original INTACTO; excesso é **PERDIDO** | Reverte; excesso passa para `current_hp` (pode knockoutar druida) |
| Duração expira (1h polymorph, druida/2h wildshape) | Reverte com HP original intacto | Reverte com HP original intacto |
| Concentração quebrada | Reverte com HP original intacto | N/A (wild shape não requer concentração) |
| Druida quer voltar | N/A | Bônus action → reverte com HP original intacto |
| Cura durante transformação | Cura `transformed_hp` (RAW); NÃO cura `current_hp` | Idem |

### 5.2. Algoritmo (pseudo-código)

Localização: lógica nova em `lib/combat/transformation.ts` (NOVO), importada pelas actions `applyDamage`/`applyHealing` em [lib/stores/combat-store.ts:127](lib/stores/combat-store.ts#L127).

```ts
function applyDamageToTransformed(c: Combatant, amount: number):
  { update: Partial<Combatant>; autoRevertPayload?: RevertPayload }
{
  if (!c.transform_type) throw new Error("not transformed");

  // Temp HP do personagem NÃO absorve (está na forma-fera, que não tem temp HP RAW)
  // A fera começou com 0 temp HP. Se o DM quer conceder temp HP à fera, escreve diretamente.

  const newTransformedHp = Math.max(0, c.transformed_hp! - amount);
  const overflow = Math.max(0, amount - c.transformed_hp!);

  if (newTransformedHp > 0) {
    // Dano absorvido totalmente pela forma-fera. Personagem intocado.
    return { update: { transformed_hp: newTransformedHp } };
  }

  // transformed_hp = 0 → auto-revert
  if (c.transform_type === 'polymorph') {
    // Excesso PERDIDO. HP original permanece = original_stats.current_hp (já era quando transformou).
    return {
      update: {
        ...clearTransformFields(),
        current_hp: c.original_stats!.current_hp,
        temp_hp: c.original_stats!.temp_hp,
      },
      autoRevertPayload: { reason: 'hp_zero', restored_current_hp: c.original_stats!.current_hp, restored_temp_hp: c.original_stats!.temp_hp },
    };
  }

  // wildshape — overflow vai para o druida
  const druidaHp = Math.max(0, c.original_stats!.current_hp - overflow);
  return {
    update: {
      ...clearTransformFields(),
      current_hp: druidaHp,
      temp_hp: c.original_stats!.temp_hp,
    },
    autoRevertPayload: { reason: 'hp_zero', restored_current_hp: druidaHp, restored_temp_hp: c.original_stats!.temp_hp },
  };
}
```

### 5.3. UI de aplicar dano (DM)

**Problema:** DM clica "aplicar 12 de dano" — qual forma recebe?

**Solução:** em [components/combat/HpAdjuster.tsx](components/combat/HpAdjuster.tsx), se o combatant está transformado:
- Default: aplicar à forma transformada (topmost bar).
- Checkbox "Aplicar à forma original" (uncommon — geralmente é magia de fora da arena etc.). Se marcado, reduz `original_stats.current_hp` diretamente (raro, RAW quase nunca acontece).

**HpAdjuster recebe uma prop nova:** `isTransformed: boolean` e `transformedHp/MaxHp` para exibir corretamente.

### 5.4. Broadcast do resultado

- Dano normal à forma-fera → `combat:hp_update` com `applied_to_transformed=true`, `transformed_hp=X`.
- Auto-revert → DM emite DOIS eventos sequenciais: `combat:hp_update` (para zerar transformed_hp no log) + `combat:transform_revert` (para reverter).
  - Trade-off: 2 eventos = possibilidade de desync entre eles. Alternativa: um único `combat:transform_revert` com `auto: true` que o cliente trata como ambos. **Decisão: usar flag `auto` no revert** para manter 1 broadcast (menor latência e sem desync).

---

## 6. Parity Matrix (CLAUDE.md Combat Parity Rule)

| Modo | Aplicar? | Arquivo Entry | Implementação |
|------|----------|---------------|---------------|
| **Guest** (`/try`) | ✅ Sim | [components/guest/GuestCombatClient.tsx](components/guest/GuestCombatClient.tsx) | Via Zustand [lib/stores/combat-store.ts](lib/stores/combat-store.ts) — novas actions `applyTransformation` / `revertTransformation`. Sem broadcast. Guest é sempre DM da própria mesa mas pode "simular" jogador; botão aparece quando combatant `is_player=true`. |
| **Anon** (`/join`) | ✅ Sim | [components/player/PlayerJoinClient.tsx](components/player/PlayerJoinClient.tsx) | Via broadcast (transform_apply/revert) + Supabase write pelo DM em `combatants`. Persistência via session_tokens. |
| **Auth** (`/invite`) | ✅ Sim | Mesmo `PlayerJoinClient` + hooks auth | Persistência completa via `campaign_members`. Transformação sobrevive a refresh e reconexão (lida do DB no mount). |

**Nota guest solo play:** no guest, o usuário ERA o DM. Para testar a UX completa de player-transforming, o botão aparece em qualquer combatant com `is_player=true` dentro do GuestCombatClient. Simula a experiência da mesa.

---

## 7. Edge Cases

### 7.1. Personagem morre transformado
- `transformed_hp = 0` → auto-revert.
- Se wildshape + overflow zerar `current_hp` → personagem entra em "dying" (0 HP, death_saves=0/0). DeathSaveTracker já existente em [components/combat/DeathSaveTracker.tsx](components/combat/DeathSaveTracker.tsx) toma conta.
- Se polymorph → personagem reverte COM HP intacto. Death saves não disparam. É intencional (regra 5e).

### 7.2. Concentration broken (polymorph)
- Polymorph requer concentration. Se DM aplicar condição `concentration_broken` ou o jogador tomar dano > DC 10 em save de CON (spec fora de escopo — DM julga manualmente):
  - DM aciona "Forçar reverter" com `reason: 'concentration_broken'`.
  - UI da combat log mostra: "Duckbill perdeu concentração — Polymorph encerrado."

### 7.3. Multiple transforms stacking — PROIBIDO
- Client-side: se `transform_type !== null` → botão "Transformar" vira "Reverter".
- Server-side: quando o DM recebe `combat:transform_apply` e o combatant já está transformado, **ignora + emite state_sync de volta** para corrigir o cliente dessincronizado.

### 7.4. CR além do permitido
- Client-side: warning amarelo ("CR além do normal para seu nível"). Permite continuar — DM confirma verbalmente na mesa (zero friction).
- **Não implementar "pedido formal de aprovação"** — complica demais para MVP B4. Pode ser follow-up se Lucas pedir.

### 7.5. DM transforma um NPC em outro — OUT OF SCOPE
- Interessante mas fora do escopo B4. DM já pode editar stats diretamente via `StatsEditor`. Se houver pedido explícito, vira feature separada.

### 7.6. Transformação + lair actions / legendary actions
- N/A: lair actions são entidade separada (`is_lair_action=true` em [lib/types/combat.ts:61](lib/types/combat.ts#L61)), não afetadas.
- Criaturas com legendary actions raramente são alvos de polymorph (RAW exige CR ≤ target). Se acontecer, `legendary_actions_total` do bestiário **substitui** durante a transformação — salvar em `original_stats` também.

### 7.7. Reconexão no meio da transformação
- Seguir [docs/spec-resilient-reconnection.md](docs/spec-resilient-reconnection.md).
- No mount, `PlayerJoinClient` lê `initialCombatants` do server → se `transform_type !== null`, renderiza direto em modo transformado. Zero trabalho extra; schema já cobre.

---

## 8. Accessibility

### 8.1. Visual
- Borda do card transformado: gradiente roxo→âmbar (contraste ≥ 4.5:1 com bg, verificar com aXe).
- Duas HP bars usam texture/padrão distinto (não apenas cor) para daltônicos — barra-fera listrada diagonal, barra-original sólida.
- Estado transformado indicado por ícone `<Sparkles />` visível mesmo com cores suprimidas.

### 8.2. Screen reader
- HP bar topo: `aria-label="Pontos de vida da forma atual: 34 de 34. Você está transformado em Urso Pardo."`
- HP bar baixo: `aria-label="Pontos de vida originais, preservados: 22 de 45."`
- Botão Reverter: `aria-label="Reverter para forma original. Perderá pontos de vida da fera."`
- Anúncio via `aria-live="polite"` ao transformar e ao reverter.

### 8.3. Teclado
- Botão "Transformar" acessível via Tab (já é botão nativo).
- No modal `TransformationPicker`: navegação por arrow keys nos cards de fera, Enter confirma.
- Shortcut: sem atalho global (evitar colisões com hotkeys do DM em [components/combat/KeyboardCheatsheet.tsx](components/combat/KeyboardCheatsheet.tsx)).

---

## 9. i18n Keys

Adicionar ao bloco `"combat"` em [messages/pt-BR.json:1598](messages/pt-BR.json#L1598) (e espelhar no en.json):

```json
{
  "transform_title": "Transformar",
  "transform_choose_beast": "Escolha uma fera",
  "transform_polymorph_tab": "Polymorph",
  "transform_wildshape_tab": "Forma Selvagem",
  "transform_max_cr": "CR máximo",
  "transform_filter_by_env": "Filtrar por ambiente",
  "transform_confirm": "Confirmar transformação",
  "transform_current_form": "Forma atual",
  "transform_original_form": "Forma original",
  "transform_revert": "Reverter",
  "transform_revert_confirm_title": "Reverter para forma original?",
  "transform_revert_confirm_body": "O HP da fera será perdido. Seu HP original está preservado.",
  "transform_badge_prefix": "Em forma de",
  "transform_ac_was": "(era {value})",
  "transform_cr_warning": "CR além do normal para seu nível. Confirme com o DM.",
  "transform_already_transformed": "Reverta antes de se transformar novamente.",
  "transform_log_applied": "{name} se transformou em {beast} ({type}).",
  "transform_log_reverted": "{name} voltou à forma original. ({reason})",
  "transform_reason_manual": "manualmente",
  "transform_reason_hp_zero": "HP da fera chegou a 0",
  "transform_reason_dm_force": "DM forçou",
  "transform_reason_duration_ended": "duração expirou",
  "transform_reason_concentration_broken": "concentração quebrada",
  "transform_disabled_wildshape_not_druid": "Forma Selvagem disponível apenas para druidas.",
  "transform_dm_force_menu": "Forçar reverter"
}
```

Total: **23 chaves** (acima da estimativa de 15-20 — regra 5e complexa justifica).

---

## 10. Tests

### 10.1. Unit — `lib/combat/transformation.test.ts` (NOVO)

- Polymorph: HP-fera absorve dano totalmente, `current_hp` intacto.
- Polymorph: HP-fera zera, excesso perdido, reverte com HP original.
- Wildshape: HP-fera zera, overflow passa para druida.
- Wildshape: overflow > HP druida → druida entra em dying (0 HP, death saves 0/0).
- Cura durante transformação aumenta `transformed_hp` (não `current_hp`).
- Cura excede `transformed_max_hp` → capa.
- `original_stats` JSONB serializa/deserializa sem perda.
- Tentar transformar quando já transformado → error.

### 10.2. Integration — store level

- Adicionar testes a [lib/stores/combat-store.test.ts](lib/stores/combat-store.test.ts):
  - `applyTransformation(id, {monsterId, hp, maxHp, ac, type})` popula todos os campos.
  - `revertTransformation(id, reason)` limpa campos + restaura HP conforme regra.
  - Auto-revert quando `applyDamage` zera `transformed_hp`.
  - Undo stack inclui transform/revert.

### 10.3. Component — React Testing Library

- `TransformationPicker.test.tsx`: filtra por CR, muda tab, confirma emit.
- `TransformedHpBars.test.tsx`: renderiza duas barras, cores corretas, a11y labels.
- `CombatantRow.test.tsx`: amplificar — quando transformed, mostra badge + duas barras.

### 10.4. E2E — Playwright

Novo arquivo: `e2e/combat/polymorph-wildshape.spec.ts`:

**Cenário 1 — Wild shape druida → lobo → dano → HP zero → volta**
1. DM cria session com encounter + 1 druida PC + 1 goblin.
2. Player entra via /join, registra como druida.
3. Player clica Transformar → Wild Shape → Wolf (CR ¼).
4. Assert: duas HP bars renderizadas, CA mudou.
5. DM aplica 15 de dano ao druida (que supera HP do wolf = 11).
6. Assert: auto-revert + druida HP = max - (15 - 11) = max - 4.
7. Assert: combat log mostra "transformação revertida".

**Cenário 2 — Polymorph wizard → urso → dano → HP zero → volta SEM perder HP**
1. Wizard PC transforma em urso pardo (CR 1).
2. DM aplica 50 de dano (urso tem 34 HP).
3. Assert: wizard reverte com HP pré-transformação INTACTO. Excesso 16 é perdido.

**Cenário 3 — Reconexão durante transformação**
1. Player transforma.
2. Hide tab 5s + show novamente (visibilitychange).
3. Assert: UI continua em modo transformado após reconnect.

---

## 11. Estimativa por Sub-tarefa

| Task | Estimativa | Nota |
|------|------------|------|
| Migration 139 + typescript types | 1h | Revisível, idempotente |
| Extend combat-store: apply/revert actions + state machine | 2h | Novo arquivo `lib/combat/transformation.ts` |
| Broadcast types + sanitize + flag | 1.5h | Incluindo testes unitários de sanitize |
| DM side UI (badge, force-revert, combat log) | 2h | Principalmente amplify em CombatantRow/CombatSessionClient |
| Player side UI — botão + TransformationPicker modal | 2.5h | Reusa patterns de MonsterSearchPanel |
| Player side UI — TransformedHpBars component | 1.5h | Incluir motion + a11y |
| Damage flow — matemática + integração HpAdjuster | 2h | Regras 5e têm edge cases |
| i18n (23 keys) + copy review | 0.5h | PT-BR + EN |
| Unit + integration tests | 2h | Cobertura ≥80% de `transformation.ts` |
| E2E tests (3 cenários Playwright) | 1.5h | Instável em rede — prever 1 retry loop |
| **Total** | **~16h** | Mais honesto ainda que 13-14h inicial — regras 5e + UX de 2 barras + parity em 3 modos |

**Se precisar cortar para caber em B4 (23/04):** deixar **Wild Shape para B5**, enviar apenas Polymorph em B4. Economiza ~3h (menos edge cases de damage overflow, UI idêntica). Decisão do Dani.

---

## 12. Rollout Plan

1. **PR 1** — Migration + types + store actions + testes unitários. Merge direto (sem feature visível).
2. **PR 2** — Broadcast types + sanitize + flag (OFF). Merge com flag OFF, zero impacto em prod.
3. **PR 3** — UI (DM + Player + modal + duas barras) + e2e. Merge com flag ainda OFF.
4. **Staging flip:** `NEXT_PUBLIC_FF_TRANSFORMATION_V1=1` em staging. Convidar Lucas (beta tester druida) para validar sessão de ~30min.
5. **Lucas valida:** Wild Shape de druida nível 5 → lobo → tomar dano → reverter. Polymorph wizard → urso. DM força revert. Reconexão durante transformação.
6. **SW cache bump:** incrementar versão em [app/sw-register.ts](app/sw-register.ts) ou equivalente para forçar clientes a baixar o novo bundle antes de flip em prod.
7. **Prod flip:** `NEXT_PUBLIC_FF_TRANSFORMATION_V1=1` em prod. Monitorar Sentry por 48h.
8. **Post-rollout:** se zero erros críticos em 1 semana → flag vira default `true` no código, env var pode ser removida na sprint seguinte.

---

## 13. Out of Scope (Future Work)

- **Mounts** — mecânica similar (stat delegation) mas combate em dupla, não fusão. Feature separada.
- **Conjure Animals / Summon X** — invocação cria **novo combatant**, não transforma existente. Usar fluxo de "add combatant" já existente.
- **True Polymorph** — permanente até dispelled, muda tipo de criatura. Edge case raro; fora do escopo B4.
- **Shapechange (druida nível 18)** — equivalente a wildshape mas com limites maiores e permite CR variável. Tratar como wildshape com UI que permita CR=20. Feature follow-up.
- **Transformação de NPCs pelo DM** — interessante para "o mago-chefão vira dragão". DM já pode substituir stats via StatsEditor; feature dedicada só se houver demanda.
- **Duração timer visual** — countdown de "faltam X minutos para polymorph expirar". Útil mas não crítico para B4. Pode entrar em sprint seguinte reutilizando `transformed_at`.
- **Histórico de transformações por combate** — "Duckbill usou Wild Shape 3x neste combate". Vira data-viz no CombatRecap. Nice-to-have.

---

## 14. Anexos — Referências de Arquivos Verificados

- Tipo Combatant: [lib/types/combat.ts:9](lib/types/combat.ts#L9)
- Eventos realtime: [lib/types/realtime.ts:6](lib/types/realtime.ts#L6)
- Sanitize server-side: [lib/realtime/sanitize.ts:23](lib/realtime/sanitize.ts#L23)
- Store combat: [lib/stores/combat-store.ts:45](lib/stores/combat-store.ts#L45)
- Feature flags: [lib/flags.ts:20](lib/flags.ts#L20)
- Row de combatant: [components/combat/CombatantRow.tsx:68](components/combat/CombatantRow.tsx#L68)
- Client DM: [components/session/CombatSessionClient.tsx:166](components/session/CombatSessionClient.tsx#L166)
- Client Player: [components/player/PlayerJoinClient.tsx:126](components/player/PlayerJoinClient.tsx#L126)
- Client Guest: [components/guest/GuestCombatClient.tsx](components/guest/GuestCombatClient.tsx)
- i18n PT-BR: [messages/pt-BR.json:1598](messages/pt-BR.json#L1598)
- Migration anterior de referência: [supabase/migrations/115_combatant_session_token_link.sql](supabase/migrations/115_combatant_session_token_link.sql)
- Spec de reconnection (para edge case §7.7): [docs/spec-resilient-reconnection.md](docs/spec-resilient-reconnection.md)
