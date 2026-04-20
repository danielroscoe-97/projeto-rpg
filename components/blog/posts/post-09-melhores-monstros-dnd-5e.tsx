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

export default function BlogPost9() {
  return (
    <>
      <P>
        O SRD tem 400+ monstros. Suplementos oficiais passam de mil. E quando
        chega a hora de montar o encontro de sábado, você abre o bestiário e
        congela. Pra onde olhar primeiro?
      </P>
      <P>
        Essa lista não é sobre os monstros mais fortes. É sobre os mais{" "}
        <em>versáteis</em>: criaturas que funcionam em múltiplos contextos,
        geram as melhores histórias e ensinam coisas sobre combate que nenhum
        tutorial explica. Do nível 1 ao 20. Se você dominar esses 10, vai
        rodar mesas melhores pelo resto da vida.
      </P>
      <P>
        Pra cada monstro: por que ele é especial, uma dica tática roubada de{" "}
        <ExtLink href="https://www.themonstersknow.com/">The Monsters Know What They{"'"}re Doing</ExtLink>{" "}
        e{" "}
        <ExtLink href="https://slyflourish.com/making_monsters_interesting.html">Sly Flourish</ExtLink>,
        e um link direto para a ficha no nosso compêndio gratuito.
      </P>

      {/* ── 1. GOBLIN ─────────────────────────────────────────────── */}
      <H2>1. Goblin — O Clássico Versátil</H2>
      <P>
        Se existe um monstro que todo mestre deveria dominar, é o Goblin. Com
        CR 1/4, ele parece inofensivo no papel: 7 pontos de vida, um
        arco curto e uma cimitarra. Mas subestimar goblins é exatamente o erro
        que eles exploram. A habilidade <strong>Nimble Escape</strong> permite
        que o goblin realize a ação Esconder ou Desengajar como ação bônus,
        transformando uma criatura frágil em um pesadelo tático.
      </P>
      <H3>Por que é indispensável</H3>
      <Ul>
        <Li>Funciona em qualquer nível: bandidos de estrada no nível 1, tropas de um hobgoblin warlord no nível 8</Li>
        <Li>Ensina novos jogadores sobre ação bônus, cobertura e vantagem/desvantagem</Li>
        <Li>Em grupo, goblins com arcos a 80 pés de distância são surpreendentemente letais</Li>
        <Li>Perfeito para emboscadas: a habilidade Stealth (+6) é melhor que a de muitos personagens</Li>
      </Ul>
      <Tip>
        Como{" "}
        <ExtLink href="https://www.themonstersknow.com/goblin-tactics/">Keith Ammann explica</ExtLink>,
        goblins nunca lutam em campo aberto. Eles atacam de posições
        elevadas, usam Nimble Escape para se esconder após cada tiro e
        fogem quando perdem vantagem numérica. Rode goblins assim e seus
        jogadores nunca mais vão dizer que {"\u201C"}goblin é mob de tutorial{"\u201D"}.
      </Tip>
      <P>
        Veja a ficha completa:{" "}
        <ProdLink href="/monstros/goblin">Goblin no Compêndio</ProdLink>.
      </P>

      {/* ── 2. DIRE WOLF ──────────────────────────────────────────── */}
      <H2>2. Dire Wolf — O Predador dos Primeiros Níveis</H2>
      <P>
        O Dire Wolf (Lobo Terrível) é possivelmente o melhor monstro de CR 1
        do jogo. Com 37 pontos de vida, um ataque de mordida que causa 2d6+3
        de dano e derruba o alvo se ele falhar em um teste de Força, uma
        matilha de lobos terríveis é um encontro que nenhum grupo de nível 1-3
        vai esquecer. A habilidade <strong>Pack Tactics</strong> (vantagem no
        ataque quando um aliado está adjacente ao alvo) torna cada mordida
        mais perigosa.
      </P>
      <H3>Quando usar</H3>
      <Ul>
        <Li>Viagens por floresta ou tundra, perfeito para encontros aleatórios com peso narrativo</Li>
        <Li>Montaria de orcs, goblins ou druidas corrompidos</Li>
        <Li>Caçada reversa: os jogadores são a presa, não os predadores</Li>
        <Li>Introdução natural ao conceito de Pack Tactics para novos jogadores</Li>
      </Ul>
      <Tip>
        Lobos terríveis caçam em matilha e tentam separar o grupo. Faça
        dois lobos focarem no mesmo alvo para derrubar, enquanto o terceiro
        circunda o mago na retaguarda. Se um lobo derruba alguém, os
        outros ganham vantagem automática contra o alvo caído. É
        brutal e realista.
      </Tip>
      <P>
        Veja a ficha completa:{" "}
        <ProdLink href="/monstros/lobo-terrivel">Dire Wolf no Compêndio</ProdLink>.
      </P>

      {/* ── 3. OWLBEAR ────────────────────────────────────────────── */}
      <H2>3. Owlbear — O Terror Icônico</H2>
      <P>
        Poucos monstros são tão <em>D&D</em> quanto o Owlbear (Urso-coruja).
        Ele não existe em nenhuma mitologia, é uma criação original do
        jogo, provavelmente inspirada em brinquedos de plástico dos anos 70. E
        é exatamente isso que o torna especial. Com CR 3, 59 HP e um
        multiattack de garra+bico que pode causar até 24 de dano em um turno,
        o Owlbear é a introdução perfeita ao conceito de {"\u201C"}monstro que não
        negocia{"\u201D"}.
      </P>
      <H3>Por que funciona tão bem</H3>
      <Ul>
        <Li>É puro instinto: sem magias, sem habilidades especiais, sem planos, só fúria</Li>
        <Li>Excelente para forçar decisões: lutar, fugir ou tentar acalmar a fera?</Li>
        <Li>A descrição visual é inesquecível: cabeça de coruja no corpo de urso</Li>
        <Li>Funciona como encontro aleatório, guardião de covil ou {"\u201C"}o que acordou na caverna{"\u201D"}</Li>
      </Ul>
      <Tip>
        O Owlbear é territorial, não malvado. Ele ataca quem entra no seu
        território e persegue até perder interesse ou ficar gravemente ferido.{" "}
        <ExtLink href="https://www.themonstersknow.com/owlbear-tactics/">Segundo a análise do The Monsters Know</ExtLink>,
        o Owlbear vai correr atrás do alvo mais próximo até derrubá-lo,
        depois pular pro seguinte. Faça ele ignorar o
        tanque que bloqueia o caminho e correr direto pro bardo que
        tropeçou nos arbustos.
      </Tip>
      <P>
        Veja a ficha completa:{" "}
        <ProdLink href="/monstros/urso-coruja">Owlbear no Compêndio</ProdLink>.
      </P>

      {/* ── 4. MIMIC ──────────────────────────────────────────────── */}
      <H2>4. Mimic — O Combustível de Paranoia</H2>
      <P>
        O Mimic é um dos monstros mais elegantes do D&D. Com CR 2, ele se
        disfarça como um objeto mundano: um baú, uma porta, uma
        estante. E ataca quando alguém toca nele. Sua existência muda
        fundamentalmente o comportamento dos jogadores: depois do primeiro
        encontro com um Mimic, <em>todo</em> baú se torna suspeito. E isso,
        como mestre, é ouro puro.
      </P>
      <H3>O impacto real do Mimic</H3>
      <Ul>
        <Li>Cria tensão em ambientes de exploração sem precisar de combate constante</Li>
        <Li>Ensina jogadores a investigar antes de agir, hábito que melhora toda a campanha</Li>
        <Li>O efeito Adhesive gruda o alvo ao Mimic, criando pânico imediato</Li>
        <Li>Versatilidade de forma: pode ser qualquer objeto, em qualquer dungeon</Li>
      </Ul>
      <Tip>
        O segredo do Mimic é o setup. Descreva três baús normais com
        tesouro real nas sessões anteriores. Na quarta vez, quando o
        jogador disser {"\u201C"}abro o baú{"\u201D"} sem pensar duas vezes, revele
        que o baú morde de volta. O Mimic funciona como predador emboscador:
        ele ataca o primeiro alvo e se agarra. Se o grupo todo
        reagir, ele larga e foge (Mimics são mais espertos do que parecem).
      </Tip>
      <P>
        Veja a ficha completa:{" "}
        <ProdLink href="/monstros/mimico">Mimic no Compêndio</ProdLink>.
      </P>

      {/* ── 5. BASILISK ───────────────────────────────────────────── */}
      <H2>5. Basilisk — A Petrificação Dramática</H2>
      <P>
        Existe algo especialmente visceral na petrificação. Diferente de dano
        de HP que se cura com uma poção, virar pedra é <em>permanente</em> sem
        a magia certa. O Basilisk (CR 3) entrega exatamente essa ameaça: seu
        olhar petrificante força um teste de resistência de Constituição CD 12,
        e falhar em dois turnos seguidos significa estátua. Não é letal no
        sentido tradicional, mas é pior.
      </P>
      <H3>Quando brilha</H3>
      <Ul>
        <Li>Cavernas e ruínas subterrâneas com estátuas {"\u201C"}decorativas{"\u201D"} que são aventureiros anteriores</Li>
        <Li>Como guardião de tesouros: alguém colocou esse basilisco ali de propósito</Li>
        <Li>Ensina jogadores sobre condições além de dano: desviar o olhar, espelhos, estratégia</Li>
        <Li>Funciona como puzzle de combate: como derrotar algo que você não pode olhar?</Li>
      </Ul>
      <Tip>
        A mecânica de desviar o olhar é central. O jogador pode escolher
        não olhar para o Basilisk (evitando o olhar petrificante), mas
        ataques contra ele terão desvantagem. Isso cria uma escolha
        tática genuína em cada turno. Coloque espelhos quebrados na sala
        como pista, e recompense jogadores criativos que tentarem
        refletir o olhar.
      </Tip>
      <P>
        Veja a ficha completa:{" "}
        <ProdLink href="/monstros/basilisco">Basilisk no Compêndio</ProdLink>.
      </P>

      {/* ── 6. MANTICORE ──────────────────────────────────────────── */}
      <H2>6. Manticore — O Combo Corpo a Corpo + Longo Alcance</H2>
      <P>
        A Manticora é um dos monstros mais subestimados de CR 3. Ela voa, atira
        espinhos da cauda a 100/200 pés de distância e, quando chega perto,
        tem um multiattack de mordida+garras que causa dano sólido. A combinação
        de mobilidade aérea com ataque ranged e melee a torna um dos inimigos
        mais frustrantes para grupos que dependem de combate corpo a corpo.
      </P>
      <H3>O que a torna especial</H3>
      <Ul>
        <Li>Voo + ataque ranged: ela não precisa pousar se não quiser</Li>
        <Li>24 espinhos na cauda, recarregando entre descansos; munição finita cria urgência</Li>
        <Li>Pode negociar: Manticoras são inteligentes o suficiente para exigir tributo em vez de lutar</Li>
        <Li>Perfeita para encontros em áreas abertas, desfiladeiros e montanhas</Li>
      </Ul>
      <Tip>
        <ExtLink href="https://www.themonstersknow.com/manticore-tactics/">Segundo o The Monsters Know</ExtLink>,
        a Manticora começa o combate com uma salva de espinhos da cauda e
        só pousa quando os espinhos acabam (ou quando o grupo fica
        vulnerável o bastante). Use-a em campo aberto, voando a 60 pés
        de altura, e force os jogadores a pensar em soluções além de
        {"\u201C"}corro e bato{"\u201D"}. Magos com alcance longo viram MVPs nesse encontro.
      </Tip>
      <P>
        Veja a ficha completa:{" "}
        <ProdLink href="/monstros/manticora">Manticore no Compêndio</ProdLink>.
      </P>

      {/* ── 7. YOUNG GREEN DRAGON ─────────────────────────────────── */}
      <H2>7. Young Green Dragon — O Dragão Político</H2>
      <P>
        Todos os dragões são ameaças formidáveis, mas o Green Dragon
        (Dragão Verde) é especial porque sua arma mais perigosa não é o
        sopro venenoso, mas sim a mente. Dragões verdes são manipuladores,
        mentirosos e pacientes. O Young Green Dragon (CR 8) é forte o
        suficiente para ser um vilão de arco inteiro, mas inteligente o
        suficiente para nunca precisar lutar.
      </P>
      <H3>Por que o dragão verde é o melhor primeiro dragão</H3>
      <Ul>
        <Li>CR 8 é acessível para grupos de nível 5-7, o sweet spot de muitas campanhas</Li>
        <Li>Sopro venenoso em cone de 30 pés: 12d6 de dano, devastador em áreas fechadas</Li>
        <Li>Anfíbio e pode respirar embaixo d{"'"}água, com táticas de fuga inesperadas</Li>
        <Li>Pode ser patrono, informante, chantagista ou vilão; raramente {"\u201C"}só um monstro{"\u201D"}</Li>
      </Ul>
      <Tip>
        O Young Green Dragon não ataca um grupo que pode derrotá-lo.{" "}
        <ExtLink href="https://www.themonstersknow.com/dragon-tactics-part-1/">A análise de Keith Ammann</ExtLink>{" "}
        mostra que dragões jovens recuam quando enfrentam três ou mais
        combatentes corpo a corpo. Se estiver perdendo, o dragão verde
        tenta negociar: oferece informações, propõe alianças, mente
        descaradamente. Faça o grupo <em>querer</em> confiar nele. Depois,
        quebre essa confiança.
      </Tip>
      <P>
        Veja a ficha completa:{" "}
        <ProdLink href="/monstros/dragao-verde-jovem">Young Green Dragon no Compêndio</ProdLink>.
      </P>

      {/* ── 8. MIND FLAYER ────────────────────────────────────────── */}
      <SectionDivider src="/art/blog/treated-nobg/mythjourneys-anubis-god-of-the-dead.png" alt="Anubis, deus dos mortos" />

      <H2>8. Mind Flayer — Horror e Psionismo</H2>
      <P>
        Poucos monstros geram tanto medo em jogadores experientes quanto o
        Mind Flayer (Devorador de Mentes). CR 7 não parece muito no papel, mas
        o Mind Blast, um cone de 60 pés que causa 4d8+4 de dano psíquico
        e atordoa quem falhar no teste, podendo acabar com um encontro em
        um único turno. Jogadores atordoados não agem, não reagem e falham
        automaticamente em testes de Força e Destreza. Enquanto isso, o Mind
        Flayer caminha até alguém e tenta extrair o cérebro.
      </P>
      <H3>O que faz dele inesquecível</H3>
      <Ul>
        <Li>O Mind Blast atordoa múltiplos alvos: o grande equalizador contra grupos poderosos</Li>
        <Li>Extract Brain mata instantaneamente criaturas incapacitadas: morte permanente, sem death saves</Li>
        <Li>Altamente inteligente: planeja, recua, usa lacaios e nunca luta em condições desfavoráveis</Li>
        <Li>Perfeito para arcos de horror, conspirações subterrâneas e momentos de desespero</Li>
      </Ul>
      <Tip>
        <ExtLink href="https://www.themonstersknow.com/mind-flayer-tactics/">O The Monsters Know</ExtLink>{" "}
        enfatiza que Mind Flayers nunca lutam sozinhos e nunca lutam em
        termos iguais. Coloque-os com lacaios (grimlocks, intellect devourers)
        que servem de escudo e distração. O Mind Flayer abre com Mind Blast,
        se teletransporta via Plane Shift se as coisas ficam feias, e volta
        mais preparado. A sensação de {"\u201C"}ele escapou{"\u201D"} é mais aterrorizante
        do que qualquer derrota.
      </Tip>

      {/* ── 9. BEHOLDER ───────────────────────────────────────────── */}
      <H2>9. Beholder — O BBEG Icônico</H2>
      <P>
        O Beholder é, para muitos, <em>o</em> monstro de D&D. Uma esfera
        flutuante com um olho central gigante e dez pedúnculos oculares, cada
        um disparando um raio diferente: desintegração, petrificação,
        charme, medo, telecinesia, entre outros. Com CR 13, é um boss fight
        de campanha inteira. E o mais impressionante: sua habilidade
        Antimagic Cone anula toda magia num cone de 150 pés na direção que
        ele olha, forçando casters a repensar suas estratégias.
      </P>
      <H3>Por que é o boss definitivo</H3>
      <Ul>
        <Li>10 raios oculares com efeitos diferentes, cada turno é imprevisível</Li>
        <Li>Antimagic Cone desliga magias, itens mágicos e concentração: terrível para casters</Li>
        <Li>Lair Actions tornam o covil tão perigoso quanto a criatura: limo no chão, tentáculos nas paredes</Li>
        <Li>Paranoico e megalomaníaco, o roleplay de um Beholder escreve a aventura sozinho</Li>
      </Ul>
      <Tip>
        <ExtLink href="https://www.themonstersknow.com/beholder-tactics/">Segundo a análise do The Monsters Know</ExtLink>,
        Beholders são agressivos e antissociais, e atacam invasores
        imediatamente. O Beholder aponta o Antimagic Cone para onde estão
        os casters e usa os raios dos pedúnculos contra os marciais. Rode
        o covil com as Lair Actions: chão escorregadio, olhos nas paredes,
        apêndices que agarram. O grupo precisa se dividir para vencer,
        e dividir o grupo contra um Beholder é aterrorizante.
      </Tip>

      {/* ── 10. LICH ──────────────────────────────────────────────── */}
      <H2>10. Lich — O Vilão Definitivo</H2>
      <P>
        Se o Beholder é o boss de uma dungeon, o Lich é o vilão de uma
        campanha inteira. Um mago que transcendeu a morte através de um
        phylactery, o Lich (CR 21) tem acesso a magias de até 9º nível,
        Legendary Resistance (3/dia), Legendary Actions e um covil com
        efeitos devastadores. Derrotá-lo em combate é apenas metade da
        batalha. Se o phylactery não for destruído, ele retorna em
        1d10 dias com HP completo.
      </P>
      <H3>O que torna o Lich inigualável</H3>
      <Ul>
        <Li>Spellcasting de 18º nível: Power Word Kill, Disintegrate, Globe of Invulnerability</Li>
        <Li>Legendary Resistance garante que ele não morra para um único Banishment bem sucedido</Li>
        <Li>O phylactery cria uma quest dentro da quest: encontrá-lo e destruí-lo é uma aventura à parte</Li>
        <Li>Lair Actions que drenam vida, invocam espíritos e conectam-se telepaticamente a intrusos</Li>
        <Li>Funciona como BBEG de campanha, patrono traiçoeiro ou ameaça ancestral adormecida</Li>
      </Ul>
      <Tip>
        <ExtLink href="https://www.themonstersknow.com/undead-tactics-liches/">Keith Ammann argumenta</ExtLink>{" "}
        que um Lich nunca sai do seu covil a menos que seja absolutamente
        necessário. Toda interação com os jogadores acontece através de
        lacaios, ilusões e manipulação política. Quando o grupo finalmente
        chega ao covil, o Lich já sabe tudo sobre eles. Rode o Lich como
        alguém que teve <em>séculos</em> para se preparar, porque teve.
        Ele sabe as magias do mago, as fraquezas do paladino e a
        identidade do assassino disfarçado.
      </Tip>
      <P>
        Veja a ficha completa:{" "}
        <ProdLink href="/monstros/lich">Lich no Compêndio</ProdLink>.
      </P>

      {/* ── CONCLUSÃO & DICAS GERAIS ──────────────────────────────── */}
      <H2>Ter a lista é fácil. Usar bem é outra história.</H2>
      <P>
        Saber quais monstros usar é metade. A outra metade é rodar eles de um
        jeito que os jogadores lembrem semanas depois.
      </P>
      <H3>Leia a motivação, não só o stat block</H3>
      <P>
        Um Goblin que foge é mais interessante que um Goblin que morre de pé.
        Uma Manticora que exige tributo é mais memorável que uma que ataca
        cegamente. Antes de rodar o monstro, pergunte: o que essa criatura{" "}
        <em>quer</em>? A resposta muda tudo. Referências como{" "}
        <ExtLink href="https://slyflourish.com/choosing_monsters.html">Sly Flourish</ExtLink>{" "}
        recomendam escolher monstros pela história, não pelo CR.
      </P>
      <H3>Varie os tipos de ameaça</H3>
      <P>
        Essa lista cobre propositalmente diferentes tipos de desafio:
        combate tático (Goblin, Manticore), horror (Mind Flayer, Basilisk),
        roleplay (Young Green Dragon, Lich), pânico instantâneo (Owlbear,
        Dire Wolf) e paranoia ambiental (Mimic, Beholder). Alterne entre
        eles para manter seus jogadores alertas.
      </P>
      <H3>Use um combat tracker para monstros complexos</H3>
      <P>
        Monstros como o Beholder (10 raios + lair actions) e o Lich
        (spellcasting de 18º nível + legendary actions) exigem que o mestre
        gerencie muita informação simultânea. Um combat tracker digital
        mantém HP, condições, ordem de iniciativa e stat blocks organizados,
        para que você possa focar na narrativa em vez de consultar tabelas.
      </P>

      <CTA category="lista" />

      <H2>Referências e Leitura Adicional</H2>
      <Ul>
        <Li>
          <ExtLink href="https://www.themonstersknow.com/">The Monsters Know What They{"'"}re Doing</ExtLink>{" "}
          — análises táticas detalhadas para centenas de monstros do D&D 5e
        </Li>
        <Li>
          <ExtLink href="https://slyflourish.com/making_monsters_interesting.html">Making Monsters Interesting (Sly Flourish)</ExtLink>{" "}
          — como customizar e dar personalidade a qualquer monstro
        </Li>
        <Li>
          <ExtLink href="https://slyflourish.com/choosing_monsters.html">Choosing Monsters for Your Game (Sly Flourish)</ExtLink>{" "}
          — filosofia de seleção de monstros baseada na história
        </Li>
      </Ul>
      <P>
        Todos os monstros desta lista estão disponíveis gratuitamente no{" "}
        <ProdLink href="/monstros">compêndio de monstros do Pocket DM</ProdLink>, com stat
        blocks completos em português. Quer testá-los em combate? Use o{" "}
        <ProdLink href="/try">combat tracker gratuito</ProdLink> ou veja nosso{" "}
        <IntLink slug="como-montar-encontro-balanceado-dnd-5e">guia de encontros balanceados</IntLink>{" "}
        e o{" "}
        <IntLink slug="guia-challenge-rating-dnd-5e">guia de Challenge Rating</IntLink>.
        Boas sessões começam com bons monstros, e agora você tem dez dos
        melhores no seu arsenal.
      </P>

      <CTA category="lista" />
    </>
  );
}
