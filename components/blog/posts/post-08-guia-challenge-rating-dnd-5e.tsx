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

export default function BlogPost8() {
  return (
    <>
      <P>
        "Um monstro CR 5 contra um grupo de nível 5 é um encontro justo,
        certo?" Mais ou menos. Na verdade, depende de umas 8 variáveis que
        o número do CR não mostra. O Challenge Rating é a mecânica mais
        mal-entendida do D&D 5e, mas paradoxalmente uma das mais úteis
        quando você para de tratar como ciência exata. Como{" "}
        <ExtLink href="https://slyflourish.com/what_does_cr_mean.html">
          Sly Flourish explica
        </ExtLink>, o CR é um ponto de partida, não uma resposta absoluta. E como{" "}
        <ExtLink href="https://theangrygm.com/f-cr-theres-a-better-way-part-1/">
          The Angry GM argumenta
        </ExtLink>, o sistema tem falhas sérias, mas conhecer essas falhas é o
        que separa um mestre mediano de um mestre preparado.
      </P>
      <P>
        Vamos destrinchar o CR: como funciona, onde mente descaradamente, e
        os atalhos que mestres experientes usam pra não ficar dependendo de
        planilha.
      </P>

      <H2>CR em 60 segundos</H2>
      <P>
        Challenge Rating é um número que representa a dificuldade relativa de um
        monstro. Em teoria, um monstro com CR X deveria ser um desafio
        {'"'}médio{'"'} para um grupo de quatro aventureiros de nível X. Um
        grupo de quatro personagens de nível 5 deveria enfrentar um monstro
        CR 5 como um encontro {'"'}justo{'"'}: nem trivial, nem mortal.
      </P>
      <P>
        Na prática, essa equivalência é muito mais sutil. O CR leva em conta HP,
        AC, dano por round, habilidades especiais e save DCs do monstro. Mas ele
        <em> não</em> consegue capturar perfeitamente a composição do grupo, o
        nível de otimização dos personagens, itens mágicos, terreno ou a
        experiência dos jogadores. Por isso, o CR é um <strong>guia
        direcional</strong>, não uma calculadora precisa.
      </P>
      <P>
        Cada monstro também possui um valor de XP correspondente ao seu CR. Esses
        valores de XP são a base do sistema de orçamento de encontros do{" "}
        <em>Dungeon Master{"'"}s Guide</em>. Você soma o XP dos monstros,
        aplica multiplicadores por quantidade, e compara com os limiares de XP do
        grupo para determinar a dificuldade.
      </P>

      <SectionDivider src="/art/blog/treated-nobg/mythjourneys-dnd-character-dragonborn-male-fighter.png" alt="Dragonborn guerreiro" />

      <H2>A tabela que você vai consultar toda sessão</H2>
      <P>
        Limiares de XP <strong>por personagem</strong>. Multiplique pelo
        número de jogadores pro orçamento do grupo. Passou do "Mortal"?
        Alguém pode virar estátua.
      </P>
      <div className="overflow-x-auto my-8 rounded-xl border border-white/[0.08]">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.02]">
              <th className="py-2.5 px-4 text-foreground/60 font-medium">Nível</th>
              <th className="py-2.5 px-4 text-foreground/60 font-medium">Fácil</th>
              <th className="py-2.5 px-4 text-foreground/60 font-medium">Médio</th>
              <th className="py-2.5 px-4 text-foreground/60 font-medium">Difícil</th>
              <th className="py-2.5 px-4 text-foreground/60 font-medium">Mortal</th>
            </tr>
          </thead>
          <tbody className="text-foreground/75">
            <tr className="border-b border-white/[0.05]"><td className="py-2 px-4">1</td><td className="py-2 px-4">25</td><td className="py-2 px-4">50</td><td className="py-2 px-4">75</td><td className="py-2 px-4">100</td></tr>
            <tr className="border-b border-white/[0.05]"><td className="py-2 px-4">2</td><td className="py-2 px-4">50</td><td className="py-2 px-4">100</td><td className="py-2 px-4">150</td><td className="py-2 px-4">200</td></tr>
            <tr className="border-b border-white/[0.05]"><td className="py-2 px-4">3</td><td className="py-2 px-4">75</td><td className="py-2 px-4">150</td><td className="py-2 px-4">225</td><td className="py-2 px-4">400</td></tr>
            <tr className="border-b border-white/[0.05]"><td className="py-2 px-4">4</td><td className="py-2 px-4">125</td><td className="py-2 px-4">250</td><td className="py-2 px-4">375</td><td className="py-2 px-4">500</td></tr>
            <tr className="border-b border-white/[0.05]"><td className="py-2 px-4">5</td><td className="py-2 px-4">250</td><td className="py-2 px-4">500</td><td className="py-2 px-4">750</td><td className="py-2 px-4">1.100</td></tr>
            <tr className="border-b border-white/[0.05]"><td className="py-2 px-4">6</td><td className="py-2 px-4">300</td><td className="py-2 px-4">600</td><td className="py-2 px-4">900</td><td className="py-2 px-4">1.400</td></tr>
            <tr className="border-b border-white/[0.05]"><td className="py-2 px-4">7</td><td className="py-2 px-4">350</td><td className="py-2 px-4">750</td><td className="py-2 px-4">1.100</td><td className="py-2 px-4">1.700</td></tr>
            <tr className="border-b border-white/[0.05]"><td className="py-2 px-4">8</td><td className="py-2 px-4">450</td><td className="py-2 px-4">900</td><td className="py-2 px-4">1.400</td><td className="py-2 px-4">2.100</td></tr>
            <tr className="border-b border-white/[0.05]"><td className="py-2 px-4">9</td><td className="py-2 px-4">550</td><td className="py-2 px-4">1.100</td><td className="py-2 px-4">1.600</td><td className="py-2 px-4">2.400</td></tr>
            <tr className="border-b border-white/[0.05]"><td className="py-2 px-4">10</td><td className="py-2 px-4">600</td><td className="py-2 px-4">1.200</td><td className="py-2 px-4">1.900</td><td className="py-2 px-4">2.800</td></tr>
            <tr className="border-b border-white/[0.05]"><td className="py-2 px-4">11</td><td className="py-2 px-4">800</td><td className="py-2 px-4">1.600</td><td className="py-2 px-4">2.400</td><td className="py-2 px-4">3.600</td></tr>
            <tr className="border-b border-white/[0.05]"><td className="py-2 px-4">12</td><td className="py-2 px-4">1.000</td><td className="py-2 px-4">2.000</td><td className="py-2 px-4">3.000</td><td className="py-2 px-4">4.500</td></tr>
            <tr className="border-b border-white/[0.05]"><td className="py-2 px-4">13</td><td className="py-2 px-4">1.100</td><td className="py-2 px-4">2.200</td><td className="py-2 px-4">3.400</td><td className="py-2 px-4">5.100</td></tr>
            <tr className="border-b border-white/[0.05]"><td className="py-2 px-4">14</td><td className="py-2 px-4">1.250</td><td className="py-2 px-4">2.500</td><td className="py-2 px-4">3.800</td><td className="py-2 px-4">5.700</td></tr>
            <tr className="border-b border-white/[0.05]"><td className="py-2 px-4">15</td><td className="py-2 px-4">1.400</td><td className="py-2 px-4">2.800</td><td className="py-2 px-4">4.300</td><td className="py-2 px-4">6.400</td></tr>
            <tr className="border-b border-white/[0.05]"><td className="py-2 px-4">16</td><td className="py-2 px-4">1.600</td><td className="py-2 px-4">3.200</td><td className="py-2 px-4">4.800</td><td className="py-2 px-4">7.200</td></tr>
            <tr className="border-b border-white/[0.05]"><td className="py-2 px-4">17</td><td className="py-2 px-4">2.000</td><td className="py-2 px-4">3.900</td><td className="py-2 px-4">5.900</td><td className="py-2 px-4">8.800</td></tr>
            <tr className="border-b border-white/[0.05]"><td className="py-2 px-4">18</td><td className="py-2 px-4">2.100</td><td className="py-2 px-4">4.200</td><td className="py-2 px-4">6.300</td><td className="py-2 px-4">9.500</td></tr>
            <tr className="border-b border-white/[0.05]"><td className="py-2 px-4">19</td><td className="py-2 px-4">2.400</td><td className="py-2 px-4">4.900</td><td className="py-2 px-4">7.300</td><td className="py-2 px-4">10.900</td></tr>
            <tr><td className="py-2 px-4">20</td><td className="py-2 px-4">2.800</td><td className="py-2 px-4">5.700</td><td className="py-2 px-4">8.500</td><td className="py-2 px-4">12.700</td></tr>
          </tbody>
        </table>
      </div>

      <Tip>
        Para grupos com mais ou menos de 4 jogadores, ajuste os limiares
        proporcionalmente. Um grupo de 6 nível 5 tem limiar Médio de 3.000 XP
        (500 x 6), não 2.000.
      </Tip>

      <H2>O multiplicador que pega todo mundo de surpresa</H2>
      <P>
        Mais monstros = mais ações por rodada = encontro muito mais perigoso
        do que a soma bruta de XP sugere. O DMG compensa isso com um
        multiplicador:
      </P>
      <div className="overflow-x-auto my-8 rounded-xl border border-white/[0.08]">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.02]">
              <th className="py-2.5 px-4 text-foreground/60 font-medium">Nº de Monstros</th>
              <th className="py-2.5 px-4 text-foreground/60 font-medium">Multiplicador</th>
            </tr>
          </thead>
          <tbody className="text-foreground/75">
            <tr className="border-b border-white/[0.05]"><td className="py-2 px-4">1</td><td className="py-2 px-4">x1</td></tr>
            <tr className="border-b border-white/[0.05]"><td className="py-2 px-4">2</td><td className="py-2 px-4">x1,5</td></tr>
            <tr className="border-b border-white/[0.05]"><td className="py-2 px-4">3–6</td><td className="py-2 px-4">x2</td></tr>
            <tr className="border-b border-white/[0.05]"><td className="py-2 px-4">7–10</td><td className="py-2 px-4">x2,5</td></tr>
            <tr className="border-b border-white/[0.05]"><td className="py-2 px-4">11–14</td><td className="py-2 px-4">x3</td></tr>
            <tr><td className="py-2 px-4">15+</td><td className="py-2 px-4">x4</td></tr>
          </tbody>
        </table>
      </div>
      <P>
        Exemplo: 3 Goblins (CR 1/4, 50 XP cada) somam 150 XP brutos. Com
        multiplicador x2 (3–6 monstros), o XP ajustado é 300 XP. Para um grupo
        de 4 de nível 1, isso fica entre Difícil (300 XP) e Mortal (400 XP),
        um encontro bem tenso.
      </P>

      <Tip>
        O multiplicador é usado apenas para determinar a dificuldade, não para
        distribuir XP. Os jogadores recebem o XP bruto dividido pelo grupo (no
        exemplo acima, 150 XP / 4 = 37 XP cada).
      </Tip>

      <H2>Quando o CR mente na sua cara</H2>
      <P>
        O CR é baseado em médias. O combate real no D&D 5e é tudo menos médio.
        Aqui estão as situações em que o número mente descaradamente:
      </P>

      <H3>1. Habilidades de Controle</H3>
      <P>
        Monstros com habilidades que removem jogadores do combate, como
        petrificação, paralisia, <em>Hold Person</em> ou engolir, são muito mais
        perigosos do que o CR sugere. Um Basilisk (CR 3) pode petrificar um PC de
        nível 5 em um único turno falhado, efetivamente removendo-o do combate.
        O CR não captura o impacto devastador de perder um membro do grupo.
      </P>

      <H3>2. AC ou HP Fora da Curva</H3>
      <P>
        Alguns monstros têm AC extremamente alta com HP baixo (ou vice-versa). Um
        monstro com AC 19 mas apenas 30 HP pode frustrar um grupo que não acerta
        ataques, mas desmoronar em dois turnos quando finalmente conectam. O CR
        trata isso como {'"'}médio{'"'}, mas a experiência real na mesa é
        bipolar: ora o monstro parece invencível, ora morre instantaneamente.
      </P>

      <H3>3. Economia de Ações Desproporcional</H3>
      <P>
        Um monstro solo CR 8 contra 5 jogadores tem uma ação por round contra
        cinco. Independente do poder bruto do monstro, a diferença de ações
        geralmente significa que ele será massacrado antes de representar ameaça
        real. Por outro lado, 8 monstros CR 1/4 juntos podem ser mais letais que
        um monstro CR 3 solo, porque 8 ataques por round se acumulam rápido. Como{" "}
        <ExtLink href="http://blogofholding.com/?p=7283">
          Blog of Holding demonstrou
        </ExtLink>, a economia de ações é o fator que o CR pior captura.
      </P>

      <H3>4. Fragilidade do Nível 1</H3>
      <P>
        Nos níveis 1-2, personagens têm tão pouco HP que qualquer variação de
        dano pode ser letal. Um encontro {'"'}Médio{'"'} para nível 1 pode
        facilmente se tornar mortal se os monstros rolam dano alto ou acertam
        crits. Mestres iniciantes devem tratar encontros de nível 1 com extrema
        cautela. Um grupo de 4 Goblins pode causar um TPK com facilidade.
      </P>

      <H3>5. Itens Mágicos e Otimização</H3>
      <P>
        O CR assume que o grupo não tem itens mágicos significativos e que os
        personagens são construídos de forma {'"'}razoável{'"'}. Um grupo com
        um Paladin usando <em>Great Weapon Master</em> e <em>Smite</em>, um
        Wizard com <em>Web</em> e <em>Hypnotic Pattern</em>, e itens mágicos +1
        vai demolir encontros que o CR classifica como {'"'}Difíceis{'"'}. O
        inverso também vale: grupos com builds sub-ótimos vão sofrer mais do que
        o CR prevê.
      </P>

      <H2>Atalhos pra quem não quer fazer conta</H2>
      <P>
        Tabelas e multiplicadores são úteis na preparação. Na hora de
        improvisar um encontro no meio da sessão, você precisa de algo mais
        rápido:
      </P>

      <H3>Lazy Encounter Benchmark (Sly Flourish)</H3>
      <P>
        O{" "}
        <ExtLink href="https://slyflourish.com/lazy_encounter_benchmark.html">
          Lazy Encounter Benchmark
        </ExtLink>{" "}
        é provavelmente o método mais rápido para balancear encontros. A regra é
        simples: <strong>some o nível de todos os personagens e divida por
        4</strong>. O resultado é o CR de referência para um encontro
        {'"'}médio{'"'} com um único monstro. Para encontros com múltiplos
        monstros, use vários monstros de CR menor que somem aproximadamente o
        mesmo orçamento.
      </P>
      <P>
        Exemplo: grupo de 4 de nível 6 = soma 24, dividido por 4 = CR 6 para um
        encontro médio. Ou dois monstros CR 3. Ou seis monstros CR 1. Simples
        assim.
      </P>

      <H3>Regra CR = Nível do Grupo</H3>
      <P>
        Para quem quer algo ainda mais simples: um monstro com CR igual ao nível
        do grupo (para 4 PCs) é geralmente um encontro {'"'}médio{'"'} a
        {'"'}difícil{'"'}. Monstro com CR = nível + 2 é mortal. Monstro com
        CR = nível - 2 é fácil. Não é preciso, mas funciona surpreendentemente
        bem para mesas casuais.
      </P>

      <H3>Narrativa Primeiro</H3>
      <P>
        Tanto Sly Flourish quanto The Angry GM concordam em um ponto: o encontro
        deve servir a história, não ao contrário. Comece pela narrativa: que
        monstros fazem sentido nesta cena? Depois verifique o CR como sanity
        check. Se o resultado é {'"'}mortal{'"'}, ajuste: reduza HP, remova um
        monstro ou dê ao grupo vantagem tática. Se é {'"'}fácil{'"'}, adicione
        monstros ou coloque os inimigos em terreno vantajoso.
      </P>

      <H2>Ajuste na hora: 4 truques de mestre veterano</H2>
      <P>
        Planejamento é planejamento. Mesa é mesa. Quando o encontro sai dos
        trilhos (e vai sair), estas técnicas salvam:
      </P>

      <H3>Ajustar HP</H3>
      <P>
        Se o monstro está morrendo rápido demais, adicione HP silenciosamente.
        Se está tedioso porque os jogadores não conseguem derrubar, reduza. Os
        jogadores não sabem o HP exato do monstro, use isso a seu favor. Dica:
        defina um range de HP em vez de um número fixo (ex: 80-130 para um
        monstro com HP listado como 110).
      </P>

      <H3>Reforços</H3>
      <P>
        Se o encontro está fácil demais, faça mais inimigos aparecerem. Um grupo
        de bandidos pode pedir reforços; esqueletos podem emergir do chão; o
        barulho da luta atrai mais goblins. Isso mantém a tensão e é narrativamente
        justificável.
      </P>

      <H3>Ajustar Dano</H3>
      <P>
        Se o monstro está causando muito dano e o encontro está ficando mortal,
        role dano na faixa mais baixa. Se está fácil, use o dano máximo. Você
        também pode {'"'}esquecer{'"'} de usar uma habilidade poderosa por um
        turno se perceber que o próximo golpe vai derrubar um jogador de forma
        anticlimática.
      </P>

      <H3>Trocar Alvos</H3>
      <P>
        Monstros inteligentes atacam alvos diferentes. Se o monstro está focando
        um jogador que já está com HP baixo e a sessão não pede uma morte de
        personagem, faça o monstro perceber outra ameaça (o Wizard que acabou de
        lançar <em>Fireball</em>, por exemplo). Isso distribui o dano e mantém
        todos engajados.
      </P>

      <Tip>
        Use o{" "}
        <ProdLink href="/try">Pocket DM</ProdLink>{" "}
        para rastrear HP em tempo real e fazer esses ajustes sem que os jogadores
        percebam. É muito mais fácil ajustar HP digitalmente do que riscar e
        reescrever no papel.
      </Tip>

      <H2>Cole isso na sua tela: CR por dificuldade (4 PCs)</H2>
      <P>
        Tabela de bolso. Grupo de 4. Use como ponto de partida e ajuste pro
        seu grupo real:
      </P>
      <div className="overflow-x-auto my-8 rounded-xl border border-white/[0.08]">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.02]">
              <th className="py-2.5 px-4 text-foreground/60 font-medium">Nível do Grupo</th>
              <th className="py-2.5 px-4 text-foreground/60 font-medium">Fácil</th>
              <th className="py-2.5 px-4 text-foreground/60 font-medium">Médio</th>
              <th className="py-2.5 px-4 text-foreground/60 font-medium">Difícil</th>
              <th className="py-2.5 px-4 text-foreground/60 font-medium">Mortal</th>
            </tr>
          </thead>
          <tbody className="text-foreground/75">
            <tr className="border-b border-white/[0.05]"><td className="py-2 px-4">1</td><td className="py-2 px-4">CR 1/8</td><td className="py-2 px-4">CR 1/4</td><td className="py-2 px-4">CR 1/2</td><td className="py-2 px-4">CR 1</td></tr>
            <tr className="border-b border-white/[0.05]"><td className="py-2 px-4">3</td><td className="py-2 px-4">CR 1/2</td><td className="py-2 px-4">CR 1</td><td className="py-2 px-4">CR 3</td><td className="py-2 px-4">CR 4</td></tr>
            <tr className="border-b border-white/[0.05]"><td className="py-2 px-4">5</td><td className="py-2 px-4">CR 2</td><td className="py-2 px-4">CR 4</td><td className="py-2 px-4">CR 6</td><td className="py-2 px-4">CR 8</td></tr>
            <tr className="border-b border-white/[0.05]"><td className="py-2 px-4">10</td><td className="py-2 px-4">CR 5</td><td className="py-2 px-4">CR 8</td><td className="py-2 px-4">CR 11</td><td className="py-2 px-4">CR 14</td></tr>
            <tr className="border-b border-white/[0.05]"><td className="py-2 px-4">15</td><td className="py-2 px-4">CR 8</td><td className="py-2 px-4">CR 12</td><td className="py-2 px-4">CR 16</td><td className="py-2 px-4">CR 19</td></tr>
            <tr><td className="py-2 px-4">20</td><td className="py-2 px-4">CR 12</td><td className="py-2 px-4">CR 17</td><td className="py-2 px-4">CR 21</td><td className="py-2 px-4">CR 25</td></tr>
          </tbody>
        </table>
      </div>

      <H2>Erros que custam sessões</H2>
      <Ul>
        <Li>
          <strong>Confiar cegamente no CR:</strong> O CR é um ponto de partida.
          Sempre considere composição do grupo, itens mágicos, experiência dos
          jogadores e contexto narrativo.
        </Li>
        <Li>
          <strong>Ignorar a economia de ações:</strong> Um monstro solo CR 8 é
          quase sempre mais fraco do que o CR sugere. Adicione lacaios ou use
          ações lendárias.
        </Li>
        <Li>
          <strong>Não multiplicar por quantidade:</strong> 4 Wolves (CR 1/4) não
          são um encontro CR 1. Com o multiplicador x2, o XP ajustado dobra, e
          a <em>Pack Tactics</em> torna o encontro ainda mais perigoso.
        </Li>
        <Li>
          <strong>Tratar nível 1 como qualquer outro nível:</strong> Nos níveis
          1-2, os personagens são extremamente frágeis. Um encontro
          {'"'}Médio{'"'} pode matar facilmente. Comece com encontros Fáceis e
          aumente gradualmente.
        </Li>
        <Li>
          <strong>Não ajustar em tempo real:</strong> O encontro começou e está
          claramente desequilibrado? Ajuste. HP, reforços, dano e alvos são
          todos variáveis que o mestre controla. Use-as.
        </Li>
      </Ul>

      <H2>CR não é perfeito. Mas é útil.</H2>
      <P>
        Nenhum número vai capturar todas as variáveis de uma mesa real. Mas
        quando você entende o que o CR faz e onde ele falha, ele vira uma
        ferramenta em vez de uma frustração. Tabelas pra preparação, Lazy
        Benchmark pra improviso, intuição pra decisão final. Os três juntos
        cobrem 95% dos cenários.
      </P>
      <P>
        Para montar encontros na prática, use a{" "}
        <ProdLink href="/calculadora-encontro">Calculadora de Encontros</ProdLink>{" "}
        do Pocket DM, explore o{" "}
        <ProdLink href="/monstros">Compêndio de Monstros</ProdLink>{" "}
        gratuito com fichas SRD completas, ou{" "}
        <ProdLink href="/try">teste o combat tracker</ProdLink>{" "}
        direto no navegador. E se quiser aprofundar, leia nosso guia sobre{" "}
        <IntLink slug="como-montar-encontro-balanceado-dnd-5e">
          como montar encontros balanceados
        </IntLink>{" "}
        e sobre os{" "}
        <IntLink slug="melhores-monstros-dnd-5e">
          10 monstros que todo mestre deveria usar
        </IntLink>.
      </P>

      <CTA category="guia" />
    </>
  );
}
