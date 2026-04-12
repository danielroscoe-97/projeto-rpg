#!/usr/bin/env ts-node
/**
 * translate-monster-names.ts
 *
 * Translates ALL untranslated monster names to PT-BR using a dictionary
 * built from existing translations + pattern matching. No API needed.
 *
 * Usage:
 *   # Dry run — show what would be translated:
 *   npx tsx scripts/translate-monster-names.ts --dry-run
 *
 *   # Translate all missing names:
 *   npx tsx scripts/translate-monster-names.ts
 *
 *   # Show stats only:
 *   npx tsx scripts/translate-monster-names.ts --stats
 */

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const DATA_DIR = join(process.cwd(), "data", "srd");

// ── Helpers ──────────────────────────────────────────────────────────

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[''""]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

interface MonsterRaw {
  id: string;
  name: string;
  type: string;
  cr: string;
  source?: string;
  is_srd?: boolean;
  monster_a_day_url?: string;
}

interface DescPtEntry {
  name?: string;
  special_abilities?: Record<string, string>;
  actions?: Record<string, string>;
  reactions?: Record<string, string>;
  legendary_actions?: Record<string, string>;
  lair_actions?: Record<string, string>;
  regional_effects?: Record<string, string>;
}

// ── Word-level translation dictionary ────────────────────────────────
// Built from analyzing 892 existing EN→PT translation pairs.
// Words are matched case-insensitively.

