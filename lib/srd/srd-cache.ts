import { openDB } from "idb";
import type { SrdMonster, SrdSpell, SrdCondition } from "./srd-loader";
import type { RulesetVersion } from "@/lib/types/database";

const DB_NAME = "srd-cache";
// Bumped to 2: SrdMonster extended with full stat block fields (story 4.2)
const DB_VERSION = 2;

// Singleton promise — one IDBDatabase connection shared across all reads/writes
let _dbPromise: ReturnType<typeof openDB> | null = null;

function getDb() {
  if (!_dbPromise) {
    _dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("monsters")) {
          db.createObjectStore("monsters");
        }
        if (!db.objectStoreNames.contains("spells")) {
          db.createObjectStore("spells");
        }
        if (!db.objectStoreNames.contains("conditions")) {
          db.createObjectStore("conditions");
        }
      },
    });
  }
  return _dbPromise;
}

export async function getCachedMonsters(
  version: RulesetVersion
): Promise<SrdMonster[] | null> {
  try {
    const db = await getDb();
    const result = await db.get("monsters", version);
    return result ?? null;
  } catch {
    return null;
  }
}

export async function setCachedMonsters(
  version: RulesetVersion,
  data: SrdMonster[]
): Promise<void> {
  try {
    const db = await getDb();
    await db.put("monsters", data, version);
  } catch {
    // Private browsing or storage quota — degrade gracefully
  }
}

export async function getCachedSpells(
  version: RulesetVersion
): Promise<SrdSpell[] | null> {
  try {
    const db = await getDb();
    const result = await db.get("spells", version);
    return result ?? null;
  } catch {
    return null;
  }
}

export async function setCachedSpells(
  version: RulesetVersion,
  data: SrdSpell[]
): Promise<void> {
  try {
    const db = await getDb();
    await db.put("spells", data, version);
  } catch {
    // Private browsing or storage quota — degrade gracefully
  }
}

export async function getCachedConditions(): Promise<SrdCondition[] | null> {
  try {
    const db = await getDb();
    const result = await db.get("conditions", "all");
    return result ?? null;
  } catch {
    return null;
  }
}

export async function setCachedConditions(
  data: SrdCondition[]
): Promise<void> {
  try {
    const db = await getDb();
    await db.put("conditions", data, "all");
  } catch {
    // Private browsing or storage quota — degrade gracefully
  }
}
