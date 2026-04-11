/**
 * generate-srd-abilities-index.ts
 * Consolidates class features, racial traits, feats, and subclass features
 * into a single searchable JSON index for the AddAbilityDialog.
 *
 * Usage: npx tsx scripts/generate-srd-abilities-index.ts
 * Output: lib/data/srd-abilities-index.json
 */

import fs from "fs";
import path from "path";

interface SrdAbilityEntry {
  id: string;
  name: string;
  name_pt: string;
  description: string;
  description_pt: string;
  ability_type: "class_feature" | "racial_trait" | "feat" | "subclass_feature";
  source_class: string | null;
  source_race: string | null;
  level_acquired: number | null;
  /** null = passive / unlimited */
  max_uses: number | null;
  reset_type: "short_rest" | "long_rest" | "dawn" | "manual" | null;
  srd_ref: string;
}

const DATA_DIR = path.resolve(__dirname, "../data/srd");
const OUTPUT_PATH = path.resolve(__dirname, "../lib/data/srd-abilities-index.json");

const CLASSES = [
  "barbarian", "bard", "cleric", "druid", "fighter", "monk",
  "paladin", "ranger", "rogue", "sorcerer", "warlock", "wizard",
];

// Known limited-use abilities with their recharge info
const USES_MAP: Record<string, { max_uses: number | string; reset_type: string }> = {
  // Barbarian
  "class:barbarian:rage": { max_uses: "by_level", reset_type: "long_rest" },
  // Bard
  "class:bard:bardic-inspiration": { max_uses: "cha_mod", reset_type: "long_rest" },
  // Cleric
  "class:cleric:channel-divinity": { max_uses: "by_level", reset_type: "short_rest" },
  "class:cleric:divine-intervention": { max_uses: 1, reset_type: "long_rest" },
  // Druid
  "class:druid:wild-shape": { max_uses: 2, reset_type: "short_rest" },
  // Fighter
  "class:fighter:second-wind": { max_uses: 1, reset_type: "short_rest" },
  "class:fighter:action-surge": { max_uses: "by_level", reset_type: "short_rest" },
  "class:fighter:indomitable": { max_uses: "by_level", reset_type: "long_rest" },
  // Monk
  "class:monk:ki": { max_uses: "level", reset_type: "short_rest" },
  // Paladin
  "class:paladin:divine-sense": { max_uses: "cha_mod_plus_1", reset_type: "long_rest" },
  "class:paladin:lay-on-hands": { max_uses: "level_x_5", reset_type: "long_rest" },
  "class:paladin:cleansing-touch": { max_uses: "cha_mod", reset_type: "long_rest" },
  // Sorcerer
  "class:sorcerer:font-of-magic": { max_uses: "level", reset_type: "long_rest" },
  // Rogue
  "class:rogue:stroke-of-luck": { max_uses: 1, reset_type: "short_rest" },
  // Racial
  "racial:dragonborn:breath-weapon": { max_uses: 1, reset_type: "short_rest" },
  "racial:half-orc:relentless-endurance": { max_uses: 1, reset_type: "long_rest" },
};

