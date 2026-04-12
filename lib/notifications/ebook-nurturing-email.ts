import {
  sendEmail,
  buildEmailShell,
  buildCtaButton,
  BRAND,
} from "./email-core";

const PDF_URL = `${BRAND.siteUrl}/ebooks/guia-mestre-eficaz-no-combate.pdf`;
const TRY_URL = `${BRAND.siteUrl}/try`;
const REGISTER_URL = `${BRAND.siteUrl}/auth/login`;
const COMPENDIUM_URL = `${BRAND.siteUrl}/monstros`;

const BODY_FONT =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif";

function p(text: string): string {
  return `<p style="color:${BRAND.textBody};font-size:15px;line-height:1.6;margin:0 0 16px;font-family:${BODY_FONT}">${text}</p>`;
}

function heading(text: string): string {
  return `<h1 style="color:${BRAND.textLight};font-size:22px;margin:0 0 8px;font-family:Georgia,'Times New Roman',serif">${text}</h1>`;
}

function subheading(text: string): string {
  return `<h2 style="color:${BRAND.gold};font-size:16px;margin:24px 0 12px;font-family:Georgia,'Times New Roman',serif">${text}</h2>`;
}

function chapterItem(number: string, title: string): string {
  return `
    <tr>
      <td width="32" valign="top" style="padding:4px 8px 4px 0">
        <span style="color:${BRAND.gold};font-size:14px;font-weight:700;font-family:${BODY_FONT}">${number}</span>
      </td>
      <td valign="top" style="padding:4px 0">
        <span style="color:${BRAND.textBody};font-size:14px;font-family:${BODY_FONT}">${title}</span>
      </td>
    </tr>`;
}

// ─── Email 1: Immediate — Ebook delivery ──────────────────────────
export async function sendEbookWelcomeEmail({
  email,
}: {
  email: string;
}): Promise<boolean> {
  return sendEmail({
    to: email,
    subject: "Seu guia tá aqui. Bom combate!",
    html: buildEmailShell(`
      ${heading("Seu guia chegou!")}
      ${p("Valeu por baixar o <strong>Guia do Mestre Eficaz no Combate</strong>. Espero que ele torne suas sess&otilde;es mais &aacute;geis e memor&aacute;veis.")}

      ${buildCtaButton("Baixar o PDF", PDF_URL)}

      ${subheading("O que voc&ecirc; vai encontrar")}
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px">
        ${chapterItem("Cap 1", "Pare de Anotar Iniciativa")}
        ${chapterItem("Cap 2", "HP em Tempo Real = Decis&otilde;es T&aacute;ticas")}
        ${chapterItem("Cap 3", "Combate R&aacute;pido, N&atilde;o Combate Lento")}
        ${chapterItem("Cap 4", "Transpar&ecirc;ncia Gera Imers&atilde;o")}
        ${chapterItem("Cap 5", "Do Zero ao Combate em 60 Segundos")}
      </table>

      ${p("Quer ver esses conceitos na pr&aacute;tica? O Pocket DM tem um modo de demonstra&ccedil;&atilde;o gratuito &mdash; sem cadastro.")}

      ${buildCtaButton("Testar combate gratuito", TRY_URL)}

      ${p(`<span style="color:${BRAND.textMuted};font-size:13px">Nos pr&oacute;ximos dias vou mandar mais dicas curtas sobre combate. Se n&atilde;o quiser receber, &eacute; s&oacute; ignorar &mdash; sem ressentimentos.</span>`)}
    `),
  });
}

// ─── Email 2: D+3 — Initiative feature ────────────────────────────
export async function sendEbookNurturing2({
  email,
}: {
  email: string;
}): Promise<boolean> {
  return sendEmail({
    to: email,
    subject: "Já testou a iniciativa automática?",
    html: buildEmailShell(`
      ${heading("Iniciativa em 1 clique")}
      ${p("No Cap&iacute;tulo 1 do guia, a gente fala sobre como a iniciativa manual trava a mesa. Rolagem, anota&ccedil;&atilde;o, ordena&ccedil;&atilde;o... tudo isso consome minutos preciosos.")}

      ${p("No Pocket DM, basta adicionar os combatentes e clicar <strong>Rolar Iniciativa</strong>. A ordem &eacute; calculada, desempates s&atilde;o resolvidos, e voc&ecirc; j&aacute; come&ccedil;a no turno 1.")}

      ${p("E se seus jogadores est&atilde;o na mesa com celular, eles podem entrar via <strong>QR Code</strong> e rolar a pr&oacute;pria iniciativa &mdash; o resultado aparece na sua tela em tempo real.")}

      ${buildCtaButton("Testar iniciativa agora", TRY_URL)}

      ${p(`<span style="color:${BRAND.textMuted};font-size:13px">Dica r&aacute;pida direto do guia que voc&ecirc; baixou. Na pr&oacute;xima, a gente fala sobre transpar&ecirc;ncia no combate.</span>`)}
    `),
  });
}

