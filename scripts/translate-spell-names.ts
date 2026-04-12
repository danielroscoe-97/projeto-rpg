#!/usr/bin/env ts-node
/**
 * translate-spell-names.ts
 *
 * Translates untranslated spell names to PT-BR using a dictionary.
 * Same pattern as translate-monster-names.ts.
 *
 * Usage:
 *   npx tsx scripts/translate-spell-names.ts --dry-run
 *   npx tsx scripts/translate-spell-names.ts
 *   npx tsx scripts/translate-spell-names.ts --force
 */

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const DATA_DIR = join(process.cwd(), "data", "srd");

function toSlug(name: string): string {
  return name.toLowerCase().replace(/[''""]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

interface SpellRaw {
  id: string;
  name: string;
  level: number;
  school: string;
  source?: string;
  is_srd?: boolean;
}

interface SpellDescPt {
  name_pt?: string;
  description?: string;
  higher_levels?: string | null;
}

// ── D&D Spell Translation Dictionary ─────────────────────────────────

const WORD_DICT: Record<string, string> = {
  // ── Magic schools ─────────────────────────────
  abjuration: "Abjuração",
  conjuration: "Conjuração",
  divination: "Adivinhação",
  enchantment: "Encantamento",
  evocation: "Evocação",
  illusion: "Ilusão",
  necromancy: "Necromancia",
  transmutation: "Transmutação",
  // ── Elements ──────────────────────────────────
  fire: "Fogo",
  flame: "Chama",
  flames: "Chamas",
  ice: "Gelo",
  frost: "Gelo",
  water: "Água",
  earth: "Terra",
  air: "Ar",
  wind: "Vento",
  storm: "Tempestade",
  thunder: "Trovão",
  lightning: "Relâmpago",
  acid: "Ácido",
  poison: "Veneno",
  shadow: "Sombra",
  shadows: "Sombras",
  light: "Luz",
  darkness: "Escuridão",
  radiant: "Radiante",
  necrotic: "Necrótico",
  psychic: "Psíquico",
  force: "Força",
  cold: "Frio",
  // ── Actions / verbs ───────────────────────────
  shield: "Escudo",
  blade: "Lâmina",
  bolt: "Raio",
  blast: "Explosão",
  burst: "Explosão",
  ray: "Raio",
  beam: "Feixe",
  arrow: "Flecha",
  dart: "Dardo",
  missile: "Míssil",
  sphere: "Esfera",
  orb: "Orbe",
  wall: "Muralha",
  cloud: "Nuvem",
  fog: "Névoa",
  mist: "Névoa",
  rain: "Chuva",
  wave: "Onda",
  storm: "Tempestade",
  whirlwind: "Redemoinho",
  vortex: "Vórtice",
  circle: "Círculo",
  ring: "Anel",
  cage: "Gaiola",
  prison: "Prisão",
  trap: "Armadilha",
  ward: "Proteção",
  barrier: "Barreira",
  armor: "Armadura",
  cloak: "Manto",
  veil: "Véu",
  mark: "Marca",
  sigil: "Sigilo",
  rune: "Runa",
  glyph: "Glifo",
  seal: "Selo",
  curse: "Maldição",
  hex: "Maldição",
  bane: "Perdição",
  bless: "Bênção",
  blessing: "Bênção",
  prayer: "Prece",
  heal: "Curar",
  healing: "Cura",
  cure: "Cura",
  restore: "Restaurar",
  revive: "Reviver",
  resurrect: "Ressurreição",
  resurrection: "Ressurreição",
  summon: "Invocar",
  conjure: "Conjurar",
  call: "Chamar",
  banish: "Banir",
  banishment: "Banimento",
  dispel: "Dissipar",
  counterspell: "Contramágica",
  detect: "Detectar",
  locate: "Localizar",
  find: "Encontrar",
  see: "Ver",
  sight: "Visão",
  vision: "Visão",
  scry: "Vidência",
  scrying: "Vidência",
  teleport: "Teleportar",
  transport: "Transportar",
  gate: "Portal",
  portal: "Portal",
  dimension: "Dimensão",
  plane: "Plano",
  ethereal: "Etéreo",
  astral: "Astral",
  // ── Creatures ─────────────────────────────────
  beast: "Besta",
  beasts: "Bestas",
  animal: "Animal",
  animals: "Animais",
  dragon: "Dragão",
  demon: "Demônio",
  devil: "Diabo",
  fiend: "Demônio",
  angel: "Anjo",
  celestial: "Celestial",
  elemental: "Elemental",
  fey: "Fada",
  undead: "Morto-vivo",
  construct: "Construto",
  constructs: "Construtos",
  aberration: "Aberração",
  spirit: "Espírito",
  spirits: "Espíritos",
  familiar: "Familiar",
  steed: "Corcel",
  mount: "Montaria",
  servant: "Servo",
  guardian: "Guardião",
  warrior: "Guerreiro",
  // ── Body / mind ───────────────────────────────
  hand: "Mão",
  hands: "Mãos",
  eye: "Olho",
  eyes: "Olhos",
  word: "Palavra",
  words: "Palavras",
  voice: "Voz",
  whisper: "Sussurro",
  whispers: "Sussurros",
  song: "Canção",
  dream: "Sonho",
  mind: "Mente",
  soul: "Alma",
  heart: "Coração",
  blood: "Sangue",
  bone: "Osso",
  bones: "Ossos",
  flesh: "Carne",
  skin: "Pele",
  breath: "Sopro",
  touch: "Toque",
  gaze: "Olhar",
  // ── Nature ────────────────────────────────────
  tree: "Árvore",
  plant: "Planta",
  plants: "Plantas",
  vine: "Trepadeira",
  thorn: "Espinho",
  thorns: "Espinhos",
  seed: "Semente",
  flower: "Flor",
  grove: "Bosque",
  forest: "Floresta",
  stone: "Pedra",
  rock: "Rocha",
  metal: "Metal",
  iron: "Ferro",
  steel: "Aço",
  silver: "Prata",
  gold: "Ouro",
  crystal: "Cristal",
  gem: "Gema",
  dust: "Poeira",
  sand: "Areia",
  mud: "Lama",
  clay: "Argila",
  web: "Teia",
  webs: "Teias",
  // ── Adjectives ────────────────────────────────
  greater: "Maior",
  lesser: "Menor",
  mass: "Em Massa",
  sacred: "Sagrado",
  divine: "Divino",
  holy: "Sagrado",
  unholy: "Profano",
  arcane: "Arcano",
  magic: "Mágico",
  magical: "Mágico",
  mystic: "Místico",
  enchanted: "Encantado",
  burning: "Ardente",
  freezing: "Congelante",
  shocking: "Elétrico",
  blinding: "Cegante",
  deafening: "Ensurdecedor",
  silent: "Silencioso",
  invisible: "Invisível",
  hidden: "Oculto",
  secret: "Secreto",
  true: "Verdadeiro",
  false: "Falso",
  faithful: "Fiel",
  tiny: "Minúsculo",
  giant: "Gigante",
  magnificent: "Magnífico",
  hideous: "Horrendo",
  // ── D&D specific ──────────────────────────────
  wish: "Desejo",
  power: "Poder",
  death: "Morte",
  life: "Vida",
  time: "Tempo",
  fate: "Destino",
  chaos: "Caos",
  order: "Ordem",
  creation: "Criação",
  destruction: "Destruição",
  protection: "Proteção",
  guidance: "Orientação",
  resistance: "Resistência",
  resilience: "Resiliência",
  command: "Comando",
  dominate: "Dominar",
  charm: "Encantar",
  fear: "Medo",
  hold: "Imobilizar",
  sleep: "Sono",
  haste: "Velocidade",
  slow: "Lentidão",
  fly: "Voar",
  levitate: "Levitar",
  jump: "Salto",
  feather: "Pena",
  spider: "Aranha",
  // ── Possessives / prepositions ─────────────────
  of: "de",
  the: "o",
  and: "e",
  or: "ou",
  with: "com",
  against: "contra",
  from: "de",
  into: "em",
  upon: "sobre",
  within: "dentro de",
};

// ── Patterns ─────────────────────────────────────────────────────────

interface TranslationPattern {
  regex: RegExp;
  replace: (m: RegExpMatchArray) => string;
}

function w(word: string): string {
  return WORD_DICT[word.toLowerCase()] ?? word;
}

function translateCompound(phrase: string): string {
  const words = phrase.split(/\s+/);
  return words.map((wd) => WORD_DICT[wd.toLowerCase()] ?? wd).join(" ");
}

const PATTERNS: TranslationPattern[] = [
  // "X's Y" → "Y de X" (possessive)
  { regex: /^(\w+)'s (.+)$/i, replace: (m) => `${translateCompound(m[2])} de ${m[1]}` },
  // "Wall of X" → "Muralha de X"
  { regex: /^Wall of (.+)$/i, replace: (m) => `Muralha de ${translateCompound(m[1])}` },
  // "Sphere of X" → "Esfera de X"
  { regex: /^Sphere of (.+)$/i, replace: (m) => `Esfera de ${translateCompound(m[1])}` },
  // "Circle of X" → "Círculo de X"
  { regex: /^Circle of (.+)$/i, replace: (m) => `Círculo de ${translateCompound(m[1])}` },
  // "Cloud of X" → "Nuvem de X"
  { regex: /^Cloud of (.+)$/i, replace: (m) => `Nuvem de ${translateCompound(m[1])}` },
  // "Word of X" → "Palavra de X"
  { regex: /^Word of (.+)$/i, replace: (m) => `Palavra de ${translateCompound(m[1])}` },
  // "Cone of X" → "Cone de X"
  { regex: /^Cone of (.+)$/i, replace: (m) => `Cone de ${translateCompound(m[1])}` },
  // "Ray of X" → "Raio de X"
  { regex: /^Ray of (.+)$/i, replace: (m) => `Raio de ${translateCompound(m[1])}` },
  // "Gust of X" → "Rajada de X"
  { regex: /^Gust of (.+)$/i, replace: (m) => `Rajada de ${translateCompound(m[1])}` },
  // "Crown of X" → "Coroa de X"
  { regex: /^Crown of (.+)$/i, replace: (m) => `Coroa de ${translateCompound(m[1])}` },
  // "Cloak of X" → "Manto de X"
  { regex: /^Cloak of (.+)$/i, replace: (m) => `Manto de ${translateCompound(m[1])}` },
  // "Ring of X" → "Anel de X"
  { regex: /^Ring of (.+)$/i, replace: (m) => `Anel de ${translateCompound(m[1])}` },
  // "Touch of X" → "Toque de X"
  { regex: /^Touch of (.+)$/i, replace: (m) => `Toque de ${translateCompound(m[1])}` },
  // "Veil of X" → "Véu de X"
  { regex: /^Veil of (.+)$/i, replace: (m) => `Véu de ${translateCompound(m[1])}` },
  // "Blade of X" → "Lâmina de X"
  { regex: /^Blade of (.+)$/i, replace: (m) => `Lâmina de ${translateCompound(m[1])}` },
  // "Summon X" → "Invocar X"
  { regex: /^Summon (.+)$/i, replace: (m) => `Invocar ${translateCompound(m[1])}` },
  // "Conjure X" → "Conjurar X"
  { regex: /^Conjure (.+)$/i, replace: (m) => `Conjurar ${translateCompound(m[1])}` },
  // "Detect X" → "Detectar X"
  { regex: /^Detect (.+)$/i, replace: (m) => `Detectar ${translateCompound(m[1])}` },
  // "Create X" → "Criar X"
  { regex: /^Create (.+)$/i, replace: (m) => `Criar ${translateCompound(m[1])}` },
  // "Dispel X" → "Dissipar X"
  { regex: /^Dispel (.+)$/i, replace: (m) => `Dissipar ${translateCompound(m[1])}` },
  // "Protection from X" → "Proteção contra X"
  { regex: /^Protection from (.+)$/i, replace: (m) => `Proteção contra ${translateCompound(m[1])}` },
  // "Dominate X" → "Dominar X"
  { regex: /^Dominate (.+)$/i, replace: (m) => `Dominar ${translateCompound(m[1])}` },
  // "Hold X" → "Imobilizar X"
  { regex: /^Hold (.+)$/i, replace: (m) => `Imobilizar ${translateCompound(m[1])}` },
  // "Greater/Lesser/Mass X" → "X Maior/Menor/em Massa"
  { regex: /^Greater (.+)$/i, replace: (m) => `${translateCompound(m[1])} Maior` },
  { regex: /^Lesser (.+)$/i, replace: (m) => `${translateCompound(m[1])} Menor` },
  { regex: /^Mass (.+)$/i, replace: (m) => `${translateCompound(m[1])} em Massa` },
];

function translateName(name: string): string {
  const clean = name.replace(/["""\u201C\u201D]/g, "");

  for (const pat of PATTERNS) {
    const m = clean.match(pat.regex);
    if (m) return pat.replace(m);
  }

  return translateCompound(clean);
}

// ── CLI args ─────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const forceAll = args.includes("--force");

// ── Load data ────────────────────────────────────────────────────────

function loadJson<T>(filename: string): T {
  return JSON.parse(readFileSync(join(DATA_DIR, filename), "utf-8"));
}

const s2014 = loadJson<SpellRaw[]>("spells-2014.json");
const s2024 = loadJson<SpellRaw[]>("spells-2024.json");
const descPt = loadJson<Record<string, SpellDescPt>>("spell-descriptions-pt.json");

const allSpells = [...s2014, ...s2024];
const seen = new Set<string>();
const deduped: SpellRaw[] = [];
for (const s of allSpells) {
  const slug = toSlug(s.name);
  if (seen.has(slug)) continue;
  seen.add(slug);
  deduped.push(s);
}

function isHandTranslated(entry: SpellDescPt): boolean {
  return !!(entry.description);
}

const untranslated = deduped.filter((s) => {
  const slug = toSlug(s.name);
  const existing = descPt[slug];
  if (!existing?.name_pt) return true;
  if (forceAll && !isHandTranslated(existing)) return true;
  return false;
});

console.log(`Total unique spells: ${deduped.length}`);
console.log(`Already translated:  ${deduped.length - untranslated.length}`);
console.log(`Missing translation: ${untranslated.length}`);

if (untranslated.length === 0) {
  console.log("All spells are already translated!");
  process.exit(0);
}

// ── Translate ────────────────────────────────────────────────────────

let translated = 0;
let unchanged = 0;

for (const s of untranslated) {
  const slug = toSlug(s.name);
  const pt = translateName(s.name);
  const changed = pt.toLowerCase() !== s.name.toLowerCase();

  if (changed) translated++;
  else unchanged++;

  if (descPt[slug]) {
    descPt[slug].name_pt = pt;
  } else {
    descPt[slug] = { name_pt: pt };
  }
}

console.log(`\nTranslation results:`);
console.log(`  Translated:  ${translated}`);
console.log(`  Kept as-is:  ${unchanged}`);

if (dryRun) {
  console.log("\n--- Sample translations (first 60) ---");
  for (const s of untranslated.slice(0, 60)) {
    const slug = toSlug(s.name);
    const pt = descPt[slug]?.name_pt ?? s.name;
    const marker = pt.toLowerCase() !== s.name.toLowerCase() ? "✓" : "=";
    console.log(`  ${marker} ${s.name} → ${pt}`);
  }
  process.exit(0);
}

// ── Write results ────────────────────────────────────────────────────

writeFileSync(
  join(DATA_DIR, "spell-descriptions-pt.json"),
  JSON.stringify(descPt, null, 2),
  "utf-8"
);
console.log("\nSaved to spell-descriptions-pt.json");

// Update spell-names-pt.json
const namesPt = loadJson<Record<string, string>>("spell-names-pt.json");
for (const s of untranslated) {
  const slug = toSlug(s.name);
  const pt = descPt[slug]?.name_pt;
  if (!pt) continue;
  const ptSlug = toSlug(pt);
  if (ptSlug !== slug) {
    namesPt[slug] = ptSlug;
  }
}
writeFileSync(
  join(DATA_DIR, "spell-names-pt.json"),
  JSON.stringify(namesPt, null, 2),
  "utf-8"
);
console.log("Saved to spell-names-pt.json");
