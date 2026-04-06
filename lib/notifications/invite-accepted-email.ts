import { sendEmail, escapeHtml, buildEmailShell, buildCtaButton, BRAND } from "./email-core";

interface InviteAcceptedEmailPayload {
  dmEmail: string;
  dmName: string;
  playerDisplayName: string;
  campaignName: string;
  campaignUrl: string;
  memberCount: number;
}

/**
 * Notifies the DM that a player has joined their campaign.
 * Fail-open: returns false on failure.
 */
export async function sendInviteAcceptedEmail(payload: InviteAcceptedEmailPayload): Promise<boolean> {
  return sendEmail({
    to: payload.dmEmail,
    subject: `${payload.playerDisplayName} entrou na campanha ${payload.campaignName}`,
    html: buildInviteAcceptedHtml(payload),
  });
}

function buildInviteAcceptedHtml(p: InviteAcceptedEmailPayload): string {
  const dmName = escapeHtml(p.dmName);
  const playerName = escapeHtml(p.playerDisplayName);
  const campaignName = escapeHtml(p.campaignName);

  return buildEmailShell(`
    <h1 style="color:${BRAND.textLight};font-size:22px;margin:0 0 8px;font-family:Georgia,'Times New Roman',serif">
      Novo jogador na campanha!
    </h1>
    <p style="color:${BRAND.textBody};font-size:15px;line-height:1.6;margin:0 0 20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
      ${dmName}, <strong style="color:${BRAND.gold}">${playerName}</strong> acabou de entrar na sua campanha.
    </p>

    <div style="background:#1a1a2e;border:1px solid ${BRAND.goldBorderSubtle};border-radius:8px;padding:16px;margin:0 0 20px">
      <div style="font-size:18px;font-weight:600;color:${BRAND.textLight};margin-bottom:8px;text-align:center;font-family:Georgia,'Times New Roman',serif">
        ${campaignName}
      </div>
      <div style="text-align:center">
        <span style="display:inline-block;background:rgba(212,175,55,0.12);border:1px solid ${BRAND.goldBorderSubtle};border-radius:20px;padding:4px 14px;font-size:13px;color:${BRAND.gold};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
          ${p.memberCount} membro${p.memberCount !== 1 ? "s" : ""}
        </span>
      </div>
    </div>

    ${buildCtaButton("Ver Campanha", p.campaignUrl)}
  `);
}
