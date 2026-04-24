# CR-05 — Zod Schema Compartilhado (Phase 1: player-registration)

**Epic:** Estabilidade Combate
**Camada:** L5 (Shared validation)
**Prioridade:** P1 — fecha IG-1 do review + serve de template
**Estimate:** 0.5 dia
**Dependencies:** nenhuma (pode paralelizar)
**Deliverable:** `lib/schemas/player-registration.ts` + migração client + server + template doc

---

## Problem

Validação de registro de player existe **em 2 lugares**, sem fonte única:

- `components/player/PlayerLobby.tsx:handleFormSubmit` — checks inline: `!trimmedName`, `isNaN(initVal)`, `initVal < 1`, etc
- `lib/supabase/player-registration.ts:registerPlayerCombatant` — throws: "Initiative must be a positive number", "AC must be a positive number", etc

**Consequência (IG-1 do review de PR #48):** Client aceitou init=150, server rejeitou com erro genérico, player viu toast "Failed to register" sem destaque no campo.

## Goal / Value

1. **Fonte única de verdade** — `PlayerRegistrationSchema` em Zod, importado por ambos
2. **Erros inline no client** — `safeParse` retorna `{fieldErrors}` → UI destaca campo
3. **Template pro resto do código** — `lib/schemas/` vira o pattern pra toda feature nova

## Acceptance Criteria

- [ ] **AC1** — Novo arquivo `lib/schemas/player-registration.ts`:
  ```typescript
  import { z } from "zod";

  export const PlayerRegistrationSchema = z.object({
    name: z.string().trim().min(1, "Nome obrigatório").max(50, "Nome muito longo"),
    initiative: z.number().int().min(1, "Iniciativa precisa ser ≥ 1"),
    hp: z.number().int().positive("HP precisa ser > 0").nullable(),
    ac: z.number().int().positive("AC precisa ser > 0").nullable(),
  });

  export type PlayerRegistration = z.infer<typeof PlayerRegistrationSchema>;
  ```

- [ ] **AC2** — `PlayerLobby.tsx:handleFormSubmit` usa `safeParse`:
  - Se `!parsed.success` → `setErrors(new Set(Object.keys(parsed.error.flatten().fieldErrors)))` e render erros inline por campo (reutilizar UI existente de `errors` set)
  - Se sucesso → chama `onRegister(parsed.data)`
  - Remove checks inline duplicados (o `if (!trimmedName) newErrors.add("name")` etc)

- [ ] **AC3** — `lib/supabase/player-registration.ts:registerPlayerCombatant` usa `parse`:
  - Primeira linha substitui os 4 blocos de validação inline
  - `const parsed = PlayerRegistrationSchema.parse(data)` — throws na invalid
  - Caller captura `ZodError`, converte pra response estruturada

- [ ] **AC4** — Tipo `PlayerRegistrationData` em `player-registration.ts` é **removido** e substituído por `z.infer<typeof PlayerRegistrationSchema>`. Não duplicar type shape.

- [ ] **AC5** — Mensagens de erro em PT-BR no schema (seguir glossário: "Iniciativa", "HP", "AC" — esses 2 últimos mantêm sigla)

- [ ] **AC6** — Unit tests `lib/schemas/__tests__/player-registration.test.ts`:
  - Valid: name="Hero", init=15, hp=30, ac=16 → ok
  - Invalid name: "" → fieldErrors.name defined
  - Invalid init: 0 → fieldErrors.initiative
  - Invalid init: -1 → fieldErrors.initiative
  - Invalid init: "abc" (non-number) → rejected at type level (not runtime — Zod handles)
  - Invalid hp: 0 → fieldErrors.hp
  - Valid nullable: hp=null → ok
  - Trim: name="  Hero  " → parsed.data.name === "Hero"

- [ ] **AC7** — **Doc template:** novo `docs/patterns/zod-shared-validation.md` — 1 página explicando:
  - When to create a shared schema
  - Where to put it (`lib/schemas/<feature>.ts`)
  - Client pattern (`safeParse` + inline errors)
  - Server pattern (`parse` + try/catch ZodError)
  - Example: link pra `player-registration.ts` como referência canônica

- [ ] **AC8** — PlayerJoinClient tests continuam verdes

## Technical Approach

### Schema

Ver AC1 — direto.

### Client migration

Em `PlayerLobby.tsx:369-400` (bloco atual de validação + submit):

**Antes:**
```typescript
const handleFormSubmit = async () => {
  const trimmedName = name.trim();
  const initVal = parseInt(initiative, 10);
  const newErrors = new Set<string>();
  if (!trimmedName) newErrors.add("name");
  if (!initiative.trim() || isNaN(initVal) || initVal < 1) newErrors.add("initiative");
  if (newErrors.size > 0) { setErrors(newErrors); return; }
  // ... submit
};
```

**Depois:**
```typescript
import { PlayerRegistrationSchema } from "@/lib/schemas/player-registration";

const handleFormSubmit = async () => {
  const hpVal = hp.trim() ? parseInt(hp, 10) : null;
  const acVal = ac.trim() ? parseInt(ac, 10) : null;
  const initVal = parseInt(initiative, 10);

  const parsed = PlayerRegistrationSchema.safeParse({
    name,
    initiative: initVal,
    hp: hpVal && !isNaN(hpVal) ? hpVal : null,
    ac: acVal && !isNaN(acVal) ? acVal : null,
  });

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    setErrors(new Set(Object.keys(fieldErrors)));
    return;
  }
  // ... submit com parsed.data
};
```

### Server migration

Em `lib/supabase/player-registration.ts`:

**Antes:**
```typescript
export async function registerPlayerCombatant(tokenId, sessionId, data: PlayerRegistrationData) {
  const name = data.name?.trim();
  if (!name || name.length > 50) throw new Error("Invalid name");
  if (!Number.isFinite(data.initiative) || data.initiative < 1) {
    throw new Error("Initiative must be a positive number");
  }
  if (data.hp !== null && (!Number.isFinite(data.hp) || data.hp < 1)) {
    throw new Error("HP must be a positive number");
  }
  if (data.ac !== null && (!Number.isFinite(data.ac) || data.ac < 1)) {
    throw new Error("AC must be a positive number");
  }
  // ... rest
}
```

**Depois:**
```typescript
import { PlayerRegistrationSchema } from "@/lib/schemas/player-registration";

export async function registerPlayerCombatant(tokenId, sessionId, rawData: unknown) {
  let data;
  try {
    data = PlayerRegistrationSchema.parse(rawData);
  } catch (err) {
    if (err instanceof z.ZodError) throw new Error(err.errors[0].message);
    throw err;
  }
  // ... rest (use data.name, data.initiative, etc)
}
```

### Doc

Short, focused. 1 page. Link to schema file. Copy-pasteable example.

## Tasks

- [ ] **T1** (30min) — Criar `lib/schemas/player-registration.ts` + unit tests
- [ ] **T2** (1h) — Migrar `PlayerLobby.tsx:handleFormSubmit` + verificar UI mostra erros por campo
- [ ] **T3** (30min) — Migrar `lib/supabase/player-registration.ts`
- [ ] **T4** (30min) — Smoke: registrar com init=150 → aceita, init=0 → erro inline + toast
- [ ] **T5** (30min) — `docs/patterns/zod-shared-validation.md` + link no CLAUDE.md em Rules (novo rule?)

## Test Strategy

**Unit:** schema tests (AC6)
**Integration:** manual — registrar 5 combinações válidas + 5 inválidas
**Regression:** PlayerJoinClient.test.tsx deve continuar verde

## Dependencies

- Zod já está no `package.json` (usado em outros lugares do projeto)

## Definition of Done

- [ ] Todos ACs checked
- [ ] PR aberto + CI verde
- [ ] Doc template publicado em `docs/patterns/`
- [ ] Smoke manual assinado
- [ ] Merged

## Out of Scope

- ❌ Migração de todos os endpoints de combat — Sprint 2+
- ❌ tRPC adoption — overkill por enquanto
- ❌ react-hook-form integration (`zodResolver`) — hora que migrarmos o form pra RHF
- ❌ i18n das mensagens Zod via `next-intl` — sprint 2 se virar dor

## Riscos

| Risco | Mitigação |
|---|---|
| Breaking change em chamadores de `registerPlayerCombatant` | Signature manteve `(tokenId, sessionId, rawData)`; só tipagem mudou de `PlayerRegistrationData` pra `unknown` + parse interno |
| Erro Zod vem sem `fieldErrors` estruturado | Usar `.flatten().fieldErrors` que é API estável do Zod |
| UX regressão: erro hoje é por campo (Set<string>), Zod retorna record | AC2 explica: converter `Object.keys(fieldErrors)` → Set. Mantém UI existente |
