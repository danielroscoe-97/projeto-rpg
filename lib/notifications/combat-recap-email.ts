import type { CombatReport } from "@/lib/types/combat-report";
import { sendEmail, escapeHtml, buildEmailShell, buildCtaButton, formatDuration, BRAND } from "./email-core";

interface CombatRecapEmailPayload {
  email: string;
  displayName: string;
  report: CombatReport;
  encounterUrl?: string;
}

/** Returns true if the combat meets minimum thresholds for a recap email. */
export function shouldSendRecap(report: CombatReport): boolean {
  const { summary } = report;
  const hasMinDuration = summary.totalDuration >= 120_000; // 2 minutes
  const hasMinRounds = summary.totalRounds >= 2;

  // matchup is "4 vs 3" format
  const parts = summary.matchup.split(" vs ");
  const hasPlayerAndMonster =
    parts.length === 2 &&
    parseInt(parts[0], 10) >= 1 &&
    parseInt(parts[1], 10) >= 1;

  return hasMinDuration && hasMinRounds && hasPlayerAndMonster;
}

export async function sendCombatRecapEmail(payload: CombatRecapEmailPayload): Promise<boolean> {
  const encounterName = payload.report.encounterName || "Encounter";
  return sendEmail({
    to: payload.email,
    subject: `Relat\u00f3rio de Combate: ${encounterName}`,
    html: buildRecapHtml(payload),
  });
}

// ─── Award labels (PT-BR) ──────────────────────────────────────────
const AWARD_LABELS: Record<string, { icon: string; label: string }> = {
  mvp: { icon: "\u{1F3C6}", label: "MVP" },
  assassin: { icon: "\u{1F5E1}\uFE0F", label: "Assassino" },
  tank: { icon: "\u{1F6E1}\uFE0F", label: "Tanque" },
  healer: { icon: "\u2764\uFE0F", label: "Curandeiro" },
  crit_king: { icon: "\u{1F3AF}", label: "Rei dos Cr\u00edticos" },
  unlucky: { icon: "\u{1F340}", label: "Azarado" },
  speedster: { icon: "\u26A1", label: "Velocista" },
  slowpoke: { icon: "\u{1F422}", label: "Lento" },
};

