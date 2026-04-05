import { captureError, captureWarning } from "@/lib/errors/capture";

interface CampaignInvitePayload {
  email: string;
  dmName: string;
  campaignName: string;
  inviteLink: string;
  inviteToken: string;
}

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? "Pocket DM <noreply@pocketdm.com.br>";

/**
 * Send campaign invite email via Resend HTTP API.
 * Fail-open: returns false if RESEND_API_KEY is not set.
 */
export async function sendCampaignInviteEmail(payload: CampaignInvitePayload): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    captureWarning("RESEND_API_KEY not set — email invites disabled (link-only mode)", {
      component: "notifications/campaign-invite",
      category: "network",
    });
    return false;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [payload.email],
        subject: `${payload.dmName} convidou você para ${payload.campaignName} — Pocket DM`,
        html: buildInviteHtml(payload),
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Resend API ${res.status}: ${body}`);
    }

    return true;
  } catch (error) {
    captureError(error, {
      component: "notifications/campaign-invite",
      action: "sendCampaignInviteEmail",
      category: "network",
      extra: { campaignName: payload.campaignName, email: payload.email },
    });
    return false;
  }
}

const LOGO_URL = `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://pocketdm.com.br"}/icons/icon-192.png`;

function buildInviteHtml(p: CampaignInvitePayload): string {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:Georgia,'Times New Roman',serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0f;padding:40px 20px">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#14141f;border-radius:12px;border:1px solid rgba(212,175,55,0.2);overflow:hidden">
        <tr><td style="padding:32px 28px 0;text-align:center">
          <img src="${LOGO_URL}" alt="Pocket DM" width="64" height="64" style="display:block;margin:0 auto 12px;border-radius:12px" />
          <div style="font-size:24px;font-weight:700;color:#d4af37;letter-spacing:2px;font-family:Georgia,'Times New Roman',serif">POCKET DM</div>
          <div style="font-size:11px;color:#888;margin-top:4px;letter-spacing:3px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">MASTER YOUR TABLE</div>
        </td></tr>
        <tr><td style="padding:28px">
          <h1 style="color:#f5f5f5;font-size:20px;margin:0 0 16px;font-family:Georgia,'Times New Roman',serif">Convite para Campanha</h1>
          <p style="color:#ccc;font-size:15px;line-height:1.6;margin:0 0 8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
            <strong style="color:#d4af37">${escapeHtml(p.dmName)}</strong> convidou você para participar da campanha:
          </p>
          <div style="background:#1a1a2e;border:1px solid rgba(212,175,55,0.15);border-radius:8px;padding:16px;margin:16px 0;text-align:center">
            <div style="font-size:18px;font-weight:600;color:#f5f5f5;font-family:Georgia,'Times New Roman',serif">${escapeHtml(p.campaignName)}</div>
          </div>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0">
            <tr><td align="center">
              <a href="${escapeHtml(p.inviteLink)}" style="display:inline-block;background:#d4af37;color:#0a0a0f;font-weight:700;font-size:15px;padding:14px 32px;border-radius:8px;text-decoration:none;letter-spacing:0.5px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
                Aceitar Convite
              </a>
            </td></tr>
          </table>
          <p style="color:#666;font-size:12px;line-height:1.5;margin:24px 0 0;border-top:1px solid rgba(255,255,255,0.06);padding-top:16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
            Se você não esperava este email, pode ignorá-lo com segurança.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
