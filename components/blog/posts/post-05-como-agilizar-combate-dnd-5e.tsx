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

export default function BlogPost5() {
  return (
    <>
      <P>
        O combate tem 4 ogres, 6 goblins e um hobgoblin mago. Já são 40
        minutos, só dois jogadores agiram, e o Cleric tá no celular esperando
        o turno dele chegar. Se você já viveu isso, sabe: combate lento não
        mata personagens — mata sessões. Aqui vão 10 coisas que funcionam de
        verdade pra resolver isso.
      </P>

      <H2>1. Dano fixo: a dica que ninguém usa (e deveria)</H2>
      <P>
        Todo stat block tem um número antes dos parênteses: é o dano médio.
        O ogre faz 2d8+4? Usa 13. Pronto. Sem rolar dado pra cada ataque de
        cada monstro. O{" "}
        <ExtLink href="https://slyflourish.com/tips_to_speed_up_combat.html">Sly Flourish</ExtLink>{" "}
        estima que menos de 10% dos mestres fazem isso. Os outros 90% estão
        perdendo tempo rolando 2d6+3 pro quinto goblin do turno.
      </P>

      <H2>2. Menos tipos de monstro = menos dor de cabeça</H2>
      <P>
        4 ogres é rápido de rodar. 2 ogres + 6 goblins + 1 hobgoblin mago é
        um pesadelo logístico: 3 stat blocks diferentes, 3 CAs diferentes,
        3 listas de habilidades. Se quer velocidade, simplifique a composição.
        Variedade tática é ótima quando você tem ferramenta; sem ela, é puro
        caos.
      </P>

      <H2>3. Troque o papel por um tracker digital</H2>
      <P>
        Riscar HP no papel, perder a conta, reescrever, achar que o monstro
        morreu mas na verdade tinha HP temporário... já deu. Um{" "}
        <ProdLink href="/try">combat tracker digital</ProdLink> com barras de
        HP visuais e avanço automático de turno elimina isso tudo. No Pocket DM,
        você joga os monstros do{" "}
        <ProdLink href="/monstros">bestiário</ProdLink>, rola iniciativa e
        começa. Setup de 2 minutos.
      </P>
      <Img src="/art/blog/combat-active.png" alt="Combate ativo no Pocket DM — barras de HP, turnos e condições gerenciados visualmente" />

      <H2>4. Iniciativa em grupo — um dado, todos os goblins</H2>
      <P>
        Rola uma vez pro bando de goblins. Um resultado, mesmo modificador, todo
        mundo age junto. Corta o setup pela metade e simplifica a ordem de turnos.
        Se quiser mais variação, role dois grupos (metade dos goblins em cada).
      </P>

      <H2>5. Timer suave: 60 segundos ou Dodge</H2>
      <P>
        Combine com a mesa: cada jogador tem mais ou menos 1 minuto pra decidir
        sua ação. Passou? O personagem se defende (Dodge). Não precisa ser
        cronômetro rígido, a mera existência da regra já acelera. Ninguém quer
        ser "o cara que perdeu o turno pensando".
      </P>

      <H2>6. Distribua o trabalho</H2>
      <P>
        O mestre não precisa fazer tudo sozinho. Um jogador anota iniciativa,
        outro cuida do mapa, outro rastreia condições. Isso engaja gente que
        ficaria no celular esperando o turno. Com um tracker como o Pocket DM,
        cada jogador já vê tudo no próprio celular, e a delegação acontece
        naturalmente.
      </P>

      <SectionDivider src="/art/blog/treated-nobg/dnd-character-githyanki-female-warrior.png" alt="Githyanki guerreira" />

      <H2>7. Monstros inteligentes fogem (e deveriam)</H2>
      <P>
        Goblin a 20% de HP? Ele corre. Bandido que viu dois aliados caírem?
        Ele se rende. Isso encurta 2-3 rodadas de "acabamento" onde todo mundo
        já sabe que ganhou e tá só esperando o HP chegar a zero. Bônus: é mais
        realista e gera momentos narrativos interessantes.
      </P>

      <H2>8. Nem todo combate precisa de mapa</H2>
      <P>
        3 bandidos numa estrada? Teatro da mente. Emboscada rápida numa
        caverna? Teatro da mente. Reserve o grid e as miniaturas pra boss
        fights e encontros táticos complexos. O resto resolve na conversa.
      </P>

      <H2>9. 10 minutos de prep = 30 minutos salvos</H2>
      <P>
        Leia os stat blocks antes da sessão. Marque as 2-3 habilidades que
        realmente vai usar. Defina iniciativa média dos monstros se não quiser
        rolar. Parece pouco, mas esse preparo evita aquela parada de "peraí,
        deixa eu ver o que esse monstro faz" no meio do combate.
      </P>

      <H2>10. Menos combates, cada um importando mais</H2>
      <P>
        Se todo combate demora 45 minutos e você tenta enfiar 4 por sessão...
        a matemática não fecha. Dois combates bem construídos por sessão valem
        mais que cinco genéricos. E se um encontro não tem propósito narrativo?
        Resolve com um teste de habilidade e segue a história.
      </P>

      <Tip linkHref="/try" linkText="Testar o Pocket DM">
        O Pocket DM combina as dicas 3, 4 e 6 automaticamente: combat tracker
        digital, iniciativa visual para todos e jogadores acompanhando no
        celular. Três otimizações de uma vez.
      </Tip>

      <CTA category="tutorial" />

      <H2>A diferença entre rápido e superficial</H2>
      <P>
        Combate rápido não significa combate sem graça. Significa combate sem
        as partes chatas: sem aquela espera morta, sem burocracia de papel,
        sem turnos de 5 minutos pra decidir o que fazer. A tensão fica. A
        diversão fica. O tédio vai embora. Pra mais leitura, veja o{" "}
        <ExtLink href="https://www.hipstersanddragons.com/fixing-slow-combat-5e/">Hipsters &amp; Dragons</ExtLink>,
        o{" "}
        <ExtLink href="https://rpgbot.net/dnd5/dungeonmasters/faster-combat/">RPGBot</ExtLink>,
        nosso{" "}
        <IntLink slug="como-usar-combat-tracker-dnd-5e">guia de combat tracker</IntLink>{" "}
        e o{" "}
        <IntLink slug="guia-condicoes-dnd-5e">guia de condições</IntLink>.
      </P>

      <EbookCTA variant="inline" />
    </>
  );
}
