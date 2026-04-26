# Pattern — Zod Shared Validation (Client + Server)

**Status:** Adopted in CR-05 (Estabilidade Combate sprint, 2026-04-24).
**First implementation:** [`lib/schemas/player-registration.ts`](../../lib/schemas/player-registration.ts).
**Why this exists:** Beta #4 review (PR #48 IG-1) caught client/server validation drift — the client capped initiative at no maximum while the server clamped at 99. Two sources of truth diverged silently. This pattern fixes that class of bug at the type level.

## TL;DR

One Zod schema lives in `lib/schemas/`. The client form uses `safeParse` for inline field errors. The server action uses `parse` as the boundary defensive check. Error messages are locale-neutral codes that map to i18n keys.

## When to use

- Any form where a player or DM submits structured data the server will persist
- Whenever you'd otherwise write `if (typeof x !== "number" || x < 1)` checks in two places
- Mutations where field-level error feedback matters (combat HP edits, character creation, late-join registration)

## When NOT to use

- Complex multi-step wizards where each step's schema differs from the final shape
- Server-only data (no client form ever submits it)
- Free-form text fields with no business rules (just check non-empty)

## File layout

```
lib/schemas/
├── player-registration.ts        # CR-05 reference implementation
├── <next-feature>.ts             # add new schemas here, one file per form
└── __tests__/
    └── <next-feature>.test.ts
```

## The schema file

```typescript
// lib/schemas/<feature>.ts
import { z } from "zod";

export const FeatureSchema = z.object({
  // Locale-neutral error codes — snake_case grouped by field.
  // Codes MUST match the i18n key shape under `<namespace>.validation.<code>`
  // so client + server can use `t(\`validation.${code}\`)` directly.
  fieldName: z
    .string()
    .trim()
    .min(1, "fieldname_required")
    .max(50, "fieldname_too_long"),
  amount: z
    .number({ message: "amount_not_number" })
    .int("amount_not_integer")
    .min(1, "amount_below_floor"),
});

