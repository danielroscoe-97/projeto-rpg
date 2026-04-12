#!/usr/bin/env ts-node
/**
 * translate-background-names.ts — Translates D&D background names to PT-BR.
 *
 * npx tsx scripts/translate-background-names.ts --dry-run
 * npx tsx scripts/translate-background-names.ts
 */
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

const DATA_DIR = join(process.cwd(), "data", "srd");

function toSlug(name: string): string {
  return name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[''""]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

const WORD_DICT: Record<string, string> = {
  // Common background words
  acolyte: "Acólito", charlatan: "Charlatão", criminal: "Criminoso",
  entertainer: "Artista", folk: "Herói", hero: "Herói",
  gladiator: "Gladiador", guild: "Guilda", artisan: "Artesão",
  hermit: "Eremita", noble: "Nobre", outlander: "Forasteiro",
  sage: "Sábio", sailor: "Marinheiro", soldier: "Soldado",
  urchin: "Órfão", pirate: "Pirata", knight: "Cavaleiro",
  spy: "Espião", merchant: "Mercador", farmer: "Fazendeiro",
  guard: "Guarda", scribe: "Escriba", wayfarer: "Viajante",
  pilgrim: "Peregrino", scholar: "Erudito", hunter: "Caçador",
  exile: "Exilado", refugee: "Refugiado", smuggler: "Contrabandista",
  bounty: "Recompensa", heir: "Herdeiro", oracle: "Oráculo",
  cultist: "Cultista", detective: "Detetive", investigator: "Investigador",
  archaeologist: "Arqueólogo", anthropologist: "Antropólogo",
  athlete: "Atleta", gambler: "Apostador", survivor: "Sobrevivente",
  haunted: "Assombrado", ruined: "Arruinado", failed: "Fracassado",
  courtier: "Cortesão", diplomat: "Diplomata", envoy: "Enviado",
  emissary: "Emissário", agent: "Agente", courier: "Mensageiro",
  initiate: "Iniciado", adept: "Adepto",
  // Modifiers
  city: "Cidade", clan: "Clã", far: "Distante", wild: "Selvagem",
  urban: "Urbano", marine: "Marinheiro", royal: "Real",
  street: "Rua", house: "Casa", gate: "Portal",
  faction: "Facção", temple: "Templo", order: "Ordem",
  // Actions
  watcher: "Vigia", keeper: "Guardião", seeker: "Buscador",
  traveler: "Viajante", wanderer: "Errante", explorer: "Explorador",
  crafter: "Artífice", maker: "Fabricante", worker: "Trabalhador",
  // Misc
  of: "de", the: "o", and: "e",
  aberrant: "Aberrante", dragon: "Dragão", mark: "Marca",
  // ── Missing words (audit fix) ──────────────────────
  drifter: "Andarilho",
  astral: "Astral",
  carouser: "Boêmio",
  legionnaire: "Legionário",
  functionary: "Funcionário",
  freebooter: "Corsário",
  squire: "Escudeiro",
  purple: "Púrpura",
  mercenary: "Mercenário",
  caretaker: "Zelador",
  emerald: "Esmeralda",
  enclave: "Enclave",
  zhentarim: "Zhentarim",
  variant: "Variante",
};

// ── Manual overrides for backgrounds that don't translate well ──
const NAME_OVERRIDES: Record<string, string> = {
  "Custom Background": "Antecedente Personalizado",
  "Dead Magic Dweller": "Habitante da Magia Morta",
  "Dimir Operative": "Operativo Dimir",
  "Faceless": "Sem Rosto",
  "Feylost": "Perdido nas Fadas",
  "Fisher": "Pescador",
  "Genie Touched": "Tocado por Gênio",
  "Giant Foundling": "Criado por Gigantes",
  "Grinner": "Sorridente",
  "Gruul Anarch": "Anarquista Gruul",
  "Guide": "Guia",
  "Harper": "Harper",
  "Ice Fisher": "Pescador de Gelo",
  "Inheritor": "Herdeiro",
  "Inquisitive": "Inquisitivo",
  "Inquisitor": "Inquisidor",
  "Izzet Engineer": "Engenheiro Izzet",
  "Lorehold Student": "Estudante de Lorehold",
  "Lorwyn Expert": "Especialista de Lorwyn",
  "Mulhorandi Tomb Raider": "Saqueador de Tumbas Mulhorandi",
  "Mythalkeeper": "Guardião de Mythal",
  "Orzhov Representative": "Representante Orzhov",
  "Plaintiff": "Demandante",
  "Planar Philosopher": "Filósofo Planar",
  "Prismari Student": "Estudante de Prismari",
  "Quandrix Student": "Estudante de Quandrix",
  "Rewarded": "Recompensado",
  "Rival Intern": "Estagiário Rival",
  "Rune Carver": "Entalhador de Runas",
  "Shadowmoor Expert": "Especialista de Shadowmoor",
  "Shipwright": "Construtor Naval",
  "Silverquill Student": "Estudante de Silverquill",
  "Simic Scientist": "Cientista Simic",
  "Uthgardt Tribe Member": "Membro da Tribo Uthgardt",
  "Vampire Devotee": "Devoto Vampírico",
  "Vizier": "Vizir",
  "Wildspacer": "Viajante do Espaço Selvagem",
  "Witchlight Hand": "Artista do Witchlight",
  "Witherbloom Student": "Estudante de Witherbloom",
};

function translateCompound(phrase: string): string {
  const words = phrase.split(/\s+/);
  return words.map((wd) => WORD_DICT[wd.toLowerCase()] ?? wd).join(" ");
}

interface TranslationPattern {
  regex: RegExp;
  replace: (m: RegExpMatchArray) => string;
}

const PATTERNS: TranslationPattern[] = [
  { regex: /^(.+) Agent$/i, replace: (m) => `Agente ${translateCompound(m[1])}` },
  { regex: /^(.+) Initiate$/i, replace: (m) => `Iniciado ${translateCompound(m[1])}` },
  { regex: /^(.+) Artisan$/i, replace: (m) => `Artesão ${translateCompound(m[1])}` },
  { regex: /^(.+) Hero$/i, replace: (m) => `Herói ${translateCompound(m[1])}` },
  { regex: /^(.+) Knight$/i, replace: (m) => `Cavaleiro ${translateCompound(m[1])}` },
  { regex: /^Guild (.+)$/i, replace: (m) => `${translateCompound(m[1])} de Guilda` },
  { regex: /^Folk (.+)$/i, replace: (m) => `Herói Popular` },
];

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
  if (NAME_OVERRIDES[clean]) return NAME_OVERRIDES[clean];
  for (const pat of PATTERNS) {
    const m = clean.match(pat.regex);
    if (m) return contractPrepositions(pat.replace(m));
  }
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

interface BgRaw { id: string; name: string; source?: string; }
interface DescEntry { name_pt?: string; }

const backgrounds = loadJson<BgRaw[]>("backgrounds.json");
const descPt = loadJson<Record<string, DescEntry>>("background-descriptions-pt.json");

const seen = new Set<string>();
const deduped: BgRaw[] = [];
for (const b of backgrounds) {
  const slug = toSlug(b.name);
  if (seen.has(slug)) continue;
  seen.add(slug);
  deduped.push(b);
}

const untranslated = deduped.filter((b) => {
  if (!descPt[toSlug(b.name)]?.name_pt) return true;
  if (forceAll) return true;
  return false;
});

console.log(`Total unique backgrounds: ${deduped.length}`);
console.log(`Missing: ${untranslated.length}`);

if (untranslated.length === 0) { console.log("All done!"); process.exit(0); }

let translated = 0, unchanged = 0;
for (const b of untranslated) {
  const slug = toSlug(b.name);
  const pt = translateName(b.name);
  if (pt.toLowerCase() !== b.name.toLowerCase()) translated++;
  else unchanged++;
  descPt[slug] = { name_pt: pt };
}

console.log(`Translated: ${translated} | Kept as-is: ${unchanged}`);

if (dryRun) {
  for (const b of untranslated.slice(0, 40)) {
    const slug = toSlug(b.name);
    const pt = descPt[slug]?.name_pt ?? b.name;
    const m = pt.toLowerCase() !== b.name.toLowerCase() ? "✓" : "=";
    console.log(`  ${m} ${b.name} → ${pt}`);
  }
  process.exit(0);
}

writeFileSync(join(DATA_DIR, "background-descriptions-pt.json"), JSON.stringify(descPt, null, 2), "utf-8");
console.log("Saved background-descriptions-pt.json");

const namesPt = loadJson<Record<string, string>>("background-names-pt.json");
for (const b of untranslated) {
  const slug = toSlug(b.name);
  const pt = descPt[slug]?.name_pt;
  if (pt) { const ptSlug = toSlug(pt); if (ptSlug !== slug) namesPt[slug] = ptSlug; }
}
writeFileSync(join(DATA_DIR, "background-names-pt.json"), JSON.stringify(namesPt, null, 2), "utf-8");
console.log("Saved background-names-pt.json");
