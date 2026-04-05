import { openDB } from "idb";
import type { SrdMonster, SrdSpell, SrdCondition, SrdItem, SrdFeat } from "./srd-loader";
import type { RulesetVersion } from "@/lib/types/database";
import { cacheSuffix } from "./srd-mode";

const DB_NAME = "srd-cache";
// Bumped to 7: added feats object store
const DB_VERSION = 7;

// Singleton promise — one IDBDatabase connection shared across all reads/writes
let _dbPromise: ReturnType<typeof openDB> | null = null;

export function getDb() {
  if (!_dbPromise) {
    _dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, _newVersion, tx) {
        if (!db.objectStoreNames.contains("monsters")) {
          db.createObjectStore("monsters");
        }
        if (!db.objectStoreNames.contains("spells")) {
          db.createObjectStore("spells");
        }
        if (!db.objectStoreNames.contains("conditions")) {
          db.createObjectStore("conditions");
        }
        if (!db.objectStoreNames.contains("items")) {
          db.createObjectStore("items");
        }
        if (!db.objectStoreNames.contains("imported-monsters")) {
          db.createObjectStore("imported-monsters");
        }
        if (!db.objectStoreNames.contains("imported-spells")) {
          db.createObjectStore("imported-spells");
        }
        if (!db.objectStoreNames.contains("feats")) {
          db.createObjectStore("feats");
        }
        // Clear stale data on version upgrade so fresh SRD bundles
        // (with token_url and latest fields) get fetched and cached.
        if (oldVersion < 5) {
          tx.objectStore("monsters").clear();
          tx.objectStore("spells").clear();
          tx.objectStore("conditions").clear();
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
    const result = await db.get("monsters", `${version}${cacheSuffix()}`);
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
    await db.put("monsters", data, `${version}${cacheSuffix()}`);
  } catch {
    // Private browsing or storage quota — degrade gracefully
  }
}

export async function getCachedSpells(
  version: RulesetVersion
): Promise<SrdSpell[] | null> {
  try {
    const db = await getDb();
    const result = await db.get("spells", `${version}${cacheSuffix()}`);
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
    await db.put("spells", data, `${version}${cacheSuffix()}`);
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

export async function getCachedItems(): Promise<SrdItem[] | null> {
  try {
    const db = await getDb();
    const result = await db.get("items", "all");
    return result ?? null;
  } catch {
    return null;
  }
}

export async function setCachedItems(
  data: SrdItem[]
): Promise<void> {
  try {
    const db = await getDb();
    await db.put("items", data, "all");
  } catch {
    // Private browsing or storage quota — degrade gracefully
  }
}

export async function getCachedFeats(): Promise<SrdFeat[] | null> {
  try {
    const db = await getDb();
    const result = await db.get("feats", "all");
    return result ?? null;
  } catch {
    return null;
  }
}

export async function setCachedFeats(
  data: SrdFeat[]
): Promise<void> {
  try {
    const db = await getDb();
    await db.put("feats", data, "all");
  } catch {
    // Private browsing or storage quota — degrade gracefully
  }
}
