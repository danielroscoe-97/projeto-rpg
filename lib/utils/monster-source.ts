/**
 * Mapping of D&D 5e source book abbreviations to full names.
 * Used to display the origin of each monster in stat blocks.
 */

const SOURCE_NAMES: Record<string, string> = {
  // ── Core Rulebooks ──
  MM: "Monster Manual",
  XMM: "Monster Manual (2024)",
  PHB: "Player's Handbook",
  DMG: "Dungeon Master's Guide",
  XGE: "Xanathar's Guide to Everything",
  TCE: "Tasha's Cauldron of Everything",

  // ── Monster Supplements ──
  VGM: "Volo's Guide to Monsters",
  MTF: "Mordenkainen's Tome of Foes",
  MPMM: "Mordenkainen Presents: Monsters of the Multiverse",
  FTD: "Fizban's Treasury of Dragons",
  BGG: "Bigby Presents: Glory of the Giants",
  BAM: "Boo's Astral Menagerie",
  MPP: "Morte's Planar Parade",
  BMT: "The Book of Many Things",

  // ── Setting Books ──
  GGR: "Guildmaster's Guide to Ravnica",
  MOT: "Mythic Odysseys of Theros",
  EGW: "Explorer's Guide to Wildemount",
  ERLW: "Eberron: Rising from the Last War",
  VRGR: "Van Richten's Guide to Ravenloft",
  SCC: "Strixhaven: A Curriculum of Chaos",
  AI: "Acquisitions Incorporated",

  // ── Adventures ──
  CoS: "Curse of Strahd",
  SKT: "Storm King's Thunder",
  OotA: "Out of the Abyss",
  WDH: "Waterdeep: Dragon Heist",
  WDMM: "Waterdeep: Dungeon of the Mad Mage",
  ToA: "Tomb of Annihilation",
  PotA: "Princes of the Apocalypse",
  HotDQ: "Hoard of the Dragon Queen",
  RoT: "Rise of Tiamat",
  LMoP: "Lost Mine of Phandelver",
  BGDIA: "Baldur's Gate: Descent into Avernus",
  IDRotF: "Icewind Dale: Rime of the Frostmaiden",
  WBtW: "The Wild Beyond the Witchlight",
  TftYP: "Tales from the Yawning Portal",
  GoS: "Ghosts of Saltmarsh",
  CM: "Candlekeep Mysteries",
  CRCotN: "Critical Role: Call of the Netherdeep",
  DSotDQ: "Dragonlance: Shadow of the Dragon Queen",
  KftGV: "Keys from the Golden Vault",
  PaBTSO: "Phandelver and Below: The Shattered Obelisk",
  JttRC: "Journeys through the Radiant Citadel",
  VEoR: "Vecna: Eve of Ruin",
  CoA: "Chains of Asmodeus",
  QftIS: "Quests from the Infinite Staircase",
  FRAiF: "Forgotten Realms: Adventures in the Forgotten Realms",
  DoSI: "Dragons of Stormwreck Isle",
  LLK: "Lost Laboratory of Kwalish",
  IMR: "Infernal Machine Rebuild",
  ToFW: "Turn of Fortune's Wheel",
  LoX: "Light of Xaryxis",
  MaBJoV: "Minsc and Boo's Journal of Villainy",
  OoW: "Odyssey of the Dragonlords",
  WttHC: "Where the Hooked Horrors Crawl",
  HotB: "Hunt of the Beastlands",

  // ── Plane Shift Series ──
  PSX: "Plane Shift: Ixalan",
  PSZ: "Plane Shift: Zendikar",
  PSK: "Plane Shift: Kaladesh",
  PSA: "Plane Shift: Amonkhet",
  PSI: "Plane Shift: Innistrad",
  PSD: "Plane Shift: Dominaria",

  // ── Miscellaneous ──
  MFF: "Mordenkainen's Fiendish Folio",
  MAD: "Monster a Day",
  NF: "Nerzugal's Extended Bestiary",
  DC: "Divine Contention",
  DIP: "Dragon of Icespire Peak",
  LR: "Locathah Rising",
  EFA: "Essentials Kit: Follow-up Adventures",
  AWM: "Adventure with Muk",
  SLW: "Storm Lord's Wrath",
  LFL: "Legends of the Forgotten Lands",
  RMBRE: "Ravenloft: Mist Hunters",
  HAT_TG: "Honor Among Thieves: Thieves' Gallery",
  "HAT-TG": "Honor Among Thieves: Thieves' Gallery",

  // ── Monster Compendium Volumes ──
  MCV1SC: "Monstrous Compendium Vol. 1: Spelljammer",
  MCV2DC: "Monstrous Compendium Vol. 2: Dragonlance",
  MCV3MC: "Monstrous Compendium Vol. 3: Minecraft",
  MCV4EC: "Monstrous Compendium Vol. 4: Eldraine",
  MisMV1: "Misplaced Monsters Vol. 1",
};

/** Get the full book name for a source abbreviation. Falls back to the abbreviation itself. */
export function getSourceName(source: string | undefined | null): string | null {
  if (!source) return null;
  return SOURCE_NAMES[source] ?? source;
}

/**
 * Source category for visual styling.
 * - "srd"       → SRD 5.1 / 2024 (free, open content)
 * - "community" → Community content (MAD, homebrew)
 * - "official"  → WotC published book (not SRD)
 */
export type SourceCategory = "srd" | "community" | "official";

const COMMUNITY_SOURCES = new Set(["MAD"]);

export function getSourceCategory(
  source: string | undefined | null,
  isSrd?: boolean,
): SourceCategory {
  if (!source) return "official";
  if (COMMUNITY_SOURCES.has(source)) return "community";
  if (isSrd) return "srd";
  return "official";
}
