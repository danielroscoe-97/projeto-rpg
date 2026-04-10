import { readFileSync } from "fs";
import { join } from "path";
import type { SrdClassFull, SubclassEntry } from "@/lib/types/srd-class";

const SRD_DIR = join(process.cwd(), "data", "srd");

// ── Caches ─────────────────────────────────────────────────────────
let classFullCache: SrdClassFull[] | null = null;
let subclassCache: SubclassEntry[] | null = null;

// ── Full class data ────────────────────────────────────────────────

/** Load all full class entries from classes-full.json */
export function getAllClassesFull(): SrdClassFull[] {
  if (classFullCache) return classFullCache;
  try {
    classFullCache = JSON.parse(
      readFileSync(join(SRD_DIR, "classes-full.json"), "utf-8")
    );
  } catch {
    classFullCache = [];
  }
  return classFullCache!;
}

/** Find a full class by its slug (id) */
export function getClassFull(slug: string): SrdClassFull | undefined {
  return getAllClassesFull().find((c) => c.id === slug);
}

// ── Subclass data ──────────────────────────────────────────────────

/** Load all subclass entries from subclasses-srd.json */
export function getAllSubclasses(): SubclassEntry[] {
  if (subclassCache) return subclassCache;
  try {
    subclassCache = JSON.parse(
      readFileSync(join(SRD_DIR, "subclasses-srd.json"), "utf-8")
    );
  } catch {
    subclassCache = [];
  }
  return subclassCache!;
}

/** Find a subclass by its slug (id) */
export function getSubclass(slug: string): SubclassEntry | undefined {
  return getAllSubclasses().find((s) => s.id === slug);
}

/** Get all subclasses for a given class id */
export function getSubclassesForClass(classId: string): SubclassEntry[] {
  return getAllSubclasses().filter((s) => s.class_id === classId);
}