function slugify(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function extractClassFeatures(): SrdAbilityEntry[] {
  const entries: SrdAbilityEntry[] = [];

  for (const cls of CLASSES) {
    const filePath = path.join(DATA_DIR, `class-${cls}.json`);
    if (!fs.existsSync(filePath)) continue;

    const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    const features = data.class_features || [];

    for (const feat of features) {
      // Skip generic "Ability Score Improvement" — it's not a trackable ability
      if (feat.name === "Ability Score Improvement") continue;

      const srdRef = `class:${cls}:${slugify(feat.name)}`;
      const usesInfo = USES_MAP[srdRef];

      entries.push({
        id: srdRef,
        name: feat.name,
        name_pt: feat.name_pt || feat.name,
        description: feat.description_en || "",
        description_pt: feat.description_pt || "",
        ability_type: "class_feature",
        source_class: cls,
        source_race: null,
        level_acquired: feat.level ?? null,
        max_uses: usesInfo && typeof usesInfo.max_uses === "number" ? usesInfo.max_uses : null,
        reset_type: (usesInfo?.reset_type as SrdAbilityEntry["reset_type"]) ?? null,
        srd_ref: srdRef,
      });
    }
  }

  return entries;
}

function extractSubclassFeatures(): SrdAbilityEntry[] {
  const entries: SrdAbilityEntry[] = [];
  const filePath = path.join(DATA_DIR, "subclasses-srd.json");
  if (!fs.existsSync(filePath)) return entries;

  const subclasses = JSON.parse(fs.readFileSync(filePath, "utf-8"));

  for (const sub of subclasses) {
    const classId = sub.class_id;
    const features = sub.features || [];

    for (const feat of features) {
      const srdRef = `subclass:${classId}:${slugify(sub.id)}:${slugify(feat.name)}`;

      entries.push({
        id: srdRef,
        name: feat.name,
        name_pt: feat.name_pt || feat.name,
        description: feat.description_en || "",
        description_pt: feat.description_pt || "",
        ability_type: "subclass_feature",
        source_class: classId,
        source_race: null,
        level_acquired: feat.level ?? null,
        max_uses: null,
        reset_type: null,
        srd_ref: srdRef,
      });
    }
  }

  return entries;
}

function extractFeats(): SrdAbilityEntry[] {
  const entries: SrdAbilityEntry[] = [];
  const filePath = path.join(DATA_DIR, "feats.json");
  if (!fs.existsSync(filePath)) return entries;

  const feats = JSON.parse(fs.readFileSync(filePath, "utf-8"));

  for (const feat of feats) {
    const srdRef = `feat:${feat.id || slugify(feat.name)}`;

    entries.push({
      id: srdRef,
      name: feat.name,
      name_pt: feat.name_pt || feat.name,
      description: feat.description || "",
      description_pt: feat.description_pt || "",
      ability_type: "feat",
      source_class: null,
      source_race: null,
      level_acquired: null,
      max_uses: null,
      reset_type: null,
      srd_ref: srdRef,
    });
  }

  return entries;
}

function extractRacialTraits(): SrdAbilityEntry[] {
  const entries: SrdAbilityEntry[] = [];

  // We import from the TypeScript races-data.ts, but for the script
  // we parse it manually since we're running as a standalone script.
  // Instead, use the inline data that matches races-data.ts.
  const RACE_TRAITS: Record<string, { nameEn: string; namePt: string; descriptionEn: string; descriptionPt: string }[]> = {
    dwarf: [
      { nameEn: "Dwarven Resilience", namePt: "Resiliência Anã", descriptionEn: "You have advantage on saving throws against poison, and you have resistance against poison damage.", descriptionPt: "Você tem vantagem em testes de resistência contra veneno e tem resistência contra dano de veneno." },
      { nameEn: "Stonecunning", namePt: "Especialista em Rochas", descriptionEn: "Whenever you make an Intelligence (History) check related to the origin of stonework, you are considered proficient in the History skill and add double your proficiency bonus to the check.", descriptionPt: "Sempre que fizer um teste de Inteligência (História) relacionado à origem de trabalhos em pedra, você é considerado proficiente na perícia História e adiciona o dobro do seu bônus de proficiência ao teste." },
      { nameEn: "Dwarven Toughness", namePt: "Robustez Anã", descriptionEn: "Your hit point maximum increases by 1, and it increases by 1 every time you gain a level.", descriptionPt: "Seu máximo de pontos de vida aumenta em 1 e aumenta em 1 cada vez que você ganha um nível." },
    ],
    elf: [
      { nameEn: "Keen Senses", namePt: "Sentidos Aguçados", descriptionEn: "You have proficiency in the Perception skill.", descriptionPt: "Você tem proficiência na perícia Percepção." },
      { nameEn: "Fey Ancestry", namePt: "Ancestralidade Feérica", descriptionEn: "You have advantage on saving throws against being charmed, and magic can't put you to sleep.", descriptionPt: "Você tem vantagem em testes de resistência contra ser encantado e magia não pode colocá-lo para dormir." },
      { nameEn: "Trance", namePt: "Transe", descriptionEn: "Elves don't need to sleep. Instead, they meditate deeply for 4 hours a day.", descriptionPt: "Elfos não precisam dormir. Em vez disso, meditam profundamente por 4 horas por dia." },
      { nameEn: "Cantrip", namePt: "Truque", descriptionEn: "You know one cantrip of your choice from the wizard spell list.", descriptionPt: "Você conhece um truque à sua escolha da lista de magias de mago." },
    ],
    halfling: [
      { nameEn: "Lucky", namePt: "Sortudo", descriptionEn: "When you roll a 1 on the d20 for an attack roll, ability check, or saving throw, you can reroll the die and must use the new roll.", descriptionPt: "Quando você rolar um 1 no d20 para uma jogada de ataque, teste de habilidade ou teste de resistência, você pode rolar o dado novamente e deve usar a nova rolagem." },
      { nameEn: "Brave", namePt: "Corajoso", descriptionEn: "You have advantage on saving throws against being frightened.", descriptionPt: "Você tem vantagem em testes de resistência contra ser amedrontado." },
      { nameEn: "Naturally Stealthy", namePt: "Naturalmente Furtivo", descriptionEn: "You can attempt to hide even when you are obscured only by a creature that is at least one size larger than you.", descriptionPt: "Você pode tentar se esconder mesmo quando está obscurecido apenas por uma criatura que seja pelo menos um tamanho maior que você." },
    ],
    human: [
      { nameEn: "Ability Score Increase", namePt: "Aumento de Atributo", descriptionEn: "Your ability scores each increase by 1.", descriptionPt: "Todos os seus atributos aumentam em 1." },
    ],
    dragonborn: [
      { nameEn: "Breath Weapon", namePt: "Arma de Sopro", descriptionEn: "You can use your action to exhale destructive energy. Damage: 2d6 scaling to 5d6.", descriptionPt: "Você pode usar sua ação para exalar energia destrutiva. Dano: 2d6 escalando para 5d6." },
      { nameEn: "Damage Resistance", namePt: "Resistência a Dano", descriptionEn: "You have resistance to the damage type associated with your draconic ancestry.", descriptionPt: "Você tem resistência ao tipo de dano associado à sua ancestralidade dracônica." },
    ],
    gnome: [
      { nameEn: "Gnome Cunning", namePt: "Esperteza Gnômida", descriptionEn: "You have advantage on all Intelligence, Wisdom, and Charisma saving throws against magic.", descriptionPt: "Você tem vantagem em todos os testes de resistência de Inteligência, Sabedoria e Carisma contra magia." },
      { nameEn: "Tinker", namePt: "Engenhoqueiro", descriptionEn: "You have proficiency with artisan's tools (tinker's tools).", descriptionPt: "Você tem proficiência com ferramentas de artesão (ferramentas de funileiro)." },
    ],
    "half-elf": [
      { nameEn: "Fey Ancestry", namePt: "Ancestralidade Feérica", descriptionEn: "Advantage on saves vs charmed, immune to magical sleep.", descriptionPt: "Vantagem em testes contra encantamento, imune a sono mágico." },
      { nameEn: "Skill Versatility", namePt: "Versatilidade em Perícias", descriptionEn: "You gain proficiency in two skills of your choice.", descriptionPt: "Você ganha proficiência em duas perícias à sua escolha." },
    ],
    "half-orc": [
      { nameEn: "Relentless Endurance", namePt: "Resistência Incansável", descriptionEn: "When reduced to 0 HP, drop to 1 HP instead (1/long rest).", descriptionPt: "Quando reduzido a 0 PV, caia para 1 PV (1/descanso longo)." },
      { nameEn: "Savage Attacks", namePt: "Ataques Selvagens", descriptionEn: "Extra damage die on melee critical hits.", descriptionPt: "Dado de dano extra em críticos corpo a corpo." },
    ],
    tiefling: [
      { nameEn: "Hellish Resistance", namePt: "Resistência Infernal", descriptionEn: "You have resistance to fire damage.", descriptionPt: "Você tem resistência a dano de fogo." },
      { nameEn: "Infernal Legacy", namePt: "Legado Infernal", descriptionEn: "You know thaumaturgy. At 3rd level: hellish rebuke. At 5th: darkness.", descriptionPt: "Você conhece taumaturgia. No 3º nível: repreensão infernal. No 5º: escuridão." },
    ],
  };

  for (const [race, traits] of Object.entries(RACE_TRAITS)) {
    for (const trait of traits) {
      const srdRef = `racial:${race}:${slugify(trait.nameEn)}`;
      const usesInfo = USES_MAP[srdRef];

      entries.push({
        id: srdRef,
        name: trait.nameEn,
        name_pt: trait.namePt,
        description: trait.descriptionEn,
        description_pt: trait.descriptionPt,
        ability_type: "racial_trait",
        source_class: null,
        source_race: race,
        level_acquired: null,
        max_uses: usesInfo && typeof usesInfo.max_uses === "number" ? usesInfo.max_uses : null,
        reset_type: (usesInfo?.reset_type as SrdAbilityEntry["reset_type"]) ?? null,
        srd_ref: srdRef,
      });
    }
  }

  return entries;
}

// ---- Main ----

const allEntries = [
  ...extractClassFeatures(),
  ...extractSubclassFeatures(),
  ...extractFeats(),
  ...extractRacialTraits(),
];

// Sort: class features by class+level, then racial, then feats
allEntries.sort((a, b) => {
  const typeOrder: Record<string, number> = {
    class_feature: 0,
    subclass_feature: 1,
    racial_trait: 2,
    feat: 3,
  };
  const ta = typeOrder[a.ability_type] ?? 4;
  const tb = typeOrder[b.ability_type] ?? 4;
  if (ta !== tb) return ta - tb;
  if (a.source_class !== b.source_class) return (a.source_class || "").localeCompare(b.source_class || "");
  if (a.level_acquired !== b.level_acquired) return (a.level_acquired ?? 0) - (b.level_acquired ?? 0);
  return a.name.localeCompare(b.name);
});

fs.writeFileSync(OUTPUT_PATH, JSON.stringify(allEntries, null, 2), "utf-8");
console.log(`✅ Generated ${allEntries.length} SRD abilities → ${OUTPUT_PATH}`);

const byType = allEntries.reduce((acc, e) => {
  acc[e.ability_type] = (acc[e.ability_type] || 0) + 1;
  return acc;
}, {} as Record<string, number>);
console.log("   Breakdown:", byType);
