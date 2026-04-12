#!/usr/bin/env ts-node
/**
 * translate-feat-names.ts — Translates D&D feat names to PT-BR via dictionary.
 *
 * npx tsx scripts/translate-feat-names.ts --dry-run
 * npx tsx scripts/translate-feat-names.ts
 */
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

const DATA_DIR = join(process.cwd(), "data", "srd");

function toSlug(name: string): string {
  return name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[''""]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

const WORD_DICT: Record<string, string> = {
  // Common feat words
  alert: "Alerta", athlete: "Atleta", actor: "Ator",
  charger: "Investidor", crossbow: "Besta", dual: "Duplo",
  durable: "Durável", grappler: "Agarrador", healer: "Curandeiro",
  heavy: "Pesado", keen: "Perspicaz", lightly: "Levemente",
  lucky: "Sortudo", mage: "Mago", magic: "Mágico",
  martial: "Marcial", medium: "Médio", mobile: "Móvel",
  mounted: "Montado", observant: "Observador", resilient: "Resiliente",
  ritual: "Ritual", savage: "Selvagem", sentinel: "Sentinela",
  sharpshooter: "Atirador Preciso", shield: "Escudo",
  skilled: "Habilidoso", skulker: "Espreitador", slayer: "Matador",
  spell: "Magia", tough: "Resistente", war: "Guerra",
  weapon: "Arma", wielder: "Portador",
  // Actions
  attacker: "Atacante", caster: "Conjurador", fighter: "Combatente",
  initiate: "Iniciado", adept: "Adepto", master: "Mestre",
  expert: "Especialista", prodigy: "Prodígio",
  // Modifiers
  great: "Grande", improved: "Aprimorado", superior: "Superior",
  elemental: "Elemental", aberrant: "Aberrante", dragon: "Dragão",
  fey: "Feérico", shadow: "Sombra", divine: "Divino",
  arcane: "Arcano", eldritch: "Eldritch",
  // D&D specific
  dragonmark: "Marca do Dragão", touched: "Tocado",
  crusher: "Esmagador", piercer: "Perfurador", slasher: "Cortante",
  telekinetic: "Telecinético", telepathic: "Telepático",
  metamagic: "Metamagia", inspiring: "Inspirador", chef: "Chef",
  gunner: "Atirador", poisoner: "Envenenador",
  tavern: "Taverna", brawler: "Brigador",
  // Common words
  armor: "Armadura", combat: "Combate", defense: "Defesa",
  fighting: "Luta", style: "Estilo", ability: "Habilidade",
  score: "Atributo", improvement: "Melhoria", increase: "Aumento",
  training: "Treinamento",
  // Prepositions / articles
  of: "de",
  the: "o",
  and: "e",
  or: "ou",
  with: "com",
  from: "de",
  in: "em",
  // ── Missing words (audit fix) ──────────────────────
  archery: "Arquearia",
  blind: "Cego",
  unarmed: "Desarmado",
  mark: "Marca",
  detection: "Detecção",
  handling: "Manuseio",
  boon: "Benção",
  prowess: "Proeza",
  vigor: "Vigor",
  skill: "Perícia",
  scion: "Descendente",
  baleful: "Funesto",
  bloodlust: "Sede de Sangue",
  bomber: "Bombardeiro",
  blessed: "Abençoado",
  warrior: "Guerreiro",
  greater: "Maior",
  lesser: "Menor",
  hill: "Colina",
  fire: "Fogo",
  frost: "Gelo",
  stone: "Pedra",
  cloud: "Nuvem",
  storm: "Tempestade",
};

// ── Manual overrides for feats that don't translate well word-by-word ──
const NAME_OVERRIDES: Record<string, string> = {
  "Bountiful Luck": "Sorte Abundante",
  "Cartomancer": "Cartomante",
  "Chef": "Chef",
  "Cloying Mists": "Névoas Sufocantes",
  "Crafter": "Artífice",
  "Defensive Duelist": "Duelista Defensivo",
  "Delicious Pain": "Dor Deliciosa",
  "Divinely Favored": "Favorecido Divino",
  "Dragonscarred": "Cicatriz Dracônica",
  "Dueling": "Duelo",
  "Dungeon Delver": "Explorador de Masmorras",
  "Dwarven Fortitude": "Fortitude Anã",
  "Elven Accuracy": "Precisão Élfica",
  "Emerald Enclave Fledgling": "Novato do Enclave Esmeralda",
  "Fade Away": "Desvanecer",
  "Fairy Trickster": "Trapaceiro Feérico",
  "Harper Agent": "Agente Harper",
  "Harper Teamwork": "Trabalho em Equipe Harper",
  "Heavily Armored": "Armadura Pesada",
  "Infernal Constitution": "Constituição Infernal",
  "Interception": "Interceptação",
  "Light Bringer": "Portador da Luz",
  "Linguist": "Linguista",
  "Lordly Resolve": "Resolução Senhorial",
  "Love Bites": "Mordida do Amor",
  "Moderately Armored": "Armadura Moderada",
  "Musician": "Músico",
  "Orcish Fury": "Fúria Orc",
  "Outlands Envoy": "Enviado das Terras Exteriores",
  "Planar Wanderer": "Andarilho Planar",
  "Protection": "Proteção",
  "Putrefy": "Putrefação",
  "Quicksmithing": "Forja Rápida",
  "Rebuke": "Repreensão",
  "Revenant Blade": "Lâmina Revenant",
  "Righteous Heritor": "Herdeiro Virtuoso",
  "Rune Shaper": "Moldador de Runas",
  "Second Chance": "Segunda Chance",
  "Servo Crafting": "Fabricação de Servos",
  "Shadowmoor Hexer": "Feiticeiro de Shadowmoor",
  "Speedy": "Veloz",
  "Spellfire Spark": "Fagulha de Fogo Mágico",
  "Squat Nimbleness": "Agilidade Compacta",
  "Street Justice": "Justiça das Ruas",
  "Strixhaven Mascot": "Mascote de Strixhaven",
  "Tireless Reveler": "Folião Incansável",
  "Treacherous Allure": "Encanto Traiçoeiro",
  "Vampire Hunter": "Caçador de Vampiros",
  "Vampiric Exultation": "Exultação Vampírica",
  "Zhentarim Ruffian": "Rufião Zhentarim",
  "Zhentarim Tactics": "Táticas Zhentarim",
};

function translateCompound(phrase: string): string {
  const words = phrase.split(/\s+/);
  return words.map((wd) => WORD_DICT[wd.toLowerCase()] ?? wd).join(" ");
}

function contractPrepositions(text: string): string {
  return text
    .replace(/\bde o\b/gi, "do")
    .replace(/\bde a\b/gi, "da")
    .replace(/\bde os\b/gi, "dos")
    .replace(/\bde as\b/gi, "das")
    .replace(/\bem o\b/gi, "no")
    .replace(/\bem a\b/gi, "na");
}

function translateName(name: string): string {
  const clean = name.replace(/["""\u201C\u201D]/g, "");
  if (NAME_OVERRIDES[clean]) return contractPrepositions(NAME_OVERRIDES[clean]);
  return contractPrepositions(translateCompound(clean));
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

interface FeatRaw { id: string; name: string; source?: string; }
interface DescEntry { name_pt?: string; }

const feats = loadJson<FeatRaw[]>("feats.json");
const descPt = loadJson<Record<string, DescEntry>>("feat-descriptions-pt.json");

const seen = new Set<string>();
const deduped: FeatRaw[] = [];
for (const f of feats) {
  const slug = toSlug(f.name);
  if (seen.has(slug)) continue;
  seen.add(slug);
  deduped.push(f);
}

const untranslated = deduped.filter((f) => {
  const slug = toSlug(f.name);
  if (!descPt[slug]?.name_pt) return true;
  if (forceAll) return true;
  return false;
});

console.log(`Total unique feats: ${deduped.length}`);
console.log(`Already translated: ${deduped.length - untranslated.length}`);
console.log(`Missing: ${untranslated.length}`);

if (untranslated.length === 0) { console.log("All done!"); process.exit(0); }

let translated = 0, unchanged = 0;
for (const f of untranslated) {
  const slug = toSlug(f.name);
  const pt = translateName(f.name);
  if (pt.toLowerCase() !== f.name.toLowerCase()) translated++;
  else unchanged++;
  if (descPt[slug]) descPt[slug].name_pt = pt;
  else descPt[slug] = { name_pt: pt };
}

console.log(`Translated: ${translated} | Kept as-is: ${unchanged}`);

if (dryRun) {
  for (const f of untranslated.slice(0, 40)) {
    const slug = toSlug(f.name);
    const pt = descPt[slug]?.name_pt ?? f.name;
    const m = pt.toLowerCase() !== f.name.toLowerCase() ? "✓" : "=";
    console.log(`  ${m} ${f.name} → ${pt}`);
  }
  process.exit(0);
}

writeFileSync(join(DATA_DIR, "feat-descriptions-pt.json"), JSON.stringify(descPt, null, 2), "utf-8");
console.log("Saved feat-descriptions-pt.json");

const namesPt = loadJson<Record<string, string>>("feat-names-pt.json");
for (const f of untranslated) {
  const slug = toSlug(f.name);
  const pt = descPt[slug]?.name_pt;
  if (pt) { const ptSlug = toSlug(pt); if (ptSlug !== slug) namesPt[slug] = ptSlug; }
}
writeFileSync(join(DATA_DIR, "feat-names-pt.json"), JSON.stringify(namesPt, null, 2), "utf-8");
console.log("Saved feat-names-pt.json");
