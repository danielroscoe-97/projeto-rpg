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

export default function BlogPost2() {
  return (
    <>
      <P>
        Não precisa de 15 apps abertos pra rodar uma boa sessão de D&D. Na
        real, a maioria dos mestres que eu conheço sobrevive com 3-4 coisas.
        Mas se tivesse que escolher o kit perfeito? Cinco ferramentas. Com
        essas cinco, você cobre tudo que acontece entre o "rolem iniciativa"
        e o "a sessão acaba aqui".
      </P>

      <H2>1. Combat Tracker — o coração da mesa</H2>
      <P>
        Combate é o momento em que mais coisa acontece ao mesmo tempo. 6
        criaturas, cada uma com HP diferente, condições ativas, ataques
        multiaction, e você ali no meio tentando lembrar de quem é o turno.
        Um <ProdLink href="/try">combat tracker</ProdLink> tira todo esse
        peso das suas costas.
      </P>
      <P>
        O bom tracker adiciona monstros com um clique, rola iniciativa, mostra
        HP em barras coloridas e marca condições sem você precisar escrever
        nada. O Pocket DM faz tudo isso e ainda sincroniza no celular de cada
        jogador, então ninguém mais pergunta "de quem é o turno?"
      </P>

      <H2>2. Bestiário Digital — tchau, Monster Manual no colo</H2>
      <P>
        Nada mata mais o ritmo do que o mestre parando pra folhear 300 páginas
        do Monster Manual procurando o stat block do Ankheg. Bestiário digital
        com busca por nome, CR ou tipo de criatura resolve em 2 segundos.
      </P>
      <Img src="/art/blog/bestiary-index.png" alt="Bestiário do Pocket DM — monstros SRD + Monster a Day organizados por letra e CR" />
      <P>
        O conteúdo SRD (System Reference Document) do D&D 5e inclui centenas de
        monstros gratuitos. Ferramentas como o Pocket DM disponibilizam{" "}
        <ProdLink href="/monstros">mais de 1.200+ monstros SRD</ProdLink>, além
        de monstros do compêndio{" "}
        <ExtLink href="https://www.reddit.com/r/monsteraday/">Monster a Day</ExtLink>{" "}
        com stat blocks completos, todos pesquisáveis.
      </P>

      <H2>3. Catálogo de Magias — "o que essa spell faz mesmo?"</H2>
      <P>
        Se eu ganhasse 1 XP toda vez que um jogador pergunta "o que Counterspell
        faz mesmo?", já teria alcançado o nível épico. Um catálogo de magias com
        busca por nome, escola, nível e classe elimina aquela pausa constrangedora.
      </P>
      <Img src="/art/blog/spells-index.png" alt="Catálogo de magias SRD do Pocket DM — 750+ spells organizadas por nível e escola" />
      <P>
        O Pocket DM inclui o que chamamos de {"\u201C"}oráculo de magias{"\u201D"}: uma{" "}
        <ProdLink href="/magias">busca inteligente em mais de 900 magias SRD</ProdLink>,
        acessível durante o combate sem interromper o fluxo do jogo.
      </P>

      <SectionDivider src="/art/blog/treated-nobg/dnd-character-gnome-male-artificer-in-a-workshop.png" alt="Gnomo artificer na oficina" />

      <H2>4. Música Ambiente — a arma secreta que ninguém usa</H2>
      <P>
        Faz o teste: na próxima sessão, coloque uma trilha de taverna medieval
        quando o grupo entrar no bar. Não fale nada. Só observe. Pelo menos
        um jogador vai sorrir e entrar no clima instantaneamente. Uma taverna
        sem música de taverna é só uma sala com NPCs.
      </P>
      <P>
        Ter 3-4 presets prontos (taverna, dungeon, combate, épico) resolve
        90% das cenas. Troca rápida, sem perder o ritmo. O Pocket DM já vem
        com 12+ presets embutidos na interface de combate, sem precisar de
        app separado.
      </P>

      <H2>5. Dados Virtuais — backup, não substituto</H2>
      <P>
        Calma, ninguém tá falando pra abandonar os dados físicos. Mas quando
        o mago lança Fireball e você precisa rolar 8d6 pros 4 goblins que
        estavam na área... dados virtuais salvam 3 minutos de sua vida. No
        combat tracker, é um clique. No papel, é uma salada de dados
        espalhados pela mesa inteira.
      </P>

      <Tip linkHref="/try" linkText="Experimentar grátis">
        O Pocket DM integra todas essas 5 ferramentas em uma única interface
        gratuita. Bestiário, magias, música, dados e combat tracker, tudo no
        mesmo lugar.
      </Tip>

      <H2>E o que NÃO é essencial (mas é legal)</H2>
      <Ul>
        <Li>
          <strong>VTT completo (<ExtLink href="https://roll20.net">Roll20</ExtLink>, <ExtLink href="https://foundryvtt.com">Foundry</ExtLink>):</strong> ótimo para mesas
          online, mas overkill para presencial
        </Li>
        <Li>
          <strong>Gerador de mapas:</strong> útil para dungeon crawls, mas a
          maioria dos combates funciona com teatro da mente
        </Li>
        <Li>
          <strong>Ficha de personagem digital:</strong> legal, mas os jogadores
          geralmente preferem a própria ficha (física ou <ExtLink href="https://www.dndbeyond.com">D&D Beyond</ExtLink>)
        </Li>
        <Li>
          <strong>Gerador de NPCs/encontros com IA:</strong> promissor, mas
          ainda experimental
        </Li>
      </Ul>

      <CTA category="lista" />

      <H2>Menos é mais (de verdade)</H2>
      <P>
        Cinco ferramentas. Não dez, não quinze. O erro mais comum de mestre
        iniciante é achar que precisa de um cockpit inteiro pra rodar uma sessão.
        Não precisa. A ferramenta não pode ser mais complicada que o problema que
        ela resolve. Se ela te atrapalha mais do que ajuda, volta pro papel sem
        culpa. Quer testar tudo isso junto? Veja o{" "}
        <IntLink slug="como-usar-combat-tracker-dnd-5e">guia de combat tracker</IntLink>{" "}
        ou o{" "}
        <IntLink slug="como-usar-pocket-dm-tutorial">tutorial completo do Pocket DM</IntLink>.
      </P>
    </>
  );
}
