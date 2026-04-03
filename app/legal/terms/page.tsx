export const metadata = {
  title: "Termos de Uso | Pocket DM",
  description: "Termos de uso do Pocket DM.",
};

export default function TermsPage() {
  return (
    <div className="py-16 px-4">
      <article className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Termos de Uso
        </h1>
        <p className="text-muted-foreground text-sm mb-8">
          Última atualização: abril de 2026
        </p>

        <div className="space-y-8 text-foreground/80 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">
              1. Aceitação dos termos
            </h2>
            <p>
              Ao acessar ou usar o Pocket DM, você confirma que leu, compreendeu
              e concorda com estes Termos de Uso. Se você não concordar com
              qualquer parte destes termos, não utilize o serviço.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">
              2. Descrição do serviço
            </h2>
            <p>
              O Pocket DM é uma ferramenta gratuita de combat tracker e
              gerenciamento de sessões para jogos de RPG de mesa, especialmente
              Dungeons &amp; Dragons 5ª edição. O serviço permite que Mestres
              (DMs) gerenciem encontros, monstros e personagens em tempo real
              com seus jogadores.
            </p>
            <p className="mt-3">
              O serviço é oferecido gratuitamente. Funcionalidades adicionais
              pagas poderão ser introduzidas no futuro, e você será notificado
              com antecedência antes de qualquer cobrança.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">
              3. Elegibilidade
            </h2>
            <p>
              Você deve ter pelo menos 13 anos de idade para usar o Pocket DM.
              Se você tiver entre 13 e 18 anos, deve ter a permissão de um
              responsável legal. Ao criar uma conta, você declara que atende a
              esses requisitos.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">
              4. Conta de usuário
            </h2>
            <p>
              Você é responsável por manter a confidencialidade das suas
              credenciais de acesso e por todas as atividades realizadas na sua
              conta. Notifique-nos imediatamente em caso de uso não autorizado.
              Nos reservamos o direito de encerrar contas que violem estes
              termos.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">
              5. Uso aceitável
            </h2>
            <p>Você concorda em não usar o Pocket DM para:</p>
            <ul className="mt-2 space-y-1 list-disc list-inside text-muted-foreground">
              <li>Violar leis ou regulamentos aplicáveis</li>
              <li>Assediar, ameaçar ou prejudicar outros usuários</li>
              <li>
                Tentar acessar indevidamente sistemas ou dados de outros
                usuários
              </li>
              <li>
                Introduzir vírus, malware ou qualquer código malicioso
              </li>
              <li>
                Realizar engenharia reversa ou scraping automatizado do serviço
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">
              6. Propriedade intelectual
            </h2>
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
                className="text-gold underline underline-offset-4"
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
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">
              7. Disponibilidade do serviço
            </h2>
            <p>
              O Pocket DM é oferecido "como está" e "conforme disponível". Não
              garantimos disponibilidade ininterrupta. Podemos realizar
              manutenções, atualizações ou modificar funcionalidades a qualquer
              momento, buscando sempre minimizar interrupções.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">
              8. Limitação de responsabilidade
            </h2>
            <p>
              Na máxima extensão permitida pela lei, o Pocket DM não se
              responsabiliza por danos indiretos, incidentais ou consequentes
              decorrentes do uso ou impossibilidade de uso do serviço, incluindo
              perda de dados de campanha. Recomendamos que você faça backups
              regulares de dados importantes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">
              9. Alterações nos termos
            </h2>
            <p>
              Podemos atualizar estes termos periodicamente. Notificaremos
              usuários registrados por e-mail sobre alterações materiais com no
              mínimo 15 dias de antecedência. O uso continuado do serviço após
              esse prazo constitui aceitação dos novos termos.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">
              10. Contato
            </h2>
            <p>
              Dúvidas sobre estes termos? Entre em contato pelo e-mail:{" "}
              <a
                href="mailto:contato@pocketdm.com.br"
                className="text-gold underline underline-offset-4"
              >
                contato@pocketdm.com.br
              </a>
            </p>
          </section>
        </div>
      </article>
    </div>
  );
}
