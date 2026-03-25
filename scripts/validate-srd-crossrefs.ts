// scripts/validate-srd-crossrefs.ts
// Run with: npx tsx scripts/validate-srd-crossrefs.ts

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

// ── Interfaces (mirroring srd-loader.ts shapes) ──────────────────────────────

interface MonsterAction {
  name: string;
  desc: string;
  attack_bonus?: number;
}

interface Monster {
  id: string;
  name: string;
  cr: string;
  type: string;
  hit_points: number | null | undefined;
  armor_class: number | null | undefined;
  ruleset_version: string;
  size?: string;
  str?: number | null;
  dex?: number | null;
  con?: number | null;
  int?: number | null;
  wis?: number | null;
  cha?: number | null;
  special_abilities?: MonsterAction[] | null;
  actions?: MonsterAction[] | null;
  legendary_actions?: MonsterAction[] | null;
  reactions?: MonsterAction[] | null;
}

interface Spell {
  id: string;
  name: string;
  ruleset_version: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function loadJson<T>(filePath: string): T {
  const raw = readFileSync(filePath, 'utf-8');
  return JSON.parse(raw) as T;
}

/**
 * Strip trailing parenthetical qualifier and concentration asterisk from a spell name.
 * "invisibility (self only)" → "invisibility"
 * "conjure elemental (air elemental only)" → "conjure elemental"
 * "stoneskin*" → "stoneskin"
 */
function cleanSpellName(raw: string): string {
  let name = raw.trim();
  // Strip asterisks (concentration markers)
  name = name.replace(/\*/g, '').trim();
  // Strip trailing parenthetical qualifier
  name = name.replace(/\s*\([^)]*\)\s*$/, '').trim();
  // Skip tokens that look like frequency markers (artifact from Lamia's one-line format)
  if (/^\d+\/day|^at\s+will/i.test(name)) return '';
  return name.toLowerCase();
}

/**
 * Extract spell names from a spellcasting description text.
 *
 * Handles:
 *   - Multi-line bullet format: "- Cantrips (at will): fire bolt, light"
 *   - Inline one-line format (Lamia): "At will: disguise self, major image 3/day each: charm person"
 *   - Prose: "can cast disguise self and invisibility at will"
 *   - Qualifiers stripped: "invisibility (self only)" → "invisibility"
 */