const WORD_DICT: Record<string, string> = {
  // ── Creature types ────────────────────────────────
  dragon: "Dragão",
  dracolich: "Dracolich",
  drake: "Draco",
  dragonet: "Dragonete",
  wyrmling: "Filhote",
  wyvern: "Wyvern",
  demon: "Demônio",
  devil: "Diabo",
  fiend: "Demônio",
  imp: "Diabrete",
  giant: "Gigante",
  elemental: "Elemental",
  golem: "Golem",
  ghost: "Fantasma",
  spirit: "Espírito",
  skeleton: "Esqueleto",
  zombie: "Zumbi",
  vampire: "Vampiro",
  mummy: "Múmia",
  lich: "Lich",
  wraith: "Aparição",
  specter: "Espectro",
  spectre: "Espectro",
  ghoul: "Carniçal",
  ghast: "Carniçal Maior",
  wight: "Corpo Seco",
  revenant: "Revenant",
  banshee: "Banshee",
  wolf: "Lobo",
  bear: "Urso",
  spider: "Aranha",
  snake: "Serpente",
  serpent: "Serpente",
  rat: "Rato",
  bat: "Morcego",
  hawk: "Falcão",
  eagle: "Águia",
  owl: "Coruja",
  raven: "Corvo",
  crow: "Corvo",
  vulture: "Abutre",
  shark: "Tubarão",
  scorpion: "Escorpião",
  beetle: "Besouro",
  wasp: "Vespa",
  spider: "Aranha",
  toad: "Sapo",
  frog: "Sapo",
  lizard: "Lagarto",
  crocodile: "Crocodilo",
  crab: "Caranguejo",
  octopus: "Polvo",
  lion: "Leão",
  tiger: "Tigre",
  panther: "Pantera",
  boar: "Javali",
  goat: "Cabra",
  deer: "Cervo",
  elk: "Alce",
  horse: "Cavalo",
  pony: "Pônei",
  mule: "Mula",
  camel: "Camelo",
  elephant: "Elefante",
  mammoth: "Mamute",
  rhinoceros: "Rinoceronte",
  hyena: "Hiena",
  jackal: "Chacal",
  weasel: "Doninha",
  badger: "Texugo",
  ape: "Símio",
  baboon: "Babuíno",
  cat: "Gato",
  dog: "Cão",
  hound: "Cão",
  mastiff: "Mastim",
  // ── Class/role terms ──────────────────────────────
  knight: "Cavaleiro",
  warrior: "Guerreiro",
  fighter: "Guerreiro",
  mage: "Mago",
  wizard: "Mago",
  sorcerer: "Feiticeiro",
  warlock: "Bruxo",
  priest: "Sacerdote",
  cleric: "Clérigo",
  druid: "Druida",
  paladin: "Paladino",
  ranger: "Patrulheiro",
  rogue: "Ladino",
  bard: "Bardo",
  monk: "Monge",
  barbarian: "Bárbaro",
  assassin: "Assassino",
  archer: "Arqueiro",
  scout: "Batedor",
  guard: "Guarda",
  captain: "Capitão",
  commander: "Comandante",
  general: "General",
  champion: "Campeão",
  warlord: "Senhor da Guerra",
  chief: "Chefe",
  boss: "Chefe",
  lord: "Senhor",
  lady: "Senhora",
  king: "Rei",
  queen: "Rainha",
  prince: "Príncipe",
  princess: "Princesa",
  baron: "Barão",
  duke: "Duque",
  count: "Conde",
  emperor: "Imperador",
  gladiator: "Gladiador",
  veteran: "Veterano",
  noble: "Nobre",
  commoner: "Plebeu",
  thug: "Capanga",
  bandit: "Bandido",
  cultist: "Cultista",
  spy: "Espião",
  acolyte: "Acólito",
  berserker: "Berserker",
  // ── D&D creatures ─────────────────────────────────
  beholder: "Beholder",
  aboleth: "Aboleth",
  goblin: "Goblin",
  hobgoblin: "Hobgoblin",
  bugbear: "Bugbear",
  kobold: "Kobold",
  orc: "Orc",
  ogre: "Ogro",
  troll: "Troll",
  gnoll: "Gnoll",
  minotaur: "Minotauro",
  centaur: "Centauro",
  satyr: "Sátiro",
  dryad: "Dríade",
  nymph: "Ninfa",
  treant: "Ent",
  unicorn: "Unicórnio",
  pegasus: "Pégaso",
  griffon: "Grifo",
  hippogriff: "Hipogrifo",
  manticore: "Mantícora",
  chimera: "Quimera",
  basilisk: "Basilisco",
  cockatrice: "Cocatriz",
  hydra: "Hidra",
  kraken: "Kraken",
  sphinx: "Esfinge",
  gargoyle: "Gárgula",
  goliath: "Golias",
  cyclops: "Ciclope",
  harpy: "Harpia",
  medusa: "Medusa",
  lamia: "Lâmia",
  naga: "Naga",
  salamander: "Salamandra",
  homunculus: "Homúnculo",
  scarecrow: "Espantalho",
  mimic: "Mímico",
  doppelganger: "Doppelgänger",
  werewolf: "Lobisomem",
  owlbear: "Urso-coruja",
  stirge: "Estirge",
  pseudodragon: "Pseudodragão",
  peryton: "Periton",
  // ── Modifiers / adjectives ────────────────────────
  adult: "Adulto",
  young: "Jovem",
  ancient: "Ancião",
  elder: "Ancião",
  old: "Velho",
  greater: "Maior",
  lesser: "Menor",
  giant: "Gigante",
  dire: "Gigante",
  huge: "Enorme",
  tiny: "Minúsculo",
  small: "Pequeno",
  large: "Grande",
  awakened: "Desperto",
  animated: "Animado",
  cursed: "Amaldiçoado",
  blessed: "Abençoado",
  corrupted: "Corrompido",
  burning: "Flamejante",
  flaming: "Flamejante",
  frozen: "Congelado",
  flying: "Voador",
  winged: "Alado",
  armored: "Blindado",
  armoured: "Blindado",
  skeletal: "Esquelético",
  spectral: "Espectral",
  shadow: "Sombrio",
  phantom: "Fantasma",
  ethereal: "Etéreo",
  invisible: "Invisível",
  poisonous: "Venenoso",
  venomous: "Venenoso",
  abyssal: "Abissal",
  infernal: "Infernal",
  celestial: "Celestial",
  arcane: "Arcano",
  divine: "Divino",
  feral: "Feral",
  wild: "Selvagem",
  savage: "Selvagem",
  blood: "Sangue",
  bone: "Osso",
  iron: "Ferro",
  steel: "Aço",
  stone: "Pedra",
  crystal: "Cristal",
  clockwork: "Mecânico",
  mechanical: "Mecânico",
  undead: "Morto-vivo",
  fiendish: "Demoníaco",
  demonic: "Demoníaco",
  // ── Colors ────────────────────────────────────────
  red: "Vermelho",
  blue: "Azul",
  green: "Verde",
  white: "Branco",
  black: "Negro",
  gold: "Dourado",
  golden: "Dourado",
  silver: "Prateado",
  bronze: "de Bronze",
  brass: "de Latão",
  copper: "de Cobre",
  gray: "Cinzento",
  grey: "Cinzento",
  brown: "Pardo",
  purple: "Púrpura",
  violet: "Violeta",
  scarlet: "Escarlate",
  crimson: "Carmesim",
  amber: "Âmbar",
  amethyst: "Ametista",
  emerald: "Esmeralda",
  sapphire: "Safira",
  topaz: "Topázio",
  obsidian: "Obsidiana",
  // ── Elements / domains ────────────────────────────
  fire: "Fogo",
  flame: "Chama",
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
  necrotic: "Necrótico",
  radiant: "Radiante",
  psychic: "Psíquico",
  force: "Força",
  dust: "Poeira",
  mud: "Lama",
  magma: "Magma",
  smoke: "Fumaça",
  steam: "Vapor",
  sand: "Areia",
  snow: "Neve",
  // ── Actions / roles ───────────────────────────────
  hunter: "Caçador",
  stalker: "Perseguidor",
  slayer: "Matador",
  guardian: "Guardião",
  watcher: "Vigia",
  sentinel: "Sentinela",
  keeper: "Guardião",
  collector: "Coletor",
  destroyer: "Destruidor",
  devourer: "Devorador",
  seeker: "Buscador",
  herald: "Arauto",
  speaker: "Porta-Voz",
  master: "Mestre",
  mistress: "Mestra",
  dancer: "Dançarino",
  singer: "Cantor",
  weaver: "Tecelão",
  forger: "Forjador",
  smith: "Ferreiro",
  // ── Terrain / location ────────────────────────────
  swamp: "Pântano",
  marsh: "Pântano",
  bog: "Charco",
  forest: "Floresta",
  jungle: "Selva",
  mountain: "Montanha",
  hill: "Colina",
  cave: "Caverna",
  sea: "Mar",
  ocean: "Oceano",
  river: "Rio",
  lake: "Lago",
  desert: "Deserto",
  arctic: "Ártico",
  winter: "Inverno",
  summer: "Verão",
  night: "Noturno",
  dark: "Sombrio",
  deep: "Profundo",
  cloud: "Nuvem",
  sky: "Céu",
  moon: "Lua",
  sun: "Sol",
  star: "Estrela",
  // ── Materials / body ──────────────────────────────
  clay: "Argila",
  flesh: "Carne",
  wood: "Madeira",
  ash: "Cinza",
  coal: "Carvão",
  glass: "Vidro",
  // ── Collective / groups ───────────────────────────
  swarm: "Enxame",
  horde: "Horda",
  pack: "Matilha",
  brood: "Ninhada",
  spawn: "Cria",
  // ── Animals / beasts ────────────────────────────────
  chicken: "Galinha",
  rooster: "Galo",
  cow: "Vaca",
  bull: "Touro",
  ox: "Boi",
  pig: "Porco",
  sheep: "Ovelha",
  ram: "Carneiro",
  donkey: "Burro",
  monkey: "Macaco",
  gorilla: "Gorila",
  whale: "Baleia",
  dolphin: "Golfinho",
  seal: "Foca",
  turtle: "Tartaruga",
  tortoise: "Tartaruga",
  alligator: "Jacaré",
  toad: "Sapo",
  newt: "Tritão",
  salamander: "Salamandra",
  worm: "Verme",
  slug: "Lesma",
  snail: "Caracol",
  moth: "Mariposa",
  fly: "Mosca",
  ant: "Formiga",
  bee: "Abelha",
  mosquito: "Mosquito",
  centipede: "Centopeia",
  leech: "Sanguessuga",
  squid: "Lula",
  jellyfish: "Água-viva",
  eel: "Enguia",
  pike: "Lúcio",
  piranha: "Piranha",
  stag: "Cervo",
  fox: "Raposa",
  hare: "Lebre",
  rabbit: "Coelho",
  squirrel: "Esquilo",
  hedgehog: "Ouriço",
  // ── Misc ──────────────────────────────────────────
  avatar: "Avatar",
  construct: "Construto",
  aberration: "Aberração",
  ooze: "Gosma",
  plant: "Planta",
  beast: "Besta",
  monstrosity: "Monstruosidade",
  horror: "Horror",
  terror: "Terror",
  nightmare: "Pesadelo",
  plague: "Praga",
  pestilent: "Pestilento",
  death: "Morte",
  war: "Guerra",
  siege: "Cerco",
  battle: "Batalha",
  fallen: "Caído",
  risen: "Ressurgido",
  living: "Vivo",
  walking: "Ambulante",
  crawling: "Rastejante",
  creeping: "Rastejante",
  rug: "Tapete",
  sword: "Espada",
  shield: "Escudo",
  armor: "Armadura",
  helm: "Elmo",
  helmed: "Encouraçado",
  chain: "Corrente",
  hammer: "Martelo",
  axe: "Machado",
  spear: "Lança",
  staff: "Cajado",
  wand: "Varinha",
  throne: "Trono",
  crown: "Coroa",
  tomb: "Tumba",
  grave: "Túmulo",
  crypt: "Cripta",
  temple: "Templo",
  tower: "Torre",
  gate: "Portal",
  bridge: "Ponte",
  // ── Time / space ──────────────────────────────────
  time: "Temporal",
  lunar: "Lunar",
  solar: "Solar",
  astral: "Astral",
  ethereal: "Etéreo",
  planar: "Planar",
  void: "Vazio",
  chaos: "Caos",
  order: "Ordem",
  // ── States / conditions ───────────────────────────
  corrupted: "Corrompido",
  deformed: "Deformado",
  mutated: "Mutante",
  enraged: "Enfurecido",
  frenzied: "Frenético",
  starved: "Faminto",
  ravenous: "Voraz",
  diseased: "Doente",
  blighted: "Corrompido",
  charmed: "Enfeitiçado",
  petrified: "Petrificado",
  // ── More roles ────────────────────────────────────
  witch: "Bruxa",
  shaman: "Xamã",
  necromancer: "Necromante",
  conjurer: "Conjurador",
  enchanter: "Encantador",
  evoker: "Evocador",
  illusionist: "Ilusionista",
  diviner: "Adivinho",
  abjurer: "Abjurador",
  transmuter: "Transmutador",
  seer: "Vidente",
  prophet: "Profeta",
  oracle: "Oráculo",
  healer: "Curandeiro",
  herbalist: "Herbalista",
  alchemist: "Alquimista",
  artisan: "Artesão",
  merchant: "Mercador",
  sailor: "Marinheiro",
  pirate: "Pirata",
  smuggler: "Contrabandista",
  inquisitor: "Inquisidor",
  executioner: "Carrasco",
  torturer: "Torturador",
  jailer: "Carcereiro",
  warden: "Guardião",
  champion: "Campeão",
  emissary: "Emissário",
  envoy: "Enviado",
  ambassador: "Embaixador",
  advisor: "Conselheiro",
  bodyguard: "Guarda-costas",
  soldier: "Soldado",
  recruit: "Recruta",
  mercenary: "Mercenário",
  // ── Body parts / creatures ────────────────────────
  skull: "Crânio",
  fang: "Presa",
  claw: "Garra",
  talon: "Garra",
  horn: "Chifre",
  tail: "Cauda",
  wing: "Asa",
  eye: "Olho",
  maw: "Fauce",
  jaw: "Mandíbula",
  tooth: "Dente",
  // ── Misc creatures / terms ────────────────────────
  spawn: "Cria",
  hatchling: "Filhote",
  whelp: "Filhote",
  cub: "Filhote",
  pup: "Filhote",
  brute: "Brutamontes",
  wretch: "Miserável",
  thrall: "Escravo",
  minion: "Lacaio",
  servant: "Servo",
  slave: "Escravo",
  chosen: "Escolhido",
  favored: "Favorecido",
  blessed: "Abençoado",
  exalted: "Exaltado",
  corrupted: "Corrompido",
  afflicted: "Afligido",
  possessed: "Possuído",
  tormented: "Atormentado",
  accursed: "Amaldiçoado",
  bound: "Aprisionado",
  // ── Weapons / equipment ───────────────────────────
  bow: "Arco",
  crossbow: "Besta",
  dagger: "Adaga",
  blade: "Lâmina",
  scimitar: "Cimitarra",
  lance: "Lança",
  mace: "Maça",
  flail: "Mangual",
  whip: "Chicote",
  trident: "Tridente",
  halberd: "Alabarda",
  pike: "Pique",
  net: "Rede",
  arrow: "Flecha",
  bolt: "Virote",
  cannon: "Canhão",
  catapult: "Catapulta",
  // ── Common nouns ───────────────────────────────────
  book: "Livro",
  books: "Livros",
  doll: "Boneca",
  puppet: "Marionete",
  statue: "Estátua",
  idol: "Ídolo",
  totem: "Totem",
  mask: "Máscara",
  candle: "Vela",
  lantern: "Lanterna",
  torch: "Tocha",
  key: "Chave",
  coin: "Moeda",
  gem: "Gema",
  jewel: "Joia",
  ring: "Anel",
  amulet: "Amuleto",
  orb: "Orbe",
  stone: "Pedra",
  rock: "Rocha",
  boulder: "Pedregulho",
  tree: "Árvore",
  shrub: "Arbusto",
  vine: "Trepadeira",
  mushroom: "Cogumelo",
  fungus: "Fungo",
  moss: "Musgo",
  thorn: "Espinho",
  root: "Raiz",
  seed: "Semente",
  flower: "Flor",
  rose: "Rosa",
  leaf: "Folha",
  berry: "Fruto",
  fruit: "Fruto",
  bone: "Osso",
  corpse: "Cadáver",
  skull: "Crânio",
  skin: "Pele",
  blood: "Sangue",
  heart: "Coração",
  brain: "Cérebro",
  soul: "Alma",
  corruption: "Corrupção",
  affliction: "Aflição",
  ambush: "Emboscada",
  trap: "Armadilha",
  web: "Teia",
  nest: "Ninho",
  hive: "Colmeia",
  lair: "Covil",
  den: "Toca",
  burrow: "Toca",
  pit: "Fosso",
  pool: "Poça",
  spring: "Nascente",
  well: "Poço",
  fog: "Névoa",
  mist: "Névoa",
  cloud: "Nuvem",
  rain: "Chuva",
  storm: "Tempestade",
  flood: "Enchente",
  wave: "Onda",
  tide: "Maré",
  ship: "Navio",
  boat: "Barco",
  cart: "Carroça",
  wagon: "Carroça",
  chariot: "Biga",
  treasure: "Tesouro",
  chest: "Baú",
  barrel: "Barril",
  cage: "Gaiola",
  chain: "Corrente",
  rope: "Corda",
  flag: "Bandeira",
  banner: "Estandarte",
  drum: "Tambor",
  bell: "Sino",
  horn: "Chifre",
  pipe: "Flauta",
  flute: "Flauta",
  lyre: "Lira",
  harp: "Harpa",
  mirror: "Espelho",
  door: "Porta",
  wall: "Muro",
  pillar: "Pilar",
  column: "Coluna",
  stair: "Escada",
  stairs: "Escadas",
  pain: "Dor",
  suffering: "Sofrimento",
  agony: "Agonia",
  despair: "Desespero",
  dread: "Pavor",
  fear: "Medo",
  rage: "Fúria",
  fury: "Fúria",
  wrath: "Ira",
  hunger: "Fome",
  thirst: "Sede",
  greed: "Ganância",
  envy: "Inveja",
  pride: "Orgulho",
  sloth: "Preguiça",
  lust: "Luxúria",
  gluttony: "Gula",
  ruin: "Ruína",
  doom: "Perdição",
  bane: "Perdição",
  blight: "Praga",
  rot: "Podridão",
  decay: "Decomposição",
  filth: "Imundície",
  stench: "Fedor",
  noise: "Barulho",
  silence: "Silêncio",
  dream: "Sonho",
  vision: "Visão",
  memory: "Memória",
  thought: "Pensamento",
  mind: "Mente",
  voice: "Voz",
  song: "Canção",
  cry: "Grito",
  roar: "Rugido",
  whisper: "Sussurro",
  scream: "Grito",
  breath: "Sopro",
  gaze: "Olhar",
  touch: "Toque",
  // ── More adjectives ───────────────────────────────
  damaged: "Danificado",
  painted: "Pintado",
  broken: "Quebrado",
  ruined: "Arruinado",
  shattered: "Despedaçado",
  twisted: "Retorcido",
  warped: "Deformado",
  hollow: "Oco",
  empty: "Vazio",
  sealed: "Selado",
  hidden: "Oculto",
  secret: "Secreto",
  enchanted: "Encantado",
  magic: "Mágico",
  magical: "Mágico",
  sacred: "Sagrado",
  holy: "Sagrado",
  unholy: "Profano",
  dark: "Sombrio",
  bright: "Brilhante",
  pale: "Pálido",
  rotting: "Apodrecido",
  decaying: "Decomposto",
  withered: "Ressecado",
  barbed: "Espinhoso",
  horned: "Cornudo",
  fanged: "Presas",
  tusked: "Presas",
  clawed: "Garras",
  spiked: "Cravejado",
  blooded: "Sangrento",
  bloody: "Sangrento",
  // ── Actions / states ──────────────────────────────
  raging: "Enfurecido",
  sleeping: "Adormecido",
  dreaming: "Sonhador",
  wandering: "Errante",
  roaming: "Nômade",
  lurking: "Espreita",
  prowling: "Rondando",
  screaming: "Gritando",
  whispering: "Sussurrante",
  howling: "Uivante",
  laughing: "Risonho",
  weeping: "Choroso",
  starving: "Faminto",
  hunting: "Caçador",
  charging: "Investindo",
  // ── Buildings / places ────────────────────────────
  castle: "Castelo",
  fortress: "Fortaleza",
  dungeon: "Masmorra",
  prison: "Prisão",
  altar: "Altar",
  shrine: "Santuário",
  chapel: "Capela",
  cathedral: "Catedral",
  palace: "Palácio",
  mansion: "Mansão",
  tavern: "Taverna",
  market: "Mercado",
  harbor: "Porto",
  port: "Porto",
  garden: "Jardim",
  grove: "Bosque",
  vale: "Vale",
  valley: "Vale",
  peak: "Pico",
  island: "Ilha",
  // ── Races / people ────────────────────────────────
  elf: "Elfo",
  dwarf: "Anão",
  halfling: "Halfling",
  gnome: "Gnomo",
  tiefling: "Tiefling",
  dragonborn: "Draconato",
  human: "Humano",
  half: "Meio",
  aasimar: "Aasimar",
  genasi: "Genasi",
  firbolg: "Firbolg",
  tortle: "Tortle",
  kenku: "Kenku",
  tabaxi: "Tabaxi",
  lizardfolk: "Povo-Lagarto",
  merfolk: "Tritão",
};

