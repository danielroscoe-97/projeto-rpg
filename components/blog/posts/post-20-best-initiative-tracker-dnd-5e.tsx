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

export default function BlogPost20() {
  return (
    <>
      <P>
        Quem nunca perdeu 5 minutos anotando iniciativa no papel enquanto a mesa
        inteira ficava olhando pro celular? Você rola pra cada monstro, pede o
        número de cada jogador, anota tudo num caderno, ordena, confere se não
        esqueceu ninguém... e quando finalmente começa o combate, o clima
        daquela emboscada épica já evaporou. O problema não é a mecânica de
        iniciativa &mdash; é o processo manual. E é exatamente isso que um bom
        initiative tracker resolve.
      </P>

      <H2>O que é um initiative tracker?</H2>
      <P>
        Um initiative tracker é uma ferramenta &mdash; digital ou não &mdash;
        que organiza a ordem de turnos no combate de RPG. No D&amp;D 5e, todo
        mundo rola 1d20 + modificador de Destreza, e o mestre ordena do maior
        pro menor. Simples na teoria. Na prática, com 5 jogadores e 6 monstros,
        são 11 números pra anotar, ordenar e não errar.
      </P>
      <P>
        O papel do initiative tracker é eliminar esse trabalho braçal. Em vez de
        anotar no caderno, você joga os números numa ferramenta que ordena
        automaticamente, avança turnos com um clique e mostra pra todo mundo de
        quem é a vez. É a diferença entre 5 minutos de setup e 30 segundos.
      </P>

      <H2>Papel vs App: por que usar um rastreador de iniciativa digital</H2>
      <P>
        O método clássico funciona. Caderninho, post-its, clipes de roupa no
        escudo do mestre &mdash; todo DM veterano já usou alguma variação disso.
        Mas funcionar e funcionar bem são coisas diferentes. Vamos comparar:
      </P>
      <Ul>
        <Li>
          <strong>Velocidade</strong>: no papel, são 3 a 5 minutos por combate
          só de setup. Multiplica por 3 combates numa sessão e são 15 minutos
          jogados fora. Um rastreador de iniciativa digital faz isso em
          segundos.
        </Li>
        <Li>
          <strong>Erros</strong>: anotar errado, pular alguém, confundir a ordem
          no turno 4. No papel, toda correção vira discussão. No digital,
          a ordenação é automática e precisa.
        </Li>
        <Li>
          <strong>HP e condições</strong>: no papel, você precisa de uma coluna
          separada pra HP e outra pra condições. Fica apertado, fica confuso. Um
          initiative tracker 5e integra tudo na mesma interface.
        </Li>
        <Li>
          <strong>Visibilidade pros jogadores</strong>: no papel, só o mestre vê
          a ordem. &quot;De quem é a vez?&quot; é a pergunta mais repetida da
          sessão. Com um tracker digital, todo mundo vê no celular.
        </Li>
      </Ul>

      <Img src="/art/blog/initiative-setup.png" alt="Pocket DM — initiative tracker com ordem de turnos e iniciativa preenchida" />

      <H2>O que um bom initiative tracker precisa ter</H2>
      <P>
        Nem todo tracker é igual. Antes de escolher um, confere se ele tem o
        básico:
      </P>
      <Ul>
        <Li>
          <strong>Ordenação automática</strong>: você coloca os números, ele
          organiza. Empates resolvidos sem discussão.
        </Li>
        <Li>
          <strong>Rastreamento de HP</strong>: dano e cura aplicados direto no
          tracker, sem precisar de planilha separada.
        </Li>
        <Li>
          <strong>Condições visíveis</strong>: envenenado, atordoado,
          concentração &mdash; tudo marcado no token sem anotar em lugar nenhum.
        </Li>
        <Li>
          <strong>Avanço de turno com um clique</strong>: próximo turno, próxima
          rodada, contagem automática. Sem perder onde parou.
        </Li>
        <Li>
          <strong>Visão mobile pros jogadores</strong>: os jogadores veem a
          ordem e o turno atual no celular deles. Zero pergunta de &quot;de quem
          é a vez?&quot;.
        </Li>
        <Li>
          <strong>Sem cadastro obrigatório</strong>: o mestre cria o combate, os
          jogadores entram por link. Ninguém precisa criar conta pra participar.
        </Li>
      </Ul>
      <P>
        Se o tracker que você usa não tem pelo menos 4 desses 6 itens, você tá
        usando um tracker incompleto. E provavelmente voltando pro caderno
        porque &quot;dá no mesmo&quot;.
      </P>

      <H2>Como o Pocket DM resolve isso</H2>
      <P>
        O <ProdLink href="/try">Pocket DM</ProdLink> foi desenhado
        especificamente como um initiative tracker 5e pra mesas presenciais.
        Não é um VTT. Não é uma ficha online. É o que você abre no tablet ou
        notebook quando o combate começa. Cada ponto da checklist acima:
      </P>
      <Ul>
        <Li>
          <strong>Ordenação automática</strong>: jogadores colocam a iniciativa
          pelo celular via QR Code. A lista ordena sozinha em tempo real.
        </Li>
        <Li>
          <strong>HP integrado</strong>: monstros do compêndio SRD já vêm com
          HP preenchido. Aplica dano direto no painel, sem conta de cabeça.
        </Li>
        <Li>
          <strong>Condições no token</strong>: clica no token, marca a condição.
          Aparece visível pra você e pros jogadores.
        </Li>
        <Li>
          <strong>Turno com um clique</strong>: botão de &quot;Próximo&quot;
          avança pra próxima criatura. Contagem de rodadas automática.
        </Li>
        <Li>
          <strong>Player view em tempo real</strong>: cada jogador vê a ordem
          no celular. Ordem atualiza ao vivo conforme o combate avança.
        </Li>
        <Li>
          <strong>Zero cadastro</strong>: o mestre começa em 10 segundos sem
          criar conta. Jogadores entram escaneando o QR Code.
        </Li>
      </Ul>

      <Img src="/art/blog/initiative-tracker-final.png" alt="Pocket DM — initiative tracker ativo com HP, condições e ordem de turnos em tempo real" />

      <H2>Pocket DM vs outros initiative trackers</H2>
      <P>
        O mercado tem opções. Testamos as mais populares &mdash; Improved
        Initiative, Donjon, DM Tools, Shieldmaiden, e os VTTs &mdash; e a
        maioria foi feita pra outro contexto:
      </P>
      <Ul>
        <Li>
          <strong>Papel / clipes de roupa</strong>: funciona, mas é lento,
          propenso a erro e invisível pros jogadores. O rastreador de iniciativa
          mais antigo do mundo &mdash; e o mais limitado.
        </Li>
        <Li>
          <strong>Improved Initiative / Donjon</strong>: boas opções gratuitas
          no browser, mas sem player view no celular. O mestre vê a ordem, os
          jogadores não. E nenhum dos dois tem bestiário com stat blocks
          integrados.
        </Li>
        <Li>
          <strong>Roll20 / Foundry VTT</strong>: ótimos pra mesas online. Mas
          pra mesa presencial, ninguém quer abrir um VTT inteiro só pra
          rastrear iniciativa. É matar formiga com bazuca.
        </Li>
        <Li>
          <strong>D&amp;D Beyond</strong>: tem initiative tracker, mas exige que
          todo mundo tenha conta ($6/mês no Master Tier) e as fichas cadastradas
          na plataforma. Pra uma sessão com jogador novo, não rola.
        </Li>
        <Li>
          <strong>Pocket DM</strong>: grátis, sem conta, mobile-first, feito pra
          mesa presencial. Abre no browser, cria o combate, compartilha o link.
          1100+ monstros SRD com stat blocks integrados. É o best initiative
          tracker pra quem joga pessoalmente.
        </Li>
      </Ul>

      <Img src="/art/blog/initiative-tracker-active.png" alt="Condições D&D 5e no initiative tracker — envenenado, atordoado marcados no token do Goblin" />

      <H2>Como começar em 60 segundos</H2>
      <P>
        Três passos. Sem instalar nada, sem criar conta:
      </P>
      <Ul>
        <Li>
          <strong>1. Adicione os monstros</strong>: abra o{" "}
          <ProdLink href="/try">Pocket DM</ProdLink>, busque no compêndio ou
          adicione manualmente. HP e AC já vêm preenchidos.
        </Li>
        <Li>
          <strong>2. Role iniciativa</strong>: cada jogador escaneia o QR Code
          e coloca o próprio resultado pelo celular. A ordem aparece
          automaticamente na tela do mestre.
        </Li>
        <Li>
          <strong>3. Comece o combate</strong>: clique em &quot;Iniciar
          Combate&quot;. O initiative tracker avança turno por turno. Aplique
          dano, marque condições, avance rodadas &mdash; tudo no mesmo lugar.
        </Li>
      </Ul>
      <P>
        60 segundos do &quot;vamos rolar iniciativa&quot; até o primeiro ataque.
        É assim que um free initiative tracker deveria funcionar.
      </P>

      <Tip
        linkHref="/blog/iniciativa-dnd-5e-regras-variantes"
        linkText="Ler o guia completo de regras e variantes de iniciativa"
      >
        Quer entender as regras oficiais de iniciativa, variantes como Popcorn e
        Side Initiative, e quando usar cada uma? Leia nosso{" "}
        <IntLink slug="iniciativa-dnd-5e-regras-variantes">
          guia completo de regras e variantes de iniciativa
        </IntLink>.
      </Tip>

      <EbookCTA variant="banner" />

      <P>
        Pra mais dicas de combate, leia nosso{" "}
        <IntLink slug="como-agilizar-combate-dnd-5e">
          guia de 10 dicas pra agilizar combate no D&amp;D 5e
        </IntLink>{" "}
        e o{" "}
        <IntLink slug="como-usar-combat-tracker-dnd-5e">
          tutorial completo de como usar um combat tracker
        </IntLink>.
      </P>
    </>
  );
}
