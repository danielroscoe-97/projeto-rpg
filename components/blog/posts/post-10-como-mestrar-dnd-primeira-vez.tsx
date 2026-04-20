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

export default function BlogPost10() {
  return (
    <>
      <P>
        Alguém do grupo disse "eu mestro", e esse alguém foi você. Ou
        ninguém disse, e você ficou com pena da mesa morrer antes de nascer.
        De qualquer jeito, agora tá aqui, nervoso, pensando:{" "}
        <strong>"e se eu esquecer as regras? E se eu travar? E se a sessão
        for um desastre?"</strong>
      </P>
      <P>
        Resposta curta: vai dar certo. Mestrar é mais simples do que parece, e
        todo mestre bom que você admira já foi péssimo na primeira vez. Este
        guia junta o que aprendi + conselhos de gente muito melhor que eu:{" "}
        <ExtLink href="https://slyflourish.com/lazydm/">Sly Flourish</ExtLink>,{" "}
        <ExtLink href="https://mcdm.fandom.com/wiki/Running_the_Game">Matt Colville</ExtLink> e{" "}
        <ExtLink href="https://thealexandrian.net/gamemastery-101">The Alexandrian</ExtLink>{" "}
        para te ajudar a preparar e rodar sua primeira sessão com confiança.
      </P>

      <SectionDivider src="/art/blog/treated-nobg/dnd-elf-wizard-sorcerer-mythjourneys.png" alt="Elfo mago" />

      <H2>O que o mestre faz de verdade (spoiler: menos do que você pensa)</H2>
      <P>
        Você não precisa ser ator, escritor ou ter decorado o livro inteiro.
        O mestre é um <strong>facilitador de diversão</strong>. Você cria
        situações interessantes; os jogadores decidem o que acontece. Como
        Matt Colville diz: o DM monta o cenário, mas são os jogadores que
        escrevem a história.
      </P>
      <P>
        Na prática, suas responsabilidades incluem:
      </P>
      <Ul>
        <Li>
          <strong>Preparar o cenário:</strong> criar ou adaptar a aventura, definir
          NPCs, monstros e locais que os jogadores vão encontrar.
        </Li>
        <Li>
          <strong>Narrar e reagir:</strong> descrever o que os personagens veem,
          ouvem e sentem, e responder às ações deles de forma coerente.
        </Li>
        <Li>
          <strong>Arbitrar regras:</strong> decidir quando rolar dados, qual teste
          usar e o que acontece em caso de sucesso ou falha.
        </Li>
        <Li>
          <strong>Gerenciar o combate:</strong> controlar iniciativa, HP dos monstros,
          condições e turnos. Esta é a parte mais mecânica e onde ferramentas como
          o <ProdLink href="/try">Pocket DM</ProdLink> fazem a maior diferença.
        </Li>
        <Li>
          <strong>Garantir que todo mundo se divirta,</strong> inclusive você. Se
          o mestre não está curtindo, a mesa sente.
        </Li>
      </Ul>

      <Tip>
        Você não precisa ser ator, escritor ou ter decorado o Livro do Mestre inteiro.
        Precisa de uma aventura simples, um punhado de monstros e vontade de
        improvisar. O resto vem com a prática.
      </Tip>

      <H2>O erro #1: preparar demais</H2>
      <P>
        Você vai gastar 4 horas escrevendo diálogos, desenhando um mapa bonito
        e planejando cada cena. Na sessão, os jogadores vão ignorar o mapa,
        matar o NPC que tinha 3 páginas de diálogo e ir na direção oposta.
        Toda aquela preparação? No lixo.
      </P>
      <P>
        O{" "}
        <ExtLink href="https://slyflourish.com/return_of_the_lazy_dm.html">
          Return of the Lazy Dungeon Master
        </ExtLink>{" "}
        de Mike Shea (Sly Flourish) propõe uma abordagem diferente: preparar{" "}
        <strong>apenas o essencial</strong> e confiar na improvisação para o resto.
        O método se resume em oito passos flexíveis, dos quais os mais importantes
        para um mestre iniciante são:
      </P>

      <H3>1. Revise os personagens</H3>
      <P>
        Antes de qualquer coisa, releia as fichas dos seus jogadores. Quais são os
        objetivos dos personagens? Quais ganchos de história eles têm? Uma sessão
        que conecta com o que os jogadores criaram é automaticamente mais envolvente
        do que qualquer roteiro pré-escrito.
      </P>

      <H3>2. Crie um começo forte</H3>
      <P>
        Não comece com "vocês estão numa taverna". Comece com ação, tensão ou uma
        decisão imediata. "A porta da taverna explode e três goblins entram gritando"
        é um começo que puxa os jogadores para dentro da história nos primeiros
        trinta segundos. O{" "}
        <ExtLink href="https://slyflourish.com/eight_steps_2023.html">
          Sly Flourish chama isso de Strong Start
        </ExtLink>{" "}
        , o passo mais impactante da preparação.
      </P>

      <H3>3. Esboce cenas, não roteiros</H3>
      <P>
        Pense em 3-5 cenas que <em>podem</em> acontecer durante a sessão. Não
        determine a ordem nem obrigue os jogadores a passar por todas. São
        possibilidades, não trilhos. Se os jogadores inventarem algo melhor,
        siga o fluxo.
      </P>

      <H3>4. Defina segredos e pistas</H3>
      <P>
        Anote 5-10 pedaços de informação que os jogadores podem descobrir durante
        a sessão. A chave, segundo Sly Flourish, é <strong>não vincular a pista a
        um local específico</strong>. Se você tem uma pista importante, ela pode
        aparecer em qualquer lugar: num livro, na conversa com um NPC, ou no bolso
        de um goblin morto. Isso garante que os jogadores encontrem a informação
        independente do caminho que escolham.
      </P>
      <P>
        Esse conceito se conecta diretamente com a{" "}
        <ExtLink href="https://thealexandrian.net/wordpress/1118/roleplaying-games/three-clue-rule">
          Regra das Três Pistas do The Alexandrian
        </ExtLink>
        : para cada conclusão que você quer que os jogadores cheguem, prepare pelo menos
        três pistas diferentes. Os jogadores vão ignorar a primeira, interpretar
        mal a segunda e, com sorte, usar a terceira para chegar aonde precisam.
      </P>

      <Tip>
        Se a informação é essencial para a aventura continuar, ela precisa de
        pelo menos três caminhos diferentes para ser descoberta. Se tem só um
        caminho, os jogadores <em>vão</em> perder.
      </Tip>

      <H3>5. Prepare monstros e encontros</H3>
      <P>
        Escolha 2-3 combates possíveis e tenha os stats dos monstros à mão. Você
        não precisa decorar, basta ter acesso rápido. Um{" "}
        <ProdLink href="/monstros">bestiário digital</ProdLink> resolve isso: busque o monstro
        por nome, veja HP, CA e ataques. A{" "}
        <ProdLink href="/calculadora-encontro">calculadora de encontros</ProdLink> ajuda a
        balancear a dificuldade para o nível do grupo.
      </P>

      <Tip>
        Toda essa preparação pode levar de 15 a 30 minutos. Se está gastando mais
        de uma hora para preparar uma sessão de 3-4 horas, provavelmente está
        preparando demais.
      </Tip>

      <H2>Sua primeira sessão: passo a passo</H2>

      <H3>Session Zero</H3>
      <P>
        Antes da primeira sessão de jogo, faça uma <strong>Session Zero</strong>:
        uma conversa com os jogadores sobre expectativas. Que tipo de jogo vocês
        querem? Mais combate ou mais interpretação? Algum tema que alguém prefere
        evitar? Isso alinha as expectativas e evita frustrações.
      </P>
      <P>
        Se os jogadores são iniciantes também, ofereça fichas pré-prontas. Criar
        personagem é divertido, mas pode levar horas. Fichas prontas deixam vocês
        jogarem mais rápido.
      </P>

      <H3>Comece com uma aventura curta</H3>
      <P>
        Não tente mestrar uma campanha de 50 sessões logo de cara. Comece com
        uma one-shot (aventura de uma sessão) ou uma mini-aventura de 2-3 sessões.
        A aventura introdutória do Starter Set (Minas Perdidas de Phandelver) é
        um clássico por um motivo: ela ensina o mestre enquanto ele joga.
      </P>

      <H3>Use a estrutura: ação, exploração, interação</H3>
      <P>
        O D&amp;D 5e se apoia em três pilares: combate, exploração e interação
        social. Uma boa sessão tem um pouco de cada. Se o combate está longo
        demais, encurte. Se os jogadores querem mais conversa com NPCs, deixe.
        Sinta o ritmo da mesa.
      </P>

      <H2>Combate: onde todo mestre iniciante trava (e como destavar)</H2>
      <P>
        Iniciativa, ataques, dano, magias, condições, reações, ataques de
        oportunidade... é muita coisa ao mesmo tempo. Mas você NÃO precisa
        lembrar de tudo. Precisa de um sistema que lembre por você.
      </P>

      <H3>Passo 1: Iniciativa e ordem de turnos</H3>
      <P>
        Peça para cada jogador rolar iniciativa (d20 + modificador de Destreza)
        e anote os resultados. Ordene do maior para o menor. Num{" "}
        <ProdLink href="/try">combat tracker como o Pocket DM</ProdLink>, você adiciona os
        personagens e monstros, rola iniciativa com um clique e a ordem se
        organiza automaticamente.
      </P>

      <H3>Passo 2: Ações simples</H3>
      <P>
        No turno de cada personagem: <strong>movimento + ação + possível ação
        bônus</strong>. Não se preocupe com todas as nuances de ações no início.
        O jogador quer atacar? Rola o d20, soma o modificador, compara com a CA
        do alvo. Acertou? Rola o dano. Próximo turno.
      </P>

      <H3>Passo 3: Rastreie HP e condições</H3>
      <P>
        Acompanhe os pontos de vida dos monstros e as{" "}
        <ProdLink href="/condicoes">condições ativas</ProdLink> (envenenado, atordoado, caído).
        Esquecer uma condição é um dos erros mais comuns e pode mudar o resultado
        de um combate inteiro. Usar uma ferramenta digital para isso elimina o
        problema: o tracker mostra visualmente quem está com qual condição.
      </P>

      <H3>Passo 4: Dano fixo para agilizar</H3>
      <P>
        Você sabia que o stat block de todo monstro tem um{" "}
        <strong>dano fixo</strong> entre parênteses? Em vez de rolar 2d6+3 para
        cada goblin, use o valor fixo (10, por exemplo). Isso acelera
        enormemente o combate, especialmente quando você controla vários monstros.
        Para mais dicas, veja nosso guia de{" "}
        <IntLink slug="como-agilizar-combate-dnd-5e">como agilizar o combate</IntLink>.
      </P>

      <Tip>
        Não tenha medo de narrar monstros fugindo ou se rendendo quando o combate
        já está decidido. Não é preciso matar todos até o último ponto de vida.
        Encerre combates que já perderam a tensão. Seus jogadores vão agradecer.
      </Tip>

      <H2>Quando o plano morre (e o jogo fica bom de verdade)</H2>
      <P>
        Os jogadores VÃO fazer algo que você não previu. Isso não é um
        problema, <strong>é o melhor do RPG</strong>. Improvisação não é
        inventar do nada. É reagir ao inesperado usando os elementos que
        você já preparou, só que numa ordem diferente.
      </P>

      <H3>Diga "sim, e..." ou "sim, mas..."</H3>
      <P>
        Quando um jogador tenta algo criativo, não diga "não" automaticamente.
        "Sim, você consegue subir no lustre, mas precisa de um teste de
        Acrobacia" mantém a ação fluindo e recompensa a criatividade. Reserve o
        "não" para coisas que quebram completamente a lógica do mundo.
      </P>

      <H3>Use as pistas flutuantes</H3>
      <P>
        Lembra dos segredos e pistas que você preparou sem vincular a um local
        específico? É aqui que eles brilham. Os jogadores decidiram ir para a
        floresta em vez da caverna? Sem problema. A pista que estava na caverna
        agora está num tronco de árvore oco. A informação chega aos jogadores
        por outro caminho.
      </P>

      <H3>Não tem resposta? Peça um teste</H3>
      <P>
        Se um jogador pergunta algo que você não preparou, peça um teste de
        habilidade. O resultado te dá tempo de pensar: "Você rola Investigação...
        17? Ok, você percebe que..." Esses dois segundos são suficientes para
        inventar algo coerente.
      </P>

      <Tip>
        Anote o que você improvisou durante a sessão. Aquela taverna que você
        inventou na hora? O nome do NPC que saiu do nada? Escreva tudo depois da
        sessão. Essas anotações viram o material mais rico para as próximas sessões.
      </Tip>

      <H2>Erros que eu cometi (e você provavelmente vai cometer também)</H2>
      <P>
        Reconhecer esses erros antecipadamente não significa que você vai
        evitar todos. Mas pelo menos vai saber o nome do monstro que te
        mordeu:
      </P>

      <H3>1. Preparar demais (e sofrer quando os jogadores desviam)</H3>
      <P>
        Se você escreveu 10 páginas de plot, vai se frustrar quando os jogadores
        ignorarem 8 delas. Prepare situações e possibilidades, não roteiros
        lineares. Use o{" "}
        <ExtLink href="https://slyflourish.com/rotldm_template.html">
          template de preparação do Lazy DM
        </ExtLink>{" "}
        como guia.
      </P>

      <H3>2. Tentar controlar a história</H3>
      <P>
        O mestre cria o mundo, mas não controla o que os jogadores fazem nele.
        Se você precisa que os jogadores cheguem a um ponto específico, use pistas
        e incentivos, não force a barra. Trilhos invisíveis são aceitáveis;
        trilhos que os jogadores percebem destroem a imersão.
      </P>

      <H3>3. Travar em regras durante o jogo</H3>
      <P>
        Se não souber uma regra, tome uma decisão rápida e siga em frente. "Vamos
        fazer assim por agora e eu confiro depois" é perfeitamente aceitável.
        Parar 10 minutos para procurar no livro mata o ritmo da sessão.
      </P>

      <H3>4. Desequilibrar encontros sem querer</H3>
      <P>
        Um combate muito fácil é entediante; muito difícil pode matar o grupo
        sem chance. Use a{" "}
        <ProdLink href="/calculadora-encontro">calculadora de encontros</ProdLink> para ter
        uma ideia da dificuldade antes da sessão. E lembre-se: você pode ajustar
        HP dos monstros durante o combate se perceber que errou a mão.
      </P>

      <H3>5. Esquecer que você também é jogador</H3>
      <P>
        Mestrar é trabalho, mas também é diversão. Se você está se sentindo
        sobrecarregado, simplifique. Use ferramentas que tirem peso de cima de
        você: um <ProdLink href="/try">combat tracker</ProdLink> para gerenciar combate, um{" "}
        <ProdLink href="/monstros">bestiário digital</ProdLink> para consultar stats, um{" "}
        <ProdLink href="/magias">oráculo de magias</ProdLink> para resolver dúvidas dos
        jogadores. Quanto menos tempo você gasta com burocracia mecânica, mais
        tempo sobra para narrar, interpretar e se divertir.
      </P>

      <H2>O kit de sobrevivência do mestre iniciante</H2>
      <P>
        Caneta e papel funcionam. Mas se ferramentas digitais podem tirar peso
        das suas costas pra você focar na narrativa, por que não?
      </P>
      <Ul>
        <Li>
          <strong>Combat tracker:</strong> gerencia iniciativa, HP, condições e
          turnos. O <ProdLink href="/try">Pocket DM</ProdLink> é gratuito, funciona no celular
          e não exige que seus jogadores criem conta.
        </Li>
        <Li>
          <strong>Bestiário digital:</strong> consulte stats de{" "}
          <ProdLink href="/monstros">monstros SRD</ProdLink> instantaneamente em vez de
          folhear o livro.
        </Li>
        <Li>
          <strong>Oráculo de magias:</strong> quando o jogador perguntar "o que
          Fireball faz mesmo?", basta buscar em{" "}
          <ProdLink href="/magias">magias</ProdLink> e ler a descrição em segundos.
        </Li>
        <Li>
          <strong>Calculadora de encontros:</strong> use a{" "}
          <ProdLink href="/calculadora-encontro">calculadora</ProdLink> para verificar se o
          combate que você planejou está no nível certo de dificuldade.
        </Li>
        <Li>
          <strong>Referência de condições:</strong> tenha a lista de{" "}
          <ProdLink href="/condicoes">condições do D&amp;D 5e</ProdLink> sempre à mão para
          não esquecer o que cada uma faz.
        </Li>
      </Ul>

      <Tip>
        Ferramentas não substituem criatividade, mas eliminam a parte tediosa.
        Quanto menos tempo você gasta somando HP em papelzinho, mais tempo sobra
        para descrever como o golpe do bárbaro faz o goblin voar pela janela
        da taverna.
      </Tip>

      <H2>Depois da primeira sessão</H2>
      <P>
        Você sobreviveu. A sessão acabou, provavelmente com falhas, improvisos
        e momentos inesperadamente brilhantes. E agora?
      </P>
      <Ul>
        <Li>
          <strong>Peça feedback:</strong> pergunte aos jogadores o que curtiram
          e o que pode melhorar. Seja específico: "O combate estava longo demais?"
          é melhor que "O que vocês acharam?"
        </Li>
        <Li>
          <strong>Anote o que aconteceu:</strong> decisões dos jogadores, NPCs
          que apareceram, ganchos que ficaram abertos. Essas notas são ouro para
          a próxima sessão.
        </Li>
        <Li>
          <strong>Não se cobre demais.</strong> Sua primeira sessão não vai ser
          perfeita. Nem a décima. E tudo bem. Mestrar é uma habilidade que melhora
          com prática, não com perfeição.
        </Li>
        <Li>
          <strong>Estude um pouco:</strong> leia um artigo do{" "}
          <ExtLink href="https://slyflourish.com/">Sly Flourish</ExtLink>,
          assista um episódio da série{" "}
          <ExtLink href="https://mcdm.fandom.com/wiki/Running_the_Game">
            Running the Game
          </ExtLink>{" "}
          do Matt Colville. Não para copiar, mas para pegar ideias e incorporar
          ao seu estilo.
        </Li>
      </Ul>

      <H2>Conclusão: o mestre que sua mesa precisa é você</H2>
      <P>
        Mestrar D&amp;D pela primeira vez dá nervosismo, e isso é normal. Mas
        lembre: seus jogadores não estão te avaliando, eles querem se
        divertir tanto quanto você. Uma sessão imperfeita onde todo mundo ri é
        infinitamente melhor do que uma sessão "perfeita" que nunca acontece
        porque o mestre ficou com medo de começar.
      </P>
      <P>
        Prepare pouco, improvise com confiança, use ferramentas que simplifiquem
        a mecânica e, acima de tudo, lembre que RPG é sobre histórias
        compartilhadas. Você vai errar regras, vai esquecer{" "}
        <IntLink slug="guia-condicoes-dnd-5e">condições</IntLink>, vai
        inventar NPCs com nomes ridículos na hora. E seus jogadores vão adorar
        cada segundo. Para aprofundar, leia nosso{" "}
        <IntLink slug="como-usar-pocket-dm-tutorial">tutorial completo do Pocket DM</IntLink>{" "}
        e o{" "}
        <IntLink slug="como-montar-encontro-balanceado-dnd-5e">guia de encontros balanceados</IntLink>.
      </P>
      <P>
        Agora é com você: reúna o grupo, prepare um começo forte e jogue.
      </P>

      <EbookCTA variant="inline" />

      <CTA category="tutorial" />
    </>
  );
}