// ─── Email 3: D+7 — Engagement + transparency tip ─────────────────
export async function sendEbookNurturing3({
  email,
}: {
  email: string;
}): Promise<boolean> {
  return sendEmail({
    to: email,
    subject: "Como ficou o combate da sua mesa?",
    html: buildEmailShell(`
      ${heading("Tudo certo por a&iacute;?")}
      ${p("J&aacute; faz uma semana que voc&ecirc; baixou o guia. Queria saber: <strong>voc&ecirc; conseguiu aplicar alguma dica na sua mesa?</strong>")}

      ${p("Uma das ideias que mais surpreendem os mestres &eacute; a do <strong>Cap&iacute;tulo 4: transpar&ecirc;ncia gera imers&atilde;o</strong>. Mostrar o HP do monstro n&atilde;o quebra a tens&atilde;o &mdash; na verdade, faz os jogadores pensarem mais estrategicamente.")}

      ${p("Quando o grupo v&ecirc; que o drag&atilde;o ainda tem 60% de vida, as decis&otilde;es mudam: &ldquo;gasto o slot de 3&deg; n&iacute;vel agora ou guardo?&rdquo;. Isso <em>&eacute;</em> imers&atilde;o.")}

      ${p("O Pocket DM mostra barras de HP para todos os jogadores por padr&atilde;o. Se preferir, voc&ecirc; pode ocultar &mdash; mas experimente deixar vis&iacute;vel por uma sess&atilde;o.")}

      ${buildCtaButton("Criar conta gratuita", REGISTER_URL)}

      ${p(`<span style="color:${BRAND.textMuted};font-size:13px">Com uma conta, voc&ecirc; salva campanhas, convida jogadores e mant&eacute;m hist&oacute;rico de sess&otilde;es.</span>`)}
    `),
  });
}

// ─── Email 4: D+14 — Compendium highlight ─────────────────────────
export async function sendEbookNurturing4({
  email,
}: {
  email: string;
}): Promise<boolean> {
  return sendEmail({
    to: email,
    subject: "1.100 monstros prontos pra sua sessão",
    html: buildEmailShell(`
      ${heading("Seu bestiário de bolso")}
      ${p("No Cap&iacute;tulo 5 do guia, a gente fala sobre montar encontros em 60 segundos. Agora imagina ter <strong>mais de 1.100 monstros</strong> com ficha completa, prontos pra arrastar pro combate.")}

      ${p("O Pocket DM tem um comp&ecirc;ndio gratuito e aberto com:")}

      <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px">
        <tr>
          <td style="padding:6px 0;color:${BRAND.textBody};font-size:14px;font-family:${BODY_FONT}">
            <span style="color:${BRAND.gold};margin-right:8px">&#9670;</span> 419 monstros do SRD 5e (2014)
          </td>
        </tr>
        <tr>
          <td style="padding:6px 0;color:${BRAND.textBody};font-size:14px;font-family:${BODY_FONT}">
            <span style="color:${BRAND.gold};margin-right:8px">&#9670;</span> 346 monstros do SRD 5e (2024)
          </td>
        </tr>
        <tr>
          <td style="padding:6px 0;color:${BRAND.textBody};font-size:14px;font-family:${BODY_FONT}">
            <span style="color:${BRAND.gold};margin-right:8px">&#9670;</span> 357 monstros da comunidade (Monster-a-Day)
          </td>
        </tr>
        <tr>
          <td style="padding:6px 0;color:${BRAND.textBody};font-size:14px;font-family:${BODY_FONT}">
            <span style="color:${BRAND.gold};margin-right:8px">&#9670;</span> Filtros por CR, tipo, ambiente e busca por nome
          </td>
        </tr>
      </table>

      ${p("Tudo gratuito. Sem login. Sem paywall.")}

      ${buildCtaButton("Explorar monstros", COMPENDIUM_URL)}

      ${p("E quando quiser levar pro combate, &eacute; s&oacute; criar uma conta gratuita e arrastar os monstros direto pro encontro.")}

      ${buildCtaButton("Criar conta gratuita", REGISTER_URL)}

      ${p(`<span style="color:${BRAND.textMuted};font-size:13px">&Uacute;ltimo email da s&eacute;rie. Se precisar de algo, responda este email &mdash; eu leio tudo. Boas sess&otilde;es!</span>`)}
    `),
  });
}
