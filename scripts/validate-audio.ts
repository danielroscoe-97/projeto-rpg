/**
 * Audio Validation Script — Stories 1 & 2
 *
 * 1. Scans all files in public/sounds/, hashes them (MD5),
 *    detects duplicates and placeholder files (<10KB).
 * 2. Cross-references audio-presets.ts against the file system:
 *    - Missing files (referenced in presets but not on disk)
 *    - Orphan files (on disk but not referenced in any preset)
 *    - Category / directory mismatch
 *
 * Usage: npx tsx scripts/validate-audio.ts
 */

import { createHash } from "crypto";
import { readFileSync, readdirSync, statSync, existsSync } from "fs";
import { join, relative, posix } from "path";

// ── Helpers ──────────────────────────────────────────────────

const ROOT = join(__dirname, "..");
const SOUNDS_DIR = join(ROOT, "public", "sounds");
const PRESETS_FILE = join(ROOT, "lib", "utils", "audio-presets.ts");

function md5(filePath: string): string {
  const buf = readFileSync(filePath);
  return createHash("md5").update(buf).digest("hex");
}

/** Recursively collect all files under a directory. */
function walkDir(dir: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkDir(full));
    } else {
      results.push(full);
    }
  }
  return results;
}

/** Convert an absolute path to the public URL path (e.g. /sounds/sfx/arrow.mp3). */
function toPublicPath(absPath: string): string {
  const rel = relative(join(ROOT, "public"), absPath);
  return "/" + rel.split("\\").join("/");
}

// ── Story 1: File Validation ─────────────────────────────────

function validateFiles() {
  console.log("\n=== Story 1: Audio File Validation ===\n");

  if (!existsSync(SOUNDS_DIR)) {
    console.error("❌ public/sounds/ directory not found");
    process.exit(1);
  }

  const allFiles = walkDir(SOUNDS_DIR).filter((f) =>
    /\.(mp3|ogg|wav|m4a|webm|flac)$/i.test(f)
  );

  console.log(`✅ ${allFiles.length} audio files scanned`);

  // Hash grouping
  const hashMap = new Map<string, string[]>();
  for (const file of allFiles) {
    const hash = md5(file);
    const existing = hashMap.get(hash) ?? [];
    existing.push(toPublicPath(file));
    hashMap.set(hash, existing);
  }

  const duplicates = [...hashMap.entries()].filter(([, files]) => files.length > 1);
  if (duplicates.length === 0) {
    console.log(`✅ ${hashMap.size} unique hashes (no duplicates)`);
  } else {
    console.log(`❌ ${duplicates.length} duplicates found:`);
    for (const [hash, files] of duplicates) {
      console.log(`   [${hash.slice(0, 8)}] ${files.join(", ")}`);
    }
  }

  // Size check
  const smallFiles: { path: string; size: number }[] = [];
  for (const file of allFiles) {
    const size = statSync(file).size;
    if (size < 10 * 1024) {
      smallFiles.push({ path: toPublicPath(file), size });
    }
  }

  if (smallFiles.length === 0) {
    console.log(`✅ All files are ≥10KB (no probable placeholders)`);
  } else {
    console.log(`⚠️ ${smallFiles.length} files under 10KB:`);
    for (const { path, size } of smallFiles) {
      console.log(`   ${path} (${(size / 1024).toFixed(1)}KB)`);
    }
  }

  return { allFiles, duplicates, smallFiles };
}

// ── Story 2: Preset Config Validation ────────────────────────

