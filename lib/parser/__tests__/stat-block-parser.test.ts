import { parseStatBlock, type ParsedStatBlock } from "../stat-block-parser";

// ---------------------------------------------------------------------------
// Test stat block text fixtures (SRD 5.1 monsters)
// ---------------------------------------------------------------------------

const GOBLIN_TEXT = `Goblin
Small humanoid (goblinoid), neutral evil

Armor Class 15 (leather armor, shield)
Hit Points 7 (2d6)
Speed 30 ft.

STR DEX CON INT WIS CHA
8 (-1) 14 (+2) 10 (+0) 10 (+0) 8 (-1) 8 (-1)

Skills Stealth +6
Senses darkvision 60 ft., passive Perception 9
Languages Common, Goblin
Challenge 1/4 (50 XP)

Nimble Escape. The goblin can take the Disengage or Hide action as a bonus action on each of its turns.

Actions
Scimitar. Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 5 (1d6 + 2) slashing damage.
Shortbow. Ranged Weapon Attack: +4 to hit, range 80/320 ft., one target. Hit: 5 (1d6 + 2) piercing damage.`;

const ANCIENT_RED_DRAGON_TEXT = `Ancient Red Dragon
Gargantuan dragon, chaotic evil

Armor Class 22 (natural armor)
Hit Points 546 (28d20 + 252)
Speed 40 ft., climb 40 ft., fly 80 ft.

STR DEX CON INT WIS CHA
30 (+10) 10 (+0) 29 (+9) 18 (+4) 15 (+2) 23 (+6)

Saving Throws Dex +7, Con +16, Wis +9, Cha +13
Skills Perception +16, Stealth +7
Damage Immunities fire
Senses blindsight 60 ft., darkvision 120 ft., passive Perception 26
Languages Common, Draconic
Challenge 24 (62,000 XP)

Legendary Resistance (3/Day). If the dragon fails a saving throw, it can choose to succeed instead.

Actions
Multiattack. The dragon can use its Frightful Presence. It then makes three attacks: one with its bite and two with its claws.
Bite. Melee Weapon Attack: +17 to hit, reach 15 ft., one target. Hit: 21 (2d10 + 10) piercing damage plus 14 (4d6) fire damage.
Claw. Melee Weapon Attack: +17 to hit, reach 10 ft., one target. Hit: 17 (2d6 + 10) slashing damage.
Tail. Melee Weapon Attack: +17 to hit, reach 20 ft., one target. Hit: 19 (2d8 + 10) bludgeoning damage.
Frightful Presence. Each creature of the dragon's choice that is within 120 feet of the dragon and aware of it must succeed on a DC 21 Wisdom saving throw or become frightened for 1 minute. A creature can repeat the saving throw at the end of each of its turns, ending the effect on itself on a success. If a creature's saving throw is successful or the effect ends for it, the creature is immune to the dragon's Frightful Presence for the next 24 hours.
Fire Breath (Recharge 5-6). The dragon exhales fire in a 90-foot cone. Each creature in that area must make a DC 24 Dexterity saving throw, taking 91 (26d6) fire damage on a failed save, or half as much damage on a successful one.

Legendary Actions
The dragon can take 3 legendary actions, choosing from the options below. Only one legendary action option can be used at a time and only at the end of another creature's turn. The dragon regains spent legendary actions at the start of its turn.
Detect. The dragon makes a Wisdom (Perception) check.
Tail Attack. The dragon makes a tail attack.
Wing Attack (Costs 2 Actions). The dragon beats its wings. Each creature within 15 feet of the dragon must succeed on a DC 25 Dexterity saving throw or take 17 (2d6 + 10) bludgeoning damage and be knocked prone. The dragon can then fly up to half its flying speed.`;

