import { sendEmail, escapeHtml, buildEmailShell, buildCtaButton, BRAND } from "./email-core";

interface FirstCombatEmailPayload {
  email: string;
  displayName: string;
  encounterName: string;
  playerCount: number;
  monsterCount: number;
}

export async function sendFirstCombatEmail(payload: FirstCombatEmailPayload): Promise<boolean> {
  return sendEmail({
    to: payload.email,
    subject: "Seu primeiro combate foi criado!",
    html: buildFirstCombatHtml(payload),
  });
}

function buildFirstCombatHtml(p: FirstCombatEmailPayload): string {
  const name = escapeHtml(p.displayName);
  const encounter = escapeHtml(p.encounterName);
  const dashboardUrl = `${BRAND.siteUrl}/app/dashboard`;

  return buildEmailShell(`
    <h1 style="color:${BRAND.textLight};font-size:22px;margin:0 0 8px;font-family:Georgia,'Times New Roman',serif">
      Primeiro combate criado!
    </h1>
    <p style="color:${BRAND.textBody};font-size:15px;line-height:1.6;margin:0 0 20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
      Parab&eacute;ns, ${name}! Seu primeiro encontro est&aacute; no ar.
    </p>

    <div style="background:#1a1a2e;border:1px solid ${BRAND.goldBorderSubtle};border-radius:8px;padding:16px;margin:0 0 20px;text-align:center">
      <div style="font-size:18px;font-weight:600;color:${BRAND.textLight};margin-bottom:8px;font-family:Georgia,'Times New Roman',serif">${encounter}</div>
      <div style="font-size:14px;color:${BRAND.textMuted};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
        ${p.playerCount} jogador${p.playerCount !== 1 ? "es" : ""} vs ${p.monsterCount} monstro${p.monsterCount !== 1 ? "s" : ""}
      </div>
    </div>

    <div style="background:rgba(212,175,55,0.06);border-left:3px solid ${BRAND.gold};border-radius:0 8px 8px 0;padding:12px 16px;margin:0 0 8px">
      <p style="margin:0;font-size:14px;color:${BRAND.textBody};line-height:1.5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
        <strong style="color:${BRAND.gold}">Dica:</strong> Compartilhe o link da sess&atilde;o com seus jogadores para que acompanhem o combate em tempo real pelo celular.
      </p>
    </div>

    ${buildCtaButton("Ir para o Dashboard", dashboardUrl)}
  `);
}