function buildRecapHtml(p: CombatRecapEmailPayload): string {
  const { report, encounterUrl } = p;
  const { summary, awards, narratives } = report;
  const encounterName = escapeHtml(report.encounterName || "Encounter");
  const dmName = escapeHtml(p.displayName);

  // Stats grid
  const duration = formatDuration(summary.totalDuration);
  const statsHtml = `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px">
      <tr>
        <td width="33%" style="text-align:center;padding:12px 4px;background:#1a1a2e;border-radius:8px 0 0 8px;border:1px solid ${BRAND.goldBorderSubtle};border-right:none">
          <div style="font-size:20px;font-weight:700;color:${BRAND.gold};font-family:Georgia,'Times New Roman',serif">${duration}</div>
          <div style="font-size:11px;color:${BRAND.textMuted};margin-top:2px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">Dura\u00e7\u00e3o</div>
        </td>
        <td width="33%" style="text-align:center;padding:12px 4px;background:#1a1a2e;border:1px solid ${BRAND.goldBorderSubtle};border-right:none">
          <div style="font-size:20px;font-weight:700;color:${BRAND.gold};font-family:Georgia,'Times New Roman',serif">${summary.totalRounds}</div>
          <div style="font-size:11px;color:${BRAND.textMuted};margin-top:2px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">Rounds</div>
        </td>
        <td width="33%" style="text-align:center;padding:12px 4px;background:#1a1a2e;border-radius:0 8px 8px 0;border:1px solid ${BRAND.goldBorderSubtle}">
          <div style="font-size:20px;font-weight:700;color:${BRAND.gold};font-family:Georgia,'Times New Roman',serif">${summary.totalDamage}</div>
          <div style="font-size:11px;color:${BRAND.textMuted};margin-top:2px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">Dano Total</div>
        </td>
      </tr>
    </table>`;

  // Extra stats row
  const extraStatsHtml = `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px">
      <tr>
        <td width="33%" style="text-align:center;padding:8px 4px">
          <div style="font-size:14px;color:${BRAND.textLight};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">${summary.monstersDefeated} derrotado${summary.monstersDefeated !== 1 ? "s" : ""}</div>
        </td>
        <td width="33%" style="text-align:center;padding:8px 4px">
          <div style="font-size:14px;color:${BRAND.textLight};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">${summary.totalCrits} cr\u00edtico${summary.totalCrits !== 1 ? "s" : ""}</div>
        </td>
        <td width="33%" style="text-align:center;padding:8px 4px">
          <div style="font-size:14px;color:${BRAND.textLight};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">${summary.pcsDown} PC${summary.pcsDown !== 1 ? "s" : ""} ca\u00eddo${summary.pcsDown !== 1 ? "s" : ""}</div>
        </td>
      </tr>
    </table>`;

  // Awards (top 3)
  const topAwards = awards.slice(0, 3);
  let awardsHtml = "";
  if (topAwards.length > 0) {
    const awardRows = topAwards
      .map((a) => {
        const meta = AWARD_LABELS[a.type] ?? { icon: "\u2B50", label: a.type };
        return `
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid rgba(255,255,255,0.04)">
            <span style="font-size:16px">${meta.icon}</span>
            <strong style="color:${BRAND.gold};font-size:13px;margin-left:6px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">${meta.label}</strong>
          </td>
          <td style="padding:8px 12px;text-align:right;border-bottom:1px solid rgba(255,255,255,0.04)">
            <span style="color:${BRAND.textLight};font-size:13px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">${escapeHtml(a.combatantName)}</span>
            <span style="color:${BRAND.textMuted};font-size:12px;margin-left:4px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">(${escapeHtml(a.displayValue)})</span>
          </td>
        </tr>`;
      })
      .join("");

    awardsHtml = `
    <div style="margin:0 0 20px">
      <div style="font-size:14px;font-weight:600;color:${BRAND.textLight};margin-bottom:8px;font-family:Georgia,'Times New Roman',serif">Destaques</div>
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#1a1a2e;border:1px solid ${BRAND.goldBorderSubtle};border-radius:8px;overflow:hidden">
        ${awardRows}
      </table>
    </div>`;
  }

  // Narratives (top 2)
  const topNarratives = narratives.slice(0, 2);
  let narrativesHtml = "";
  if (topNarratives.length > 0) {
    const narBlocks = topNarratives
      .map(
        (n) => `
      <div style="background:rgba(212,175,55,0.06);border-left:3px solid ${BRAND.gold};border-radius:0 8px 8px 0;padding:10px 14px;margin-bottom:8px">
        <span style="font-size:13px;color:${BRAND.textBody};line-height:1.5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">${escapeHtml(n.text)}</span>
        <span style="font-size:11px;color:${BRAND.textMuted};margin-left:6px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">Round ${n.round}</span>
      </div>`
      )
      .join("");

    narrativesHtml = `
    <div style="margin:0 0 8px">
      <div style="font-size:14px;font-weight:600;color:${BRAND.textLight};margin-bottom:8px;font-family:Georgia,'Times New Roman',serif">Momentos \u00c9picos</div>
      ${narBlocks}
    </div>`;
  }

  // CTA
  const ctaHtml = encounterUrl
    ? buildCtaButton("Ver Relat\u00f3rio Completo", encounterUrl)
    : "";

  return buildEmailShell(`
    <h1 style="color:${BRAND.textLight};font-size:22px;margin:0 0 4px;font-family:Georgia,'Times New Roman',serif">
      Relat\u00f3rio de Combate
    </h1>
    <p style="color:${BRAND.textMuted};font-size:13px;margin:0 0 20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
      ${dmName} \u2022 ${encounterName} \u2022 ${escapeHtml(summary.matchup)}
    </p>

    ${statsHtml}
    ${extraStatsHtml}
    ${awardsHtml}
    ${narrativesHtml}
    ${ctaHtml}
  `);
}
