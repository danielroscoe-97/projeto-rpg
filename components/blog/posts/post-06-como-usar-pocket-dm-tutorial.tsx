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

export default function BlogPost6() {
  return (
    <>
      <P>
        Vou ser direto: em 2 minutos você vai do zero a um combate rodando com
        monstros, iniciativa e seus jogadores acompanhando tudo no celular.
        Sem instalar nada, sem criar conta se não quiser. Esse tutorial mostra
        cada passo com screenshots, é acompanhar e fazer.
      </P>

      <H2>Passo 1: Acessar o Pocket DM</H2>
      <P>
        Acesse{" "}
        <ExtLink href="https://pocketdm.com.br/try">pocketdm.com.br/try</ExtLink>{" "}
        para entrar no modo visitante. Não precisa criar conta, você pode
        experimentar tudo gratuitamente. Se quiser salvar campanhas e convidar
        jogadores por link, crie uma conta depois.
      </P>

      <Img src="/art/blog/combat-setup.png" alt="Tela inicial do Pocket DM — Novo Encontro com busca de monstros SRD" />

      <H2>Passo 2: Adicionar Monstros</H2>
      <P>
        Na barra de busca {"\u201C"}Pesquisar Monstros SRD{"\u201D"}, digite o nome do monstro
        que quer adicionar. O Pocket DM tem 1.200+ monstros do{" "}
        <ExtLink href="https://5e.d20srd.org/">SRD (System Reference Document)</ExtLink>{" "}
        + monstros do compêndio{" "}
        <ExtLink href="https://www.reddit.com/r/monsteraday/">Monster a Day</ExtLink>,{" "}
        com stat blocks completos: HP, CA, ataques, habilidades e Challenge
        Rating.
      </P>
      <P>
        Clique em <strong>{"\u201C"}Adicionar{"\u201D"}</strong> para colocar o monstro no
        encontro. Você pode adicionar vários do mesmo tipo usando o botão
        <strong> {"\u201C"}+2 grupo{"\u201D"}</strong> para combates com múltiplos inimigos.
      </P>

      <Img src="/art/blog/monster-search.png" alt="Busca de monstros no Pocket DM — resultados para 'Dragon' com CR, HP e AC" />

      <Tip>
        Você também pode adicionar jogadores e NPCs manualmente clicando em
        {"\u201C"}+ Monstro/Jogador Manual{"\u201D"}. Só o nome é obrigatório, HP, CA e
        iniciativa são opcionais.
      </Tip>

      <H2>Passo 3: Configurar Iniciativa</H2>
      <P>
        Cada combatente precisa de um valor de iniciativa para definir a ordem
        dos turnos. Você tem três opções:
      </P>
      <Ul>
        <Li>
          <strong>Rolar Todos:</strong> o Pocket DM rola d20 + modificador de
          DEX para todos os combatentes de uma vez
        </Li>
        <Li>
          <strong>Rolar NPCs:</strong> rola só para os monstros (útil quando
          os jogadores já rolaram seus próprios dados)
        </Li>
        <Li>
          <strong>Manual:</strong> clique no número de iniciativa de cada
          combatente e digite o valor
        </Li>
      </Ul>

      <Img src="/art/blog/combat-with-monsters.png" alt="Encontro montado com 4 monstros — Red Dragon Wyrmling, Goblin, Orc e Skeleton com iniciativa e stats" />

      <H2>Passo 4: Iniciar o Combate</H2>
      <P>
        Clique em <strong>{"\u201C"}Iniciar Combate{"\u201D"}</strong>. O Pocket DM ordena
        todos os combatentes por iniciativa e marca quem age primeiro. A partir
        daqui, o combate roda turno a turno:
      </P>
      <Ul>
        <Li>O combatente ativo fica destacado com borda dourada</Li>
        <Li>Clique <strong>{"\u201C"}Próximo Turno{"\u201D"}</strong> para avançar para o próximo combatente</Li>
        <Li>O contador de rodadas avança automaticamente</Li>
        <Li>O timer mostra quanto tempo a rodada está levando</Li>
      </Ul>

      <Img src="/art/blog/combat-active.png" alt="Combate ativo no Pocket DM — Rodada 1 com Goblin agindo, barras de HP e botões de ação" />

      <H2>Passo 5: Gerenciar HP</H2>
      <P>
        Clique no botão <strong>{"\u201C"}HP{"\u201D"}</strong> de qualquer combatente para
        abrir o painel de vida. Você pode:
      </P>
      <Ul>
        <Li><strong>Dano:</strong> aplicar dano (a barra de HP muda de cor conforme o nível de ferimento)</Li>
        <Li><strong>Curar:</strong> restaurar pontos de vida</Li>
        <Li><strong>Temp PV:</strong> adicionar pontos de vida temporários</Li>
      </Ul>
      <P>
        As barras de HP usam cores por tier:{" "}
        <span className="text-green-400">verde (100-70%)</span>,{" "}
        <span className="text-yellow-400">amarelo (70-40%)</span>,{" "}
        <span className="text-orange-400">laranja (40-10%)</span> e{" "}
        <span className="text-red-400">vermelho (&lt;10%)</span>.
        Os jogadores veem apenas o tier, não o valor exato, mantendo a tensão.
      </P>

      <Img src="/art/blog/combat-hp-panel.png" alt="Painel de HP no Pocket DM — opções de Dano, Curar e Temp PV com campo de valor" />

      <H2>Passo 6: Aplicar Condições</H2>
      <P>
        Clique no botão <strong>{"\u201C"}Cond{"\u201D"}</strong> para ver todas as 15{" "}
        <IntLink slug="guia-condicoes-dnd-5e">condições do D&D 5e</IntLink>.
        Clique em qualquer condição para aplicar: ela fica visível para o
        mestre e para os jogadores. Cada condição vem com a descrição das
        regras integrada, para consulta rápida durante o combate.
      </P>

      <Img src="/art/blog/combat-conditions.png" alt="Painel de condições — Cego, Encantado, Assustado, Agarrado e todas as 15 condições D&D 5e" />

      <H2>Passo 7: Convidar Jogadores</H2>
      <P>
        Clique em <strong>{"\u201C"}Compartilhar com jogadores{"\u201D"}</strong> no topo da
        página. O Pocket DM gera um link único que seus jogadores abrem no
        celular. Eles entram instantaneamente e veem:
      </P>
      <Ul>
        <Li>De quem é o turno atual</Li>
        <Li>A ordem de iniciativa completa</Li>
        <Li>O nível de HP de cada combatente (por tier, sem valor exato)</Li>
        <Li>Condições ativas</Li>
        <Li>Dados virtuais para rolar no celular</Li>
      </Ul>
      <P>
        Nenhum jogador precisa criar conta, baixar app ou instalar nada.
        Funciona em qualquer navegador moderno: Chrome, Safari, Firefox.
      </P>

      <H2>Passo 8: Usar o Bestiário e Oráculo de Magias</H2>
      <P>
        Durante o combate, você pode consultar o bestiário completo clicando em
        <strong> {"\u201C"}Ver Ficha{"\u201D"}</strong> em qualquer monstro: o stat block completo
        aparece sem sair da tela de combate.
      </P>
      <P>
        O <ProdLink href="/magias">oráculo de magias</ProdLink> permite buscar
        qualquer uma das 750+ magias SRD por nome, escola ou nível. Útil quando
        um jogador pergunta {"\u201C"}o que essa magia faz?{"\u201D"} e você precisa da
        resposta em 2 segundos.
      </P>

      <Img src="/art/blog/bestiary-index.png" alt="Bestiário SRD do Pocket DM — monstros organizados por letra com CR e tipo" />

      <H2>Passo 9: Música Ambiente</H2>
      <P>
        O Pocket DM tem mais de 12 presets de música ambiente integrados:
        taverna, dungeon, floresta, batalha épica, calmaria e mais. O ícone de
        música no topo do combate permite trocar a trilha a qualquer momento.
        Os jogadores ouvem no próprio celular.
      </P>

      <H2>Dicas para Aproveitar ao Máximo</H2>
      <Ul>
        <Li>
          <strong>Monte o encontro antes da sessão:</strong> adicione monstros
          e deixe tudo pronto. Na hora H, é só rolar iniciativa e começar.
        </Li>
        <Li>
          <strong>Use dano fixo dos monstros:</strong> o stat block já mostra
          o dano médio. Isso{" "}
          <IntLink slug="como-agilizar-combate-dnd-5e">agiliza muito o combate</IntLink>.
        </Li>
        <Li>
          <strong>Crie uma conta gratuita</strong> para salvar campanhas,
          reencontrar jogadores e manter histórico entre sessões.
        </Li>
        <Li>
          <strong>Explore o bestiário fora do combate,</strong> em{" "}
          <ProdLink href="/monstros">pocketdm.com.br/monstros</ProdLink>{" "}
          você pode navegar todos os monstros SRD com stat blocks completos.
        </Li>
      </Ul>

      <CTA category="tutorial" />

      <H2>Agora é com você</H2>
      <P>
        Isso é tudo. Monte o encontro, role iniciativa, jogue. Sem curva de
        aprendizado, sem instalação, sem surpresa. Se quiser entender mais
        sobre combat trackers em geral, tem o{" "}
        <IntLink slug="como-usar-combat-tracker-dnd-5e">guia completo de combat trackers</IntLink>{" "}
        e as{" "}
        <IntLink slug="ferramentas-essenciais-mestre-dnd-5e">5 ferramentas essenciais pra mestres</IntLink>.
      </P>
    </>
  );
}
