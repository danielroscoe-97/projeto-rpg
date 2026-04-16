// D&D 5e standard term translations — PT-BR
// Used by PublicMonsterStatBlock when locale="pt-BR"

const SIZE_MAP: Record<string, string> = {
  tiny: "Minúsculo",
  small: "Pequeno",
  medium: "Médio",
  large: "Grande",
  huge: "Enorme",
  gargantuan: "Colossal",
};

const TYPE_MAP: Record<string, string> = {
  aberration: "aberração",
  beast: "besta",
  celestial: "celestial",
  construct: "constructo",
  dragon: "dragão",
  elemental: "elemental",
  fey: "fada",
  fiend: "demônio",
  giant: "gigante",
  humanoid: "humanoide",
  monstrosity: "monstruosidade",
  ooze: "gosma",
  plant: "planta",
  undead: "morto-vivo",
  swarm: "enxame",
};

const ALIGNMENT_MAP: Record<string, string> = {
  "unaligned": "sem alinhamento",
  "any alignment": "qualquer alinhamento",
  "any non-good alignment": "qualquer alinhamento não bom",
  "any chaotic alignment": "qualquer alinhamento caótico",
  "any evil alignment": "qualquer alinhamento mau",
  "any good alignment": "qualquer alinhamento bom",
  "any lawful alignment": "qualquer alinhamento leal",
  "lawful good": "leal e bom",
  "lawful neutral": "leal e neutro",
  "lawful evil": "leal e mau",
  "neutral good": "neutro e bom",
  "neutral": "neutro",
  "true neutral": "neutro verdadeiro",
  "neutral evil": "neutro e mau",
  "chaotic good": "caótico e bom",
  "chaotic neutral": "caótico e neutro",
  "chaotic evil": "caótico e mau",
};

// Order matters: longer compound phrases must come before shorter individual terms
const DAMAGE_PHRASE_MAP: [string, string][] = [
  [
    "bludgeoning, piercing, and slashing from nonmagical attacks that aren't silvered",
    "contundente, perfurante e cortante de ataques não mágicos que não sejam prateados",
  ],
  [
    "bludgeoning, piercing, and slashing from nonmagical weapons that aren't silvered",
    "contundente, perfurante e cortante de armas não mágicas que não sejam prateadas",
  ],
  [
    "bludgeoning, piercing, and slashing from nonmagical attacks",
    "contundente, perfurante e cortante de ataques não mágicos",
  ],
  [
    "bludgeoning, piercing, and slashing from nonmagical weapons",
    "contundente, perfurante e cortante de armas não mágicas",
  ],
  ["from nonmagical attacks that aren't silvered", "de ataques não mágicos que não sejam prateados"],
  ["from nonmagical attacks", "de ataques não mágicos"],
  ["that aren't silvered", "que não sejam prateados"],
  ["that aren't adamantine", "que não sejam adamantina"],
  ["bludgeoning", "contundente"],
  ["piercing", "perfurante"],
  ["slashing", "cortante"],
  ["acid", "ácido"],
  ["cold", "frio"],
  ["fire", "fogo"],
  ["force", "força"],
  ["lightning", "relâmpago"],
  ["necrotic", "necrótico"],
  ["poison", "veneno"],
  ["psychic", "psíquico"],
  ["radiant", "radiante"],
  ["thunder", "trovão"],
];

const CONDITION_MAP: [string, string][] = [
  ["blinded", "cego"],
  ["charmed", "encantado"],
  ["deafened", "surdo"],
  ["exhaustion", "exaustão"],
  ["frightened", "amedrontado"],
  ["grappled", "agarrado"],
  ["incapacitated", "incapacitado"],
  ["invisible", "invisível"],
  ["paralyzed", "paralisado"],
  ["petrified", "petrificado"],
  ["poisoned", "envenenado"],
  ["prone", "caído"],
  ["restrained", "contido"],
  ["stunned", "atordoado"],
  ["unconscious", "inconsciente"],
];

