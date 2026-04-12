import { captureError, captureWarning } from "@/lib/errors/capture";

// ─── Brand constants ───────────────────────────────────────────────
export const BRAND = {
  bgDark: "#0a0a0f",
  card: "#14141f",
  gold: "#d4af37",
  goldBorder: "rgba(212,175,55,0.2)",
  goldBorderSubtle: "rgba(212,175,55,0.15)",
  textLight: "#f5f5f5",
  textBody: "#ccc",
  textMuted: "#888",
  textFooter: "#666",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.pocketdm.com.br",
  logoUrl: `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.pocketdm.com.br"}/icons/icon-192.png`,
  fromEmail: process.env.RESEND_FROM_EMAIL ?? "Pocket DM <noreply@pocketdm.com.br>",
} as const;

// ─── Helpers ───────────────────────────────────────────────────────
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Format seconds into "Xh Ymin" or "Xmin Ys" */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.round(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h ${minutes}min`;
  if (minutes > 0) return `${minutes}min ${seconds}s`;
  return `${seconds}s`;
}

// ─── Email shell (shared header + footer) ──────────────────────────
/**
 * Wraps inner HTML content in the standard PocketDM email layout:
 * dark background, card with logo header, gold accents, footer.
 */
export function buildEmailShell(innerHtml: string): string {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:${BRAND.bgDark};font-family:Georgia,'Times New Roman',serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.bgDark};padding:40px 20px">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:${BRAND.card};border-radius:12px;border:1px solid ${BRAND.goldBorder};overflow:hidden">
        <tr><td style="padding:32px 28px 0;text-align:center">
          <img src="${BRAND.logoUrl}" alt="Pocket DM" width="64" height="64" style="display:block;margin:0 auto 12px;border-radius:12px" />
          <div style="font-size:24px;font-weight:700;color:${BRAND.gold};letter-spacing:2px;font-family:Georgia,'Times New Roman',serif">POCKET DM</div>
          <div style="font-size:11px;color:${BRAND.textMuted};margin-top:4px;letter-spacing:3px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">MASTER YOUR TABLE</div>
        </td></tr>
        <tr><td style="padding:28px">
          ${innerHtml}
        </td></tr>
        <tr><td style="padding:16px 28px 24px;border-top:1px solid rgba(255,255,255,0.06)">
          <p style="margin:0;font-size:12px;color:${BRAND.textFooter};line-height:1.5;text-align:center;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
            <a href="${BRAND.siteUrl}" style="color:${BRAND.gold};text-decoration:none">pocketdm.com.br</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();
}

/** Builds a gold CTA button for email templates */
export function buildCtaButton(text: string, href: string): string {
  return `
<table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0">
  <tr><td align="center">
    <a href="${escapeHtml(href)}" style="display:inline-block;background:${BRAND.gold};color:${BRAND.bgDark};font-weight:700;font-size:15px;padding:14px 32px;border-radius:8px;text-decoration:none;letter-spacing:0.5px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
      ${text}
    </a>
  </td></tr>
</table>`;
}

// ─── Generic email sender ──────────────────────────────────────────
interface SendEmailPayload {
  to: string;
  subject: string;
  html: string;
}

/**
 * Send an email via Resend HTTP API.
 * Fail-open: returns false if RESEND_API_KEY is not set or API fails.
 */
export async function sendEmail(payload: SendEmailPayload): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    captureWarning("RESEND_API_KEY not set — transactional emails disabled", {
      component: "notifications/email-core",
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
        from: BRAND.fromEmail,
        to: [payload.to],
        subject: payload.subject,
        html: payload.html,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Resend API ${res.status}: ${body}`);
    }

    return true;
  } catch (error) {
    captureError(error, {
      component: "notifications/email-core",
      action: "sendEmail",
      category: "network",
      extra: { subject: payload.subject, to: payload.to },
    });
    return false;
  }
}
