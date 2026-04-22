import { test, expect } from "@playwright/test";
import { getServiceClient } from "../helpers/db";

/**
 * Entity Graph — Location hierarchy cycle guard via API (AC-3b-06).
 *
 * The UI-level cycle prevention is covered by `entity-graph-location-hierarchy`
 * (AC-3b-05: parent dropdown excludes descendants + self). This spec closes the
 * coverage gap for AC-3b-06: *even if* an attacker or a bugged client bypasses
 * the UI and writes directly to `campaign_locations.parent_location_id`, the
 * trigger from migration 146 (`prevent_location_cycle`) MUST reject:
 *
 *   1. Self-parent (A.parent = A)
 *   2. 2-cycle (A→B→A)
 *   3. 3-cycle (A→B→C→A)
 *
 * All three should return Postgres error code `23514` (check_violation) because
 * the trigger raises with `USING ERRCODE = 'check_violation'`.
 *
 * Implementation notes
 * --------------------
 * - Uses the service-role client so the inserts bypass RLS but NOT triggers —
 *   the hierarchy guard runs BEFORE INSERT/UPDATE regardless of role. This is
 *   exactly the "bypass UI" scenario AC-3b-06 guards against.
 * - No browser needed. This spec does not require `NEXT_PUBLIC_E2E_MODE=true`
 *   and can run against any deployment where `SUPABASE_URL` +
 *   `SUPABASE_SERVICE_ROLE_KEY` are set.
 * - Seeds a throwaway campaign + locations, cleans up via ON DELETE CASCADE
 *   on the campaign row.
 *
 * Trigger source of truth: supabase/migrations/146_location_hierarchy_guard.sql
 */

interface SetupState {
  campaignId: string | null;
  ownerId: string | null;
  skipReason: string | null;
  locA: string | null;
  locB: string | null;
  locC: string | null;
}

async function resolveDmUserId(): Promise<string | null> {
  const sb = getServiceClient();
  const email =
    process.env.E2E_DM_EMAIL ||
    process.env.NEXT_PUBLIC_E2E_DM_EMAIL ||
    "dm.primary@test-taverna.com";
  const { data, error } = await sb.auth.admin.listUsers();
  if (error || !data) return null;
  const u = data.users.find((x) => x.email === email);
  return u?.id ?? null;
}

test.describe("P1 — Entity Graph: Location hierarchy cycle guard via API (AC-3b-06)", () => {
  test.setTimeout(60_000);

  const state: SetupState = {
    campaignId: null,
    ownerId: null,
    skipReason: null,
    locA: null,
    locB: null,
    locC: null,
  };

  test.beforeAll(async () => {
    try {
      const sb = getServiceClient();
      const userId = await resolveDmUserId();
      if (!userId) {
        state.skipReason =
          "Could not resolve a DM user for the service client. Set E2E_DM_EMAIL to a seeded account or run scripts/seed-test-accounts.ts.";
        return;
      }
      state.ownerId = userId;
      const { data: camp, error: campErr } = await sb
        .from("campaigns")
        .insert({ owner_id: userId, name: `E2E Cycle Guard ${Date.now()}` })
        .select("id")
        .single();
      if (campErr || !camp) {
        state.skipReason = `Campaign seed failed: ${campErr?.message ?? "no row"}`;
        return;
      }
      state.campaignId = camp.id;

      const { data: locs, error: locErr } = await sb
        .from("campaign_locations")
        .insert([
          { campaign_id: camp.id, name: "Alpha", location_type: "region" },
          { campaign_id: camp.id, name: "Beta", location_type: "city" },
          { campaign_id: camp.id, name: "Gamma", location_type: "building" },
        ])
        .select("id, name");
      if (locErr || !locs || locs.length !== 3) {
        state.skipReason = `Location seed failed: ${locErr?.message ?? "missing rows"}`;
        return;
      }
      state.locA = locs.find((l) => l.name === "Alpha")!.id;
      state.locB = locs.find((l) => l.name === "Beta")!.id;
      state.locC = locs.find((l) => l.name === "Gamma")!.id;
    } catch (err) {
      state.skipReason = `Setup crashed: ${(err as Error).message}`;
    }
  });

  test.afterAll(async () => {
    if (!state.campaignId) return;
    const sb = getServiceClient();
    const { error } = await sb.from("campaigns").delete().eq("id", state.campaignId);
    if (error) console.error(`[e2e cleanup] ${state.campaignId}:`, error);
  });

  test("AC-3b-06a: self-parent is rejected by trigger (A.parent = A)", async () => {
    if (state.skipReason) test.skip(true, state.skipReason);
    const sb = getServiceClient();
    const { error } = await sb
      .from("campaign_locations")
      .update({ parent_location_id: state.locA })
      .eq("id", state.locA);
    expect(error, "self-parent must be rejected").not.toBeNull();
    // Trigger raises with ERRCODE = 'check_violation' (Postgres code 23514).
    expect(error?.code ?? "").toMatch(/23514|check_violation/i);
    expect(`${error?.message ?? ""} ${error?.hint ?? ""}`).toMatch(/own parent|cycle|own self/i);
  });

  test("AC-3b-06b: 2-cycle is rejected by trigger (A→B, then B→A)", async () => {
    if (state.skipReason) test.skip(true, state.skipReason);
    const sb = getServiceClient();
    // Clear any stray parent set by prior tests — defensive against reorder.
    await sb
      .from("campaign_locations")
      .update({ parent_location_id: null })
      .in("id", [state.locA!, state.locB!, state.locC!]);

    // Legal: B.parent = A
    const { error: e1 } = await sb
      .from("campaign_locations")
      .update({ parent_location_id: state.locA })
      .eq("id", state.locB);
    expect(e1, "legal A→B parenting must succeed").toBeNull();

    // Illegal: A.parent = B (would close the cycle)
    const { error: e2 } = await sb
      .from("campaign_locations")
      .update({ parent_location_id: state.locB })
      .eq("id", state.locA);
    expect(e2, "2-cycle must be rejected").not.toBeNull();
    expect(e2?.code ?? "").toMatch(/23514|check_violation/i);
    expect(`${e2?.message ?? ""}`).toMatch(/cycle|ciclo|own parent/i);
  });

  test("AC-3b-06c: 3-cycle is rejected by trigger (A→B→C→A)", async () => {
    if (state.skipReason) test.skip(true, state.skipReason);
    const sb = getServiceClient();
    // Reset and establish a legal chain: A (root) → B → C
    await sb
      .from("campaign_locations")
      .update({ parent_location_id: null })
      .in("id", [state.locA!, state.locB!, state.locC!]);
    const { error: e1 } = await sb
      .from("campaign_locations")
      .update({ parent_location_id: state.locA })
      .eq("id", state.locB);
    expect(e1).toBeNull();
    const { error: e2 } = await sb
      .from("campaign_locations")
      .update({ parent_location_id: state.locB })
      .eq("id", state.locC);
    expect(e2).toBeNull();

    // Illegal: A.parent = C would close the cycle A→B→C→A
    const { error: e3 } = await sb
      .from("campaign_locations")
      .update({ parent_location_id: state.locC })
      .eq("id", state.locA);
    expect(e3, "3-cycle must be rejected").not.toBeNull();
    expect(e3?.code ?? "").toMatch(/23514|check_violation/i);
    expect(`${e3?.message ?? ""}`).toMatch(/cycle|ciclo/i);
  });
});
