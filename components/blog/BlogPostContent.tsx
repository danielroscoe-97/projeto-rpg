import Link from "next/link";
import Image from "next/image";
import {
  type FeatureKey,
  resolveFeatureHref,
  CATEGORY_CTA,
} from "@/lib/blog/feature-links";
import { EbookCTA } from "./EbookCTA";
import {
  BuildVariantProvider,
  BuildVariantToggle,
  Variant,
  StrategyBox,
} from "./BuildVariant";

/* ─── Shared styling helpers ───────────────────────────────────── */
function Img({ src, alt }: { src: string; alt: string }) {
  return (
    <figure className="my-10 -mx-2 sm:mx-0 rounded-xl overflow-hidden border border-white/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
      <Image
        src={src}
        alt={alt}
        width={1280}
        height={800}
        className="w-full h-auto"
        unoptimized
      />
      <figcaption className="text-[11px] text-muted-foreground/70 text-center py-2.5 px-4 bg-white/[0.02] border-t border-white/[0.04] italic">
        {alt}
      </figcaption>
    </figure>
  );
}
function ExtLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-gold/90 underline underline-offset-2 decoration-gold/30 hover:text-gold hover:decoration-gold/60 transition-colors"
    >
      {children}
    </a>
  );
}
function IntLink({ slug, children }: { slug: string; children: React.ReactNode }) {
  return (
    <Link
      href={`/blog/${slug}`}
      className="text-gold/90 underline underline-offset-2 decoration-gold/30 hover:text-gold hover:decoration-gold/60 transition-colors"
    >
      {children}
    </Link>
  );
}
function ProdLink({
  href,
  feature,
  lang,
  children,
}: {
  href?: string;
  feature?: FeatureKey;
  lang?: "pt" | "en";
  children: React.ReactNode;
}) {
  const resolved = feature
    ? resolveFeatureHref(feature, lang ?? "pt")
    : href ?? "/try";
  return (
    <Link
      href={resolved}
      className="text-gold/90 underline underline-offset-2 decoration-gold/30 hover:text-gold hover:decoration-gold/60 transition-colors"
    >
      {children}
    </Link>
  );
}
function H2({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-12 mb-5">
      <div className="flex items-center gap-3 mb-1">
        <div className="w-1 h-6 rounded-full bg-gold/60" />
        <h2 className="font-display text-lg sm:text-xl text-gold">{children}</h2>
      </div>
      <div className="ml-4 h-px bg-gradient-to-r from-gold/15 to-transparent" />
    </div>
  );
}
function H3({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="font-display text-lg text-foreground mt-9 mb-3">{children}</h3>
  );
}
function P({ children }: { children: React.ReactNode }) {
  return <p className="text-foreground/80 leading-[1.8] mb-5 text-[15px]">{children}</p>;
}
function Li({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3 text-foreground/80 leading-[1.8] text-[15px]">
      <span className="text-gold/70 mt-[2px] shrink-0 text-xs">&#9670;</span>
      <span>{children}</span>
    </li>
  );
}
function Ul({ children }: { children: React.ReactNode }) {
  return <ul className="space-y-3 mb-5 ml-1 pl-1">{children}</ul>;
}
function Tip({
  children,
  linkHref,
  linkText,
}: {
  children: React.ReactNode;
  linkHref?: string;
  linkText?: string;
}) {
  return (
    <div className="rounded-xl border border-gold/25 bg-gold/[0.05] p-5 my-8 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-1 h-full bg-gold/50 rounded-l-xl" />
      <p className="text-sm text-foreground/85 leading-relaxed pl-3">
        <strong className="text-gold font-display text-xs uppercase tracking-wider">Dica do Mestre</strong>
        <br />
        <span className="mt-1 block">{children}</span>
        {linkHref && linkText && (
          <Link
            href={linkHref}
            className="mt-2 inline-flex items-center gap-1 text-gold/80 text-xs hover:text-gold transition-colors"
          >
            {linkText} <span aria-hidden="true">&rarr;</span>
          </Link>
        )}
      </p>
    </div>
  );
}
function CTA({
  message,
  buttonText,
  href,
  category,
  lang = "pt",
}: {
  message?: string;
  buttonText?: string;
  href?: string;
  category?: string;
  lang?: "pt" | "en";
} = {}) {
  const preset = category ? CATEGORY_CTA[category]?.[lang] : undefined;
  const msg = message ?? preset?.msg ?? "Quer testar um combat tracker gratuito agora?";
  const btn = buttonText ?? preset?.btn ?? "Experimentar o Pocket DM \u2192";
  const dest = href ?? preset?.href ?? "/try";
  return (
    <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-5 my-8 text-center">
      <p className="text-sm text-foreground/70 mb-3">{msg}</p>
      <Link
        href={dest}
        className="inline-flex items-center gap-1 bg-gold text-surface-primary font-semibold px-5 py-2.5 rounded-lg text-sm hover:shadow-gold-glow transition-all duration-200"
      >
        {btn}
      </Link>
    </div>
  );
}

/* ─── Visual enrichment helpers ───────────────────────────────── */

/**
 * FloatingArt — decorative character PNG positioned at the edge of a
 * text section, low opacity, like RPG book margin illustrations.
 * `side` controls left/right placement.  Hidden on mobile (<md).
 */
function FloatingArt({
  src,
  alt,
  side = "right",
}: {
  src: string;
  alt: string;
  side?: "left" | "right";
}) {
  return (
    <div
      className={`hidden md:block pointer-events-none select-none absolute top-0 ${
        side === "right" ? "-right-16 xl:-right-24" : "-left-16 xl:-left-24"
      } w-[220px] xl:w-[260px] h-full`}
      aria-hidden="true"
    >
      <div className="sticky top-32">
        <Image
          src={src}
          alt={alt}
          width={260}
          height={400}
          className={`w-full h-auto opacity-[0.07] ${
            side === "left" ? "-scale-x-100" : ""
          }`}
          unoptimized
        />
      </div>
    </div>
  );
}

/**
 * SectionDivider — thematic break between major sections with a
 * character silhouette at very low opacity behind a gradient fade.
 */
function SectionDivider({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="relative my-14 flex flex-col items-center" aria-hidden="true">
      {/* Top line */}
      <div className="w-full h-px bg-gradient-to-r from-transparent via-gold/15 to-transparent mb-4" />
      {/* Character — clean, no extra effects */}
      <Image
        src={src}
        alt={alt}
        width={400}
        height={500}
        className="w-56 sm:w-72 md:w-80 h-auto object-contain opacity-60"
        unoptimized
      />
      {/* Bottom diamond line */}
      <div className="flex items-center gap-3 mt-4 w-full">
        <div className="flex-1 h-px bg-gradient-to-r from-transparent to-gold/20" />
        <span className="text-gold/25 text-[10px]">&#9670;</span>
        <div className="flex-1 h-px bg-gradient-to-l from-transparent to-gold/20" />
      </div>
    </div>
  );
}

/**
 * ArtCallout — a highlighted box with a character image on one side
 * and rich text content on the other (like an NPC quote or feature
 * highlight).  Stacks vertically on mobile.
 */