function extractSpellNames(text: string): string[] {
  const spells = new Set<string>();

  // Normalise smart punctuation and concentration markers
  const normalized = text.replace(/[–—]/g, '-').replace(/['']/g, "'");

  // ── Strategy: find every frequency-marker position, then extract the spell
  // list from that marker up to the next marker (handles inline one-line format).
  //
  // Frequency markers: "Cantrips (at will)", "1st level (4 slots)",
  //                    "3/day each", "2/day", "At will"
  const freqMarkerRe =
    /(?:cantrips?\s*\([^)]*\)|[\dA-Za-z]+(?:st|nd|rd|th)?\s+level\s*\([^)]*\)|\d+\/day(?:\s+each)?|at\s+will)\s*:/gi;

  const markerStarts: number[] = [];
  const markerEnds: number[] = [];
  let m: RegExpExecArray | null;
  while ((m = freqMarkerRe.exec(normalized)) !== null) {
    markerStarts.push(m.index);
    markerEnds.push(m.index + m[0].length);
  }

  for (let i = 0; i < markerEnds.length; i++) {
    const listStart = markerEnds[i];
    // Slice ends at the start of the NEXT marker or the next newline, whichever is earlier
    const nextMarker = markerStarts[i + 1] ?? normalized.length;
    const nextNewline = normalized.indexOf('\n', listStart);
    const listEnd =
      nextNewline === -1 ? nextMarker : Math.min(nextMarker, nextNewline);

    const listText = normalized.slice(listStart, listEnd).trim();
    if (!listText) continue;

    listText.split(',').forEach((raw) => {
      const name = cleanSpellName(raw);
      if (name && name.length > 1) spells.add(name);
    });
  }

  // ── Prose pattern: "can cast X [and Y] at will" ──────────────────────────
  // Handles "can cast disguise self and invisibility at will"
  const canCastRe = /can cast\s+([\w\s',\-]+?)\s+at\s+will/gi;
  while ((m = canCastRe.exec(normalized)) !== null) {
    m[1].split(/\s+and\s+|,/).forEach((raw) => {
      const name = cleanSpellName(raw);
      if (name && name.length > 1) spells.add(name);
    });
  }

  return Array.from(spells);
}

/** Collect all text from every section of a monster. */
function allMonsterText(monster: Monster): string {
  const sections = [
    ...(monster.special_abilities ?? []),
    ...(monster.actions ?? []),
    ...(monster.legendary_actions ?? []),
    ...(monster.reactions ?? []),
  ];
  return sections.map((a) => `${a.name}\n${a.desc}`).join('\n\n');
}

/** Whether any ability looks like a spellcasting trait. */
function hasSpellcastingAbility(monster: Monster): boolean {
  const all = [
    ...(monster.special_abilities ?? []),
    ...(monster.actions ?? []),
  ];
  return all.some((a) => /spellcasting|innate spellcasting/i.test(a.name));
}

/** Parse CR to a number for PB calculation. */
function parseCR(cr: string): number {
  if (cr === '0') return 0;
  if (cr === '1/8') return 0.125;
  if (cr === '1/4') return 0.25;
  if (cr === '1/2') return 0.5;
  return parseFloat(cr) || 0;
}

// ── Main logic ─────────────────────────────────────────────────────────────────

interface VersionReport {
  version: string;
  totalMonsters: number;
  spellcastingMonsters: number;
  uniqueSpellsReferenced: Set<string>;
  missingSpells: Map<string, string[]>; // spellName → [monsterName, ...]
  monstersWithMissingSpells: Map<string, string[]>; // monsterName → [missingSpell, ...]
}

interface CompletenessIssue {
  id: string;
  name: string;
  version: string;
  issues: string[];
}

function validateCrossRefs(
  monsters: Monster[],
  spells: Spell[],
  version: string
): VersionReport {
  // Build a lowercase name set for fast lookup
  const spellNameSet = new Set(spells.map((s) => s.name.toLowerCase()));

  const report: VersionReport = {
    version,
    totalMonsters: monsters.length,
    spellcastingMonsters: 0,
    uniqueSpellsReferenced: new Set(),
    missingSpells: new Map(),
    monstersWithMissingSpells: new Map(),
  };

  for (const monster of monsters) {
    if (!hasSpellcastingAbility(monster)) continue;
    report.spellcastingMonsters++;

    const text = allMonsterText(monster);
    const extracted = extractSpellNames(text);

    for (const spellName of extracted) {
      report.uniqueSpellsReferenced.add(spellName);

      if (!spellNameSet.has(spellName)) {
        // Missing spell
        if (!report.missingSpells.has(spellName)) {
          report.missingSpells.set(spellName, []);
        }
        report.missingSpells.get(spellName)!.push(monster.name);

        if (!report.monstersWithMissingSpells.has(monster.name)) {
          report.monstersWithMissingSpells.set(monster.name, []);
        }
        report.monstersWithMissingSpells.get(monster.name)!.push(spellName);
      }
    }
  }

  return report;
}

function validateDataCompleteness(monsters: Monster[]): CompletenessIssue[] {
  const issues: CompletenessIssue[] = [];

  for (const m of monsters) {
    const mIssues: string[] = [];

    // Ability scores
    for (const stat of ['str', 'dex', 'con', 'int', 'wis', 'cha'] as const) {
      if (m[stat] == null) mIssues.push(`Missing ability score: ${stat}`);
    }

    // CR
    if (!m.cr) {
      mIssues.push('Missing CR');
    } else {
      const crNum = parseCR(m.cr);
      if (isNaN(crNum) && !['0', '1/8', '1/4', '1/2'].includes(m.cr)) {
        mIssues.push(`Unparseable CR: "${m.cr}"`);
      }
    }

    // HP & AC
    if (m.hit_points == null || isNaN(m.hit_points)) {
      mIssues.push(`Missing/invalid hit_points: ${m.hit_points}`);
    }
    if (m.armor_class == null || isNaN(m.armor_class)) {
      mIssues.push(`Missing/invalid armor_class: ${m.armor_class}`);
    }

    if (mIssues.length > 0) {
      issues.push({
        id: m.id,
        name: m.name,
        version: m.ruleset_version,
        issues: mIssues,
      });
    }
  }

  return issues;
}

function printReport(r: VersionReport): void {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  Version: ${r.version.toUpperCase()}`);
  console.log(`${'='.repeat(60)}`);
  console.log(`  Total monsters       : ${r.totalMonsters}`);
  console.log(`  Spellcasting monsters: ${r.spellcastingMonsters}`);
  console.log(`  Unique spells cited  : ${r.uniqueSpellsReferenced.size}`);
  console.log(`  Missing spells       : ${r.missingSpells.size}`);

  if (r.missingSpells.size > 0) {
    console.log(`\n  MISSING SPELLS (name → monsters that reference it):`);
    const sorted = [...r.missingSpells.entries()].sort((a, b) =>
      a[0].localeCompare(b[0])
    );
    for (const [spell, monsters] of sorted) {
      console.log(`    • "${spell}"  ← ${monsters.join(', ')}`);
    }
  } else {
    console.log(`\n  ✓ All referenced spells exist in the spell bundle.`);
  }
}

function buildMarkdownReport(
  reports: VersionReport[],
  completeness: { version: string; issues: CompletenessIssue[] }[]
): string {
  const lines: string[] = [];
  const now = new Date().toISOString().split('T')[0];

  lines.push(`# MISSING_SRD_DATA`);
  lines.push(`\n> Generated: ${now} by \`scripts/validate-srd-crossrefs.ts\``);
  lines.push(
    `> This report documents SRD data gaps found during cross-reference validation.`
  );

  // ── Cross-reference section ──
  lines.push(`\n## 1. Spell Cross-Reference Validation`);
  lines.push(
    `Checks that every spell name found in a monster's spellcasting ability exists in the spell bundle for that ruleset version.`
  );

  for (const r of reports) {
    lines.push(`\n### ${r.version.toUpperCase()} Edition`);
    lines.push(`| Metric | Value |`);
    lines.push(`|--------|-------|`);
    lines.push(`| Total monsters | ${r.totalMonsters} |`);
    lines.push(`| Spellcasting monsters | ${r.spellcastingMonsters} |`);
    lines.push(`| Unique spells referenced | ${r.uniqueSpellsReferenced.size} |`);
    lines.push(`| **Missing spells** | **${r.missingSpells.size}** |`);

    if (r.missingSpells.size === 0) {
      lines.push(`\n✅ All referenced spells are present in the \`${r.version}\` spell bundle.`);
    } else {
      lines.push(`\n#### Missing Spells`);
      lines.push(`| Spell Name | Referenced By |`);
      lines.push(`|------------|--------------|`);
      const sorted = [...r.missingSpells.entries()].sort((a, b) =>
        a[0].localeCompare(b[0])
      );
      for (const [spell, monsters] of sorted) {
        lines.push(`| \`${spell}\` | ${monsters.join(', ')} |`);
      }

      lines.push(`\n#### Monsters With Missing Spell References`);
      for (const [monster, missing] of r.monstersWithMissingSpells.entries()) {
        lines.push(`- **${monster}**: ${missing.map((s) => `\`${s}\``).join(', ')}`);
      }
    }
  }

  // ── Completeness section ──
  lines.push(`\n## 2. Monster Data Completeness`);
  lines.push(
    `Checks that each monster has all 6 ability scores, a valid CR, hit_points, and armor_class.`
  );

  for (const { version, issues } of completeness) {
    lines.push(`\n### ${version.toUpperCase()} Edition`);
    if (issues.length === 0) {
      lines.push(`✅ All monsters have complete data.`);
    } else {
      lines.push(`| Monster | Issues |`);
      lines.push(`|---------|--------|`);
      for (const issue of issues) {
        lines.push(
          `| ${issue.name} (\`${issue.id}\`) | ${issue.issues.join('; ')} |`
        );
      }
    }
  }

  lines.push(`\n---`);
  lines.push(
    `_Non-SRD spells (e.g. from adventure supplements or homebrew) are expected to be missing and are flagged for manual review._`
  );

  return lines.join('\n');
}

function main(): void {
  const root = join(__dirname, '..');
  const publicSrd = join(root, 'public', 'srd');

  console.log('Loading SRD data...');
  const monsters2014 = loadJson<Monster[]>(join(publicSrd, 'monsters-2014.json'));
  const monsters2024 = loadJson<Monster[]>(join(publicSrd, 'monsters-2024.json'));
  const spells2014 = loadJson<Spell[]>(join(publicSrd, 'spells-2014.json'));
  const spells2024 = loadJson<Spell[]>(join(publicSrd, 'spells-2024.json'));
  console.log(
    `Loaded: ${monsters2014.length} monsters (2014), ${monsters2024.length} monsters (2024), ` +
      `${spells2014.length} spells (2014), ${spells2024.length} spells (2024)`
  );

  // ── Cross-reference validation ──
  console.log('\n--- Cross-Reference Validation ---');
  const report2014 = validateCrossRefs(monsters2014, spells2014, '2014');
  const report2024 = validateCrossRefs(monsters2024, spells2024, '2024');

  printReport(report2014);
  printReport(report2024);

  // ── Data completeness ──
  console.log(`\n\n${'='.repeat(60)}`);
  console.log('  Data Completeness Check');
  console.log(`${'='.repeat(60)}`);

  const issues2014 = validateDataCompleteness(monsters2014);
  const issues2024 = validateDataCompleteness(monsters2024);

  console.log(`\n2014: ${issues2014.length} monsters with issues`);
  if (issues2014.length > 0) {
    for (const i of issues2014) {
      console.log(`  • ${i.name} (${i.id}): ${i.issues.join('; ')}`);
    }
  }

  console.log(`\n2024: ${issues2024.length} monsters with issues`);
  if (issues2024.length > 0) {
    for (const i of issues2024) {
      console.log(`  • ${i.name} (${i.id}): ${i.issues.join('; ')}`);
    }
  }

  // ── Write markdown report ──
  const mdReport = buildMarkdownReport(
    [report2014, report2024],
    [
      { version: '2014', issues: issues2014 },
      { version: '2024', issues: issues2024 },
    ]
  );

  const outPath = join(root, 'MISSING_SRD_DATA.md');
  writeFileSync(outPath, mdReport, 'utf-8');
  console.log(`\n✓ Report written to MISSING_SRD_DATA.md`);
}

main();
