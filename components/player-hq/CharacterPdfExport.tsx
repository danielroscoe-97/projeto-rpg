"use client";

import { useCallback } from "react";
import { useTranslations } from "next-intl";
import { FileDown } from "lucide-react";
import type { CharacterProficiencies } from "@/lib/types/database";
import {
  SKILLS,
  profBonusForLevel,
  getModifier,
  formatMod,
  skillLabel,
  escapeHtml,
} from "@/lib/constants/dnd-skills";

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

  const handleExport = useCallback(() => {
    const pb = profBonusForLevel(character.level);
    const saves = character.proficiencies.saving_throws ?? [];
    const skills = character.proficiencies.skills ?? {};
    const abilityScores: Record<string, number | null> = {
      STR: character.str, DEX: character.dex, CON: character.con,
      INT: character.int_score, WIS: character.wis, CHA: character.cha_score,
    };

    // All user-facing strings via i18n
    const L = {
      abilityScores: t("section_ability_scores"),
      combat: t("section_combat"),
      savingThrows: t("section_saving_throws"),
      skills: t("section_skills"),
      otherProf: t("section_other_proficiencies"),
      languages: t("label_languages"),
      tools: t("label_tools"),
      armor: t("label_armor"),
      weapons: t("label_weapons"),
      ac: t("label_ac"),
      hp: t("label_hp"),
      speed: t("label_speed"),
      initiative: t("label_initiative"),
      profBonus: t("label_prof_bonus"),
      level: t("label_level"),
      footer: t("footer_text"),
      title: t("title_sheet"),
    };

    // Escape all user-provided strings
    const eName = escapeHtml(character.name);
    const eRace = character.race ? escapeHtml(character.race) : null;
    const eClass = character.class ? escapeHtml(character.class) : null;
    const eSubclass = character.subclass ? escapeHtml(character.subclass) : null;
    const eBackground = character.background ? escapeHtml(character.background) : null;
    const eAlignment = character.alignment ? escapeHtml(character.alignment) : null;

    const html = `<!DOCTYPE html>
<html><head>
<meta charset="UTF-8">
<title>${eName} — ${escapeHtml(L.title)}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&family=Plus+Jakarta+Sans:wght@400;600&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Plus Jakarta Sans', sans-serif; color: #1a1a1a; padding: 24px; max-width: 800px; margin: 0 auto; }
  h1 { font-family: 'Cinzel', serif; font-size: 28px; color: #7a200d; border-bottom: 2px solid #922610; padding-bottom: 4px; }
  h2 { font-family: 'Cinzel', serif; font-size: 16px; color: #922610; border-bottom: 1px solid #c9a959; padding-bottom: 2px; margin: 16px 0 8px; }
  .header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 12px; flex-wrap: wrap; gap: 8px; }
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
  .footer { margin-top: 24px; text-align: center; font-size: 11px; color: #999; border-top: 1px solid #eee; padding-top: 8px; }
  @media print { body { padding: 12px; } }
</style>
</head><body>
<div class="header">
  <h1>${eName}</h1>
  <div class="subtitle">${[eRace, eClass, character.level ? `${escapeHtml(L.level)} ${character.level}` : null, eSubclass].filter(Boolean).join(" &middot; ")}</div>
</div>
${eBackground || eAlignment ? `<p class="subtitle" style="margin-bottom:8px">${[eBackground, eAlignment].filter(Boolean).join(" &middot; ")}</p>` : ""}

<h2>${escapeHtml(L.abilityScores)}</h2>
<div class="stats-grid">
${["STR", "DEX", "CON", "INT", "WIS", "CHA"].map(a => `
  <div class="stat-box">
    <div class="stat-label">${a}</div>
    <div class="stat-score">${abilityScores[a] ?? "&mdash;"}</div>
    <div class="stat-mod">${formatMod(getModifier(abilityScores[a]))}</div>
  </div>`).join("")}
</div>

<h2>${escapeHtml(L.combat)}</h2>
<div class="combat-grid">
  <div class="combat-box"><div class="combat-label">${escapeHtml(L.ac)}</div><div class="combat-value">${character.ac}</div></div>
  <div class="combat-box"><div class="combat-label">${escapeHtml(L.hp)}</div><div class="combat-value">${character.current_hp}/${character.max_hp}</div></div>
  <div class="combat-box"><div class="combat-label">${escapeHtml(L.speed)}</div><div class="combat-value">${character.speed ?? "&mdash;"}</div></div>
  <div class="combat-box"><div class="combat-label">${escapeHtml(L.initiative)}</div><div class="combat-value">${character.initiative_bonus != null ? formatMod(character.initiative_bonus) : formatMod(getModifier(character.dex))}</div></div>
  <div class="combat-box"><div class="combat-label">${escapeHtml(L.profBonus)}</div><div class="combat-value">+${pb}</div></div>
</div>

<div class="two-col">
<div>
<h2>${escapeHtml(L.savingThrows)}</h2>
${["STR", "DEX", "CON", "INT", "WIS", "CHA"].map(a => {
  const key = a.toLowerCase();
  const isProficient = saves.includes(key);
  const scoreMod = getModifier(abilityScores[a]);
  const total = scoreMod + (isProficient ? pb : 0);
  return `<div class="save-row"><span class="dot ${isProficient ? "filled" : ""}"></span>${a}<span class="mod-value">${formatMod(total)}</span></div>`;
}).join("")}
</div>

<div>
<h2>${escapeHtml(L.skills)}</h2>
${SKILLS.map(({ key, ability }) => {
  const prof = skills[key];
  const scoreMod = getModifier(abilityScores[ability.toUpperCase()]);
  const bonus = prof === "expertise" ? pb * 2 : prof === "proficient" ? pb : 0;
  const total = scoreMod + bonus;
  return `<div class="skill-row"><span class="dot ${prof === "expertise" ? "double" : prof ? "filled" : ""}"></span>${skillLabel(key)}<span class="ability-tag">${ability.toUpperCase()}</span><span class="mod-value">${formatMod(total)}</span></div>`;
}).join("")}
</div>
</div>

${(character.proficiencies.languages?.length || character.proficiencies.tools?.length || character.proficiencies.armor?.length || character.proficiencies.weapons?.length) ? `
<h2>${escapeHtml(L.otherProf)}</h2>
<div style="font-size:13px; line-height:1.6">
${character.proficiencies.languages?.length ? `<p><strong>${escapeHtml(L.languages)}:</strong> ${character.proficiencies.languages.map(escapeHtml).join(", ")}</p>` : ""}
${character.proficiencies.tools?.length ? `<p><strong>${escapeHtml(L.tools)}:</strong> ${character.proficiencies.tools.map(escapeHtml).join(", ")}</p>` : ""}
${character.proficiencies.armor?.length ? `<p><strong>${escapeHtml(L.armor)}:</strong> ${character.proficiencies.armor.map(escapeHtml).join(", ")}</p>` : ""}
${character.proficiencies.weapons?.length ? `<p><strong>${escapeHtml(L.weapons)}:</strong> ${character.proficiencies.weapons.map(escapeHtml).join(", ")}</p>` : ""}
</div>` : ""}

<div class="footer">
  ${eName} &mdash; ${escapeHtml(L.footer)}
</div>
</body></html>`;

    // Use hidden iframe instead of window.open to avoid popup blockers (especially iOS Safari)
    const iframe = document.createElement("iframe");
    iframe.style.cssText = "position:fixed;top:-9999px;left:-9999px;width:0;height:0;border:none";
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument ?? iframe.contentWindow?.document;
    if (!doc) { iframe.remove(); return; }
    doc.open();
    doc.write(html);
    doc.close();
    // Wait for fonts to load, then trigger print
    setTimeout(() => {
      iframe.contentWindow?.print();
      // Clean up after print dialog closes
      setTimeout(() => iframe.remove(), 2000);
    }, 600);
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
