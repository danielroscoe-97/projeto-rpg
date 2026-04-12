#!/usr/bin/env ts-node
/**
 * translate-item-names.ts — Translates D&D item names to PT-BR via dictionary.
 *
 * npx tsx scripts/translate-item-names.ts --dry-run
 * npx tsx scripts/translate-item-names.ts
 * npx tsx scripts/translate-item-names.ts --force
 */
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

const DATA_DIR = join(process.cwd(), "data", "srd");

function toSlug(name: string): string {
  return name.toLowerCase().replace(/[''""]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

// ── Dictionary ───────────────────────────────────────────────────────

const WORD_DICT: Record<string, string> = {
  // Equipment types
  sword: "Espada", longsword: "Espada Longa", shortsword: "Espada Curta",
  greatsword: "Montante", scimitar: "Cimitarra", rapier: "Rapieira",
  dagger: "Adaga", axe: "Machado", greataxe: "Machado Grande",
  handaxe: "Machadinha", battleaxe: "Machado de Batalha",
  hammer: "Martelo", warhammer: "Martelo de Guerra", maul: "Malho",
  mace: "Maça", morningstar: "Estrela da Manhã", flail: "Mangual",
  spear: "Lança", javelin: "Dardo", trident: "Tridente",
  halberd: "Alabarda", glaive: "Glaive", pike: "Pique",
  bow: "Arco", longbow: "Arco Longo", shortbow: "Arco Curto",
  crossbow: "Besta", staff: "Cajado", quarterstaff: "Bordão",
  club: "Clava", greatclub: "Clava Grande", sling: "Funda",
  whip: "Chicote", lance: "Lança de Justa", net: "Rede",
  blowgun: "Zarabatana",
  // Armor
  armor: "Armadura", shield: "Escudo", plate: "Placas",
  chain: "Cota", mail: "Malha", leather: "Couro",
  studded: "Cravejado", scale: "Escamas", breastplate: "Couraça",
  halfplate: "Meia Armadura", hide: "Peles", padded: "Acolchoada",
  ring: "Anel", helm: "Elmo", helmet: "Capacete",
  gauntlets: "Manoplas", gauntlet: "Manopla", boots: "Botas",
  cloak: "Manto", robe: "Manto", robes: "Mantos",
  belt: "Cinto", bracers: "Braçadeiras", cape: "Capa",
  circlet: "Diadema", crown: "Coroa", tiara: "Tiara",
  headband: "Faixa", mantle: "Manto", girdle: "Cinta",
  gloves: "Luvas", amulet: "Amuleto", necklace: "Colar",
  pendant: "Pingente", brooch: "Broche", medallion: "Medalhão",
  // Containers / tools
  bag: "Bolsa", pouch: "Bolsa", sack: "Saco",
  pack: "Mochila", backpack: "Mochila", chest: "Baú",
  box: "Caixa", bottle: "Garrafa", flask: "Frasco",
  vial: "Frasco", jar: "Jarro", jug: "Jarra",
  lamp: "Lamparina", lantern: "Lanterna", torch: "Tocha",
  candle: "Vela", rope: "Corda", chain: "Corrente",
  mirror: "Espelho", lens: "Lente", spyglass: "Luneta",
  compass: "Bússola", map: "Mapa", book: "Livro",
  tome: "Tomo", scroll: "Pergaminho", quiver: "Aljava",
  case: "Estojo", kit: "Kit", tools: "Ferramentas",
  tool: "Ferramenta", instrument: "Instrumento",
  // Potions / consumables
  potion: "Poção", elixir: "Elixir", oil: "Óleo",
  salve: "Bálsamo", balm: "Bálsamo", dust: "Pó",
  powder: "Pó", philter: "Filtro", draught: "Poção",
  // Materials
  iron: "Ferro", steel: "Aço", silver: "Prata",
  gold: "Ouro", golden: "Dourado", mithral: "Mithral",
  adamantine: "Adamantina", bronze: "Bronze", copper: "Cobre",
  brass: "Latão", platinum: "Platina", crystal: "Cristal",
  glass: "Vidro", bone: "Osso", stone: "Pedra",
  wood: "Madeira", wooden: "de Madeira", ivory: "Marfim",
  pearl: "Pérola", ruby: "Rubi", sapphire: "Safira",
  emerald: "Esmeralda", diamond: "Diamante", opal: "Opala",
  amethyst: "Ametista", obsidian: "Obsidiana", jade: "Jade",
  // Modifiers
  enchanted: "Encantado", magical: "Mágico", cursed: "Amaldiçoado",
  blessed: "Abençoado", holy: "Sagrado", unholy: "Profano",
  greater: "Maior", lesser: "Menor", superior: "Superior",
  supreme: "Supremo", rare: "Raro", legendary: "Lendário",
  common: "Comum", uncommon: "Incomum", very: "Muito",
  flying: "Voador", flaming: "Flamejante", frost: "Gelo",
  lightning: "Relâmpago", thunder: "Trovão", vorpal: "Vorpal",
  keen: "Afiado", defending: "Defensor", dancing: "Dançante",
  animated: "Animado", sentient: "Senciente", intelligent: "Inteligente",
  // Elements
  fire: "Fogo", ice: "Gelo", water: "Água",
  earth: "Terra", air: "Ar", wind: "Vento",
  storm: "Tempestade", shadow: "Sombra", light: "Luz",
  darkness: "Escuridão", radiant: "Radiante", necrotic: "Necrótico",
  acid: "Ácido", poison: "Veneno", psychic: "Psíquico",
  force: "Força", cold: "Frio",
  // D&D specific
  wand: "Varinha", rod: "Bastão", orb: "Orbe",
  figurine: "Estatueta", horn: "Chifre", horn: "Trompa",
  feather: "Pena", token: "Símbolo", talisman: "Talismã",
  periapt: "Periaptro", phylactery: "Filactério", ioun: "Ioun",
  deck: "Baralho", card: "Carta", cards: "Cartas",
  sphere: "Esfera", cube: "Cubo", prism: "Prisma",
  gem: "Gema", stone: "Pedra", eye: "Olho",
  hand: "Mão", claw: "Garra", fang: "Presa",
  // Creatures
  dragon: "Dragão", giant: "Gigante", demon: "Demônio",
  devil: "Diabo", angel: "Anjo", elemental: "Elemental",
  beast: "Besta", golem: "Golem", undead: "Morto-vivo",
  dwarf: "Anão", dwarven: "Anão", elf: "Elfo", elven: "Élfico",
  // Common phrases
  of: "de", the: "o", and: "e", or: "ou", with: "com",
  against: "contra", from: "de",
  // Actions
  healing: "Cura", protection: "Proteção", resistance: "Resistência",
  speed: "Velocidade", strength: "Força", power: "Poder",
  climbing: "Escalada", swimming: "Natação", flying: "Voo",
  invisibility: "Invisibilidade", teleportation: "Teleportação",
  command: "Comando", control: "Controle", domination: "Dominação",
  regeneration: "Regeneração", absorption: "Absorção",
  // Size/quantity
  many: "Muitos", all: "Todos", three: "Três",
};

function translateCompound(phrase: string): string {
  // Handle "+N" prefix (e.g., "+1 Longsword")
  const plusMatch = phrase.match(/^(\+\d+)\s+(.+)$/);
  if (plusMatch) {
    return `${translateCompound(plusMatch[2])} ${plusMatch[1]}`;
  }

  const words = phrase.split(/\s+/);
  return words.map((wd) => WORD_DICT[wd.toLowerCase()] ?? wd).join(" ");
}

interface TranslationPattern {
  regex: RegExp;
  replace: (m: RegExpMatchArray) => string;
}

const PATTERNS: TranslationPattern[] = [
  // "Potion of X" → "Poção de X"
  { regex: /^Potion of (.+)$/i, replace: (m) => `Poção de ${translateCompound(m[1])}` },
  // "Scroll of X" → "Pergaminho de X"
  { regex: /^Scroll of (.+)$/i, replace: (m) => `Pergaminho de ${translateCompound(m[1])}` },
  // "Wand of X" → "Varinha de X"
  { regex: /^Wand of (.+)$/i, replace: (m) => `Varinha de ${translateCompound(m[1])}` },
  // "Rod of X" → "Bastão de X"
  { regex: /^Rod of (.+)$/i, replace: (m) => `Bastão de ${translateCompound(m[1])}` },
  // "Ring of X" → "Anel de X"
  { regex: /^Ring of (.+)$/i, replace: (m) => `Anel de ${translateCompound(m[1])}` },
  // "Cloak of X" → "Manto de X"
  { regex: /^Cloak of (.+)$/i, replace: (m) => `Manto de ${translateCompound(m[1])}` },
  // "Amulet of X" → "Amuleto de X"
  { regex: /^Amulet of (.+)$/i, replace: (m) => `Amuleto de ${translateCompound(m[1])}` },
  // "Boots of X" → "Botas de X"
  { regex: /^Boots of (.+)$/i, replace: (m) => `Botas de ${translateCompound(m[1])}` },
  // "Bracers of X" → "Braçadeiras de X"
  { regex: /^Bracers of (.+)$/i, replace: (m) => `Braçadeiras de ${translateCompound(m[1])}` },
  // "Gauntlets of X" → "Manoplas de X"
  { regex: /^Gauntlets of (.+)$/i, replace: (m) => `Manoplas de ${translateCompound(m[1])}` },
  // "Belt of X" → "Cinto de X"
  { regex: /^Belt of (.+)$/i, replace: (m) => `Cinto de ${translateCompound(m[1])}` },
  // "Helm of X" → "Elmo de X"
  { regex: /^Helm of (.+)$/i, replace: (m) => `Elmo de ${translateCompound(m[1])}` },
  // "Bag of X" → "Bolsa de X"
  { regex: /^Bag of (.+)$/i, replace: (m) => `Bolsa de ${translateCompound(m[1])}` },
  // "Staff of X" → "Cajado de X"
  { regex: /^Staff of (.+)$/i, replace: (m) => `Cajado de ${translateCompound(m[1])}` },
  // "Sword of X" → "Espada de X"
  { regex: /^Sword of (.+)$/i, replace: (m) => `Espada de ${translateCompound(m[1])}` },
  // "Shield of X" → "Escudo de X"
  { regex: /^Shield of (.+)$/i, replace: (m) => `Escudo de ${translateCompound(m[1])}` },
  // "Stone of X" → "Pedra de X"
  { regex: /^Stone of (.+)$/i, replace: (m) => `Pedra de ${translateCompound(m[1])}` },
  // "Horn of X" → "Trompa de X"
  { regex: /^Horn of (.+)$/i, replace: (m) => `Trompa de ${translateCompound(m[1])}` },
  // "Eyes of X" → "Olhos de X"
  { regex: /^Eyes of (.+)$/i, replace: (m) => `Olhos de ${translateCompound(m[1])}` },
  // "Deck of X" → "Baralho de X"
  { regex: /^Deck of (.+)$/i, replace: (m) => `Baralho de ${translateCompound(m[1])}` },
  // "Cape of X" → "Capa de X"
  { regex: /^Cape of (.+)$/i, replace: (m) => `Capa de ${translateCompound(m[1])}` },
  // "Cube of X" → "Cubo de X"
  { regex: /^Cube of (.+)$/i, replace: (m) => `Cubo de ${translateCompound(m[1])}` },
  // "Necklace of X" → "Colar de X"
  { regex: /^Necklace of (.+)$/i, replace: (m) => `Colar de ${translateCompound(m[1])}` },
  // "Gloves of X" → "Luvas de X"
  { regex: /^Gloves of (.+)$/i, replace: (m) => `Luvas de ${translateCompound(m[1])}` },
  // "Robe of X" → "Manto de X"
  { regex: /^Robe of (.+)$/i, replace: (m) => `Manto de ${translateCompound(m[1])}` },
  // "Tome of X" → "Tomo de X"
  { regex: /^Tome of (.+)$/i, replace: (m) => `Tomo de ${translateCompound(m[1])}` },
  // "Lantern of X" → "Lanterna de X"
  { regex: /^Lantern of (.+)$/i, replace: (m) => `Lanterna de ${translateCompound(m[1])}` },
  // "Figurine of X" → "Estatueta de X"
  { regex: /^Figurine of (.+)$/i, replace: (m) => `Estatueta de ${translateCompound(m[1])}` },
  // "Oil of X" → "Óleo de X"
  { regex: /^Oil of (.+)$/i, replace: (m) => `Óleo de ${translateCompound(m[1])}` },
  // "+N Weapon" → "Arma +N"
  { regex: /^\+(\d+) (.+)$/i, replace: (m) => `${translateCompound(m[2])} +${m[1]}` },
  // "X's Y" → "Y de X" (possessive)
  { regex: /^(\w+)'s (.+)$/i, replace: (m) => `${translateCompound(m[2])} de ${m[1]}` },
];

function translateName(name: string): string {
  const clean = name.replace(/["""\u201C\u201D]/g, "");

  for (const pat of PATTERNS) {
    const m = clean.match(pat.regex);
    if (m) return pat.replace(m);
  }

  return translateCompound(clean);
}

// ── Main ─────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const forceAll = args.includes("--force");

function loadJson<T>(filename: string): T {
  const path = join(DATA_DIR, filename);
  if (!existsSync(path)) return {} as T;
  return JSON.parse(readFileSync(path, "utf-8"));
}

interface ItemRaw { id: string; name: string; type: string; rarity?: string; source?: string; }
interface DescEntry { name_pt?: string; }

const items = loadJson<ItemRaw[]>("items.json");
const descPt = loadJson<Record<string, DescEntry>>("item-descriptions-pt.json");

const seen = new Set<string>();
const deduped: ItemRaw[] = [];
for (const i of items) {
  const slug = toSlug(i.name);
  if (seen.has(slug)) continue;
  seen.add(slug);
  deduped.push(i);
}

const untranslated = deduped.filter((i) => {
  const slug = toSlug(i.name);
  if (!descPt[slug]?.name_pt) return true;
  if (forceAll) return true;
  return false;
});

console.log(`Total unique items: ${deduped.length}`);
console.log(`Already translated: ${deduped.length - untranslated.length}`);
console.log(`Missing: ${untranslated.length}`);

if (untranslated.length === 0) { console.log("All done!"); process.exit(0); }

let translated = 0, unchanged = 0;
for (const i of untranslated) {
  const slug = toSlug(i.name);
  const pt = translateName(i.name);
  if (pt.toLowerCase() !== i.name.toLowerCase()) translated++;
  else unchanged++;
  if (descPt[slug]) descPt[slug].name_pt = pt;
  else descPt[slug] = { name_pt: pt };
}

console.log(`Translated: ${translated} | Kept as-is: ${unchanged}`);

if (dryRun) {
  for (const i of untranslated.slice(0, 40)) {
    const slug = toSlug(i.name);
    const pt = descPt[slug]?.name_pt ?? i.name;
    const m = pt.toLowerCase() !== i.name.toLowerCase() ? "✓" : "=";
    console.log(`  ${m} ${i.name} → ${pt}`);
  }
  process.exit(0);
}

writeFileSync(join(DATA_DIR, "item-descriptions-pt.json"), JSON.stringify(descPt, null, 2), "utf-8");
console.log("Saved item-descriptions-pt.json");

const namesPt = loadJson<Record<string, string>>("item-names-pt.json");
for (const i of untranslated) {
  const slug = toSlug(i.name);
  const pt = descPt[slug]?.name_pt;
  if (pt) { const ptSlug = toSlug(pt); if (ptSlug !== slug) namesPt[slug] = ptSlug; }
}
writeFileSync(join(DATA_DIR, "item-names-pt.json"), JSON.stringify(namesPt, null, 2), "utf-8");
console.log("Saved item-names-pt.json");
