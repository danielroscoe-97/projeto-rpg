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

export default function BlogPost12() {
  return (
    <>
      <P>
        "A gente joga com mapa ou sem mapa?" Essa discussão surge em toda
        mesa nova. Tem gente que jura que grid é essencial, tem gente que
        nunca usou uma miniatura na vida e roda sessões incríveis só na
        narração. A verdade? Depende da mesa, do combate e do quanto você
        quer preparar. Vamos comparar os dois, mais uma terceira opção que
        pouca gente conhece.
      </P>
      <P>
        E o melhor: o{" "}
        <ProdLink href="/try">Pocket DM</ProdLink>{" "}
        funciona perfeitamente com qualquer estilo de combate. Ele rastreia
        iniciativa, HP e condições independente de como você representa o campo
        de batalha.
      </P>

      <H2>Teatro da Mente: tudo na imaginação</H2>
      <P>
        No teatro da mente (<em>Theater of the Mind</em>, ou TotM), o combate
        acontece inteiramente na imaginação dos jogadores e do mestre. Não há
        mapa, grid ou miniaturas, o mestre descreve o ambiente verbalmente e os
        jogadores declaram suas ações com base nessa descrição. O posicionamento
        é abstrato: {'"'}você está perto do ogro{'"'}, {'"'}o arqueiro está do
        outro lado da sala{'"'}, {'"'}há aproximadamente 30 pés entre
        vocês{'"'}.
      </P>
      <P>
        Como{" "}
        <ExtLink href="https://slyflourish.com/guide_to_narrative_combat.html">
          Sly Flourish descreve em seu guia de combate narrativo
        </ExtLink>, o TotM coloca a narrativa no centro. A pergunta não é
        {'"'}quantos quadrados eu posso me mover?{'"'} mas sim {'"'}o que meu
        personagem faz?{'"'}. Isso naturalmente encoraja descrições mais
        criativas e imersivas. O jogador não diz {'"'}movo 6 quadrados para a
        esquerda{'"'} — ele diz {'"'}corro para trás da coluna, usando-a como
        cobertura{'"'}.
      </P>
      <P>
        No TotM, o mestre é o árbitro final de distâncias e posicionamento. Isso
        dá grande flexibilidade narrativa, mas também exige que o mestre seja
        consistente e justo em suas decisões. Uma boa prática é declarar
        distâncias aproximadas no início do encontro: {'"'}os goblins estão a
        uns 60 pés na beira da floresta{'"'}.
      </P>

      <H2>Grid: tudo no mapa</H2>
      <P>
        No combate com grid, a batalha acontece sobre um mapa quadriculado (ou
        hexagonal) onde cada quadrado representa 5 pés. Os personagens e monstros
        são representados por miniaturas, tokens ou até mesmo dados e moedas. O
        posicionamento é preciso: cada criatura ocupa um espaço específico no
        mapa, e movimentação segue as regras de distância do jogo.
      </P>
      <P>
        O grid é o formato padrão que a maioria dos jogadores de D&D associa ao
        combate. Os mapas podem ser desenhados à mão em papel quadriculado,
        impressos, projetados em uma TV horizontal ou exibidos em um Virtual
        Tabletop (VTT). Miniaturas podem variar de simples tokens de papel até
        figuras pintadas detalhadas.
      </P>
      <P>
        Regras como ataques de oportunidade, cobertura, áreas de efeito e
        terreno difícil funcionam de forma muito precisa com grid. Não há
        ambiguidade sobre quem está dentro do raio de uma{" "}
        <em>Fireball</em> ou quem tem cobertura parcial.
      </P>

      <H2>Lado a lado</H2>
      <div className="overflow-x-auto my-8 rounded-xl border border-white/[0.08]">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.02]">
              <th className="py-2.5 px-4 text-foreground/60 font-medium">Aspecto</th>
              <th className="py-2.5 px-4 text-foreground/60 font-medium">Teatro da Mente</th>
              <th className="py-2.5 px-4 text-foreground/60 font-medium">Grid</th>
            </tr>
          </thead>
          <tbody className="text-foreground/75">
            <tr className="border-b border-white/[0.05]">
              <td className="py-2 px-4 font-medium text-foreground/90">Preparação</td>
              <td className="py-2 px-4">Zero (é só começar)</td>
              <td className="py-2 px-4">Requer mapa, tokens, setup</td>
            </tr>
            <tr className="border-b border-white/[0.05]">
              <td className="py-2 px-4 font-medium text-foreground/90">Velocidade</td>
              <td className="py-2 px-4">Turnos rápidos, menos contagem</td>
              <td className="py-2 px-4">Turnos mais lentos, mais preciso</td>
            </tr>
            <tr className="border-b border-white/[0.05]">
              <td className="py-2 px-4 font-medium text-foreground/90">Imersão</td>
              <td className="py-2 px-4">Alta (narrativa contínua)</td>
              <td className="py-2 px-4">Visual (mapa cria cenário)</td>
            </tr>
            <tr className="border-b border-white/[0.05]">
              <td className="py-2 px-4 font-medium text-foreground/90">Clareza tática</td>
              <td className="py-2 px-4">Ambígua (depende do mestre)</td>
              <td className="py-2 px-4">Exata (posições definidas)</td>
            </tr>
            <tr className="border-b border-white/[0.05]">
              <td className="py-2 px-4 font-medium text-foreground/90">Áreas de efeito</td>
              <td className="py-2 px-4">Estimativa do mestre</td>
              <td className="py-2 px-4">Precisa (contar quadrados)</td>
            </tr>
            <tr className="border-b border-white/[0.05]">
              <td className="py-2 px-4 font-medium text-foreground/90">Custo</td>
              <td className="py-2 px-4">R$ 0</td>
              <td className="py-2 px-4">Variável (papel a miniaturas)</td>
            </tr>
            <tr className="border-b border-white/[0.05]">
              <td className="py-2 px-4 font-medium text-foreground/90">Criatividade</td>
              <td className="py-2 px-4">Alta (sem limites visuais)</td>
              <td className="py-2 px-4">Limitada pelo mapa disponível</td>
            </tr>
            <tr>
              <td className="py-2 px-4 font-medium text-foreground/90">Melhor para</td>
              <td className="py-2 px-4">Roleplay, mesas rápidas</td>
              <td className="py-2 px-4">Combates táticos complexos</td>
            </tr>
          </tbody>
        </table>
      </div>

      <H2>Por que teatro da mente funciona tão bem</H2>

      <H3>Zero Preparação</H3>
      <P>
        A maior vantagem do TotM é que não exige nenhuma preparação material.
        Você não precisa desenhar mapas, imprimir tokens, comprar miniaturas ou
        configurar um VTT. Isso é especialmente valioso para mestres que
        improvisam encontros ou que têm pouco tempo de prep entre sessões.
      </P>

      <H3>Ritmo Mais Rápido</H3>
      <P>
        Sem a necessidade de mover miniaturas, contar quadrados ou debater
        posicionamento exato, os turnos fluem mais rápido. Como{" "}
        <ExtLink href="https://slyflourish.com/tyranny_of_the_grid.html">
          Sly Flourish argumenta sobre a {'"'}tirania do grid{'"'}
        </ExtLink>, o mapa pode desacelerar o jogo ao transformar cada decisão em
        um exercício de otimização espacial. No TotM, o jogador declara o que
        quer fazer e o jogo avança.
      </P>

      <H3>Liberdade Criativa</H3>
      <P>
        Quando não há mapa físico, os jogadores e o mestre podem descrever o
        ambiente com detalhes ilimitados. O campo de batalha pode ter penhascos,
        rios, pontes, prédios em colapso, qualquer coisa que a narrativa peça,
        sem precisar de um mapa pronto. Jogadores tendem a propor ações mais
        criativas quando não estão limitados pelo que veem no grid.
      </P>

      <H3>Orçamento Zero</H3>
      <P>
        Nenhum investimento em materiais: sem mapas, sem miniaturas, sem TV
        horizontal, sem VTT pago. Basta imaginação e um bom combat tracker para
        gerenciar os números. Ideal para mesas com orçamento limitado ou que
        jogam em locais diferentes (bares, parques, casas de amigos).
      </P>

      <H2>Por que grid é insubstituível em certas mesas</H2>

      <H3>Clareza Total</H3>
      <P>
        Com o grid, não há discussão sobre {'"'}quem está onde{'"'}. Todos
        veem exatamente a posição de cada criatura. Isso elimina
        mal-entendidos, reduz conflitos na mesa e dá aos jogadores informação
        perfeita para tomar decisões táticas.
      </P>

      <H3>Precisão em Áreas de Efeito</H3>
      <P>
        Spells como <em>Fireball</em>, <em>Web</em>, <em>Spirit Guardians</em>{" "}
        e <em>Cloud of Daggers</em> funcionam muito melhor com grid. Não há
        debate sobre quantos inimigos estão na área: é só contar os quadrados.
        Para mesas onde casters de área são comuns, o grid resolve muitos
        problemas.
      </P>

      <H3>Ataques de Oportunidade e Posicionamento</H3>
      <P>
        O sistema de D&D 5e tem regras específicas sobre engajamento e ataques de
        oportunidade baseados em distância de 5 pés. Com grid, essas regras
        funcionam perfeitamente. No TotM, o mestre precisa decidir caso a caso
        se um personagem provocou um ataque de oportunidade, e essa decisão nem
        sempre é percebida como justa.
      </P>

      <H3>Componente Visual e Tátil</H3>
      <P>
        Há algo satisfatório em mover miniaturas no mapa, ver a formação do
        grupo, e sentir o campo de batalha tomar forma. Para muitos jogadores, o
        componente visual e tátil do grid é uma parte essencial da experiência
        do D&D. Miniaturas pintadas e mapas bonitos tornam a sessão mais
        {'"'}especial{'"'}.
      </P>

      <H2>O meio-termo que quase ninguém conhece: Zonas</H2>
      <P>
        Existe uma terceira opção que resolve 80% das brigas entre os dois
        campos: combate baseado em <strong>zonas</strong>. Em vez de quadrados precisos,
        o campo de batalha é dividido em zonas abstratas: {'"'}entrada da
        caverna{'"'}, {'"'}rio de lava{'"'}, {'"'}ponte estreita{'"'},
        {'"'}altar do dragão{'"'}. Mover-se dentro da mesma zona custa pouco
        ou nada; mover entre zonas adjacentes custa um turno de movimento.
      </P>
      <P>
        <ExtLink href="https://slyflourish.com/fate_style_zones_in_5e.html">
          Sly Flourish adaptou o sistema de zonas do FATE para o D&D 5e
        </ExtLink>, e o resultado é elegante: você mantém a clareza espacial do
        grid (todo mundo sabe em qual zona está) com a velocidade e liberdade
        narrativa do TotM (sem contar quadrados). Áreas de efeito afetam {'"'}a
        zona inteira{'"'} ou {'"'}duas zonas adjacentes{'"'}, dependendo do
        tamanho da spell.
      </P>
      <P>
        Na prática, você pode desenhar as zonas como bolhas ou retângulos num
        papel comum (nem precisa de grid), com setas indicando conexões. Cada
        zona pode ter propriedades, como {'"'}cobertura parcial{'"'}, {'"'}terreno
        difícil{'"'} ou {'"'}escuridão total{'"'}, que afetam mecanicamente
        quem está lá dentro.
      </P>

      <Tip>
        Para usar zonas, comece com 3 a 5 zonas por encontro. Escreva o nome de
        cada zona e uma propriedade especial (se houver). Desenhe setas
        conectando zonas adjacentes. Pronto, seu mapa de combate está feito em
        30 segundos.
      </Tip>

      <H2>Guia rápido: qual usar quando</H2>

      <H3>Use Teatro da Mente Quando...</H3>
      <Ul>
        <Li>O encontro é simples (poucos monstros, terreno básico)</Li>
        <Li>Você está improvisando e não tem mapa preparado</Li>
        <Li>O grupo valoriza velocidade e narrativa sobre tática</Li>
        <Li>É um encontro social com possibilidade de combate</Li>
        <Li>Você está jogando em um local sem mesa (bar, parque, ônibus)</Li>
      </Ul>

      <H3>Use Grid Quando...</H3>
      <Ul>
        <Li>O encontro é complexo (muitos monstros, terreno elaborado, armadilhas)</Li>
        <Li>Boss fights com ações lendárias e efeitos ambientais</Li>
        <Li>O grupo tem casters que usam muitas spells de área</Li>
        <Li>Posicionamento e ataques de oportunidade são tacticamente relevantes</Li>
        <Li>É um encontro planejado e importante para a história</Li>
      </Ul>

      <H3>Use Zonas Quando...</H3>
      <Ul>
        <Li>Você quer clareza espacial sem a lentidão do grid</Li>
        <Li>O ambiente tem locais distintos (salas, níveis, áreas com propriedades diferentes)</Li>
        <Li>Quer prep mínimo mas ainda manter alguma estrutura visual</Li>
        <Li>O grupo é misto, alguns querem tática, outros querem narrativa</Li>
      </Ul>

      <H2>O tracker funciona com qualquer estilo (de verdade)</H2>
      <P>
        O{" "}
        <ProdLink href="/try">Pocket DM</ProdLink>{" "}
        foi projetado como um <strong>combat tracker</strong>, não como um VTT.
        Isso significa que ele rastreia o que importa independente de como você
        representa o campo de batalha: iniciativa, HP, condições, ações
        lendárias e notas de monstros.
      </P>
      <Ul>
        <Li>
          <strong>Teatro da Mente:</strong> use o Pocket DM no celular ou tablet
          enquanto narra. Os jogadores não veem mapa nenhum, só a ordem de
          iniciativa compartilhada.
        </Li>
        <Li>
          <strong>Grid:</strong> use o Pocket DM no notebook ao lado do mapa
          físico. Ele gerencia os números enquanto você gerencia as posições.
        </Li>
        <Li>
          <strong>Zonas:</strong> você pode anotar em qual
          zona cada criatura está usando as notas do combat tracker.
        </Li>
      </Ul>
      <P>
        A vantagem de um combat tracker digital é que ele libera sua mente para
        focar na narrativa e nas decisões dos jogadores, em vez de ficar
        anotando HP no papel. E como o Pocket DM roda no navegador, funciona
        em qualquer dispositivo sem instalar nada.
      </P>
      <P>
        Se você usa{" "}
        <ProdLink href="/condicoes">condições</ProdLink>{" "}
        no combate (e deveria!), o tracker aplica e rastreia automaticamente,
        algo que fica confuso no papel independente do estilo de combate.
      </P>

      <H2>Não existe resposta certa. Existe a SUA mesa.</H2>
      <P>
        Teatro da mente é rápido e barato. Grid é preciso e satisfatório.
        Zonas são o meio-termo que ninguém esperava. A melhor abordagem?
        Ser flexível. TotM pra encontros simples, grid pra boss fights,
        zonas pro resto. Como{" "}
        <ExtLink href="https://theangrygm.com/fighting-with-your-voice-1/">
          The Angry GM argumenta
        </ExtLink>, o estilo de combate deve servir à experiência na mesa, não
        o contrário.
      </P>
      <P>
        Experimente os três. Pergunte aos seus jogadores o que preferem. E
        lembre-se: o que realmente importa é que todos na mesa estejam se
        divertindo, com ou sem miniaturas. Para manter o combate fluindo
        independente do estilo, experimente o{" "}
        <ProdLink href="/try">Pocket DM</ProdLink>{" "}
        , um combat tracker gratuito para D&D 5e que funciona direto no navegador.
        E para mais dicas de combate, confira nosso guia de{" "}
        <IntLink slug="como-agilizar-combate-dnd-5e">
          como agilizar o combate
        </IntLink>{" "}
        e o comparativo{" "}
        <IntLink slug="combat-tracker-vs-vtt-diferenca">
          Combat Tracker vs VTT
        </IntLink>.
      </P>

      <CTA category="comparativo" />
    </>
  );
}
