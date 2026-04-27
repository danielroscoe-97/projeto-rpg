import {
  QUICK_ACTIONS,
  ACTION_PREFIX,
  AUTO_EXPIRE_ON_NEXT_TURN,
  isQuickAction,
  getQuickActionKind,
  formatQuickAction,
  stripExpiringQuickActions,
  stripAllQuickActions,
  isQuickActionSelfAppliable,
  isPlayerForbiddenCondition,
} from "./quick-actions";

describe("Quick actions helper", () => {
  describe("QUICK_ACTIONS catalogue", () => {
    it("contains exactly Dodge and Ready (Dash/Help/Disengage/Hide are narrative-only)", () => {
      expect([...QUICK_ACTIONS].sort()).toEqual(["dodge", "ready"].sort());
    });

    it("only `dodge` auto-expires on next turn (RAW)", () => {
      expect(AUTO_EXPIRE_ON_NEXT_TURN.has("dodge")).toBe(true);
      expect(AUTO_EXPIRE_ON_NEXT_TURN.has("ready")).toBe(false);
    });
  });

  describe("isQuickAction / getQuickActionKind", () => {
    it("recognises every `action:<kind>` in the trimmed catalogue", () => {
      for (const kind of QUICK_ACTIONS) {
        const str = `${ACTION_PREFIX}${kind}`;
        expect(isQuickAction(str)).toBe(true);
        expect(getQuickActionKind(str)).toBe(kind);
      }
    });

    it("rejects dropped `action:*` kinds (Dash/Help/Disengage/Hide)", () => {
      for (const dropped of ["action:dash", "action:help", "action:disengage", "action:hide"]) {
        expect(isQuickAction(dropped)).toBe(false);
        expect(getQuickActionKind(dropped)).toBeNull();
      }
    });

    it("rejects unknown `action:*` kinds", () => {
      expect(isQuickAction("action:teleport")).toBe(false);
      expect(getQuickActionKind("action:teleport")).toBeNull();
    });

    it("does NOT collide with `concentrating:Fireball`", () => {
      expect(isQuickAction("concentrating:Fireball")).toBe(false);
      expect(getQuickActionKind("concentrating:Fireball")).toBeNull();
    });

    it("does NOT collide with `custom:Name|Desc`", () => {
      expect(isQuickAction("custom:Bless|Abençoado")).toBe(false);
      expect(getQuickActionKind("custom:Bless|Abençoado")).toBeNull();
    });

    it("does NOT collide with SRD / beneficial conditions", () => {
      for (const c of ["Stunned", "Prone", "Blessed", "Haste"]) {
        expect(isQuickAction(c)).toBe(false);
        expect(getQuickActionKind(c)).toBeNull();
      }
    });
  });

  describe("formatQuickAction", () => {
    it("produces the canonical `action:<kind>` string", () => {
      expect(formatQuickAction("dodge")).toBe("action:dodge");
      expect(formatQuickAction("ready")).toBe("action:ready");
    });
  });

  describe("stripExpiringQuickActions — Dodge-only RAW cleanup", () => {
    it("removes `action:dodge` from the conditions array", () => {
      const input = ["action:dodge", "Prone"];
      expect(stripExpiringQuickActions(input)).toEqual(["Prone"]);
    });

    it("PRESERVES Ready across turn advance", () => {
      const input = ["action:ready"];
      expect(stripExpiringQuickActions(input)).toEqual(input);
    });

    it("PRESERVES legacy `action:*` rows (Dash/Help/Disengage/Hide) — they are unknown kinds now and pass through untouched, matching the unknown-kind branch", () => {
      // The four dropped kinds no longer match `isQuickAction`, so they are
      // treated as unknown `action:*` strings and preserved by the filter.
      // This guarantees combatants persisted before the trim keep their
      // condition rows intact (no destructive migration).
      const input = ["action:dash", "action:help", "action:disengage", "action:hide"];
      expect(stripExpiringQuickActions(input)).toEqual(input);
    });

    it("removes ONLY dodge when dodge + ready coexist", () => {
      const input = ["action:dodge", "action:ready", "Blessed", "Stunned"];
      expect(stripExpiringQuickActions(input)).toEqual([
        "action:ready",
        "Blessed",
        "Stunned",
      ]);
    });

    it("is a no-op when no quick actions are present", () => {
      const input = ["Stunned", "concentrating:Bless", "custom:Aura|Holy"];
      expect(stripExpiringQuickActions(input)).toEqual(input);
    });

    it("ignores unknown `action:*` kinds (they pass through untouched)", () => {
      const input = ["action:teleport", "action:dodge"];
      expect(stripExpiringQuickActions(input)).toEqual(["action:teleport"]);
    });
  });

  describe("stripAllQuickActions", () => {
    it("removes only known `action:*` entries — legacy unknown kinds are preserved", () => {
      // After the trim, `action:dash` is no longer a known kind, so it is
      // preserved by `isQuickAction === false`. Only `action:dodge` and
      // `action:ready` are stripped because only those two match the
      // current catalogue.
      const input = ["action:dodge", "action:dash", "Prone"];
      expect(stripAllQuickActions(input)).toEqual(["action:dash", "Prone"]);
    });
  });

  describe("self-apply allowlist guards", () => {
    it("accepts every quick action in the trimmed catalogue", () => {
      for (const kind of QUICK_ACTIONS) {
        expect(isQuickActionSelfAppliable(`${ACTION_PREFIX}${kind}`)).toBe(true);
      }
    });

    it("rejects dropped kinds (Dash/Help/Disengage/Hide) via isQuickActionSelfAppliable", () => {
      for (const dropped of ["action:dash", "action:help", "action:disengage", "action:hide"]) {
        expect(isQuickActionSelfAppliable(dropped)).toBe(false);
      }
    });

    it("rejects unknown kinds via isQuickActionSelfAppliable", () => {
      expect(isQuickActionSelfAppliable("action:teleport")).toBe(false);
      expect(isQuickActionSelfAppliable("Stunned")).toBe(false);
    });

    it("flags `custom:*` as forbidden for players (H11 DM-only)", () => {
      expect(isPlayerForbiddenCondition("custom:Bless|Abençoado")).toBe(true);
      expect(isPlayerForbiddenCondition("custom:Anything")).toBe(true);
    });

    it("does NOT flag non-custom strings", () => {
      expect(isPlayerForbiddenCondition("action:dodge")).toBe(false);
      expect(isPlayerForbiddenCondition("Blessed")).toBe(false);
      expect(isPlayerForbiddenCondition("concentrating:Bless")).toBe(false);
    });
  });
});
