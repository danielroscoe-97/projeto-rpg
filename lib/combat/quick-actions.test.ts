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

describe("S4.3 — quick actions helper", () => {
  describe("QUICK_ACTIONS catalogue", () => {
    it("contains exactly the 6 canonical D&D 5e quick actions", () => {
      expect([...QUICK_ACTIONS].sort()).toEqual(
        ["dash", "disengage", "dodge", "help", "hide", "ready"].sort(),
      );
    });

    it("only `dodge` auto-expires on next turn (RAW)", () => {
      expect(AUTO_EXPIRE_ON_NEXT_TURN.has("dodge")).toBe(true);
      for (const k of ["dash", "disengage", "help", "hide", "ready"] as const) {
        expect(AUTO_EXPIRE_ON_NEXT_TURN.has(k)).toBe(false);
      }
    });
  });

  describe("isQuickAction / getQuickActionKind", () => {
    it("recognises all 6 `action:<kind>` strings", () => {
      for (const kind of QUICK_ACTIONS) {
        const str = `${ACTION_PREFIX}${kind}`;
        expect(isQuickAction(str)).toBe(true);
        expect(getQuickActionKind(str)).toBe(kind);
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

    it("PRESERVES Dash/Help/Disengage/Hide/Ready across turn advance", () => {
      const input = [
        "action:dash",
        "action:help",
        "action:disengage",
        "action:hide",
        "action:ready",
      ];
      expect(stripExpiringQuickActions(input)).toEqual(input);
    });

    it("removes ONLY dodge when dodge + non-expiring coexist", () => {
      const input = ["action:dodge", "action:dash", "Blessed", "Stunned"];
      expect(stripExpiringQuickActions(input)).toEqual([
        "action:dash",
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
    it("removes every `action:*` entry including non-expiring ones", () => {
      const input = ["action:dodge", "action:dash", "Prone"];
      expect(stripAllQuickActions(input)).toEqual(["Prone"]);
    });
  });

  describe("self-apply allowlist guards", () => {
    it("accepts all 6 quick actions via isQuickActionSelfAppliable", () => {
      for (const kind of QUICK_ACTIONS) {
        expect(isQuickActionSelfAppliable(`${ACTION_PREFIX}${kind}`)).toBe(true);
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