// ── Compound patterns ────────────────────────────────────────────────
// Ordered: more specific patterns first.

interface TranslationPattern {
  regex: RegExp;
  replace: (m: RegExpMatchArray) => string;
}

function w(word: string): string {
  return WORD_DICT[word.toLowerCase()] ?? word;
}

const PATTERNS: TranslationPattern[] = [
  // "Swarm of Xs" → "Enxame de Xs"
  {
    regex: /^Swarm of (.+)$/i,
    replace: (m) => `Enxame de ${translateCompound(m[1])}`,
  },
  // "X Wyrmling" → "Filhote de X"
  {
    regex: /^(.+) Wyrmling$/i,
    replace: (m) => `Filhote de ${translateCompound(m[1])}`,
  },
  // "X Elemental" → "Elemental de/do X"
  {
    regex: /^(\w+) Elemental$/i,
    replace: (m) => {
      const elem = w(m[1]);
      const prep = needsArticle(elem);
      return `Elemental ${prep} ${elem}`;
    },
  },
  // "X Elemental Y" → "Elemental de X Y"
  {
    regex: /^(\w+) Elemental (.+)$/i,
    replace: (m) => {
      const elem = w(m[1]);
      const prep = needsArticle(elem);
      return `Elemental ${prep} ${elem} ${translateCompound(m[2])}`;
    },
  },
  // "X Golem" → "Golem de X"
  {
    regex: /^(.+) Golem$/i,
    replace: (m) => `Golem de ${translateCompound(m[1])}`,
  },
  // "X Zombie" → "Zumbi X"
  {
    regex: /^(.+) Zombie$/i,
    replace: (m) => `Zumbi ${translateCompound(m[1])}`,
  },
  // "X Skeleton" → "Esqueleto de X"
  {
    regex: /^(.+) Skeleton$/i,
    replace: (m) => `Esqueleto de ${translateCompound(m[1])}`,
  },
  // "X Ghost" → "Fantasma X"
  {
    regex: /^(.+) Ghost$/i,
    replace: (m) => `Fantasma ${translateCompound(m[1])}`,
  },
  // "X Spirit" → "Espírito X"
  {
    regex: /^(.+) Spirit$/i,
    replace: (m) => `Espírito ${translateCompound(m[1])}`,
  },
  // "X Spawn" → "Cria de X"
  {
    regex: /^(.+) Spawn$/i,
    replace: (m) => `Cria de ${translateCompound(m[1])}`,
  },
  // "X Demon" → "Demônio X"
  {
    regex: /^(.+) Demon$/i,
    replace: (m) => `Demônio ${translateCompound(m[1])}`,
  },
  // "X Devil" → "Diabo X"
  {
    regex: /^(.+) Devil(\s*\(.*\))?$/i,
    replace: (m) => {
      const paren = m[2] ? m[2].replace(/Type (\d+)/gi, "Tipo $1") : "";
      return `Diabo ${translateCompound(m[1])}${paren}`;
    },
  },
  // "Adult/Young/Ancient COLOR Dragon" → "Dragão COR AGE"
  {
    regex: /^(Adult|Young|Ancient|Elder) (.+) (Dragon|Dracolich)$/i,
    replace: (m) => `${w(m[3])} ${translateCompound(m[2])} ${w(m[1])}`,
  },
  // "COLOR Dragon" → "Dragão COR"
  {
    regex: /^(.+) Dragon$/i,
    replace: (m) => `Dragão ${translateCompound(m[1])}`,
  },
  // "Giant X" → "X Gigante"
  {
    regex: /^Giant (.+)$/i,
    replace: (m) => `${translateCompound(m[1])} Gigante`,
  },
  // "Dire X" → "X Gigante"
  {
    regex: /^Dire (.+)$/i,
    replace: (m) => `${translateCompound(m[1])} Gigante`,
  },
  // "X Giant" → "Gigante de/do X"
  {
    regex: /^(\w+) Giant$/i,
    replace: (m) => {
      const adj = w(m[1]);
      const prep = needsArticle(adj);
      return `Gigante ${prep} ${adj}`;
    },
  },
  // "X Giant Y" → "Gigante de X Y" (e.g. "Fire Giant Jailer")
  {
    regex: /^(\w+) Giant (.+)$/i,
    replace: (m) => {
      const adj = w(m[1]);
      const prep = needsArticle(adj);
      return `Gigante ${prep} ${adj} ${translateCompound(m[2])}`;
    },
  },
  // "X Hag" → "Bruxa X"
  {
    regex: /^(.+) Hag$/i,
    replace: (m) => `Bruxa ${translateCompound(m[1])}`,
  },
  // "X Mephit" → "Mefite de X"
  {
    regex: /^(.+) Mephit$/i,
    replace: (m) => `Mefite de ${translateCompound(m[1])}`,
  },
  // "X Drake" → "Draco X"
  {
    regex: /^(.+) Drake$/i,
    replace: (m) => `Draco ${translateCompound(m[1])}`,
  },
  // "X Wyvern" → "Wyvern X"
  {
    regex: /^(.+) Wyvern$/i,
    replace: (m) => `Wyvern ${translateCompound(m[1])}`,
  },
  // "X Naga" → "Naga X"
  {
    regex: /^(.+) Naga$/i,
    replace: (m) => `Naga ${translateCompound(m[1])}`,
  },
  // "X Beholder" → "Beholder X"
  {
    regex: /^(.+) Beholder$/i,
    replace: (m) => `Beholder ${translateCompound(m[1])}`,
  },
  // "Young X" → "X Jovem"
  {
    regex: /^Young (.+)$/i,
    replace: (m) => `${translateCompound(m[1])} Jovem`,
  },
  // "Adult X" → "X Adulto"
  {
    regex: /^Adult (.+)$/i,
    replace: (m) => `${translateCompound(m[1])} Adulto`,
  },
  // "Ancient X" → "X Ancião"
  {
    regex: /^Ancient (.+)$/i,
    replace: (m) => `${translateCompound(m[1])} Ancião`,
  },
  // "Elder X" → "X Ancião"
  {
    regex: /^Elder (.+)$/i,
    replace: (m) => `${translateCompound(m[1])} Ancião`,
  },
  // "Greater X" → "X Maior"
  {
    regex: /^Greater (.+)$/i,
    replace: (m) => `${translateCompound(m[1])} Maior`,
  },
  // "Lesser X" → "X Menor"
  {
    regex: /^Lesser (.+)$/i,
    replace: (m) => `${translateCompound(m[1])} Menor`,
  },
  // "X, the Y" → "X, o/a Y"  (NPC names with comma)
  {
    regex: /^(.+), the (.+)$/i,
    replace: (m) => {
      const title = translateCompound(m[2]);
      const art = genderArticle(title);
      return `${m[1]}, ${art} ${title}`;
    },
  },
  // "X the Y" → "X, o/a Y"  (NPC names without comma)
  {
    regex: /^(\w+) the (\w[\w\s]*)$/i,
    replace: (m) => {
      const title = translateCompound(m[2]);
      const art = genderArticle(title);
      return `${m[1]}, ${art} ${title}`;
    },
  },
  // "Half-X Y" → "Meio-X Y"
  {
    regex: /^Half-(.+)$/i,
    replace: (m) => `Meio-${translateCompound(m[1])}`,
  },
  // "X (Type N)" → "X (Tipo N)"
  {
    regex: /^(.+)\s*\(Type (\d+)\)$/i,
    replace: (m) => `${translateCompound(m[1].trim())} (Tipo ${m[2]})`,
  },
];

