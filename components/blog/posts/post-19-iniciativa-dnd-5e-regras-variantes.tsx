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

export default function BlogPost19() {
  return (
    <>
      <P>
        Iniciativa é a primeira coisa que acontece em todo combate de D&D 5e. E
        também é o momento mais chato. &quot;Quanto você tirou? 14. E você? 18.
        Peraí, o ranger tirou quanto? Deixa eu anotar...&quot; São 3 a 5 minutos
        que poderiam ser o primeiro golpe da batalha.
      </P>
      <P>
        Nesse guia, vou cobrir as regras oficiais, as variantes que a comunidade
        inventou, e como você elimina esse gargalo de vez.
      </P>

      <Img src="/art/blog/combat-setup.png" alt="Pocket DM — setup de combate com iniciativa e ordem de turnos" />

      <H2>Como funciona a iniciativa no D&D 5e?</H2>
      <P>
        As regras do Player&apos;s Handbook (PHB, capítulo 9) são simples:
      </P>
      <Ul>
        <Li>
          Todo mundo rola 1d20 e soma o modificador de Destreza. É um ability
          check normal.
        </Li>
        <Li>
          O mestre ordena do maior pro menor. Quem tirou mais alto age primeiro.
        </Li>
        <Li>
          Empate entre jogador e monstro? O mestre decide. Entre dois jogadores?
          Eles escolhem entre si.
        </Li>
        <Li>
          A ordem fica fixa o combate inteiro. Não muda entre rodadas.
        </Li>
      </Ul>
      <P>
        Tem features que mexem nisso: Barbarian com Feral Instinct tem vantagem
        na rolagem, Bard com Jack of All Trades soma metade da proficiência, e
        o feat Alert dá +5. Rogues, Rangers e Monks quase sempre agem cedo
        porque vivem de Destreza alta.
      </P>

      <Tip>
        Leve isso em conta na composição dos monstros. Criaturas lentas (Zombies,
        Golems) precisam de número pra compensar agir por último. Um Zombie
        sozinho contra um grupo com alta DEX nem chega a atacar.
      </Tip>

      <H2>Por que a iniciativa manual trava a mesa?</H2>
      <P>
        O sistema é elegante. O problema é juntar 5 jogadores falando números ao
        mesmo tempo enquanto você anota, ordena e confere se não esqueceu
        ninguém. Na prática:
      </P>
      <Ul>
        <Li>
          3 combates por sessão = 10 a 15 minutos só de setup de iniciativa. É
          quase uma cena inteira de roleplay jogada fora.
        </Li>
        <Li>
          Erros de ordenação. Você pula alguém, ou coloca na posição errada.
          Quando percebe no turno 3, a correção vira discussão.
        </Li>
        <Li>
          Enquanto você anota, os jogadores esperam. Celulares saem.
          Conversas paralelas começam. O clima da cena que levou ao combate
          evapora.
        </Li>
        <Li>
          6 goblins = rola 6 vezes ou usa grupo? Se rola 6, o setup dobra. Se
          agrupa, precisa anotar separado.
        </Li>
      </Ul>

      <SectionDivider src="/art/blog/treated-nobg/dnd-character-elf-fighter-wearing-heavy-armor-in-the-forest.png" alt="Elfa guerreira na floresta" />

      <H2>Quais as variantes de iniciativa?</H2>
      <P>
        A comunidade de D&D inventou uns sistemas alternativos ao longo dos anos.
        As 3 mais populares:
      </P>

      <H3>Popcorn Initiative</H3>
      <P>
        Quem agiu escolhe quem age em seguida. Pode ser aliado ou inimigo. A
        ordem muda toda rodada, o que cria uns momentos táticos legais
        (&quot;passo pro Cleric curar antes do dragão atacar&quot;). O problema
        é que grupos otimizados encadeiam turnos pra dominar. Funciona melhor em
        mesas narrativas com jogadores que não vão abusar.
      </P>

      <H3>Side Initiative</H3>
      <P>
        Cada lado rola 1d20 sem modificador. Quem tirar mais, age primeiro. Todo
        mundo do lado vencedor age na ordem que quiser. Ultra-rápido: 2 rolagens
        e acabou. O porém é que personagens com DEX alta (Rogues, Monks) perdem
        a vantagem que investiram. Ótimo pra encontros aleatórios e one-shots
        onde ninguém quer perder tempo.
      </P>

      <H3>Speed Factor Initiative (DMG)</H3>
      <P>
        Variante oficial do Dungeon Master&apos;s Guide. Todo turno, todo mundo
        rola iniciativa de novo, com modificadores baseados na ação escolhida.
        Armas pesadas penalizam, leves dão bônus. Realista? Sim. Praticável?
        Não. Multiplica o problema que tenta resolver. Pouquíssimos mestres usam
        mais de uma sessão.
      </P>

      <EbookCTA variant="inline" />

      <H2>Como automatizar a iniciativa com QR Code?</H2>
      <P>
        A melhor solução é tirar o gargalo do caminho. No{" "}
        <ProdLink href="/try">Pocket DM</ProdLink>, funciona assim:
      </P>
      <Ul>
        <Li>
          Você cria o encontro e adiciona os monstros do{" "}
          <ProdLink href="/monstros">compêndio</ProdLink>. HP e stats já vêm
          preenchidos.
        </Li>
        <Li>
          Manda o QR Code no grupo do WhatsApp ou Discord. Cada jogador escaneia
          e coloca a própria iniciativa pelo celular.
        </Li>
        <Li>
          A ordem aparece na tela de todo mundo automaticamente. Empates
          resolvidos. Zero anotação.
        </Li>
        <Li>
          Você clica &quot;Iniciar Combate&quot; e o primeiro turno começa. Setup
          inteiro em menos de 60 segundos.
        </Li>
      </Ul>
      <P>
        60 segundos vs 3 a 5 minutos. Em 3 combates por sessão, são quase 15
        minutos de roleplay que você recupera. Não é pouco.
      </P>

      <Img src="/art/blog/combat-hp-panel.png" alt="Pocket DM — combate em andamento com ordem de iniciativa e HP visível" />

      <H2>Dica anti-metagame: esconde a ordem na 1a rodada</H2>
      <P>
        Essa é uma técnica que eu uso sempre. Na primeira rodada, não mostra a
        ordem completa pros jogadores. Só mostra de quem é a vez agora e quem é
        o próximo. Por quê?
      </P>
      <P>
        Porque quando o Fighter vê que o mago inimigo age logo depois dele, ele
        se posiciona pra bloquear. Faz sentido tacticamente, mas o personagem
        não teria como saber disso. É metagame puro. A partir da rodada 2, a
        ordem já é conhecida (o combate &quot;revelou&quot; quem é mais rápido)
        e faz sentido mostrar.
      </P>

      <Tip>
        Essa regra de &quot;rodada 1 oculta&quot; funciona melhor em mesas que
        curtem imersão. Se sua mesa é mais tática e competitiva, mostra a ordem
        completa desde o início. Ambos são válidos.
      </Tip>

      <H2>Iniciativa em grupo: quando usar</H2>
      <P>
        6 goblins no mapa. Rola iniciativa 6 vezes? Não. Rola uma vez pro tipo
        de criatura e todos do mesmo tipo agem na mesma posição. 6 goblins = 1
        rolagem, todos agem juntos.
      </P>
      <P>
        Vantagem: menos rolagens, setup mais rápido. Desvantagem: 6 ataques
        seguidos do mesmo monstro pode ser longo. Pra resolver, rola todos os
        ataques de uma vez e aplica os danos simultaneamente.
      </P>

      <H2>Resumo: qual método usar?</H2>
      <Ul>
        <Li>
          RAW (1d20 + DEX): funciona pra qualquer mesa, mas é lento com muita
          criatura. Automatiza com um tracker.
        </Li>
        <Li>
          Popcorn: dinâmico e divertido, mas requer jogadores maduros. Ótimo pra
          mesas de roleplay.
        </Li>
        <Li>
          Side Initiative: ultra-rápido, mas penaliza builds de DEX alta. Bom
          pra encontros aleatórios.
        </Li>
        <Li>
          Speed Factor: realista mas impraticável. Experimenta uma vez por
          curiosidade e depois volta pro RAW.
        </Li>
        <Li>
          Automatizado (QR Code): o melhor dos mundos. Mantém a rolagem
          individual, elimina o setup manual e funciona com qualquer variante.
        </Li>
      </Ul>
      <P>
        O princípio é simples: iniciativa existe pra organizar o combate, não pra
        atrasar. Se o processo de determinar a ordem tá demorando mais que 60
        segundos, muda o método. Pra mais dicas, leia nosso{" "}
        <IntLink slug="como-agilizar-combate-dnd-5e">guia de 10 dicas pra agilizar combate</IntLink>{" "}
        e o{" "}
        <IntLink slug="7-erros-mestre-combate-dnd">artigo sobre os 7 erros mais comuns</IntLink>.
      </P>

      <EbookCTA variant="banner" />
    </>
  );
}
