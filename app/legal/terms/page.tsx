export const metadata = {
  title: "Termos de Uso | Pocket DM",
  description: "Termos de uso do Pocket DM — combat tracker gratuito para D&D 5e.",
};

const SECTIONS = [
  {
    icon: "&#9989;",
    title: "1. Aceitação dos termos",
    content: (
      <p>
        Ao acessar ou usar o Pocket DM, você confirma que leu, compreendeu
        e concorda com estes Termos de Uso. Se você não concordar com
        qualquer parte destes termos, não utilize o serviço.
      </p>
    ),
  },
  {
    icon: "&#9881;",
    title: "2. Descrição do serviço",
    content: (
      <>
        <p>
          O Pocket DM é uma ferramenta gratuita de combat tracker e
          gerenciamento de sessões para jogos de RPG de mesa, especialmente
          Dungeons &amp; Dragons 5a edição. O serviço permite que Mestres
          (DMs) gerenciem encontros, monstros e personagens em tempo real
          com seus jogadores.
        </p>
        <p className="mt-3">
          O serviço é oferecido gratuitamente. Funcionalidades adicionais
          pagas poderão ser introduzidas no futuro, e você será notificado
          com antecedência antes de qualquer cobrança.
        </p>
      </>
    ),
  },
  {
    icon: "&#128100;",
    title: "3. Elegibilidade",
    content: (
      <p>
        Você deve ter pelo menos 13 anos de idade para usar o Pocket DM.
        Se você tiver entre 13 e 18 anos, deve ter a permissão de um
        responsável legal. Ao criar uma conta, você declara que atende a
        esses requisitos.
      </p>
    ),
  },
  {
    icon: "&#128273;",
    title: "4. Conta de usuário",
    content: (
      <p>
        Você é responsável por manter a confidencialidade das suas
        credenciais de acesso e por todas as atividades realizadas na sua
        conta. Notifique-nos imediatamente em caso de uso não autorizado.
        Nos reservamos o direito de encerrar contas que violem estes
        termos.
      </p>
    ),
  },
  {
    icon: "&#128737;",
    title: "5. Uso aceitável",
    content: (
      <>
        <p>Você concorda em não usar o Pocket DM para:</p>
        <ul className="mt-3 space-y-2">
          {[
            "Violar leis ou regulamentos aplicáveis",
            "Assediar, ameaçar ou prejudicar outros usuários",
            "Tentar acessar indevidamente sistemas ou dados de outros usuários",
            "Introduzir vírus, malware ou qualquer código malicioso",
            "Realizar engenharia reversa ou scraping automatizado do serviço",
          ].map((item) => (
            <li key={item} className="flex items-start gap-2.5">
              <span className="text-gold text-xs mt-0.5">&#9670;</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </>
    ),
  },
  {
    icon: "&#169;",
    title: "6. Propriedade intelectual",
    content: (
      <>
        <p>
          O código, design e marca do Pocket DM são de propriedade exclusiva
          dos seus criadores. O conteúdo de regras de D&amp;D 5e disponível
          no compêndio é derivado do{" "}
          <em>System Reference Document 5.1 e 5.2</em> publicado pela
          Wizards of the Coast sob a licença{" "}
          <a
            href="https://creativecommons.org/licenses/by/4.0/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gold underline underline-offset-4 hover:text-gold/80 transition-colors"
          >
            Creative Commons CC-BY-4.0
          </a>
          .
        </p>
        <p className="mt-3">
          O conteúdo que você cria no serviço — campanhas, personagens,
          anotações — permanece de sua propriedade. Você nos concede uma
          licença limitada para armazenar e exibir esse conteúdo
          exclusivamente com o objetivo de prestar o serviço.
        </p>
      </>
    ),
  },
  {
    icon: "&#9729;",
    title: "7. Disponibilidade do serviço",
    content: (
      <p>
        O Pocket DM é oferecido &quot;como está&quot; e &quot;conforme disponível&quot;. Não
        garantimos disponibilidade ininterrupta. Podemos realizar
        manutenções, atualizações ou modificar funcionalidades a qualquer
        momento, buscando sempre minimizar interrupções.
      </p>
    ),
  },
  {
    icon: "&#9878;",
    title: "8. Limitação de responsabilidade",
    content: (
      <p>
        Na máxima extensão permitida pela lei, o Pocket DM não se
        responsabiliza por danos indiretos, incidentais ou consequentes
        decorrentes do uso ou impossibilidade de uso do serviço, incluindo
        perda de dados de campanha. Recomendamos que você faça backups
        regulares de dados importantes.
      </p>
    ),
  },
  {
    icon: "&#128221;",
    title: "9. Alterações nos termos",
    content: (
      <p>
        Podemos atualizar estes termos periodicamente. Notificaremos
        usuários registrados por e-mail sobre alterações materiais com no
        mínimo 15 dias de antecedência. O uso continuado do serviço após
        esse prazo constitui aceitação dos novos termos.
      </p>
    ),
  },
  {
    icon: "&#9993;",
    title: "10. Contato",
    content: (
      <p>
        Dúvidas sobre estes termos? Entre em contato:{" "}
        <a
          href="mailto:contato@pocketdm.com.br"
          className="text-gold underline underline-offset-4 hover:text-gold/80 transition-colors"
        >
          contato@pocketdm.com.br
        </a>
      </p>
    ),
  },
];

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 pt-16 pb-16">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/art/brand/logo-icon.svg"
            alt=""
            width={36}
            height={36}
            className="opacity-90 drop-shadow-[0_0_10px_rgba(212,168,83,0.4)]"
            aria-hidden="true"
          />
          <h1 className="font-display text-3xl md:text-4xl text-gold">
            Termos de Uso
          </h1>
        </div>
        <p className="text-muted-foreground text-sm">
          Última atualização: abril de 2026
        </p>

        {/* Divider */}
        <div className="flex items-center gap-3 mt-8">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gold/20 to-transparent" />
          <span className="text-gold/40 text-xs">&#9670; &#9670; &#9670;</span>
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gold/20 to-transparent" />
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-5">
        {SECTIONS.map((section) => (
          <section
            key={section.title}
            className="rounded-xl border border-white/[0.06] bg-white/[0.015] p-5 md:p-6"
          >
            <h2 className="font-display text-lg text-foreground/90 mb-3 flex items-center gap-2">
              <span
                className="w-7 h-7 rounded-md bg-gold/10 flex items-center justify-center text-sm shrink-0"
                dangerouslySetInnerHTML={{ __html: section.icon }}
              />
              {section.title}
            </h2>
            <div className="text-foreground/65 text-sm leading-relaxed">
              {section.content}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
