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

export default function BlogPost7() {
  return (
    <>
      <P>
        Você preparou o encontro com carinho: 3 Ogres num corredor de dungeon,
        dificuldade "Difícil" segundo a tabela do DMG. Na sessão, o Paladin
        abre com Smite crítico, o Wizard larga um Hypnotic Pattern que pega
        dois dos três, e em 2 rodadas acabou. "Era pra ser difícil?" pergunta
        o Rogue, limpando a adaga. Se isso já aconteceu com você, bem-vindo
        ao clube. E a este guia.
      </P>

      <H2>Por que se dar ao trabalho de balancear?</H2>
      <P>
        Encontro fácil demais? Jogadores param de pensar. Encontro brutal
        demais sem aviso? Frustração. O ponto bom é quando o grupo sente que
        precisa jogar direito: usar recursos com inteligência, fazer escolhas
        táticas, trabalhar em equipe. Esse é o combate que gera histórias.
      </P>
      <P>
        Agora, balancear NÃO significa que todo encontro precisa ser justo.
        Existem encontros triviais e encontros avassaladores. Como{" "}
        <ExtLink href="https://slyflourish.com/5e_encounter_building.html">
          Sly Flourish argumenta
        </ExtLink>, o mundo não se conforma ao nível dos personagens. Existem
        encontros triviais e encontros avassaladores. O objetivo do
        balanceamento é saber <em>de antemão</em> qual será a dificuldade, para
        que surpresas letais aconteçam por escolha do mestre, não por acidente.
      </P>

      <SectionDivider src="/art/blog/treated-nobg/mythjourneys-dnd-character-dwarf-male-fighter-paladin.png" alt="Anão paladino" />

      <H2>O método oficial: Orçamento de XP (DMG)</H2>
      <P>
        O método do Dungeon Master{"'"}s Guide é o mais conhecido, mas também
        o mais confuso na primeira vez. É mais simples do que parece. Quatro
        passos:
      </P>

      <H3>Passo 1: Determine os Limiares de XP do Grupo</H3>
      <P>
        Cada personagem tem um limiar de XP por dificuldade (Fácil, Médio,
        Difícil e Mortal) baseado no seu nível. Para um grupo de nível 1, os
        limiares individuais são aproximadamente 25 / 50 / 75 / 100 XP.
        Multiplique pelo número de jogadores para obter o orçamento do grupo.
      </P>
      <P>
        Exemplo prático: um grupo de 4 jogadores de nível 3 tem os seguintes
        limiares de grupo:
      </P>
      <Ul>
        <Li><strong>Fácil:</strong> 300 XP</Li>
        <Li><strong>Médio:</strong> 600 XP</Li>
        <Li><strong>Difícil:</strong> 900 XP</Li>
        <Li><strong>Mortal:</strong> 1.400 XP</Li>
      </Ul>

      <H3>Passo 2: Selecione os Monstros</H3>
      <P>
        Escolha os monstros que fazem sentido para a história e some o XP
        base de cada um. Use o{" "}
        <ProdLink href="/monstros">bestiário do Pocket DM</ProdLink>{" "}
        para encontrar monstros por CR, tipo e ambiente. Você também pode
        consultar nosso{" "}
        <ProdLink href="/monstros">compêndio de monstros</ProdLink>{" "}
        para ver detalhes completos de cada criatura.
      </P>

      <H3>Passo 3: Aplique o Multiplicador de Múltiplos Monstros</H3>
      <P>
        Aqui está o detalhe que muitos mestres esquecem. O DMG aplica um
        multiplicador ao XP total baseado na quantidade de monstros, porque
        mais monstros significam mais ações por rodada:
      </P>
      <Ul>
        <Li><strong>1 monstro:</strong> x1 (sem multiplicador)</Li>
        <Li><strong>2 monstros:</strong> x1,5</Li>
        <Li><strong>3-6 monstros:</strong> x2</Li>
        <Li><strong>7-10 monstros:</strong> x2,5</Li>
        <Li><strong>11-14 monstros:</strong> x3</Li>
        <Li><strong>15+ monstros:</strong> x4</Li>
      </Ul>
      <P>
        Esse multiplicador existe exclusivamente para calcular a dificuldade.
        Os jogadores ainda recebem o XP base, não o ajustado. Se 6 goblins
        (50 XP cada) somam 300 XP base, o XP ajustado é 600 (300 x 2),
        colocando o encontro na faixa Média para o grupo do exemplo acima.
      </P>

      <Tip>
        Use a{" "}
        <ProdLink href="/calculadora-encontro">Calculadora de Encontros do Pocket DM</ProdLink>{" "}
        para automatizar esses cálculos. Adicione os monstros, informe o nível
        do grupo, e a ferramenta faz o cálculo do XP ajustado e indica a faixa
        de dificuldade instantaneamente.
      </Tip>

      <H3>Passo 4: Compare com o Orçamento</H3>
      <P>
        Compare o XP ajustado com os limiares do grupo. Se o total cai entre
        o limiar Médio e Difícil, você tem um encontro desafiador mas
        gerenciável. Se ultrapassa o Mortal, prepare-se para possibilidades
        reais de morte de personagem.
      </P>

      <H2>O atalho do Sly Flourish: Lazy Encounter Benchmark</H2>
      <P>
        Ok, se o XP Budget pareceu trabalhoso (e é, pra uso no dia a dia),{" "}
        <ExtLink href="https://slyflourish.com/the_lazy_encounter_benchmark.html">
          o Lazy Encounter Benchmark de Mike Shea (Sly Flourish)
        </ExtLink>{" "}
        oferece uma alternativa elegante que não exige tabelas nem calculadoras.
      </P>
      <P>
        O método funciona em dois passos simples:
      </P>
      <Ul>
        <Li>
          <strong>Para personagens de nível 1-4:</strong> some os níveis de
          todos os personagens e divida por 4. Esse é o seu benchmark de CR
          total. Se a soma dos CRs dos monstros ultrapassar esse número, o
          encontro pode ser mortal.
        </Li>
        <Li>
          <strong>Para personagens de nível 5+:</strong> some os níveis e
          divida por 2. Monstros individuais com CR acima de 1,5x o nível
          médio do grupo também podem ser um problema.
        </Li>
      </Ul>
      <P>
        Exemplo: grupo de 4 jogadores nível 5 = soma 20 níveis. Benchmark =
        20 / 2 = CR 10 total. Você pode usar, por exemplo, 1 monstro CR 5 e
        4 monstros CR 1 (total CR 9) e estar dentro da faixa segura.
      </P>

      <Tip>
        Anote o benchmark do seu grupo na sua ficha de preparo de sessão. Com
        esse número na cabeça, você consegue improvisar encontros na hora sem
        precisar parar para fazer contas.
      </Tip>

      <H2>Economia de ações: o fator que o CR não captura</H2>
      <P>
        Se tem UMA coisa que você precisa entender sobre balanceamento no 5e,
        é economia de ações. A regra é brutalmente simples: o lado com mais
        ações por rodada tende a ganhar. Um dragão adulto com CR
        13 pode parecer aterrorizante, mas contra 5 jogadores de nível 10, ele
        terá 1 ação contra 5. Mesmo com Multiattack e ações lendárias, a ação
        econômica está contra ele.
      </P>
      <P>
        Por isso os encontros com um único monstro solitário frequentemente
        decepcionam. Antes que o monstro tenha sua segunda rodada, o grupo
        já descarregou magias de controle, ataques coordenados e possivelmente
        o reduziu a cinzas.
      </P>

      <H3>Como Equilibrar a Economia de Ações</H3>
      <Ul>
        <Li>
          <strong>Adicione lacaios:</strong> em vez de 1 monstro de CR 8,
          use 1 de CR 5 com 3-4 lacaios de CR 1/2. O grupo precisa dividir
          a atenção e não consegue focar fogo num alvo só.
        </Li>
        <Li>
          <strong>Use ações lendárias e de covil:</strong> monstros com
          legendary actions efetivamente ganham ações extras entre os turnos
          dos jogadores, compensando a desvantagem numérica.
        </Li>
        <Li>
          <strong>Reforços durante o combate:</strong> monstros que chegam na
          rodada 2 ou 3 mudam a dinâmica do encontro e forçam o grupo a
          reavaliar prioridades.
        </Li>
        <Li>
          <strong>Regra prática:</strong> garanta pelo menos 1 monstro para
          cada 2 jogadores como piso absoluto. Idealmente, mantenha 1 monstro
          por jogador em encontros que importam.
        </Li>
      </Ul>

      <Tip>
        Se você vai rodar um boss solitário, considere usar as regras de
        Legendary Actions e Lair Actions. Sem elas, até mesmo um dragão
        antigo pode cair em 2-3 rodadas contra um grupo otimizado.
      </Tip>

      <H2>Composição: por que 6 goblins iguais é entediante</H2>
      <P>
        Seis cópias do mesmo monstro funcionam numericamente, mas na mesa é
        monótono. A variedade de funções táticas é o que transforma combate
        mecânico em algo que os jogadores lembram semanas depois.{" "}
        <ExtLink href="https://www.themonstersknow.com/thoughts-constructing-encounters/">
          Keith Ammann (The Monsters Know What They{"'"}re Doing)
        </ExtLink>{" "}
        defende que a composição de monstros deve seguir a lógica ecológica
        do mundo: criaturas que naturalmente coexistem no mesmo ambiente.
      </P>

      <H3>Arquétipos de Composição</H3>
      <Ul>
        <Li>
          <strong>Boss + Lacaios:</strong> um líder forte (hobgoblin captain)
          com soldados mais fracos (hobgoblins, goblins). Os lacaios protegem
          o boss e forçam o grupo a tomar decisões de priorização.
        </Li>
        <Li>
          <strong>Artilharia + Linha de Frente:</strong> monstros corpo a
          corpo (ogros, gnolls) protegem atacantes a distância (goblin
          archers, mages). Isso cria um dilema tático: avançar para eliminar
          a artilharia ou lidar com a muralha na frente?
        </Li>
        <Li>
          <strong>Controlador + DPS:</strong> um monstro com habilidades de
          controle (hold person, web, frightful presence) combinado com
          monstros que causam dano alto. O controle abre janelas para o dano.
        </Li>
        <Li>
          <strong>Enxame Homogêneo:</strong> muitos monstros fracos (8+
          esqueletos, kobolds com armadilhas). A força está na quantidade e
          na economia de ações. Funciona bem para encontros de atrito.
        </Li>
      </Ul>

      <P>
        Keith Ammann também destaca que monstros inteligentes devem proteger
        suas fraquezas com a escolha de aliados. Um conjurador frágil se
        cerca de brutos para proteção física. Um bruto estúpido recruta
        outros brutos semelhantes. Isso cria consistência temática e tática
        ao mesmo tempo.
      </P>

      <H2>Terreno: o multiplicador de dificuldade que ninguém calcula</H2>
      <P>
        A maioria dos mestres monta encontros só pelos números e esquece onde
        a luta acontece. Mas coloque 4 goblins com arcos no topo de um
        penhasco e aquele encontro "Fácil" vira um pesadelo. O inverso também
        vale: o boss fight épico perde a graça se o grupo tem cobertura total.
      </P>

      <H3>Elementos de Terreno que Mudam Tudo</H3>
      <Ul>
        <Li>
          <strong>Elevação:</strong> monstros em posição elevada ganham
          cobertura e vantagem tática. Goblins em cima de penhascos com arcos
          são muito mais perigosos do que goblins no chão.
        </Li>
        <Li>
          <strong>Cobertura:</strong> pilares, árvores e muros parciais
          dificultam ataques a distância e forçam movimento. Cover de meia
          (+2 AC) e três quartos (+5 AC) mudam cálculos de acerto
          significativamente.
        </Li>
        <Li>
          <strong>Terreno difícil:</strong> lama, entulho, vegetação densa.
          Reduz o movimento pela metade, limitando a capacidade do grupo de
          se reposicionar. Extremamente eficaz contra classes corpo a corpo.
        </Li>
        <Li>
          <strong>Gargalos:</strong> corredores estreitos, pontes, portas.
          Limitam quantos personagens podem engajar ao mesmo tempo, anulando
          parcialmente a vantagem numérica do grupo.
        </Li>
        <Li>
          <strong>Perigos ambientais:</strong> fossas, armadilhas, áreas de
          efeito persistente (lava, gás venenoso, escuridão mágica). Adicionam
          uma camada de perigo que não depende da ação dos monstros.
        </Li>
      </Ul>

      <Tip>
        Uma regra prática: se os monstros têm vantagem significativa de
        terreno (elevação + cobertura, ou terreno difícil que não os afeta),
        considere reduzir a dificuldade do encontro em um degrau. Um encontro
        Médio com terreno favorável aos monstros joga como Difícil.
      </Tip>

      <H2>Fácil, Médio, Difícil, Mortal — o que realmente muda na mesa</H2>
      <P>
        Os rótulos do DMG parecem óbvios, mas na prática geram muita confusão.
        Aqui vai o que cada um realmente significa quando os dados caem:
      </P>

      <H3>Fácil</H3>
      <P>
        Os jogadores vencem sem gastar recursos significativos. Ninguém precisa
        usar spell slots de nível alto, ninguém cai a zero HP. Útil para criar
        sensação de progresso, drenar recursos menores ao longo de um dia de
        aventura, ou para encontros narrativos onde o combate é uma formalidade.
      </P>

      <H3>Médio</H3>
      <P>
        O padrão. Alguns recursos são gastos (spell slots, hit dice, habilidades
        de curta duração). Um ou dois jogadores podem tomar dano significativo.
        É o tipo de encontro que você pode rodar 6-8 vezes num dia de aventura
        longo. A maioria dos encontros de uma sessão deveria estar nessa faixa.
      </P>

      <H3>Difícil</H3>
      <P>
        O grupo sente pressão real. Recursos importantes são gastos, alguém
        pode cair a zero HP, e decisões táticas ruins têm consequências. É o
        nível ideal para encontros importantes da sessão: o guardião do
        tesouro, o líder dos bandidos, o predador no topo da cadeia alimentar
        da dungeon.
      </P>

      <H3>Mortal</H3>
      <P>
        Possibilidade real de morte de personagem. O grupo precisa jogar
        perfeitamente, usar recursos de forma ótima e provavelmente ter um
        pouco de sorte. Reserve para clímax de arco, vilões principais e
        situações onde a morte de personagem é um resultado narrativamente
        satisfatório. Nunca use encontros Mortais como encontros aleatórios.
      </P>

      <H2>O elefante na sala: 6-8 encontros por dia (sério?)</H2>
      <P>
        Esse é o conceito que mais confunde mestres novos. O DMG assume que
        um grupo enfrenta 6-8 encontros médios entre descansos longos. Esse pressuposto é a base de todo o sistema
        de balanceamento: classes com recursos limitados (como o warlock com
        2 spell slots) são balanceadas em torno de descansos curtos frequentes,
        enquanto classes com muitos recursos (como o wizard) são balanceadas
        pela quantidade de encontros antes do descanso longo.
      </P>
      <P>
        Na prática, a maioria das mesas roda 2-3 encontros por sessão, não
        6-8. Isso significa que classes com muitos recursos por descanso longo
        parecem mais fortes do que deveriam. Se você roda poucas lutas por
        dia de aventura, compense tornando cada encontro individual mais
        difícil (faixa Difícil a Mortal) para que os jogadores precisem gastar
        recursos de forma significativa.
      </P>

      <Tip>
        Se sua mesa tem apenas 1-2 encontros por dia de aventura, mire na
        faixa Difícil para encontros regulares e Mortal para clímax. Isso
        compensa a falta de pressão por atrito de recursos.
      </Tip>

      <H2>Quando o plano vai pro lixo (e como salvar na hora)</H2>
      <P>
        Nenhum sistema de balanceamento sobrevive ao contato com jogadores
        reais. O Paladin otimizado que faz 60 de dano no primeiro turno. O
        Wizard que larga Hypnotic Pattern e desliga metade do encontro. Ou o
        contrário: um crit do monstro que derruba o Cleric na rodada 1. O
        bom mestre ajusta na hora, sem que ninguém perceba.
      </P>

      <H3>Técnicas de Ajuste em Tempo Real</H3>
      <Ul>
        <Li>
          <strong>Ajuste os HP:</strong> monstros têm uma faixa de HP definida
          pelos hit dice. Um ogro tem 59 HP em média, mas pode ter de 33 a 85.
          Se o encontro está fácil demais, use o topo da faixa. Se está
          brutal, use o piso.
        </Li>
        <Li>
          <strong>Adicione ou remova monstros:</strong> reforços chegam pela
          porta dos fundos se o encontro está fácil. Monstros fogem ou se
          rendem se o encontro ficou mortal demais.
        </Li>
        <Li>
          <strong>Modifique o dano:</strong> em vez de rolar 2d6+3, um monstro
          pode causar dano fixo (10) para acelerar, ou rolar 3d6+3 se você
          precisa de mais pressão.
        </Li>
        <Li>
          <strong>Mude o comportamento:</strong> monstros inteligentes podem
          mudar de alvo, recuar para posições defensivas ou tentar negociar.
          Monstros burros podem atacar o alvo mais próximo em vez do mais
          perigoso.
        </Li>
      </Ul>

      <P>
        Um{" "}
        <ProdLink href="/calculadora-encontro">calculador de encontros</ProdLink>{" "}
        ajuda no preparo, mas na mesa, sua intuição como mestre é a
        ferramenta mais valiosa. Preste atenção nos rostos dos jogadores:
        tensão é bom, desespero silencioso não.
      </P>

      <H2>Checklist: monte seu próximo encontro agora</H2>
      <P>
        Chega de teoria. Use isso pra montar o encontro da sua próxima sessão:
      </P>
      <Ul>
        <Li>
          <strong>1. Defina o contexto narrativo:</strong> por que esse
          combate acontece? Quem são os inimigos e o que querem? Um encontro
          sem contexto é apenas aritmética.
        </Li>
        <Li>
          <strong>2. Escolha os monstros pela história:</strong> use o{" "}
          <ProdLink href="/monstros">bestiário</ProdLink>{" "}
          para encontrar criaturas que façam sentido no cenário. Depois
          verifique se os números funcionam.
        </Li>
        <Li>
          <strong>3. Calcule a dificuldade:</strong> use o método do XP
          Budget ou o Lazy Encounter Benchmark para verificar se o encontro
          está na faixa desejada. A{" "}
          <ProdLink href="/calculadora-encontro">Calculadora de Encontros</ProdLink>{" "}
          faz isso em segundos.
        </Li>
        <Li>
          <strong>4. Verifique a economia de ações:</strong> o lado dos
          monstros tem pelo menos 1 ação para cada 2 jogadores? Se não,
          adicione lacaios ou use ações lendárias.
        </Li>
        <Li>
          <strong>5. Pense no terreno:</strong> onde o combate acontece?
          Há cobertura, elevação, terreno difícil? O ambiente favorece os
          monstros, os jogadores, ou nenhum dos dois?
        </Li>
        <Li>
          <strong>6. Defina condições de vitória alternativas:</strong> os
          monstros fogem com 25% de HP? Alguém se rende? Há um objetivo
          além de matar tudo? Encontros com múltiplas condições de vitória
          são mais interessantes.
        </Li>
        <Li>
          <strong>7. Tenha um plano de ajuste:</strong> saiba de antemão
          quantos reforços podem chegar e qual é o piso de HP dos monstros
          se precisar facilitar.
        </Li>
      </Ul>

      <H2>Os erros que todo mestre comete (pelo menos uma vez)</H2>
      <Ul>
        <Li>
          <strong>Confiar cegamente no CR:</strong> o Challenge Rating é um
          guia, não uma ciência exata. Um monstro CR 5 com resistência a
          dano mágico contra um grupo sem conjuradores é muito mais perigoso
          do que o número sugere.
        </Li>
        <Li>
          <strong>Ignorar o multiplicador de múltiplos monstros:</strong> 8
          lobos de CR 1/4 não são um encontro Fácil. Com o multiplicador x2,5,
          o XP ajustado pode colocar esse encontro na faixa Difícil ou Mortal.
        </Li>
        <Li>
          <strong>Boss solitário sem ações lendárias:</strong> um monstro
          poderoso sozinho contra 4-5 jogadores será foco de todos os ataques
          e provavelmente cairá antes de agir duas vezes.
        </Li>
        <Li>
          <strong>Não considerar recursos restantes do grupo:</strong> um
          encontro Médio no início da sessão é completamente diferente de um
          encontro Médio depois de 3 combates sem descanso longo.
        </Li>
        <Li>
          <strong>Usar o mesmo terreno sempre:</strong> todo combate numa sala
          quadrada sem obstáculos é previsível e monótono. Varie o ambiente.
        </Li>
      </Ul>

      <H2>Matemática é o começo. Sua mesa é a resposta.</H2>
      <P>
        Encontro balanceado é uma combinação de números, intuição e conhecer
        seu grupo. O XP Budget dá a base. O Lazy Benchmark do{" "}
        <ExtLink href="https://slyflourish.com/the_lazy_encounter_benchmark.html">
          Sly Flourish
        </ExtLink>{" "}
        oferece uma alternativa rápida para preparo e improviso. A economia de
        ações e a composição de monstros, como detalha{" "}
        <ExtLink href="https://www.themonstersknow.com/thoughts-constructing-encounters/">
          Keith Ammann
        </ExtLink>, garantem que o encontro seja dinâmico e tático. E o terreno
        transforma um exercício de matemática numa experiência imersiva.
      </P>
      <P>
        Não existe encontro perfeito no papel. O verdadeiro balanceamento
        acontece na mesa, no momento em que você ajusta HP, muda o
        comportamento dos monstros e lê as reações dos jogadores. Com prática,
        essas decisões se tornam instintivas. Use as ferramentas como ponto de
        partida, confie no seu instinto como mestre, e lembre-se: um encontro
        é bom quando os jogadores saem da mesa falando sobre ele. Para mais
        contexto, veja nosso{" "}
        <IntLink slug="guia-challenge-rating-dnd-5e">guia de Challenge Rating</IntLink>{" "}
        e os{" "}
        <IntLink slug="melhores-monstros-dnd-5e">10 monstros essenciais para mestres</IntLink>.
      </P>

      <EbookCTA variant="inline" />

      <CTA category="tutorial" />
    </>
  );
}
