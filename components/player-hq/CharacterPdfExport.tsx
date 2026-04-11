"use client";

import { useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import { FileDown } from "lucide-react";
import type { CharacterProficiencies } from "@/lib/types/database";

// ── D&D 5e Skill → Ability mapping ──────────────────────────────
const SKILLS: Array<{ key: string; ability: string }> = [
  { key: "acrobatics", ability: "DEX" },
  { key: "animal_handling", ability: "WIS" },
  { key: "arcana", ability: "INT" },
  { key: "athletics", ability: "STR" },
  { key: "deception", ability: "CHA" },
  { key: "history", ability: "INT" },
  { key: "insight", ability: "WIS" },
  { key: "intimidation", ability: "CHA" },
  { key: "investigation", ability: "INT" },
  { key: "medicine", ability: "WIS" },
  { key: "nature", ability: "INT" },
  { key: "perception", ability: "WIS" },
  { key: "performance", ability: "CHA" },
  { key: "persuasion", ability: "CHA" },
  { key: "religion", ability: "INT" },
  { key: "sleight_of_hand", ability: "DEX" },
  { key: "stealth", ability: "DEX" },
  { key: "survival", ability: "WIS" },
];

function mod(score: number | null): string {
  if (score == null) return "+0";
  const m = Math.floor((score - 10) / 2);
  return m >= 0 ? `+${m}` : `${m}`;
}

function profBonus(level: number | null): number {
  if (!level || level <= 4) return 2;
  if (level <= 8) return 3;
  if (level <= 12) return 4;
  if (level <= 16) return 5;
  return 6;
}

// Skill label mapping (simplified — just capitalize the key)
function skillLabel(key: string): string {
  return key
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

interface CharacterData {
  name: string;
  race: string | null;
  class: string | null;
  level: number | null;
  subclass: string | null;
  background: string | null;
  alignment: string | null;
  max_hp: number;
  current_hp: number;
  ac: number;
  speed: number | null;
  initiative_bonus: number | null;
  spell_save_dc: number | null;
  inspiration: boolean;
  str: number | null;
  dex: number | null;
  con: number | null;
  int_score: number | null;
  wis: number | null;
  cha_score: number | null;
  proficiencies: CharacterProficiencies;
}

interface CharacterPdfExportProps {
  character: CharacterData;
}

export function CharacterPdfExport({ character }: CharacterPdfExportProps) {
  const t = useTranslations("player_hq.pdf_export");
  const printRef = useRef<HTMLDivElement>(null);

  const handleExport = useCallback(() => {
    const el = printRef.current;
    if (!el) return;

    const win = window.open("", "_blank");
    if (!win) return;

    const pb = profBonus(character.level);
    const saves = character.proficiencies.saving_throws ?? [];
    const skills = character.proficiencies.skills ?? {};
    const abilityScores: Record<string, number | null> = {
      STR: character.str, DEX: character.dex, CON: character.con,
      INT: character.int_score, WIS: character.wis, CHA: character.cha_score,
    };

    const html = `<!DOCTYPE html>
<html><head>
<meta charset="UTF-8">
<title>${character.name} — Character Sheet</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&family=Plus+Jakarta+Sans:wght@400;600&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Plus Jakarta Sans', sans-serif; color: #1a1a1a; padding: 24px; max-width: 800px; margin: 0 auto; }
  h1 { font-family: 'Cinzel', serif; font-size: 28px; color: #7a200d; border-bottom: 2px solid #922610; padding-bottom: 4px; }
  h2 { font-family: 'Cinzel', serif; font-size: 16px; color: #922610; border-bottom: 1px solid #c9a959; padding-bottom: 2px; margin: 16px 0 8px; }
  .header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 12px; }
  .subtitle { font-size: 14px; color: #666; }
  .stats-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 8px; margin: 12px 0; text-align: center; }
  .stat-box { border: 1px solid #c9a959; border-radius: 6px; padding: 8px 4px; }
  .stat-label { font-size: 10px; text-transform: uppercase; color: #922610; letter-spacing: 0.1em; }
  .stat-score { font-size: 20px; font-weight: 700; }
  .stat-mod { font-size: 13px; color: #666; }
  .combat-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin: 12px 0; text-align: center; }
  .combat-box { border: 1px solid #ddd; border-radius: 6px; padding: 8px; }
  .combat-label { font-size: 10px; text-transform: uppercase; color: #666; }
  .combat-value { font-size: 18px; font-weight: 700; }
  .save-row, .skill-row { display: flex; align-items: center; gap: 6px; padding: 2px 0; font-size: 13px; }
  .dot { width: 10px; height: 10px; border-radius: 50%; border: 1.5px solid #666; display: inline-block; }
  .dot.filled { background: #922610; border-color: #922610; }
  .dot.double { background: #c9a959; border-color: #c9a959; }
  .mod-value { margin-left: auto; font-weight: 600; min-width: 28px; text-align: right; }
  .ability-tag { font-size: 10px; color: #999; text-transform: uppercase; }
  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .tags { display: flex; flex-wrap: wrap; gap: 4px; }
  .tag { font-size: 12px; padding: 2px 8px; border: 1px solid #ddd; border-radius: 4px; background: #f8f8f8; }
  .footer { margin-top: 24px; text-align: center; font-size: 11px; color: #999; border-top: 1px solid #eee; padding-top: 8px; }
  @media print { body { padding: 12px; } }
</style>
</head><body>
<div class="header">
  <h1>${character.name}</h1>
  <div class="subtitle">${[character.race, character.class, character.level ? `Level ${character.level}` : null, character.subclass].filter(Boolean).join(" · ")}</div>
</div>
${character.background || character.alignment ? `<p class="subtitle" style="margin-bottom:8px">${[character.background, character.alignment].filter(Boolean).join(" · ")}</p>` : ""}

<h2>Ability Scores</h2>
<div class="stats-grid">
${["STR", "DEX", "CON", "INT", "WIS", "CHA"].map(a => `
  <div class="stat-box">
    <div class="stat-label">${a}</div>
    <div class="stat-score">${abilityScores[a] ?? "—"}</div>
    <div class="stat-mod">${mod(abilityScores[a])}</div>
  </div>`).join("")}
</div>

<h2>Combat</h2>
<div class="combat-grid">
  <div class="combat-box"><div class="combat-label">AC</div><div class="combat-value">${character.ac}</div></div>
  <div class="combat-box"><div class="combat-label">HP</div><div class="combat-value">${character.current_hp}/${character.max_hp}</div></div>
  <div class="combat-box"><div class="combat-label">Speed</div><div class="combat-value">${character.speed ?? "—"}</div></div>
  <div class="combat-box"><div class="combat-label">Initiative</div><div class="combat-value">${character.initiative_bonus != null ? (character.initiative_bonus >= 0 ? `+${character.initiative_bonus}` : character.initiative_bonus) : mod(character.dex)}</div></div>
  <div class="combat-box"><div class="combat-label">Prof Bonus</div><div class="combat-value">+${pb}</div></div>
</div>

<div class="two-col">
<div>
<h2>Saving Throws</h2>
${["STR", "DEX", "CON", "INT", "WIS", "CHA"].map(a => {
  const key = a.toLowerCase();
  const isProficient = saves.includes(key);
  const scoreMod = Math.floor(((abilityScores[a] ?? 10) - 10) / 2);
  const total = scoreMod + (isProficient ? pb : 0);
  return `<div class="save-row"><span class="dot ${isProficient ? "filled" : ""}"></span>${a}<span class="mod-value">${total >= 0 ? `+${total}` : total}</span></div>`;
}).join("")}
</div>

<div>
<h2>Skills</h2>
${SKILLS.map(({ key, ability }) => {
  const prof = skills[key];
  const scoreMod = Math.floor(((abilityScores[ability] ?? 10) - 10) / 2);
  const bonus = prof === "expertise" ? pb * 2 : prof === "proficient" ? pb : 0;
  const total = scoreMod + bonus;
  return `<div class="skill-row"><span class="dot ${prof === "expertise" ? "double" : prof ? "filled" : ""}"></span>${skillLabel(key)}<span class="ability-tag">${ability}</span><span class="mod-value">${total >= 0 ? `+${total}` : total}</span></div>`;
}).join("")}
</div>
</div>

${(character.proficiencies.languages?.length || character.proficiencies.tools?.length || character.proficiencies.armor?.length || character.proficiencies.weapons?.length) ? `
<h2>Other Proficiencies</h2>
<div style="font-size:13px; line-height:1.6">
${character.proficiencies.languages?.length ? `<p><strong>Languages:</strong> ${character.proficiencies.languages.join(", ")}</p>` : ""}
${character.proficiencies.tools?.length ? `<p><strong>Tools:</strong> ${character.proficiencies.tools.join(", ")}</p>` : ""}
${character.proficiencies.armor?.length ? `<p><strong>Armor:</strong> ${character.proficiencies.armor.join(", ")}</p>` : ""}
${character.proficiencies.weapons?.length ? `<p><strong>Weapons:</strong> ${character.proficiencies.weapons.join(", ")}</p>` : ""}
</div>` : ""}

<div class="footer">
  ${character.name} — Generated by Pocket DM (pocketdm.app)
</div>
</body></html>`;

    win.document.write(html);
    win.document.close();
    // Wait for fonts to load, then trigger print dialog
    setTimeout(() => {
      win.print();
    }, 500);
  }, [character, t]);

  return (
    <button
      type="button"
      onClick={handleExport}
      className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-gold transition-colors px-2 py-1 rounded border border-white/[0.06] hover:border-gold/30"
      title={t("export_pdf")}
    >
      <FileDown className="w-3.5 h-3.5" />
      {t("export_pdf")}
    </button>
  );
}
