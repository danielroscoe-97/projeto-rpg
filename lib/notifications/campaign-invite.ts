import { sendEmail, escapeHtml, buildEmailShell, buildCtaButton, BRAND } from "./email-core";

interface CampaignInvitePayload {
  email: string;
  dmName: string;
  campaignName: string;
  inviteLink: string;
  inviteToken: string;
}

/**
 * Send campaign invite email via Resend HTTP API.
 * Fail-open: returns false if RESEND_API_KEY is not set.
 */
export async function sendCampaignInviteEmail(payload: CampaignInvitePayload): Promise<boolean> {
  return sendEmail({
    to: payload.email,
    subject: `${payload.dmName} convidou você para ${payload.campaignName} — Pocket DM`,
    html: buildInviteHtml(payload),
  });
}

function buildInviteHtml(p: CampaignInvitePayload): string {
  return buildEmailShell(`
    <h1 style="color:${BRAND.textLight};font-size:20px;margin:0 0 16px;font-family:Georgia,'Times New Roman',serif">Convite para Campanha</h1>
    <p style="color:${BRAND.textBody};font-size:15px;line-height:1.6;margin:0 0 8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
      <strong style="color:${BRAND.gold}">${escapeHtml(p.dmName)}</strong> convidou você para participar da campanha:
    </p>
    <div style="background:#1a1a2e;border:1px solid ${BRAND.goldBorderSubtle};border-radius:8px;padding:16px;margin:16px 0;text-align:center">
      <div style="font-size:18px;font-weight:600;color:${BRAND.textLight};font-family:Georgia,'Times New Roman',serif">${escapeHtml(p.campaignName)}</div>
    </div>
    ${buildCtaButton("Aceitar Convite", p.inviteLink)}
    <p style="color:${BRAND.textFooter};font-size:12px;line-height:1.5;margin:24px 0 0;border-top:1px solid rgba(255,255,255,0.06);padding-top:16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
      Se você não esperava este email, pode ignorá-lo com segurança.
    </p>
  `);
}
