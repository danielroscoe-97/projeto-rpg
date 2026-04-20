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

export default function BlogPost16() {
  return (
    <>
      <H2>Por que este guia existe</H2>
      <P>
        Combate de D&D deveria ser o ponto alto da sessão. Na prática, é onde a
        maioria das mesas emperra. O mestre anota HP no papel, os jogadores ficam
        no celular esperando a vez, e ninguém sabe se o clérigo tá com 8 ou 80 de
        vida.
      </P>
      <P>
        A gente escreveu este guia pra resolver isso. São 5 capítulos curtos e
        diretos, sem enrolação, focados em como deixar o combate mais rápido,
        mais transparente e mais divertido pra todo mundo na mesa.
      </P>

      <Img src="/art/blog/combat-active.png" alt="Pocket DM — combate ativo com iniciativa, HP e condições em tempo real" />

      <H2>O que você vai aprender</H2>

      <H3>Capítulo 1 — Pare de Anotar Iniciativa</H3>
      <P>
        Cada jogador coloca a própria iniciativa pelo celular. O mestre só
        adiciona os monstros. A ordem aparece organizada na tela de todo mundo
        em segundos. Acabou o &ldquo;quanto você tirou?&rdquo;.
      </P>

      <H3>Capítulo 2 — HP em Tempo Real</H3>
      <P>
        Quando o jogador vê que tá com 8 HP e Poisoned, ele SENTE o perigo. Não
        precisa o mestre narrar. A tensão é visual. E o mestre vê o HP de todos,
        então sabe exatamente quando soltar aquele Fireball.
      </P>

      <H3>Capítulo 3 — Combate Rápido, Não Lento</H3>
      <P>
        Os 3 assassinos de ritmo: &ldquo;de quem é a vez?&rdquo;, &ldquo;o que eu posso fazer?&rdquo; e
        &ldquo;peraí, deixa eu calcular&rdquo;. Quando a iniciativa é visível e o turno avança
        automaticamente, o combate médio cai de 60 pra 25 minutos.
      </P>

      <H3>Capítulo 4 — Transparência Gera Imersão</H3>
      <P>
        Parece contraintuitivo, mas quanto mais informação o jogador tem, mais
        imerso ele fica. Ver a barra de HP ficar vermelha gera mais tensão do que
        qualquer descrição verbal. O mestre fica livre pra narrar em vez de calcular.
      </P>

      <Img src="/art/blog/combat-conditions.png" alt="Pocket DM — painel de condições com Blinded, Poisoned, Stunned" />

      <H3>Capítulo 5 — Do Zero ao Combate em 60 Segundos</H3>
      <P>
        Os jogadores provocaram o dragão e você não planejou esse encontro? Sem
        problema. Busca o monstro no compêndio, adiciona ao combate, compartilha
        o QR Code. 60 segundos e tá rodando. Improvisar encontros nunca foi tão
        fácil.
      </P>

      <Img src="/art/blog/monster-search.png" alt="Pocket DM — busca de monstros no compêndio SRD" />

      <H2>Cada capítulo conecta com o Pocket DM</H2>
      <P>
        Este não é um guia genérico de D&D. Cada capítulo mostra o problema real,
        como resolver, e como o Pocket DM elimina esse problema automaticamente.
        QR Code pra iniciativa, HP em tempo real, condições rastreadas, turno
        automático. Tudo que um mestre precisa pra focar no que importa: a
        história.
      </P>

      <Tip>
        O guia é gratuito, em PDF, com 8 páginas ilustradas com screenshots reais
        do app e arte de monstros. Baixe agora e transforme seus combates.
      </Tip>

      <EbookCTA variant="banner" />
    </>
  );
}
