export const metadata = {
  title: "Política de Privacidade | Pocket DM",
  description: "Política de privacidade do Pocket DM — combat tracker gratuito para D&D 5e.",
};

const SECTIONS = [
  {
    icon: "&#128269;",
    title: "1. Quais dados coletamos",
    content: (
      <>
        <p>
          Coletamos apenas os dados necessários para o funcionamento do serviço:
        </p>
        <ul className="mt-3 space-y-2">
          <li className="flex items-start gap-2.5">
            <span className="text-gold text-xs mt-0.5">&#9670;</span>
            <span>
              <strong className="text-foreground/90">Endereço de e-mail</strong>{" "}
              — usado para autenticação e comunicação
            </span>
          </li>
          <li className="flex items-start gap-2.5">
            <span className="text-gold text-xs mt-0.5">&#9670;</span>
            <span>
              <strong className="text-foreground/90">Dados de campanha</strong>{" "}
              — nomes de personagens, pontos de vida, classe de armadura e dados
              de combat tracker que você inserir
            </span>
          </li>
          <li className="flex items-start gap-2.5">
            <span className="text-gold text-xs mt-0.5">&#9670;</span>
            <span>
              <strong className="text-foreground/90">Dados de sessão</strong>{" "}
              — endereço IP e timestamps de acesso para segurança e diagnóstico
            </span>
          </li>
        </ul>
      </>
    ),
  },
  {
    icon: "&#128274;",
    title: "2. Como usamos os dados",
    content: (
      <p>
        Seus dados são usados exclusivamente para prestar o serviço:
        armazenar campanhas, sincronizar sessões em tempo real entre
        Mestre e jogadores, e restaurar o estado após desconexões. Não
        vendemos, alugamos nem compartilhamos seus dados com terceiros
        para fins de marketing.
      </p>
    ),
  },
  {
    icon: "&#128197;",
    title: "3. Retenção de dados",
    content: (
      <p>
        Seus dados são retidos enquanto sua conta estiver ativa. Você
        pode solicitar a exclusão completa da sua conta a qualquer
        momento nas configurações. Todos os dados associados — campanhas,
        personagens, sessões e histórico de combat — são excluídos
        permanentemente em até 30 dias.
      </p>
    ),
  },
  {
    icon: "&#128100;",
    title: "4. Jogadores anônimos",
    content: (
      <p>
        Jogadores que acessam via link de sessão recebem uma sessão anônima
        temporária vinculada ao token. Nenhum e-mail ou dado pessoal
        identificável é coletado desses usuários. A sessão anônima expira
        quando o token é desativado pelo Mestre.
      </p>
    ),
  },
  {
    icon: "&#9878;",
    title: "5. Seus direitos (LGPD / GDPR)",
    content: (
      <>
        <p>
          De acordo com a Lei Geral de Proteção de Dados (LGPD) e o GDPR,
          você tem direito a:
        </p>
        <ul className="mt-3 space-y-2">
          {[
            "Acessar os dados que temos sobre você",
            "Corrigir dados incorretos",
            "Solicitar a exclusão de todos os seus dados",
            "Portabilidade dos dados em formato legível por máquina",
            "Opor-se ao processamento quando aplicável",
          ].map((item) => (
            <li key={item} className="flex items-start gap-2.5">
              <span className="text-gold text-xs mt-0.5">&#9670;</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4">
          Para exercer qualquer desses direitos, entre em contato:{" "}
          <a
            href="mailto:privacidade@pocketdm.com.br"
            className="text-gold underline underline-offset-4 hover:text-gold/80 transition-colors"
          >
            privacidade@pocketdm.com.br
          </a>
        </p>
      </>
    ),
  },
  {
    icon: "&#128737;",
    title: "6. Segurança",
    content: (
      <p>
        Dados são armazenados no Supabase com criptografia em repouso e
        em trânsito (TLS). Senhas nunca são armazenadas em texto plano —
        usamos autenticação com hashing bcrypt. O acesso aos dados é
        controlado por políticas de Row Level Security (RLS) no banco de dados.
      </p>
    ),
  },
  {
    icon: "&#128221;",
    title: "7. Alterações nesta política",
    content: (
      <p>
        Notificaremos usuários registrados por e-mail sobre alterações
        materiais nesta política com no mínimo 15 dias de antecedência.
        O uso continuado do serviço após esse prazo constitui aceitação
        das alterações.
      </p>
    ),
  },
];

export default function PrivacyPage() {
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
            Política de Privacidade
          </h1>
        </div>
        <p className="text-muted-foreground text-sm">
          Última atualização: março de 2026
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