function ArtCallout({
  src,
  alt,
  children,
  side = "left",
}: {
  src: string;
  alt: string;
  children: React.ReactNode;
  side?: "left" | "right";
}) {
  return (
    <div
      className={`my-10 rounded-xl border border-white/[0.08] bg-white/[0.02] overflow-hidden flex flex-col ${
        side === "right" ? "md:flex-row-reverse" : "md:flex-row"
      }`}
    >
      <div className="relative w-full md:w-40 lg:w-48 shrink-0 flex items-center justify-center py-6 md:py-0">
        <div className="absolute inset-0 bg-gradient-to-b md:bg-gradient-to-r from-gold/[0.04] to-transparent" />
        <Image
          src={src}
          alt={alt}
          width={180}
          height={280}
          className="relative w-auto h-28 md:h-40 lg:h-48 object-contain opacity-60"
          unoptimized
        />
      </div>
      <div className="flex-1 p-5 md:p-6 flex flex-col justify-center text-foreground/80 text-[15px] leading-[1.8] [&>p]:mb-0">
        {children}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   BLOG POST 1 — Como Usar um Combat Tracker na Mesa de D&D 5e
   ═══════════════════════════════════════════════════════════════════ */
export function BlogPost1() {
  return (
    <>
      <P>
        Seis criaturas na iniciativa, o Barbarian acabou de acertar um crítico
        no Goblin, peraí, era o Goblin 3 ou o 4? E aquele Hobgoblin tava
        envenenado ou era o Orc? Enquanto você folheia seus post-its, a mesa
        inteira tá no celular. Essa cena é a realidade de 90% dos mestres que
        ainda gerenciam combate no papel. Um{" "}
        <ProdLink href="/try">combat tracker</ProdLink> resolve isso em
        segundos.
      </P>

      <H2>Tá, mas o que é um Combat Tracker?</H2>
      <P>
        Pensa nele como o substituto digital daquele caderno amassado. Ele
        mantém a ordem de iniciativa, mostra de quem é o turno, rastreia HP
        com barras visuais e marca condições ativas (<em>envenenado</em>,{" "}
        <em>atordoado</em>, <em>agarrado</em>), tudo automático.
      </P>
      <P>
        Sim, existem VTTs como{" "}
        <ExtLink href="https://roll20.net">Roll20</ExtLink> e{" "}
        <ExtLink href="https://foundryvtt.com">Foundry</ExtLink> que fazem
        isso e muito mais. Mas se sua mesa é presencial, você não precisa de
        um cockpit de avião pra gerenciar 4 goblins. Precisa de algo que abra
        no celular e funcione em 30 segundos, sem forçar seus jogadores a
        criar conta em lugar nenhum.
      </P>

      <Img src="/art/blog/combat-active.png" alt="Pocket DM — Combate ativo com iniciativa, HP e condições em tempo real" />

      <H2>Os 5 pilares que seu tracker PRECISA cobrir</H2>
      <P>
        O{" "}
        <ExtLink href="https://slyflourish.com/tracking_combat.html">Sly Flourish</ExtLink>{" "}
        tem um guia clássico sobre isso, e a lista dele bate com tudo que já
        vi dar errado em mesa presencial:
      </P>
      <Ul>
        <Li>
          <strong>Iniciativa:</strong> quem age primeiro, quem age depois.
          A ordem de turnos é a espinha dorsal do combate.
        </Li>
        <Li>
          <strong>Dano e HP:</strong> quanto de vida cada criatura tem e quanto
          já levou de dano. Sem isso, você não sabe quando o monstro morre.
        </Li>
        <Li>
          <strong>Condições:</strong> efeitos como <em>blinded</em>,{" "}
          <em>stunned</em>, <em>prone</em>. Esquecer uma condição ativa pode
          mudar completamente o rumo do combate. Veja nosso{" "}
          <IntLink slug="guia-condicoes-dnd-5e">guia completo de condições D&D 5e</IntLink>.
        </Li>
        <Li>
          <strong>Posicionamento:</strong> onde cada criatura está em relação
          às outras. Importante para ataques de oportunidade e áreas de efeito.
        </Li>
        <Li>
          <strong>Stat blocks:</strong> o que cada monstro pode fazer no turno
          dele. Ataques, habilidades, CA e salvaguardas.
        </Li>
      </Ul>

      <H2>Do zero ao combate em 5 minutos</H2>
      <H3>1. Antes da sessão: monte o encontro</H3>
      <P>
        Jogue os monstros no tracker antes da sessão. Um tracker decente já tem
        bestiário embutido: busca por nome, clica, pronto. No Pocket DM são{" "}
        <ProdLink href="/monstros">mais de 1.200 criaturas</ProdLink> do{" "}
        <ExtLink href="https://5e.d20srd.org/">SRD</ExtLink> + a coleção
        inteira do{" "}
        <ExtLink href="https://www.reddit.com/r/monsteraday/">r/monsteraday</ExtLink>.
        Dois cliques e o encontro tá montado.
      </P>
      <Img src="/art/blog/monster-search.png" alt="Busca de monstros SRD no Pocket DM — pesquise e adicione com um clique" />

      <H3>2. Na hora do combate: role iniciativa</H3>
      <P>
        Jogadores rolam o d20, te passam o número, e você digita. O tracker
        ordena tudo sozinho. Monstros? Rola automático ou usa o valor médio
        do stat block, sua escolha.
      </P>

      <H3>3. Durante o combate: só jogue</H3>
      <P>
        Avance turno por turno. Jogador acertou o ogre? Clica no HP, digita o
        dano, a barra desce. Monstro aplicou uma condição? Marca ali mesmo.
        Acabou aquela dança de "peraí, quanto de HP o monstro 2 tinha mesmo?"
      </P>
      <Img src="/art/blog/combat-hp-panel.png" alt="Painel de HP no Pocket DM — aplique dano, cure ou adicione HP temporário" />

      <H3>4. Jogadores acompanham no celular</H3>
      <P>
        Essa é a parte que vende qualquer jogador cético: eles abrem um link
        no celular e veem tudo em tempo real. De quem é o turno, quanto de HP
        cada um tem, quais condições estão rolando. Sem instalar nada.
      </P>

      <Tip>
        No Pocket DM, o mestre compartilha um link e os jogadores entram
        na hora. Sem cadastro, sem app. O bardo preguiçoso que nunca baixa
        nada consegue entrar em 3 segundos.
      </Tip>

      <H2>O caderno amassado vs o digital</H2>
      <P>
        Anotar iniciativa em papel e notecards funciona? Funciona. Até a
        terceira rodada, quando metade dos post-its já caiu no chão e você
        tem 4 rasuras em cima do HP do mesmo goblin. Os problemas clássicos:
      </P>
      <Ul>
        <Li>Esqueceu que o Fighter tava envenenado há 3 rodadas</Li>
        <Li>HP virou uma sopa de rasuras ilegíveis</Li>
        <Li>Jogadores perguntando "de quem é o turno?" a cada 30 segundos</Li>
        <Li>Setup de 15 minutos pra um encontro que dura 10</Li>
      </Ul>
      <P>
        Um tracker digital elimina tudo isso. E se for gratuito como o{" "}
        <ProdLink href="/try">Pocket DM</ProdLink>? Não tem argumento contra.
      </P>

      <CTA category="tutorial" />

      <H2>Então vale a pena?</H2>
      <P>
        Se você mestra presencialmente e ainda gerencia combate no papel, um
        tracker é o maior upgrade que existe. Não porque seja tecnologia
        revolucionária, porque elimina exatamente as partes chatas que
        fazem combate arrastar. O resto continua sendo você, seus jogadores e
        a história. Só que agora sem rasura. Se quiser ir além, dê uma olhada
        nas{" "}
        <IntLink slug="como-agilizar-combate-dnd-5e">10 dicas pra acelerar combate</IntLink>{" "}
        e nas{" "}
        <IntLink slug="ferramentas-essenciais-mestre-dnd-5e">5 ferramentas que todo mestre deveria ter</IntLink>.
      </P>

      <EbookCTA variant="inline" />
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   BLOG POST 2 — 5 Ferramentas Essenciais para Mestres de D&D 5e
   ═══════════════════════════════════════════════════════════════════ */
export function BlogPost2() {
  return (
    <>
      <P>
        Não precisa de 15 apps abertos pra rodar uma boa sessão de D&D. Na
        real, a maioria dos mestres que eu conheço sobrevive com 3-4 coisas.
        Mas se tivesse que escolher o kit perfeito? Cinco ferramentas. Com
        essas cinco, você cobre tudo que acontece entre o "rolem iniciativa"
        e o "a sessão acaba aqui".
      </P>

      <H2>1. Combat Tracker — o coração da mesa</H2>
      <P>
        Combate é o momento em que mais coisa acontece ao mesmo tempo. 6
        criaturas, cada uma com HP diferente, condições ativas, ataques
        multiaction, e você ali no meio tentando lembrar de quem é o turno.
        Um <ProdLink href="/try">combat tracker</ProdLink> tira todo esse
        peso das suas costas.
      </P>
      <P>
        O bom tracker adiciona monstros com um clique, rola iniciativa, mostra
        HP em barras coloridas e marca condições sem você precisar escrever
        nada. O Pocket DM faz tudo isso e ainda sincroniza no celular de cada
        jogador, então ninguém mais pergunta "de quem é o turno?"
      </P>

      <H2>2. Bestiário Digital — tchau, Monster Manual no colo</H2>
      <P>
        Nada mata mais o ritmo do que o mestre parando pra folhear 300 páginas
        do Monster Manual procurando o stat block do Ankheg. Bestiário digital
        com busca por nome, CR ou tipo de criatura resolve em 2 segundos.
      </P>
      <Img src="/art/blog/bestiary-index.png" alt="Bestiário do Pocket DM — monstros SRD + Monster a Day organizados por letra e CR" />
      <P>
        O conteúdo SRD (System Reference Document) do D&D 5e inclui centenas de
        monstros gratuitos. Ferramentas como o Pocket DM disponibilizam{" "}
        <ProdLink href="/monstros">mais de 1.200+ monstros SRD</ProdLink>, além
        de monstros do compêndio{" "}
        <ExtLink href="https://www.reddit.com/r/monsteraday/">Monster a Day</ExtLink>{" "}
        com stat blocks completos, todos pesquisáveis.
      </P>

      <H2>3. Catálogo de Magias — "o que essa spell faz mesmo?"</H2>
      <P>
        Se eu ganhasse 1 XP toda vez que um jogador pergunta "o que Counterspell
        faz mesmo?", já teria alcançado o nível épico. Um catálogo de magias com
        busca por nome, escola, nível e classe elimina aquela pausa constrangedora.
      </P>
      <Img src="/art/blog/spells-index.png" alt="Catálogo de magias SRD do Pocket DM — 750+ spells organizadas por nível e escola" />
      <P>
        O Pocket DM inclui o que chamamos de {"\u201C"}oráculo de magias{"\u201D"}: uma{" "}
        <ProdLink href="/magias">busca inteligente em mais de 900 magias SRD</ProdLink>,
        acessível durante o combate sem interromper o fluxo do jogo.
      </P>

      <SectionDivider src="/art/blog/treated-nobg/dnd-character-gnome-male-artificer-in-a-workshop.png" alt="Gnomo artificer na oficina" />

      <H2>4. Música Ambiente — a arma secreta que ninguém usa</H2>
      <P>
        Faz o teste: na próxima sessão, coloque uma trilha de taverna medieval
        quando o grupo entrar no bar. Não fale nada. Só observe. Pelo menos
        um jogador vai sorrir e entrar no clima instantaneamente. Uma taverna
        sem música de taverna é só uma sala com NPCs.
      </P>
      <P>
        Ter 3-4 presets prontos (taverna, dungeon, combate, épico) resolve
        90% das cenas. Troca rápida, sem perder o ritmo. O Pocket DM já vem
        com 12+ presets embutidos na interface de combate, sem precisar de
        app separado.
      </P>

      <H2>5. Dados Virtuais — backup, não substituto</H2>
      <P>
        Calma, ninguém tá falando pra abandonar os dados físicos. Mas quando
        o mago lança Fireball e você precisa rolar 8d6 pros 4 goblins que
        estavam na área... dados virtuais salvam 3 minutos de sua vida. No
        combat tracker, é um clique. No papel, é uma salada de dados
        espalhados pela mesa inteira.
      </P>

      <Tip linkHref="/try" linkText="Experimentar grátis">
        O Pocket DM integra todas essas 5 ferramentas em uma única interface
        gratuita. Bestiário, magias, música, dados e combat tracker, tudo no
        mesmo lugar.
      </Tip>

      <H2>E o que NÃO é essencial (mas é legal)</H2>
      <Ul>
        <Li>
          <strong>VTT completo (<ExtLink href="https://roll20.net">Roll20</ExtLink>, <ExtLink href="https://foundryvtt.com">Foundry</ExtLink>):</strong> ótimo para mesas
          online, mas overkill para presencial
        </Li>
        <Li>
          <strong>Gerador de mapas:</strong> útil para dungeon crawls, mas a
          maioria dos combates funciona com teatro da mente
        </Li>
        <Li>
          <strong>Ficha de personagem digital:</strong> legal, mas os jogadores
          geralmente preferem a própria ficha (física ou <ExtLink href="https://www.dndbeyond.com">D&D Beyond</ExtLink>)
        </Li>
        <Li>
          <strong>Gerador de NPCs/encontros com IA:</strong> promissor, mas
          ainda experimental
        </Li>
      </Ul>

      <CTA category="lista" />

      <H2>Menos é mais (de verdade)</H2>
      <P>
        Cinco ferramentas. Não dez, não quinze. O erro mais comum de mestre
        iniciante é achar que precisa de um cockpit inteiro pra rodar uma sessão.
        Não precisa. A ferramenta não pode ser mais complicada que o problema que
        ela resolve. Se ela te atrapalha mais do que ajuda, volta pro papel sem
        culpa. Quer testar tudo isso junto? Veja o{" "}
        <IntLink slug="como-usar-combat-tracker-dnd-5e">guia de combat tracker</IntLink>{" "}
        ou o{" "}
        <IntLink slug="como-usar-pocket-dm-tutorial">tutorial completo do Pocket DM</IntLink>.
      </P>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   BLOG POST 3 — Combat Tracker vs VTT: Qual a Diferença?
   ═══════════════════════════════════════════════════════════════════ */
export function BlogPost3() {
  return (
    <>
      <P>
        "Usa Roll20?" Essa é a primeira pergunta que todo mestre escuta quando
        menciona que usa ferramenta digital. E a resposta geralmente é: "pra mesa
        presencial? Não, obrigado." A confusão entre combat tracker e VTT é
        real e faz muita gente usar ferramenta errada pro problema errado.
        Vamos separar as coisas.
      </P>

      <H2>VTT: o canivete suíço que pode ser demais</H2>
      <P>
        Virtual Tabletop é uma plataforma que simula a mesa inteira no
        computador. Os mais conhecidos:{" "}
        <ExtLink href="https://roll20.net">Roll20</ExtLink>,{" "}
        <ExtLink href="https://foundryvtt.com">Foundry VTT</ExtLink> e{" "}
        <ExtLink href="https://www.fantasygrounds.com">Fantasy Grounds</ExtLink>. Eles oferecem:
      </P>
      <Ul>
        <Li>Mapas interativos com grid e fog of war</Li>
        <Li>Tokens movíveis representando personagens e monstros</Li>
        <Li>Fichas de personagem integradas</Li>
        <Li>Chat de texto e voz</Li>
        <Li>Automação de regras (rolagem, dano, condições)</Li>
        <Li>Marketplace de conteúdo (mapas, aventuras, tokens)</Li>
      </Ul>

      <Img src="/art/blog/landing-hero.png" alt="Mesa presencial de D&D com dados, miniaturas e livros — o cenário ideal para um combat tracker" />

      <H2>Combat Tracker: faz uma coisa e faz direito</H2>
      <P>
        Um <ProdLink href="/try">combat tracker</ProdLink> é cirúrgico. Ele
        só gerencia combate, e por isso é muito mais rápido de usar:
      </P>
      <Ul>
        <Li>Ordem de iniciativa automática</Li>
        <Li>Gerenciamento de HP com barras visuais</Li>
        <Li><ProdLink href="/condicoes">Condições ativas</ProdLink> (blinded, stunned, etc.)</Li>
        <Li>Avanço de turnos</Li>
        <Li><ProdLink href="/monstros">Bestiário integrado</ProdLink> (stat blocks)</Li>
        <Li>Funciona no celular dos jogadores</Li>
      </Ul>

      <H2>Lado a lado: onde cada um ganha</H2>
      <div className="overflow-x-auto mb-6">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left py-2 pr-4 text-foreground/60 font-medium">Aspecto</th>
              <th className="text-left py-2 pr-4 text-foreground/60 font-medium">VTT</th>
              <th className="text-left py-2 text-foreground/60 font-medium">Combat Tracker</th>
            </tr>
          </thead>
          <tbody className="text-foreground/75">
            <tr className="border-b border-white/[0.05]">
              <td className="py-2 pr-4">Setup</td>
              <td className="py-2 pr-4">30-60 min por sessão</td>
              <td className="py-2">2-5 minutos</td>
            </tr>
            <tr className="border-b border-white/[0.05]">
              <td className="py-2 pr-4">Curva de aprendizado</td>
              <td className="py-2 pr-4">Alta (semanas)</td>
              <td className="py-2">Mínima (minutos)</td>
            </tr>
            <tr className="border-b border-white/[0.05]">
              <td className="py-2 pr-4">Foco</td>
              <td className="py-2 pr-4">Mesa online completa</td>
              <td className="py-2">Combate apenas</td>
            </tr>
            <tr className="border-b border-white/[0.05]">
              <td className="py-2 pr-4">Mapas</td>
              <td className="py-2 pr-4">Sim, interativos</td>
              <td className="py-2">Não (teatro da mente)</td>
            </tr>
            <tr className="border-b border-white/[0.05]">
              <td className="py-2 pr-4">Preço</td>
              <td className="py-2 pr-4">Grátis a US$50+</td>
              <td className="py-2">Geralmente grátis</td>
            </tr>
            <tr className="border-b border-white/[0.05]">
              <td className="py-2 pr-4">Mobile</td>
              <td className="py-2 pr-4">Limitado</td>
              <td className="py-2">Otimizado</td>
            </tr>
            <tr>
              <td className="py-2 pr-4">Ideal para</td>
              <td className="py-2 pr-4">Mesas online/remotas</td>
              <td className="py-2">Mesas presenciais</td>
            </tr>
          </tbody>
        </table>
      </div>

      <H2>Qual escolher? Depende da sua mesa</H2>
      <H3>VTT faz sentido se:</H3>
      <Ul>
        <Li>Seus jogadores jogam online/remotamente</Li>
        <Li>Você quer mapas interativos e fog of war</Li>
        <Li>Você tem tempo para configurar antes de cada sessão</Li>
        <Li>Todos têm computador (não funciona bem no celular)</Li>
      </Ul>

      <Img src="/art/blog/combat-with-monsters.png" alt="Pocket DM — setup de encontro com 4 monstros prontos para o combate" />

      <H3>Combat Tracker é o caminho se:</H3>
      <Ul>
        <Li>Você joga presencialmente</Li>
        <Li>Quer algo rápido e sem complicação</Li>
        <Li>Seus jogadores usam celular, não notebook</Li>
        <Li>Prefere teatro da mente ou miniaturas físicas</Li>
        <Li>Não quer forçar seus jogadores a criar contas</Li>
      </Ul>

      <Tip>
        Na prática, muitos mestres usam os dois. VTT na quarta-feira à noite
        quando o grupo joga online, combat tracker no sábado quando se encontram
        presencialmente. Não são concorrentes, são ferramentas pra contextos
        diferentes.
      </Tip>

      <CTA category="comparativo" />

      <H2>Resumindo</H2>
      <P>
        VTT é um ecossistema completo pra jogar online. Combat tracker é uma
        ferramenta cirúrgica pra gerenciar combate presencial. Se sua mesa se
        encontra ao vivo, o{" "}
        <ProdLink href="/try">Pocket DM</ProdLink> faz o trabalho em uma fração
        do tempo e da complexidade. Se quer aprofundar, veja o{" "}
        <IntLink slug="como-usar-combat-tracker-dnd-5e">guia de combat tracker</IntLink>,
        as{" "}
        <IntLink slug="ferramentas-essenciais-mestre-dnd-5e">5 ferramentas essenciais</IntLink>,
        ou o{" "}
        <ExtLink href="https://www.hipstersanddragons.com/best-virtual-tabletops/">comparativo de VTTs do Hipsters &amp; Dragons</ExtLink>.
      </P>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   BLOG POST 4 — Guia Completo de Condições D&D 5e
   ═══════════════════════════════════════════════════════════════════ */
export function BlogPost4() {
  return (
    <>
      <P>
        O Monk acerta um Stunning Strike. O Goblin falha no save. E aí...
        o que Stunned faz mesmo? Desvantagem em ataques? Não pode se mover?
        Ataques contra ele são automáticos? Se você já passou por esse momento
        de "peraí, deixa eu conferir", este guia é sua referência rápida. Todas
        as 15 condições do D&D 5e, explicadas em português, com exemplos
        práticos de mesa.
      </P>

      <H2>Condições em 30 segundos</H2>
      <P>
        Condições são efeitos que mudam o que uma criatura pode ou não fazer.
        Vêm de magias, habilidades de classe, ataques de monstro ou do
        próprio ambiente. Duram até serem removidas (tipo se levantar de{" "}
        <em>prone</em>) ou até o efeito expirar. Referência oficial em inglês
        no{" "}
        <ExtLink href="https://5e.d20srd.org/srd/conditionSummary.htm">SRD</ExtLink>{" "}
        e no guia do{" "}
        <ExtLink href="https://arcaneeye.com/mechanic-overview/5e-conditions/">Arcane Eye</ExtLink>.
      </P>

      <Img src="/art/blog/combat-conditions.png" alt="Painel de condições do Pocket DM — todas as 15 condições D&D 5e disponíveis com um clique" />

      <H2>As 15 condições — uma por uma</H2>

      {[
        {
          name: "Blinded (Cego)",
          rules: "Falha automaticamente em testes que exigem visão. Ataques contra a criatura têm vantagem. Ataques da criatura têm desvantagem.",
          example: "Magia Blindness/Deafness, ataque de tinta de um Kraken.",
        },
        {
          name: "Charmed (Enfeitiçado)",
          rules: "Não pode atacar quem a enfeitiçou. Quem enfeitiçou tem vantagem em testes sociais contra a criatura.",
          example: "Charm Person, Vampire's Charm.",
        },
        {
          name: "Deafened (Surdo)",
          rules: "Falha automaticamente em testes que exigem audição.",
          example: "Raramente aplicado sozinho; geralmente vem com Blindness/Deafness.",
        },
        {
          name: "Exhaustion (Exaustão)",
          rules: "6 níveis cumulativos: 1=desvantagem em testes de habilidade, 2=velocidade reduzida pela metade, 3=desvantagem em ataques e salvaguardas, 4=HP máximo pela metade, 5=velocidade 0, 6=morte.",
          example: "Fome, sede, frio extremo, certas magias como Sickening Radiance.",
        },
        {
          name: "Frightened (Amedrontado)",
          rules: "Desvantagem em testes de habilidade e ataques enquanto a fonte do medo estiver visível. Não pode se mover voluntariamente para perto da fonte.",
          example: "Cause Fear, Dragon's Frightful Presence, Wraith.",
        },
        {
          name: "Grappled (Agarrado)",
          rules: "Velocidade cai para 0. Termina se o agarrador ficar incapacitado ou se a criatura sair do alcance.",
          example: "Ação de agarrar, tentáculos de um Roper.",
        },
        {
          name: "Incapacitated (Incapacitado)",
          rules: "Não pode realizar ações ou reações.",
          example: "Base para outras condições como Stunned e Unconscious.",
        },
        {
          name: "Invisible (Invisível)",
          rules: "Impossível de ser visto sem magia. Ataques da criatura têm vantagem. Ataques contra ela têm desvantagem.",
          example: "Invisibility, Greater Invisibility, Potion of Invisibility.",
        },
        {
          name: "Paralyzed (Paralisado)",
          rules: "Incapacitado, não pode se mover ou falar. Falha automaticamente em salvaguardas de STR e DEX. Ataques contra têm vantagem. Ataques corpo a corpo que acertam são críticos automáticos.",
          example: "Hold Person, Hold Monster, Ghoul's Claws.",
        },
        {
          name: "Petrified (Petrificado)",
          rules: "Transformado em pedra. Peso multiplicado por 10. Não envelhece. Incapacitado, não pode se mover ou falar. Resistência a todo dano. Imune a veneno e doença.",
          example: "Flesh to Stone, Medusa's Petrifying Gaze, Basilisk.",
        },
        {
          name: "Poisoned (Envenenado)",
          rules: "Desvantagem em jogadas de ataque e testes de habilidade.",
          example: "Veneno de serpente, Ray of Sickness, Stinking Cloud.",
        },
        {
          name: "Prone (Derrubado)",
          rules: "Só pode se arrastar (1m custa 2m). Desvantagem em ataques. Ataques corpo a corpo contra têm vantagem; à distância têm desvantagem.",
          example: "Shield Master empurrão, Shove action, Grease.",
        },
        {
          name: "Restrained (Impedido)",
          rules: "Velocidade 0. Ataques contra têm vantagem. Ataques da criatura têm desvantagem. Desvantagem em salvaguardas de DEX.",
          example: "Entangle, Web, Grappler feat.",
        },
        {
          name: "Stunned (Atordoado)",
          rules: "Incapacitado, não pode se mover, fala limitada. Falha automaticamente em salvaguardas de STR e DEX. Ataques contra têm vantagem.",
          example: "Stunning Strike (Monk), Power Word Stun, Mind Flayer.",
        },
        {
          name: "Unconscious (Inconsciente)",
          rules: "Incapacitado, não pode se mover ou falar, não percebe o entorno. Cai e fica prone. Falha automaticamente em STR e DEX. Ataques contra têm vantagem. Ataques corpo a corpo que acertam são críticos automáticos.",
          example: "Cair a 0 HP, Sleep, certas armadilhas.",
        },
      ].map((c) => (
        <div
          key={c.name}
          className="rounded-lg border border-white/[0.06] bg-white/[0.015] p-4 mb-3"
        >
          <h3 className="font-display text-base text-gold/90 mb-2">{c.name}</h3>
          <p className="text-foreground/75 text-sm leading-relaxed mb-1">
            <strong>Regras:</strong> {c.rules}
          </p>
          <p className="text-foreground/60 text-sm">
            <strong>Exemplo:</strong> {c.example}
          </p>
        </div>
      ))}

      <Tip>
        No <ProdLink href="/try">Pocket DM</ProdLink>, todas as 15 condições
        vêm com as regras integradas. Ao marcar uma condição em um combatente,
        a descrição completa aparece para consulta rápida, sem precisar abrir
        o livro. Veja também nossa{" "}
        <ProdLink href="/condicoes">referência rápida de condições</ProdLink>.
      </Tip>

      <SectionDivider src="/art/blog/treated-nobg/dnd-character-human-blood-hunter-with-red-eyes-and-long-hair.png" alt="Blood Hunter de olhos vermelhos" />

      <H2>O efeito cascata: condições que se empilham</H2>
      <P>
        Detalhe que pega muita gente: <strong>Paralyzed</strong>,{" "}
        <strong>Stunned</strong> e <strong>Unconscious</strong> já incluem{" "}
        <strong>Incapacitated</strong> automaticamente. Se o monstro tá
        paralisado, ele também tá incapacitado, você não precisa marcar
        os dois. Saber disso evita aquela discussão de 5 minutos no meio
        do combate.
      </P>

      <CTA category="guia" />
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   BLOG POST 5 — Como Agilizar o Combate no D&D 5e
   ═══════════════════════════════════════════════════════════════════ */
export function BlogPost5() {
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

/* ═══════════════════════════════════════════════════════════════════
   BLOG POST 6 — Como Usar o Pocket DM — Tutorial Completo
   ═══════════════════════════════════════════════════════════════════ */
export function BlogPost6() {
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

/* ═══════════════════════════════════════════════════════════════════
   BLOG POST 7 — Como Montar um Encontro Balanceado no D&D 5e
   ═══════════════════════════════════════════════════════════════════ */
export function BlogPost7() {
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

/* ═══════════════════════════════════════════════════════════════════
   BLOG POST 8 — Guia de Challenge Rating: Como Calcular a Dificuldade
   ═══════════════════════════════════════════════════════════════════ */
export function BlogPost8() {
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

/* ═══════════════════════════════════════════════════════════════════
   BLOG POST 9 — 10 Monstros que Todo Mestre de D&D Deveria Usar
   ═══════════════════════════════════════════════════════════════════ */
export function BlogPost9() {
  return (
    <>
      <P>
        O SRD tem 400+ monstros. Suplementos oficiais passam de mil. E quando
        chega a hora de montar o encontro de sábado, você abre o bestiário e
        congela. Pra onde olhar primeiro?
      </P>
      <P>
        Essa lista não é sobre os monstros mais fortes. É sobre os mais{" "}
        <em>versáteis</em>: criaturas que funcionam em múltiplos contextos,
        geram as melhores histórias e ensinam coisas sobre combate que nenhum
        tutorial explica. Do nível 1 ao 20. Se você dominar esses 10, vai
        rodar mesas melhores pelo resto da vida.
      </P>
      <P>
        Pra cada monstro: por que ele é especial, uma dica tática roubada de{" "}
        <ExtLink href="https://www.themonstersknow.com/">The Monsters Know What They{"'"}re Doing</ExtLink>{" "}
        e{" "}
        <ExtLink href="https://slyflourish.com/making_monsters_interesting.html">Sly Flourish</ExtLink>,
        e um link direto para a ficha no nosso compêndio gratuito.
      </P>

      {/* ── 1. GOBLIN ─────────────────────────────────────────────── */}
      <H2>1. Goblin — O Clássico Versátil</H2>
      <P>
        Se existe um monstro que todo mestre deveria dominar, é o Goblin. Com
        CR 1/4, ele parece inofensivo no papel: 7 pontos de vida, um
        arco curto e uma cimitarra. Mas subestimar goblins é exatamente o erro
        que eles exploram. A habilidade <strong>Nimble Escape</strong> permite
        que o goblin realize a ação Esconder ou Desengajar como ação bônus,
        transformando uma criatura frágil em um pesadelo tático.
      </P>
      <H3>Por que é indispensável</H3>
      <Ul>
        <Li>Funciona em qualquer nível: bandidos de estrada no nível 1, tropas de um hobgoblin warlord no nível 8</Li>
        <Li>Ensina novos jogadores sobre ação bônus, cobertura e vantagem/desvantagem</Li>
        <Li>Em grupo, goblins com arcos a 80 pés de distância são surpreendentemente letais</Li>
        <Li>Perfeito para emboscadas: a habilidade Stealth (+6) é melhor que a de muitos personagens</Li>
      </Ul>
      <Tip>
        Como{" "}
        <ExtLink href="https://www.themonstersknow.com/goblin-tactics/">Keith Ammann explica</ExtLink>,
        goblins nunca lutam em campo aberto. Eles atacam de posições
        elevadas, usam Nimble Escape para se esconder após cada tiro e
        fogem quando perdem vantagem numérica. Rode goblins assim e seus
        jogadores nunca mais vão dizer que {"\u201C"}goblin é mob de tutorial{"\u201D"}.
      </Tip>
      <P>
        Veja a ficha completa:{" "}
        <ProdLink href="/monstros/goblin">Goblin no Compêndio</ProdLink>.
      </P>

      {/* ── 2. DIRE WOLF ──────────────────────────────────────────── */}
      <H2>2. Dire Wolf — O Predador dos Primeiros Níveis</H2>
      <P>
        O Dire Wolf (Lobo Terrível) é possivelmente o melhor monstro de CR 1
        do jogo. Com 37 pontos de vida, um ataque de mordida que causa 2d6+3
        de dano e derruba o alvo se ele falhar em um teste de Força, uma
        matilha de lobos terríveis é um encontro que nenhum grupo de nível 1-3
        vai esquecer. A habilidade <strong>Pack Tactics</strong> (vantagem no
        ataque quando um aliado está adjacente ao alvo) torna cada mordida
        mais perigosa.
      </P>
      <H3>Quando usar</H3>
      <Ul>
        <Li>Viagens por floresta ou tundra, perfeito para encontros aleatórios com peso narrativo</Li>
        <Li>Montaria de orcs, goblins ou druidas corrompidos</Li>
        <Li>Caçada reversa: os jogadores são a presa, não os predadores</Li>
        <Li>Introdução natural ao conceito de Pack Tactics para novos jogadores</Li>
      </Ul>
      <Tip>
        Lobos terríveis caçam em matilha e tentam separar o grupo. Faça
        dois lobos focarem no mesmo alvo para derrubar, enquanto o terceiro
        circunda o mago na retaguarda. Se um lobo derruba alguém, os
        outros ganham vantagem automática contra o alvo caído. É
        brutal e realista.
      </Tip>
      <P>
        Veja a ficha completa:{" "}
        <ProdLink href="/monstros/lobo-terrivel">Dire Wolf no Compêndio</ProdLink>.
      </P>

      {/* ── 3. OWLBEAR ────────────────────────────────────────────── */}
      <H2>3. Owlbear — O Terror Icônico</H2>
      <P>
        Poucos monstros são tão <em>D&D</em> quanto o Owlbear (Urso-coruja).
        Ele não existe em nenhuma mitologia, é uma criação original do
        jogo, provavelmente inspirada em brinquedos de plástico dos anos 70. E
        é exatamente isso que o torna especial. Com CR 3, 59 HP e um
        multiattack de garra+bico que pode causar até 24 de dano em um turno,
        o Owlbear é a introdução perfeita ao conceito de {"\u201C"}monstro que não
        negocia{"\u201D"}.
      </P>
      <H3>Por que funciona tão bem</H3>
      <Ul>
        <Li>É puro instinto: sem magias, sem habilidades especiais, sem planos, só fúria</Li>
        <Li>Excelente para forçar decisões: lutar, fugir ou tentar acalmar a fera?</Li>
        <Li>A descrição visual é inesquecível: cabeça de coruja no corpo de urso</Li>
        <Li>Funciona como encontro aleatório, guardião de covil ou {"\u201C"}o que acordou na caverna{"\u201D"}</Li>
      </Ul>
      <Tip>
        O Owlbear é territorial, não malvado. Ele ataca quem entra no seu
        território e persegue até perder interesse ou ficar gravemente ferido.{" "}
        <ExtLink href="https://www.themonstersknow.com/owlbear-tactics/">Segundo a análise do The Monsters Know</ExtLink>,
        o Owlbear vai correr atrás do alvo mais próximo até derrubá-lo,
        depois pular pro seguinte. Faça ele ignorar o
        tanque que bloqueia o caminho e correr direto pro bardo que
        tropeçou nos arbustos.
      </Tip>
      <P>
        Veja a ficha completa:{" "}
        <ProdLink href="/monstros/urso-coruja">Owlbear no Compêndio</ProdLink>.
      </P>

      {/* ── 4. MIMIC ──────────────────────────────────────────────── */}
      <H2>4. Mimic — O Combustível de Paranoia</H2>
      <P>
        O Mimic é um dos monstros mais elegantes do D&D. Com CR 2, ele se
        disfarça como um objeto mundano: um baú, uma porta, uma
        estante. E ataca quando alguém toca nele. Sua existência muda
        fundamentalmente o comportamento dos jogadores: depois do primeiro
        encontro com um Mimic, <em>todo</em> baú se torna suspeito. E isso,
        como mestre, é ouro puro.
      </P>
      <H3>O impacto real do Mimic</H3>
      <Ul>
        <Li>Cria tensão em ambientes de exploração sem precisar de combate constante</Li>
        <Li>Ensina jogadores a investigar antes de agir, hábito que melhora toda a campanha</Li>
        <Li>O efeito Adhesive gruda o alvo ao Mimic, criando pânico imediato</Li>
        <Li>Versatilidade de forma: pode ser qualquer objeto, em qualquer dungeon</Li>
      </Ul>
      <Tip>
        O segredo do Mimic é o setup. Descreva três baús normais com
        tesouro real nas sessões anteriores. Na quarta vez, quando o
        jogador disser {"\u201C"}abro o baú{"\u201D"} sem pensar duas vezes, revele
        que o baú morde de volta. O Mimic funciona como predador emboscador:
        ele ataca o primeiro alvo e se agarra. Se o grupo todo
        reagir, ele larga e foge (Mimics são mais espertos do que parecem).
      </Tip>
      <P>
        Veja a ficha completa:{" "}
        <ProdLink href="/monstros/mimico">Mimic no Compêndio</ProdLink>.
      </P>

      {/* ── 5. BASILISK ───────────────────────────────────────────── */}
      <H2>5. Basilisk — A Petrificação Dramática</H2>
      <P>
        Existe algo especialmente visceral na petrificação. Diferente de dano
        de HP que se cura com uma poção, virar pedra é <em>permanente</em> sem
        a magia certa. O Basilisk (CR 3) entrega exatamente essa ameaça: seu
        olhar petrificante força um teste de resistência de Constituição CD 12,
        e falhar em dois turnos seguidos significa estátua. Não é letal no
        sentido tradicional, mas é pior.
      </P>
      <H3>Quando brilha</H3>
      <Ul>
        <Li>Cavernas e ruínas subterrâneas com estátuas {"\u201C"}decorativas{"\u201D"} que são aventureiros anteriores</Li>
        <Li>Como guardião de tesouros: alguém colocou esse basilisco ali de propósito</Li>
        <Li>Ensina jogadores sobre condições além de dano: desviar o olhar, espelhos, estratégia</Li>
        <Li>Funciona como puzzle de combate: como derrotar algo que você não pode olhar?</Li>
      </Ul>
      <Tip>
        A mecânica de desviar o olhar é central. O jogador pode escolher
        não olhar para o Basilisk (evitando o olhar petrificante), mas
        ataques contra ele terão desvantagem. Isso cria uma escolha
        tática genuína em cada turno. Coloque espelhos quebrados na sala
        como pista, e recompense jogadores criativos que tentarem
        refletir o olhar.
      </Tip>
      <P>
        Veja a ficha completa:{" "}
        <ProdLink href="/monstros/basilisco">Basilisk no Compêndio</ProdLink>.
      </P>

      {/* ── 6. MANTICORE ──────────────────────────────────────────── */}
      <H2>6. Manticore — O Combo Corpo a Corpo + Longo Alcance</H2>
      <P>
        A Manticora é um dos monstros mais subestimados de CR 3. Ela voa, atira
        espinhos da cauda a 100/200 pés de distância e, quando chega perto,
        tem um multiattack de mordida+garras que causa dano sólido. A combinação
        de mobilidade aérea com ataque ranged e melee a torna um dos inimigos
        mais frustrantes para grupos que dependem de combate corpo a corpo.
      </P>
      <H3>O que a torna especial</H3>
      <Ul>
        <Li>Voo + ataque ranged: ela não precisa pousar se não quiser</Li>
        <Li>24 espinhos na cauda, recarregando entre descansos; munição finita cria urgência</Li>
        <Li>Pode negociar: Manticoras são inteligentes o suficiente para exigir tributo em vez de lutar</Li>
        <Li>Perfeita para encontros em áreas abertas, desfiladeiros e montanhas</Li>
      </Ul>
      <Tip>
        <ExtLink href="https://www.themonstersknow.com/manticore-tactics/">Segundo o The Monsters Know</ExtLink>,
        a Manticora começa o combate com uma salva de espinhos da cauda e
        só pousa quando os espinhos acabam (ou quando o grupo fica
        vulnerável o bastante). Use-a em campo aberto, voando a 60 pés
        de altura, e force os jogadores a pensar em soluções além de
        {"\u201C"}corro e bato{"\u201D"}. Magos com alcance longo viram MVPs nesse encontro.
      </Tip>
      <P>
        Veja a ficha completa:{" "}
        <ProdLink href="/monstros/manticora">Manticore no Compêndio</ProdLink>.
      </P>

      {/* ── 7. YOUNG GREEN DRAGON ─────────────────────────────────── */}
      <H2>7. Young Green Dragon — O Dragão Político</H2>
      <P>
        Todos os dragões são ameaças formidáveis, mas o Green Dragon
        (Dragão Verde) é especial porque sua arma mais perigosa não é o
        sopro venenoso, mas sim a mente. Dragões verdes são manipuladores,
        mentirosos e pacientes. O Young Green Dragon (CR 8) é forte o
        suficiente para ser um vilão de arco inteiro, mas inteligente o
        suficiente para nunca precisar lutar.
      </P>
      <H3>Por que o dragão verde é o melhor primeiro dragão</H3>
      <Ul>
        <Li>CR 8 é acessível para grupos de nível 5-7, o sweet spot de muitas campanhas</Li>
        <Li>Sopro venenoso em cone de 30 pés: 12d6 de dano, devastador em áreas fechadas</Li>
        <Li>Anfíbio e pode respirar embaixo d{"'"}água, com táticas de fuga inesperadas</Li>
        <Li>Pode ser patrono, informante, chantagista ou vilão; raramente {"\u201C"}só um monstro{"\u201D"}</Li>
      </Ul>
      <Tip>
        O Young Green Dragon não ataca um grupo que pode derrotá-lo.{" "}
        <ExtLink href="https://www.themonstersknow.com/dragon-tactics-part-1/">A análise de Keith Ammann</ExtLink>{" "}
        mostra que dragões jovens recuam quando enfrentam três ou mais
        combatentes corpo a corpo. Se estiver perdendo, o dragão verde
        tenta negociar: oferece informações, propõe alianças, mente
        descaradamente. Faça o grupo <em>querer</em> confiar nele. Depois,
        quebre essa confiança.
      </Tip>
      <P>
        Veja a ficha completa:{" "}
        <ProdLink href="/monstros/dragao-verde-jovem">Young Green Dragon no Compêndio</ProdLink>.
      </P>

      {/* ── 8. MIND FLAYER ────────────────────────────────────────── */}
      <SectionDivider src="/art/blog/treated-nobg/mythjourneys-anubis-god-of-the-dead.png" alt="Anubis, deus dos mortos" />

      <H2>8. Mind Flayer — Horror e Psionismo</H2>
      <P>
        Poucos monstros geram tanto medo em jogadores experientes quanto o
        Mind Flayer (Devorador de Mentes). CR 7 não parece muito no papel, mas
        o Mind Blast, um cone de 60 pés que causa 4d8+4 de dano psíquico
        e atordoa quem falhar no teste, podendo acabar com um encontro em
        um único turno. Jogadores atordoados não agem, não reagem e falham
        automaticamente em testes de Força e Destreza. Enquanto isso, o Mind
        Flayer caminha até alguém e tenta extrair o cérebro.
      </P>
      <H3>O que faz dele inesquecível</H3>
      <Ul>
        <Li>O Mind Blast atordoa múltiplos alvos: o grande equalizador contra grupos poderosos</Li>
        <Li>Extract Brain mata instantaneamente criaturas incapacitadas: morte permanente, sem death saves</Li>
        <Li>Altamente inteligente: planeja, recua, usa lacaios e nunca luta em condições desfavoráveis</Li>
        <Li>Perfeito para arcos de horror, conspirações subterrâneas e momentos de desespero</Li>
      </Ul>
      <Tip>
        <ExtLink href="https://www.themonstersknow.com/mind-flayer-tactics/">O The Monsters Know</ExtLink>{" "}
        enfatiza que Mind Flayers nunca lutam sozinhos e nunca lutam em
        termos iguais. Coloque-os com lacaios (grimlocks, intellect devourers)
        que servem de escudo e distração. O Mind Flayer abre com Mind Blast,
        se teletransporta via Plane Shift se as coisas ficam feias, e volta
        mais preparado. A sensação de {"\u201C"}ele escapou{"\u201D"} é mais aterrorizante
        do que qualquer derrota.
      </Tip>

      {/* ── 9. BEHOLDER ───────────────────────────────────────────── */}
      <H2>9. Beholder — O BBEG Icônico</H2>
      <P>
        O Beholder é, para muitos, <em>o</em> monstro de D&D. Uma esfera
        flutuante com um olho central gigante e dez pedúnculos oculares, cada
        um disparando um raio diferente: desintegração, petrificação,
        charme, medo, telecinesia, entre outros. Com CR 13, é um boss fight
        de campanha inteira. E o mais impressionante: sua habilidade
        Antimagic Cone anula toda magia num cone de 150 pés na direção que
        ele olha, forçando casters a repensar suas estratégias.
      </P>
      <H3>Por que é o boss definitivo</H3>
      <Ul>
        <Li>10 raios oculares com efeitos diferentes, cada turno é imprevisível</Li>
        <Li>Antimagic Cone desliga magias, itens mágicos e concentração: terrível para casters</Li>
        <Li>Lair Actions tornam o covil tão perigoso quanto a criatura: limo no chão, tentáculos nas paredes</Li>
        <Li>Paranoico e megalomaníaco, o roleplay de um Beholder escreve a aventura sozinho</Li>
      </Ul>
      <Tip>
        <ExtLink href="https://www.themonstersknow.com/beholder-tactics/">Segundo a análise do The Monsters Know</ExtLink>,
        Beholders são agressivos e antissociais, e atacam invasores
        imediatamente. O Beholder aponta o Antimagic Cone para onde estão
        os casters e usa os raios dos pedúnculos contra os marciais. Rode
        o covil com as Lair Actions: chão escorregadio, olhos nas paredes,
        apêndices que agarram. O grupo precisa se dividir para vencer,
        e dividir o grupo contra um Beholder é aterrorizante.
      </Tip>

      {/* ── 10. LICH ──────────────────────────────────────────────── */}
      <H2>10. Lich — O Vilão Definitivo</H2>
      <P>
        Se o Beholder é o boss de uma dungeon, o Lich é o vilão de uma
        campanha inteira. Um mago que transcendeu a morte através de um
        phylactery, o Lich (CR 21) tem acesso a magias de até 9º nível,
        Legendary Resistance (3/dia), Legendary Actions e um covil com
        efeitos devastadores. Derrotá-lo em combate é apenas metade da
        batalha. Se o phylactery não for destruído, ele retorna em
        1d10 dias com HP completo.
      </P>
      <H3>O que torna o Lich inigualável</H3>
      <Ul>
        <Li>Spellcasting de 18º nível: Power Word Kill, Disintegrate, Globe of Invulnerability</Li>
        <Li>Legendary Resistance garante que ele não morra para um único Banishment bem sucedido</Li>
        <Li>O phylactery cria uma quest dentro da quest: encontrá-lo e destruí-lo é uma aventura à parte</Li>
        <Li>Lair Actions que drenam vida, invocam espíritos e conectam-se telepaticamente a intrusos</Li>
        <Li>Funciona como BBEG de campanha, patrono traiçoeiro ou ameaça ancestral adormecida</Li>
      </Ul>
      <Tip>
        <ExtLink href="https://www.themonstersknow.com/undead-tactics-liches/">Keith Ammann argumenta</ExtLink>{" "}
        que um Lich nunca sai do seu covil a menos que seja absolutamente
        necessário. Toda interação com os jogadores acontece através de
        lacaios, ilusões e manipulação política. Quando o grupo finalmente
        chega ao covil, o Lich já sabe tudo sobre eles. Rode o Lich como
        alguém que teve <em>séculos</em> para se preparar, porque teve.
        Ele sabe as magias do mago, as fraquezas do paladino e a
        identidade do assassino disfarçado.
      </Tip>
      <P>
        Veja a ficha completa:{" "}
        <ProdLink href="/monstros/lich">Lich no Compêndio</ProdLink>.
      </P>

      {/* ── CONCLUSÃO & DICAS GERAIS ──────────────────────────────── */}
      <H2>Ter a lista é fácil. Usar bem é outra história.</H2>
      <P>
        Saber quais monstros usar é metade. A outra metade é rodar eles de um
        jeito que os jogadores lembrem semanas depois.
      </P>
      <H3>Leia a motivação, não só o stat block</H3>
      <P>
        Um Goblin que foge é mais interessante que um Goblin que morre de pé.
        Uma Manticora que exige tributo é mais memorável que uma que ataca
        cegamente. Antes de rodar o monstro, pergunte: o que essa criatura{" "}
        <em>quer</em>? A resposta muda tudo. Referências como{" "}
        <ExtLink href="https://slyflourish.com/choosing_monsters.html">Sly Flourish</ExtLink>{" "}
        recomendam escolher monstros pela história, não pelo CR.
      </P>
      <H3>Varie os tipos de ameaça</H3>
      <P>
        Essa lista cobre propositalmente diferentes tipos de desafio:
        combate tático (Goblin, Manticore), horror (Mind Flayer, Basilisk),
        roleplay (Young Green Dragon, Lich), pânico instantâneo (Owlbear,
        Dire Wolf) e paranoia ambiental (Mimic, Beholder). Alterne entre
        eles para manter seus jogadores alertas.
      </P>
      <H3>Use um combat tracker para monstros complexos</H3>
      <P>
        Monstros como o Beholder (10 raios + lair actions) e o Lich
        (spellcasting de 18º nível + legendary actions) exigem que o mestre
        gerencie muita informação simultânea. Um combat tracker digital
        mantém HP, condições, ordem de iniciativa e stat blocks organizados,
        para que você possa focar na narrativa em vez de consultar tabelas.
      </P>

      <CTA category="lista" />

      <H2>Referências e Leitura Adicional</H2>
      <Ul>
        <Li>
          <ExtLink href="https://www.themonstersknow.com/">The Monsters Know What They{"'"}re Doing</ExtLink>{" "}
          — análises táticas detalhadas para centenas de monstros do D&D 5e
        </Li>
        <Li>
          <ExtLink href="https://slyflourish.com/making_monsters_interesting.html">Making Monsters Interesting (Sly Flourish)</ExtLink>{" "}
          — como customizar e dar personalidade a qualquer monstro
        </Li>
        <Li>
          <ExtLink href="https://slyflourish.com/choosing_monsters.html">Choosing Monsters for Your Game (Sly Flourish)</ExtLink>{" "}
          — filosofia de seleção de monstros baseada na história
        </Li>
      </Ul>
      <P>
        Todos os monstros desta lista estão disponíveis gratuitamente no{" "}
        <ProdLink href="/monstros">compêndio de monstros do Pocket DM</ProdLink>, com stat
        blocks completos em português. Quer testá-los em combate? Use o{" "}
        <ProdLink href="/try">combat tracker gratuito</ProdLink> ou veja nosso{" "}
        <IntLink slug="como-montar-encontro-balanceado-dnd-5e">guia de encontros balanceados</IntLink>{" "}
        e o{" "}
        <IntLink slug="guia-challenge-rating-dnd-5e">guia de Challenge Rating</IntLink>.
        Boas sessões começam com bons monstros, e agora você tem dez dos
        melhores no seu arsenal.
      </P>

      <CTA category="lista" />
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   BLOG POST 10 — Como Mestrar D&D pela Primeira Vez
   ═══════════════════════════════════════════════════════════════════ */
export function BlogPost10() {
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

/* ═══════════════════════════════════════════════════════════════════
   BLOG POST 11 — Música Ambiente para RPG: Como Escolher a Trilha
   Sonora Certa para Cada Cena
   ═══════════════════════════════════════════════════════════════════ */
export function BlogPost11() {
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

/* ═══════════════════════════════════════════════════════════════════
   BLOG POST 12 — Teatro da Mente vs Grid: Qual Estilo de Combate?
   ═══════════════════════════════════════════════════════════════════ */
export function BlogPost12() {
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

/* ═══════════════════════════════════════════════════════════════
   Post 13 — Build: Half-Elf (Drow) Order Cleric 1 / Divine Soul Sorcerer — PT-BR
   ═══════════════════════════════════════════════════════════════ */
export function BlogPost13() {
  return (
    <BuildVariantProvider defaultVariant="rolled">
      {/* Quote de abertura */}
      <div className="rounded-xl border border-gold/20 bg-gold/[0.04] p-6 my-8 text-center relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[200px] h-[100px] bg-gold/[0.06] rounded-full blur-[60px]" />
        <p className="relative text-lg italic text-gold/90 font-display">
          {"\u201C"}Eu serei a fundação.{"\u201D"}
        </p>
        <p className="relative text-xs text-muted-foreground mt-2">— Capa Barsavi</p>
      </div>

      <P>
        Capa Barsavi não era o que causava mais dano, não era o que recebia os
        golpes, e não era o que roubava a cena. Ele era o motivo pelo qual todos
        os outros podiam fazer isso. Um <strong>Order Cleric 1 / Divine Soul Sorcerer</strong>{" "}
        construído para ser a engrenagem invisível que faz a máquina funcionar,
        e uma das builds de suporte mais eficientes do D&amp;D 5e.
      </P>

      <P>
        Abaixo apresentamos duas versões da build: a <strong>original jogada em
        campanha</strong> com dados rolados e Half-Elf, e uma{" "}
        <strong>reconstrução otimizada com Point Buy</strong> usando Shadar-kai.
        Escolha a variante e o artigo inteiro se adapta.
      </P>

      {/* ─── TOGGLE ─── */}
      <BuildVariantToggle
        variants={[
          { id: "rolled", label: "Half-Elf (Drow)", sub: "Dados Rolados" },
          { id: "pointbuy", label: "Shadar-kai", sub: "Point Buy" },
        ]}
      />

      {/* ═══════════════════════════════════════════════════════════
         FICHA EM 30 SEGUNDOS
         ═══════════════════════════════════════════════════════════ */}
      <H2>A ficha em 30 segundos</H2>

      <div className="overflow-x-auto mb-6">
        <table className="w-full text-sm text-foreground/80 border-collapse">
          <tbody>
            <tr className="border-b border-white/[0.06]">
              <td className="py-2 pr-4 font-semibold text-gold/80 whitespace-nowrap">Raça</td>
              <td className="py-2">
                <Variant id="rolled">Half-Elf (Drow)</Variant>
                <Variant id="pointbuy">Shadar-kai (Tasha{"'"}s / MotM)</Variant>
              </td>
            </tr>
            <tr className="border-b border-white/[0.06]">
              <td className="py-2 pr-4 font-semibold text-gold/80 whitespace-nowrap">Classe</td>
              <td className="py-2">Cleric 1 (Order Domain) / Sorcerer 9 (Divine Soul)</td>
            </tr>
            <tr className="border-b border-white/[0.06]">
              <td className="py-2 pr-4 font-semibold text-gold/80 whitespace-nowrap">Nível</td>
              <td className="py-2">10</td>
            </tr>
            <tr className="border-b border-white/[0.06]">
              <td className="py-2 pr-4 font-semibold text-gold/80 whitespace-nowrap">Foco</td>
              <td className="py-2">Suporte / Controle / Multiplicador de ação</td>
            </tr>
            <tr className="border-b border-white/[0.06]">
              <td className="py-2 pr-4 font-semibold text-gold/80 whitespace-nowrap">Atributos</td>
              <td className="py-2">
                <Variant id="rolled">4d6 drop lowest (campanha)</Variant>
                <Variant id="pointbuy">Point Buy (15 / 15 / 15 / 8 / 8 / 8)</Variant>
              </td>
            </tr>
            <tr className="border-b border-white/[0.06]">
              <td className="py-2 pr-4 font-semibold text-gold/80 whitespace-nowrap">Feats</td>
              <td className="py-2">
                <Variant id="rolled">Resilient (CON), Fey Touched</Variant>
                <Variant id="pointbuy">Resilient (CON), +2 CHA ou Lucky</Variant>
              </td>
            </tr>
            <tr className="border-b border-white/[0.06]">
              <td className="py-2 pr-4 font-semibold text-gold/80 whitespace-nowrap">Metamagic</td>
              <td className="py-2">Quickened Spell, Extended Spell</td>
            </tr>
            <tr>
              <td className="py-2 pr-4 font-semibold text-gold/80 whitespace-nowrap">Dificuldade</td>
              <td className="py-2">Médio — exige conhecimento de sinergia e timing</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ═══════════════════════════════════════════════════════════
         RAÇA — VARIANTE
         ═══════════════════════════════════════════════════════════ */}
      <H2>Raça</H2>

      <Variant id="rolled">
        <H3>Half-Elf (Drow)</H3>
        <P>
          Half-Elf é uma das raças mais flexíveis do 5e. O +2 CHA é exatamente o
          que um Sorcerer precisa, e os dois +1 extras permitem arredondar CON e
          DEX, atributos essenciais para sobrevivência e AC. A variante Drow
          adiciona Darkvision 60ft e Fey Ancestry (vantagem contra charm e
          imunidade a sono mágico), traços defensivos valiosos para quem precisa
          manter concentração.
        </P>
        <StrategyBox title="Por que Drow e não High Elf?">
          <p>
            A variante Drow (SCAG) troca as duas proficiências de Skill
            Versatility por Drow Magic: o cantrip <em>dancing lights</em>{" "}
            gratuito, e no nível 3 <em>faerie fire</em> 1x/dia (sem gastar
            slot). Faerie fire é brutal: vantagem em ataques contra todos os
            alvos afetados, sinergia perfeita com Voice of Authority. High Elf
            daria apenas um cantrip de Wizard — esta build já tem cantrips
            suficientes.
          </p>
        </StrategyBox>
        <div className="overflow-x-auto mb-6">
          <table className="w-full text-sm text-foreground/80 border-collapse">
            <thead>
              <tr className="border-b border-gold/20 text-gold/70 text-xs uppercase tracking-wider">
                <th className="py-2 text-left">Traço</th>
                <th className="py-2 text-left">Detalhe</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-white/[0.06]">
                <td className="py-2 pr-4 font-semibold whitespace-nowrap">ASI</td>
                <td className="py-2">+2 CHA, +1 CON, +1 DEX</td>
              </tr>
              <tr className="border-b border-white/[0.06]">
                <td className="py-2 pr-4 font-semibold whitespace-nowrap">Darkvision</td>
                <td className="py-2">60ft</td>
              </tr>
              <tr className="border-b border-white/[0.06]">
                <td className="py-2 pr-4 font-semibold whitespace-nowrap">Fey Ancestry</td>
                <td className="py-2">Vantagem em saves contra charm, imune a sono mágico</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 font-semibold whitespace-nowrap">Drow Magic</td>
                <td className="py-2">Dancing lights (cantrip), faerie fire 1x/dia (nível 3)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Variant>

      <Variant id="pointbuy">
        <H3>Shadar-kai</H3>
        <P>
          Se sua mesa usa Point Buy e permite ASIs flexíveis (Tasha{"'"}s Cauldron
          / MotM), <strong>Shadar-kai</strong> é a raça ideal para esta build.
          Com o array 15/15/15/8/8/8, você coloca os 15s em CHA, CON e WIS, e
          usa os bônus raciais (+2 CON, +1 CHA) para chegar a{" "}
          <strong>CON 17, CHA 16, WIS 15</strong> no nível 1.
        </P>
        <P>
          A grande vantagem: <strong>Blessing of the Raven Queen</strong>.
          Uma vez por long rest, como bônus action, você se teleporta 30ft e ganha
          resistência a <em>todo dano</em> até o início do seu próximo turno.
          Para um caster frontline que precisa se manter vivo concentrando Bless
          ou Spirit Guardians, isso é brutalmente superior a Misty Step, que
          é apenas mobilidade sem proteção.
        </P>
        <StrategyBox title="Blessing of the Raven Queen vs Misty Step">
          <p>
            Misty Step (da Fey Touched na variante Half-Elf) é bônus action +
            30ft de teleporte, disponível 1x/dia grátis + spell slots adicionais.
            Blessing of the Raven Queen é bônus action + 30ft de teleporte +
            resistência a <em>todo dano</em> por 1 turno, mas apenas 1x/long
            rest. Mesmo alcance, mas a Blessing adiciona uma camada de
            sobrevivência que Misty Step não tem. O trade-off: Misty Step pode
            ser usado múltiplas vezes com spell slots, a Blessing é 1x/dia.
          </p>
        </StrategyBox>
        <div className="overflow-x-auto mb-6">
          <table className="w-full text-sm text-foreground/80 border-collapse">
            <thead>
              <tr className="border-b border-gold/20 text-gold/70 text-xs uppercase tracking-wider">
                <th className="py-2 text-left">Traço</th>
                <th className="py-2 text-left">Detalhe</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-white/[0.06]">
                <td className="py-2 pr-4 font-semibold whitespace-nowrap">ASI (Tasha{"'"}s)</td>
                <td className="py-2">+2 CON, +1 CHA</td>
              </tr>
              <tr className="border-b border-white/[0.06]">
                <td className="py-2 pr-4 font-semibold whitespace-nowrap">Darkvision</td>
                <td className="py-2">60ft</td>
              </tr>
              <tr className="border-b border-white/[0.06]">
                <td className="py-2 pr-4 font-semibold whitespace-nowrap">Fey Ancestry</td>
                <td className="py-2">Vantagem em saves contra charm, imune a sono mágico</td>
              </tr>
              <tr className="border-b border-white/[0.06]">
                <td className="py-2 pr-4 font-semibold whitespace-nowrap">Trance</td>
                <td className="py-2">4h de descanso em vez de 8h de sono</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 font-semibold whitespace-nowrap">Blessing of the Raven Queen</td>
                <td className="py-2">1x/long rest — teleporte 30ft + resistência a todo dano por 1 turno</td>
              </tr>
            </tbody>
          </table>
        </div>
        <P>
          <strong>Trade-off honesto:</strong> DEX 8 significa &minus;1 em
          iniciativa e DEX saves. Com heavy armor do Cleric, AC não é afetada,
          mas você vai agir depois de quase todo mundo. Gift of Alacrity (se
          disponível como magia via Sorcerer) ajuda a compensar, mas essa
          versão aceita ser mais lenta em troca de ser mais resistente.
        </P>
      </Variant>

      {/* ═══════════════════════════════════════════════════════════
         ATRIBUTOS — VARIANTE
         ═══════════════════════════════════════════════════════════ */}
      <H2>Atributos</H2>

      <Variant id="rolled">
        <Tip>
          Estes atributos foram rolados com 4d6 drop lowest durante a
          campanha. Cada mesa rola diferente — o importante são as{" "}
          <strong>prioridades</strong>: CHA &gt; CON &gt; WIS &gt; DEX.
        </Tip>
        <H3>Atributos finais (nível 10)</H3>
        <div className="overflow-x-auto mb-6">
          <table className="w-full text-sm text-foreground/80 border-collapse">
            <thead>
              <tr className="border-b border-gold/20 text-gold/70 text-xs uppercase tracking-wider">
                <th className="py-2 text-left">Atributo</th>
                <th className="py-2 text-center">Base</th>
                <th className="py-2 text-center">Racial</th>
                <th className="py-2 text-center">Nível 10</th>
                <th className="py-2 text-center">Mod</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-white/[0.06]">
                <td className="py-2 font-semibold">STR</td>
                <td className="py-2 text-center">10</td>
                <td className="py-2 text-center text-muted-foreground">—</td>
                <td className="py-2 text-center">10</td>
                <td className="py-2 text-center text-muted-foreground">+0</td>
              </tr>
              <tr className="border-b border-white/[0.06]">
                <td className="py-2 font-semibold">DEX</td>
                <td className="py-2 text-center">13</td>
                <td className="py-2 text-center text-gold/70">+1</td>
                <td className="py-2 text-center">14</td>
                <td className="py-2 text-center text-green-400/70">+2</td>
              </tr>
              <tr className="border-b border-white/[0.06]">
                <td className="py-2 font-semibold">CON</td>
                <td className="py-2 text-center">17</td>
                <td className="py-2 text-center text-gold/70">+1</td>
                <td className="py-2 text-center">19*</td>
                <td className="py-2 text-center text-green-400/70">+4</td>
              </tr>
              <tr className="border-b border-white/[0.06]">
                <td className="py-2 font-semibold">INT</td>
                <td className="py-2 text-center">8</td>
                <td className="py-2 text-center text-muted-foreground">—</td>
                <td className="py-2 text-center">8</td>
                <td className="py-2 text-center text-red-400/70">&minus;1</td>
              </tr>
              <tr className="border-b border-white/[0.06]">
                <td className="py-2 font-semibold">WIS</td>
                <td className="py-2 text-center">12</td>
                <td className="py-2 text-center text-muted-foreground">—</td>
                <td className="py-2 text-center">14&dagger;</td>
                <td className="py-2 text-center text-green-400/70">+2</td>
              </tr>
              <tr>
                <td className="py-2 font-semibold">CHA</td>
                <td className="py-2 text-center">16</td>
                <td className="py-2 text-center text-gold/70">+2</td>
                <td className="py-2 text-center">18&Dagger;</td>
                <td className="py-2 text-center text-green-400/70">+4</td>
              </tr>
            </tbody>
          </table>
          <p className="text-xs text-muted-foreground/60 mt-2">
            * Resilient CON (+1) &nbsp;|&nbsp; &dagger; Fey Touched (+1 WIS) &nbsp;|&nbsp; &Dagger; Tome of Leadership (+2 CHA)
          </p>
        </div>

        <H3>Progressão por nível</H3>
        <div className="overflow-x-auto mb-6">
          <table className="w-full text-xs sm:text-sm text-foreground/80 border-collapse">
            <thead>
              <tr className="border-b border-gold/20 text-gold/70 text-[10px] sm:text-xs uppercase tracking-wider">
                <th className="py-2 text-left">Nível</th>
                <th className="py-2 text-left">Evento</th>
                <th className="py-2 text-center">STR</th>
                <th className="py-2 text-center">DEX</th>
                <th className="py-2 text-center">CON</th>
                <th className="py-2 text-center">INT</th>
                <th className="py-2 text-center">WIS</th>
                <th className="py-2 text-center">CHA</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-white/[0.06]">
                <td className="py-1.5">1</td>
                <td className="py-1.5 text-xs">Rolado + Half-Elf (+2/+1/+1)</td>
                <td className="py-1.5 text-center">10</td>
                <td className="py-1.5 text-center">14</td>
                <td className="py-1.5 text-center">18</td>
                <td className="py-1.5 text-center">8</td>
                <td className="py-1.5 text-center">12</td>
                <td className="py-1.5 text-center">18</td>
              </tr>
              <tr className="border-b border-white/[0.06]">
                <td className="py-1.5">5</td>
                <td className="py-1.5 text-xs">Sorc 4 — Resilient (CON)</td>
                <td className="py-1.5 text-center">10</td>
                <td className="py-1.5 text-center">14</td>
                <td className="py-1.5 text-center text-gold">19</td>
                <td className="py-1.5 text-center">8</td>
                <td className="py-1.5 text-center">12</td>
                <td className="py-1.5 text-center">18</td>
              </tr>
              <tr className="border-b border-white/[0.06]">
                <td className="py-1.5">9</td>
                <td className="py-1.5 text-xs">Sorc 8 — Fey Touched (+1 WIS)</td>
                <td className="py-1.5 text-center">10</td>
                <td className="py-1.5 text-center">14</td>
                <td className="py-1.5 text-center">19</td>
                <td className="py-1.5 text-center">8</td>
                <td className="py-1.5 text-center text-gold">14</td>
                <td className="py-1.5 text-center">18</td>
              </tr>
              <tr>
                <td className="py-1.5">10</td>
                <td className="py-1.5 text-xs">Tome of Leadership (+2 CHA)</td>
                <td className="py-1.5 text-center">10</td>
                <td className="py-1.5 text-center">14</td>
                <td className="py-1.5 text-center">19</td>
                <td className="py-1.5 text-center">8</td>
                <td className="py-1.5 text-center">14</td>
                <td className="py-1.5 text-center text-gold">20</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Variant>

      <Variant id="pointbuy">
        <Tip>
          Point Buy 15/15/15/8/8/8 com Shadar-kai. Os 15s vão em CHA, CON e WIS.
          Os raciais (+2 CON, +1 CHA) fecham CON ímpar no nível 1, arredondado
          por Resilient no nível 5. Esta variante prioriza{" "}
          <strong>sobrevivência</strong> sobre casting puro.
        </Tip>
        <H3>Atributos finais (nível 10)</H3>
        <div className="overflow-x-auto mb-6">
          <table className="w-full text-sm text-foreground/80 border-collapse">
            <thead>
              <tr className="border-b border-gold/20 text-gold/70 text-xs uppercase tracking-wider">
                <th className="py-2 text-left">Atributo</th>
                <th className="py-2 text-center">Point Buy</th>
                <th className="py-2 text-center">Racial</th>
                <th className="py-2 text-center">Nível 10</th>
                <th className="py-2 text-center">Mod</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-white/[0.06]">
                <td className="py-2 font-semibold">STR</td>
                <td className="py-2 text-center">8</td>
                <td className="py-2 text-center text-muted-foreground">—</td>
                <td className="py-2 text-center">8</td>
                <td className="py-2 text-center text-red-400/70">&minus;1</td>
              </tr>
              <tr className="border-b border-white/[0.06]">
                <td className="py-2 font-semibold">DEX</td>
                <td className="py-2 text-center">8</td>
                <td className="py-2 text-center text-muted-foreground">—</td>
                <td className="py-2 text-center">8</td>
                <td className="py-2 text-center text-red-400/70">&minus;1</td>
              </tr>
              <tr className="border-b border-white/[0.06]">
                <td className="py-2 font-semibold">CON</td>
                <td className="py-2 text-center">15</td>
                <td className="py-2 text-center text-gold/70">+2</td>
                <td className="py-2 text-center">18*</td>
                <td className="py-2 text-center text-green-400/70">+4</td>
              </tr>
              <tr className="border-b border-white/[0.06]">
                <td className="py-2 font-semibold">INT</td>
                <td className="py-2 text-center">8</td>
                <td className="py-2 text-center text-muted-foreground">—</td>
                <td className="py-2 text-center">8</td>
                <td className="py-2 text-center text-red-400/70">&minus;1</td>
              </tr>
              <tr className="border-b border-white/[0.06]">
                <td className="py-2 font-semibold">WIS</td>
                <td className="py-2 text-center">15</td>
                <td className="py-2 text-center text-muted-foreground">—</td>
                <td className="py-2 text-center">15</td>
                <td className="py-2 text-center text-green-400/70">+2</td>
              </tr>
              <tr>
                <td className="py-2 font-semibold">CHA</td>
                <td className="py-2 text-center">15</td>
                <td className="py-2 text-center text-gold/70">+1</td>
                <td className="py-2 text-center">18&dagger;</td>
                <td className="py-2 text-center text-green-400/70">+4</td>
              </tr>
            </tbody>
          </table>
          <p className="text-xs text-muted-foreground/60 mt-2">
            * Resilient CON (+1) &nbsp;|&nbsp; &dagger; +2 CHA no Sorc 8 (ou Lucky — veja abaixo)
          </p>
        </div>

        <H3>Progressão por nível</H3>
        <div className="overflow-x-auto mb-6">
          <table className="w-full text-xs sm:text-sm text-foreground/80 border-collapse">
            <thead>
              <tr className="border-b border-gold/20 text-gold/70 text-[10px] sm:text-xs uppercase tracking-wider">
                <th className="py-2 text-left">Nível</th>
                <th className="py-2 text-left">Evento</th>
                <th className="py-2 text-center">STR</th>
                <th className="py-2 text-center">DEX</th>
                <th className="py-2 text-center">CON</th>
                <th className="py-2 text-center">INT</th>
                <th className="py-2 text-center">WIS</th>
                <th className="py-2 text-center">CHA</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-white/[0.06]">
                <td className="py-1.5">1</td>
                <td className="py-1.5 text-xs">Point Buy + Shadar-kai (+2/+1)</td>
                <td className="py-1.5 text-center">8</td>
                <td className="py-1.5 text-center">8</td>
                <td className="py-1.5 text-center">17</td>
                <td className="py-1.5 text-center">8</td>
                <td className="py-1.5 text-center">15</td>
                <td className="py-1.5 text-center">16</td>
              </tr>
              <tr className="border-b border-white/[0.06]">
                <td className="py-1.5">5</td>
                <td className="py-1.5 text-xs">Sorc 4 — Resilient (CON)</td>
                <td className="py-1.5 text-center">8</td>
                <td className="py-1.5 text-center">8</td>
                <td className="py-1.5 text-center text-gold">18</td>
                <td className="py-1.5 text-center">8</td>
                <td className="py-1.5 text-center">15</td>
                <td className="py-1.5 text-center">16</td>
              </tr>
              <tr>
                <td className="py-1.5">9</td>
                <td className="py-1.5 text-xs">Sorc 8 — +2 CHA ou Lucky</td>
                <td className="py-1.5 text-center">8</td>
                <td className="py-1.5 text-center">8</td>
                <td className="py-1.5 text-center">18</td>
                <td className="py-1.5 text-center">8</td>
                <td className="py-1.5 text-center">15</td>
                <td className="py-1.5 text-center text-gold">18 ou 16</td>
              </tr>
            </tbody>
          </table>
        </div>

        <StrategyBox title="A decisão do nível 9: +2 CHA ou Lucky?">
          <p>
            <strong>+2 CHA (→ 18):</strong> fecha o modificador em +4. Spell save
            DC sobe de 14 para 15, spell attack de +7 para +8. É a escolha caster
            pura — suas magias acertam e grudam mais.
          </p>
          <p>
            <strong>Lucky:</strong> CHA fica em 16 (+3), mas você ganha 3 rerolls
            por dia. Pode usar em saves de concentração, saves contra efeitos
            letais, ou até forçar um inimigo a rerollar um ataque contra você.
            É a escolha sobrevivente — aceita ser um caster levemente inferior em
            troca de 3 momentos de {"\u201C"}não hoje{"\u201D"} por dia.
          </p>
          <p>
            <strong>Recomendação:</strong> se seu grupo tem bastante dano e precisa
            que você fique vivo, Lucky. Se você é o principal caster ofensivo,
            +2 CHA.
          </p>
        </StrategyBox>
      </Variant>

      {/* ═══════════════════════════════════════════════════════════
         CLASSE E FEATURES — COMPARTILHADO
         ═══════════════════════════════════════════════════════════ */}
      <H2>Classe e features</H2>

      <H3>Cleric 1 — Order Domain</H3>
      <P>
        O dip de um nível em Cleric (Order Domain) é o coração da build.{" "}
        <strong>Voice of Authority</strong> é a feature que transforma um
        caster de suporte em um multiplicador de ações: toda vez que você
        conjura uma magia com spell slot mirando um aliado, esse aliado pode
        usar sua reação para fazer um ataque de arma.
      </P>
      <P>
        Além disso, o nível de Cleric traz proficiência em armaduras pesadas e
        escudos (AC 19-21), saves de Sabedoria, e acesso a magias clericais de
        1º nível como Command e Heroism, ambas preparadas gratuitamente
        pelo domínio.
      </P>

      <StrategyBox title="Voice of Authority — Por que é tão forte">
        <p>
          Voice of Authority ativa em <em>qualquer</em> magia com spell slot que
          mire um aliado. Bless mira 3 aliados? Escolha o Fighter. Healing Word
          num aliado caído? Ele levanta E ataca. Aid num Paladin? Ele ganha HP
          temporário e um ataque de reação com Smite.
        </p>
        <p>
          Com Quickened Spell, você pode buffar (ativando Voice of Authority) como bônus
          action e ainda usar sua ação normalmente. É um ataque extra gratuito para
          seu grupo <em>em cada turno</em> que você buffa alguém.
        </p>
      </StrategyBox>

      <H3>Sorcerer — Divine Soul</H3>
      <P>
        Divine Soul Sorcerer é avaliado pela comunidade como{" "}
        <strong>tier S</strong> entre as subclasses de Sorcerer, e por bom
        motivo. Ele dá acesso à <strong>lista inteira de magias de Cleric</strong>{" "}
        sem precisar de mais níveis em Cleric. Isso significa Spirit Guardians,
        Aid, Revivify, Death Ward — tudo usando Carisma e com Metamagic
        disponível.
      </P>
      <P>
        As features da subclasse são igualmente fortes:{" "}
        <strong>Favored by the Gods</strong> (2d4 de bônus em um save ou ataque
        falhado, 1x por descanso) e{" "}
        <strong>Empowered Healing</strong> (reroll dados de cura para aliados
        próximos). Ambas reforçam o papel de suporte confiável.
      </P>

      <H3>Feats</H3>

      <Ul>
        <Li>
          <strong>Resilient (CON) — Sorc 4:</strong> Proficiência em saves de
          Constituição é essencial para manter concentração em magias como
          Bless e Spirit Guardians. No nível 10, o bônus de +7/+8 em saves de
          CON torna quase impossível perder concentração em danos baixos e
          moderados.
        </Li>
      </Ul>

      <Variant id="rolled">
        <Ul>
          <Li>
            <strong>Fey Touched — Sorc 8:</strong> +1 WIS (arredondando de 13
            para 14), Misty Step gratuito 1x/dia (mobilidade essencial para um
            caster frontline), e Gift of Alacrity (bônus de 1d8 em iniciativa para
            garantir que os buffs cheguem antes dos inimigos agirem).
          </Li>
        </Ul>
      </Variant>
      <Variant id="pointbuy">
        <Ul>
          <Li>
            <strong>+2 CHA ou Lucky — Sorc 8:</strong> Como Shadar-kai já tem
            Blessing of the Raven Queen como mobilidade de emergência, o nível 8
            abre para fechar CHA 18 (+2 ASI) ou pegar Lucky para 3 rerolls/dia.
            Sem Fey Touched, você perde Gift of Alacrity — mas com DEX 8, iniciativa
            já não era seu forte de qualquer forma.
          </Li>
        </Ul>
      </Variant>

      <H3>Metamagic</H3>
      <Ul>
        <Li>
          <strong>Quickened Spell:</strong> Transforma uma magia de ação em
          bônus action. Permite conjurar um buff (ativando Voice of Authority)
          e ainda usar sua ação para Dodge, cantrip, ou outra magia no mesmo turno.
        </Li>
        <Li>
          <strong>Extended Spell:</strong> Dobra a duração de magias como Aid
          (agora 16 horas em vez de 8), Death Ward, e qualquer buff de
          concentração longa. Excelente para preparação antes de encontros.
        </Li>
      </Ul>

      {/* ═══════════════════════════════════════════════════════════
         ESTRATÉGIA DE COMBATE — EXPANDIDO
         ═══════════════════════════════════════════════════════════ */}
      <H2>Estratégia de combate</H2>

      <P>
        Esta build não funciona como um caster tradicional. Você não fica atrás
        lançando Fireball. Você entra na frontline, concentra seu buff principal,
        entra em Dodge, e transforma cada reação em valor pro grupo. O dano vem
        dos aliados — o seu trabalho é sobreviver e mantê-los fortalecidos.
      </P>

      <H3>Turno 1 — Montar a fundação</H3>
      <StrategyBox title="Flowchart do Round 1">
        <p>
          <strong>Bônus action:</strong> Quickened Bless em 3 aliados.
          Voice of Authority ativa: escolha o aliado com maior DPR (Fighter,
          Paladin, Rogue) para o ataque de reação gratuito.
        </p>
        <p>
          <strong>Ação:</strong> Dodge. Sim, Dodge. Você está na frontline com
          AC 19-21 e Bless concentrado. Seu trabalho agora é{" "}
          <em>não perder concentração</em>, não causar dano.
        </p>
        <p>
          <strong>Movimento:</strong> Posicionar-se entre os aliados e os
          inimigos. Você quer estar ao alcance de Silvery Barbs e próximo dos
          alvos de Spirit Guardians quando for a hora.
        </p>
      </StrategyBox>

      <H3>Entre turnos — Silvery Barbs como motor</H3>
      <P>
        Aqui está o segredo da build. Silvery Barbs custa uma reação e faz
        duas coisas: força o inimigo a rerollar um teste (ataque, save, check)
        E dá vantagem a um aliado no próximo d20 dele. Mas como é uma magia
        com spell slot mirando um aliado (o beneficiado), ela ativa{" "}
        <strong>Voice of Authority</strong>.
      </P>
      <P>
        Resultado prático: <strong>entre seus turnos</strong>, toda vez que um
        inimigo acerta algo importante, você usa Silvery Barbs → o inimigo
        rerolla → seu aliado ganha vantagem E um ataque de reação gratuito.
        Isso acontece <em>fora do seu turno</em>, sem custar ação nem bônus
        action.
      </P>

      <StrategyBox title="Silvery Barbs + Voice of Authority — a combo">
        <p>
          Inimigo acerta um ataque contra o Wizard → Você usa Silvery Barbs como
          reação → Inimigo rerolla (possivelmente erra) → Fighter ganha vantagem
          no próximo ataque E um ataque de reação agora via Voice of Authority.
          Resultado: inimigo possivelmente falhou, Fighter atacou, Fighter tem
          vantagem no próximo ataque. Tudo com 1 spell slot e 0 ações.
        </p>
      </StrategyBox>

      <H3>Turnos 2+ — Manter e escalar</H3>
      <P>
        Com Bless ativo e Dodge rolando, seus turnos seguintes são flexíveis:
      </P>
      <Ul>
        <Li>
          <strong>Se o combate é longo:</strong> mantenha Bless + Dodge. Use
          Silvery Barbs nas reações. Jogue cantrips (Toll the Dead, Sacred Flame)
          como ação se não precisar de Dodge.
        </Li>
        <Li>
          <strong>Se há muitos inimigos agrupados:</strong> solte Bless e mude
          concentração para Spirit Guardians. Quickened Spirit Guardians como
          bônus action + Dodge como ação. Cada inimigo que começa o turno perto
          de você toma 3d8 radiant.
        </Li>
        <Li>
          <strong>Se precisa de dano imediato:</strong> Fireball ou outra magia
          de área. Quickened Bless → Ação Fireball funciona, e ainda ativa
          Voice of Authority.
        </Li>
        <Li>
          <strong>Emergência:</strong> Healing Word (bônus action, cura à
          distância para levantar um aliado caído) ou Revivify se alguém morreu.
        </Li>
      </Ul>

      <Variant id="rolled">
        <StrategyBox title="Fey Touched como mobility">
          <p>
            Na variante Half-Elf, Misty Step (da Fey Touched) é seu escape de
            emergência. Se você está cercado e a concentração está em risco,
            Misty Step 30ft como bônus action para sair, Dodge como ação.
            Gift of Alacrity garante que você frequentemente age antes dos
            inimigos no Round 1.
          </p>
        </StrategyBox>
      </Variant>
      <Variant id="pointbuy">
        <StrategyBox title="Blessing of the Raven Queen como panic button">
          <p>
            Na variante Shadar-kai, Blessing of the Raven Queen substitui Misty
            Step como escape. Mesmo alcance (30ft), mas com resistência a todo
            dano até o início do próximo turno. Se você está cercado e
            concentrando Spirit Guardians, ative a Blessing: teleporte para
            segurança + todo dano que vier no turno dos inimigos é reduzido
            pela metade. A diferença: Misty Step pode ser usado várias vezes
            por dia com spell slots, a Blessing é 1x/long rest.
          </p>
        </StrategyBox>
      </Variant>

      <H3>Onde a build brilha</H3>
      <Ul>
        <Li>Multiplicação de ações: cada buff + cada Silvery Barbs gera ataques extras para o grupo</Li>
        <Li>Concentração blindada: Resilient CON + alta CON + Dodge = saves quase garantidos</Li>
        <Li>Versatilidade: acesso a listas de Cleric e Sorcerer simultaneamente</Li>
        <Li>AC alta para caster: 19-21 com Heavy Armor + Shield</Li>
        <Li>Contramágica: Counterspell e Silvery Barbs para proteger o grupo</Li>
      </Ul>

      <H3>Onde a build sofre</H3>
      <Ul>
        <Li>Magias conhecidas limitadas: Sorcerer tem poucas magias, escolha com cuidado</Li>
        <Li>Dependência de concentração: perder Bless ou Spirit Guardians dói</Li>
        <Li>Dano direto baixo: o dano vem dos aliados, não de você</Li>
        <Li>Início lento: níveis 1-4 antes de Metamagic e magias de 3º nível</Li>
        <Li>Custo de Silvery Barbs: 1st level slot cada uso, queima recursos rápido em combates longos</Li>
      </Ul>

      {/* ═══════════════════════════════════════════════════════════
         META COMPARISON — COMPARTILHADO
         ═══════════════════════════════════════════════════════════ */}
      <H2>Como se compara com o meta?</H2>

      <P>
        Nos fóruns de otimização (RPGBot, TabletopBuilds, Treantmonk, r/3d6),
        o Order Cleric 1 / Divine Soul Sorcerer é consistentemente listado como{" "}
        <strong>uma das builds de suporte mais eficientes do 5e</strong>. A
        Divine Soul Sorcerer sozinha já é avaliada como tier S entre subclasses de
        Sorcerer, e o dip de Order Cleric é amplamente reconhecido como um dos
        melhores multiclass de 1 nível do jogo.
      </P>
      <P>
        Comparada a outros suportes populares: <strong>Twilight Cleric</strong>{" "}
        e <strong>Peace Cleric</strong> são frequentemente citados como mais
        fortes em termos brutos (a aura de HP temporários do Twilight e o
        Emboldening Bond do Peace são considerados {"\u201C"}broken{"\u201D"}). Porém,
        o Order/DSS tem uma vantagem única: ele{" "}
        <strong>multiplica a economia de ações do grupo inteiro</strong> em vez
        de apenas adicionar um bônus. Quando seu Fighter e seu Paladin ganham
        ataques extras como reação em todo turno que você buffa, a contribuição
        de DPR indireta pode superar a de um caster blaster.
      </P>
      <P>
        A build do Capa seguiu Quickened e Extended como metamagic em vez do
        mais popular Twinned Spell. Isso troca a capacidade de buffar dois
        alvos simultaneamente pela flexibilidade de fazer duas ações por turno
        e estender buffs como Aid para 16 horas, uma escolha que prioriza
        preparação e versatilidade sobre raw output.
      </P>

      {/* ═══════════════════════════════════════════════════════════
         CRESCIMENTO — COMPARTILHADO
         ═══════════════════════════════════════════════════════════ */}
      <H2>Depois do nível 10: pra onde crescer</H2>

      <Ul>
        <Li>
          <strong>Nível 11 (Sorc 10):</strong> mais um Metamagic. Twinned
          Spell é a escolha óbvia aqui, finalmente adicionando a capacidade de
          buffar dois aliados ao mesmo tempo.
        </Li>
        <Li>
          <strong>Nível 12 (Sorc 11):</strong> magias de 6º nível. Mass
          Suggestion para controle fora de combate, ou Heal para cura massiva
          de emergência.
        </Li>
        <Li>
          <strong>Nível 13 (Sorc 12):</strong> ASI. +2 CHA (chegando a 20) ou
          um feat como Alert para garantir iniciativa alta.
        </Li>
        <Li>
          <strong>Itens desejados:</strong> Staff of Power (Very Rare) para mais
          AC e magias, ou um Dragon Touched Focus (Legendary) para potencializar
          magias de Sorcerer.
        </Li>
      </Ul>

      {/* ═══════════════════════════════════════════════════════════
         HISTÓRIA — COMPARTILHADO
         ═══════════════════════════════════════════════════════════ */}
      <H2>A história por trás da ficha</H2>

      {/* Character Portrait — with gold glow + hover effect */}
      <div className="my-10 flex justify-center">
        <div className="relative group">
          <div className="absolute inset-0 bg-gradient-to-b from-gold/[0.06] via-gold/[0.14] to-gold/[0.06] rounded-full blur-[80px] scale-90 transition-all duration-500 group-hover:scale-100 group-hover:via-gold/[0.20]" />
          <Image
            src="/art/blog/capa-barsavi-portrait.png"
            alt="Capa Barsavi — Order Cleric / Divine Soul Sorcerer"
            width={1024}
            height={1536}
            className="relative w-[260px] sm:w-[320px] h-auto rounded-xl drop-shadow-[0_0_40px_rgba(212,168,83,0.25)] transition-all duration-500 group-hover:drop-shadow-[0_0_60px_rgba(212,168,83,0.4)] group-hover:scale-[1.02]"
            unoptimized
          />
        </div>
      </div>

      <P>
        Um meio-elfo de linhagem drow que caminha entre dois mundos: o da fé
        e o do poder inato. Capa Barsavi nasceu em uma grande metrópole costeira,
        longe dos olhares da nobreza. Filho bastardo de{" "}
        <strong>Auri Raelistor</strong>, um respeitado clérigo e nobre devoto de
        um deus da justiça, e de <strong>Lyna</strong>, uma aventureira
        meio-elfa drow que desapareceu logo após o nascimento do filho.
        {"\u201C"}Capa{"\u201D"} vem da tradição de nomear filhos bastardos com termos que
        evocam proteção; {"\u201C"}Barsavi{"\u201D"} homenageia uma figura lendária
        conhecida como {"\u201C"}O Guardião Sábio{"\u201D"}.
      </P>
      <P>
        Embora bastardo, Capa nunca foi abandonado. Seu pai garantiu que ele
        tivesse acesso às melhores instituições de ensino: escolas clericais,
        academias de filosofia, fortalezas-biblioteca lendárias e centros
        religiosos de todo o continente. Foi nesse período que desenvolveu
        habilidades em retórica, diplomacia, teologia e magia divina, e
        conheceu uma duquesa influente, após impressioná-la com um discurso
        sobre a ética da paz em tempos de guerra.
      </P>
      <P>
        Tudo mudou quando seu pai partiu em uma expedição rumo a mares
        distantes e nunca retornou. Nenhum corpo. Nenhuma pista. Nenhuma
        resposta. Se o deus que servia representava justiça e ordem, por que
        permitiu tal silêncio? Esse questionamento não destruiu sua fé, mas
        a transformou em algo mais pragmático: ele acredita na justiça e na
        ordem, mas não depende cegamente delas.
      </P>
      <P>
        Foi então que poderes que não vinham de estudo nem de oração
        começaram a se manifestar. Um sábio em uma antiga fortaleza-biblioteca
        revelou a verdade: sua mãe, Lyna, possuía linhagem descendente de um
        ser celestial tocado por uma deusa da magia. Esse sangue despertou
        dentro de Capa, tornando-o portador de duas fontes de poder: a
        disciplina da fé clerical e o poder inato de seu sangue divino.
      </P>
      <P>
        Ao aceitar o convite da duquesa para um encontro diplomático, Capa
        iniciou a jornada que o levaria às névoas de uma terra amaldiçoada sob
        o domínio de um vampiro ancestral. Em apenas{" "}
        <strong>19 dias</strong>, enfrentou horrores sobrenaturais, viu aldeias
        destruídas, ficou cara a cara com o senhor das névoas, e morreu{" "}
        <strong>duas vezes</strong>. E voltou duas vezes.
      </P>
      <P>
        Com seus companheiros Amum Titus, Skid, Sócrates, Auditore e
        Lauren Nailo, Capa se tornou o elo que mantinha o grupo unido.
        Estrategista em combate, curandeiro, voz de comando em momentos
        críticos, defensor dos mais vulneráveis. Ele não buscava protagonismo.
        Mas quando tudo começava a ruir, todos olhavam para ele.
      </P>
      <P>
        No final, Capa Barsavi morreu pelo seu grupo. A engrenagem parou para
        que a máquina sobrevivesse. Uma fundação que cumpriu sua promessa.
      </P>

      <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 my-6 text-center">
        <p className="text-xs text-muted-foreground/70">
          Build criada e jogada por <strong className="text-foreground/80">Dani</strong> · por Pocket DM
        </p>
      </div>

      {/* CTA Build */}
      <div className="rounded-lg border border-gold/15 bg-gradient-to-br from-gold/[0.04] to-transparent p-6 my-8 text-center relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[200px] h-[100px] bg-gold/[0.05] rounded-full blur-[60px]" />
        <div className="relative">
          <p className="font-display text-lg text-gold mb-1">Gostou dessa build?</p>
          <p className="text-sm text-muted-foreground mb-4">
            Monte o encontro perfeito para testá-la. Use o Pocket DM gratuitamente.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/try"
              className="bg-gold text-surface-primary font-semibold px-5 py-2.5 rounded-lg text-sm hover:shadow-gold-glow hover:-translate-y-[1px] transition-all duration-200"
            >
              Testar Grátis →
            </Link>
            <Link
              href="/auth/login"
              className="border border-white/10 text-foreground/80 font-medium px-5 py-2.5 rounded-lg text-sm hover:border-white/20 hover:text-foreground transition-all duration-200"
            >
              Criar Conta
            </Link>
          </div>
        </div>
      </div>
    </BuildVariantProvider>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Post 14 — Build: Half-Elf (Drow) Order Cleric 1 / Divine Soul Sorcerer — EN
   ═══════════════════════════════════════════════════════════════ */
export function BlogPost14() {
  return (
    <BuildVariantProvider defaultVariant="rolled">
      {/* Opening quote */}
      <div className="rounded-xl border border-gold/20 bg-gold/[0.04] p-6 my-8 text-center relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[200px] h-[100px] bg-gold/[0.06] rounded-full blur-[60px]" />
        <p className="relative text-lg italic text-gold/90 font-display">
          {"\u201C"}I will be the foundation.{"\u201D"}
        </p>
        <p className="relative text-xs text-muted-foreground mt-2">— Capa Barsavi</p>
      </div>

      <P>
        Capa Barsavi wasn{"'"}t the one dealing the most damage, taking the
        hits, or stealing the spotlight. He was the reason everyone else could.
        An <strong>Order Cleric 1 / Divine Soul Sorcerer</strong> built to be
        the invisible gear that makes the machine work, and one of the most
        efficient support builds in D&amp;D 5e.
      </P>

      <P>
        Below we present two versions of the build: the{" "}
        <strong>original played in a campaign</strong> with rolled stats and
        Half-Elf, and an{" "}
        <strong>optimized Point Buy reconstruction</strong> using Shadar-kai.
        Choose a variant and the entire article adapts.
      </P>

      {/* ─── TOGGLE ─── */}
      <BuildVariantToggle
        variants={[
          { id: "rolled", label: "Half-Elf (Drow)", sub: "Rolled Stats" },
          { id: "pointbuy", label: "Shadar-kai", sub: "Point Buy" },
        ]}
      />

      <SectionDivider src="/art/blog/treated-nobg/mythjourneys-dnd-character-dark-elf-female-wizard-sorcerer.png" alt="Dark elf sorceress" />

      {/* ═══ SHEET IN 30 SECONDS ═══ */}
      <H2>The sheet in 30 seconds</H2>

      <div className="overflow-x-auto mb-6">
        <table className="w-full text-sm text-foreground/80 border-collapse">
          <tbody>
            <tr className="border-b border-white/[0.06]">
              <td className="py-2 pr-4 font-semibold text-gold/80 whitespace-nowrap">Race</td>
              <td className="py-2">
                <Variant id="rolled">Half-Elf (Drow)</Variant>
                <Variant id="pointbuy">Shadar-kai (Tasha{"'"}s / MotM)</Variant>
              </td>
            </tr>
            <tr className="border-b border-white/[0.06]">
              <td className="py-2 pr-4 font-semibold text-gold/80 whitespace-nowrap">Class</td>
              <td className="py-2">Cleric 1 (Order Domain) / Sorcerer 9 (Divine Soul)</td>
            </tr>
            <tr className="border-b border-white/[0.06]">
              <td className="py-2 pr-4 font-semibold text-gold/80 whitespace-nowrap">Level</td>
              <td className="py-2">10</td>
            </tr>
            <tr className="border-b border-white/[0.06]">
              <td className="py-2 pr-4 font-semibold text-gold/80 whitespace-nowrap">Focus</td>
              <td className="py-2">Support / Control / Action economy multiplier</td>
            </tr>
            <tr className="border-b border-white/[0.06]">
              <td className="py-2 pr-4 font-semibold text-gold/80 whitespace-nowrap">Stats</td>
              <td className="py-2">
                <Variant id="rolled">4d6 drop lowest (campaign)</Variant>
                <Variant id="pointbuy">Point Buy (15 / 15 / 15 / 8 / 8 / 8)</Variant>
              </td>
            </tr>
            <tr className="border-b border-white/[0.06]">
              <td className="py-2 pr-4 font-semibold text-gold/80 whitespace-nowrap">Feats</td>
              <td className="py-2">
                <Variant id="rolled">Resilient (CON), Fey Touched</Variant>
                <Variant id="pointbuy">Resilient (CON), +2 CHA or Lucky</Variant>
              </td>
            </tr>
            <tr className="border-b border-white/[0.06]">
              <td className="py-2 pr-4 font-semibold text-gold/80 whitespace-nowrap">Metamagic</td>
              <td className="py-2">Quickened Spell, Extended Spell</td>
            </tr>
            <tr>
              <td className="py-2 pr-4 font-semibold text-gold/80 whitespace-nowrap">Difficulty</td>
              <td className="py-2">Medium — requires understanding of synergy and timing</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ═══ RACE — VARIANT ═══ */}
      <H2>Race</H2>

      <Variant id="rolled">
        <H3>Half-Elf (Drow)</H3>
        <P>
          Half-Elf is one of the most flexible races in 5e. The +2 CHA is exactly
          what a Sorcerer needs, and the two floating +1s let you round out CON
          and DEX, essential for survivability and AC. The Drow variant adds
          Darkvision 60ft and Fey Ancestry (advantage against charm, immunity to
          magical sleep), valuable defensive traits for maintaining concentration.
        </P>
        <StrategyBox title="Why Drow and not High Elf?">
          <p>
            The Drow variant (SCAG) trades Skill Versatility{"'"}s two proficiencies
            for Drow Magic: the <em>dancing lights</em> cantrip for free, and
            at level 3 <em>faerie fire</em> 1x/day (no slot required). Faerie
            fire is brutal: advantage on attacks against all affected targets,
            perfect synergy with Voice of Authority. High Elf would only give a
            Wizard cantrip — this build already has enough cantrips.
          </p>
        </StrategyBox>
        <div className="overflow-x-auto mb-6">
          <table className="w-full text-sm text-foreground/80 border-collapse">
            <thead>
              <tr className="border-b border-gold/20 text-gold/70 text-xs uppercase tracking-wider">
                <th className="py-2 text-left">Trait</th>
                <th className="py-2 text-left">Detail</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-white/[0.06]">
                <td className="py-2 pr-4 font-semibold whitespace-nowrap">ASI</td>
                <td className="py-2">+2 CHA, +1 CON, +1 DEX</td>
              </tr>
              <tr className="border-b border-white/[0.06]">
                <td className="py-2 pr-4 font-semibold whitespace-nowrap">Darkvision</td>
                <td className="py-2">60ft</td>
              </tr>
              <tr className="border-b border-white/[0.06]">
                <td className="py-2 pr-4 font-semibold whitespace-nowrap">Fey Ancestry</td>
                <td className="py-2">Advantage on saves against charm, immune to magical sleep</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 font-semibold whitespace-nowrap">Drow Magic</td>
                <td className="py-2">Dancing lights (cantrip), faerie fire 1x/day (level 3)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Variant>

      <Variant id="pointbuy">
        <H3>Shadar-kai</H3>
        <P>
          If your table uses Point Buy with flexible ASI rules (Tasha{"'"}s Cauldron
          / MotM), <strong>Shadar-kai</strong> is the ideal race for this build.
          With the 15/15/15/8/8/8 array, place the 15s in CHA, CON and WIS, and
          use racial bonuses (+2 CON, +1 CHA) to reach{" "}
          <strong>CON 17, CHA 16, WIS 15</strong> at level 1.
        </P>
        <P>
          The key advantage: <strong>Blessing of the Raven Queen</strong>.
          Once per long rest, as a bonus action, you teleport 30ft and gain
          resistance to <em>all damage</em> until the start of your next turn.
          For a frontline caster who needs to stay alive concentrating on Bless
          or Spirit Guardians, this is brutally superior to Misty Step, which
          offers only mobility with no protection.
        </P>
        <StrategyBox title="Blessing of the Raven Queen vs Misty Step">
          <p>
            Misty Step (from Fey Touched in the Half-Elf variant) is bonus action +
            30ft teleport, available 1x/day free + additional spell slots.
            Blessing of the Raven Queen is bonus action + 30ft teleport +
            resistance to <em>all damage</em> for 1 turn, but only 1x/long
            rest. Same range, but the Blessing adds a survival layer Misty
            Step lacks. The trade-off: Misty Step can be cast multiple times
            with spell slots, the Blessing is 1x/day.
          </p>
        </StrategyBox>
        <div className="overflow-x-auto mb-6">
          <table className="w-full text-sm text-foreground/80 border-collapse">
            <thead>
              <tr className="border-b border-gold/20 text-gold/70 text-xs uppercase tracking-wider">
                <th className="py-2 text-left">Trait</th>
                <th className="py-2 text-left">Detail</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-white/[0.06]">
                <td className="py-2 pr-4 font-semibold whitespace-nowrap">ASI (Tasha{"'"}s)</td>
                <td className="py-2">+2 CON, +1 CHA</td>
              </tr>
              <tr className="border-b border-white/[0.06]">
                <td className="py-2 pr-4 font-semibold whitespace-nowrap">Darkvision</td>
                <td className="py-2">60ft</td>
              </tr>
              <tr className="border-b border-white/[0.06]">
                <td className="py-2 pr-4 font-semibold whitespace-nowrap">Fey Ancestry</td>
                <td className="py-2">Advantage on saves against charm, immune to magical sleep</td>
              </tr>
              <tr className="border-b border-white/[0.06]">
                <td className="py-2 pr-4 font-semibold whitespace-nowrap">Trance</td>
                <td className="py-2">4h rest instead of 8h sleep</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 font-semibold whitespace-nowrap">Blessing of the Raven Queen</td>
                <td className="py-2">1x/long rest — 30ft teleport + resistance to all damage for 1 turn</td>
              </tr>
            </tbody>
          </table>
        </div>
        <P>
          <strong>Honest trade-off:</strong> DEX 8 means &minus;1 to initiative
          and DEX saves. With heavy armor from Cleric, AC isn{"'"}t affected, but
          you{"'"}ll act after nearly everyone. Gift of Alacrity (if available as
          a Sorcerer spell) helps compensate, but this version accepts being
          slower in exchange for being tougher.
        </P>
      </Variant>

      {/* ═══ ABILITY SCORES — VARIANT ═══ */}
      <H2>Ability Scores</H2>

      <Variant id="rolled">
        <Tip>
          These stats were rolled with 4d6 drop lowest during the campaign.
          Every table rolls differently — what matters are the{" "}
          <strong>priorities</strong>: CHA &gt; CON &gt; WIS &gt; DEX.
        </Tip>
        <H3>Final stats (level 10)</H3>
        <div className="overflow-x-auto mb-6">
          <table className="w-full text-sm text-foreground/80 border-collapse">
            <thead>
              <tr className="border-b border-gold/20 text-gold/70 text-xs uppercase tracking-wider">
                <th className="py-2 text-left">Ability</th>
                <th className="py-2 text-center">Base</th>
                <th className="py-2 text-center">Racial</th>
                <th className="py-2 text-center">Level 10</th>
                <th className="py-2 text-center">Mod</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-white/[0.06]">
                <td className="py-2 font-semibold">STR</td>
                <td className="py-2 text-center">10</td>
                <td className="py-2 text-center text-muted-foreground">—</td>
                <td className="py-2 text-center">10</td>
                <td className="py-2 text-center text-muted-foreground">+0</td>
              </tr>
              <tr className="border-b border-white/[0.06]">
                <td className="py-2 font-semibold">DEX</td>
                <td className="py-2 text-center">13</td>
                <td className="py-2 text-center text-gold/70">+1</td>
                <td className="py-2 text-center">14</td>
                <td className="py-2 text-center text-green-400/70">+2</td>
              </tr>
              <tr className="border-b border-white/[0.06]">
                <td className="py-2 font-semibold">CON</td>
                <td className="py-2 text-center">17</td>
                <td className="py-2 text-center text-gold/70">+1</td>
                <td className="py-2 text-center">19*</td>
                <td className="py-2 text-center text-green-400/70">+4</td>
              </tr>
              <tr className="border-b border-white/[0.06]">
                <td className="py-2 font-semibold">INT</td>
                <td className="py-2 text-center">8</td>
                <td className="py-2 text-center text-muted-foreground">—</td>
                <td className="py-2 text-center">8</td>
                <td className="py-2 text-center text-red-400/70">&minus;1</td>
              </tr>
              <tr className="border-b border-white/[0.06]">
                <td className="py-2 font-semibold">WIS</td>
                <td className="py-2 text-center">12</td>
                <td className="py-2 text-center text-muted-foreground">—</td>
                <td className="py-2 text-center">14&dagger;</td>
                <td className="py-2 text-center text-green-400/70">+2</td>
              </tr>
              <tr>
                <td className="py-2 font-semibold">CHA</td>
                <td className="py-2 text-center">16</td>
                <td className="py-2 text-center text-gold/70">+2</td>
                <td className="py-2 text-center">18&Dagger;</td>
                <td className="py-2 text-center text-green-400/70">+4</td>
              </tr>
            </tbody>
          </table>
          <p className="text-xs text-muted-foreground/60 mt-2">
            * Resilient CON (+1) &nbsp;|&nbsp; &dagger; Fey Touched (+1 WIS) &nbsp;|&nbsp; &Dagger; Tome of Leadership (+2 CHA)
          </p>
        </div>

        <H3>Progression by level</H3>
        <div className="overflow-x-auto mb-6">
          <table className="w-full text-xs sm:text-sm text-foreground/80 border-collapse">
            <thead>
              <tr className="border-b border-gold/20 text-gold/70 text-[10px] sm:text-xs uppercase tracking-wider">
                <th className="py-2 text-left">Level</th>
                <th className="py-2 text-left">Event</th>
                <th className="py-2 text-center">STR</th>
                <th className="py-2 text-center">DEX</th>
                <th className="py-2 text-center">CON</th>
                <th className="py-2 text-center">INT</th>
                <th className="py-2 text-center">WIS</th>
                <th className="py-2 text-center">CHA</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-white/[0.06]">
                <td className="py-1.5">1</td>
                <td className="py-1.5 text-xs">Rolled + Half-Elf (+2/+1/+1)</td>
                <td className="py-1.5 text-center">10</td>
                <td className="py-1.5 text-center">14</td>
                <td className="py-1.5 text-center">18</td>
                <td className="py-1.5 text-center">8</td>
                <td className="py-1.5 text-center">12</td>
                <td className="py-1.5 text-center">18</td>
              </tr>
              <tr className="border-b border-white/[0.06]">
                <td className="py-1.5">5</td>
                <td className="py-1.5 text-xs">Sorc 4 — Resilient (CON)</td>
                <td className="py-1.5 text-center">10</td>
                <td className="py-1.5 text-center">14</td>
                <td className="py-1.5 text-center text-gold">19</td>
                <td className="py-1.5 text-center">8</td>
                <td className="py-1.5 text-center">12</td>
                <td className="py-1.5 text-center">18</td>
              </tr>
              <tr className="border-b border-white/[0.06]">
                <td className="py-1.5">9</td>
                <td className="py-1.5 text-xs">Sorc 8 — Fey Touched (+1 WIS)</td>
                <td className="py-1.5 text-center">10</td>
                <td className="py-1.5 text-center">14</td>
                <td className="py-1.5 text-center">19</td>
                <td className="py-1.5 text-center">8</td>
                <td className="py-1.5 text-center text-gold">14</td>
                <td className="py-1.5 text-center">18</td>
              </tr>
              <tr>
                <td className="py-1.5">10</td>
                <td className="py-1.5 text-xs">Tome of Leadership (+2 CHA)</td>
                <td className="py-1.5 text-center">10</td>
                <td className="py-1.5 text-center">14</td>
                <td className="py-1.5 text-center">19</td>
                <td className="py-1.5 text-center">8</td>
                <td className="py-1.5 text-center">14</td>
                <td className="py-1.5 text-center text-gold">20</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Variant>

      <Variant id="pointbuy">
        <Tip>
          Point Buy 15/15/15/8/8/8 with Shadar-kai. The 15s go into CHA, CON
          and WIS. Racial bonuses (+2 CON, +1 CHA) leave CON odd at level 1,
          rounded by Resilient at level 5. This variant prioritizes{" "}
          <strong>survival</strong> over pure casting.
        </Tip>
        <H3>Final stats (level 10)</H3>
        <div className="overflow-x-auto mb-6">
          <table className="w-full text-sm text-foreground/80 border-collapse">
            <thead>
              <tr className="border-b border-gold/20 text-gold/70 text-xs uppercase tracking-wider">
                <th className="py-2 text-left">Ability</th>
                <th className="py-2 text-center">Point Buy</th>
                <th className="py-2 text-center">Racial</th>
                <th className="py-2 text-center">Level 10</th>
                <th className="py-2 text-center">Mod</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-white/[0.06]">
                <td className="py-2 font-semibold">STR</td>
                <td className="py-2 text-center">8</td>
                <td className="py-2 text-center text-muted-foreground">—</td>
                <td className="py-2 text-center">8</td>
                <td className="py-2 text-center text-red-400/70">&minus;1</td>
              </tr>
              <tr className="border-b border-white/[0.06]">
                <td className="py-2 font-semibold">DEX</td>
                <td className="py-2 text-center">8</td>
                <td className="py-2 text-center text-muted-foreground">—</td>
                <td className="py-2 text-center">8</td>
                <td className="py-2 text-center text-red-400/70">&minus;1</td>
              </tr>
              <tr className="border-b border-white/[0.06]">
                <td className="py-2 font-semibold">CON</td>
                <td className="py-2 text-center">15</td>
                <td className="py-2 text-center text-gold/70">+2</td>
                <td className="py-2 text-center">18*</td>
                <td className="py-2 text-center text-green-400/70">+4</td>
              </tr>
              <tr className="border-b border-white/[0.06]">
                <td className="py-2 font-semibold">INT</td>
                <td className="py-2 text-center">8</td>
                <td className="py-2 text-center text-muted-foreground">—</td>
                <td className="py-2 text-center">8</td>
                <td className="py-2 text-center text-red-400/70">&minus;1</td>
              </tr>
              <tr className="border-b border-white/[0.06]">
                <td className="py-2 font-semibold">WIS</td>
                <td className="py-2 text-center">15</td>
                <td className="py-2 text-center text-muted-foreground">—</td>
                <td className="py-2 text-center">15</td>
                <td className="py-2 text-center text-green-400/70">+2</td>
              </tr>
              <tr>
                <td className="py-2 font-semibold">CHA</td>
                <td className="py-2 text-center">15</td>
                <td className="py-2 text-center text-gold/70">+1</td>
                <td className="py-2 text-center">18&dagger;</td>
                <td className="py-2 text-center text-green-400/70">+4</td>
              </tr>
            </tbody>
          </table>
          <p className="text-xs text-muted-foreground/60 mt-2">
            * Resilient CON (+1) &nbsp;|&nbsp; &dagger; +2 CHA at Sorc 8 (or Lucky — see below)
          </p>
        </div>

        <H3>Progression by level</H3>
        <div className="overflow-x-auto mb-6">
          <table className="w-full text-xs sm:text-sm text-foreground/80 border-collapse">
            <thead>
              <tr className="border-b border-gold/20 text-gold/70 text-[10px] sm:text-xs uppercase tracking-wider">
                <th className="py-2 text-left">Level</th>
                <th className="py-2 text-left">Event</th>
                <th className="py-2 text-center">STR</th>
                <th className="py-2 text-center">DEX</th>
                <th className="py-2 text-center">CON</th>
                <th className="py-2 text-center">INT</th>
                <th className="py-2 text-center">WIS</th>
                <th className="py-2 text-center">CHA</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-white/[0.06]">
                <td className="py-1.5">1</td>
                <td className="py-1.5 text-xs">Point Buy + Shadar-kai (+2/+1)</td>
                <td className="py-1.5 text-center">8</td>
                <td className="py-1.5 text-center">8</td>
                <td className="py-1.5 text-center">17</td>
                <td className="py-1.5 text-center">8</td>
                <td className="py-1.5 text-center">15</td>
                <td className="py-1.5 text-center">16</td>
              </tr>
              <tr className="border-b border-white/[0.06]">
                <td className="py-1.5">5</td>
                <td className="py-1.5 text-xs">Sorc 4 — Resilient (CON)</td>
                <td className="py-1.5 text-center">8</td>
                <td className="py-1.5 text-center">8</td>
                <td className="py-1.5 text-center text-gold">18</td>
                <td className="py-1.5 text-center">8</td>
                <td className="py-1.5 text-center">15</td>
                <td className="py-1.5 text-center">16</td>
              </tr>
              <tr>
                <td className="py-1.5">9</td>
                <td className="py-1.5 text-xs">Sorc 8 — +2 CHA or Lucky</td>
                <td className="py-1.5 text-center">8</td>
                <td className="py-1.5 text-center">8</td>
                <td className="py-1.5 text-center">18</td>
                <td className="py-1.5 text-center">8</td>
                <td className="py-1.5 text-center">15</td>
                <td className="py-1.5 text-center text-gold">18 or 16</td>
              </tr>
            </tbody>
          </table>
        </div>

        <StrategyBox title="The level 9 decision: +2 CHA or Lucky?">
          <p>
            <strong>+2 CHA (to 18):</strong> closes the modifier at +4. Spell save
            DC goes from 14 to 15, spell attack from +7 to +8. The pure caster
            choice — your spells hit and stick more often.
          </p>
          <p>
            <strong>Lucky:</strong> CHA stays at 16 (+3), but you get 3 rerolls
            per day. Use them on concentration saves, saves against lethal effects,
            or force an enemy to reroll an attack against you. The survivor choice
            — slightly weaker caster in exchange for 3 daily {"\u201C"}not today{"\u201D"} moments.
          </p>
          <p>
            <strong>Recommendation:</strong> if your party has plenty of damage and
            needs you alive, take Lucky. If you{"'"}re the primary offensive caster,
            take +2 CHA.
          </p>
        </StrategyBox>
      </Variant>

      {/* ═══ CLASS AND FEATURES — SHARED ═══ */}
      <H2>Class and features</H2>

      <H3>Cleric 1 — Order Domain</H3>
      <P>
        The one-level Cleric (Order Domain) dip is the heart of the build.{" "}
        <strong>Voice of Authority</strong> transforms a support caster into an
        action economy multiplier: every time you cast a spell with a spell slot
        targeting an ally, that ally can use their reaction to make a weapon
        attack.
      </P>
      <P>
        The Cleric level also brings heavy armor and shield proficiency (AC
        19-21), Wisdom save proficiency, and access to 1st-level Cleric spells
        like Command and Heroism, both prepared for free through the domain.
      </P>

      <StrategyBox title="Voice of Authority — Why it's so strong">
        <p>
          Voice of Authority triggers on <em>any</em> spell with a spell slot
          targeting an ally. Bless targets 3 allies? Pick the Fighter. Healing
          Word on a downed ally? They stand up AND attack. Aid on a Paladin?
          They get temp HP and a reaction attack with Smite.
        </p>
        <p>
          With Quickened Spell, you can buff (triggering Voice of Authority) as a
          bonus action and still use your action normally. That{"'"}s a free extra
          attack for your party <em>every turn</em> you buff someone.
        </p>
      </StrategyBox>

      <H3>Sorcerer — Divine Soul</H3>
      <P>
        Divine Soul Sorcerer is rated by the optimization community as{" "}
        <strong>S-tier</strong> among Sorcerer subclasses, and for good reason.
        It grants access to the <strong>entire Cleric spell list</strong>{" "}
        without needing additional Cleric levels. That means Spirit Guardians,
        Aid, Revivify, Death Ward — all using Charisma and with Metamagic
        available.
      </P>
      <P>
        The subclass features are equally strong:{" "}
        <strong>Favored by the Gods</strong> (add 2d4 to a failed save or
        attack, once per rest) and{" "}
        <strong>Empowered Healing</strong> (reroll healing dice for nearby
        allies). Both reinforce the reliable support role.
      </P>

      <H3>Feats</H3>

      <Ul>
        <Li>
          <strong>Resilient (CON) — Sorc 4:</strong> Proficiency in Constitution
          saves is essential for maintaining concentration on Bless and Spirit
          Guardians. By level 10, the +7/+8 CON save bonus makes it nearly
          impossible to lose concentration on low to moderate damage.
        </Li>
      </Ul>

      <Variant id="rolled">
        <Ul>
          <Li>
            <strong>Fey Touched — Sorc 8:</strong> +1 WIS (rounding from 13
            to 14), free Misty Step 1x/day (essential mobility for a frontline
            caster), and Gift of Alacrity (1d8 initiative bonus to ensure buffs
            land before enemies act).
          </Li>
        </Ul>
      </Variant>
      <Variant id="pointbuy">
        <Ul>
          <Li>
            <strong>+2 CHA or Lucky — Sorc 8:</strong> Since Shadar-kai already
            has Blessing of the Raven Queen as emergency mobility, level 8 opens
            up to close CHA 18 (+2 ASI) or take Lucky for 3 rerolls/day.
            Without Fey Touched, you lose Gift of Alacrity — but with DEX 8,
            initiative was never your strong suit anyway.
          </Li>
        </Ul>
      </Variant>

      <H3>Metamagic</H3>
      <Ul>
        <Li>
          <strong>Quickened Spell:</strong> Turns an action spell into a bonus
          action. Cast a buff (triggering Voice of Authority) and still use your
          action for Dodge, cantrip, or another spell in the same turn.
        </Li>
        <Li>
          <strong>Extended Spell:</strong> Doubles the duration of spells like
          Aid (now 16 hours instead of 8), Death Ward, and any long-duration
          concentration buff. Excellent for pre-combat preparation.
        </Li>
      </Ul>

      {/* ═══ COMBAT STRATEGY — EXPANDED ═══ */}
      <H2>Combat strategy</H2>

      <P>
        This build doesn{"'"}t play like a traditional caster. You don{"'"}t sit
        in the back casting Fireball. You step into the frontline, concentrate
        your main buff, go into Dodge, and turn every reaction into value for
        the party. Damage comes from your allies — your job is to survive and
        keep them empowered.
      </P>

      <H3>Turn 1 — Build the foundation</H3>
      <StrategyBox title="Round 1 Flowchart">
        <p>
          <strong>Bonus action:</strong> Quickened Bless on 3 allies. Voice of
          Authority triggers: pick the ally with the highest DPR (Fighter,
          Paladin, Rogue) for the free reaction attack.
        </p>
        <p>
          <strong>Action:</strong> Dodge. Yes, Dodge. You{"'"}re on the frontline
          with AC 19-21 and Bless concentrated. Your job now is to{" "}
          <em>not lose concentration</em>, not deal damage.
        </p>
        <p>
          <strong>Movement:</strong> Position between your allies and the
          enemies. You want to be in range for Silvery Barbs and close to Spirit
          Guardians targets when the time comes.
        </p>
      </StrategyBox>

      <H3>Between turns — Silvery Barbs as the engine</H3>
      <P>
        Here{"'"}s the build{"'"}s secret. Silvery Barbs costs a reaction and does
        two things: forces the enemy to reroll a d20 (attack, save, check)
        AND gives advantage to an ally on their next d20. But since it{"'"}s a
        spell with a spell slot targeting an ally (the beneficiary), it
        triggers <strong>Voice of Authority</strong>.
      </P>
      <P>
        Practical result: <strong>between your turns</strong>, every time an
        enemy lands something important, you use Silvery Barbs — the enemy
        rerolls — your ally gains advantage AND a free reaction attack.
        This happens <em>off your turn</em>, costing no action or bonus action.
      </P>

      <StrategyBox title="Silvery Barbs + Voice of Authority — the combo">
        <p>
          Enemy hits the Wizard — You use Silvery Barbs as a reaction — Enemy
          rerolls (possibly misses) — Fighter gains advantage on next attack AND
          a reaction attack now via Voice of Authority. Result: enemy possibly
          failed, Fighter attacked, Fighter has advantage on next attack. All
          from 1 spell slot and 0 actions.
        </p>
      </StrategyBox>

      <H3>Turns 2+ — Maintain and scale</H3>
      <P>
        With Bless active and Dodge rolling, your subsequent turns are flexible:
      </P>
      <Ul>
        <Li>
          <strong>Long combat:</strong> keep Bless + Dodge. Use Silvery Barbs on
          reactions. Throw cantrips (Toll the Dead, Sacred Flame) as your action
          if you don{"'"}t need Dodge.
        </Li>
        <Li>
          <strong>Clustered enemies:</strong> drop Bless and switch concentration
          to Spirit Guardians. Quickened Spirit Guardians as bonus action + Dodge
          as action. Each enemy starting their turn near you takes 3d8 radiant.
        </Li>
        <Li>
          <strong>Burst damage needed:</strong> Fireball or another AoE.
          Quickened Bless — Action Fireball works, and still triggers Voice of
          Authority.
        </Li>
        <Li>
          <strong>Emergency:</strong> Healing Word (bonus action ranged heal to
          pick up a downed ally) or Revivify if someone died.
        </Li>
      </Ul>

      <Variant id="rolled">
        <StrategyBox title="Fey Touched as mobility">
          <p>
            In the Half-Elf variant, Misty Step (from Fey Touched) is your
            emergency escape. If you{"'"}re surrounded and concentration is at
            risk, Misty Step 30ft as bonus action to disengage, Dodge as action.
            Gift of Alacrity ensures you frequently act before enemies in
            Round 1.
          </p>
        </StrategyBox>
      </Variant>
      <Variant id="pointbuy">
        <StrategyBox title="Blessing of the Raven Queen as panic button">
          <p>
            In the Shadar-kai variant, Blessing of the Raven Queen replaces Misty
            Step as your escape. Same range (30ft), but with resistance to all
            damage until the start of your next turn. If you{"'"}re surrounded
            and concentrating Spirit Guardians, activate the Blessing: teleport
            to safety + all incoming damage is halved for a full enemy turn.
            The difference: Misty Step can be cast multiple times per day with
            spell slots, the Blessing is 1x/long rest.
          </p>
        </StrategyBox>
      </Variant>

      <H3>Where the build shines</H3>
      <Ul>
        <Li>Action multiplication: every buff + every Silvery Barbs generates extra attacks for the party</Li>
        <Li>Armored concentration: Resilient CON + high CON + Dodge = nearly guaranteed saves</Li>
        <Li>Versatility: access to both Cleric and Sorcerer spell lists</Li>
        <Li>High AC for a caster: 19-21 with Heavy Armor + Shield</Li>
        <Li>Counter-magic: Counterspell and Silvery Barbs to protect the group</Li>
      </Ul>

      <H3>Where the build struggles</H3>
      <Ul>
        <Li>Limited spells known: Sorcerer has few spell picks, choose carefully</Li>
        <Li>Concentration-dependent: losing Bless or Spirit Guardians hurts</Li>
        <Li>Low direct damage: your damage comes from allies, not from you</Li>
        <Li>Slow start: levels 1-4 before Metamagic and 3rd-level spells feel weak</Li>
        <Li>Silvery Barbs cost: 1st level slot each use, burns resources fast in long combats</Li>
      </Ul>

      {/* ═══ META COMPARISON — SHARED ═══ */}
      <H2>How it stacks up against the meta</H2>

      <P>
        In the optimization community (RPGBot, TabletopBuilds, Treantmonk,
        r/3d6), the Order Cleric 1 / Divine Soul Sorcerer is consistently
        rated as{" "}
        <strong>one of the most efficient support builds in 5e</strong>. Divine
        Soul Sorcerer alone is rated S-tier among Sorcerer subclasses, and the
        Order Cleric dip is widely recognized as one of the best 1-level
        multiclass options in the game.
      </P>
      <P>
        Compared to other popular support builds: <strong>Twilight Cleric</strong>{" "}
        and <strong>Peace Cleric</strong> are frequently cited as stronger in raw
        terms (Twilight{"'"}s temporary HP aura and Peace{"'"}s Emboldening
        Bond are considered {"\u201C"}broken{"\u201D"}). However, Order/DSS has a
        unique advantage: it{" "}
        <strong>multiplies the entire party{"'"}s action economy</strong>{" "}
        rather than just adding a bonus. When your Fighter and Paladin gain
        extra reaction attacks every turn you buff, the indirect DPR
        contribution can surpass a blaster caster{"'"}s output.
      </P>
      <P>
        Capa{"'"}s build chose Quickened and Extended as metamagic instead of
        the more popular Twinned Spell. This trades the ability to buff two
        targets simultaneously for the flexibility of two actions per turn and
        extending buffs like Aid to 16 hours, a choice that prioritizes
        preparation and versatility over raw output.
      </P>

      {/* ═══ GROWTH — SHARED ═══ */}
      <H2>After level 10: where to grow</H2>

      <Ul>
        <Li>
          <strong>Level 11 (Sorc 10):</strong> Another Metamagic: Twinned
          Spell is the obvious pick, finally adding the ability to buff two
          allies simultaneously.
        </Li>
        <Li>
          <strong>Level 12 (Sorc 11):</strong> 6th-level spells: Mass
          Suggestion for out-of-combat control, or Heal for emergency massive
          healing.
        </Li>
        <Li>
          <strong>Level 13 (Sorc 12):</strong> ASI: +2 CHA (reaching 20) or a
          feat like Alert for high initiative.
        </Li>
        <Li>
          <strong>Desired items:</strong> Staff of Power (Very Rare) for more AC
          and spells, or a Dragon Touched Focus (Legendary) to empower Sorcerer
          spells.
        </Li>
      </Ul>

      {/* ═══ STORY — SHARED ═══ */}
      <H2>The story behind the sheet</H2>

      {/* Character Portrait */}
      <div className="my-10 flex justify-center">
        <div className="relative group">
          <div className="absolute inset-0 bg-gradient-to-b from-gold/[0.06] via-gold/[0.14] to-gold/[0.06] rounded-full blur-[80px] scale-90 transition-all duration-500 group-hover:scale-100 group-hover:via-gold/[0.20]" />
          <Image
            src="/art/blog/capa-barsavi-portrait.png"
            alt="Capa Barsavi — Order Cleric / Divine Soul Sorcerer"
            width={1024}
            height={1536}
            className="relative w-[260px] sm:w-[320px] h-auto rounded-xl drop-shadow-[0_0_40px_rgba(212,168,83,0.25)] transition-all duration-500 group-hover:drop-shadow-[0_0_60px_rgba(212,168,83,0.4)] group-hover:scale-[1.02]"
            unoptimized
          />
        </div>
      </div>

      <P>
        A half-elf of drow lineage who walks between two worlds: faith and
        innate power. Capa Barsavi was born in a great coastal city, far from
        the eyes of nobility. The illegitimate son of{" "}
        <strong>Auri Raelistor</strong>, a respected cleric and noble devoted to
        a god of justice, and <strong>Lyna</strong>, a half-elf drow adventurer
        who vanished shortly after his birth. {"\u201C"}Capa{"\u201D"} comes from a
        tradition of naming illegitimate children with terms evoking protection;{" "}
        {"\u201C"}Barsavi{"\u201D"} honors a legendary figure known as {"\u201C"}The
        Wise Guardian.{"\u201D"}
      </P>
      <P>
        Though illegitimate, Capa was never abandoned. His father ensured he had
        access to the finest institutions: clerical schools, philosophy
        academies, legendary fortress-libraries, and religious centers across
        the continent. During those years he developed skills in rhetoric,
        diplomacy, theology, and divine magic, and met an influential
        duchess, after impressing her with a speech on the ethics of peace in
        times of war.
      </P>
      <P>
        Everything changed when his father departed on an expedition to distant
        seas and never returned. No body. No clues. No answers. If the god he
        served stood for justice and order, why allow such silence? This
        questioning didn{"'"}t destroy his faith, it transformed it into
        something more pragmatic: he believes in justice and order, but no
        longer depends on them blindly.
      </P>
      <P>
        Then powers that came from neither study nor prayer began to manifest. A
        sage in an ancient fortress-library revealed the truth: his mother, Lyna,
        carried a bloodline descended from a celestial being touched by a goddess
        of magic. That blood awakened within Capa, making him the bearer of two
        sources of power: the discipline of clerical faith and the innate
        force of his divine heritage.
      </P>
      <P>
        After accepting the duchess{"'"}s invitation to a diplomatic meeting,
        Capa began the journey that would lead him into the mists of a cursed
        land ruled by an ancient vampire. In just{" "}
        <strong>19 days</strong>, he faced supernatural horrors, watched
        villages burn, stood face to face with the lord of the mists, and
        died <strong>twice</strong>. And came back twice.
      </P>
      <P>
        With his companions Amum Titus, Skid, Socrates, Auditore, and
        Lauren Nailo, Capa became the link that held the group together.
        Combat strategist, healer, voice of command in critical moments,
        defender of the vulnerable. He never sought the spotlight. But when
        everything started to crumble, everyone looked to him.
      </P>
      <P>
        In the end, Capa Barsavi died for his party. The gear stopped so the
        machine could survive. A foundation that kept its promise.
      </P>

      <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 my-6 text-center">
        <p className="text-xs text-muted-foreground/70">
          Build created and played by <strong className="text-foreground/80">Dani</strong> · by Pocket DM
        </p>
      </div>

      {/* CTA Build */}
      <div className="rounded-lg border border-gold/15 bg-gradient-to-br from-gold/[0.04] to-transparent p-6 my-8 text-center relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[200px] h-[100px] bg-gold/[0.05] rounded-full blur-[60px]" />
        <div className="relative">
          <p className="font-display text-lg text-gold mb-1">Like this build?</p>
          <p className="text-sm text-muted-foreground mb-4">
            Build the perfect encounter to test it. Use Pocket DM for free.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/try"
              className="bg-gold text-surface-primary font-semibold px-5 py-2.5 rounded-lg text-sm hover:shadow-gold-glow hover:-translate-y-[1px] transition-all duration-200"
            >
              Try Free →
            </Link>
            <Link
              href="/auth/login"
              className="border border-white/10 text-foreground/80 font-medium px-5 py-2.5 rounded-lg text-sm hover:border-white/20 hover:text-foreground transition-all duration-200"
            >
              Create Account
            </Link>
          </div>
        </div>
      </div>
    </BuildVariantProvider>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   BLOG POST 15 — Diário de Aventura — A Jornada do Pocket DM
   ═══════════════════════════════════════════════════════════════════ */
export function BlogPost15() {
  return (
    <>
      {/* Header with scroll icon */}
      <div className="flex items-start gap-5 mb-10">
        <div className="hidden sm:block shrink-0 relative">
          <div className="absolute inset-0 bg-gold/10 blur-[20px] rounded-full" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/art/blog/devlog-scroll-collection.png"
            alt=""
            width={80}
            height={100}
            className="relative drop-shadow-[0_0_12px_rgba(212,168,83,0.3)]"
            aria-hidden="true"
          />
        </div>
        <div className="flex-1">
          <p className="text-foreground/80 leading-[1.8] text-[15px] mb-3">
            Este é o diário de desenvolvimento do Pocket DM. Não é um changelog
            técnico cheio de números de versão &mdash; é a história de como uma dor
            de mestre virou um produto. Cada seção conta o que fizemos, por que
            fizemos e o que aprendemos no caminho.
          </p>
          <p className="text-foreground/80 leading-[1.8] text-[15px]">
            Esta página é atualizada periodicamente com novos marcos. Se quiser
            acompanhar a evolução, volte quando quiser &mdash; aqui é onde as
            novidades aparecem primeiro.
          </p>
        </div>
      </div>

      {/* Stat strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
        {[
          { value: "700+", label: "commits" },
          { value: "1200+", label: "monstros" },
          { value: "600+", label: "magias" },
          { value: "R$ 0", label: "pra começar" },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-lg border border-gold/15 bg-gold/[0.03] px-4 py-3 text-center"
          >
            <p className="font-display text-xl text-gold">{s.value}</p>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider mt-0.5">
              {s.label}
            </p>
          </div>
        ))}
      </div>

      <SectionDivider src="/art/blog/treated-nobg/mythjourneys-a-beautiful-blond-valkyrie-in-armor.png" alt="Valquíria em armadura" />

      {/* ── ERA 0 ── */}
      <H2>A Dor &mdash; Antes do Código</H2>
      <P>
        Se você já mestrou D&D presencial, conhece a cena: post-its por todo
        lado, HP anotado numa folha amassada, iniciativa num canto do caderno.
        Todo turno alguém pergunta &ldquo;quanto de HP o goblin tem?&rdquo; e o
        mestre finge que lembra.
      </P>
      <P>
        Campanhas longas, mesas semanais, combates técnicos que a gente curtia
        fazer bem feito. O problema nunca foi o RPG em si &mdash; era tudo ao
        redor dele. Cada turno tinha aquela pausa de &ldquo;peraí, deixa eu
        achar aqui&rdquo; que quebrava o ritmo e tirava todo mundo da imersão.
      </P>
      <P>
        Tentamos de tudo. VTTs online que são ótimos pra mesa virtual mas
        pesados demais pra presencial. Apps de celular que faziam pouco ou
        faziam demais. Planilhas compartilhadas que resolviam o HP mas não
        ajudavam em mais nada. Sites de referência bons pra consultar monstros,
        mas que exigiam ficar alternando aba o tempo inteiro.
      </P>
      <P>
        Nenhuma ferramenta foi feita pensando no mestre presencial que quer
        combate rápido, organizado e bonito &mdash; sem precisar de um setup de
        30 minutos antes da sessão.
      </P>
      <P>
        Foi aí que a ideia nasceu: e se existisse algo que fosse só pro combate
        presencial? Leve, rápido, que funciona no celular do mestre, mostra o
        necessário pros jogadores, e não tenta ser um VTT inteiro?
      </P>

      {/* ── ERA 1 ── */}
      <H2>Antes do Código &mdash; Semanas de "Será que alguém precisa disso?"</H2>
      <P>
        Antes de escrever uma linha de código, o Pocket DM viveu em documentos,
        rabiscos e discussões. Quais features existem nos concorrentes? O que
        funciona? O que é excesso? Onde eles erram?
      </P>
      <P>
        A conclusão foi clara: o mercado de ferramentas de RPG é poluído. Apps
        que tentam fazer tudo &mdash; ficha de personagem, VTT, bestiário,
        chat, mapa, inventário, áudio &mdash; e acabam fazendo tudo mais ou
        menos. Decidimos fazer uma coisa muito bem:{" "}
        <strong>gerenciar combate presencial</strong>.
      </P>
      <P>
        Referências visuais? Jogos que a gente cresceu jogando. A estética dark
        com detalhes dourados, ícones pixel art, efeitos sonoros que remetem
        àquela era de RPGs clássicos. Não por nostalgia &mdash; porque
        funciona. É legível no escuro (mesas de RPG não são bem iluminadas) e
        tem personalidade.
      </P>
      <H3>Decisões-chave dessa fase</H3>
      <Ul>
        <Li>Foco exclusivo em mesa presencial (não somos um VTT)</Li>
        <Li>
          Conteúdo SRD gratuito (1200+ monstros, 600+ magias, licença Creative
          Commons)
        </Li>
        <Li>Modo guest sem cadastro (testar antes de se comprometer)</Li>
        <Li>Bilíngue desde o dia 1 (PT-BR e inglês)</Li>
        <Li>
          Design acessível &mdash; dark theme legível, touch targets grandes,
          funciona em qualquer tela
        </Li>
      </Ul>

      {/* ── ERA 2 ── */}
      <H2>Fundação &mdash; Março 2026</H2>
      <P>
        As primeiras linhas de código transformaram meses de planejamento em
        algo real. Em poucos dias, saímos do zero para um combat tracker
        funcional com busca no banco de dados SRD (o conteúdo oficial de D&D 5e
        licenciado sob Creative Commons). Autenticação, banco de dados,
        internacionalização português/inglês &mdash; tudo construído desde o
        início.
      </P>
      <P>
        O foco era claro: criar combate, buscar monstros, rastrear iniciativa,
        HP e condições. E um modo guest pra qualquer pessoa testar sem
        cadastro, sem fricção, sem compromisso. Abriu o site, clicou em
        &ldquo;Testar Grátis&rdquo;, e já está dentro de um combate.
      </P>
      <Tip>
        O modo guest sempre foi intencional. Acreditamos que a melhor forma de
        convencer alguém é deixar experimentar &mdash; não trancar features
        atrás de um formulário de cadastro.
      </Tip>

      {/* ── ERA 3 ── */}
      <H2>De tabela glorificada a combat tracker de verdade</H2>
      <P>
        A primeira versão do tracker funcionava, mas era basicamente uma tabela
        glorificada. Nessa fase, ele ganhou alma: barras de HP com cores por
        severidade (verde → amarelo → vermelho → roxo), nomes temáticos pra
        monstros (pra evitar metagaming &mdash; &ldquo;você não sabe que aquilo
        é um Beholder&rdquo;), notificações de turno, death saves, e suporte a
        jogadores em tempo real.
      </P>
      <P>
        Paralelo a isso, o monstro que mais deu trabalho não estava no
        bestiário: era a estabilidade. Políticas de segurança do banco,
        broadcast em tempo real, sincronização de estado entre mestre e
        jogadores. Coisas que o jogador nunca vê, mas que fazem tudo funcionar
        sem travar, sem perder dado, sem dessincronizar.
      </P>
      <H3>Marcos dessa fase</H3>
      <Ul>
        <Li>
          Sistema de late-join &mdash; jogadores entrando no meio do combate
          sem atrapalhar nada
        </Li>
        <Li>
          Anti-metagaming &mdash; nomes temáticos gerados automaticamente pra
          monstros (&ldquo;Sombra Rastejante&rdquo; ao invés de &ldquo;Shadow
          Demon&rdquo;)
        </Li>
        <Li>
          Barras de HP com 4 tiers visuais &mdash; o mestre vê números, os
          jogadores veem intensidade
        </Li>
        <Li>
          Oracle (Ctrl+K) &mdash; a command palette que busca monstros,
          magias e regras em um único campo
        </Li>
      </Ul>

      {/* ── ERA 4 ── */}
      <H2>Quando o Pocket DM virou o Pocket DM</H2>
      <P>
        O logo da coroa d20 nasceu aqui. A paleta dark + gold. O nome
        &ldquo;Pocket DM&rdquo;. A landing page com comparativos. O soundboard
        com efeitos sonoros inspirados em RPGs clássicos dos anos 2000 (sim,
        88% dos sons vêm de lá).
      </P>
      <P>
        Mas o mais importante dessa fase: o modo guest ganhou teasers de
        features premium. A ideia é simples &mdash; você experimenta o combat
        tracker grátis, vê o que poderia ter com login, e decide se quer mais.
        Sem paywall forçado, sem pop-up chato. Só uma demonstração honesta do
        que está disponível.
      </P>
      <H3>Features que definiram a identidade</H3>
      <Ul>
        <Li>
          Undo system no guest mode &mdash; Ctrl+Z desfaz qualquer ação no
          combate
        </Li>
        <Li>
          Keyboard shortcuts completos &mdash; pra quem prefere teclado a mouse
        </Li>
        <Li>
          Soundboard com ambientação &mdash; música, efeitos, atmosfera, tudo
          no mesmo lugar
        </Li>
        <Li>
          Landing page com comparativo honesto contra VTTs e outras
          ferramentas
        </Li>
      </Ul>

      {/* ── ERA 5 ── */}
      <H2>Primeiro Teste Real &mdash; Abril 2026</H2>
      <P>
        Mesa presencial, jogadores de verdade, bugs de verdade. O combate
        travou? Travou. O jogador desconectou e não voltou? Voltou (depois de
        alguns hotfixes). A enquete pós-combate funcionou? Funcionou &mdash; e
        os jogadores adoraram votar na dificuldade.
      </P>
      <P>
        Desse teste saíram features que ninguém tinha pedido mas todo mundo
        queria: notas dos jogadores durante o combate, spell slots tracker
        (bolinhas marcáveis de slots de magia), chat privado entre jogadores
        (que o mestre não vê), e 357 monstros da comunidade Monster-a-Day
        integrados ao compêndio gratuitamente.
      </P>
      <H3>O que nasceu do playtest</H3>
      <Ul>
        <Li>
          Combat Recap estilo Spotify Wrapped &mdash; com awards de
          &ldquo;Speedster&rdquo; (turno mais rápido) e &ldquo;Tank&rdquo;
          (mais dano absorvido)
        </Li>
        <Li>
          Enquete de dificuldade pós-combate &mdash; jogadores votam e o
          resultado aparece em tempo real
        </Li>
        <Li>
          Legendary Actions tracker &mdash; auto-detecta do SRD, reseta por
          rodada
        </Li>
        <Li>
          Gerador de encontros aleatórios &mdash; 13 ambientes, balanceamento
          por CR
        </Li>
      </Ul>
      <Tip>
        O beta test provou algo importante: as melhores features não vêm de um
        roadmap &mdash; vêm de observar jogadores reais usando a ferramenta e
        ouvir o que falta.
      </Tip>

      {/* ── EM BREVE ── */}
      <div className="mt-14 mb-8 rounded-xl border border-gold/20 bg-gradient-to-br from-gold/[0.04] to-transparent p-8 text-center relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[200px] bg-gold/[0.06] rounded-full blur-[80px]" />
        </div>
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/art/blog/devlog-scroll-item.webp"
            alt=""
            width={32}
            height={32}
            className="mx-auto mb-3 opacity-70"
            aria-hidden="true"
          />
          <p className="font-display text-lg text-gold mb-2">
            A jornada continua...
          </p>
          <p className="text-sm text-foreground/60 leading-relaxed max-w-md mx-auto mb-4">
            Comunidade, Campaign Hub, Mapa Mental, Onboarding e muito mais
            &mdash; os próximos capítulos do Pocket DM estão sendo escritos.
            Volte em breve pra acompanhar a evolução.
          </p>
          <div className="flex flex-wrap justify-center gap-3 text-[11px] text-muted-foreground/50">
            <span className="px-3 py-1 rounded-full border border-white/[0.06] bg-white/[0.02]">Comunidade & Conteúdo</span>
            <span className="px-3 py-1 rounded-full border border-white/[0.06] bg-white/[0.02]">Campaign Hub</span>
            <span className="px-3 py-1 rounded-full border border-white/[0.06] bg-white/[0.02]">Mapa Mental</span>
            <span className="px-3 py-1 rounded-full border border-white/[0.06] bg-white/[0.02]">User Journey</span>
            <span className="px-3 py-1 rounded-full border border-white/[0.06] bg-white/[0.02]">Próximas Quests</span>
          </div>
        </div>
      </div>

      {/* Final CTA */}
      <div className="rounded-lg border border-gold/15 bg-gradient-to-br from-gold/[0.04] to-transparent p-6 my-8 text-center relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[200px] h-[100px] bg-gold/[0.05] rounded-full blur-[60px]" />
        <div className="relative">
          <p className="font-display text-lg text-gold mb-1">
            Quer ver tudo isso funcionando?
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            O combat tracker é gratuito. Sem cadastro, sem download, sem
            surpresa.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/try"
              className="bg-gold text-surface-primary font-semibold px-5 py-2.5 rounded-lg text-sm hover:shadow-gold-glow hover:-translate-y-[1px] transition-all duration-200"
            >
              Testar Grátis →
            </Link>
            <Link
              href="/auth/login"
              className="border border-white/10 text-foreground/80 font-medium px-5 py-2.5 rounded-lg text-sm hover:border-white/20 hover:text-foreground transition-all duration-200"
            >
              Criar Conta
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   BLOG POST 16 — Guia do Mestre Eficaz no Combate (E-book post)
   ═══════════════════════════════════════════════════════════════════ */
export function BlogPost16() {
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

/* ═══════════════════════════════════════════════════════════════════
   BLOG POST 17 — Como Gerenciar HP no D&D 5e sem Planilha
   ═══════════════════════════════════════════════════════════════════ */
export function BlogPost17() {
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

/* ═══════════════════════════════════════════════════════════════════
   BLOG POST 18 — 7 Erros que Mestres Cometem no Combate de D&D
   ═══════════════════════════════════════════════════════════════════ */
export function BlogPost18() {
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

/* ═══════════════════════════════════════════════════════════════════
   BLOG POST 19 — Iniciativa D&D 5e: Regras, Variantes e Como Automatizar
   ═══════════════════════════════════════════════════════════════════ */
export function BlogPost19() {
  return (
    <>
      <P>
        Iniciativa é a primeira coisa que acontece em todo combate de D&D 5e. E
        também é o momento mais chato. &quot;Quanto você tirou? 14. E você? 18.
        Peraí, o ranger tirou quanto? Deixa eu anotar...&quot; São 3 a 5 minutos
        que poderiam ser o primeiro golpe da batalha.
      </P>
      <P>
        Nesse guia, vou cobrir as regras oficiais, as variantes que a comunidade
        inventou, e como você elimina esse gargalo de vez.
      </P>

      <Img src="/art/blog/combat-setup.png" alt="Pocket DM — setup de combate com iniciativa e ordem de turnos" />

      <H2>Como funciona a iniciativa no D&D 5e?</H2>
      <P>
        As regras do Player&apos;s Handbook (PHB, capítulo 9) são simples:
      </P>
      <Ul>
        <Li>
          Todo mundo rola 1d20 e soma o modificador de Destreza. É um ability
          check normal.
        </Li>
        <Li>
          O mestre ordena do maior pro menor. Quem tirou mais alto age primeiro.
        </Li>
        <Li>
          Empate entre jogador e monstro? O mestre decide. Entre dois jogadores?
          Eles escolhem entre si.
        </Li>
        <Li>
          A ordem fica fixa o combate inteiro. Não muda entre rodadas.
        </Li>
      </Ul>
      <P>
        Tem features que mexem nisso: Barbarian com Feral Instinct tem vantagem
        na rolagem, Bard com Jack of All Trades soma metade da proficiência, e
        o feat Alert dá +5. Rogues, Rangers e Monks quase sempre agem cedo
        porque vivem de Destreza alta.
      </P>

      <Tip>
        Leve isso em conta na composição dos monstros. Criaturas lentas (Zombies,
        Golems) precisam de número pra compensar agir por último. Um Zombie
        sozinho contra um grupo com alta DEX nem chega a atacar.
      </Tip>

      <H2>Por que a iniciativa manual trava a mesa?</H2>
      <P>
        O sistema é elegante. O problema é juntar 5 jogadores falando números ao
        mesmo tempo enquanto você anota, ordena e confere se não esqueceu
        ninguém. Na prática:
      </P>
      <Ul>
        <Li>
          3 combates por sessão = 10 a 15 minutos só de setup de iniciativa. É
          quase uma cena inteira de roleplay jogada fora.
        </Li>
        <Li>
          Erros de ordenação. Você pula alguém, ou coloca na posição errada.
          Quando percebe no turno 3, a correção vira discussão.
        </Li>
        <Li>
          Enquanto você anota, os jogadores esperam. Celulares saem.
          Conversas paralelas começam. O clima da cena que levou ao combate
          evapora.
        </Li>
        <Li>
          6 goblins = rola 6 vezes ou usa grupo? Se rola 6, o setup dobra. Se
          agrupa, precisa anotar separado.
        </Li>
      </Ul>

      <SectionDivider src="/art/blog/treated-nobg/dnd-character-elf-fighter-wearing-heavy-armor-in-the-forest.png" alt="Elfa guerreira na floresta" />

      <H2>Quais as variantes de iniciativa?</H2>
      <P>
        A comunidade de D&D inventou uns sistemas alternativos ao longo dos anos.
        As 3 mais populares:
      </P>

      <H3>Popcorn Initiative</H3>
      <P>
        Quem agiu escolhe quem age em seguida. Pode ser aliado ou inimigo. A
        ordem muda toda rodada, o que cria uns momentos táticos legais
        (&quot;passo pro Cleric curar antes do dragão atacar&quot;). O problema
        é que grupos otimizados encadeiam turnos pra dominar. Funciona melhor em
        mesas narrativas com jogadores que não vão abusar.
      </P>

      <H3>Side Initiative</H3>
      <P>
        Cada lado rola 1d20 sem modificador. Quem tirar mais, age primeiro. Todo
        mundo do lado vencedor age na ordem que quiser. Ultra-rápido: 2 rolagens
        e acabou. O porém é que personagens com DEX alta (Rogues, Monks) perdem
        a vantagem que investiram. Ótimo pra encontros aleatórios e one-shots
        onde ninguém quer perder tempo.
      </P>

      <H3>Speed Factor Initiative (DMG)</H3>
      <P>
        Variante oficial do Dungeon Master&apos;s Guide. Todo turno, todo mundo
        rola iniciativa de novo, com modificadores baseados na ação escolhida.
        Armas pesadas penalizam, leves dão bônus. Realista? Sim. Praticável?
        Não. Multiplica o problema que tenta resolver. Pouquíssimos mestres usam
        mais de uma sessão.
      </P>

      <EbookCTA variant="inline" />

      <H2>Como automatizar a iniciativa com QR Code?</H2>
      <P>
        A melhor solução é tirar o gargalo do caminho. No{" "}
        <ProdLink href="/try">Pocket DM</ProdLink>, funciona assim:
      </P>
      <Ul>
        <Li>
          Você cria o encontro e adiciona os monstros do{" "}
          <ProdLink href="/monstros">compêndio</ProdLink>. HP e stats já vêm
          preenchidos.
        </Li>
        <Li>
          Manda o QR Code no grupo do WhatsApp ou Discord. Cada jogador escaneia
          e coloca a própria iniciativa pelo celular.
        </Li>
        <Li>
          A ordem aparece na tela de todo mundo automaticamente. Empates
          resolvidos. Zero anotação.
        </Li>
        <Li>
          Você clica &quot;Iniciar Combate&quot; e o primeiro turno começa. Setup
          inteiro em menos de 60 segundos.
        </Li>
      </Ul>
      <P>
        60 segundos vs 3 a 5 minutos. Em 3 combates por sessão, são quase 15
        minutos de roleplay que você recupera. Não é pouco.
      </P>

      <Img src="/art/blog/combat-hp-panel.png" alt="Pocket DM — combate em andamento com ordem de iniciativa e HP visível" />

      <H2>Dica anti-metagame: esconde a ordem na 1a rodada</H2>
      <P>
        Essa é uma técnica que eu uso sempre. Na primeira rodada, não mostra a
        ordem completa pros jogadores. Só mostra de quem é a vez agora e quem é
        o próximo. Por quê?
      </P>
      <P>
        Porque quando o Fighter vê que o mago inimigo age logo depois dele, ele
        se posiciona pra bloquear. Faz sentido tacticamente, mas o personagem
        não teria como saber disso. É metagame puro. A partir da rodada 2, a
        ordem já é conhecida (o combate &quot;revelou&quot; quem é mais rápido)
        e faz sentido mostrar.
      </P>

      <Tip>
        Essa regra de &quot;rodada 1 oculta&quot; funciona melhor em mesas que
        curtem imersão. Se sua mesa é mais tática e competitiva, mostra a ordem
        completa desde o início. Ambos são válidos.
      </Tip>

      <H2>Iniciativa em grupo: quando usar</H2>
      <P>
        6 goblins no mapa. Rola iniciativa 6 vezes? Não. Rola uma vez pro tipo
        de criatura e todos do mesmo tipo agem na mesma posição. 6 goblins = 1
        rolagem, todos agem juntos.
      </P>
      <P>
        Vantagem: menos rolagens, setup mais rápido. Desvantagem: 6 ataques
        seguidos do mesmo monstro pode ser longo. Pra resolver, rola todos os
        ataques de uma vez e aplica os danos simultaneamente.
      </P>

      <H2>Resumo: qual método usar?</H2>
      <Ul>
        <Li>
          RAW (1d20 + DEX): funciona pra qualquer mesa, mas é lento com muita
          criatura. Automatiza com um tracker.
        </Li>
        <Li>
          Popcorn: dinâmico e divertido, mas requer jogadores maduros. Ótimo pra
          mesas de roleplay.
        </Li>
        <Li>
          Side Initiative: ultra-rápido, mas penaliza builds de DEX alta. Bom
          pra encontros aleatórios.
        </Li>
        <Li>
          Speed Factor: realista mas impraticável. Experimenta uma vez por
          curiosidade e depois volta pro RAW.
        </Li>
        <Li>
          Automatizado (QR Code): o melhor dos mundos. Mantém a rolagem
          individual, elimina o setup manual e funciona com qualquer variante.
        </Li>
      </Ul>
      <P>
        O princípio é simples: iniciativa existe pra organizar o combate, não pra
        atrasar. Se o processo de determinar a ordem tá demorando mais que 60
        segundos, muda o método. Pra mais dicas, leia nosso{" "}
        <IntLink slug="como-agilizar-combate-dnd-5e">guia de 10 dicas pra agilizar combate</IntLink>{" "}
        e o{" "}
        <IntLink slug="7-erros-mestre-combate-dnd">artigo sobre os 7 erros mais comuns</IntLink>.
      </P>

      <EbookCTA variant="banner" />
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   POST 20 — O Melhor Rastreador de Iniciativa Grátis para D&D 5e
   SEO: initiative tracker, initiative tracker 5e, initiative tracker
         dnd, initiative tracker rpg, best initiative tracker,
         free initiative tracker
   ═══════════════════════════════════════════════════════════════════ */
export function BlogPost20() {
  return (
    <>
      <P>
        Quem nunca perdeu 5 minutos anotando iniciativa no papel enquanto a mesa
        inteira ficava olhando pro celular? Você rola pra cada monstro, pede o
        número de cada jogador, anota tudo num caderno, ordena, confere se não
        esqueceu ninguém... e quando finalmente começa o combate, o clima
        daquela emboscada épica já evaporou. O problema não é a mecânica de
        iniciativa &mdash; é o processo manual. E é exatamente isso que um bom
        initiative tracker resolve.
      </P>

      <H2>O que é um initiative tracker?</H2>
      <P>
        Um initiative tracker é uma ferramenta &mdash; digital ou não &mdash;
        que organiza a ordem de turnos no combate de RPG. No D&amp;D 5e, todo
        mundo rola 1d20 + modificador de Destreza, e o mestre ordena do maior
        pro menor. Simples na teoria. Na prática, com 5 jogadores e 6 monstros,
        são 11 números pra anotar, ordenar e não errar.
      </P>
      <P>
        O papel do initiative tracker é eliminar esse trabalho braçal. Em vez de
        anotar no caderno, você joga os números numa ferramenta que ordena
        automaticamente, avança turnos com um clique e mostra pra todo mundo de
        quem é a vez. É a diferença entre 5 minutos de setup e 30 segundos.
      </P>

      <H2>Papel vs App: por que usar um rastreador de iniciativa digital</H2>
      <P>
        O método clássico funciona. Caderninho, post-its, clipes de roupa no
        escudo do mestre &mdash; todo DM veterano já usou alguma variação disso.
        Mas funcionar e funcionar bem são coisas diferentes. Vamos comparar:
      </P>
      <Ul>
        <Li>
          <strong>Velocidade</strong>: no papel, são 3 a 5 minutos por combate
          só de setup. Multiplica por 3 combates numa sessão e são 15 minutos
          jogados fora. Um rastreador de iniciativa digital faz isso em
          segundos.
        </Li>
        <Li>
          <strong>Erros</strong>: anotar errado, pular alguém, confundir a ordem
          no turno 4. No papel, toda correção vira discussão. No digital,
          a ordenação é automática e precisa.
        </Li>
        <Li>
          <strong>HP e condições</strong>: no papel, você precisa de uma coluna
          separada pra HP e outra pra condições. Fica apertado, fica confuso. Um
          initiative tracker 5e integra tudo na mesma interface.
        </Li>
        <Li>
          <strong>Visibilidade pros jogadores</strong>: no papel, só o mestre vê
          a ordem. &quot;De quem é a vez?&quot; é a pergunta mais repetida da
          sessão. Com um tracker digital, todo mundo vê no celular.
        </Li>
      </Ul>

      <Img src="/art/blog/initiative-setup.png" alt="Pocket DM — initiative tracker com ordem de turnos e iniciativa preenchida" />

      <H2>O que um bom initiative tracker precisa ter</H2>
      <P>
        Nem todo tracker é igual. Antes de escolher um, confere se ele tem o
        básico:
      </P>
      <Ul>
        <Li>
          <strong>Ordenação automática</strong>: você coloca os números, ele
          organiza. Empates resolvidos sem discussão.
        </Li>
        <Li>
          <strong>Rastreamento de HP</strong>: dano e cura aplicados direto no
          tracker, sem precisar de planilha separada.
        </Li>
        <Li>
          <strong>Condições visíveis</strong>: envenenado, atordoado,
          concentração &mdash; tudo marcado no token sem anotar em lugar nenhum.
        </Li>
        <Li>
          <strong>Avanço de turno com um clique</strong>: próximo turno, próxima
          rodada, contagem automática. Sem perder onde parou.
        </Li>
        <Li>
          <strong>Visão mobile pros jogadores</strong>: os jogadores veem a
          ordem e o turno atual no celular deles. Zero pergunta de &quot;de quem
          é a vez?&quot;.
        </Li>
        <Li>
          <strong>Sem cadastro obrigatório</strong>: o mestre cria o combate, os
          jogadores entram por link. Ninguém precisa criar conta pra participar.
        </Li>
      </Ul>
      <P>
        Se o tracker que você usa não tem pelo menos 4 desses 6 itens, você tá
        usando um tracker incompleto. E provavelmente voltando pro caderno
        porque &quot;dá no mesmo&quot;.
      </P>

      <H2>Como o Pocket DM resolve isso</H2>
      <P>
        O <ProdLink href="/try">Pocket DM</ProdLink> foi desenhado
        especificamente como um initiative tracker 5e pra mesas presenciais.
        Não é um VTT. Não é uma ficha online. É o que você abre no tablet ou
        notebook quando o combate começa. Cada ponto da checklist acima:
      </P>
      <Ul>
        <Li>
          <strong>Ordenação automática</strong>: jogadores colocam a iniciativa
          pelo celular via QR Code. A lista ordena sozinha em tempo real.
        </Li>
        <Li>
          <strong>HP integrado</strong>: monstros do compêndio SRD já vêm com
          HP preenchido. Aplica dano direto no painel, sem conta de cabeça.
        </Li>
        <Li>
          <strong>Condições no token</strong>: clica no token, marca a condição.
          Aparece visível pra você e pros jogadores.
        </Li>
        <Li>
          <strong>Turno com um clique</strong>: botão de &quot;Próximo&quot;
          avança pra próxima criatura. Contagem de rodadas automática.
        </Li>
        <Li>
          <strong>Player view em tempo real</strong>: cada jogador vê a ordem
          no celular. Ordem atualiza ao vivo conforme o combate avança.
        </Li>
        <Li>
          <strong>Zero cadastro</strong>: o mestre começa em 10 segundos sem
          criar conta. Jogadores entram escaneando o QR Code.
        </Li>
      </Ul>

      <Img src="/art/blog/initiative-tracker-final.png" alt="Pocket DM — initiative tracker ativo com HP, condições e ordem de turnos em tempo real" />

      <H2>Pocket DM vs outros initiative trackers</H2>
      <P>
        O mercado tem opções. Testamos as mais populares &mdash; Improved
        Initiative, Donjon, DM Tools, Shieldmaiden, e os VTTs &mdash; e a
        maioria foi feita pra outro contexto:
      </P>
      <Ul>
        <Li>
          <strong>Papel / clipes de roupa</strong>: funciona, mas é lento,
          propenso a erro e invisível pros jogadores. O rastreador de iniciativa
          mais antigo do mundo &mdash; e o mais limitado.
        </Li>
        <Li>
          <strong>Improved Initiative / Donjon</strong>: boas opções gratuitas
          no browser, mas sem player view no celular. O mestre vê a ordem, os
          jogadores não. E nenhum dos dois tem bestiário com stat blocks
          integrados.
        </Li>
        <Li>
          <strong>Roll20 / Foundry VTT</strong>: ótimos pra mesas online. Mas
          pra mesa presencial, ninguém quer abrir um VTT inteiro só pra
          rastrear iniciativa. É matar formiga com bazuca.
        </Li>
        <Li>
          <strong>D&amp;D Beyond</strong>: tem initiative tracker, mas exige que
          todo mundo tenha conta ($6/mês no Master Tier) e as fichas cadastradas
          na plataforma. Pra uma sessão com jogador novo, não rola.
        </Li>
        <Li>
          <strong>Pocket DM</strong>: grátis, sem conta, mobile-first, feito pra
          mesa presencial. Abre no browser, cria o combate, compartilha o link.
          1100+ monstros SRD com stat blocks integrados. É o best initiative
          tracker pra quem joga pessoalmente.
        </Li>
      </Ul>

      <Img src="/art/blog/initiative-tracker-active.png" alt="Condições D&D 5e no initiative tracker — envenenado, atordoado marcados no token do Goblin" />

      <H2>Como começar em 60 segundos</H2>
      <P>
        Três passos. Sem instalar nada, sem criar conta:
      </P>
      <Ul>
        <Li>
          <strong>1. Adicione os monstros</strong>: abra o{" "}
          <ProdLink href="/try">Pocket DM</ProdLink>, busque no compêndio ou
          adicione manualmente. HP e AC já vêm preenchidos.
        </Li>
        <Li>
          <strong>2. Role iniciativa</strong>: cada jogador escaneia o QR Code
          e coloca o próprio resultado pelo celular. A ordem aparece
          automaticamente na tela do mestre.
        </Li>
        <Li>
          <strong>3. Comece o combate</strong>: clique em &quot;Iniciar
          Combate&quot;. O initiative tracker avança turno por turno. Aplique
          dano, marque condições, avance rodadas &mdash; tudo no mesmo lugar.
        </Li>
      </Ul>
      <P>
        60 segundos do &quot;vamos rolar iniciativa&quot; até o primeiro ataque.
        É assim que um free initiative tracker deveria funcionar.
      </P>

      <Tip
        linkHref="/blog/iniciativa-dnd-5e-regras-variantes"
        linkText="Ler o guia completo de regras e variantes de iniciativa"
      >
        Quer entender as regras oficiais de iniciativa, variantes como Popcorn e
        Side Initiative, e quando usar cada uma? Leia nosso{" "}
        <IntLink slug="iniciativa-dnd-5e-regras-variantes">
          guia completo de regras e variantes de iniciativa
        </IntLink>.
      </Tip>

      <EbookCTA variant="banner" />

      <P>
        Pra mais dicas de combate, leia nosso{" "}
        <IntLink slug="como-agilizar-combate-dnd-5e">
          guia de 10 dicas pra agilizar combate no D&amp;D 5e
        </IntLink>{" "}
        e o{" "}
        <IntLink slug="como-usar-combat-tracker-dnd-5e">
          tutorial completo de como usar um combat tracker
        </IntLink>.
      </P>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   BLOG POST 21 — The Best Free D&D 5e Initiative Tracker (EN)
   ═══════════════════════════════════════════════════════════════════ */
export function BlogPost21() {
  return (
    <>
      <P>
        You know the drill. Combat starts, you ask everyone to roll initiative,
        and then you spend the next five minutes scribbling numbers on a napkin,
        squinting at your own handwriting, and asking &ldquo;wait, what did you
        get?&rdquo; for the third time. By the time you finally sort out the turn
        order, that dramatic ambush you spent an hour prepping feels about as
        tense as a trip to the DMV. The problem isn&rsquo;t initiative as a
        mechanic &mdash; it&rsquo;s the manual process around it. And that is
        exactly what a good initiative tracker fixes.
      </P>

      <H2>What is an initiative tracker?</H2>
      <P>
        An initiative tracker is a tool &mdash; digital or analog &mdash; that
        organizes turn order during combat in a tabletop RPG. In D&amp;D 5e,
        every creature rolls 1d20 plus their Dexterity modifier and the DM sorts
        the results from highest to lowest. Simple in theory. In practice, with
        five players and six monsters, that is eleven numbers to jot down, sort,
        and not mess up.
      </P>
      <P>
        The whole point of an initiative tracker is to eliminate that busywork.
        Instead of scrawling numbers in a notebook, you punch them into a tool
        that auto-sorts the list, advances turns with one tap, and shows everyone
        whose turn it is. It is the difference between five minutes of fumbling
        and thirty seconds of &ldquo;let&rsquo;s go.&rdquo;
      </P>

      <H2>Paper vs Digital: why use a digital initiative tracker</H2>
      <P>
        The classic method works. Notebooks, sticky notes, clothespin trackers
        on the DM screen &mdash; every veteran DM has used some version of it.
        But &ldquo;works&rdquo; and &ldquo;works well&rdquo; are two different
        things. Here is how they compare:
      </P>
      <Ul>
        <Li>
          <strong>Speed</strong>: on paper, initiative setup takes 3 to 5 minutes
          per encounter. Multiply that by three combats in a session and you have
          burned 15 minutes on bookkeeping. A digital initiative tracker handles
          it in seconds.
        </Li>
        <Li>
          <strong>Errors</strong>: writing the wrong number, skipping someone,
          losing track of the order on round four. On paper, every correction
          turns into a table-wide debate. A digital tracker sorts automatically
          and never forgets a combatant.
        </Li>
        <Li>
          <strong>HP and conditions</strong>: on paper, you need a separate
          column for HP and another for conditions. It gets cramped and confusing
          fast. A proper D&amp;D 5e initiative tracker integrates everything in
          one interface.
        </Li>
        <Li>
          <strong>Player visibility</strong>: on paper, only the DM sees the
          turn order. &ldquo;Whose turn is it?&rdquo; is the most-asked question
          at every table. With a digital initiative tracker, everyone sees the
          order on their phone.
        </Li>
      </Ul>

      <Img
        src="/art/blog/initiative-setup.png"
        alt="Pocket DM — initiative tracker with auto-sorted turn order"
      />

      <H2>What a good initiative tracker needs</H2>
      <P>
        Not all trackers are created equal. Before you commit to one, make sure
        it checks these boxes:
      </P>
      <Ul>
        <Li>
          <strong>Auto-sort</strong>: you enter the numbers, it sorts. Ties
          resolved without arguments.
        </Li>
        <Li>
          <strong>HP tracking</strong>: damage and healing applied right in the
          tracker &mdash; no side spreadsheet required.
        </Li>
        <Li>
          <strong>Visible conditions</strong>: poisoned, stunned,
          concentration &mdash; all marked on the token without scribbling notes
          elsewhere.
        </Li>
        <Li>
          <strong>One-click turn advance</strong>: next turn, next round,
          automatic round counter. No losing your place.
        </Li>
        <Li>
          <strong>Mobile player view</strong>: players see the turn order and
          the active turn on their own phones. Zero &ldquo;whose turn is
          it?&rdquo; questions.
        </Li>
        <Li>
          <strong>No account required</strong>: the DM creates the encounter,
          players join via link. Nobody has to sign up just to participate.
        </Li>
      </Ul>
      <P>
        If the initiative tracker you are currently using does not hit at least
        four of those six, you are working with an incomplete tool &mdash; and
        probably drifting back to the notebook because &ldquo;it&rsquo;s
        basically the same.&rdquo;
      </P>

      <H2>How Pocket DM handles it</H2>
      <P>
        <ProdLink href="/try">Pocket DM</ProdLink> was built from the ground up
        as a free initiative tracker for in-person D&amp;D 5e tables. It is not
        a VTT. It is not an online character sheet. It is the thing you open on
        your laptop or tablet when combat starts. Here is how it maps to the
        checklist above:
      </P>
      <Ul>
        <Li>
          <strong>Auto-sort</strong>: players enter their own initiative rolls
          from their phones via QR code. The list sorts itself in real time on
          the DM&rsquo;s screen.
        </Li>
        <Li>
          <strong>Integrated HP</strong>: monsters from the SRD compendium come
          with HP pre-filled. Apply damage directly on the tracker panel &mdash;
          no mental math required.
        </Li>
        <Li>
          <strong>Conditions on the token</strong>: tap a token, mark the
          condition. It shows up for you and for every player connected.
        </Li>
        <Li>
          <strong>One-click turn advance</strong>: hit &ldquo;Next&rdquo; and
          the initiative tracker moves to the next creature. Round count updates
          automatically.
        </Li>
        <Li>
          <strong>Real-time player view</strong>: every player sees the full
          turn order on their phone. The view updates live as combat progresses.
        </Li>
        <Li>
          <strong>Zero sign-up</strong>: the DM launches a combat in ten seconds
          without creating an account. Players join by scanning the QR code.
        </Li>
      </Ul>

      <Img
        src="/art/blog/initiative-tracker-final.png"
        alt="Pocket DM — active initiative tracker with HP, conditions, and turn order in real time"
      />

      <H2>Pocket DM vs other initiative trackers</H2>
      <P>
        There are options out there. We tested the most popular ones &mdash;
        Improved Initiative, Donjon, DM Tools, Shieldmaiden, and the major
        VTTs &mdash; and most of them were built for a different use case:
      </P>
      <Ul>
        <Li>
          <strong>Paper / clothespin trackers</strong>: they work, but they are
          slow, error-prone, and invisible to players. The oldest initiative
          tracker in the world &mdash; and the most limited.
        </Li>
        <Li>
          <strong>Improved Initiative / Donjon</strong>: solid free options that
          run in the browser, but no mobile player view. The DM sees the order,
          the players do not. Neither includes a bestiary with integrated stat
          blocks.
        </Li>
        <Li>
          <strong>Roll20 / Foundry VTT</strong>: excellent for online play. But
          for an in-person table, nobody wants to fire up an entire VTT just to
          track initiative. It is killing a fly with a bazooka.
        </Li>
        <Li>
          <strong>D&amp;D Beyond</strong>: it has an initiative tracker, but it
          requires everyone to have an account ($6/month for the Master Tier) and
          their character sheets on the platform. For a session with a new
          player, that is a non-starter.
        </Li>
        <Li>
          <strong>Pocket DM</strong>: free, no account needed, mobile-first,
          built for in-person play. Open it in your browser, create the
          encounter, share the link. Over 1,100 SRD monsters with integrated stat
          blocks. It is the best initiative tracker for DMs who play at a
          physical table.
        </Li>
      </Ul>

      <Img
        src="/art/blog/initiative-tracker-active.png"
        alt="D&D 5e conditions in the initiative tracker — poisoned and stunned marked on Goblin tokens"
      />

      <H2>Get started in 60 seconds</H2>
      <P>
        Three steps. No installs, no sign-ups:
      </P>
      <Ul>
        <Li>
          <strong>1. Add your monsters</strong>: open{" "}
          <ProdLink href="/try">Pocket DM</ProdLink>, search the compendium or
          add them manually. HP and AC are pre-filled from the SRD.
        </Li>
        <Li>
          <strong>2. Roll initiative</strong>: each player scans the QR code and
          enters their own roll from their phone. The turn order appears
          automatically on the DM&rsquo;s screen.
        </Li>
        <Li>
          <strong>3. Start combat</strong>: hit &ldquo;Start Combat.&rdquo; The
          initiative tracker advances turn by turn. Apply damage, mark
          conditions, advance rounds &mdash; all in one place.
        </Li>
      </Ul>
      <P>
        Sixty seconds from &ldquo;roll initiative&rdquo; to the first attack.
        That is how a free initiative tracker should work.
      </P>

      <Tip
        linkHref="/blog/iniciativa-dnd-5e-regras-variantes"
        linkText="Read the complete guide to initiative rules and variants"
      >
        Want to understand the official initiative rules, variants like Popcorn
        Initiative and Side Initiative, and when to use each one? Check out
        our{" "}
        <IntLink slug="iniciativa-dnd-5e-regras-variantes">
          complete guide to initiative rules and variants
        </IntLink>.
      </Tip>

      <EbookCTA variant="banner" />

      <P>
        For more combat tips, read our{" "}
        <IntLink slug="como-agilizar-combate-dnd-5e">
          10 tips to speed up D&amp;D 5e combat
        </IntLink>{" "}
        and the{" "}
        <IntLink slug="como-usar-combat-tracker-dnd-5e">
          complete combat tracker tutorial
        </IntLink>.
      </P>
    </>
  );
}
