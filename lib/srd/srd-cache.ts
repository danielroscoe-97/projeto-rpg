import { openDB } from "idb";
import type { SrdMonster, SrdSpell, SrdCondition, SrdItem, SrdFeat, SrdBackground } from "./srd-loader";
import type { SrdClass } from "@/lib/types/srd-class";
import type { RulesetVersion } from "@/lib/types/database";
import { cacheSuffix } from "./srd-mode";

const DB_NAME = "srd-cache";
// Bumped to 9: added backgrounds object store
const DB_VERSION = 9;

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
        if (!db.objectStoreNames.contains("classes")) {
          db.createObjectStore("classes");
        }
        if (!db.objectStoreNames.contains("backgrounds")) {
          db.createObjectStore("backgrounds");
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
    const result = await db.get("conditions", `all${cacheSuffix()}`);
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
    await db.put("conditions", data, `all${cacheSuffix()}`);
  } catch {
    // Private browsing or storage quota — degrade gracefully
  }
}

export async function getCachedItems(): Promise<SrdItem[] | null> {
  try {
    const db = await getDb();
    const result = await db.get("items", `all${cacheSuffix()}`);
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
    await db.put("items", data, `all${cacheSuffix()}`);
  } catch {
    // Private browsing or storage quota — degrade gracefully
  }
}

export async function getCachedFeats(): Promise<SrdFeat[] | null> {
  try {
    const db = await getDb();
    const result = await db.get("feats", `all${cacheSuffix()}`);
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
    await db.put("feats", data, `all${cacheSuffix()}`);
  } catch {
    // Private browsing or storage quota — degrade gracefully
  }
}

export async function getCachedBackgrounds(): Promise<SrdBackground[] | null> {
  try {
    const db = await getDb();
    const result = await db.get("backgrounds", `all${cacheSuffix()}`);
    return result ?? null;
  } catch {
    return null;
  }
}

export async function setCachedBackgrounds(
  data: SrdBackground[]
): Promise<void> {
  try {
    const db = await getDb();
    await db.put("backgrounds", data, `all${cacheSuffix()}`);
  } catch {
    // Private browsing or storage quota — degrade gracefully
  }
}

export async function getCachedClasses(): Promise<SrdClass[] | null> {
  try {
    const db = await getDb();
    const result = await db.get("classes", `all${cacheSuffix()}`);
    return result ?? null;
  } catch {
    return null;
  }
}

export async function setCachedClasses(
  data: SrdClass[]
): Promise<void> {
  try {
    const db = await getDb();
    await db.put("classes", data, `all${cacheSuffix()}`);
  } catch {
    // Private browsing or storage quota — degrade gracefully
  }
}