function validatePresets(allFiles: string[]) {
  console.log("\n=== Story 2: Audio Presets Config Validation ===\n");

  if (!existsSync(PRESETS_FILE)) {
    console.error("❌ lib/utils/audio-presets.ts not found");
    process.exit(1);
  }

  const presetsSource = readFileSync(PRESETS_FILE, "utf-8");

  // Extract all file paths from preset definitions
  // Matches: file: "/sounds/..." patterns
  const fileRegex = /file:\s*"([^"]+)"/g;
  const presetPaths: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = fileRegex.exec(presetsSource)) !== null) {
    presetPaths.push(match[1]);
  }

  console.log(`📋 ${presetPaths.length} file references found in audio-presets.ts`);

  // Extract categories from preset definitions
  // Matches: category: "ambient" etc.
  const categoryRegex = /\{\s*id:\s*"([^"]+)"[^}]*file:\s*"([^"]+)"[^}]*category:\s*"([^"]+)"/g;
  const presetEntries: { id: string; file: string; category: string }[] = [];
  while ((match = categoryRegex.exec(presetsSource)) !== null) {
    presetEntries.push({ id: match[1], file: match[2], category: match[3] });
  }

  // Check 1: Missing files (referenced but not on disk)
  const diskPaths = new Set(allFiles.map(toPublicPath));
  const missingFiles = presetPaths.filter((p) => !diskPaths.has(p));

  if (missingFiles.length === 0) {
    console.log(`✅ All ${presetPaths.length} preset paths exist on disk`);
  } else {
    console.log(`❌ ${missingFiles.length} missing files (referenced but not on disk):`);
    for (const f of missingFiles) {
      console.log(`   ${f}`);
    }
  }

  // Check 2: Orphan files (on disk but not in any preset)
  const referencedSet = new Set(presetPaths);
  const orphanFiles = [...diskPaths].filter((p) => !referencedSet.has(p));

  if (orphanFiles.length === 0) {
    console.log(`✅ No orphan files (all files are referenced)`);
  } else {
    console.log(`⚠️ ${orphanFiles.length} orphan files (not referenced in presets):`);
    for (const f of orphanFiles.sort()) {
      console.log(`   ${f}`);
    }
  }

  // Check 3: Category / directory mismatch
  const categoryDirMap: Record<string, string[]> = {
    ambient: ["ambient"],
    music: ["music"],
  };
  // SFX categories map to sfx/ directory
  const sfxCategories = new Set([
    "attack", "magic", "defense", "dramatic", "monster", "interaction", "ui",
  ]);

  const mismatches: string[] = [];
  for (const entry of presetEntries) {
    const fileDir = entry.file.split("/")[2]; // /sounds/<dir>/filename.mp3
    if (entry.category === "ambient" && fileDir !== "ambient") {
      mismatches.push(`${entry.id}: category=ambient but dir=${fileDir}`);
    } else if (entry.category === "music" && fileDir !== "music") {
      mismatches.push(`${entry.id}: category=music but dir=${fileDir}`);
    } else if (sfxCategories.has(entry.category) && fileDir !== "sfx") {
      mismatches.push(`${entry.id}: category=${entry.category} but dir=${fileDir}`);
    }
  }

  if (mismatches.length === 0) {
    console.log(`✅ All preset categories match their directory structure`);
  } else {
    console.log(`❌ ${mismatches.length} category/directory mismatches:`);
    for (const m of mismatches) {
      console.log(`   ${m}`);
    }
  }

  return { missingFiles, orphanFiles, mismatches };
}

// ── Main ─────────────────────────────────────────────────────

function main() {
  console.log("🔊 Audio Validation Report");
  console.log("=".repeat(50));

  const { allFiles, duplicates, smallFiles } = validateFiles();
  const { missingFiles, orphanFiles, mismatches } = validatePresets(allFiles);

  // Summary
  console.log("\n" + "=".repeat(50));
  console.log("📊 Summary:");

  const errors: string[] = [];
  if (duplicates.length > 0) errors.push(`${duplicates.length} duplicate hash groups`);
  if (missingFiles.length > 0) errors.push(`${missingFiles.length} missing preset files`);
  if (mismatches.length > 0) errors.push(`${mismatches.length} category mismatches`);

  const warnings: string[] = [];
  if (smallFiles.length > 0) warnings.push(`${smallFiles.length} files under 10KB`);
  if (orphanFiles.length > 0) warnings.push(`${orphanFiles.length} orphan files`);

  if (errors.length === 0 && warnings.length === 0) {
    console.log("✅ All checks passed!");
  } else {
    if (errors.length > 0) {
      console.log(`❌ Errors: ${errors.join(", ")}`);
    }
    if (warnings.length > 0) {
      console.log(`⚠️ Warnings: ${warnings.join(", ")}`);
    }
  }

  // Exit with error code if there are actual errors
  if (errors.length > 0) {
    process.exit(1);
  }
}

main();
