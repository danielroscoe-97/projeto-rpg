import { sendEmail, escapeHtml, buildEmailShell, buildCtaButton, BRAND } from "./email-core";

interface InactivityEmailPayload {
  email: string;
  displayName: string;
  variant: "d3" | "d7";
}

export async function sendInactivityEmail(payload: InactivityEmailPayload): Promise<boolean> {
  const isD3 = payload.variant === "d3";
  return sendEmail({
    to: payload.email,
    subject: isD3
      ? "Sua mesa est\u00e1 esperando, Mestre..."
      : "Que tal um Combate R\u00e1pido?",
    html: buildInactivityHtml(payload),
  });
}

function buildInactivityHtml(p: InactivityEmailPayload): string {
  const name = escapeHtml(p.displayName);
  const isD3 = p.variant === "d3";
  const quickCombatUrl = `${BRAND.siteUrl}/app/combat/new`;
  const dashboardUrl = `${BRAND.siteUrl}/app/dashboard`;

  if (isD3) {
    return buildEmailShell(`
      <h1 style="color:${BRAND.textLight};font-size:22px;margin:0 0 8px;font-family:Georgia,'Times New Roman',serif">
        Sua mesa est\u00e1 esperando, ${name}
      </h1>
      <p style="color:${BRAND.textBody};font-size:15px;line-height:1.6;margin:0 0 20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
        Voc\u00ea criou sua conta h\u00e1 alguns dias mas ainda n\u00e3o montou sua primeira campanha. Que tal come\u00e7ar?
      </p>
      <p style="color:${BRAND.textBody};font-size:15px;line-height:1.6;margin:0 0 8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
        Em poucos minutos voc\u00ea configura tudo: crie uma campanha, adicione jogadores e inicie seu primeiro combate.
      </p>
      ${buildCtaButton("Montar minha mesa", dashboardUrl)}
    `);
  }

  // D+7 variant
  return buildEmailShell(`
    <h1 style="color:${BRAND.textLight};font-size:22px;margin:0 0 8px;font-family:Georgia,'Times New Roman',serif">
      Que tal um Combate R\u00e1pido, ${name}?
    </h1>
    <p style="color:${BRAND.textBody};font-size:15px;line-height:1.6;margin:0 0 20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
      Sem compromisso: o <strong style="color:${BRAND.gold}">Combate R\u00e1pido</strong> permite testar o Pocket DM sem precisar criar campanha ou convidar ningu\u00e9m.
    </p>
    <p style="color:${BRAND.textBody};font-size:15px;line-height:1.6;margin:0 0 8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
      Monte um encontro r\u00e1pido, role iniciativa e veja como a ferramenta funciona na pr\u00e1tica.
    </p>
    ${buildCtaButton("Iniciar Combate R\u00e1pido", quickCombatUrl)}
  `);
}
