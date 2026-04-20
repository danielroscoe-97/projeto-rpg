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

export default function BlogPost18() {
  return (
    <>
      <P>
        Sabe aquele combate que começou empolgante e 40 minutos depois metade da
        mesa tá no celular? Quase nunca é culpa do sistema. Na maioria das vezes,
        são uns erros de processo que a gente nem percebe que tá cometendo. Erros
        que transformam um encontro de 20 minutos numa maratona de 1 hora.
      </P>
      <P>
        Aqui estão os 7 mais comuns. Pra cada um, tem uma solução prática que
        você aplica na próxima sessão.
      </P>

      <Img src="/art/blog/combat-active.png" alt="Pocket DM — combate ativo com iniciativa visual e barras de HP" />

      <H2>Erro #1: Anotar iniciativa no papel</H2>
      <P>
        &quot;Quanto você tirou? 14? E você? 18? Peraí, o ranger tirou
        quanto?&quot; Esse ritual leva 3 a 5 minutos por encontro. Em sessões
        com 3 combates, são 15 minutos perdidos só em setup. Dá pra rolar uma
        cena narrativa inteira nesse tempo.
      </P>
      <P>
        A solução: distribui. No{" "}
        <ProdLink href="/try">Pocket DM</ProdLink>, cada jogador coloca a
        própria iniciativa pelo celular via QR Code. A ordem aparece na tela de
        todo mundo em segundos. Acabou o &quot;quanto você tirou?&quot;.
      </P>

      <H2>Erro #2: Só o mestre vê o HP</H2>
      <P>
        Quando só você sabe o HP, os jogadores ficam cegos. Não sabem se focam
        fogo no ogre ferido ou trocam pro goblin intacto. Aí vem a pergunta de
        sempre: &quot;como ele tá?&quot;. Toda rodada. Isso mata o ritmo e a
        tensão.
      </P>
      <P>
        Mostra barras de HP com faixas de cor. Verde, amarelo, laranja, vermelho.
        O jogador sabe que o monstro tá mal sem saber o número exato. Decisões
        táticas na hora. Sem pergunta. Tem mais sobre isso no nosso{" "}
        <IntLink slug="como-gerenciar-hp-dnd-5e">guia de HP visual</IntLink>.
      </P>

      <H2>Erro #3: Ninguém sabe de quem é a vez</H2>
      <P>
        &quot;Sua vez.&quot; &quot;Eu? Ah, peraí, deixa eu ver...&quot; Sem
        indicação visual de quem tá agindo, todo turno começa com 10 segundos de
        confusão. Multiplica por 30 turnos num combate e são 5 minutos jogados
        fora. E o pior: quem tá &quot;longe&quot; da vez desliga e vai pro
        Instagram.
      </P>
      <P>
        Usa um tracker que destaque o turno atual e mostre quem é o próximo.
        Quando o jogador vê que é o próximo, ele já começa a planejar. O avanço
        automático elimina aquela pausa entre ações.
      </P>

      <SectionDivider src="/art/blog/treated-nobg/dnd-character-dwarf-male-cleric-in-heavy-shiny-armor.png" alt="Anão clérigo em armadura reluzente" />

      <H2>Erro #4: Calcular tudo na hora</H2>
      <P>
        Você tá narrando a investida do ogre e de repente para pra rolar 2d8+4,
        somar, verificar resistência, subtrair do HP, anotar. Cada cálculo leva
        10 a 20 segundos. Com 6 monstros por rodada, são 2 minutos de
        matemática pura. Ninguém tá jogando. Todo mundo tá esperando você fazer
        conta.
      </P>
      <P>
        Usa dano médio. Tá ali no stat block, o número antes dos parênteses. O
        Ogre faz 2d8+4? Usa 13. Pronto. O{" "}
        <ExtLink href="https://slyflourish.com/tips_to_speed_up_combat.html">Sly Flourish</ExtLink>{" "}
        estima que menos de 10% dos mestres usam dano fixo, mas os que usam
        cortam o combate em 20-30%.
      </P>

      <EbookCTA variant="inline" />

      <H2>Erro #5: Esquecer condições</H2>
      <P>
        O Wizard gasta um slot de 2o nível pra lançar Hold Person. O goblin fica
        Paralyzed. Duas rodadas depois, ninguém lembra. O goblin continua
        agindo normalmente. O Wizard se sente ignorado. Você percebe 3 turnos
        depois. Constrangedor e injusto com o jogador que investiu o recurso.
      </P>
      <P>
        Rastreia condições visualmente, do lado do HP. No Pocket DM, condições
        aparecem como badges na ficha do combatente. Todo mundo vê quem tá
        Poisoned, Stunned ou Prone. Referência rápida no nosso{" "}
        <IntLink slug="guia-condicoes-dnd-5e">guia completo de condições</IntLink>.
      </P>

      <H2>Erro #6: Preparar demais</H2>
      <P>
        Você passa 2 horas montando um encontro com terrain dinâmico, 4 tipos de
        monstros e um plano tático elaborado. Na mesa, o Wizard solta Fireball
        na rodada 1 e elimina metade. Todo aquele preparo virou pó. E a
        frustração te faz preparar ainda mais da próxima vez, num ciclo vicioso.
      </P>
      <P>
        O método{" "}
        <ExtLink href="https://slyflourish.com/returnofthelazydm/">Lazy DM</ExtLink>{" "}
        resolve: prepara o mínimo (monstros + motivação) e improvisa o resto. O{" "}
        <ProdLink href="/monstros">compêndio do Pocket DM</ProdLink> tem 1.100+
        monstros prontos. Busca, adiciona, começa. 2 minutos de prep em vez de 2
        horas. Mais sobre isso no{" "}
        <IntLink slug="como-montar-encontro-balanceado-dnd-5e">guia de encontros balanceados</IntLink>.
      </P>

      <H2>Erro #7: Fazer tudo na mão</H2>
      <P>
        HP no caderno. Iniciativa na cabeça. Condições na memória. Stat blocks em
        5 abas de PDF. Cada tarefa dessas é pequena, mas juntas viram uma carga
        mental que compete direto com a narração e a improvisação. Resultado: um
        mestre sobrecarregado que não faz nenhuma dessas coisas bem.
      </P>
      <P>
        Um{" "}
        <ProdLink href="/try">combat tracker</ProdLink> não substitui você. Ele
        te libera pra ser mestre. Automatiza o mecânico (iniciativa, HP, turno,
        condições) e te deixa focar no humano: narrar, improvisar, reagir. Veja
        nosso{" "}
        <IntLink slug="como-usar-combat-tracker-dnd-5e">guia de combat tracker</IntLink>{" "}
        pra ver como funciona na prática.
      </P>

      <Img src="/art/blog/combat-setup.png" alt="Pocket DM — setup de combate com monstros do compêndio SRD" />

      <Tip linkHref="/try" linkText="Testar o Pocket DM">
        Os erros 1, 2, 3, 5 e 7 somem automaticamente com um tracker que tem HP
        visual, iniciativa automática e rastreamento de condições. O Pocket DM
        faz tudo de graça. Sem cadastro, sem download.
      </Tip>

      <H2>Resumo: 7 erros, 7 soluções</H2>
      <P>
        Cada erro desses adiciona 5 a 10 minutos no combate. Corrige todos e o
        encontro cai pela metade: de 60 pra 25-30 minutos. A maioria das
        soluções nem precisa de tecnologia: dano fixo, menos tipos de monstro,
        monstros que fogem. Mas as que precisam de ferramenta ficam muito mais
        fáceis com um tracker digital. O ponto não é depender de tecnologia. É
        te liberar pra focar na história em vez de fazer burocracia.
      </P>

      <EbookCTA variant="inline" />
    </>
  );
}
