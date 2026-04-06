import { sendEmail, escapeHtml, buildEmailShell, buildCtaButton, BRAND } from "./email-core";

interface WelcomeEmailPayload {
  email: string;
  displayName: string;
}

export async function sendWelcomeEmail(payload: WelcomeEmailPayload): Promise<boolean> {
  return sendEmail({
    to: payload.email,
    subject: "Sua mesa te espera, Mestre.",
    html: buildWelcomeHtml(payload),
  });
}

function buildWelcomeHtml(p: WelcomeEmailPayload): string {
  const name = escapeHtml(p.displayName);
  const dashboardUrl = `${BRAND.siteUrl}/app/dashboard`;

  return buildEmailShell(`
    <h1 style="color:${BRAND.textLight};font-size:22px;margin:0 0 8px;font-family:Georgia,'Times New Roman',serif">
      Bem-vindo ao Pocket DM, ${name}!
    </h1>
    <p style="color:${BRAND.textBody};font-size:15px;line-height:1.6;margin:0 0 24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
      Sua mesa de RPG agora tem um aliado digital. Em poucos passos você estará pronto para mestrar.
    </p>

    <!-- Step 1 -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px">
      <tr>
        <td width="40" valign="top" style="padding-right:12px">
          <div style="width:36px;height:36px;border-radius:50%;background:rgba(212,175,55,0.12);border:1px solid ${BRAND.goldBorderSubtle};text-align:center;line-height:36px;font-size:16px;color:${BRAND.gold};font-weight:700">1</div>
        </td>
        <td valign="top">
          <div style="font-size:15px;font-weight:600;color:${BRAND.textLight};margin-bottom:2px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">Crie sua campanha</div>
          <div style="font-size:13px;color:${BRAND.textMuted};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">D&ecirc; um nome e escolha o sistema (5e 2014 ou 2024).</div>
        </td>
      </tr>
    </table>

    <!-- Step 2 -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px">
      <tr>
        <td width="40" valign="top" style="padding-right:12px">
          <div style="width:36px;height:36px;border-radius:50%;background:rgba(212,175,55,0.12);border:1px solid ${BRAND.goldBorderSubtle};text-align:center;line-height:36px;font-size:16px;color:${BRAND.gold};font-weight:700">2</div>
        </td>
        <td valign="top">
          <div style="font-size:15px;font-weight:600;color:${BRAND.textLight};margin-bottom:2px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">Convide jogadores</div>
          <div style="font-size:13px;color:${BRAND.textMuted};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">Compartilhe o link ou envie convites por email.</div>
        </td>
      </tr>
    </table>

    <!-- Step 3 -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px">
      <tr>
        <td width="40" valign="top" style="padding-right:12px">
          <div style="width:36px;height:36px;border-radius:50%;background:rgba(212,175,55,0.12);border:1px solid ${BRAND.goldBorderSubtle};text-align:center;line-height:36px;font-size:16px;color:${BRAND.gold};font-weight:700">3</div>
        </td>
        <td valign="top">
          <div style="font-size:15px;font-weight:600;color:${BRAND.textLight};margin-bottom:2px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">Inicie o combate</div>
          <div style="font-size:13px;color:${BRAND.textMuted};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">Monte o encontro, role iniciativa e comande a batalha.</div>
        </td>
      </tr>
    </table>

    ${buildCtaButton("Ir para o Dashboard", dashboardUrl)}
  `);
}
