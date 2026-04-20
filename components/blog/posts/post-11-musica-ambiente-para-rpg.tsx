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

export default function BlogPost11() {
  return (
    <>
      <P>
        Imagine a cena: seus jogadores acabaram de entrar numa cripta esquecida,
        as tochas tremem, e ao fundo um coro grave ecoa entre as paredes de
        pedra. Ninguém precisa dizer que o lugar é perigoso: a música já contou.
        A trilha sonora certa transforma uma descrição verbal em algo que seus
        jogadores <em>sentem</em> na pele. E você não precisa ser DJ, ter
        equipamento caro ou gastar horas montando playlists para conseguir isso.
      </P>
      <P>
        Neste guia, vou compartilhar tudo que aprendi usando música ambiente para
        RPG nas minhas próprias sessões de D&D 5e, desde os erros de iniciante
        (spoiler: colocar a batalha de Pelennor Fields durante uma conversa na
        taverna é uma péssima ideia) até o setup que uso hoje, que leva menos de
        5 minutos para preparar e funciona em qualquer mesa presencial.
      </P>

      <H2>Por que isso faz tanta diferença?</H2>
      <P>
        O{" "}
        <ExtLink href="https://slyflourish.com/three_ways_to_use_music_in_your_game.html">
          Sly Flourish
        </ExtLink>,
        uma das maiores referências mundiais para mestres de D&D, destaca
        três funções da música na mesa: <strong>inspiração</strong> durante a
        preparação, <strong>ambientação</strong> durante o jogo e até{" "}
        <strong>mecânica</strong>, quando a trilha do personagem toca e ele ganha
        algum bônus narrativo. Mas o benefício mais imediato é simples: música
        preenche o silêncio.
      </P>
      <P>
        Sabe aquele momento em que você está descrevendo uma floresta encantada e
        alguém começa a mexer no celular? Uma camada sonora constante mantém a
        imersão mesmo nos micro-silêncios entre falas. Além disso, a música
        funciona como um <strong>sinal emocional</strong>: quando a trilha muda
        de calma para tensa, os jogadores percebem instintivamente que algo está
        para acontecer. Você ganha uma ferramenta narrativa poderosa sem precisar
        dizer uma palavra.
      </P>
      <Tip>
        Use a música como um "termômetro" da cena. Se os jogadores estão
        relaxados demais num lugar perigoso, mude a trilha para algo sombrio.
        Se o combate vencido virou uma celebração, troque para algo heroico e
        triunfante. A transição musical diz mais que mil palavras.
      </Tip>

      <SectionDivider src="/art/blog/treated-nobg/mythjourneys-dnd-character-dragonborn-male-bard.png" alt="Dragonborn bardo" />

      <H2>O soundboard que ja vem no seu tracker</H2>
      <P>
        A maioria dos mestres que usa musica na mesa faz malabarismo: uma aba
        pro Spotify, outra pro YouTube, outra pro combat tracker. Na hora H,
        o goblin ataca e voce ta trocando de aba pra achar a playlist de
        combate. O <ProdLink href="/try">Pocket DM</ProdLink> resolve isso
        com um soundboard embutido direto no tracker. Sons de ambiente,
        musicas tematicas, efeitos de ataque e magias, tudo com um clique,
        sem sair da tela de combate.
      </P>

      <Img src="/art/blog/soundboard-ambiente.png" alt="Soundboard do Pocket DM — presets de ambiente: Fogueira, Tempestade, Vento, Dungeon, Taverna, Floresta e mais" />

      <P>
        Sao 6 categorias de sons prontos pra usar:
      </P>
      <Ul>
        <Li>
          <strong>Ambiente:</strong> Fogueira, Tempestade, Vento, Dungeon,
          Chuva, Taverna, Floresta, Oceano, Riacho. Sons continuos que criam
          a camada de fundo perfeita pra qualquer cena. Clicou, ta tocando.
        </Li>
        <Li>
          <strong>Musicas:</strong> Batalha Epica, Marcha de Guerra, Exploracao,
          Dungeon Sombria, Misterio, Suspense, Corte Medieval e mais. Trilhas
          tematicas produzidas pra RPG, sem vocal, no volume certo.
        </Li>
        <Li>
          <strong>Ataques:</strong> Pancada, Golpe Sonico, Investida Devastadora,
          Clivagem, Flecha Certeira, Golpe de Espada. Efeitos sonoros rapidos
          pra pontuar momentos de combate. Quando o Fighter acerta um critico,
          dispara o som do golpe e a mesa inteira sente.
        </Li>
        <Li>
          <strong>Magias:</strong> efeitos sonoros de lancamento de magia,
          explosoes arcanas, curas. Pro Wizard que acabou de soltar um Fireball,
          o som faz toda a diferenca.
        </Li>
        <Li>
          <strong>Epico:</strong> trilhas de boss fight, momentos grandiosos,
          revelacoes. Reserve pra quando a cena pedir algo maior que o normal.
        </Li>
        <Li>
          <strong>Mundo:</strong> sons de cidade, mercado, porto, estrada.
          Pra construir o cenario antes do combate comecar.
        </Li>
      </Ul>

      <Img src="/art/blog/soundboard-musicas.png" alt="Soundboard do Pocket DM — presets de musicas: Batalha Epica, Marcha de Guerra, Exploracao, Dungeon Sombria e mais" />

      <P>
        A sacada e que tudo isso roda na mesma tela do combate. Voce nao troca
        de app, nao perde o turno, nao precisa de um segundo dispositivo. O
        Paladin declara Smite, voce clica no dano e dispara o som de Golpe de
        Espada. Tudo num fluxo so.
      </P>

      <Img src="/art/blog/soundboard-ataques.png" alt="Soundboard do Pocket DM — efeitos sonoros de ataques: Pancada, Golpe Sonico, Investida Devastadora, Cruz Sagrada e mais" />

      <Tip linkHref="/try" linkText="Testar o soundboard">
        O soundboard do Pocket DM e gratuito e funciona junto com o combat
        tracker. Abre o combate, monta o encontro, e os sons ja estao ali
        esperando. Um clique pra ambientar, um clique pra trocar pra combate,
        um clique pro efeito de ataque. Zero setup.
      </Tip>

      <H2>3 camadas de som cobrem 90% da sessao</H2>
      <P>
        Nao tente ter uma trilha diferente pra cada cena. Voce vai enlouquecer.
        Monte{" "}
        <strong>tres camadas base</strong> que cobrem 90% de tudo que acontece
        numa sessao. Essa abordagem vem do{" "}
        <ExtLink href="https://slyflourish.com/three_ways_to_use_music_in_your_game.html">
          Sly Flourish
        </ExtLink>{" "}
        e funciona incrivelmente bem — e com o soundboard do Pocket DM, cada
        camada e um clique:
      </P>

      <H3>1. Exploracao e Viagem</H3>
      <P>
        Trilhas calmas, instrumentais, com bastante espaco sonoro. Pense em
        caminhadas por florestas, navegacao, vilas pacatas, acampamentos
        noturnos. O objetivo e criar uma base suave que nao compete com a
        sua narracao. No Pocket DM, os presets de Floresta, Vento e Riacho
        fazem exatamente isso. Se preferir trilhas de jogos, <em>Skyrim</em>,{" "}
        <em>The Witcher 3</em> e <em>Breath of the Wild</em> sao perfeitas.
      </P>
      <Ul>
        <Li>Instrumentos: cordas, flauta, piano, harpa</Li>
        <Li>Andamento: lento a moderado</Li>
        <Li>Volume: baixo, como um murmurio de fundo</Li>
      </Ul>

      <H3>2. Tensao e Misterio</H3>
      <P>
        Sons sombrios, drones graves, cordas dissonantes. Use quando o grupo
        entra em dungeons, investiga um crime, ou quando algo sinistro esta
        prestes a acontecer. No soundboard, os presets de Dungeon, Suspense
        Sombrio e Misterio cobrem isso. A ideia e criar desconforto sutil —
        sem jump scares, so aquela sensacao de {'"'}tem algo errado aqui{'"'}.
      </P>
      <Ul>
        <Li>Instrumentos: cello grave, coros distantes, sons ambientes (vento, goteiras, correntes)</Li>
        <Li>Andamento: muito lento ou estatico</Li>
        <Li>Volume: baixo a medio, deixe os silencios trabalharem</Li>
      </Ul>

      <H3>3. Combate e Acao</H3>
      <P>
        Aqui e onde a musica pode brilhar mais. Percussao pesada, metais
        epicos, ritmo acelerado. A trilha de combate precisa ter energia sem
        ter letra, porque musicas com vocal distraem quando o mestre esta
        narrando. No Pocket DM, Batalha Epica, Marcha de Guerra e Batalha
        Final estao prontos pra disparar — e os efeitos de ataque (Pancada,
        Golpe de Espada, Investida) adicionam impacto nos momentos certos.
      </P>
      <Ul>
        <Li>Instrumentos: percussao taiko, metais, cordas rapidas, coro epico</Li>
        <Li>Andamento: rapido e constante</Li>
        <Li>Volume: medio, alto o suficiente para sentir, baixo o suficiente para ouvir o mestre</Li>
      </Ul>

      <Tip>
        Comece sua sessao SEMPRE com a camada de exploracao. Ela e neutra o
        suficiente para qualquer situacao inicial. Trocar da exploracao para
        o combate na hora certa e um dos momentos mais satisfatorios da mesa
        — e no soundboard do Pocket DM, e literalmente um clique.
      </Tip>

      <H2>Complementando com fontes externas</H2>
      <P>
        O soundboard do Pocket DM cobre o essencial direto no tracker, mas se
        voce quiser expandir com playlists mais longas ou sons especificos,
        estas fontes complementam bem:
      </P>
      <Ul>
        <Li>
          <strong><ExtLink href="https://tabletopaudio.com">Tabletop Audio</ExtLink>:</strong>{" "}
          melhor fonte gratuita de ambientacao, ganhador de tres ENnie Awards.
          Dezenas de ambientes de 10 minutos + SoundPad pra misturar efeitos.
        </Li>
        <Li>
          <strong>YouTube:</strong>{" "}
          <ExtLink href="https://www.youtube.com/@MichaelGhelfiStudios">Michael Ghelfi Studios</ExtLink>{" "}
          (5.000+ faixas),{" "}
          <ExtLink href="https://www.youtube.com/@Bardify">Bardify</ExtLink>{" "}
          (curadoria por situacao) e Sword Coast Soundscapes (ambientes canonicos de D&D).
        </Li>
        <Li>
          <strong>Spotify:</strong> busque {'"'}D&D ambient{'"'} ou {'"'}RPG combat music{'"'}.
          A colecao do{" "}
          <ExtLink href="https://www.michaelghelfistudios.com/spotify-playlists/">
            Michael Ghelfi no Spotify
          </ExtLink>{" "}
          e a mais completa, com playlists por tipo de cena.
        </Li>
        <Li>
          <strong><ExtLink href="https://syrinscape.com">Syrinscape</ExtLink>:</strong>{" "}
          motor de paisagem sonora profissional (US$ 12,99/mes). Mistura
          musica + efeitos em tempo real. Vale se voce quer o maximo de
          imersao e nao liga de pagar.
        </Li>
      </Ul>

      <Tip>
        Se usar Spotify gratuito, baixe offline. Nada quebra mais a imersao
        do que um anuncio no meio de um combate epico contra um dragao. O
        soundboard do Pocket DM nao tem ads — e gratuito e funciona offline
        depois de carregado.
      </Tip>

      <H2>A regra de ouro do volume (que todo mundo quebra)</H2>
      <P>
        O erro #1 de quem começa a usar música na mesa: volume alto demais.
        A regra é uma só:{" "}
        <strong>
          se você precisa levantar a voz para ser ouvido acima da música,
          está alto demais
        </strong>
        . A música deve ser uma camada de fundo, presente, mas nunca
        competindo com as vozes na mesa.
      </P>
      <Ul>
        <Li>
          <strong>Exploração e roleplay:</strong> volume em ~20-25% do máximo
          da caixa de som
        </Li>
        <Li>
          <strong>Tensão e mistério:</strong> volume em ~15-20%, aqui o
          silêncio relativo é seu aliado
        </Li>
        <Li>
          <strong>Combate:</strong> volume em ~30-35%, pode ser um pouco
          mais alto para criar energia, mas ainda abaixo da conversa
        </Li>
        <Li>
          <strong>Boss fight:</strong> até ~40% nos momentos mais épicos,
          mas reduza quando precisar narrar algo importante
        </Li>
      </Ul>
      <P>
        Uma técnica que funciona bem: comece com volume mais baixo do que
        você acha necessário. Depois de 5 minutos, pergunte aos jogadores se
        está bom. Ajustar para cima é fácil; começar alto demais e baixar
        depois de incomodar já quebrou a imersão.
      </P>

      <H2>Silêncio também é uma ferramenta</H2>
      <P>
        Música ambiente não é obrigatória em toda cena, e saber quando{" "}
        <em>não</em> usar é tão importante quanto saber quando usar.
      </P>
      <Ul>
        <Li>
          <strong>Diálogos intensos de roleplay:</strong> quando dois
          jogadores estão numa cena emocional profunda, silêncio total pode
          ser mais poderoso que qualquer trilha.
        </Li>
        <Li>
          <strong>Momentos de planejamento:</strong> quando o grupo está
          discutindo estratégia, a música pode atrapalhar a concentração.
          Desligue ou abaixe ao mínimo.
        </Li>
        <Li>
          <strong>Quando a mesa pede:</strong> alguns jogadores são sensíveis
          a estímulos sonoros. Se alguém pedir para desligar, desligue sem
          drama. A diversão do grupo sempre vem primeiro.
        </Li>
        <Li>
          <strong>Se você está sobrecarregado:</strong> mestrar já é
          multitarefa o suficiente. Se gerenciar a trilha sonora está
          tirando sua atenção do jogo, simplifique ou elimine. Uma sessão
          sem música mas com um mestre presente é infinitamente melhor que
          uma sessão com trilha perfeita e um mestre distraído.
        </Li>
      </Ul>

      <Tip>
        Silêncio repentino é uma das ferramentas mais poderosas do seu
        arsenal. Se a música está tocando há uma hora e você subitamente
        pausa tudo, os jogadores vão sentir que algo mudou. Use isso antes
        de uma revelação importante ou quando um vilão aparece. O contraste
        é devastador.
      </Tip>

      <H2>Nunca usou? Comece assim (leva 2 minutos)</H2>
      <P>
        Se voce nunca colocou musica na mesa e quer testar na proxima sessao:
      </P>
      <Ul>
        <Li>
          Abra o <ProdLink href="/try">Pocket DM</ProdLink> e monte um
          encontro rapido com qualquer monstro
        </Li>
        <Li>
          Clique no soundboard e ative o preset de Taverna enquanto os
          jogadores chegam
        </Li>
        <Li>
          Quando o combate comecar, troque pra Batalha Epica com um clique
        </Li>
        <Li>
          Dispare efeitos de ataque nos momentos certos — Golpe de Espada
          no critico do Fighter, explosao no Fireball do Wizard
        </Li>
        <Li>
          Pos-combate, volte pra Exploracao ou Floresta
        </Li>
        <Li>
          Pronto. Voce acabou de usar musica ambiente pela primeira vez.
          Sem setup, sem app separado, sem malabarismo de abas.
        </Li>
      </Ul>

      <P>
        Tres camadas de som, um soundboard embutido no tracker, e a
        consciencia de quando subir, baixar ou silenciar. E isso. Comece
        simples, experimente por 2-3 sessoes, e va refinando. Cada mesa tem
        sua personalidade sonora. Voce vai encontrar a da sua. Veja tambem
        as{" "}
        <IntLink slug="ferramentas-essenciais-mestre-dnd-5e">
          ferramentas essenciais pra mestres
        </IntLink>{" "}
        e as{" "}
        <IntLink slug="como-agilizar-combate-dnd-5e">
          10 dicas pra agilizar combate
        </IntLink>.
      </P>

      <CTA category="guia" />
    </>
  );
}
