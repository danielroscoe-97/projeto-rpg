import Link from "next/link";
import Image from "next/image";
import {
  BuildVariantProvider,
  BuildVariantToggle,
  Variant,
  StrategyBox,
} from "../BuildVariant";
import { EbookCTA } from "../EbookCTA";
import {
  Img,
  ExtLink,
  IntLink,
  ProdLink,
  H2,
  H3,
  P,
  Li,
  Ul,
  Tip,
  CTA,
  FloatingArt,
  SectionDivider,
  ArtCallout,
} from "./_shared";

export default function BlogPost3() {
  return (
    <>
      <P>
        "Usa Roll20?" Essa é a primeira pergunta que todo mestre escuta quando
        menciona que usa ferramenta digital. E a resposta geralmente é: "pra mesa
        presencial? Não, obrigado." A confusão entre combat tracker e VTT é
        real e faz muita gente usar ferramenta errada pro problema errado.
        Vamos separar as coisas.
      </P>

      <H2>VTT: o canivete suíço que pode ser demais</H2>
      <P>
        Virtual Tabletop é uma plataforma que simula a mesa inteira no
        computador. Os mais conhecidos:{" "}
        <ExtLink href="https://roll20.net">Roll20</ExtLink>,{" "}
        <ExtLink href="https://foundryvtt.com">Foundry VTT</ExtLink> e{" "}
        <ExtLink href="https://www.fantasygrounds.com">Fantasy Grounds</ExtLink>. Eles oferecem:
      </P>
      <Ul>
        <Li>Mapas interativos com grid e fog of war</Li>
        <Li>Tokens movíveis representando personagens e monstros</Li>
        <Li>Fichas de personagem integradas</Li>
        <Li>Chat de texto e voz</Li>
        <Li>Automação de regras (rolagem, dano, condições)</Li>
        <Li>Marketplace de conteúdo (mapas, aventuras, tokens)</Li>
      </Ul>

      <Img src="/art/blog/landing-hero.png" alt="Mesa presencial de D&D com dados, miniaturas e livros — o cenário ideal para um combat tracker" />

      <H2>Combat Tracker: faz uma coisa e faz direito</H2>
      <P>
        Um <ProdLink href="/try">combat tracker</ProdLink> é cirúrgico. Ele
        só gerencia combate, e por isso é muito mais rápido de usar:
      </P>
      <Ul>
        <Li>Ordem de iniciativa automática</Li>
        <Li>Gerenciamento de HP com barras visuais</Li>
        <Li><ProdLink href="/condicoes">Condições ativas</ProdLink> (blinded, stunned, etc.)</Li>
        <Li>Avanço de turnos</Li>
        <Li><ProdLink href="/monstros">Bestiário integrado</ProdLink> (stat blocks)</Li>
        <Li>Funciona no celular dos jogadores</Li>
      </Ul>

      <H2>Lado a lado: onde cada um ganha</H2>
      <div className="overflow-x-auto mb-6">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left py-2 pr-4 text-foreground/60 font-medium">Aspecto</th>
              <th className="text-left py-2 pr-4 text-foreground/60 font-medium">VTT</th>
              <th className="text-left py-2 text-foreground/60 font-medium">Combat Tracker</th>
            </tr>
          </thead>
          <tbody className="text-foreground/75">
            <tr className="border-b border-white/[0.05]">
              <td className="py-2 pr-4">Setup</td>
              <td className="py-2 pr-4">30-60 min por sessão</td>
              <td className="py-2">2-5 minutos</td>
            </tr>
            <tr className="border-b border-white/[0.05]">
              <td className="py-2 pr-4">Curva de aprendizado</td>
              <td className="py-2 pr-4">Alta (semanas)</td>
              <td className="py-2">Mínima (minutos)</td>
            </tr>
            <tr className="border-b border-white/[0.05]">
              <td className="py-2 pr-4">Foco</td>
              <td className="py-2 pr-4">Mesa online completa</td>
              <td className="py-2">Combate apenas</td>
            </tr>
            <tr className="border-b border-white/[0.05]">
              <td className="py-2 pr-4">Mapas</td>
              <td className="py-2 pr-4">Sim, interativos</td>
              <td className="py-2">Não (teatro da mente)</td>
            </tr>
            <tr className="border-b border-white/[0.05]">
              <td className="py-2 pr-4">Preço</td>
              <td className="py-2 pr-4">Grátis a US$50+</td>
              <td className="py-2">Geralmente grátis</td>
            </tr>
            <tr className="border-b border-white/[0.05]">
              <td className="py-2 pr-4">Mobile</td>
              <td className="py-2 pr-4">Limitado</td>
              <td className="py-2">Otimizado</td>
            </tr>
            <tr>
              <td className="py-2 pr-4">Ideal para</td>
              <td className="py-2 pr-4">Mesas online/remotas</td>
              <td className="py-2">Mesas presenciais</td>
            </tr>
          </tbody>
        </table>
      </div>

      <H2>Qual escolher? Depende da sua mesa</H2>
      <H3>VTT faz sentido se:</H3>
      <Ul>
        <Li>Seus jogadores jogam online/remotamente</Li>
        <Li>Você quer mapas interativos e fog of war</Li>
        <Li>Você tem tempo para configurar antes de cada sessão</Li>
        <Li>Todos têm computador (não funciona bem no celular)</Li>
      </Ul>

      <Img src="/art/blog/combat-with-monsters.png" alt="Pocket DM — setup de encontro com 4 monstros prontos para o combate" />

      <H3>Combat Tracker é o caminho se:</H3>
      <Ul>
        <Li>Você joga presencialmente</Li>
        <Li>Quer algo rápido e sem complicação</Li>
        <Li>Seus jogadores usam celular, não notebook</Li>
        <Li>Prefere teatro da mente ou miniaturas físicas</Li>
        <Li>Não quer forçar seus jogadores a criar contas</Li>
      </Ul>

      <Tip>
        Na prática, muitos mestres usam os dois. VTT na quarta-feira à noite
        quando o grupo joga online, combat tracker no sábado quando se encontram
        presencialmente. Não são concorrentes, são ferramentas pra contextos
        diferentes.
      </Tip>

      <CTA category="comparativo" />

      <H2>Resumindo</H2>
      <P>
        VTT é um ecossistema completo pra jogar online. Combat tracker é uma
        ferramenta cirúrgica pra gerenciar combate presencial. Se sua mesa se
        encontra ao vivo, o{" "}
        <ProdLink href="/try">Pocket DM</ProdLink> faz o trabalho em uma fração
        do tempo e da complexidade. Se quer aprofundar, veja o{" "}
        <IntLink slug="como-usar-combat-tracker-dnd-5e">guia de combat tracker</IntLink>,
        as{" "}
        <IntLink slug="ferramentas-essenciais-mestre-dnd-5e">5 ferramentas essenciais</IntLink>,
        ou o{" "}
        <ExtLink href="https://www.hipstersanddragons.com/best-virtual-tabletops/">comparativo de VTTs do Hipsters &amp; Dragons</ExtLink>.
      </P>
    </>
  );
}
