/**
 * S1.2 — Tests for `lib/flags.ts` env-driven feature flag framework.
 */

import { isFeatureFlagEnabled, setFeatureFlagOverrideForTests } from "./flags";

describe("lib/flags — isFeatureFlagEnabled", () => {
  afterEach(() => {
    // Reset runtime overrides between tests.
    setFeatureFlagOverrideForTests("ff_combatant_add_reorder", undefined);
    setFeatureFlagOverrideForTests("ff_hp_thresholds_v2", undefined);
    setFeatureFlagOverrideForTests("ff_custom_conditions_v1", undefined);
    // Don't mutate process.env in a way that sticks across tests.
    delete (process.env as Record<string, string | undefined>)["NEXT_PUBLIC_FF_COMBATANT_ADD_REORDER"];
  });

  test("defaults ff_combatant_add_reorder to true (beta 4 rollout)", () => {
    expect(isFeatureFlagEnabled("ff_combatant_add_reorder")).toBe(true);
  });

  test("defaults ff_favorites_v1 to false (pending shared-state refactor)", () => {
    expect(isFeatureFlagEnabled("ff_favorites_v1")).toBe(false);
  });

  test("runtime override takes precedence over default", () => {
    setFeatureFlagOverrideForTests("ff_combatant_add_reorder", true);
    expect(isFeatureFlagEnabled("ff_combatant_add_reorder")).toBe(true);
  });

  test("env var enables flag when set to truthy value", () => {
    (process.env as Record<string, string | undefined>)["NEXT_PUBLIC_FF_COMBATANT_ADD_REORDER"] = "1";
    expect(isFeatureFlagEnabled("ff_combatant_add_reorder")).toBe(true);
  });

  test("env var with 'true' string is parsed as truthy", () => {
    (process.env as Record<string, string | undefined>)["NEXT_PUBLIC_FF_COMBATANT_ADD_REORDER"] = "true";
    expect(isFeatureFlagEnabled("ff_combatant_add_reorder")).toBe(true);
  });

  test("env var with 'false' string overrides truthy default", () => {
    (process.env as Record<string, string | undefined>)["NEXT_PUBLIC_FF_COMBATANT_ADD_REORDER"] = "false";
    expect(isFeatureFlagEnabled("ff_combatant_add_reorder")).toBe(false);
  });

  test("runtime override beats env var", () => {
    (process.env as Record<string, string | undefined>)["NEXT_PUBLIC_FF_COMBATANT_ADD_REORDER"] = "1";
    setFeatureFlagOverrideForTests("ff_combatant_add_reorder", false);
    expect(isFeatureFlagEnabled("ff_combatant_add_reorder")).toBe(false);
  });

  test("setFeatureFlagOverrideForTests(undefined) clears the override", () => {
    setFeatureFlagOverrideForTests("ff_combatant_add_reorder", false);
    expect(isFeatureFlagEnabled("ff_combatant_add_reorder")).toBe(false);
    setFeatureFlagOverrideForTests("ff_combatant_add_reorder", undefined);
    // back to default, which flipped to true in beta 4
    expect(isFeatureFlagEnabled("ff_combatant_add_reorder")).toBe(true);
  });
});
