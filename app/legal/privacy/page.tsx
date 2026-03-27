export const metadata = {
  title: "Política de Privacidade | Pocket DM",
  description: "Política de privacidade do Pocket DM.",
};

export default function PrivacyPage() {
  return (
    <div className="py-16 px-4">
      <article className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Política de Privacidade
        </h1>
        <p className="text-muted-foreground text-sm mb-8">
          Última atualização: março de 2026
        </p>

        <div className="space-y-8 text-foreground/80 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">
              1. Quais dados coletamos
            </h2>
            <p>
              Coletamos apenas os dados necessários para o funcionamento do
              serviço:
            </p>
            <ul className="mt-2 space-y-1 list-disc list-inside text-muted-foreground">
              <li>
                <strong className="text-foreground">Endereço de e-mail</strong> —
                usado para autenticação e comunicação
              </li>
              <li>
                <strong className="text-foreground">Dados de campanha</strong> —
                nomes de personagens, pontos de vida, classe de armadura e dados
                de combat tracker que você inserir
              </li>
              <li>
                <strong className="text-foreground">Dados de sessão</strong> —
                endereço IP e timestamps de acesso para segurança e diagnóstico
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">
              2. Como usamos os dados
            </h2>
            <p>
              Seus dados são usados exclusivamente para prestar o serviço:
              armazenar campanhas, sincronizar sessões em tempo real entre
              Mestre e jogadores, e restaurar o estado após desconexões. Não
              vendemos, alugamos nem compartilhamos seus dados com terceiros
              para fins de marketing.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">
              3. Retenção de dados
            </h2>
            <p>
              Seus dados são retidos enquanto sua conta estiver ativa. Você
              pode solicitar a exclusão completa da sua conta a qualquer
              momento nas configurações. Todos os dados associados — campanhas,
              personagens, sessões e histórico de combat — são excluídos
              permanentemente em até 30 dias.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">
              4. Jogadores anônimos
            </h2>
            <p>
              Jogadores que acessam via link de sessão (<code>/join/[token]</code>)
              recebem uma sessão anônima temporária vinculada ao token. Nenhum
              e-mail ou dado pessoal identificável é coletado desses usuários.
              A sessão anônima expira quando o token é desativado pelo Mestre.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">
              5. Seus direitos (LGPD / GDPR)
            </h2>
            <p>
              De acordo com a Lei Geral de Proteção de Dados (LGPD) e o GDPR,
              você tem direito a:
            </p>
            <ul className="mt-2 space-y-1 list-disc list-inside text-muted-foreground">
              <li>Acessar os dados que temos sobre você</li>
              <li>Corrigir dados incorretos</li>
              <li>Solicitar a exclusão de todos os seus dados</li>
              <li>Portabilidade dos dados em formato legível por máquina</li>
              <li>
                Opor-se ao processamento quando aplicável
              </li>
            </ul>
            <p className="mt-3">
              Para exercer qualquer desses direitos, entre em contato pelo
              e-mail:{" "}
              <a
                href="mailto:privacidade@pocketdm.app"
                className="text-gold underline underline-offset-4"
              >
                privacidade@pocketdm.app
              </a>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">
              6. Segurança
            </h2>
            <p>
              Dados são armazenados no Supabase com criptografia em repouso e
              em trânsito (TLS). Senhas nunca são armazenadas em texto plano —
              usamos o sistema de autenticação do Supabase, que aplica hashing
              bcrypt. O acesso aos dados é controlado por políticas de Row Level
              Security (RLS) no banco de dados.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">
              7. Alterações nesta política
            </h2>
            <p>
              Notificaremos usuários registrados por e-mail sobre alterações
              materiais nesta política com no mínimo 15 dias de antecedência.
              O uso continuado do serviço após esse prazo constitui aceitação
              das alterações.
            </p>
          </section>
        </div>
      </article>
    </div>
  );
}