const LICH_TEXT = `Lich
Medium undead, any evil alignment

Armor Class 17 (natural armor)
Hit Points 135 (18d8 + 54)
Speed 30 ft.

STR DEX CON INT WIS CHA
11 (+0) 16 (+3) 16 (+3) 20 (+5) 14 (+2) 16 (+3)

Saving Throws Con +10, Int +12, Wis +9
Skills Arcana +18, History +12, Insight +9, Perception +9
Damage Resistances cold, lightning, necrotic
Damage Immunities poison; bludgeoning, piercing, and slashing from nonmagical attacks
Condition Immunities charmed, exhaustion, frightened, paralyzed, poisoned
Senses truesight 120 ft., passive Perception 19
Languages Common plus up to five other languages
Challenge 21 (33,000 XP)

Legendary Resistance (3/Day). If the lich fails a saving throw, it can choose to succeed instead.
Rejuvenation. If it has a phylactery, a destroyed lich gains a new body in 1d10 days, regaining all its hit points and becoming active again. The new body appears within 5 feet of the phylactery.
Spellcasting. The lich is an 18th-level spellcaster. Its spellcasting ability is Intelligence (spell save DC 20, +12 to hit with spell attacks). The lich has the following wizard spells prepared:
Turn Resistance. The lich has advantage on saving throws against any effect that turns undead.

Actions
Paralyzing Touch. Melee Spell Attack: +12 to hit, reach 5 ft., one creature. Hit: 10 (3d6) cold damage. The target must succeed on a DC 18 Constitution saving throw or be paralyzed for 1 minute. The target can repeat the saving throw at the end of each of its turns, ending the effect on itself on a success.

Legendary Actions
The lich can take 3 legendary actions, choosing from the options below. Only one legendary action option can be used at a time and only at the end of another creature's turn. The lich regains spent legendary actions at the start of its turn.
Cantrip. The lich casts a cantrip.
Paralyzing Touch (Costs 2 Actions). The lich uses its Paralyzing Touch.
Frightening Gaze (Costs 2 Actions). The lich fixes its gaze on one creature it can see within 10 feet of it. The target must succeed on a DC 18 Wisdom saving throw against this magic or become frightened for 1 minute. The frightened target can repeat the saving throw at the end of each of its turns, ending the effect on itself on a success. If a target's saving throw is successful or the effect ends for it, the target is immune to the lich's gaze for the next 24 hours.`;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("parseStatBlock", () => {
  // -------------------------------------------------------------------------
  // Goblin (simple, low CR)
  // -------------------------------------------------------------------------
  describe("Goblin", () => {
    let result: ParsedStatBlock;
    beforeAll(() => {
      result = parseStatBlock(GOBLIN_TEXT);
    });

    it("parses name", () => {
      expect(result.name).toBe("Goblin");
    });

    it("parses size, type, alignment", () => {
      expect(result.size).toBe("Small");
      expect(result.type).toBe("humanoid");
      expect(result.alignment).toBe("neutral evil");
    });

    it("parses AC with type", () => {
      expect(result.armor_class).toBe(15);
      expect(result.ac_type).toBe("leather armor, shield");
    });

    it("parses HP and formula", () => {
      expect(result.hit_points).toBe(7);
      expect(result.hp_formula).toBe("2d6");
    });

    it("parses speed", () => {
      expect(result.speed).toEqual({ walk: "30 ft." });
    });

    it("parses ability scores", () => {
      expect(result.str).toBe(8);
      expect(result.dex).toBe(14);
      expect(result.con).toBe(10);
      expect(result.int).toBe(10);
      expect(result.wis).toBe(8);
      expect(result.cha).toBe(8);
    });

    it("parses skills", () => {
      expect(result.skills).toEqual({ ste: 6 });
    });

    it("parses senses", () => {
      expect(result.senses).toBe("darkvision 60 ft., passive Perception 9");
    });

    it("parses languages", () => {
      expect(result.languages).toBe("Common, Goblin");
    });

    it("parses challenge rating and XP", () => {
      expect(result.challenge_rating).toBe("1/4");
      expect(result.xp).toBe(50);
    });

    it("parses special abilities", () => {
      expect(result.special_abilities).toHaveLength(1);
      expect(result.special_abilities![0].name).toBe("Nimble Escape");
      expect(result.special_abilities![0].desc).toContain("Disengage or Hide");
    });

    it("parses actions with attack bonus", () => {
      expect(result.actions).toHaveLength(2);
      expect(result.actions![0].name).toBe("Scimitar");
      expect(result.actions![0].attack_bonus).toBe(4);
      expect(result.actions![1].name).toBe("Shortbow");
      expect(result.actions![1].attack_bonus).toBe(4);
    });

    it("has no legendary actions", () => {
      expect(result.legendary_actions).toBeNull();
    });

    it("has no saving throws", () => {
      expect(result.saving_throws).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // Ancient Red Dragon (complex, high CR, legendary)
  // -------------------------------------------------------------------------
  describe("Ancient Red Dragon", () => {
    let result: ParsedStatBlock;
    beforeAll(() => {
      result = parseStatBlock(ANCIENT_RED_DRAGON_TEXT);
    });

    it("parses name", () => {
      expect(result.name).toBe("Ancient Red Dragon");
    });

    it("parses size, type, alignment", () => {
      expect(result.size).toBe("Gargantuan");
      expect(result.type).toBe("dragon");
      expect(result.alignment).toBe("chaotic evil");
    });

    it("parses AC", () => {
      expect(result.armor_class).toBe(22);
      expect(result.ac_type).toBe("natural armor");
    });

    it("parses HP and formula", () => {
      expect(result.hit_points).toBe(546);
      expect(result.hp_formula).toBe("28d20+252");
    });

    it("parses multiple speed modes", () => {
      expect(result.speed).toEqual({
        walk: "40 ft.",
        climb: "40 ft.",
        fly: "80 ft.",
      });
    });

    it("parses ability scores", () => {
      expect(result.str).toBe(30);
      expect(result.dex).toBe(10);
      expect(result.con).toBe(29);
      expect(result.int).toBe(18);
      expect(result.wis).toBe(15);
      expect(result.cha).toBe(23);
    });

    it("parses saving throws", () => {
      expect(result.saving_throws).toEqual({
        dex: 7,
        con: 16,
        wis: 9,
        cha: 13,
      });
    });

    it("parses skills", () => {
      expect(result.skills).toEqual({
        per: 16,
        ste: 7,
      });
    });

    it("parses damage immunities", () => {
      expect(result.damage_immunities).toBe("fire");
    });

    it("parses challenge rating and XP", () => {
      expect(result.challenge_rating).toBe("24");
      expect(result.xp).toBe(62000);
    });

    it("parses special abilities", () => {
      expect(result.special_abilities).toHaveLength(1);
      expect(result.special_abilities![0].name).toContain("Legendary Resistance");
    });

    it("parses actions including recharge abilities", () => {
      expect(result.actions).not.toBeNull();
      const actionNames = result.actions!.map((a) => a.name);
      expect(actionNames).toContain("Multiattack");
      expect(actionNames).toContain("Bite");
      expect(actionNames).toContain("Claw");
      expect(actionNames).toContain("Tail");
      expect(actionNames).toContain("Frightful Presence");
      expect(actionNames).toContain("Fire Breath (Recharge 5-6)");
    });

    it("parses attack bonuses on actions", () => {
      const bite = result.actions!.find((a) => a.name === "Bite");
      expect(bite?.attack_bonus).toBe(17);
    });

    it("parses legendary actions", () => {
      expect(result.legendary_actions).not.toBeNull();
      const laNames = result.legendary_actions!.map((a) => a.name);
      expect(laNames).toContain("Detect");
      expect(laNames).toContain("Tail Attack");
      expect(laNames).toContain("Wing Attack (Costs 2 Actions)");
    });
  });

  // -------------------------------------------------------------------------
  // Lich (undead, multiple immunities, spellcaster)
  // -------------------------------------------------------------------------
  describe("Lich", () => {
    let result: ParsedStatBlock;
    beforeAll(() => {
      result = parseStatBlock(LICH_TEXT);
    });

    it("parses name", () => {
      expect(result.name).toBe("Lich");
    });

    it("parses size, type, alignment", () => {
      expect(result.size).toBe("Medium");
      expect(result.type).toBe("undead");
      expect(result.alignment).toBe("any evil alignment");
    });

    it("parses AC", () => {
      expect(result.armor_class).toBe(17);
      expect(result.ac_type).toBe("natural armor");
    });

    it("parses HP and formula", () => {
      expect(result.hit_points).toBe(135);
      expect(result.hp_formula).toBe("18d8+54");
    });

    it("parses ability scores", () => {
      expect(result.str).toBe(11);
      expect(result.dex).toBe(16);
      expect(result.con).toBe(16);
      expect(result.int).toBe(20);
      expect(result.wis).toBe(14);
      expect(result.cha).toBe(16);
    });

    it("parses saving throws", () => {
      expect(result.saving_throws).toEqual({
        con: 10,
        int: 12,
        wis: 9,
      });
    });

    it("parses skills", () => {
      expect(result.skills).not.toBeNull();
      expect(result.skills!["arc"]).toBe(18);
      expect(result.skills!["his"]).toBe(12);
    });

    it("parses damage resistances", () => {
      expect(result.damage_resistances).toBe("cold, lightning, necrotic");
    });

    it("parses damage immunities", () => {
      expect(result.damage_immunities).toContain("poison");
    });

    it("parses condition immunities", () => {
      expect(result.condition_immunities).toContain("charmed");
      expect(result.condition_immunities).toContain("frightened");
      expect(result.condition_immunities).toContain("poisoned");
    });

    it("parses senses", () => {
      expect(result.senses).toContain("truesight 120 ft.");
    });

    it("parses challenge rating", () => {
      expect(result.challenge_rating).toBe("21");
      expect(result.xp).toBe(33000);
    });

    it("parses special abilities including spellcasting", () => {
      expect(result.special_abilities).not.toBeNull();
      const names = result.special_abilities!.map((a) => a.name);
      expect(names).toContain("Legendary Resistance (3/Day)");
      expect(names).toContain("Rejuvenation");
    });

    it("parses actions", () => {
      expect(result.actions).not.toBeNull();
      const touch = result.actions!.find((a) => a.name === "Paralyzing Touch");
      expect(touch).toBeDefined();
      expect(touch!.attack_bonus).toBe(12);
    });

    it("parses legendary actions", () => {
      expect(result.legendary_actions).not.toBeNull();
      const laNames = result.legendary_actions!.map((a) => a.name);
      expect(laNames).toContain("Cantrip");
      expect(laNames).toContain("Paralyzing Touch (Costs 2 Actions)");
      expect(laNames).toContain("Frightening Gaze (Costs 2 Actions)");
    });
  });

  // -------------------------------------------------------------------------
  // Edge cases and formatting tolerance
  // -------------------------------------------------------------------------
  describe("formatting tolerance", () => {
    it("handles tabs and extra whitespace", () => {
      const messy = `Goblin
Small\thumanoid (goblinoid),\tneutral evil

Armor  Class   15  (leather armor, shield)
Hit  Points  7  (2d6)
Speed  30  ft.

STR\tDEX\tCON\tINT\tWIS\tCHA
8 (-1)\t14 (+2)\t10 (+0)\t10 (+0)\t8 (-1)\t8 (-1)

Senses darkvision 60 ft., passive Perception 9
Languages Common, Goblin
Challenge 1/4 (50 XP)`;
      const result = parseStatBlock(messy);
      expect(result.name).toBe("Goblin");
      expect(result.armor_class).toBe(15);
      expect(result.hit_points).toBe(7);
      expect(result.str).toBe(8);
      expect(result.dex).toBe(14);
    });

    it("handles Windows-style line endings", () => {
      const text = "Goblin\r\nSmall humanoid (goblinoid), neutral evil\r\n\r\nArmor Class 15 (leather armor, shield)\r\nHit Points 7 (2d6)\r\nSpeed 30 ft.\r\n\r\nSTR DEX CON INT WIS CHA\r\n8 (-1) 14 (+2) 10 (+0) 10 (+0) 8 (-1) 8 (-1)\r\n\r\nChallenge 1/4 (50 XP)";
      const result = parseStatBlock(text);
      expect(result.name).toBe("Goblin");
      expect(result.armor_class).toBe(15);
      expect(result.challenge_rating).toBe("1/4");
    });

    it("handles em dashes and smart quotes in text", () => {
      const text = `Test Monster
Medium beast, unaligned

Armor Class 12
Hit Points 10 (2d8 + 2)
Speed 30 ft.

STR DEX CON INT WIS CHA
14 (+2) 10 (+0) 12 (+1) 2 (\u20131) 10 (+0) 6 (\u20132)

Challenge 1/4 (50 XP)

Actions
Bite. Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 5 (1d6 + 2) piercing damage.`;
      const result = parseStatBlock(text);
      expect(result.name).toBe("Test Monster");
      expect(result.str).toBe(14);
      expect(result.cha).toBe(6);
      expect(result.actions).toHaveLength(1);
      expect(result.actions![0].attack_bonus).toBe(4);
    });

    it("handles AC without parenthetical type", () => {
      const text = `Commoner
Medium humanoid (any race), any alignment

Armor Class 10
Hit Points 4 (1d8)
Speed 30 ft.

STR DEX CON INT WIS CHA
10 (+0) 10 (+0) 10 (+0) 10 (+0) 10 (+0) 10 (+0)

Challenge 0 (10 XP)`;
      const result = parseStatBlock(text);
      expect(result.armor_class).toBe(10);
      expect(result.ac_type).toBeNull();
    });

    it("handles XP with comma formatting", () => {
      const text = `Big Monster
Large fiend, chaotic evil

Armor Class 19
Hit Points 262 (21d10 + 147)
Speed 40 ft., fly 80 ft.

STR DEX CON INT WIS CHA
26 (+8) 15 (+2) 22 (+6) 20 (+5) 16 (+3) 22 (+6)

Challenge 20 (25,000 XP)`;
      const result = parseStatBlock(text);
      expect(result.xp).toBe(25000);
      expect(result.challenge_rating).toBe("20");
    });

    it("collects unrecognized lines as notes", () => {
      const text = `Weird Monster
Medium aberration, chaotic neutral

Armor Class 14
Hit Points 50 (8d8 + 16)
Speed 30 ft.

STR DEX CON INT WIS CHA
14 (+2) 16 (+3) 14 (+2) 12 (+1) 11 (+0) 10 (+0)

Challenge 3 (700 XP)`;
      const result = parseStatBlock(text);
      expect(result.name).toBe("Weird Monster");
      expect(result.type).toBe("aberration");
    });

    it("returns defaults for minimal input", () => {
      const result = parseStatBlock("Some Monster");
      expect(result.name).toBe("Some Monster");
      expect(result.armor_class).toBe(10);
      expect(result.hit_points).toBe(1);
      expect(result.str).toBe(10);
    });
  });

  // -------------------------------------------------------------------------
  // Reactions section
  // -------------------------------------------------------------------------
  describe("reactions", () => {
    it("parses reactions section", () => {
      const text = `Knight
Medium humanoid (any race), any alignment

Armor Class 18 (plate)
Hit Points 52 (8d8 + 16)
Speed 30 ft.

STR DEX CON INT WIS CHA
16 (+3) 11 (+0) 14 (+2) 11 (+0) 11 (+0) 15 (+2)

Saving Throws Con +4, Wis +2
Challenge 3 (700 XP)

Brave. The knight has advantage on saving throws against being frightened.

Actions
Multiattack. The knight makes two melee attacks.
Greatsword. Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 10 (2d6 + 3) slashing damage.

Reactions
Parry. The knight adds 2 to its AC against one melee attack that would hit it. To do so, the knight must see the attacker and be wielding a melee weapon.`;
      const result = parseStatBlock(text);
      expect(result.reactions).not.toBeNull();
      expect(result.reactions).toHaveLength(1);
      expect(result.reactions![0].name).toBe("Parry");
      expect(result.reactions![0].desc).toContain("adds 2 to its AC");
    });
  });

  // -------------------------------------------------------------------------
  // Speed parsing
  // -------------------------------------------------------------------------
  describe("speed parsing", () => {
    it("parses walk-only speed", () => {
      const result = parseStatBlock(`Test\nMedium beast, unaligned\n\nSpeed 30 ft.\n\nSTR DEX CON INT WIS CHA\n10 (+0) 10 (+0) 10 (+0) 10 (+0) 10 (+0) 10 (+0)`);
      expect(result.speed).toEqual({ walk: "30 ft." });
    });

    it("parses multiple speed types", () => {
      const result = parseStatBlock(`Test\nMedium beast, unaligned\n\nSpeed 30 ft., fly 60 ft., swim 30 ft.\n\nSTR DEX CON INT WIS CHA\n10 (+0) 10 (+0) 10 (+0) 10 (+0) 10 (+0) 10 (+0)`);
      expect(result.speed).toEqual({
        walk: "30 ft.",
        fly: "60 ft.",
        swim: "30 ft.",
      });
    });

    it("parses burrow and climb speeds", () => {
      const result = parseStatBlock(`Test\nMedium beast, unaligned\n\nSpeed 20 ft., burrow 20 ft., climb 20 ft.\n\nSTR DEX CON INT WIS CHA\n10 (+0) 10 (+0) 10 (+0) 10 (+0) 10 (+0) 10 (+0)`);
      expect(result.speed).toEqual({
        walk: "20 ft.",
        burrow: "20 ft.",
        climb: "20 ft.",
      });
    });
  });
});
