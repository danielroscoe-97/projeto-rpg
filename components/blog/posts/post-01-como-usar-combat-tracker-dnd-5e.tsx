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

export default function BlogPost1() {
  return (
    <>
      <P>
        Seis criaturas na iniciativa, o Barbarian acabou de acertar um crítico
        no Goblin, peraí, era o Goblin 3 ou o 4? E aquele Hobgoblin tava
        envenenado ou era o Orc? Enquanto você folheia seus post-its, a mesa
        inteira tá no celular. Essa cena é a realidade de 90% dos mestres que
        ainda gerenciam combate no papel. Um{" "}
        <ProdLink href="/try">combat tracker</ProdLink> resolve isso em
        segundos.
      </P>

      <H2>Tá, mas o que é um Combat Tracker?</H2>
      <P>
        Pensa nele como o substituto digital daquele caderno amassado. Ele
        mantém a ordem de iniciativa, mostra de quem é o turno, rastreia HP
        com barras visuais e marca condições ativas (<em>envenenado</em>,{" "}
        <em>atordoado</em>, <em>agarrado</em>), tudo automático.
      </P>
      <P>
        Sim, existem VTTs como{" "}
        <ExtLink href="https://roll20.net">Roll20</ExtLink> e{" "}
        <ExtLink href="https://foundryvtt.com">Foundry</ExtLink> que fazem
        isso e muito mais. Mas se sua mesa é presencial, você não precisa de
        um cockpit de avião pra gerenciar 4 goblins. Precisa de algo que abra
        no celular e funcione em 30 segundos, sem forçar seus jogadores a
        criar conta em lugar nenhum.
      </P>

      <Img src="/art/blog/combat-active.png" alt="Pocket DM — Combate ativo com iniciativa, HP e condições em tempo real" />

      <H2>Os 5 pilares que seu tracker PRECISA cobrir</H2>
      <P>
        O{" "}
        <ExtLink href="https://slyflourish.com/tracking_combat.html">Sly Flourish</ExtLink>{" "}
        tem um guia clássico sobre isso, e a lista dele bate com tudo que já
        vi dar errado em mesa presencial:
      </P>
      <Ul>
        <Li>
          <strong>Iniciativa:</strong> quem age primeiro, quem age depois.
          A ordem de turnos é a espinha dorsal do combate.
        </Li>
        <Li>
          <strong>Dano e HP:</strong> quanto de vida cada criatura tem e quanto
          já levou de dano. Sem isso, você não sabe quando o monstro morre.
        </Li>
        <Li>
          <strong>Condições:</strong> efeitos como <em>blinded</em>,{" "}
          <em>stunned</em>, <em>prone</em>. Esquecer uma condição ativa pode
          mudar completamente o rumo do combate. Veja nosso{" "}
          <IntLink slug="guia-condicoes-dnd-5e">guia completo de condições D&D 5e</IntLink>.
        </Li>
        <Li>
          <strong>Posicionamento:</strong> onde cada criatura está em relação
          às outras. Importante para ataques de oportunidade e áreas de efeito.
        </Li>
        <Li>
          <strong>Stat blocks:</strong> o que cada monstro pode fazer no turno
          dele. Ataques, habilidades, CA e salvaguardas.
        </Li>
      </Ul>

      <H2>Do zero ao combate em 5 minutos</H2>
      <H3>1. Antes da sessão: monte o encontro</H3>
      <P>
        Jogue os monstros no tracker antes da sessão. Um tracker decente já tem
        bestiário embutido: busca por nome, clica, pronto. No Pocket DM são{" "}
        <ProdLink href="/monstros">mais de 1.200 criaturas</ProdLink> do{" "}
        <ExtLink href="https://5e.d20srd.org/">SRD</ExtLink> + a coleção
        inteira do{" "}
        <ExtLink href="https://www.reddit.com/r/monsteraday/">r/monsteraday</ExtLink>.
        Dois cliques e o encontro tá montado.
      </P>
      <Img src="/art/blog/monster-search.png" alt="Busca de monstros SRD no Pocket DM — pesquise e adicione com um clique" />

      <H3>2. Na hora do combate: role iniciativa</H3>
      <P>
        Jogadores rolam o d20, te passam o número, e você digita. O tracker
        ordena tudo sozinho. Monstros? Rola automático ou usa o valor médio
        do stat block, sua escolha.
      </P>

      <H3>3. Durante o combate: só jogue</H3>
      <P>
        Avance turno por turno. Jogador acertou o ogre? Clica no HP, digita o
        dano, a barra desce. Monstro aplicou uma condição? Marca ali mesmo.
        Acabou aquela dança de "peraí, quanto de HP o monstro 2 tinha mesmo?"
      </P>
      <Img src="/art/blog/combat-hp-panel.png" alt="Painel de HP no Pocket DM — aplique dano, cure ou adicione HP temporário" />

      <H3>4. Jogadores acompanham no celular</H3>
      <P>
        Essa é a parte que vende qualquer jogador cético: eles abrem um link
        no celular e veem tudo em tempo real. De quem é o turno, quanto de HP
        cada um tem, quais condições estão rolando. Sem instalar nada.
      </P>

      <Tip>
        No Pocket DM, o mestre compartilha um link e os jogadores entram
        na hora. Sem cadastro, sem app. O bardo preguiçoso que nunca baixa
        nada consegue entrar em 3 segundos.
      </Tip>

      <H2>O caderno amassado vs o digital</H2>
      <P>
        Anotar iniciativa em papel e notecards funciona? Funciona. Até a
        terceira rodada, quando metade dos post-its já caiu no chão e você
        tem 4 rasuras em cima do HP do mesmo goblin. Os problemas clássicos:
      </P>
      <Ul>
        <Li>Esqueceu que o Fighter tava envenenado há 3 rodadas</Li>
        <Li>HP virou uma sopa de rasuras ilegíveis</Li>
        <Li>Jogadores perguntando "de quem é o turno?" a cada 30 segundos</Li>
        <Li>Setup de 15 minutos pra um encontro que dura 10</Li>
      </Ul>
      <P>
        Um tracker digital elimina tudo isso. E se for gratuito como o{" "}
        <ProdLink href="/try">Pocket DM</ProdLink>? Não tem argumento contra.
      </P>

      <CTA category="tutorial" />

      <H2>Então vale a pena?</H2>
      <P>
        Se você mestra presencialmente e ainda gerencia combate no papel, um
        tracker é o maior upgrade que existe. Não porque seja tecnologia
        revolucionária, porque elimina exatamente as partes chatas que
        fazem combate arrastar. O resto continua sendo você, seus jogadores e
        a história. Só que agora sem rasura. Se quiser ir além, dê uma olhada
        nas{" "}
        <IntLink slug="como-agilizar-combate-dnd-5e">10 dicas pra acelerar combate</IntLink>{" "}
        e nas{" "}
        <IntLink slug="ferramentas-essenciais-mestre-dnd-5e">5 ferramentas que todo mestre deveria ter</IntLink>.
      </P>

      <EbookCTA variant="inline" />
    </>
  );
}