const SKILL_MAP: Record<string, string> = {
  athletics: "Atletismo",
  acrobatics: "Acrobacia",
  "sleight of hand": "Prestidigitação",
  stealth: "Furtividade",
  arcana: "Arcanismo",
  history: "História",
  investigation: "Investigação",
  nature: "Natureza",
  religion: "Religião",
  "animal handling": "Adestramento",
  insight: "Intuição",
  medicine: "Medicina",
  perception: "Percepção",
  survival: "Sobrevivência",
  deception: "Enganação",
  intimidation: "Intimidação",
  performance: "Atuação",
  persuasion: "Persuasão",
};

const SAVING_THROW_MAP: Record<string, string> = {
  str: "For",
  dex: "Des",
  con: "Con",
  int: "Int",
  wis: "Sab",
  cha: "Car",
};

const SPEED_TYPE_MAP: Record<string, string> = {
  walk: "",
  fly: "voo",
  swim: "nado",
  climb: "escalada",
  burrow: "escavação",
  hover: "pairando",
};

const SENSE_MAP: [string, string][] = [
  ["passive Perception", "Percepção passiva"],
  ["darkvision", "visão no escuro"],
  ["blindsight", "visão cega"],
  ["tremorsense", "tremorsense"],
  ["truesight", "visão verdadeira"],
];

function translateWithPairs(text: string, pairs: [string, string][]): string {
  let result = text;
  for (const [en, pt] of pairs) {
    const escaped = en.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    result = result.replace(new RegExp(escaped, "gi"), pt);
  }
  return result;
}

export function translateSize(size: string | undefined): string {
  if (!size) return "";
  return SIZE_MAP[size.toLowerCase()] ?? size;
}

export function translateType(type: string | undefined): string {
  if (!type) return "";
  const lower = type.toLowerCase();
  if (TYPE_MAP[lower]) return TYPE_MAP[lower];
  // Word-by-word for compound types like "swarm of Tiny beasts"
  let result = lower;
  for (const [en, pt] of Object.entries(TYPE_MAP)) {
    result = result.replace(new RegExp(`\\b${en}\\b`, "g"), pt);
  }
  return result;
}

export function translateAlignment(alignment: string | null | undefined): string {
  if (!alignment) return "";
  return ALIGNMENT_MAP[alignment.toLowerCase()] ?? alignment;
}

export function translateDamageString(text: string | null | undefined): string {
  if (!text) return "";
  return translateWithPairs(text, DAMAGE_PHRASE_MAP);
}

export function translateConditionString(text: string | null | undefined): string {
  if (!text) return "";
  return translateWithPairs(text, CONDITION_MAP);
}

export function translateSkills(skills: Record<string, number> | null | undefined): string | null {
  if (!skills) return null;
  return Object.entries(skills)
    .map(([k, v]) => {
      const translated = SKILL_MAP[k.toLowerCase()] ?? (k.charAt(0).toUpperCase() + k.slice(1));
      return `${translated} ${v >= 0 ? "+" : ""}${v}`;
    })
    .join(", ");
}

export function translateSavingThrows(saves: Record<string, number> | null | undefined): string | null {
  if (!saves) return null;
  return Object.entries(saves)
    .map(([k, v]) => {
      const translated = SAVING_THROW_MAP[k.toLowerCase()] ?? (k.charAt(0).toUpperCase() + k.slice(1));
      return `${translated} ${v >= 0 ? "+" : ""}${v}`;
    })
    .join(", ");
}

export function translateSenses(text: string | null | undefined): string {
  if (!text) return "";
  return translateWithPairs(text, SENSE_MAP);
}

export function translateSpeed(speed: Record<string, string | number> | undefined): string | null {
  if (!speed) return null;
  return Object.entries(speed)
    .map(([k, v]) => {
      const label = SPEED_TYPE_MAP[k] ?? k;
      return label ? `${label} ${v}` : String(v);
    })
    .join(", ");
}