// ── Helper: preposition for elements ─────────────────────────────────

function needsArticle(word: string): string {
  const lower = word.toLowerCase();
  // Feminine nouns
  if (
    ["água", "terra", "neve", "lama", "areia", "poeira", "fumaça", "cinza", "pedra", "carne", "argila", "madeira", "morte", "tempestade", "colina", "montanha", "floresta"].includes(lower)
  ) {
    return "da";
  }
  // "de" for materials
  if (
    ["ferro", "aço", "bronze", "cobre", "latão", "prata", "ouro", "gelo", "cristal", "vidro", "carvão", "magma", "vapor"].includes(lower)
  ) {
    return "de";
  }
  // "do" for masculine nouns
  if (
    ["ar", "fogo", "mar", "oceano", "rio", "lago", "sol", "céu", "pântano", "deserto", "trovão", "relâmpago", "gelo", "fosso", "inverno"].includes(lower)
  ) {
    return "do";
  }
  // "das" for plural feminine
  if (lower.endsWith("as")) return "das";
  // "dos" for plural masculine
  if (lower.endsWith("os")) return "dos";
  return "de";
}

function genderArticle(word: string): string {
  const lower = word.toLowerCase();
  if (
    lower.endsWith("a") || lower.endsWith("ã") || lower.endsWith("ade") ||
    ["mestra", "senhora", "bruxa", "rainha", "princesa", "exorcista"].includes(lower)
  ) {
    return "a";
  }
  return "o";
}

