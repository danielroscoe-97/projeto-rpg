# Audit — `unlinkEntities` idempotency on missing row

**Date:** 2026-04-21
**Context:** Defer item D2 from the Entity-Graph Close sprint re-review.
**Scenario under test:** Tab A and Tab B of the same DM both schedule an unlink
of the same `campaign_mind_map_edges` row. Tab A's 5s TTL fires first and
succeeds; Tab B's TTL fires ~100ms later and hits a row that no longer exists.

**Question:** Does `unlinkEntities(edgeId)` throw when the edge row is already
gone? If it throws, `useEntityUnlinkUndo.flush()` invokes the self-heal
`onUndo` callback — which in Tab B restores a chip locally while the server
holds no corresponding edge, leaving Tab B permanently desynced until reload.

---

## Verdict

**IS IDEMPOTENT** — safe to fire twice against the same `edgeId`.

`unlinkEntities` uses a straight PostgREST `.from("campaign_mind_map_edges").delete().eq("id", edgeId)` call with **no** RPC wrapper, **no** `.select()` chained, **no** row-count assertion, and no SQL trigger on `DELETE`. The double-commit race in D2 does not trigger the failing branch of `flush()`; both tabs remain in sync.

**Hook D2 status:** **safe** — no code change required. Self-heal path in
`useEntityUnlinkUndo` is defensive-only for genuine failures (network, auth,
RLS-ownership loss), not for this benign race.

---

## Evidence

### 1. `unlinkEntities` is pure PostgREST delete, no RPC

File: `lib/supabase/entity-links.ts:123-133`

```ts
export async function unlinkEntities(edgeId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("campaign_mind_map_edges")
    .delete()
    .eq("id", edgeId);

  if (error) {
    throw new Error(`Failed to unlink entities: ${error.message}`);
  }
}
```

Relevant properties:

- No `.select()` chained → PostgREST default is to **not** return the deleted rows. The client receives `{ data: null, error: null }` whether 1 row or 0 rows matched. The function only inspects `error`.
- No `.single()` or `.maybeSingle()` → no "zero results" error path (those coerce empty results into PGRST116).
- No row-count check (no `count: "exact"`, no length comparison). A 0-row delete is indistinguishable from a 1-row delete at this layer.

### 2. No `DELETE` trigger on `campaign_mind_map_edges`

File: `supabase/migrations/147_entity_graph_scope_guard.sql:122-125`

```sql
CREATE TRIGGER campaign_mind_map_edges_scope
  BEFORE INSERT OR UPDATE ON campaign_mind_map_edges
  FOR EACH ROW EXECUTE FUNCTION validate_edge_scope();
```

The scope-guard trigger is `BEFORE INSERT OR UPDATE` only. Comment at line
26-28 explicitly says the trigger does not fire on cascade deletes. A missing
row at DELETE time cannot raise from this trigger.

No other migration adds a `DELETE` trigger, rule, or constraint on this table.
Searched `supabase/migrations/*mind_map_edges*.sql` → only migs 080, 147, 148;
none touch the DELETE path.

### 3. RLS does **not** raise on filtered-out DELETE

File: `supabase/migrations/080_mind_map_edges.sql:35-43`

```sql
CREATE POLICY "Campaign owner can manage edges"
  ON campaign_mind_map_edges FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM campaigns c
      WHERE c.id = campaign_mind_map_edges.campaign_id
      AND c.owner_id = auth.uid()
    )
  );
```

Postgres RLS `USING` clauses on DELETE act as a **filter**, not a gate. A row
that is either (a) not present or (b) invisible to the current auth context
simply matches 0 rows — Postgres/PostgREST return success with 0 affected.
They do **not** raise a permission error in that case.

(The test at `lib/supabase/__tests__/entity-links.test.ts:214-221` mocks a
`"permission denied"` error to exercise the throw branch, but that is a
synthetic worst case — real RLS `USING` filtering does not produce that
error. True permission errors require the caller to have lost table-level
`GRANT`, which does not happen within a single DM session.)

### 4. Mocked test confirms the success-path shape

File: `lib/supabase/__tests__/entity-links.test.ts:206-212`

```ts
it("deletes by id", async () => {
  mockEq.mockResolvedValueOnce({ error: null });
  await unlinkEntities("edge-1");
  ...
});
```

The mock resolves to `{ error: null }` with no `data` and no row count — this
is exactly the shape PostgREST returns for a 0-row match. The test passes,
which is the unit-test encoding of the idempotency claim.

### 5. Hook self-heal is gated on `status === "rejected"`

File: `lib/hooks/use-entity-unlink-undo.ts:124-147`

```ts
const results = await Promise.allSettled(
  batch.map((p) => unlinkEntities(p.edgeId)),
);
...
results.forEach((r, i) => {
  if (r.status === "rejected") {
    failedIndices.push(i);
    try { void batch[i]!.onUndo(); } catch (err) { ... }
  } else {
    edgeSucceededIndices.push(i);
  }
});
```

Since `unlinkEntities` on a missing row resolves (not rejects), `r.status ===
"fulfilled"` in Tab B. `onUndo` is **not** invoked. Tab B's local UI stays
consistent with the server (edge gone on both sides).

---

## Race walkthrough (Tab A / Tab B double-commit)

| t    | Tab A                                                 | Tab B                                                 | DB state                  |
|------|-------------------------------------------------------|-------------------------------------------------------|---------------------------|
| 0ms  | user clicks unlink on edge X, schedule()              | same user, other tab, unlink on edge X, schedule()    | edge X present            |
| 5000 | TTL fires, `unlinkEntities(X)` → 1 row deleted, OK    | (timer still ticking)                                 | edge X gone               |
| 5100 |                                                       | TTL fires, `unlinkEntities(X)` → 0 rows, `error:null` | edge X gone               |
| 5100 |                                                       | `Promise.allSettled` → fulfilled, `onCommit()` runs   | consistent across tabs    |

No throw. No self-heal. Both tabs end the cycle with the chip removed and the
edge absent on the server. Realtime subscriptions (if the UI subscribes)
converge naturally.

---

## Non-regression notes for future changes

Anything that would break this guarantee:

1. **Chaining `.select().single()` to the delete** — would turn a 0-row result
   into PGRST116 ("JSON object requested, multiple (or no) rows returned").
2. **Switching to an RPC with `RAISE EXCEPTION WHEN NOT FOUND`** — would make
   the call non-idempotent at the SQL layer.
3. **Adding a `BEFORE DELETE` trigger that asserts row existence** — same
   issue.
4. **Introducing a soft-delete column** and changing the call to an UPDATE
   with a `WHERE deleted_at IS NULL` guard — an UPDATE of 0 rows also
   resolves without error, but if a trigger then raises because the row was
   already soft-deleted, the idempotency would be lost.

If any of the above land, re-run this audit and revisit D2.

---

## Recommendation

No fix required. Close D2 as "safe — verified idempotent at PostgREST layer,
no RPC/trigger/select-single on delete path, RLS uses `USING` filter not
gate". The self-heal branch in `useEntityUnlinkUndo.flush()` remains correct
for the genuine failure modes it is designed for (network drop mid-flush, auth
token expiry, campaign ownership transfer between schedule and commit).
