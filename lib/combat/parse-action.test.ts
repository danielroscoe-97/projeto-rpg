import { describe, it, expect } from "vitest";
import { parseMonsterAction, parseAllActions } from "./parse-action";
import type { ParsedAction } from "@/lib/types/combat";

describe("parseMonsterAction", () => {
  // --- Attack patterns ---

  it("parses simple melee attack (Owlbear Rend)", () => {
    const result = parseMonsterAction({
      name: "Rend",
      desc: "Melee Attack: +7, reach 5 ft. 14 (2d8 + 5) Slashing damage.",
    });
    expect(result.type).toBe("attack");
    expect(result.attackBonus).toBe(7);
    expect(result.attackType).toBe("melee");
    expect(result.reach).toBe("5 ft.");
    expect(result.damages).toEqual([
      { dice: "2d8+5", avgDamage: 14, type: "Slashing" },
    ]);
  });

  it("parses ranged attack (Goblin Shortbow)", () => {
    const result = parseMonsterAction({
      name: "Shortbow",
      desc: "Ranged Attack: +4, range 80/320 ft. 5 (1d6 + 2) Piercing damage, plus 2 (1d4) Piercing damage if the attack roll had Advantage.",
    });
    expect(result.type).toBe("attack");
    expect(result.attackBonus).toBe(4);
    expect(result.attackType).toBe("ranged");
    expect(result.range).toBe("80/320 ft.");
    expect(result.damages.length).toBeGreaterThanOrEqual(1);
    expect(result.damages[0]).toEqual({
      dice: "1d6+2", avgDamage: 5, type: "Piercing",
    });
  });

  it("parses melee or ranged attack (Demilich Necrotic Burst)", () => {
    const result = parseMonsterAction({
      name: "Necrotic Burst",
      desc: "Melee or Ranged Attack: +11, reach 5 ft. or range 120 ft. 24 (7d6) Necrotic damage.",
    });
    expect(result.type).toBe("attack");
    expect(result.attackBonus).toBe(11);
    expect(result.attackType).toBe("melee_or_ranged");
    expect(result.reach).toBe("5 ft.");
    expect(result.range).toBe("120 ft.");
    expect(result.damages).toEqual([
      { dice: "7d6", avgDamage: 24, type: "Necrotic" },
    ]);
  });

  it("parses multi-damage attack (Adult Red Dragon Rend)", () => {
    const result = parseMonsterAction({
      name: "Rend",
      desc: "Melee Attack: +14, reach 10 ft. 13 (1d10 + 8) Slashing damage plus 5 (2d4) Fire damage.",
    });
    expect(result.type).toBe("attack");
    expect(result.attackBonus).toBe(14);
    expect(result.damages).toHaveLength(2);
    expect(result.damages[0]).toEqual({ dice: "1d10+8", avgDamage: 13, type: "Slashing" });
    expect(result.damages[1]).toEqual({ dice: "2d4", avgDamage: 5, type: "Fire" });
  });

  it("parses attack with condition (Hill Giant Tree Club -> Prone)", () => {
    const result = parseMonsterAction({
      name: "Tree Club",
      desc: "Melee Attack: +8, reach 10 ft. 18 (3d8 + 5) Bludgeoning damage. If the target is a Large or smaller creature, it has the Prone condition.",
    });
    expect(result.type).toBe("attack");
    expect(result.conditionsApplied).toContain("Prone");
  });

  it("parses attack with Grappled condition (Aboleth Tentacle)", () => {
    const result = parseMonsterAction({
      name: "Tentacle",
      desc: "Melee Attack: +9, reach 15 ft. 12 (2d6 + 5) Bludgeoning damage. If the target is a Large or smaller creature, it has the Grappled condition (escape DC 14) from one of four tentacles.",
    });
    expect(result.type).toBe("attack");
    expect(result.attackBonus).toBe(9);
    expect(result.conditionsApplied).toContain("Grappled");
  });

  // --- Save patterns ---

  it("parses save action with half damage (Adult Red Dragon Fire Breath)", () => {
    const result = parseMonsterAction({
      name: "Fire Breath (Recharge 5-6)",
      desc: "dex DC 21, each creature in a 60-foot Cone [Area of Effect]. {@actSaveFail} 59 (17d6) Fire damage. {@actSaveSuccess} Half damage.",
    });
    expect(result.type).toBe("save");
    expect(result.saveDC).toBe(21);
    expect(result.saveAbility).toBe("DEX");
    expect(result.halfOnSave).toBe(true);
    expect(result.damages).toEqual([
      { dice: "17d6", avgDamage: 59, type: "Fire" },
    ]);
  });

  it("parses save action (Demilich Howl)", () => {
    const result = parseMonsterAction({
      name: "Howl (Recharge 5-6)",
      desc: 'con DC 19, each creature in a 30-foot Emanation [Area of Effect] originating from the demilich. {@actSaveFail} 70 (20d6) Psychic damage. {@actSaveSuccessOrFail} The target has the Frightened condition.',
    });
    expect(result.type).toBe("save");
    expect(result.saveDC).toBe(19);
    expect(result.saveAbility).toBe("CON");
    expect(result.damages).toEqual([
      { dice: "20d6", avgDamage: 70, type: "Psychic" },
    ]);
    expect(result.conditionsApplied).toContain("Frightened");
  });

  it("parses save action with psychic damage (Aboleth Consume Memories)", () => {
    const result = parseMonsterAction({
      name: "Consume Memories",
      desc: "int DC 16, one creature within 30 feet that is Charmed or Grappled by the aboleth. {@actSaveFail} 10 (3d6) Psychic damage. {@actSaveSuccess} Half damage.",
    });
    expect(result.type).toBe("save");
    expect(result.saveDC).toBe(16);
    expect(result.saveAbility).toBe("INT");
    expect(result.halfOnSave).toBe(true);
    expect(result.damages).toEqual([
      { dice: "3d6", avgDamage: 10, type: "Psychic" },
    ]);
  });

  it("parses save action with condition only (Giant Spider Web -> Restrained)", () => {
    const result = parseMonsterAction({
      name: "Web (Recharge 5-6)",
      desc: "dex DC 13, one creature the spider can see within 60 feet. {@actSaveFail} The target has the Restrained condition until the web is destroyed.",
    });
    expect(result.type).toBe("save");
    expect(result.saveDC).toBe(13);
    expect(result.saveAbility).toBe("DEX");
    expect(result.conditionsApplied).toContain("Restrained");
  });

  it("parses save action with Stunned condition (Mind Blast)", () => {
    const result = parseMonsterAction({
      name: "Mind Blast (Recharge 5-6)",
      desc: "int DC 15, each creature in a 60-foot Cone [Area of Effect]. {@actSaveFail} 31 (6d8 + 4) Psychic damage, and the target has the Stunned condition until the end of the mind flayer's next turn.",
    });
    expect(result.type).toBe("save");
    expect(result.saveDC).toBe(15);
    expect(result.saveAbility).toBe("INT");
    expect(result.damages).toEqual([
      { dice: "6d8+4", avgDamage: 31, type: "Psychic" },
    ]);
    expect(result.conditionsApplied).toContain("Stunned");
  });

  // --- SRD 2014 format ---

  it("parses SRD 2014 weapon attack", () => {
    const result = parseMonsterAction({
      name: "Longsword",
      desc: "Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 7 (1d8 + 3) Slashing damage.",
    });
    expect(result.type).toBe("attack");
    expect(result.attackBonus).toBe(5);
    expect(result.attackType).toBe("melee");
  });

  it("parses SRD 2014 save format", () => {
    const result = parseMonsterAction({
      name: "Breath Weapon",
      desc: "Each creature in a 30-foot cone must make a DC 15 Dexterity saving throw. A creature takes 45 (13d6) Fire damage on a failed save, or half as much on a success.",
    });
    expect(result.type).toBe("save");
    expect(result.saveDC).toBe(15);
    expect(result.saveAbility).toBe("DEX");
    expect(result.halfOnSave).toBe(true);
  });

  // --- Edge cases ---

  it("parses Multiattack as utility", () => {
    const result = parseMonsterAction({
      name: "Multiattack",
      desc: "The dragon makes three Rend attacks.",
    });
    expect(result.type).toBe("utility");
  });

  it("parses Spellcasting as utility", () => {
    const result = parseMonsterAction({
      name: "Spellcasting",
      desc: "The aarakocra casts one of the following spells, requiring no material components...",
    });
    expect(result.type).toBe("utility");
  });

  it("handles unknown action gracefully", () => {
    const result = parseMonsterAction({
      name: "Weird Ability",
      desc: "The creature does something strange that doesn't match any pattern.",
    });
    expect(result.type).toBe("utility");
    expect(result.rawDesc).toBe("The creature does something strange that doesn't match any pattern.");
    expect(result.damages).toEqual([]);
  });

  it("parses attack with Poisoned condition (Hill Giant Trash Lob)", () => {
    const result = parseMonsterAction({
      name: "Trash Lob",
      desc: "Ranged Attack: +8, range 60/240 ft. 16 (2d10 + 5) Bludgeoning damage, and the target has the Poisoned condition until the end of its next turn.",
    });
    expect(result.type).toBe("attack");
    expect(result.conditionsApplied).toContain("Poisoned");
  });
});

describe("parseAllActions", () => {
  it("parses all action types from a monster", () => {
    const monster = {
      id: "test",
      name: "Test Monster",
      cr: "5",
      type: "beast",
      hit_points: 50,
      armor_class: 15,
      ruleset_version: "2024" as const,
      actions: [
        { name: "Multiattack", desc: "Two attacks." },
        { name: "Bite", desc: "Melee Attack: +5, reach 5 ft. 7 (1d8 + 3) Piercing damage." },
      ],
      legendary_actions: [
        { name: "Tail Sweep", desc: "Melee Attack: +5, reach 10 ft. 9 (2d4 + 4) Bludgeoning damage." },
      ],
    };
    const results = parseAllActions(monster);
    expect(results).toHaveLength(3);
    expect(results[0].type).toBe("utility"); // Multiattack
    expect(results[1].type).toBe("attack"); // Bite
    expect(results[2].type).toBe("attack"); // Tail Sweep
  });
});
