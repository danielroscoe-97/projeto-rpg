import { getDb } from "@/lib/srd/srd-cache";
import type { SrdMonster } from "@/lib/srd/srd-loader";

const STORE = "imported-monsters";

interface ImportedSource {
  monsters: SrdMonster[];
  importedAt: string;
  url?: string;
}

export async function saveImportedMonsters(
  sourceLabel: string,
  monsters: SrdMonster[],
  url?: string
): Promise<void> {
  try {
    const db = await getDb();
    const entry: ImportedSource = {
      monsters,
      importedAt: new Date().toISOString(),
      url,
    };
    await db.put(STORE, entry, sourceLabel);
  } catch {
    // Private browsing or quota — degrade gracefully
  }
}

export async function getImportedMonsters(): Promise<SrdMonster[]> {
  try {
    const db = await getDb();
    const keys = await db.getAllKeys(STORE);
    const all: SrdMonster[] = [];
    for (const key of keys) {
      const entry = (await db.get(STORE, key)) as ImportedSource | undefined;
      if (entry?.monsters) {
        all.push(...entry.monsters);
      }
    }
    return all;
  } catch {
    return [];
  }
}

export interface ImportedSourceInfo {
  label: string;
  count: number;
  date: string;
  url?: string;
}

export async function getImportedSources(): Promise<ImportedSourceInfo[]> {
  try {
    const db = await getDb();
    const keys = await db.getAllKeys(STORE);
    const sources: ImportedSourceInfo[] = [];
    for (const key of keys) {
      const entry = (await db.get(STORE, key)) as ImportedSource | undefined;
      if (entry) {
        sources.push({
          label: String(key),
          count: entry.monsters.length,
          date: entry.importedAt,
          url: entry.url,
        });
      }
    }
    return sources;
  } catch {
    return [];
  }
}

export async function clearImportedBySource(sourceLabel: string): Promise<void> {
  try {
    const db = await getDb();
    await db.delete(STORE, sourceLabel);
  } catch {
    // degrade gracefully
  }
}

export async function clearAllImported(): Promise<void> {
  try {
    const db = await getDb();
    await db.clear(STORE);
  } catch {
    // degrade gracefully
  }
}