// ── Translate a compound phrase word by word ─────────────────────────

function translateCompound(phrase: string): string {
  // Handle parenthetical suffixes
  const parenMatch = phrase.match(/^(.+?)(\s*\(.+\))$/);
  let core = phrase;
  let paren = "";
  if (parenMatch) {
    core = parenMatch[1];
    paren = parenMatch[2].replace(/Type (\d+)/gi, "Tipo $1");
  }

  const words = core.split(/\s+/);
  const translated = words.map((wd) => {
    const key = wd.toLowerCase();
    if (WORD_DICT[key]) return WORD_DICT[key];
    return wd; // Keep proper nouns as-is
  });

  return translated.join(" ") + paren;
}

// ── Main translate function ──────────────────────────────────────────

function translateName(name: string): string {
  // Strip all double quotes (straight and curly)
  let clean = name.replace(/["""\u201C\u201D]/g, "");

  // Try exact patterns first
  for (const pat of PATTERNS) {
    const m = clean.match(pat.regex);
    if (m) return pat.replace(m);
  }

  // Fall back to word-by-word translation
  return translateCompound(clean);
}

// ── CLI args ─────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const statsOnly = args.includes("--stats");
const forceAll = args.includes("--force");

// ── Load data ────────────────────────────────────────────────────────

function loadJson<T>(filename: string): T {
  return JSON.parse(readFileSync(join(DATA_DIR, filename), "utf-8"));
}

const m2014 = loadJson<MonsterRaw[]>("monsters-2014.json");
const m2024 = loadJson<MonsterRaw[]>("monsters-2024.json");
const mad = loadJson<MonsterRaw[]>("monsters-mad.json");
const descPt = loadJson<Record<string, DescPtEntry>>(
  "monster-descriptions-pt.json"
);

const allMonsters = [...m2014, ...m2024, ...mad];

// Deduplicate by slug
const seen = new Set<string>();
const deduped: MonsterRaw[] = [];
for (const m of allMonsters) {
  const slug = toSlug(m.name);
  if (seen.has(slug)) continue;
  seen.add(slug);
  deduped.push(m);
}

// Determine if an entry was hand-translated (has abilities/actions) vs script-generated
function isHandTranslated(entry: DescPtEntry): boolean {
  return !!(
    entry.special_abilities ||
    entry.actions ||
    entry.reactions ||
    entry.legendary_actions
  );
}

// Find monsters without PT name OR (--force) script-generated entries to re-translate
const untranslated = deduped.filter((m) => {
  const slug = toSlug(m.name);
  const existing = descPt[slug];
  if (!existing?.name) return true;
  if (forceAll && !isHandTranslated(existing)) return true;
  return false;
});

console.log(`Total unique monsters: ${deduped.length}`);
console.log(`Already translated:    ${deduped.length - untranslated.length}`);
console.log(`Missing translation:   ${untranslated.length}`);

if (statsOnly) process.exit(0);

// ── Translate ────────────────────────────────────────────────────────

let translated = 0;
let unchanged = 0;
const results: Array<{ slug: string; en: string; pt: string; changed: boolean }> = [];

for (const m of untranslated) {
  const slug = toSlug(m.name);
  const pt = translateName(m.name);
  const changed = pt.toLowerCase() !== m.name.toLowerCase().replace(/^"+|"+$/g, "").toLowerCase();

  results.push({ slug, en: m.name, pt, changed });

  if (changed) translated++;
  else unchanged++;
}

console.log(`\nTranslation results:`);
console.log(`  Translated:  ${translated}`);
console.log(`  Kept as-is:  ${unchanged} (proper nouns / no dictionary match)`);

if (dryRun) {
  console.log("\n--- Sample translations (first 80) ---");
  for (const r of results.slice(0, 80)) {
    const marker = r.changed ? "✓" : "=";
    console.log(`  ${marker} ${r.en} → ${r.pt}`);
  }
  console.log(`\n--- Kept as-is samples (first 30) ---`);
  const kept = results.filter((r) => !r.changed);
  for (const r of kept.slice(0, 30)) {
    console.log(`  = ${r.en}`);
  }
  process.exit(0);
}

// ── Write results ────────────────────────────────────────────────────

for (const r of results) {
  if (descPt[r.slug]) {
    descPt[r.slug].name = r.pt;
  } else {
    descPt[r.slug] = { name: r.pt };
  }
}

writeFileSync(
  join(DATA_DIR, "monster-descriptions-pt.json"),
  JSON.stringify(descPt, null, 2),
  "utf-8"
);
console.log("\nSaved to monster-descriptions-pt.json");

// Update monster-names-pt.json (slug → pt-slug mapping)
const namesPt = loadJson<Record<string, string>>("monster-names-pt.json");
for (const r of results) {
  const ptSlug = toSlug(r.pt);
  if (ptSlug !== r.slug) {
    namesPt[r.slug] = ptSlug;
  }
}
writeFileSync(
  join(DATA_DIR, "monster-names-pt.json"),
  JSON.stringify(namesPt, null, 2),
  "utf-8"
);
console.log("Saved to monster-names-pt.json");

console.log(
  "\nDone! Run: npx tsx scripts/filter-srd-public.ts"
);
