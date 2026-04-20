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

export default function BlogPost17() {
  return (
    <>
      <P>
        Se você ainda anota HP num caderno ou naquela planilha do Google com 15
        colunas, eu te entendo. Fiz isso por anos. Funcionava quando o encontro
        tinha 3 goblins. Mas aí veio aquela sessão com 8 criaturas, 5 jogadores
        e um dragão com resistência a fogo. Eu errei a conta do HP duas vezes,
        matei um monstro que ainda tava vivo, e o combate durou quase uma hora.
        Foi a última vez que usei papel.
      </P>

      <Img src="/art/blog/combat-hp-panel.png" alt="Pocket DM — painel de HP com barras visuais e tiers de dano em combate ativo" />

      <H2>Por que planilhas de HP não funcionam?</H2>
      <P>
        Planilha parece a solução óbvia. Mas ela tem uns problemas que só
        aparecem quando a mesa esquenta:
      </P>
      <Ul>
        <Li>
          Você erra conta. Sério. Subtrai 14, subtrai 7, subtrai 22... em algum
          momento a matemática escorrega. Mestres no r/DMAcademy relatam erros
          em 1 a cada 4 encontros.
        </Li>
        <Li>
          Cada ataque te tira da narração. Você tá descrevendo a garra do ogre
          rasgando a armadura e de repente precisa achar a célula B7, subtrair
          13, conferir se morreu. Mata o clima.
        </Li>
        <Li>
          Os jogadores ficam no escuro. Ninguém sabe se o monstro tá quase
          morrendo ou com HP cheio. Aí vem a pergunta de sempre: &quot;como ele
          tá?&quot;. Toda. Rodada.
        </Li>
        <Li>
          HP temporário vira pesadelo. Aquele Armor of Agathys com HP temp,
          mais a resistência a frio, mais o dano normal... vira uma sopa de
          parênteses e asteriscos que ninguém entende.
        </Li>
      </Ul>

      <Tip linkHref="/try" linkText="Testar o Pocket DM">
        No Pocket DM, cada monstro tem uma barra de HP que muda de cor conforme
        apanha. Você só digita o dano. Sem conta, sem erro, sem planilha.
      </Tip>

      <SectionDivider src="/art/blog/treated-nobg/dnd-character-human-female-barbarian-with-an-angry-look.png" alt="Barbarian furiosa" />

      <H2>Como rastrear HP no D&D 5e sem enlouquecer?</H2>
      <P>
        Resposta curta: usa um tracker digital com barras visuais. Resposta
        longa: o segredo não é só automatizar a conta, é mostrar a informação de
        um jeito que todo mundo na mesa entenda num relance.
      </P>
      <P>
        O melhor sistema que eu encontrei pra isso são os tiers de dano. Em vez
        de mostrar &quot;o goblin tem 4 HP&quot;, você mostra uma barra vermelha
        piscando. O jogador sabe que tá quase. Não precisa do número.
      </P>

      <H3>Os 4 tiers de dano: LIGHT, MODERATE, HEAVY, CRITICAL</H3>
      <P>
        A barra de HP é dividida em 4 faixas. Cada uma tem uma cor e manda uma
        mensagem clara:
      </P>
      <Ul>
        <Li>
          LIGHT (acima de 70%) — barra verde. A criatura mal sentiu. O combate
          ainda tá no começo.
        </Li>
        <Li>
          MODERATE (40-70%) — barra amarela. Já apanhou bastante. Hora de
          considerar focar fogo pra derrubar logo.
        </Li>
        <Li>
          HEAVY (10-40%) — barra laranja. Visivelmente ferido. Monstros
          inteligentes começam a cogitar fuga. Um ou dois golpes bons resolvem.
        </Li>
        <Li>
          CRITICAL (abaixo de 10%) — barra vermelha. Um golpe mata. Gasta o
          ataque pra finalizar ou muda de alvo?
        </Li>
      </Ul>
      <P>
        Esses limiares (70%, 40%, 10%) n��o são números aleatórios. São os pontos
        do combate onde as decisões táticas mudam. E quando o jogador VÊ a barra
        mudando de cor, ele sente a pressão sem você precisar descrever nada.
      </P>

      <EbookCTA variant="inline" />

      <H2>O que muda quando os jogadores veem o HP?</H2>
      <P>
        Parece loucura, né? &quot;Mostrar HP pros jogadores?&quot; Mas escuta:
        você não mostra o número. Mostra a faixa de cor. E isso muda tudo.
      </P>
      <P>
        O Barbarian vê que o Ogre tá na faixa laranja. Ele sabe que um Reckless
        Attack pode finalizar. Não precisa perguntar. O Cleric vê que o Fighter
        tá vermelho. Cura na hora, sem esperar a vez pra perguntar &quot;quanto
        de HP você tem?&quot;.
      </P>
      <P>
        Mesas que usam barras visuais de HP reportam combates 40-50% mais
        rápidos. Não porque rola menos dado, mas porque ninguém para pra
        perguntar nada. A informação tá ali, na tela, em tempo real.
      </P>

      <Img src="/art/blog/combat-conditions.png" alt="Pocket DM — condições e HP visíveis para todos os jogadores durante o combate" />

      <H2>Como funciona no Pocket DM?</H2>
      <P>
        O{" "}
        <ProdLink href="/try">Pocket DM</ProdLink> já faz tudo isso
        automaticamente. O fluxo é esse:
      </P>
      <Ul>
        <Li>
          Adiciona os monstros do{" "}
          <ProdLink href="/monstros">compêndio</ProdLink>. O HP máximo já vem
          preenchido do stat block oficial.
        </Li>
        <Li>
          No combate, digita o dano. A barra atualiza na hora com a cor do tier
          certo.
        </Li>
        <Li>
          Os jogadores veem tudo no celular via QR Code. Acabou o &quot;como ele
          tá?&quot;.
        </Li>
        <Li>
          HP temporário fica separado, com indicação visual própria. Sem
          confusão.
        </Li>
        <Li>
          Cura? Digita o valor positivo. A barra sobe. Simples.
        </Li>
      </Ul>

      <Tip>
        Montar um combate inteiro no Pocket DM leva menos de 60 segundos. Tenta
        fazer isso numa planilha.
      </Tip>

      <H2>E se eu quiser esconder o HP dos jogadores?</H2>
      <P>
        Entendo quem prefere manter segredo. Mas pensa no tradeoff: seus
        jogadores perdem informação tática e ficam mais passivos. O meio-termo
        que funciona é mostrar as faixas de cor sem mostrar o número exato. O
        jogador sabe que o monstro tá &quot;mal&quot;, mas não sabe se faltam 3
        ou 30 HP.
      </P>
      <P>
        Essa é a recomendação de mestres experientes no{" "}
        <ExtLink href="https://www.reddit.com/r/DMAcademy/">r/DMAcademy</ExtLink>{" "}
        e nos livros do{" "}
        <ExtLink href="https://slyflourish.com/sharing_hit_points.html">Sly Flourish</ExtLink>.
        Transparência não mata a tensão. Mata a burocracia.
      </P>

      <H2>Resumo: 3 passos pra sair do papel</H2>
      <Ul>
        <Li>
          Larga o caderno e a planilha. A economia de tempo começa aqui.
        </Li>
        <Li>
          Usa um tracker com barras visuais e tiers de dano. Seus jogadores vão
          tomar decisões melhores quando virem o campo de batalha.
        </Li>
        <Li>
          Compartilha o combate via QR Code. Cada jogador acompanha no celular.
          Zero papel, zero pergunta, zero espera.
        </Li>
      </Ul>
      <P>
        O combate médio cai de 60 pra 25 minutos. Os jogadores ficam engajados.
        Você foca em narrar em vez de calcular. Pra mais dicas, leia nosso{" "}
        <IntLink slug="como-agilizar-combate-dnd-5e">guia de 10 dicas pra agilizar combate</IntLink>{" "}
        e o{" "}
        <IntLink slug="guia-condicoes-dnd-5e">guia completo de condições</IntLink>.
      </P>

      <EbookCTA variant="inline" />
    </>
  );
}