export type Feature = z.infer<typeof FeatureSchema>;
```

### Naming rules for error codes

- `<field>_<reason>` — snake_case, single underscore separator
- `<field>` matches the i18n namespace (e.g. `name`, `initiative`, `hp`, `ac`)
- `<reason>` is short and machine-readable: `required`, `too_long`, `not_number`, `not_integer`, `below_floor`, `above_ceiling`, `not_positive`

### Why snake_case codes (not "name.required")

Both client and server can do `t(\`validation.${code}\`)` directly. Earlier versions used kebab-with-dots (`name.required`) but no locale shipped that key shape — the codes were dead and toast fell back to a generic message. F7 fix in 2026-04-26 normalized the convention.

## i18n keys

Add the codes to both locales under `<namespace>.validation`:

```json
// messages/en.json
{
  "<namespace>": {
    "validation": {
      "fieldname_required": "Field is required",
      "fieldname_too_long": "Field too long (max 50 characters)",
      "amount_not_number": "Amount must be a number",
      "amount_not_integer": "Amount must be a whole number",
      "amount_below_floor": "Amount must be ≥ 1"
    }
  }
}
```

```json
// messages/pt-BR.json
{
  "<namespace>": {
    "validation": {
      "fieldname_required": "Campo obrigatório",
      "fieldname_too_long": "Campo muito longo (máximo 50 caracteres)",
      "amount_not_number": "Valor precisa ser um número",
      "amount_not_integer": "Valor precisa ser um número inteiro",
      "amount_below_floor": "Valor precisa ser ≥ 1"
    }
  }
}
```

## Client usage

```typescript
"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { FeatureSchema } from "@/lib/schemas/<feature>";

export function FeatureForm() {
  const t = useTranslations("<namespace>");
  const tValidation = useTranslations("<namespace>.validation");
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function handleSubmit() {
    // Use Number() instead of parseInt() so "15.5" / "15abc" become NaN
    // and the schema's int() check catches them. parseInt("15.5") = 15
    // silently truncates — F8 lesson.
    const parsed = FeatureSchema.safeParse({
      fieldName: rawName,
      amount: rawAmount.trim() ? Number(rawAmount) : NaN,
    });

    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      const codeMap: Record<string, string> = {};
      for (const [field, codes] of Object.entries(fieldErrors)) {
        if (codes && codes.length > 0) codeMap[field] = codes[0];
      }
      setErrors(codeMap);
      return;
    }

    setErrors({});
    await submitToServer(parsed.data);
  }

  return (
    <>
      <input
        value={rawName}
        onChange={(e) => {
          setRawName(e.target.value);
          // Clear field's error eagerly on edit — UX feels responsive.
          if (errors.fieldName) {
            setErrors((prev) => { const next = { ...prev }; delete next.fieldName; return next; });
          }
        }}
        aria-invalid={!!errors.fieldName || undefined}
      />
      {errors.fieldName && (
        <p>{tValidation(errors.fieldName)}</p>
      )}
    </>
  );
}
```

## Server usage

```typescript
"use server";
import { z } from "zod";
import { FeatureSchema, type Feature } from "@/lib/schemas/<feature>";

export async function submitFeature(rawData: unknown) {
  let data: Feature;
  try {
    data = FeatureSchema.parse(rawData);
  } catch (err) {
    if (err instanceof z.ZodError) {
      // Throw the FIRST issue's message (locale-neutral code) so the
      // client toast can translate it via tValidation(code). Don't
      // concatenate or prefix — the client probes for /^<field>_/ to
      // decide whether to translate.
      throw new Error(err.issues[0]?.message ?? "Invalid data");
    }
    throw err;
  }

  // ... use `data` to mutate DB. Trust the parsed shape — no further
  // validation needed within this function.
}
```

### Defense in depth

Why parse server-side when the client already validated? The wire is untrusted. A bad/old/malicious client can POST anything; the server's parse() is the only line that holds. Treat the client safeParse as a UX optimization — the server parse is the contract.

## Anti-patterns

```typescript
// ❌ Two schemas — exactly the drift we're fixing
const clientSchema = z.object({ amount: z.number().min(1).max(99) });
const serverSchema = z.object({ amount: z.number().min(1) });

// ❌ Hand-rolled validation in addition to Zod
if (data.amount < 1) throw new Error("Amount too low");
const data = FeatureSchema.parse(rawData);  // duplicate check

// ❌ Translating in the schema (locale leak server-side)
.min(1, "Amount must be at least 1")  // BR users see English

// ❌ kebab-with-dots codes that don't match i18n keys
.min(1, "amount.below-floor")  // no t() call ever finds this

// ❌ parseInt for inputs the schema validates as int
const amount = parseInt(raw, 10);  // "15.5" → 15 silently truncates
const parsed = FeatureSchema.safeParse({ amount });  // passes; user surprised
//   ✅ Use Number() — produces NaN/non-integer that int() rejects.

// ❌ Catch-and-swallow on server
try { FeatureSchema.parse(rawData); } catch { /* ignore */ }
//   ✅ Re-throw with the issue message so the client gets the code.
```

## Migrating an existing handler

1. Create `lib/schemas/<feature>.ts` with the schema and `z.infer<typeof Schema>` type.
2. Add error code keys to `messages/{en,pt-BR}.json` under `<namespace>.validation`.
3. Replace ad-hoc client validation (typeof checks, manual range comparisons) with `safeParse` and the new error-code state.
4. Replace server-side ad-hoc checks with `parse` and re-throw the first issue message.
5. Write the test at `lib/schemas/__tests__/<feature>.test.ts` — the schema is testable in isolation; you don't need DB / network fixtures.
6. Update CLAUDE.md memory if the new schema introduces a vocabulary decision.

## Reference: CR-05 implementation

- Schema: [`lib/schemas/player-registration.ts`](../../lib/schemas/player-registration.ts)
- Client: [`components/player/PlayerLobby.tsx`](../../components/player/PlayerLobby.tsx) (handleFormSubmit)
- Server: [`lib/supabase/player-registration.ts`](../../lib/supabase/player-registration.ts) (registerPlayerCombatant)
- Tests: [`lib/schemas/__tests__/player-registration.test.ts`](../../lib/schemas/__tests__/player-registration.test.ts)
- i18n: [`messages/en.json`](../../messages/en.json) `player.validation.*`
- Spec: [`_bmad-output/estabilidade-combate/stories/CR-05-zod-shared-validation.md`](../../_bmad-output/estabilidade-combate/stories/CR-05-zod-shared-validation.md)
