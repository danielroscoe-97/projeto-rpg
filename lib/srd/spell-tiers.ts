/**
 * Spell tier ratings for public pages.
 * S = best-in-slot, E = rarely worth picking.
 * Based on general 5e community consensus — not official rules.
 */

export type SpellTier = "S" | "A" | "B" | "C" | "D" | "E";

export interface TierInfo {
  tier: SpellTier;
  reason: string;
}

export const SPELL_TIERS: Record<string, TierInfo> = {
  // ── S Tier ────────────────────────────────────────────────────────
  "counterspell":       { tier: "S", reason: "Nullifies any enemy spell — the ultimate reactive tool. A must-have for any arcane caster." },
  "wish":               { tier: "S", reason: "The most powerful spell in the game. Replicates any spell level 8 or lower, or bends reality itself." },
  "hypnotic-pattern":   { tier: "S", reason: "Incapacitates an entire group of enemies at once. Concentration, but one of the best crowd-control spells available." },
  "wall-of-force":      { tier: "S", reason: "Impenetrable barrier that can completely isolate enemies or protect the party. Near-impossible to counter." },
  "simulacrum":         { tier: "S", reason: "Creates a functional duplicate of yourself or an ally — effectively doubling your party's power." },
  "polymorph":          { tier: "S", reason: "Transforms a target into any beast. Used offensively to neutralize threats or defensively to save allies." },
  "banishment":         { tier: "S", reason: "Removes a target from the fight entirely. Against extraplanar creatures, it's permanent." },
  "forcecage":          { tier: "S", reason: "Traps any creature with no saving throw. Essentially a win button against single powerful enemies." },
  "plane-shift":        { tier: "S", reason: "Can permanently remove an enemy from the Material Plane. Also the best long-distance travel option." },
  "power-word-kill":    { tier: "S", reason: "Instantly kills any creature below 100 HP — no save, no check." },

  // ── A Tier ────────────────────────────────────────────────────────
  "fireball":           { tier: "A", reason: "The archetypal damage spell. 8d6 fire damage in a huge area makes it reliable throughout most of the game." },
  "haste":              { tier: "A", reason: "Doubles a target's speed, adds +2 AC, and grants an extra action. One of the best single-target buffs." },
  "hold-person":        { tier: "A", reason: "Paralysis makes all melee attacks critical hits. Devastating against humanoid enemies." },
  "misty-step":         { tier: "A", reason: "Bonus action teleportation. Escapes grapples, traps, dangerous positions — endless utility." },
  "bless":              { tier: "A", reason: "Adds 1d4 to attack rolls and saving throws for three creatures. High return for a 1st-level slot." },
  "healing-word":       { tier: "A", reason: "Bonus action heal with long range — lets you contribute damage on your turn while keeping allies alive." },
  "fly":                { tier: "A", reason: "Completely changes movement paradigm. Bypasses most ground-based threats and locks." },
  "greater-invisibility": { tier: "A", reason: "Attacks while invisible grant advantage; being invisible grants disadvantage on enemies. Outstanding offensive buff." },
  "spirit-guardians":   { tier: "A", reason: "Persistent AoE that slows and damages enemies every turn. Excellent for clerics who wade into melee." },
  "shatter":            { tier: "A", reason: "Thunder damage bypasses many resistances. Excellent multi-target damage for a 2nd-level slot." },
  "thunder-step":       { tier: "A", reason: "Teleport and deal AoE damage simultaneously. Great mobility and offense in a single action." },
  "ice-storm":          { tier: "A", reason: "Large AoE that also creates difficult terrain. Slows down entire encounters." },
  "cone-of-cold":       { tier: "A", reason: "Massive cold damage in a wide cone. Excellent burst damage against grouped enemies." },
  "mass-cure-wounds":   { tier: "A", reason: "Heals up to 6 creatures at once — critical in parties that have taken heavy damage." },
  "dimension-door":     { tier: "A", reason: "Long-range teleportation that bypasses most obstacles. Exceptional for escape or infiltration." },

  // ── B Tier ────────────────────────────────────────────────────────
  "magic-missile":      { tier: "B", reason: "Guaranteed damage with no attack roll — reliable but limited output. Excellent against enemies with high AC." },
  "shield":             { tier: "B", reason: "Reaction that grants +5 AC until your next turn. Nearly negates attacks that would have hit." },
  "invisibility":       { tier: "B", reason: "Excellent for scouting and stealth. Concentration ends it when you attack, limiting combat utility." },
  "web":                { tier: "B", reason: "Restrains creatures in a wide area. Strong crowd control but requires concentration." },
  "suggestion":         { tier: "B", reason: "One of the best roleplaying spells — can bypass entire encounters. Limited to one target." },
  "heat-metal":         { tier: "B", reason: "Absolutely dominates armored melee enemies. Drops to D tier against unarmored or ranged foes." },
  "aid":                { tier: "B", reason: "Increases hit points for multiple creatures. Scales well with higher spell slots." },
  "silence":            { tier: "B", reason: "Shuts down verbal-component spellcasters entirely. Situationally excellent, otherwise average." },
  "thunderwave":        { tier: "B", reason: "Knocks enemies back and deals decent AoE damage. Great for 1st-level but falls off quickly." },
  "darkness":           { tier: "B", reason: "Paired with Devil's Sight, it's devastating. Alone, it's more likely to hinder your own party." },
  "dispel-magic":       { tier: "B", reason: "Removes magical effects without a contest. Essential against enemy casters." },
  "slow":               { tier: "B", reason: "Weakens multiple enemies simultaneously — half speed, reduced reactions, and lower AC." },
  "animate-dead":       { tier: "B", reason: "Creates persistent, renewable minions. Powerful in attrition play; manageable action cost." },
  "speak-with-dead":    { tier: "B", reason: "Can extract critical information from corpses. Niche but unmatched in specific situations." },
  "charm-person":       { tier: "B", reason: "Excellent for social encounters. Combat utility is limited to preventing one creature from attacking." },
  "detect-magic":       { tier: "B", reason: "Essential utility for identifying magical items and illusions. Ritual casting makes it free." },

  // ── C Tier ────────────────────────────────────────────────────────
  "sleep":              { tier: "C", reason: "Only affects low-HP creatures and stops working at higher levels. Situationally strong early on." },
  "burning-hands":      { tier: "C", reason: "Low range and average damage. Outclassed by Thunderwave for most situations." },
  "color-spray":        { tier: "C", reason: "Like Sleep, only works on low-HP creatures. Falls off rapidly after early levels." },
  "inflict-wounds":     { tier: "C", reason: "High single-target damage that requires a melee attack roll. Risky delivery mechanism." },
  "blindness-deafness": { tier: "C", reason: "Decent debuff but Constitution save is hard to fail. No concentration is a saving grace." },
  "ray-of-enfeeblement": { tier: "C", reason: "Halves physical damage dealt. Concentration requirement for a conditional effect makes it risky." },
  "mage-armor":         { tier: "C", reason: "Only useful if you don't have heavy armor. Solid for squishy casters, useless otherwise." },
  "feather-fall":       { tier: "C", reason: "Reaction that prevents fall damage — critical when needed, completely useless otherwise." },
  "longstrider":        { tier: "C", reason: "Adds 10 feet of speed for 1 hour. Useful but usually outshone by other options." },
  "ray-of-frost":       { tier: "C", reason: "Reduces speed by 10 feet. Decent early, unreliable vs high-HP enemies later." },

  // ── D Tier ────────────────────────────────────────────────────────
  "gust-of-wind":       { tier: "D", reason: "Pushes creatures and clears gas, but the 60ft cone shape makes it awkward. Highly situational." },
  "blade-ward":         { tier: "D", reason: "Costs your entire action for damage resistance until your next turn. Almost never worth the trade." },
  "poison-spray":       { tier: "D", reason: "Requires Constitution save and many common enemies are immune to poison. Very limited use." },
  "friends":            { tier: "D", reason: "Disadvantage on Charisma checks after it ends makes targets hostile. Often creates more problems than it solves." },
  "acid-splash":        { tier: "D", reason: "Low damage with a Dexterity save. Better cantrips exist for pure damage dealing." },
  "dancing-lights":     { tier: "D", reason: "Light utility exists in many better forms. Requires concentration, limiting its value." },
  "true-strike":        { tier: "D", reason: "Burns an action and concentration to gain advantage on your NEXT attack. Almost always worse than just attacking." },

  // ── E Tier ────────────────────────────────────────────────────────
  "fire-bolt":          { tier: "C", reason: "Best damage cantrip — 1d10 fire at 120 feet. Held back only by common fire resistance/immunity." },
  "sacred-flame":       { tier: "C", reason: "Deals radiant damage which few creatures resist. Ignores cover, making it reliably useful." },
  "prestidigitation":   { tier: "B", reason: "Staggering utility spell with countless creative uses. More valuable to creative players." },
};

export function getSpellTier(slug: string): TierInfo | undefined {
  return SPELL_TIERS[slug];
}

export const TIER_COLORS: Record<SpellTier, string> = {
  S: "bg-amber-500/20 text-amber-300 border-amber-500/40",
  A: "bg-purple-500/20 text-purple-300 border-purple-500/40",
  B: "bg-blue-500/20 text-blue-300 border-blue-500/40",
  C: "bg-green-500/20 text-green-300 border-green-500/40",
  D: "bg-gray-500/20 text-gray-300 border-gray-500/40",
  E: "bg-red-500/20 text-red-300 border-red-500/40",
};

export const TIER_LABELS: Record<SpellTier, string> = {
  S: "S — Indispensável",
  A: "A — Excelente",
  B: "B — Bom",
  C: "C — Situacional",
  D: "D — Fraco",
  E: "E — Evitar",
};
