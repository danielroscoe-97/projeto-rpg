import Link from "next/link";
import Image from "next/image";

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
function ProdLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
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
function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gold/25 bg-gold/[0.05] p-5 my-8 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-1 h-full bg-gold/50 rounded-l-xl" />
      <p className="text-sm text-foreground/85 leading-relaxed pl-3">
        <strong className="text-gold font-display text-xs uppercase tracking-wider">Dica do Mestre</strong>
        <br />
        <span className="mt-1 block">{children}</span>
      </p>
    </div>
  );
}
function CTA() {
  return (
    <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-5 my-8 text-center">
      <p className="text-sm text-foreground/70 mb-3">
        Quer testar um combat tracker gratuito agora?
      </p>
      <Link
        href="/try"
        className="inline-flex items-center gap-1 bg-gold text-surface-primary font-semibold px-5 py-2.5 rounded-lg text-sm hover:shadow-gold-glow transition-all duration-200"
      >
        Experimentar o Pocket DM →
      </Link>
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
        Um <ProdLink href="/try">combat tracker</ProdLink> é uma ferramenta
        digital que ajuda o mestre de D&D 5e a gerenciar encontros de combate de
        forma rápida e organizada. Em vez de anotar tudo em papel, você rastreia
        iniciativa, HP, condições e turnos em uma interface visual — e seus
        jogadores podem acompanhar em tempo real.
      </P>

      <H2>O que é um Combat Tracker?</H2>
      <P>
        É um aplicativo web ou app que substitui a ficha de papel do mestre
        durante o combate. Ele mantém a ordem de iniciativa, mostra quem já
        jogou, rastreia pontos de vida e condições ativas (como <em>envenenado</em>,{" "}
        <em>atordoado</em> ou <em>agarrado</em>), e avança turnos automaticamente.
      </P>
      <P>
        Existem diversas opções no mercado — desde planilhas simples até
        plataformas complexas como{" "}
        <ExtLink href="https://roll20.net">Roll20</ExtLink> e{" "}
        <ExtLink href="https://foundryvtt.com">Foundry VTT</ExtLink>. Mas para mesas
        presenciais, a maioria dessas ferramentas é complexa demais. O ideal é
        algo rápido, que funcione no celular e não exija que seus jogadores
        criem conta.
      </P>

      <Img src="/art/blog/combat-active.png" alt="Pocket DM — Combate ativo com iniciativa, HP e condições em tempo real" />

      <H2>5 Coisas que Todo Combat Tracker Deve Rastrear</H2>
      <P>
        Segundo o guia do{" "}
        <ExtLink href="https://slyflourish.com/tracking_combat.html">Sly Flourish</ExtLink>, um dos maiores blogs de D&D do mundo,
        existem cinco elementos essenciais para rastrear durante o combate:
      </P>
      <Ul>
        <Li>
          <strong>Iniciativa</strong> — quem age primeiro, quem age depois.
          A ordem de turnos é a espinha dorsal do combate.
        </Li>
        <Li>
          <strong>Dano e HP</strong> — quanto de vida cada criatura tem e quanto
          já levou de dano. Sem isso, você não sabe quando o monstro morre.
        </Li>
        <Li>
          <strong>Condições</strong> — efeitos como <em>blinded</em>,{" "}
          <em>stunned</em>, <em>prone</em>. Esquecer uma condição ativa pode
          mudar completamente o rumo do combate. Veja nosso{" "}
          <IntLink slug="guia-condicoes-dnd-5e">guia completo de condições D&D 5e</IntLink>.
        </Li>
        <Li>
          <strong>Posicionamento</strong> — onde cada criatura está em relação
          às outras. Importante para ataques de oportunidade e áreas de efeito.
        </Li>
        <Li>
          <strong>Stat blocks</strong> — o que cada monstro pode fazer no turno
          dele. Ataques, habilidades, CA e salvaguardas.
        </Li>
      </Ul>

      <H2>Como Usar na Prática (Passo a Passo)</H2>
      <H3>1. Antes da sessão: monte o encontro</H3>
      <P>
        Adicione os monstros que vão participar do combate. Um bom combat tracker
        já tem um bestiário integrado — você pesquisa pelo nome e adiciona com
        um clique. No Pocket DM, por exemplo, são mais de{" "}
        <ProdLink href="/monstros">1.200 monstros</ProdLink> do{" "}
        <ExtLink href="https://5e.d20srd.org/">SRD</ExtLink> + monstros do{" "}
        <ExtLink href="https://www.reddit.com/r/monsteraday/">r/monsteraday</ExtLink> disponíveis.
      </P>
      <Img src="/art/blog/monster-search.png" alt="Busca de monstros SRD no Pocket DM — pesquise e adicione com um clique" />

      <H3>2. Na hora do combate: role iniciativa</H3>
      <P>
        Cada jogador rola seu d20 + modificador e informa ao mestre. O combat
        tracker ordena automaticamente. Monstros podem ter iniciativa rolada ou
        usar o valor médio do stat block.
      </P>

      <H3>3. Durante o combate: gerencie turnos</H3>
      <P>
        O tracker avança turno por turno. Quando um jogador ataca, você reduz
        o HP do monstro direto na ferramenta. Quando um monstro aplica uma
        condição, você marca na criatura afetada. Tudo visual, tudo rápido.
      </P>
      <Img src="/art/blog/combat-hp-panel.png" alt="Painel de HP no Pocket DM — aplique dano, cure ou adicione HP temporário" />

      <H3>4. Jogadores acompanham no celular</H3>
      <P>
        Num combat tracker com sincronização em tempo real, cada jogador vê no
        próprio celular: de quem é o turno, quanto de HP ele tem, quais
        condições estão ativas. Sem precisar instalar nada — só abrir o link.
      </P>

      <Tip>
        Com o Pocket DM, o mestre compartilha um link e os jogadores entram
        instantaneamente. Sem cadastro, sem app, sem fricção.
      </Tip>

      <H2>Combat Tracker Digital vs Papel</H2>
      <P>
        A abordagem mais comum de mestres é anotar iniciativa em papel ou
        notecards. Funciona, mas tem problemas:
      </P>
      <Ul>
        <Li>Fácil esquecer condições ativas</Li>
        <Li>HP fica confuso com rasuras</Li>
        <Li>Jogadores não veem a ordem de iniciativa</Li>
        <Li>Demorado para configurar com muitos monstros</Li>
      </Ul>
      <P>
        Um combat tracker digital resolve tudo isso. E com ferramentas gratuitas
        como o <ProdLink href="/try">Pocket DM</ProdLink>, não há desculpa
        para não experimentar.
      </P>

      <CTA />

      <H2>Conclusão</H2>
      <P>
        Usar um combat tracker transforma a experiência na mesa. Combates
        ficam mais rápidos, organizados e imersivos. Se você mestra D&D 5e
        presencialmente, experimentar um tracker é o upgrade mais impactante
        que você pode fazer na sua sessão — especialmente se for gratuito e
        sem barreiras de entrada. Confira também nossas{" "}
        <IntLink slug="como-agilizar-combate-dnd-5e">10 dicas para agilizar o combate</IntLink>{" "}
        e as{" "}
        <IntLink slug="ferramentas-essenciais-mestre-dnd-5e">5 ferramentas essenciais para mestres</IntLink>.
      </P>
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
        As 5 ferramentas mais importantes para mestres de D&D 5e são: um combat
        tracker, um bestiário digital, um catálogo de magias, música ambiente e
        dados virtuais. Com essas cinco, você cobre 90% de tudo que precisa
        durante uma sessão.
      </P>

      <H2>1. Combat Tracker (Rastreador de Combate)</H2>
      <P>
        O <ProdLink href="/try">combat tracker</ProdLink> é a ferramenta #1
        porque combate é o momento em que o mestre mais precisa de organização.
        Rastrear iniciativa, HP e condições de 5+ criaturas simultaneamente em
        papel é caótico — especialmente com jogadores impacientes esperando
        seu turno.
      </P>
      <P>
        Um bom combat tracker permite adicionar monstros do bestiário com um
        clique, rolar iniciativa, gerenciar HP com barras visuais e marcar
        condições. Ferramentas como o Pocket DM ainda sincronizam tudo em tempo
        real no celular dos jogadores.
      </P>

      <H2>2. Bestiário Digital</H2>
      <P>
        Folhear o Monster Manual durante o combate mata o ritmo. Um bestiário
        digital com busca por nome, CR (Challenge Rating) ou tipo de criatura
        resolve isso. Os stat blocks ficam a um clique de distância.
      </P>
      <Img src="/art/blog/bestiary-index.png" alt="Bestiário do Pocket DM — monstros SRD + Monster a Day organizados por letra e CR" />
      <P>
        O conteúdo SRD (System Reference Document) do D&D 5e inclui centenas de
        monstros gratuitos. Ferramentas como o Pocket DM disponibilizam{" "}
        <ProdLink href="/monstros">mais de 1.200+ monstros SRD</ProdLink> — além
        de monstros do compêndio{" "}
        <ExtLink href="https://www.reddit.com/r/monsteraday/">Monster a Day</ExtLink>{" "}
        — com stat blocks completos, todos pesquisáveis.
      </P>

      <H2>3. Catálogo de Magias</H2>
      <P>
        {"\u201C"}O que essa magia faz mesmo?{"\u201D"} — essa pergunta aparece em toda sessão.
        Ter um catálogo de magias com busca por nome, escola, nível e classe
        evita pausas desnecessárias.
      </P>
      <Img src="/art/blog/spells-index.png" alt="Catálogo de magias SRD do Pocket DM — 750+ spells organizadas por nível e escola" />
      <P>
        O Pocket DM inclui o que chamamos de {"\u201C"}oráculo de magias{"\u201D"} — uma{" "}
        <ProdLink href="/magias">busca inteligente em mais de 900 magias SRD</ProdLink>,
        acessível durante o combate sem interromper o fluxo do jogo.
      </P>

      <H2>4. Música Ambiente</H2>
      <P>
        Música é o elemento mais subestimado de uma boa sessão. A trilha sonora
        certa transforma um combate genérico em um momento épico. Uma taverna
        sem música de taverna é só uma sala.
      </P>
      <P>
        O ideal é ter presets temáticos prontos — taverna, dungeon, floresta,
        batalha épica — para trocar rapidamente conforme a cena muda. O Pocket
        DM oferece mais de 12 presets integrados diretamente na interface de
        combate.
      </P>

      <H2>5. Dados Virtuais (Dice Roller)</H2>
      <P>
        Todo mundo ama dados físicos. Mas dados virtuais servem como backup
        rápido quando você precisa rolar 8d6 de fireball ou verificar uma
        salvaguarda rapidamente. Integrados ao combat tracker, eles aceleram
        o combate sem substituir a experiência tátil dos dados reais.
      </P>

      <Tip>
        O Pocket DM integra todas essas 5 ferramentas em uma única interface
        gratuita. Bestiário, magias, música, dados e combat tracker — tudo no
        mesmo lugar.
      </Tip>

      <H2>Ferramentas que NÃO São Essenciais (Mas São Legais)</H2>
      <Ul>
        <Li>
          <strong>VTT completo (<ExtLink href="https://roll20.net">Roll20</ExtLink>, <ExtLink href="https://foundryvtt.com">Foundry</ExtLink>)</strong> — ótimo para mesas
          online, mas overkill para presencial
        </Li>
        <Li>
          <strong>Gerador de mapas</strong> — útil para dungeon crawls, mas a
          maioria dos combates funciona com teatro da mente
        </Li>
        <Li>
          <strong>Ficha de personagem digital</strong> — legal, mas os jogadores
          geralmente preferem a própria ficha (física ou <ExtLink href="https://www.dndbeyond.com">D&D Beyond</ExtLink>)
        </Li>
        <Li>
          <strong>Gerador de NPCs/encontros com IA</strong> — promissor, mas
          ainda experimental
        </Li>
      </Ul>

      <CTA />

      <H2>Conclusão</H2>
      <P>
        Não precisa de 10 ferramentas. Com cinco bem escolhidas — combat tracker,
        bestiário, magias, música e dados — você cobre o que realmente importa
        na mesa. O segredo é simplicidade: a ferramenta não pode ser mais
        complexa que o problema que ela resolve. Quer ver como funciona na
        prática? Leia o{" "}
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
        A diferença principal: um combat tracker gerencia apenas o combate
        (iniciativa, HP, condições), enquanto um VTT (Virtual Tabletop) é uma
        plataforma completa para jogar RPG online — com mapas, tokens, fichas e
        grid. Se você joga presencialmente, um combat tracker é tudo que precisa.
      </P>

      <H2>O que é um VTT?</H2>
      <P>
        Virtual Tabletop (VTT) é uma plataforma que simula a mesa de RPG no
        computador. Exemplos populares incluem{" "}
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

      <H2>O que é um Combat Tracker?</H2>
      <P>
        Um <ProdLink href="/try">combat tracker</ProdLink> é uma ferramenta focada
        exclusivamente em gerenciar o momento do combate. Ele faz menos coisas,
        mas faz melhor e mais rápido:
      </P>
      <Ul>
        <Li>Ordem de iniciativa automática</Li>
        <Li>Gerenciamento de HP com barras visuais</Li>
        <Li><ProdLink href="/condicoes">Condições ativas</ProdLink> (blinded, stunned, etc.)</Li>
        <Li>Avanço de turnos</Li>
        <Li><ProdLink href="/monstros">Bestiário integrado</ProdLink> (stat blocks)</Li>
        <Li>Funciona no celular dos jogadores</Li>
      </Ul>

      <H2>Comparação Direta</H2>
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

      <H2>Quando Usar Cada Um</H2>
      <H3>Use um VTT se:</H3>
      <Ul>
        <Li>Seus jogadores jogam online/remotamente</Li>
        <Li>Você quer mapas interativos e fog of war</Li>
        <Li>Você tem tempo para configurar antes de cada sessão</Li>
        <Li>Todos têm computador (não funciona bem no celular)</Li>
      </Ul>

      <Img src="/art/blog/combat-with-monsters.png" alt="Pocket DM — setup de encontro com 4 monstros prontos para o combate" />

      <H3>Use um Combat Tracker se:</H3>
      <Ul>
        <Li>Você joga presencialmente</Li>
        <Li>Quer algo rápido e sem complicação</Li>
        <Li>Seus jogadores usam celular, não notebook</Li>
        <Li>Prefere teatro da mente ou miniaturas físicas</Li>
        <Li>Não quer forçar seus jogadores a criar contas</Li>
      </Ul>

      <Tip>
        Muitos mestres usam os dois: um VTT para mesas online e um combat
        tracker para sessões presenciais. São ferramentas complementares.
      </Tip>

      <CTA />

      <H2>Conclusão</H2>
      <P>
        VTTs são poderosos, mas são feitos para jogar online. Se sua mesa é
        presencial, um combat tracker leve e gratuito como o{" "}
        <ProdLink href="/try">Pocket DM</ProdLink> é a escolha certa — menos
        setup, menos complexidade, mais foco no jogo. Quer aprofundar? Leia
        nosso{" "}
        <IntLink slug="como-usar-combat-tracker-dnd-5e">guia de combat tracker para D&amp;D 5e</IntLink>{" "}
        ou confira as{" "}
        <IntLink slug="ferramentas-essenciais-mestre-dnd-5e">5 ferramentas essenciais para mestres</IntLink>.
        Para uma comparação detalhada de VTTs, veja o{" "}
        <ExtLink href="https://www.hipstersanddragons.com/best-virtual-tabletops/">guia do Hipsters &amp; Dragons</ExtLink>.
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
        O D&D 5e tem 15 condições oficiais que podem afetar criaturas durante o
        combate. Cada condição impõe restrições específicas — de desvantagem em
        ataques até incapacidade total. Este guia explica todas em português,
        com exemplos de quando cada uma aparece.
      </P>

      <H2>O que São Condições?</H2>
      <P>
        Condições são efeitos que alteram as capacidades de uma criatura. Podem
        ser causadas por magias, habilidades de classe, ataques de monstros ou
        efeitos do ambiente. Uma condição dura até ser removida (como
        ficar <em>prone</em> e se levantar) ou até o tempo do efeito expirar.
        Para a referência oficial em inglês, veja o{" "}
        <ExtLink href="https://5e.d20srd.org/srd/conditionSummary.htm">SRD Condition Summary</ExtLink> ou o guia do{" "}
        <ExtLink href="https://arcaneeye.com/mechanic-overview/5e-conditions/">Arcane Eye sobre condições</ExtLink>.
      </P>

      <Img src="/art/blog/combat-conditions.png" alt="Painel de condições do Pocket DM — todas as 15 condições D&D 5e disponíveis com um clique" />

      <H2>Todas as 15 Condições</H2>

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
        a descrição completa aparece para consulta rápida — sem precisar abrir
        o livro. Veja também nossa{" "}
        <ProdLink href="/condicoes">referência rápida de condições</ProdLink>.
      </Tip>

      <H2>Condições que Combinam</H2>
      <P>
        Algumas condições são {"\u201C"}pré-requisitos{"\u201D"} de outras. <strong>Paralyzed</strong>,{" "}
        <strong>Stunned</strong> e <strong>Unconscious</strong> todos incluem{" "}
        <strong>Incapacitated</strong>. Isso significa que se uma criatura está
        paralisada, ela também está incapacitada automaticamente.
      </P>

      <CTA />
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
        Combate lento é o maior vilão de uma sessão de D&D. A boa notícia:
        existem técnicas comprovadas para acelerar combates sem perder a
        diversão. Aqui estão 10 dicas práticas usadas por mestres experientes em
        todo o mundo.
      </P>

      <H2>1. Use Dano Fixo dos Monstros</H2>
      <P>
        O Monster Manual lista dano médio para todo monstro — é o número antes
        dos parênteses. Em vez de rolar 2d6+3 pra cada ataque do ogre, use 10.
        Isso elimina dezenas de rolagens por combate. Segundo o{" "}
        <ExtLink href="https://slyflourish.com/tips_to_speed_up_combat.html">Sly Flourish</ExtLink>,
        menos de 10% dos mestres usam dano fixo, mas é a forma mais fácil de
        acelerar combates.
      </P>

      <H2>2. Simplifique os Inimigos</H2>
      <P>
        Um combate com 4 ogres é mais rápido de gerenciar que um com 2 ogres,
        6 goblins e 1 hobgoblin mago. Menos tipos de monstros = menos stat
        blocks = menos troca de contexto mental.
      </P>

      <H2>3. Use um Combat Tracker Digital</H2>
      <P>
        Anotar HP em papel, riscar, reescrever, perder o papel... isso consome
        tempo. Um <ProdLink href="/try">combat tracker digital</ProdLink> com
        barras de HP visuais e avanço automático de turno elimina essa fricção.
        Com o Pocket DM, você adiciona monstros do{" "}
        <ProdLink href="/monstros">bestiário</ProdLink>, rola iniciativa e
        começa — em menos de 2 minutos.
      </P>
      <Img src="/art/blog/combat-active.png" alt="Combate ativo no Pocket DM — barras de HP, turnos e condições gerenciados visualmente" />

      <H2>4. Role Iniciativa em Grupo</H2>
      <P>
        Em vez de rolar iniciativa individual para cada goblin, role uma vez e
        use para todos os goblins. Isso corta drasticamente o tempo de setup
        e simplifica a ordem de turnos.
      </P>

      <H2>5. Timer de Turno (Suave)</H2>
      <P>
        Não precisa ser rígido, mas combinar que cada jogador tem ~60 segundos
        para decidir sua ação mantém o ritmo. A regra: {"\u201C"}se não decidiu,
        seu personagem usa o turno se defendendo (Dodge).{"\u201D"}
      </P>

      <H2>6. Delegue Tarefas aos Jogadores</H2>
      <P>
        Um jogador anota a iniciativa. Outro controla o mapa. Outro cuida das
        condições. Distribuir responsabilidades tira carga do mestre e engaja
        os jogadores mesmo quando não é o turno deles. Com um combat tracker
        como o Pocket DM, isso acontece naturalmente — cada jogador vê seu
        status no próprio celular.
      </P>

      <H2>7. Monstros Fogem</H2>
      <P>
        Monstros inteligentes não lutam até a morte. Quando um goblin cai
        a 20% de HP, ele foge. Isso encurta combates e adiciona realismo.
        Os jogadores ainda ganham ataques de oportunidade, e você elimina 2-3
        rodadas de {"\u201C"}acabamento{"\u201D"}.
      </P>

      <H2>8. Teatro da Mente para Combates Menores</H2>
      <P>
        Nem todo combate precisa de mapa e miniaturas. Encontros rápidos
        contra 3-4 inimigos fracos funcionam perfeitamente com teatro da mente.
        Descreva o cenário, pergunte posições gerais e resolva. Reserve o mapa
        para boss fights e encontros táticos.
      </P>

      <H2>9. Prepare Antes da Sessão</H2>
      <P>
        Leia os stat blocks antes da sessão. Marque as habilidades que vai usar.
        Pré-role ou defina iniciativa dos monstros. 10 minutos de preparação
        economizam 30 minutos de combate travado.
      </P>

      <H2>10. Menos Combates, Mais Impacto</H2>
      <P>
        Se o problema é que combates demoram, uma solução é ter menos. Dois
        combates significativos por sessão valem mais que cinco genéricos.
        Cada encontro deve ter um propósito narrativo — se não tem, considere
        resolver com um teste de habilidade.
      </P>

      <Tip>
        O Pocket DM combina as dicas 3, 4 e 6 automaticamente: combat tracker
        digital, iniciativa visual para todos e jogadores acompanhando no
        celular. Três otimizações de uma vez.
      </Tip>

      <CTA />

      <H2>Conclusão</H2>
      <P>
        Combate rápido não é combate superficial — é combate bem gerenciado.
        Com as técnicas certas e um bom combat tracker, você mantém a tensão
        sem o tédio. Seus jogadores vão agradecer. Para mais dicas, confira o{" "}
        <ExtLink href="https://www.hipstersanddragons.com/fixing-slow-combat-5e/">guia do Hipsters &amp; Dragons</ExtLink>{" "}
        e o artigo do{" "}
        <ExtLink href="https://rpgbot.net/dnd5/dungeonmasters/faster-combat/">RPGBot sobre combate mais rápido</ExtLink>.
        Veja também nosso{" "}
        <IntLink slug="como-usar-combat-tracker-dnd-5e">guia de combat tracker</IntLink>{" "}
        e o{" "}
        <IntLink slug="guia-condicoes-dnd-5e">guia completo de condições</IntLink>.
      </P>
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
        O Pocket DM é um combat tracker gratuito para D&D 5e que funciona direto
        no navegador. Em menos de 2 minutos você monta um encontro, adiciona
        monstros do bestiário SRD e inicia o combate — com seus jogadores
        acompanhando em tempo real no celular. Este tutorial mostra cada passo.
      </P>

      <H2>Passo 1: Acessar o Pocket DM</H2>
      <P>
        Acesse{" "}
        <ExtLink href="https://pocketdm.com.br/try">pocketdm.com.br/try</ExtLink>{" "}
        para entrar no modo visitante. Não precisa criar conta — você pode
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
        com stat blocks completos — HP, CA, ataques, habilidades e Challenge
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
        {"\u201C"}+ Monstro/Jogador Manual{"\u201D"}. Só o nome é obrigatório — HP, CA e
        iniciativa são opcionais.
      </Tip>

      <H2>Passo 3: Configurar Iniciativa</H2>
      <P>
        Cada combatente precisa de um valor de iniciativa para definir a ordem
        dos turnos. Você tem três opções:
      </P>
      <Ul>
        <Li>
          <strong>Rolar Todos</strong> — o Pocket DM rola d20 + modificador de
          DEX para todos os combatentes de uma vez
        </Li>
        <Li>
          <strong>Rolar NPCs</strong> — rola só para os monstros (útil quando
          os jogadores já rolaram seus próprios dados)
        </Li>
        <Li>
          <strong>Manual</strong> — clique no número de iniciativa de cada
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
        <Li><strong>Dano</strong> — aplicar dano (a barra de HP muda de cor conforme o nível de ferimento)</Li>
        <Li><strong>Curar</strong> — restaurar pontos de vida</Li>
        <Li><strong>Temp PV</strong> — adicionar pontos de vida temporários</Li>
      </Ul>
      <P>
        As barras de HP usam cores por tier:{" "}
        <span className="text-green-400">verde (100-70%)</span>,{" "}
        <span className="text-yellow-400">amarelo (70-40%)</span>,{" "}
        <span className="text-orange-400">laranja (40-10%)</span> e{" "}
        <span className="text-red-400">vermelho (&lt;10%)</span>.
        Os jogadores veem apenas o tier, não o valor exato — mantendo a tensão.
      </P>

      <Img src="/art/blog/combat-hp-panel.png" alt="Painel de HP no Pocket DM — opções de Dano, Curar e Temp PV com campo de valor" />

      <H2>Passo 6: Aplicar Condições</H2>
      <P>
        Clique no botão <strong>{"\u201C"}Cond{"\u201D"}</strong> para ver todas as 15{" "}
        <IntLink slug="guia-condicoes-dnd-5e">condições do D&D 5e</IntLink>.
        Clique em qualquer condição para aplicar — ela fica visível para o
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
        Funciona em qualquer navegador moderno — Chrome, Safari, Firefox.
      </P>

      <H2>Passo 8: Usar o Bestiário e Oráculo de Magias</H2>
      <P>
        Durante o combate, você pode consultar o bestiário completo clicando em
        <strong> {"\u201C"}Ver Ficha{"\u201D"}</strong> em qualquer monstro — o stat block completo
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
        O Pocket DM tem mais de 12 presets de música ambiente integrados —
        taverna, dungeon, floresta, batalha épica, calmaria e mais. O ícone de
        música no topo do combate permite trocar a trilha a qualquer momento.
        Os jogadores ouvem no próprio celular.
      </P>

      <H2>Dicas para Aproveitar ao Máximo</H2>
      <Ul>
        <Li>
          <strong>Monte o encontro antes da sessão</strong> — adicione monstros
          e deixe tudo pronto. Na hora H, é só rolar iniciativa e começar.
        </Li>
        <Li>
          <strong>Use dano fixo dos monstros</strong> — o stat block já mostra
          o dano médio. Isso{" "}
          <IntLink slug="como-agilizar-combate-dnd-5e">agiliza muito o combate</IntLink>.
        </Li>
        <Li>
          <strong>Crie uma conta gratuita</strong> — para salvar campanhas,
          reencontrar jogadores e manter histórico entre sessões.
        </Li>
        <Li>
          <strong>Explore o bestiário fora do combate</strong> — em{" "}
          <Link href="/monsters" className="text-gold/80 underline underline-offset-2 decoration-gold/30 hover:text-gold transition-colors">
            pocketdm.com.br/monsters
          </Link>{" "}
          você pode navegar todos os monstros SRD com stat blocks completos.
        </Li>
      </Ul>

      <CTA />

      <H2>Conclusão</H2>
      <P>
        O Pocket DM foi projetado para ser a ferramenta mais simples e rápida
        para gerenciar combate de D&D 5e na mesa presencial. Sem curva de
        aprendizado, sem instalação, sem cadastro obrigatório. Monte um
        encontro, role iniciativa e jogue. Para mais contexto sobre combat
        trackers em geral, leia nosso{" "}
        <IntLink slug="como-usar-combat-tracker-dnd-5e">guia completo de combat trackers</IntLink>{" "}
        e as{" "}
        <IntLink slug="ferramentas-essenciais-mestre-dnd-5e">5 ferramentas essenciais para mestres</IntLink>.
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
        Montar um encontro balanceado no D&D 5e é uma das habilidades mais
        importantes que um mestre pode desenvolver. Um encontro mal calibrado
        pode transformar uma sessão em tédio (fácil demais) ou em frustração
        (TPK inesperado). Mas equilibrar encontros não precisa ser complicado
        nem exigir planilhas complexas. Neste guia, você vai aprender os métodos
        mais confiáveis para criar encontros desafiadores, justos e memoráveis
        para sua mesa.
      </P>

      <H2>Por que Balancear Encontros Importa</H2>
      <P>
        O combate ocupa uma parcela significativa do tempo de jogo na maioria
        das mesas de D&D 5e. Quando os encontros são consistentemente fáceis
        demais, os jogadores perdem o senso de risco e param de pensar
        taticamente. Quando são brutais demais sem contexto narrativo, geram
        frustração. O ponto ideal é aquele em que os jogadores sentem que
        precisam usar seus recursos com inteligência, fazer escolhas táticas
        e trabalhar em equipe.
      </P>
      <P>
        Vale reforçar: balancear não significa que todo encontro precisa ser
        uma luta equilibrada. Como{" "}
        <ExtLink href="https://slyflourish.com/5e_encounter_building.html">
          Sly Flourish argumenta
        </ExtLink>, o mundo não se conforma ao nível dos personagens. Existem
        encontros triviais e encontros avassaladores. O objetivo do
        balanceamento é saber <em>de antemão</em> qual será a dificuldade, para
        que surpresas letais aconteçam por escolha do mestre, não por acidente.
      </P>

      <H2>O Método do Orçamento de XP (DMG)</H2>
      <P>
        O método oficial do Dungeon Master{"'"}s Guide é o mais conhecido. Ele
        funciona em quatro passos:
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
        <a href="/monsters">bestiário do Pocket DM</a>{" "}
        para encontrar monstros por CR, tipo e ambiente. Você também pode
        consultar nosso{" "}
        <a href="/monstros">compêndio de monstros</a>{" "}
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
        <a href="/calculadora-encontro">Calculadora de Encontros do Pocket DM</a>{" "}
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

      <H2>O Lazy Encounter Benchmark (Sly Flourish)</H2>
      <P>
        Se o método do XP Budget parece trabalhoso demais para o dia a dia,{" "}
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

      <H2>Economia de Ações: O Fator Invisível</H2>
      <P>
        A economia de ações é provavelmente o fator mais importante e mais
        subestimado no balanceamento de encontros. A regra é simples: o lado
        que tem mais ações por rodada tende a vencer. Um dragão adulto com CR
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

      <H2>Variedade de Monstros: Composição Tática</H2>
      <P>
        Um encontro memorável raramente é composto por 6 cópias do mesmo
        monstro. A variedade de funções táticas é o que transforma um combate
        mecânico em algo dinâmico e inesquecível.{" "}
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

      <H2>Terreno e Ambiente: O Terceiro Lado do Combate</H2>
      <P>
        O terreno é frequentemente ignorado por mestres que montam encontros
        apenas pelo XP. Mas um encontro médio num terreno vantajoso para os
        monstros pode se tornar mortal, e um encontro difícil num terreno
        favorável ao grupo pode se tornar trivial.
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

      <H2>Os Quatro Níveis de Dificuldade na Prática</H2>
      <P>
        O DMG define quatro níveis de dificuldade, mas o que cada um realmente
        significa na mesa? Aqui está um guia prático:
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

      <H2>Orçamento do Dia de Aventura</H2>
      <P>
        Um conceito que muitos mestres ignoram é o orçamento total do dia de
        aventura. O DMG assume que um grupo enfrenta 6-8 encontros médios
        entre descansos longos. Esse pressuposto é a base de todo o sistema
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

      <H2>Ajustes na Hora: Quando o Balanceamento Falha</H2>
      <P>
        Nenhum sistema de balanceamento é perfeito. Personagens otimizados,
        itens mágicos, táticas criativas e rolagens de dados podem transformar
        um encontro Mortal em piada ou um encontro Fácil em desastre. O
        segredo do bom mestre é ajustar na hora, sem que os jogadores percebam.
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
        <a href="/calculadora-encontro">calculador de encontros</a>{" "}
        ajuda no preparo, mas na mesa, sua intuição como mestre é a
        ferramenta mais valiosa. Preste atenção nos rostos dos jogadores:
        tensão é bom, desespero silencioso não.
      </P>

      <H2>Checklist Prático: Montando seu Encontro</H2>
      <P>
        Aqui está um passo a passo que você pode seguir agora mesmo para
        montar o próximo encontro da sua sessão:
      </P>
      <Ul>
        <Li>
          <strong>1. Defina o contexto narrativo:</strong> por que esse
          combate acontece? Quem são os inimigos e o que querem? Um encontro
          sem contexto é apenas aritmética.
        </Li>
        <Li>
          <strong>2. Escolha os monstros pela história:</strong> use o{" "}
          <a href="/monsters">bestiário</a>{" "}
          para encontrar criaturas que façam sentido no cenário. Depois
          verifique se os números funcionam.
        </Li>
        <Li>
          <strong>3. Calcule a dificuldade:</strong> use o método do XP
          Budget ou o Lazy Encounter Benchmark para verificar se o encontro
          está na faixa desejada. A{" "}
          <a href="/calculadora-encontro">Calculadora de Encontros</a>{" "}
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

      <H2>Erros Comuns ao Balancear Encontros</H2>
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

      <H2>Conclusão</H2>
      <P>
        Montar um encontro balanceado no D&D 5e é uma combinação de matemática,
        intuição e conhecimento do seu grupo. O método do XP Budget fornece a
        base numérica. O Lazy Encounter Benchmark de{" "}
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

      <CTA />
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
        Se você já tentou montar um encontro no D&D 5e e ficou confuso com o
        sistema de Challenge Rating, você não está sozinho. O CR é uma das
        mecânicas mais mal-entendidas do jogo — e ao mesmo tempo uma das mais
        úteis quando você entende como realmente funciona. Como{" "}
        <ExtLink href="https://slyflourish.com/what_does_cr_mean.html">
          Sly Flourish explica
        </ExtLink>, o CR é um ponto de partida, não uma resposta absoluta. E como{" "}
        <ExtLink href="https://theangrygm.com/f-cr-theres-a-better-way-part-1/">
          The Angry GM argumenta
        </ExtLink>, o sistema tem falhas sérias — mas conhecer essas falhas é o
        que separa um mestre mediano de um mestre preparado.
      </P>
      <P>
        Neste guia, vamos destrinchar o sistema de Challenge Rating do D&D 5e:
        como funciona, quando mente, e quais atalhos práticos usar para montar
        encontros melhores sem depender de planilhas.
      </P>

      <H2>O Que É Challenge Rating?</H2>
      <P>
        Challenge Rating é um número que representa a dificuldade relativa de um
        monstro. Em teoria, um monstro com CR X deveria ser um desafio
        {'"'}médio{'"'} para um grupo de quatro aventureiros de nível X. Um
        grupo de quatro personagens de nível 5 deveria enfrentar um monstro
        CR 5 como um encontro {'"'}justo{'"'} — nem trivial, nem mortal.
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

      <H2>Tabela de Limiares de XP por Nível</H2>
      <P>
        Esta tabela mostra o limiar de XP <strong>por personagem</strong> em cada
        nível. Multiplique pelo número de jogadores para obter o orçamento do
        grupo. Se um encontro ultrapassa o limiar {'"'}Mortal{'"'}, há risco
        real de morte de personagem.
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

      <H2>Multiplicadores de Monstros</H2>
      <P>
        O DMG aplica um multiplicador ao XP total dos monstros com base na
        quantidade de criaturas no encontro. Isso reflete o fato de que mais
        monstros têm mais ações — e economia de ações é o fator mais poderoso
        do combate no D&D 5e.
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
        de 4 de nível 1, isso fica entre Difícil (300 XP) e Mortal (400 XP) —
        um encontro bem tenso.
      </P>

      <Tip>
        O multiplicador é usado apenas para determinar a dificuldade, não para
        distribuir XP. Os jogadores recebem o XP bruto dividido pelo grupo (no
        exemplo acima, 150 XP / 4 = 37 XP cada).
      </Tip>

      <H2>Quando o CR Mente</H2>
      <P>
        O CR é calculado a partir de médias estatísticas, mas o combate no D&D 5e
        é tudo menos médio. Existem situações em que o CR subestima ou
        superestima drasticamente a dificuldade real de um monstro.
      </P>

      <H3>1. Habilidades de Controle</H3>
      <P>
        Monstros com habilidades que removem jogadores do combate — como
        petrificação, paralisia, <em>Hold Person</em> ou engolir — são muito mais
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
        bipolar — ou o monstro parece invencível, ou morre instantaneamente.
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
        cautela — um grupo de 4 Goblins pode causar um TPK com facilidade.
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

      <H2>Atalhos Práticos</H2>
      <P>
        Se o sistema oficial parece trabalhoso demais, existem alternativas
        comprovadas que simplificam drasticamente o processo sem perder a
        precisão.
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
        deve servir a história, não ao contrário. Comece pela narrativa — que
        monstros fazem sentido nesta cena? Depois verifique o CR como sanity
        check. Se o resultado é {'"'}mortal{'"'}, ajuste: reduza HP, remova um
        monstro ou dê ao grupo vantagem tática. Se é {'"'}fácil{'"'}, adicione
        monstros ou coloque os inimigos em terreno vantajoso.
      </P>

      <H2>Como Ajustar em Tempo Real</H2>
      <P>
        Mesmo o melhor planejamento pode resultar em um encontro que não funciona
        na mesa. A habilidade de ajustar em tempo real é o que realmente separa
        um bom mestre. Veja quatro técnicas essenciais:
      </P>

      <H3>Ajustar HP</H3>
      <P>
        Se o monstro está morrendo rápido demais, adicione HP silenciosamente.
        Se está tedioso porque os jogadores não conseguem derrubar, reduza. Os
        jogadores não sabem o HP exato do monstro — use isso a seu favor. Dica:
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
        <Link href="/try" className="text-gold underline underline-offset-2 decoration-gold/30 hover:text-gold hover:decoration-gold/60 transition-colors">
          Pocket DM
        </Link>{" "}
        para rastrear HP em tempo real e fazer esses ajustes sem que os jogadores
        percebam. É muito mais fácil ajustar HP digitalmente do que riscar e
        reescrever no papel.
      </Tip>

      <H2>Referência Rápida: CR por Dificuldade</H2>
      <P>
        Tabela de referência rápida para um grupo de 4 PCs. Use como ponto de
        partida e ajuste conforme necessário.
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

      <H2>Erros Comuns</H2>
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
          são um encontro CR 1. Com o multiplicador x2, o XP ajustado dobra — e
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

      <H2>Conclusão</H2>
      <P>
        O Challenge Rating do D&D 5e não é perfeito — nenhum sistema de
        balanceamento automático pode capturar todas as variáveis de uma mesa
        real. Mas quando você entende como funciona, onde falha e quais atalhos
        usar, o CR se torna uma ferramenta poderosa em vez de uma fonte de
        frustração. Use as tabelas como ponto de partida, o Lazy Encounter
        Benchmark como atalho do dia a dia, e sua intuição de mestre como a
        decisão final.
      </P>
      <P>
        Para montar encontros na prática, use a{" "}
        <Link href="/calculadora-encontro" className="text-gold underline underline-offset-2 decoration-gold/30 hover:text-gold hover:decoration-gold/60 transition-colors">
          Calculadora de Encontros
        </Link>{" "}
        do Pocket DM, explore o{" "}
        <Link href="/monstros" className="text-gold underline underline-offset-2 decoration-gold/30 hover:text-gold hover:decoration-gold/60 transition-colors">
          Compêndio de Monstros
        </Link>{" "}
        gratuito com fichas SRD completas, ou{" "}
        <Link href="/try" className="text-gold underline underline-offset-2 decoration-gold/30 hover:text-gold hover:decoration-gold/60 transition-colors">
          teste o combat tracker
        </Link>{" "}
        direto no navegador. E se quiser aprofundar, leia nosso guia sobre{" "}
        <IntLink slug="como-montar-encontro-balanceado-dnd-5e">
          como montar encontros balanceados
        </IntLink>{" "}
        e sobre os{" "}
        <IntLink slug="melhores-monstros-dnd-5e">
          10 monstros que todo mestre deveria usar
        </IntLink>.
      </P>

      <CTA />
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
        Existem centenas de monstros no bestiário do D&D 5e. Só no SRD (System
        Reference Document) são mais de 400 criaturas, e quando você junta
        suplementos oficiais, esse número ultrapassa mil. Para um mestre que
        está começando — ou mesmo um veterano buscando variedade —
        a quantidade de opções pode paralisar. Qual monstro vale o tempo de
        preparo? Qual vai criar aquele momento inesquecível na mesa?
      </P>
      <P>
        Esta lista reúne 10 monstros que consideramos essenciais no arsenal de
        qualquer mestre de D&D 5e. Não são necessariamente os mais fortes, mas
        os mais <em>versáteis</em>: criaturas que funcionam em múltiplos
        contextos, geram momentos memoráveis e ensinam lições valiosas sobre
        design de encontros. A seleção cobre do nível 1 ao 20, então tem
        ferramenta aqui para qualquer estágio de campanha.
      </P>
      <P>
        Para cada monstro, incluímos por que ele merece seu lugar na mesa, uma
        dica tática baseada em referências como{" "}
        <ExtLink href="https://www.themonstersknow.com/">The Monsters Know What They{"'"}re Doing</ExtLink>{" "}
        e{" "}
        <ExtLink href="https://slyflourish.com/making_monsters_interesting.html">Sly Flourish</ExtLink>,
        e um link direto para a ficha no nosso compêndio gratuito.
      </P>

      {/* ── 1. GOBLIN ─────────────────────────────────────────────── */}
      <H2>1. Goblin — O Clássico Versátil</H2>
      <P>
        Se existe um monstro que todo mestre deveria dominar, é o Goblin. Com
        CR 1/4, ele parece inofensivo no papel — 7 pontos de vida, um
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
        <Li>Perfeito para emboscadas — a habilidade Stealth (+6) é melhor que a de muitos personagens</Li>
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
        <a href="/monstros/goblin">Goblin no Compêndio</a>.
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
        <Li>Viagens por floresta ou tundra — perfeito para encontros aleatórios com peso narrativo</Li>
        <Li>Montaria de orcs, goblins ou druidas corrompidos</Li>
        <Li>Caçada reversa: os jogadores são a presa, não os predadores</Li>
        <Li>Introdução natural ao conceito de Pack Tactics para novos jogadores</Li>
      </Ul>
      <Tip>
        Lobos terríveis caçam em matilha e tentam separar o grupo. Faça
        dois lobos focarem no mesmo alvo para derrubar, enquanto o terceiro
        circunda o mago na retaguarda. Se um lobo derruba alguém, os
        outros ganham vantagem automática contra o alvo caído — é
        brutal e realista.
      </Tip>
      <P>
        Veja a ficha completa:{" "}
        <a href="/monstros/lobo-terrivel">Dire Wolf no Compêndio</a>.
      </P>

      {/* ── 3. OWLBEAR ────────────────────────────────────────────── */}
      <H2>3. Owlbear — O Terror Icônico</H2>
      <P>
        Poucos monstros são tão <em>D&D</em> quanto o Owlbear (Urso-coruja).
        Ele não existe em nenhuma mitologia — é uma criação original do
        jogo, provavelmente inspirada em brinquedos de plástico dos anos 70. E
        é exatamente isso que o torna especial. Com CR 3, 59 HP e um
        multiattack de garra+bico que pode causar até 24 de dano em um turno,
        o Owlbear é a introdução perfeita ao conceito de {"\u201C"}monstro que não
        negocia{"\u201D"}.
      </P>
      <H3>Por que funciona tão bem</H3>
      <Ul>
        <Li>É puro instinto: sem magias, sem habilidades especiais, sem planos — só fúria</Li>
        <Li>Excelente para forçar decisões: lutar, fugir ou tentar acalmar a fera?</Li>
        <Li>A descrição visual é inesquecível — cabeça de coruja no corpo de urso</Li>
        <Li>Funciona como encontro aleatório, guardião de covil ou {"\u201C"}o que acordou na caverna{"\u201D"}</Li>
      </Ul>
      <Tip>
        O Owlbear é territorial, não malvado. Ele ataca quem entra no seu
        território e persegue até perder interesse ou ficar gravemente ferido.{" "}
        <ExtLink href="https://www.themonstersknow.com/owlbear-tactics/">Segundo a análise do The Monsters Know</ExtLink>,
        o Owlbear vai correr atrás do alvo mais próximo até derrubá-lo,
        depois pular pro seguinte. Use isso — faça ele ignorar o
        tanque que bloqueia o caminho e correr direto pro bardo que
        tropeçou nos arbustos.
      </Tip>
      <P>
        Veja a ficha completa:{" "}
        <a href="/monstros/urso-coruja">Owlbear no Compêndio</a>.
      </P>

      {/* ── 4. MIMIC ──────────────────────────────────────────────── */}
      <H2>4. Mimic — O Combustível de Paranoia</H2>
      <P>
        O Mimic é um dos monstros mais elegantes do D&D. Com CR 2, ele se
        disfarça como um objeto mundano — um baú, uma porta, uma
        estante — e ataca quando alguém toca nele. Sua existência muda
        fundamentalmente o comportamento dos jogadores: depois do primeiro
        encontro com um Mimic, <em>todo</em> baú se torna suspeito. E isso,
        como mestre, é ouro puro.
      </P>
      <H3>O impacto real do Mimic</H3>
      <Ul>
        <Li>Cria tensão em ambientes de exploração sem precisar de combate constante</Li>
        <Li>Ensina jogadores a investigar antes de agir — hábito que melhora toda a campanha</Li>
        <Li>O efeito Adhesive gruda o alvo ao Mimic, criando pânico imediato</Li>
        <Li>Versatilidade de forma: pode ser qualquer objeto, em qualquer dungeon</Li>
      </Ul>
      <Tip>
        O segredo do Mimic é o setup. Descreva três baús normais com
        tesouro real nas sessões anteriores. Na quarta vez, quando o
        jogador disser {"\u201C"}abro o baú{"\u201D"} sem pensar duas vezes, revele
        que o baú morde de volta. O Mimic funciona como predador emboscador
        — ele ataca o primeiro alvo e se agarra. Se o grupo todo
        reagir, ele larga e foge (Mimics são mais espertos do que parecem).
      </Tip>
      <P>
        Veja a ficha completa:{" "}
        <a href="/monstros/mimico">Mimic no Compêndio</a>.
      </P>

      {/* ── 5. BASILISK ───────────────────────────────────────────── */}
      <H2>5. Basilisk — A Petrificação Dramática</H2>
      <P>
        Existe algo especialmente visceral na petrificação. Diferente de dano
        de HP que se cura com uma poção, virar pedra é <em>permanente</em> sem
        a magia certa. O Basilisk (CR 3) entrega exatamente essa ameaça: seu
        olhar petrificante força um teste de resistência de Constituição CD 12,
        e falhar em dois turnos seguidos significa estátua. Não é letal no
        sentido tradicional — é pior.
      </P>
      <H3>Quando brilha</H3>
      <Ul>
        <Li>Cavernas e ruínas subterrâneas com estátuas {"\u201C"}decorativas{"\u201D"} que são aventureiros anteriores</Li>
        <Li>Como guardião de tesouros — alguém colocou esse basilisco ali de propósito</Li>
        <Li>Ensina jogadores sobre condições além de dano: desviar o olhar, espelhos, estratégia</Li>
        <Li>Funciona como puzzle de combate: como derrotar algo que você não pode olhar?</Li>
      </Ul>
      <Tip>
        A mecânica de desviar o olhar é central. O jogador pode escolher
        não olhar para o Basilisk (evitando o olhar petrificante), mas
        ataques contra ele terão desvantagem. Isso cria uma escolha
        tática genuína em cada turno. Coloque espelhos quebrados na sala
        como pista — e recompense jogadores criativos que tentarem
        refletir o olhar.
      </Tip>
      <P>
        Veja a ficha completa:{" "}
        <a href="/monstros/basilisco">Basilisk no Compêndio</a>.
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
        <Li>24 espinhos na cauda, recarregando entre descansos — munição é finita, o que cria urgência</Li>
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
        <a href="/monstros/manticora">Manticore no Compêndio</a>.
      </P>

      {/* ── 7. YOUNG GREEN DRAGON ─────────────────────────────────── */}
      <H2>7. Young Green Dragon — O Dragão Político</H2>
      <P>
        Todos os dragões são ameaças formidáveis, mas o Green Dragon
        (Dragão Verde) é especial porque sua arma mais perigosa não é o
        sopro venenoso — é a mente. Dragões verdes são manipuladores,
        mentirosos e pacientes. O Young Green Dragon (CR 8) é forte o
        suficiente para ser um vilão de arco inteiro, mas inteligente o
        suficiente para nunca precisar lutar.
      </P>
      <H3>Por que o dragão verde é o melhor primeiro dragão</H3>
      <Ul>
        <Li>CR 8 é acessível para grupos de nível 5-7 — o sweet spot de muitas campanhas</Li>
        <Li>Sopro venenoso em cone de 30 pés: 12d6 de dano, devastador em áreas fechadas</Li>
        <Li>Anfíbio e pode respirar embaixo d{"'"}água — táticas de fuga inesperadas</Li>
        <Li>Pode ser patrono, informante, chantagista ou vilão — raramente {"\u201C"}só um monstro{"\u201D"}</Li>
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
        <a href="/monstros/dragao-verde-jovem">Young Green Dragon no Compêndio</a>.
      </P>

      {/* ── 8. MIND FLAYER ────────────────────────────────────────── */}
      <H2>8. Mind Flayer — Horror e Psionismo</H2>
      <P>
        Poucos monstros geram tanto medo em jogadores experientes quanto o
        Mind Flayer (Devorador de Mentes). CR 7 não parece muito no papel, mas
        o Mind Blast — um cone de 60 pés que causa 4d8+4 de dano psíquico
        e atordoa quem falhar no teste — pode acabar com um encontro em
        um único turno. Jogadores atordoados não agem, não reagem e falham
        automaticamente em testes de Força e Destreza. Enquanto isso, o Mind
        Flayer caminha até alguém e tenta extrair o cérebro.
      </P>
      <H3>O que faz dele inesquecível</H3>
      <Ul>
        <Li>O Mind Blast atordoa múltiplos alvos — é o grande equalizador contra grupos poderosos</Li>
        <Li>Extract Brain mata instantaneamente criaturas incapacitadas — morte permanente, sem death saves</Li>
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
        um disparando um raio diferente — desintegração, petrificação,
        charme, medo, telecinesia, entre outros. Com CR 13, é um boss fight
        de campanha inteira. E o mais impressionante: sua habilidade
        Antimagic Cone anula toda magia num cone de 150 pés na direção que
        ele olha, forçando casters a repensar suas estratégias.
      </P>
      <H3>Por que é o boss definitivo</H3>
      <Ul>
        <Li>10 raios oculares com efeitos diferentes — cada turno é imprevisível</Li>
        <Li>Antimagic Cone desliga magias, itens mágicos e concentração — terrível para casters</Li>
        <Li>Lair Actions tornam o covil tão perigoso quanto a criatura: limo no chão, tentáculos nas paredes</Li>
        <Li>Paranoico e megalomaníaco — o roleplay de um Beholder escreve a aventura sozinho</Li>
      </Ul>
      <Tip>
        <ExtLink href="https://www.themonstersknow.com/beholder-tactics/">Segundo a análise do The Monsters Know</ExtLink>,
        Beholders são agressivos e antissociais — atacam invasores
        imediatamente. O Beholder aponta o Antimagic Cone para onde estão
        os casters e usa os raios dos pedúnculos contra os marciais. Rode
        o covil com as Lair Actions: chão escorregadio, olhos nas paredes,
        apêndices que agarram. O grupo precisa se dividir para vencer
        — e dividir o grupo contra um Beholder é aterrorizante.
      </Tip>

      {/* ── 10. LICH ──────────────────────────────────────────────── */}
      <H2>10. Lich — O Vilão Definitivo</H2>
      <P>
        Se o Beholder é o boss de uma dungeon, o Lich é o vilão de uma
        campanha inteira. Um mago que transcendeu a morte através de um
        phylactery, o Lich (CR 21) tem acesso a magias de até 9º nível,
        Legendary Resistance (3/dia), Legendary Actions e um covil com
        efeitos devastadores. Derrotá-lo em combate é apenas metade da
        batalha — se o phylactery não for destruído, ele retorna em
        1d10 dias com HP completo.
      </P>
      <H3>O que torna o Lich inigualável</H3>
      <Ul>
        <Li>Spellcasting de 18º nível: Power Word Kill, Disintegrate, Globe of Invulnerability</Li>
        <Li>Legendary Resistance garante que ele não morra para um único Banishment bem sucedido</Li>
        <Li>O phylactery cria uma quest dentro da quest — encontrá-lo e destruí-lo é uma aventura à parte</Li>
        <Li>Lair Actions que drenam vida, invocam espíritos e conectam-se telepaticamente a intrusos</Li>
        <Li>Funciona como BBEG de campanha, patrono traiçoeiro ou ameaça ancestral adormecida</Li>
      </Ul>
      <Tip>
        <ExtLink href="https://www.themonstersknow.com/undead-tactics-liches/">Keith Ammann argumenta</ExtLink>{" "}
        que um Lich nunca sai do seu covil a menos que seja absolutamente
        necessário. Toda interação com os jogadores acontece através de
        lacaios, ilusões e manipulação política. Quando o grupo finalmente
        chega ao covil, o Lich já sabe tudo sobre eles. Rode o Lich como
        alguém que teve <em>séculos</em> para se preparar — porque teve.
        Ele sabe as magias do mago, as fraquezas do paladino e a
        identidade do assassino disfarçado.
      </Tip>
      <P>
        Veja a ficha completa:{" "}
        <a href="/monstros/lich">Lich no Compêndio</a>.
      </P>

      {/* ── CONCLUSÃO & DICAS GERAIS ──────────────────────────────── */}
      <H2>Como Tirar o Máximo desses Monstros</H2>
      <P>
        Ter a lista é o primeiro passo. Mas usar esses monstros de forma
        eficiente exige algumas práticas que separam uma sessão boa de uma
        sessão <em>inesquecível</em>.
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
        mantém HP, condições, ordem de iniciativa e stat blocks organizados
        — para que você possa focar na narrativa em vez de consultar
        tabelas.
      </P>

      <CTA />

      <H2>Referências e Leitura Adicional</H2>
      <Ul>
        <Li>
          <ExtLink href="https://www.themonstersknow.com/">The Monsters Know What They{"'"}re Doing</ExtLink>{" "}
          — Análises táticas detalhadas para centenas de monstros do D&D 5e
        </Li>
        <Li>
          <ExtLink href="https://slyflourish.com/making_monsters_interesting.html">Making Monsters Interesting (Sly Flourish)</ExtLink>{" "}
          — Como customizar e dar personalidade a qualquer monstro
        </Li>
        <Li>
          <ExtLink href="https://slyflourish.com/choosing_monsters.html">Choosing Monsters for Your Game (Sly Flourish)</ExtLink>{" "}
          — Filosofia de seleção de monstros baseada na história
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
        Boas sessões começam com bons monstros — e agora você tem dez dos
        melhores no seu arsenal.
      </P>

      <CTA />
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
        Você leu o Livro do Jogador, assistiu sessões no YouTube, montou uma ficha
        de personagem e agora alguém precisa sentar atrás do escudo do mestre.
        Talvez ninguém do grupo tenha se voluntariado. Talvez tenha sido você mesmo
        que sentiu a vontade. De qualquer forma, a pergunta é a mesma:{" "}
        <strong>como mestrar D&amp;D pela primeira vez sem travar, sem esquecer
        metade das regras e sem que a sessão vire um desastre?</strong>
      </P>
      <P>
        A boa notícia: mestrar é mais fácil do que parece. Milhares de mestres
        iniciantes rodam ótimas sessões toda semana, e a grande maioria aprendeu
        fazendo. Este guia reúne conselhos práticos de referências como{" "}
        <ExtLink href="https://slyflourish.com/lazydm/">Sly Flourish</ExtLink>,{" "}
        <ExtLink href="https://mcdm.fandom.com/wiki/Running_the_Game">Matt Colville</ExtLink> e{" "}
        <ExtLink href="https://thealexandrian.net/gamemastery-101">The Alexandrian</ExtLink>{" "}
        para te ajudar a preparar e rodar sua primeira sessão com confiança.
      </P>

      <H2>O que o Mestre realmente faz?</H2>
      <P>
        Se você já jogou como jogador, sabe que o mestre descreve o mundo, interpreta
        os NPCs e arbitra as regras. Mas o papel vai além disso. O mestre é o{" "}
        <strong>facilitador da diversão</strong>. Seu trabalho não é contar uma história
        perfeita — é criar situações interessantes e deixar os jogadores reagirem a
        elas. Como Matt Colville costuma dizer: o DM cria o cenário, mas são os
        jogadores que escrevem a história.
      </P>
      <P>
        Na prática, suas responsabilidades incluem:
      </P>
      <Ul>
        <Li>
          <strong>Preparar o cenário</strong> — criar ou adaptar a aventura, definir
          NPCs, monstros e locais que os jogadores vão encontrar.
        </Li>
        <Li>
          <strong>Narrar e reagir</strong> — descrever o que os personagens veem,
          ouvem e sentem, e responder às ações deles de forma coerente.
        </Li>
        <Li>
          <strong>Arbitrar regras</strong> — decidir quando rolar dados, qual teste
          usar e o que acontece em caso de sucesso ou falha.
        </Li>
        <Li>
          <strong>Gerenciar o combate</strong> — controlar iniciativa, HP dos monstros,
          condições e turnos. Esta é a parte mais mecânica e onde ferramentas como
          o <a href="/try">Pocket DM</a> fazem a maior diferença.
        </Li>
        <Li>
          <strong>Garantir que todo mundo se divirta</strong> — inclusive você. Se
          o mestre não está curtindo, a mesa sente.
        </Li>
      </Ul>

      <Tip>
        Você não precisa ser ator, escritor ou ter decorado o Livro do Mestre inteiro.
        Precisa de uma aventura simples, um punhado de monstros e vontade de
        improvisar. O resto vem com a prática.
      </Tip>

      <H2>Preparação: o método do Mestre Preguiçoso</H2>
      <P>
        O maior erro de mestres iniciantes é preparar demais. Você gasta horas
        escrevendo diálogos, desenhando mapas e planejando cada encontro — e na
        hora da sessão, os jogadores vão para o lado oposto do que você imaginou.
        Toda aquela preparação vira desperdício.
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
        — e é o passo mais impactante da preparação.
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
        aparecer em qualquer lugar — num livro, na conversa com um NPC, ou no bolso
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
        não precisa decorar — basta ter acesso rápido. Um{" "}
        <a href="/monstros">bestiário digital</a> resolve isso: busque o monstro
        por nome, veja HP, CA e ataques. A{" "}
        <a href="/calculadora-encontro">calculadora de encontros</a> ajuda a
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

      <H2>Gerenciando combate sem travar</H2>
      <P>
        O combate é onde mestres iniciantes mais travam. São muitas regras
        simultâneas: iniciativa, ataques, dano, magias, condições, reações,
        ataques de oportunidade. A boa notícia é que você não precisa lembrar
        de tudo — precisa de um sistema que lembre por você.
      </P>

      <H3>Passo 1: Iniciativa e ordem de turnos</H3>
      <P>
        Peça para cada jogador rolar iniciativa (d20 + modificador de Destreza)
        e anote os resultados. Ordene do maior para o menor. Num{" "}
        <a href="/try">combat tracker como o Pocket DM</a>, você adiciona os
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
        <a href="/condicoes">condições ativas</a> (envenenado, atordoado, caído).
        Esquecer uma condição é um dos erros mais comuns e pode mudar o resultado
        de um combate inteiro. Usar uma ferramenta digital para isso elimina o
        problema — o tracker mostra visualmente quem está com qual condição.
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
        Encerre combates que já perderam a tensão — seus jogadores vão agradecer.
      </Tip>

      <H2>A arte da improvisação</H2>
      <P>
        Não importa o quanto você prepare: os jogadores vão fazer algo
        inesperado. Isso não é um problema — <strong>é o melhor do RPG</strong>.
        Improvisação não é inventar coisas do nada; é reagir de forma criativa
        ao inesperado usando os elementos que você já preparou.
      </P>

      <H3>Diga "sim, e..." ou "sim, mas..."</H3>
      <P>
        Quando um jogador tenta algo criativo, não diga "não" automaticamente.
        "Sim, você consegue subir no lustre — mas precisa de um teste de
        Acrobacia" mantém a ação fluindo e recompensa a criatividade. Reserve o
        "não" para coisas que quebram completamente a lógica do mundo.
      </P>

      <H3>Use as pistas flutuantes</H3>
      <P>
        Lembra dos segredos e pistas que você preparou sem vincular a um local
        específico? É aqui que eles brilham. Os jogadores decidiram ir para a
        floresta em vez da caverna? Sem problema — a pista que estava na caverna
        agora está num tronco de árvore oco. A informação chega aos jogadores
        por outro caminho.
      </P>

      <H3>Não tem resposta? Peça um teste</H3>
      <P>
        Se um jogador pergunta algo que você não preparou, peça um teste de
        habilidade. O resultado te dá tempo de pensar: "Você rola Investigação...
        17? Ok, você percebe que..." — esses dois segundos são suficientes para
        inventar algo coerente.
      </P>

      <Tip>
        Anote o que você improvisou durante a sessão. Aquela taverna que você
        inventou na hora? O nome do NPC que saiu do nada? Escreva tudo depois da
        sessão. Essas anotações viram o material mais rico para as próximas sessões.
      </Tip>

      <H2>Erros comuns de mestres iniciantes</H2>
      <P>
        Todo mestre passa por esses erros. Reconhecê-los é metade do caminho
        para evitá-los:
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
        e incentivos — não force a barra. Trilhos invisíveis são aceitáveis;
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
        <a href="/calculadora-encontro">calculadora de encontros</a> para ter
        uma ideia da dificuldade antes da sessão. E lembre-se: você pode ajustar
        HP dos monstros durante o combate se perceber que errou a mão.
      </P>

      <H3>5. Esquecer que você também é jogador</H3>
      <P>
        Mestrar é trabalho, mas também é diversão. Se você está se sentindo
        sobrecarregado, simplifique. Use ferramentas que tirem peso de cima de
        você: um <a href="/try">combat tracker</a> para gerenciar combate, um{" "}
        <a href="/monstros">bestiário digital</a> para consultar stats, um{" "}
        <a href="/magias">oráculo de magias</a> para resolver dúvidas dos
        jogadores. Quanto menos tempo você gasta com burocracia mecânica, mais
        tempo sobra para narrar, interpretar e se divertir.
      </P>

      <H2>Ferramentas que ajudam o mestre iniciante</H2>
      <P>
        Você não precisa mestrar com caneta e papel se não quiser. Ferramentas
        digitais existem para simplificar a parte mecânica e te deixar focar no
        que importa: a narrativa e a diversão.
      </P>
      <Ul>
        <Li>
          <strong>Combat tracker</strong> — gerencia iniciativa, HP, condições e
          turnos. O <a href="/try">Pocket DM</a> é gratuito, funciona no celular
          e não exige que seus jogadores criem conta.
        </Li>
        <Li>
          <strong>Bestiário digital</strong> — consulte stats de{" "}
          <a href="/monstros">monstros SRD</a> instantaneamente em vez de
          folhear o livro.
        </Li>
        <Li>
          <strong>Oráculo de magias</strong> — quando o jogador perguntar "o que
          Fireball faz mesmo?", basta buscar em{" "}
          <a href="/magias">magias</a> e ler a descrição em segundos.
        </Li>
        <Li>
          <strong>Calculadora de encontros</strong> — use a{" "}
          <a href="/calculadora-encontro">calculadora</a> para verificar se o
          combate que você planejou está no nível certo de dificuldade.
        </Li>
        <Li>
          <strong>Referência de condições</strong> — tenha a lista de{" "}
          <a href="/condicoes">condições do D&amp;D 5e</a> sempre à mão para
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
          <strong>Peça feedback</strong> — pergunte aos jogadores o que curtiram
          e o que pode melhorar. Seja específico: "O combate estava longo demais?"
          é melhor que "O que vocês acharam?"
        </Li>
        <Li>
          <strong>Anote o que aconteceu</strong> — decisões dos jogadores, NPCs
          que apareceram, ganchos que ficaram abertos. Essas notas são ouro para
          a próxima sessão.
        </Li>
        <Li>
          <strong>Não se cobre demais</strong> — sua primeira sessão não vai ser
          perfeita. Nem a décima. E tudo bem. Mestrar é uma habilidade que melhora
          com prática, não com perfeição.
        </Li>
        <Li>
          <strong>Estude um pouco</strong> — leia um artigo do{" "}
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
        lembre: seus jogadores não estão te avaliando — eles querem se
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

      <CTA />
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
        pedra. Ninguém precisa dizer que o lugar é perigoso — a música já contou.
        A trilha sonora certa transforma uma descrição verbal em algo que seus
        jogadores <em>sentem</em> na pele. E você não precisa ser DJ, ter
        equipamento caro ou gastar horas montando playlists para conseguir isso.
      </P>
      <P>
        Neste guia, vou compartilhar tudo que aprendi usando música ambiente para
        RPG nas minhas próprias sessões de D&D 5e — desde os erros de iniciante
        (spoiler: colocar a batalha de Pelennor Fields durante uma conversa na
        taverna é uma péssima ideia) até o setup que uso hoje, que leva menos de
        5 minutos para preparar e funciona em qualquer mesa presencial.
      </P>

      <H2>Por Que Música Importa na Sua Mesa de RPG?</H2>
      <P>
        O blog{" "}
        <ExtLink href="https://slyflourish.com/three_ways_to_use_music_in_your_game.html">
          Sly Flourish
        </ExtLink>{" "}
        — uma das maiores referências mundiais para mestres de D&D — destaca
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
        funciona como um <strong>sinal emocional</strong> — quando a trilha muda
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

      <H2>Os Três Pilares: Organize Sua Trilha em Categorias</H2>
      <P>
        A dica mais prática que posso dar é: não tente ter uma trilha para cada
        cena específica. Em vez disso, monte{" "}
        <strong>três playlists base</strong> que cobrem 90% de tudo que acontece
        numa sessão. Essa abordagem vem diretamente do Sly Flourish e funciona
        incrivelmente bem:
      </P>

      <H3>1. Exploração e Viagem</H3>
      <P>
        Trilhas calmas, instrumentais, com bastante espaço sonoro. Pense em
        caminhadas por florestas, navegação, vilas pacatas, acampamentos
        noturnos. O objetivo aqui é criar uma base suave que não compete com a
        sua narração. Trilhas sonoras de jogos como <em>The Elder Scrolls:
        Skyrim</em>, <em>The Witcher 3</em> e <em>Breath of the Wild</em> são
        perfeitas para isso.
      </P>
      <Ul>
        <Li>Instrumentos: cordas, flauta, piano, harpa</Li>
        <Li>Andamento: lento a moderado</Li>
        <Li>Volume: baixo — como um murmúrio de fundo</Li>
      </Ul>

      <H3>2. Tensão e Mistério</H3>
      <P>
        Sons sombrios, drones graves, cordas dissonantes. Use quando o grupo
        entra em dungeons, investiga um crime, ou quando algo sinistro está
        prestes a acontecer. A ideia é criar desconforto sutil — sem jump
        scares, sem sustos, apenas aquela sensação de "tem algo errado aqui".
        Trilhas de <em>Dark Souls</em>, <em>Bloodborne</em> e filmes de terror
        atmosférico funcionam bem.
      </P>
      <Ul>
        <Li>Instrumentos: cello grave, coros distantes, sons ambientes (vento, goteiras, correntes)</Li>
        <Li>Andamento: muito lento ou estático</Li>
        <Li>Volume: baixo a médio — deixe os silêncios trabalharem</Li>
      </Ul>

      <H3>3. Combate e Ação</H3>
      <P>
        Aqui é onde a música pode brilhar mais. Percussão pesada, metais
        épicos, ritmo acelerado. A trilha de combate precisa ter energia sem
        ter letra — músicas com vocal distraem porque o mestre está falando
        o tempo todo. Trilhas de <em>Two Steps from Hell</em>,{" "}
        <em>Immediate Music</em> e os combates de <em>God of War</em> são
        referências clássicas.
      </P>
      <Ul>
        <Li>Instrumentos: percussão taiko, metais, cordas rápidas, coro épico</Li>
        <Li>Andamento: rápido e constante</Li>
        <Li>Volume: médio — alto o suficiente para sentir, baixo o suficiente para ouvir o mestre</Li>
      </Ul>

      <Tip>
        Comece sua sessão SEMPRE com a playlist de exploração. Ela é neutra o
        suficiente para qualquer situação inicial e dá tempo de você ajustar
        conforme a história se desenvolve. Trocar da exploração para o combate
        na hora certa é um dos momentos mais satisfatórios da mesa.
      </Tip>

      <H2>Trilhas Para Cenas Específicas</H2>
      <P>
        Além dos três pilares, vale ter algumas trilhas extras para momentos
        recorrentes:
      </P>

      <H3>Taverna e Cidade</H3>
      <P>
        Alaúde, violão medieval, percussão leve, risadas abafadas ao fundo.
        O Spotify tem playlists excelentes como{" "}
        <ExtLink href="https://open.spotify.com/playlist/7qkvzGNxLuxo4O2YBzWpnm">
          Tavern Ambient | Medieval Fantasy
        </ExtLink>{" "}
        com mais de 80 faixas curadas. Quando os jogadores ouvem aquela
        música, já sabem: é hora de roleplay, compras e fofoca na taverna.
      </P>

      <H3>Boss Fight</H3>
      <P>
        A boss fight merece uma trilha diferente do combate comum. Algo mais
        grandioso, mais ameaçador, com mais camadas. Coros operáticos, breaks
        dramáticos, mudanças de intensidade. As trilhas de bosses de{" "}
        <em>Dark Souls III</em> e <em>Final Fantasy XIV</em> são
        espetaculares para isso. Reserve uma playlist separada e use só para
        o confronto final — isso cria uma sensação de "essa luta é diferente"
        que seus jogadores vão adorar.
      </P>

      <H3>Momentos Emocionais</H3>
      <P>
        A morte de um NPC querido, a revelação de uma traição, o reencontro
        após uma jornada longa. Para esses momentos, piano solo ou cordas
        delicadas funcionam melhor que qualquer orquestra. Menos é mais.
        Trilhas de <em>Journey</em>, <em>Ori and the Blind Forest</em> e{" "}
        <em>Spirited Away</em> são ouro puro aqui.
      </P>

      <H2>Fontes Gratuitas: Onde Encontrar Música para RPG</H2>
      <P>
        Você não precisa gastar nada para ter uma trilha sonora incrível.
        Estas são as melhores fontes gratuitas que eu uso e recomendo:
      </P>

      <H3>Tabletop Audio</H3>
      <P>
        O{" "}
        <ExtLink href="https://tabletopaudio.com">
          Tabletop Audio
        </ExtLink>{" "}
        é simplesmente a melhor fonte gratuita de ambientação sonora para RPG.
        Ganhador de três ENnie Awards, o site oferece dezenas de ambientes de
        10 minutos — desde "Dungeon I" e "Dark Forest" até "Tavern" e
        "Starship Bridge". Tudo produzido profissionalmente, sem propagandas,
        e licenciado sob Creative Commons. O SoundPad deles permite até misturar
        efeitos sonoros em tempo real, criando paisagens sonoras customizadas.
      </P>

      <H3>YouTube: Canais Especializados</H3>
      <P>
        O YouTube é uma mina de ouro para música ambiente de RPG. Estes canais
        são os que mais uso:
      </P>
      <Ul>
        <Li>
          <strong>Michael Ghelfi Studios</strong> — O maior criador de áudio
          para TTRPG do mundo, com mais de 5.000 faixas e 160 mil inscritos.
          Tem ambientes para literalmente qualquer cena que você imaginar.
          Vencedor de ENnie Award.
        </Li>
        <Li>
          <strong>Bardify</strong> — Focado especificamente em D&D, com
          playlists organizadas por situação: viagem, cidade, dungeon,
          combate. Excelente curadoria.
        </Li>
        <Li>
          <strong>Sword Coast Soundscapes</strong> — Ambientes sonoros
          baseados em locais canônicos de D&D como a Sword Coast, Underdark e
          Waterdeep. Perfeito se você joga nos Reinos Esquecidos.
        </Li>
        <Li>
          <strong>The Guild of Ambience</strong> — Vídeos de 1 a 3 horas com
          arte belíssima e paisagens sonoras imersivas. Ideal para deixar
          rodando durante a sessão inteira.
        </Li>
      </Ul>

      <H3>Spotify: Playlists Prontas</H3>
      <P>
        Se você já usa Spotify, a solução mais rápida é buscar playlists
        curadas. A coleção do{" "}
        <ExtLink href="https://www.michaelghelfistudios.com/spotify-playlists/">
          Michael Ghelfi Studios no Spotify
        </ExtLink>{" "}
        é a mais completa que eu conheço — com playlists separadas para
        taverna, combate, exploração, mistério, mar, deserto, e muito mais.
        O usuário <em>Ouranio Recordings</em> também tem uma playlist de
        background para D&D com mais de 500 faixas e 54 mil saves.
      </P>

      <Tip>
        Baixe suas playlists favoritas para uso offline. Nada quebra mais a
        imersão do que um anúncio do Spotify Premium no meio de um combate
        épico contra um dragão. Se usa a versão gratuita, considere o YouTube
        com bloqueador de anúncios ou o Tabletop Audio, que é 100% sem ads.
      </Tip>

      <H2>Ferramentas Pagas: Quando Vale o Investimento</H2>

      <H3>Syrinscape</H3>
      <P>
        O{" "}
        <ExtLink href="https://syrinscape.com">
          Syrinscape
        </ExtLink>{" "}
        é a ferramenta profissional mais popular para áudio de RPG. Diferente
        de uma playlist, ele funciona como um motor de paisagem sonora — você
        ativa um "soundset" e ele mistura música, efeitos ambientes e sons
        pontuais (espadas, rugidos, trovões) em tempo real. A versão gratuita
        oferece uma biblioteca inicial de ambientes, e a assinatura SuperSyrin
        (US$ 12,99/mês) desbloqueia milhares de soundsets e permite criar os
        seus próprios. Ideal para mestres que querem o máximo de imersão
        sonora e não se importam de investir.
      </P>

      <H3>Michael Ghelfi Studios (Patreon)</H3>
      <P>
        Se você já usa o conteúdo gratuito do Michael Ghelfi no YouTube e
        quer mais, o Patreon dele oferece acesso a quase 400 faixas exclusivas,
        além de loops curtos perfeitos para soundboards. É uma opção mais
        acessível que o Syrinscape e com qualidade excepcional.
      </P>

      <H2>O Setup Prático: Como Usar na Mesa</H2>
      <P>
        A teoria é bonita, mas o que importa é como colocar em prática sem
        complicar sua vida de mestre. Aqui está o setup que recomendo:
      </P>

      <H3>Equipamento Mínimo</H3>
      <Ul>
        <Li>
          Uma <strong>caixa de som Bluetooth</strong> pequena (JBL Clip, Anker
          Soundcore ou similar) — posicione no centro da mesa ou perto de
          você
        </Li>
        <Li>
          Seu <strong>celular ou tablet</strong> com as playlists preparadas
          — separado do dispositivo que você usa para mestrar
        </Li>
        <Li>
          Alternativamente, use o <strong>próprio notebook</strong> onde
          roda seu combat tracker, com o volume ajustado independentemente
        </Li>
      </Ul>

      <H3>Fluxo Durante a Sessão</H3>
      <Ul>
        <Li>
          <strong>Pré-sessão:</strong> coloque a playlist de exploração/taverna
          enquanto os jogadores chegam e se acomodam. Isso já cria clima.
        </Li>
        <Li>
          <strong>Transições:</strong> troque de playlist quando a cena mudar.
          Exploração {"->"} tensão {"->"} combate. Faça a troca com calma, sem pressa.
        </Li>
        <Li>
          <strong>Pós-combate:</strong> volte para exploração ou coloque algo
          heroico/melancólico dependendo do resultado. Não deixe a trilha de
          combate tocando depois que a luta acabou.
        </Li>
      </Ul>

      <Tip>
        O Pocket DM tem um recurso de soundboard integrado que permite
        controlar ambientação sonora direto da mesma tela onde você gerencia
        o combate. Sem trocar de app, sem perder o foco — tudo num lugar só.
        Ideal para mestres que não querem ficar malabarando entre abas e
        aplicativos durante a sessão.
      </Tip>

      <H2>Volume: A Regra de Ouro</H2>
      <P>
        O erro número um de todo mestre que começa a usar música é colocar
        volume alto demais. A regra é simples:{" "}
        <strong>
          se você precisa levantar a voz para ser ouvido acima da música,
          está alto demais
        </strong>
        . A música deve ser uma camada de fundo — presente, mas nunca
        competindo com as vozes na mesa.
      </P>
      <Ul>
        <Li>
          <strong>Exploração e roleplay:</strong> volume em ~20-25% do máximo
          da caixa de som
        </Li>
        <Li>
          <strong>Tensão e mistério:</strong> volume em ~15-20% — aqui o
          silêncio relativo é seu aliado
        </Li>
        <Li>
          <strong>Combate:</strong> volume em ~30-35% — pode ser um pouco
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

      <H2>Quando NÃO Usar Música</H2>
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

      <H2>Checklist Rápido: Música para Sua Próxima Sessão</H2>
      <P>
        Se você nunca usou música na mesa e quer começar hoje, siga este
        passo a passo mínimo:
      </P>
      <Ul>
        <Li>
          Acesse o{" "}
          <ExtLink href="https://tabletopaudio.com">Tabletop Audio</ExtLink>{" "}
          e marque 3 ambientes: um de taverna, um de floresta/dungeon, um de
          combate
        </Li>
        <Li>
          No YouTube, busque "D&D combat music 1 hour" e salve um vídeo
        </Li>
        <Li>
          Separe uma caixa de som ou use os alto-falantes do notebook
        </Li>
        <Li>
          Comece a sessão com o ambiente de taverna no volume mais baixo
          possível
        </Li>
        <Li>
          Quando o combate começar, troque para a trilha de combate e suba
          levemente o volume
        </Li>
        <Li>
          Pronto — você acabou de usar música ambiente pela primeira vez.
          Refine nas próximas sessões.
        </Li>
      </Ul>

      <H2>Conclusão</H2>
      <P>
        Música ambiente para RPG não precisa ser complicada. Com três playlists
        base, uma caixa de som barata e a consciência de quando subir, baixar
        ou pausar a trilha, você adiciona uma camada de imersão que seus
        jogadores vão lembrar por muito tempo. Comece simples, experimente, e
        aos poucos descubra o estilo sonoro da <em>sua</em> mesa.
      </P>
      <P>
        E se você quer uma ferramenta que integra combate e ambientação
        sonora num só lugar, experimente o{" "}
        <ProdLink href="/try">Pocket DM</ProdLink> — combat tracker
        gratuito para D&D 5e com soundboard embutido, ideal para mestres
        que jogam presencialmente. Confira também nosso guia sobre{" "}
        <IntLink slug="ferramentas-essenciais-mestre-dnd-5e">
          ferramentas essenciais para mestres
        </IntLink>{" "}
        e as{" "}
        <IntLink slug="como-agilizar-combate-dnd-5e">
          10 dicas para agilizar o combate
        </IntLink>.
      </P>

      <CTA />
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
        Uma das decisões mais fundamentais que um mestre de D&D 5e precisa tomar
        é como representar o combate na mesa: teatro da mente ou grid com
        miniaturas? Ambos os estilos são perfeitamente válidos — o próprio
        D&D 5e foi projetado para funcionar com qualquer abordagem. Mas cada um
        tem vantagens, limitações e situações onde brilha mais. Neste guia,
        vamos comparar os dois estilos, explorar a abordagem híbrida de zonas,
        e ajudar você a decidir qual funciona melhor para sua mesa.
      </P>
      <P>
        E o melhor: o{" "}
        <Link href="/try" className="text-gold underline underline-offset-2 decoration-gold/30 hover:text-gold hover:decoration-gold/60 transition-colors">
          Pocket DM
        </Link>{" "}
        funciona perfeitamente com qualquer estilo de combate. Ele rastreia
        iniciativa, HP e condições independente de como você representa o campo
        de batalha.
      </P>

      <H2>O Que É Teatro da Mente?</H2>
      <P>
        No teatro da mente (<em>Theater of the Mind</em>, ou TotM), o combate
        acontece inteiramente na imaginação dos jogadores e do mestre. Não há
        mapa, grid ou miniaturas — o mestre descreve o ambiente verbalmente e os
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

      <H2>O Que É Combate com Grid?</H2>
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

      <H2>Comparação Direta</H2>
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
              <td className="py-2 px-4">Zero — é só começar</td>
              <td className="py-2 px-4">Requer mapa, tokens, setup</td>
            </tr>
            <tr className="border-b border-white/[0.05]">
              <td className="py-2 px-4 font-medium text-foreground/90">Velocidade</td>
              <td className="py-2 px-4">Turnos rápidos, menos contagem</td>
              <td className="py-2 px-4">Turnos mais lentos, mais preciso</td>
            </tr>
            <tr className="border-b border-white/[0.05]">
              <td className="py-2 px-4 font-medium text-foreground/90">Imersão</td>
              <td className="py-2 px-4">Alta — narrativa contínua</td>
              <td className="py-2 px-4">Visual — mapa cria cenário</td>
            </tr>
            <tr className="border-b border-white/[0.05]">
              <td className="py-2 px-4 font-medium text-foreground/90">Clareza tática</td>
              <td className="py-2 px-4">Ambígua — depende do mestre</td>
              <td className="py-2 px-4">Exata — posições definidas</td>
            </tr>
            <tr className="border-b border-white/[0.05]">
              <td className="py-2 px-4 font-medium text-foreground/90">Áreas de efeito</td>
              <td className="py-2 px-4">Estimativa do mestre</td>
              <td className="py-2 px-4">Precisa — contar quadrados</td>
            </tr>
            <tr className="border-b border-white/[0.05]">
              <td className="py-2 px-4 font-medium text-foreground/90">Custo</td>
              <td className="py-2 px-4">R$ 0</td>
              <td className="py-2 px-4">Variável (papel a miniaturas)</td>
            </tr>
            <tr className="border-b border-white/[0.05]">
              <td className="py-2 px-4 font-medium text-foreground/90">Criatividade</td>
              <td className="py-2 px-4">Alta — sem limites visuais</td>
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

      <H2>Prós do Teatro da Mente</H2>

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
        rios, pontes, prédios em colapso — qualquer coisa que a narrativa peça,
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

      <H2>Prós do Combate com Grid</H2>

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
        debate sobre quantos inimigos estão na área — é só contar os quadrados.
        Para mesas onde casters de área são comuns, o grid resolve muitos
        problemas.
      </P>

      <H3>Ataques de Oportunidade e Posicionamento</H3>
      <P>
        O sistema de D&D 5e tem regras específicas sobre engajamento e ataques de
        oportunidade baseados em distância de 5 pés. Com grid, essas regras
        funcionam perfeitamente. No TotM, o mestre precisa decidir caso a caso
        se um personagem provocou um ataque de oportunidade — e essa decisão nem
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

      <H2>Abordagem Híbrida: Zonas de Combate</H2>
      <P>
        E se existisse um meio-termo? Existe, e é cada vez mais popular: o
        combate baseado em <strong>zonas</strong>. Em vez de quadrados precisos,
        o campo de batalha é dividido em zonas abstratas — {'"'}entrada da
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
        zona pode ter propriedades — {'"'}cobertura parcial{'"'}, {'"'}terreno
        difícil{'"'}, {'"'}escuridão total{'"'} — que afetam mecanicamente
        quem está lá dentro.
      </P>

      <Tip>
        Para usar zonas, comece com 3 a 5 zonas por encontro. Escreva o nome de
        cada zona e uma propriedade especial (se houver). Desenhe setas
        conectando zonas adjacentes. Pronto — seu mapa de combate está feito em
        30 segundos.
      </Tip>

      <H2>Quando Usar Cada Estilo</H2>

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
        <Li>O grupo é misto — alguns querem tática, outros querem narrativa</Li>
      </Ul>

      <H2>Como o Pocket DM Funciona com Qualquer Estilo</H2>
      <P>
        O{" "}
        <Link href="/try" className="text-gold underline underline-offset-2 decoration-gold/30 hover:text-gold hover:decoration-gold/60 transition-colors">
          Pocket DM
        </Link>{" "}
        foi projetado como um <strong>combat tracker</strong>, não como um VTT.
        Isso significa que ele rastreia o que importa independente de como você
        representa o campo de batalha: iniciativa, HP, condições, ações
        lendárias e notas de monstros.
      </P>
      <Ul>
        <Li>
          <strong>Teatro da Mente:</strong> use o Pocket DM no celular ou tablet
          enquanto narra. Os jogadores não veem mapa nenhum — só a ordem de
          iniciativa compartilhada.
        </Li>
        <Li>
          <strong>Grid:</strong> use o Pocket DM no notebook ao lado do mapa
          físico. Ele gerencia os números enquanto você gerencia as posições.
        </Li>
        <Li>
          <strong>Zonas:</strong> perfeito para zonas — você pode anotar em qual
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
        no combate (e deveria!), o tracker aplica e rastreia automaticamente —
        algo que fica confuso no papel independente do estilo de combate.
      </P>

      <H2>Conclusão</H2>
      <P>
        Não existe estilo {'"'}certo{'"'} de combate no D&D 5e. Teatro da
        mente é rápido, imersivo e barato. Grid é preciso, visual e tátil.
        Zonas são o meio-termo elegante. A melhor abordagem é ser flexível: use
        TotM para encontros simples, grid para boss fights e zonas para tudo que
        fica no meio. Como{" "}
        <ExtLink href="https://theangrygm.com/fighting-with-your-voice-1/">
          The Angry GM argumenta
        </ExtLink>, o estilo de combate deve servir à experiência na mesa, não
        o contrário.
      </P>
      <P>
        Experimente os três. Pergunte aos seus jogadores o que preferem. E
        lembre-se: o que realmente importa é que todos na mesa estejam se
        divertindo — com ou sem miniaturas. Para manter o combate fluindo
        independente do estilo, experimente o{" "}
        <ProdLink href="/try">Pocket DM</ProdLink>{" "}
        — combat tracker gratuito para D&D 5e que funciona direto no navegador.
        E para mais dicas de combate, confira nosso guia de{" "}
        <IntLink slug="como-agilizar-combate-dnd-5e">
          como agilizar o combate
        </IntLink>{" "}
        e o comparativo{" "}
        <IntLink slug="combat-tracker-vs-vtt-diferenca">
          Combat Tracker vs VTT
        </IntLink>.
      </P>

      <CTA />
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Post 13 — Build: Half-Elf (Drow) Order Cleric 1 / Divine Soul Sorcerer — PT-BR
   ═══════════════════════════════════════════════════════════════ */
export function BlogPost13() {
  return (
    <>
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
        construído para ser a engrenagem invisível que faz a máquina funcionar —
        e uma das builds de suporte mais eficientes do D&amp;D 5e.
      </P>

      <H2>Resumo da Build</H2>

      <div className="overflow-x-auto mb-6">
        <table className="w-full text-sm text-foreground/80 border-collapse">
          <tbody>
            <tr className="border-b border-white/[0.06]">
              <td className="py-2 pr-4 font-semibold text-gold/80 whitespace-nowrap">Raça</td>
              <td className="py-2">Half-Elf (Drow)</td>
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
              <td className="py-2 pr-4 font-semibold text-gold/80 whitespace-nowrap">Feats</td>
              <td className="py-2">Resilient (CON), Fey Touched</td>
            </tr>
            <tr className="border-b border-white/[0.06]">
              <td className="py-2 pr-4 font-semibold text-gold/80 whitespace-nowrap">Metamagic</td>
              <td className="py-2">Extended Spell, Quickened Spell</td>
            </tr>
            <tr>
              <td className="py-2 pr-4 font-semibold text-gold/80 whitespace-nowrap">Dificuldade</td>
              <td className="py-2">Médio — exige conhecimento de sinergia e timing</td>
            </tr>
          </tbody>
        </table>
      </div>

      <H2>Atributos — Dados Rolados vs Point Buy</H2>

      <Tip>
        Esta build foi criada com dados rolados (4d6 drop lowest). Abaixo
        mostramos como reconstruí-la usando Point Buy para quem prefere um
        método padronizado. As prioridades de atributo se mantêm, com pequenos
        ajustes.
      </Tip>

      <H3>Comparação final (nível 10)</H3>

      <div className="overflow-x-auto mb-6">
        <table className="w-full text-sm text-foreground/80 border-collapse">
          <thead>
            <tr className="border-b border-gold/20 text-gold/70 text-xs uppercase tracking-wider">
              <th className="py-2 text-left">Atributo</th>
              <th className="py-2 text-center">Rolado</th>
              <th className="py-2 text-center">Point Buy</th>
              <th className="py-2 text-center">Diferença</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-white/[0.06]">
              <td className="py-2 font-semibold">STR</td>
              <td className="py-2 text-center">10</td>
              <td className="py-2 text-center">8</td>
              <td className="py-2 text-center text-red-400/70">&minus;2</td>
            </tr>
            <tr className="border-b border-white/[0.06]">
              <td className="py-2 font-semibold">DEX</td>
              <td className="py-2 text-center">14</td>
              <td className="py-2 text-center">14</td>
              <td className="py-2 text-center text-green-400/70">0</td>
            </tr>
            <tr className="border-b border-white/[0.06]">
              <td className="py-2 font-semibold">CON</td>
              <td className="py-2 text-center">18 → 19*</td>
              <td className="py-2 text-center">16 → 17*</td>
              <td className="py-2 text-center text-red-400/70">&minus;2</td>
            </tr>
            <tr className="border-b border-white/[0.06]">
              <td className="py-2 font-semibold">INT</td>
              <td className="py-2 text-center">8</td>
              <td className="py-2 text-center">9</td>
              <td className="py-2 text-center text-green-400/70">+1</td>
            </tr>
            <tr className="border-b border-white/[0.06]">
              <td className="py-2 font-semibold">WIS</td>
              <td className="py-2 text-center">14&dagger;</td>
              <td className="py-2 text-center">14&dagger;</td>
              <td className="py-2 text-center text-green-400/70">0</td>
            </tr>
            <tr>
              <td className="py-2 font-semibold">CHA</td>
              <td className="py-2 text-center">18&Dagger;</td>
              <td className="py-2 text-center">18&Dagger;</td>
              <td className="py-2 text-center text-green-400/70">0</td>
            </tr>
          </tbody>
        </table>
        <p className="text-xs text-muted-foreground/60 mt-2">
          * Inclui Resilient CON (+1) &nbsp;|&nbsp; &dagger; Inclui Fey Touched (+1 WIS) &nbsp;|&nbsp; &Dagger; Inclui Tome of Leadership (+2 CHA)
        </p>
      </div>

      <H3>Progressão de atributos (Point Buy)</H3>

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
              <td className="py-1.5 text-xs">Point Buy + Racial</td>
              <td className="py-1.5 text-center">8</td>
              <td className="py-1.5 text-center">14</td>
              <td className="py-1.5 text-center">16</td>
              <td className="py-1.5 text-center">9</td>
              <td className="py-1.5 text-center">13</td>
              <td className="py-1.5 text-center">16</td>
            </tr>
            <tr className="border-b border-white/[0.06]">
              <td className="py-1.5">5</td>
              <td className="py-1.5 text-xs">Sorc 4 — Resilient CON</td>
              <td className="py-1.5 text-center">8</td>
              <td className="py-1.5 text-center">14</td>
              <td className="py-1.5 text-center text-gold">17</td>
              <td className="py-1.5 text-center">9</td>
              <td className="py-1.5 text-center">13</td>
              <td className="py-1.5 text-center">16</td>
            </tr>
            <tr className="border-b border-white/[0.06]">
              <td className="py-1.5">9</td>
              <td className="py-1.5 text-xs">Sorc 8 — Fey Touched (+1 WIS)</td>
              <td className="py-1.5 text-center">8</td>
              <td className="py-1.5 text-center">14</td>
              <td className="py-1.5 text-center">17</td>
              <td className="py-1.5 text-center">9</td>
              <td className="py-1.5 text-center text-gold">14</td>
              <td className="py-1.5 text-center">16</td>
            </tr>
            <tr>
              <td className="py-1.5">10</td>
              <td className="py-1.5 text-xs">Tome of Leadership (+2 CHA)</td>
              <td className="py-1.5 text-center">8</td>
              <td className="py-1.5 text-center">14</td>
              <td className="py-1.5 text-center">17</td>
              <td className="py-1.5 text-center">9</td>
              <td className="py-1.5 text-center">14</td>
              <td className="py-1.5 text-center text-gold">18</td>
            </tr>
          </tbody>
        </table>
      </div>

      <P>
        <strong>Trade-offs com Point Buy:</strong> A maior diferença é CON — com
        dados rolados, Capa tinha +4 de modificador de CON durante toda a
        campanha, enquanto com Point Buy ficaria em +3. Isso significa{" "}
        <strong>&minus;1 HP por nível</strong> (&minus;10 no total) e &minus;1 nos testes de
        Constituição para manter concentração. Para uma build que depende de
        manter Bless e Spirit Guardians ativos, é uma diferença real — mas
        Resilient CON compensa boa parte disso com proficiência nos saves.
      </P>

      {/* Variante Point Buy — Shadar-kai */}
      <div className="rounded-xl border border-gold/25 bg-gold/[0.05] p-5 my-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-gold/50 rounded-l-xl" />
        <div className="pl-3">
          <p className="text-gold font-display text-xs uppercase tracking-wider font-bold mb-2">
            Variante — Shadar-kai com Point Buy
          </p>
          <p className="text-sm text-foreground/85 leading-relaxed mb-3">
            Se sua mesa usa Point Buy e permite ASIs flexíveis
            (Tasha{"'"}s Cauldron / MotM),{" "}
            <strong>Shadar-kai</strong> é uma alternativa excelente a
            Half-Elf. Você consegue fechar{" "}
            <strong>CHA 18, CON 18 e WIS par</strong> — todos os
            atributos importantes em números pares, sem desperdício.
          </p>
          <p className="text-sm text-foreground/85 leading-relaxed mb-3">
            <strong>Como funciona:</strong>{" "}
            Compre CHA 15 e CON 15 no Point Buy. Distribua os bônus
            raciais como +2 CON e +1 CHA, chegando a{" "}
            <strong>CHA 16, CON 17</strong>{" "}
            no nível 1.
          </p>
          <ul className="text-sm text-foreground/85 leading-relaxed mb-3 list-none space-y-2.5 pl-0">
            <li>
              <strong>Nível 5 (Sorc 4) — Resilient (CON):</strong>{" "}
              CON 17 → <strong>CON 18</strong>{" "}
              (modificador +4) com proficiência em saves de CON.
              Concentração blindada desde cedo.
            </li>
            <li>
              <strong>Nível 9 (Sorc 8) — Fey Touched (+1 WIS):</strong>{" "}
              Coloque o +1 em <strong>WIS</strong>{" "}
              (não em CHA), fechando WIS num valor par. Você ganha
              Misty Step + Gift of Alacrity e fica mais tanque nos
              saves de WIS.
            </li>
            <li>
              <strong>Nível 10 — Tome of Leadership:</strong>{" "}
              CHA 16 → <strong>CHA 18</strong>{" "}
              (modificador +4). O Tome pula direto de 16 para 18,
              por isso você não precisa gastar Fey Touched em CHA.
            </li>
          </ul>
          <p className="text-sm text-foreground/85 leading-relaxed">
            <strong>Vantagem da Shadar-kai:</strong>{" "}
            Além de fechar todos os atributos pares, você ganha{" "}
            <em>Blessing of the Raven Queen</em> — teleporte de 30ft
            como bônus action com resistência a todo dano até o
            próximo turno. Para um caster frontline, é uma ferramenta
            de sobrevivência brutal que Misty Step não oferece. O
            trade-off é DEX mais baixo (12 vs 14) e perder Fey
            Ancestry, mas com Point Buy os números finais compensam.
          </p>
        </div>
      </div>

      <H2>Por Que Essas Escolhas?</H2>

      <H3>Raça: Half-Elf (Drow)</H3>
      <P>
        Half-Elf é uma das raças mais flexíveis do 5e. O +2 CHA é exatamente o
        que um Sorcerer precisa, e os dois +1 extras permitem arredondar CON e
        DEX — atributos essenciais para sobrevivência e AC. A variante Drow
        adiciona Darkvision 60ft e Fey Ancestry (vantagem contra charm e
        imunidade a sono mágico), traços defensivos valiosos para quem precisa
        manter concentração.
      </P>

      <H3>Cleric 1 — Order Domain</H3>
      <P>
        O dip de um nível em Cleric (Order Domain) é o coração da build.{" "}
        <strong>Voice of Authority</strong> é a feature que transforma um
        caster de suporte em um multiplicador de ações: toda vez que você
        conjura uma magia com spell slot mirando um aliado, esse aliado pode
        usar sua reação para fazer um ataque de arma. Combine com Quickened
        Spell e você pode buffar alguém E conjurar uma magia ofensiva no mesmo
        turno — enquanto seu aliado ainda ganha um ataque extra.
      </P>
      <P>
        Além disso, o nível de Cleric traz proficiência em armaduras pesadas e
        escudos (AC 19-21), saves de Sabedoria, e acesso a magias clericais de
        1º nível que um Sorcerer normalmente não teria — como Command e
        Heroism, ambas preparadas gratuitamente pelo domínio.
      </P>

      <H3>Sorcerer — Divine Soul</H3>
      <P>
        Divine Soul Sorcerer é avaliado pela comunidade como{" "}
        <strong>tier S</strong> entre as subclasses de Sorcerer — e por bom
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
        <Li>
          <strong>Fey Touched — Sorc 8:</strong> +1 WIS (arredondando de 13
          para 14), Misty Step gratuito 1x/dia (mobilidade essencial para um
          caster frontline), e Gift of Alacrity (bônus de iniciativa para
          garantir que os buffs cheguem antes dos inimigos agirem).
        </Li>
      </Ul>

      <H3>Metamagic</H3>
      <Ul>
        <Li>
          <strong>Quickened Spell:</strong> Transforma uma magia de ação em
          bônus action. Permite conjurar um buff (ativando Voice of Authority)
          e ainda usar sua ação para um cantrip ou outra magia no mesmo turno.
        </Li>
        <Li>
          <strong>Extended Spell:</strong> Dobra a duração de magias como Aid
          (agora 16 horas em vez de 8), Death Ward, e qualquer buff de
          concentração longa. Excelente para preparação antes de encontros.
        </Li>
      </Ul>

      <H2>Combate — O Que Essa Build Faz de Melhor</H2>

      <H3>Rotação típica</H3>
      <Ul>
        <Li>
          <strong>Round 1:</strong> Quickened Bless em 3 aliados (Voice of
          Authority dá um ataque de reação ao alvo principal) + Sacred Flame ou
          Toll the Dead como ação.
        </Li>
        <Li>
          <strong>Round 2+:</strong> Spirit Guardians (se em melee) ou Spiritual
          Weapon + cantrips. Cada magia com slot mirando aliados continua
          ativando Voice of Authority.
        </Li>
        <Li>
          <strong>Reação:</strong> Shield (+5 AC por um turno, 1x grátis pelo
          background), Absorb Elements, Silvery Barbs (forçar reroll inimigo E
          dar vantagem a um aliado), ou Counterspell.
        </Li>
        <Li>
          <strong>Emergência:</strong> Healing Word (cura à distância como bônus
          action), Revivify, ou Dimension Door para reposicionamento.
        </Li>
      </Ul>

      <H3>Onde a build brilha</H3>
      <Ul>
        <Li>Multiplicação de ações — cada buff gera ataques extras para o grupo</Li>
        <Li>Concentração blindada — Resilient CON + alta CON = saves quase garantidos</Li>
        <Li>Versatilidade — acesso a listas de Cleric e Sorcerer simultaneamente</Li>
        <Li>AC alta para caster — 19-21 com Half Plate/Mithril Plate + Shield</Li>
        <Li>Contramágica — Counterspell e Silvery Barbs para proteger o grupo</Li>
      </Ul>

      <H3>Onde a build sofre</H3>
      <Ul>
        <Li>Magias conhecidas limitadas — Sorcerer tem poucas magias, escolha com cuidado</Li>
        <Li>Dependência de concentração — perder Bless ou Spirit Guardians dói</Li>
        <Li>Dano direto baixo — o dano vem dos aliados, não de você</Li>
        <Li>Início lento — níveis 1-4 antes de Metamagic e magias de 3º nível</Li>
      </Ul>

      <H2>Comparação com Builds Populares</H2>

      <P>
        O Order Cleric 1 / Divine Soul Sorcerer é considerado pela comunidade de
        otimização (RPGBot, TabletopBuilds, Treantmonk, r/3d6) como{" "}
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
        e estender buffs como Aid para 16 horas — uma escolha que prioriza
        preparação e versatilidade sobre raw output.
      </P>

      <H2>Progressão — Para Onde Ir nos Próximos Níveis</H2>

      <Ul>
        <Li>
          <strong>Nível 11 (Sorc 10):</strong> Mais um Metamagic — Twinned
          Spell é a escolha óbvia aqui, finalmente adicionando a capacidade de
          buffar dois aliados ao mesmo tempo.
        </Li>
        <Li>
          <strong>Nível 12 (Sorc 11):</strong> Magias de 6º nível — Mass
          Suggestion para controle fora de combate, ou Heal para cura massiva
          de emergência.
        </Li>
        <Li>
          <strong>Nível 13 (Sorc 12):</strong> ASI — +2 CHA (chegando a 20 com
          o Tome) ou um feat como Alert para garantir iniciativa alta.
        </Li>
        <Li>
          <strong>Itens desejados:</strong> Staff of Power (Very Rare) para mais
          AC e magias, ou um Dragon Touched Focus (Legendary) para potencializar
          magias de Sorcerer.
        </Li>
      </Ul>

      <H2>Quem Foi Capa Barsavi</H2>

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
        habilidades em retórica, diplomacia, teologia e magia divina — e
        conheceu uma duquesa influente, após impressioná-la com um discurso
        sobre a ética da paz em tempos de guerra.
      </P>
      <P>
        Tudo mudou quando seu pai partiu em uma expedição rumo a mares
        distantes e nunca retornou. Nenhum corpo. Nenhuma pista. Nenhuma
        resposta. Se o deus que servia representava justiça e ordem, por que
        permitiu tal silêncio? Esse questionamento não destruiu sua fé — mas
        a transformou em algo mais pragmático: ele acredita na justiça e na
        ordem, mas não depende cegamente delas.
      </P>
      <P>
        Foi então que poderes que não vinham de estudo nem de oração
        começaram a se manifestar. Um sábio em uma antiga fortaleza-biblioteca
        revelou a verdade: sua mãe, Lyna, possuía linhagem descendente de um
        ser celestial tocado por uma deusa da magia. Esse sangue despertou
        dentro de Capa, tornando-o portador de duas fontes de poder — a
        disciplina da fé clerical e o poder inato de seu sangue divino.
      </P>
      <P>
        Ao aceitar o convite da duquesa para um encontro diplomático, Capa
        iniciou a jornada que o levaria às névoas de uma terra amaldiçoada sob
        o domínio de um vampiro ancestral. Em apenas{" "}
        <strong>19 dias</strong>, enfrentou horrores sobrenaturais, viu aldeias
        destruídas, ficou cara a cara com o senhor das névoas — e morreu{" "}
        <strong>duas vezes</strong>. E voltou duas vezes.
      </P>
      <P>
        Entre seus companheiros — Amum Titus, Skid, Sócrates, Auditore e
        Lauren Nailo — Capa se tornou o elo que mantinha o grupo unido.
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
            Monte o encontro perfeito para testá-la — use o Pocket DM gratuitamente.
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

/* ═══════════════════════════════════════════════════════════════
   Post 14 — Build: Half-Elf (Drow) Order Cleric 1 / Divine Soul Sorcerer — EN
   ═══════════════════════════════════════════════════════════════ */
export function BlogPost14() {
  return (
    <>
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
        the invisible gear that makes the machine work — and one of the most
        efficient support builds in D&amp;D 5e.
      </P>

      <H2>Build Summary</H2>

      <div className="overflow-x-auto mb-6">
        <table className="w-full text-sm text-foreground/80 border-collapse">
          <tbody>
            <tr className="border-b border-white/[0.06]">
              <td className="py-2 pr-4 font-semibold text-gold/80 whitespace-nowrap">Race</td>
              <td className="py-2">Half-Elf (Drow)</td>
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
              <td className="py-2 pr-4 font-semibold text-gold/80 whitespace-nowrap">Feats</td>
              <td className="py-2">Resilient (CON), Fey Touched</td>
            </tr>
            <tr className="border-b border-white/[0.06]">
              <td className="py-2 pr-4 font-semibold text-gold/80 whitespace-nowrap">Metamagic</td>
              <td className="py-2">Extended Spell, Quickened Spell</td>
            </tr>
            <tr>
              <td className="py-2 pr-4 font-semibold text-gold/80 whitespace-nowrap">Difficulty</td>
              <td className="py-2">Medium — requires synergy knowledge and timing</td>
            </tr>
          </tbody>
        </table>
      </div>

      <H2>Ability Scores — Rolled Stats vs Point Buy</H2>

      <Tip>
        This build was created with rolled stats (4d6 drop lowest). Below we
        show how to rebuild it using Point Buy for those who prefer a
        standardized method. Attribute priorities remain the same with minor
        adjustments.
      </Tip>

      <H3>Final comparison (level 10)</H3>

      <div className="overflow-x-auto mb-6">
        <table className="w-full text-sm text-foreground/80 border-collapse">
          <thead>
            <tr className="border-b border-gold/20 text-gold/70 text-xs uppercase tracking-wider">
              <th className="py-2 text-left">Ability</th>
              <th className="py-2 text-center">Rolled</th>
              <th className="py-2 text-center">Point Buy</th>
              <th className="py-2 text-center">Diff</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-white/[0.06]">
              <td className="py-2 font-semibold">STR</td>
              <td className="py-2 text-center">10</td>
              <td className="py-2 text-center">8</td>
              <td className="py-2 text-center text-red-400/70">&minus;2</td>
            </tr>
            <tr className="border-b border-white/[0.06]">
              <td className="py-2 font-semibold">DEX</td>
              <td className="py-2 text-center">14</td>
              <td className="py-2 text-center">14</td>
              <td className="py-2 text-center text-green-400/70">0</td>
            </tr>
            <tr className="border-b border-white/[0.06]">
              <td className="py-2 font-semibold">CON</td>
              <td className="py-2 text-center">18 → 19*</td>
              <td className="py-2 text-center">16 → 17*</td>
              <td className="py-2 text-center text-red-400/70">&minus;2</td>
            </tr>
            <tr className="border-b border-white/[0.06]">
              <td className="py-2 font-semibold">INT</td>
              <td className="py-2 text-center">8</td>
              <td className="py-2 text-center">9</td>
              <td className="py-2 text-center text-green-400/70">+1</td>
            </tr>
            <tr className="border-b border-white/[0.06]">
              <td className="py-2 font-semibold">WIS</td>
              <td className="py-2 text-center">14&dagger;</td>
              <td className="py-2 text-center">14&dagger;</td>
              <td className="py-2 text-center text-green-400/70">0</td>
            </tr>
            <tr>
              <td className="py-2 font-semibold">CHA</td>
              <td className="py-2 text-center">18&Dagger;</td>
              <td className="py-2 text-center">18&Dagger;</td>
              <td className="py-2 text-center text-green-400/70">0</td>
            </tr>
          </tbody>
        </table>
        <p className="text-xs text-muted-foreground/60 mt-2">
          * Includes Resilient CON (+1) &nbsp;|&nbsp; &dagger; Includes Fey Touched (+1 WIS) &nbsp;|&nbsp; &Dagger; Includes Tome of Leadership (+2 CHA)
        </p>
      </div>

      <H3>Point Buy attribute progression</H3>

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
              <td className="py-1.5 text-xs">Point Buy + Racial</td>
              <td className="py-1.5 text-center">8</td>
              <td className="py-1.5 text-center">14</td>
              <td className="py-1.5 text-center">16</td>
              <td className="py-1.5 text-center">9</td>
              <td className="py-1.5 text-center">13</td>
              <td className="py-1.5 text-center">16</td>
            </tr>
            <tr className="border-b border-white/[0.06]">
              <td className="py-1.5">5</td>
              <td className="py-1.5 text-xs">Sorc 4 — Resilient CON</td>
              <td className="py-1.5 text-center">8</td>
              <td className="py-1.5 text-center">14</td>
              <td className="py-1.5 text-center text-gold">17</td>
              <td className="py-1.5 text-center">9</td>
              <td className="py-1.5 text-center">13</td>
              <td className="py-1.5 text-center">16</td>
            </tr>
            <tr className="border-b border-white/[0.06]">
              <td className="py-1.5">9</td>
              <td className="py-1.5 text-xs">Sorc 8 — Fey Touched (+1 WIS)</td>
              <td className="py-1.5 text-center">8</td>
              <td className="py-1.5 text-center">14</td>
              <td className="py-1.5 text-center">17</td>
              <td className="py-1.5 text-center">9</td>
              <td className="py-1.5 text-center text-gold">14</td>
              <td className="py-1.5 text-center">16</td>
            </tr>
            <tr>
              <td className="py-1.5">10</td>
              <td className="py-1.5 text-xs">Tome of Leadership (+2 CHA)</td>
              <td className="py-1.5 text-center">8</td>
              <td className="py-1.5 text-center">14</td>
              <td className="py-1.5 text-center">17</td>
              <td className="py-1.5 text-center">9</td>
              <td className="py-1.5 text-center">14</td>
              <td className="py-1.5 text-center text-gold">18</td>
            </tr>
          </tbody>
        </table>
      </div>

      <P>
        <strong>Point Buy trade-offs:</strong> The biggest difference is CON —
        with rolled stats, Capa had a +4 CON modifier throughout the campaign,
        while Point Buy would give +3. That means{" "}
        <strong>&minus;1 HP per level</strong> (&minus;10 total) and &minus;1 to concentration
        saving throws. For a build that depends on maintaining Bless and Spirit
        Guardians, that{"'"}s a real difference — but Resilient CON compensates
        significantly by granting proficiency in CON saves.
      </P>

      {/* Point Buy Variant — Shadar-kai */}
      <div className="rounded-xl border border-gold/25 bg-gold/[0.05] p-5 my-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-gold/50 rounded-l-xl" />
        <div className="pl-3">
          <p className="text-gold font-display text-xs uppercase tracking-wider font-bold mb-2">
            Variant — Shadar-kai with Point Buy
          </p>
          <p className="text-sm text-foreground/85 leading-relaxed mb-3">
            If your table uses Point Buy and allows flexible ASI rules
            (Tasha{"'"}s Cauldron / MotM),{" "}
            <strong>Shadar-kai</strong> is an excellent alternative to
            Half-Elf. You can close{" "}
            <strong>CHA 18, CON 18, and WIS even</strong> — every
            important ability score on an even number, zero waste.
          </p>
          <p className="text-sm text-foreground/85 leading-relaxed mb-3">
            <strong>How it works:</strong>{" "}
            Buy CHA 15 and CON 15 in Point Buy. Place racial bonuses
            as +2 CON and +1 CHA, arriving at{" "}
            <strong>CHA 16, CON 17</strong>{" "}
            at level 1.
          </p>
          <ul className="text-sm text-foreground/85 leading-relaxed mb-3 list-none space-y-2.5 pl-0">
            <li>
              <strong>Level 5 (Sorc 4) — Resilient (CON):</strong>{" "}
              CON 17 → <strong>CON 18</strong>{" "}
              (+4 modifier) with proficiency in CON saves. Armored
              concentration from early on.
            </li>
            <li>
              <strong>Level 9 (Sorc 8) — Fey Touched (+1 WIS):</strong>{" "}
              Put the +1 into <strong>WIS</strong>{" "}
              (not CHA), closing WIS to an even number. You gain
              Misty Step + Gift of Alacrity and become tankier on WIS
              saves.
            </li>
            <li>
              <strong>Level 10 — Tome of Leadership:</strong>{" "}
              CHA 16 → <strong>CHA 18</strong>{" "}
              (+4 modifier). The Tome jumps straight from 16 to 18,
              which is why you don{"'"}t need to spend Fey Touched on
              CHA.
            </li>
          </ul>
          <p className="text-sm text-foreground/85 leading-relaxed">
            <strong>Shadar-kai advantage:</strong>{" "}
            Beyond closing all scores even, you gain{" "}
            <em>Blessing of the Raven Queen</em> — a 30ft teleport
            as a bonus action with resistance to all damage until
            your next turn. For a frontline caster, this is a brutal
            survival tool that Misty Step doesn{"'"}t offer. The
            trade-off is lower DEX (12 vs 14) and losing Fey
            Ancestry, but with Point Buy the final numbers come out
            ahead.
          </p>
        </div>
      </div>

      <H2>Why These Choices?</H2>

      <H3>Race: Half-Elf (Drow)</H3>
      <P>
        Half-Elf is one of the most flexible races in 5e. The +2 CHA is exactly
        what a Sorcerer needs, and the two floating +1s let you round out CON
        and DEX — essential for survivability and AC. The Drow variant adds
        Darkvision 60ft and Fey Ancestry (advantage against charm, immunity to
        magical sleep), valuable defensive traits for someone who needs to
        maintain concentration.
      </P>

      <H3>Cleric 1 — Order Domain</H3>
      <P>
        The one-level Cleric (Order Domain) dip is the heart of the build.{" "}
        <strong>Voice of Authority</strong> transforms a support caster into an
        action economy multiplier: every time you cast a spell with a spell slot
        targeting an ally, that ally can use their reaction to make a weapon
        attack. Combine with Quickened Spell and you can buff someone AND cast
        an offensive spell in the same turn — while your ally still gets a
        bonus attack.
      </P>
      <P>
        The Cleric level also brings heavy armor and shield proficiency (AC
        19-21), Wisdom save proficiency, and access to 1st-level Cleric spells
        a Sorcerer normally wouldn{"'"}t have — like Command and Heroism, both
        prepared for free through the domain.
      </P>

      <H3>Sorcerer — Divine Soul</H3>
      <P>
        Divine Soul Sorcerer is rated by the optimization community as{" "}
        <strong>S-tier</strong> among Sorcerer subclasses — and for good reason.
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
          <strong>Resilient (CON) — Sorc 4:</strong> Proficiency in
          Constitution saves is essential for maintaining concentration on
          Bless and Spirit Guardians. By level 10, the +7/+8 CON save bonus
          makes it nearly impossible to lose concentration on low to moderate
          damage.
        </Li>
        <Li>
          <strong>Fey Touched — Sorc 8:</strong> +1 WIS (rounding from 13 to
          14), free Misty Step once per day (essential mobility for a frontline
          caster), and Gift of Alacrity (initiative bonus to ensure buffs land
          before enemies act).
        </Li>
      </Ul>

      <H3>Metamagic</H3>
      <Ul>
        <Li>
          <strong>Quickened Spell:</strong> Turns an action spell into a bonus
          action. Cast a buff (triggering Voice of Authority) and still use your
          action for a cantrip or another spell in the same turn.
        </Li>
        <Li>
          <strong>Extended Spell:</strong> Doubles the duration of spells like
          Aid (now 16 hours instead of 8), Death Ward, and any long-duration
          concentration buff. Excellent for pre-combat preparation.
        </Li>
      </Ul>

      <H2>Combat — What This Build Does Best</H2>

      <H3>Typical rotation</H3>
      <Ul>
        <Li>
          <strong>Round 1:</strong> Quickened Bless on 3 allies (Voice of
          Authority grants a reaction attack to the primary target) + Sacred
          Flame or Toll the Dead as your action.
        </Li>
        <Li>
          <strong>Round 2+:</strong> Spirit Guardians (if in melee) or Spiritual
          Weapon + cantrips. Every spell with a slot targeting allies keeps
          triggering Voice of Authority.
        </Li>
        <Li>
          <strong>Reaction:</strong> Shield (+5 AC for a round, 1x free from
          background), Absorb Elements, Silvery Barbs (force enemy reroll AND
          grant advantage to an ally), or Counterspell.
        </Li>
        <Li>
          <strong>Emergency:</strong> Healing Word (ranged healing as bonus
          action), Revivify, or Dimension Door for repositioning.
        </Li>
      </Ul>

      <H3>Where the build shines</H3>
      <Ul>
        <Li>Action economy multiplication — every buff generates extra attacks for the party</Li>
        <Li>Armored concentration — Resilient CON + high CON = nearly guaranteed saves</Li>
        <Li>Versatility — access to both Cleric and Sorcerer spell lists</Li>
        <Li>High AC for a caster — 19-21 with Half Plate/Mithril Plate + Shield</Li>
        <Li>Counter-magic — Counterspell and Silvery Barbs to protect the group</Li>
      </Ul>

      <H3>Where the build struggles</H3>
      <Ul>
        <Li>Limited spells known — Sorcerer has few spell picks, choose carefully</Li>
        <Li>Concentration-dependent — losing Bless or Spirit Guardians hurts</Li>
        <Li>Low direct damage — your damage comes from allies, not from you</Li>
        <Li>Slow start — levels 1-4 before Metamagic and 3rd-level spells feel weak</Li>
      </Ul>

      <H2>Community Tier Rating</H2>

      <P>
        The Order Cleric 1 / Divine Soul Sorcerer is considered by the
        optimization community (RPGBot, TabletopBuilds, Treantmonk, r/3d6) as{" "}
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
        extending buffs like Aid to 16 hours — a choice that prioritizes
        preparation and versatility over raw output.
      </P>

      <H2>Progression — Where to Go Next</H2>

      <Ul>
        <Li>
          <strong>Level 11 (Sorc 10):</strong> Another Metamagic — Twinned
          Spell is the obvious pick, finally adding the ability to buff two
          allies simultaneously.
        </Li>
        <Li>
          <strong>Level 12 (Sorc 11):</strong> 6th-level spells — Mass
          Suggestion for out-of-combat control, or Heal for emergency massive
          healing.
        </Li>
        <Li>
          <strong>Level 13 (Sorc 12):</strong> ASI — +2 CHA (reaching 20 with
          the Tome) or a feat like Alert for high initiative.
        </Li>
        <Li>
          <strong>Desired items:</strong> Staff of Power (Very Rare) for more AC
          and spells, or a Dragon Touched Focus (Legendary) to empower Sorcerer
          spells.
        </Li>
      </Ul>

      <H2>Who Was Capa Barsavi</H2>

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
        diplomacy, theology, and divine magic — and met an influential
        duchess, after impressing her with a speech on the ethics of peace in
        times of war.
      </P>
      <P>
        Everything changed when his father departed on an expedition to distant
        seas and never returned. No body. No clues. No answers. If the god he
        served stood for justice and order, why allow such silence? This
        questioning didn{"'"}t destroy his faith — it transformed it into
        something more pragmatic: he believes in justice and order, but no
        longer depends on them blindly.
      </P>
      <P>
        Then powers that came from neither study nor prayer began to manifest. A
        sage in an ancient fortress-library revealed the truth: his mother, Lyna,
        carried a bloodline descended from a celestial being touched by a goddess
        of magic. That blood awakened within Capa, making him the bearer of two
        sources of power — the discipline of clerical faith and the innate
        force of his divine heritage.
      </P>
      <P>
        After accepting the duchess{"'"}s invitation to a diplomatic meeting,
        Capa began the journey that would lead him into the mists of a cursed
        land ruled by an ancient vampire. In just{" "}
        <strong>19 days</strong>, he faced supernatural horrors, watched
        villages burn, stood face to face with the lord of the mists — and
        died <strong>twice</strong>. And came back twice.
      </P>
      <P>
        Among his companions — Amum Titus, Skid, Socrates, Auditore, and
        Lauren Nailo — Capa became the link that held the group together.
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
            Build the perfect encounter to test it — use Pocket DM for free.
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
    </>
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
      <H2>Pesquisa e Decisões &mdash; Semanas de Planejamento</H2>
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
      <H2>O Combat Tracker Cresce</H2>
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
      <H2>Identidade e Experiência</H2>
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

      {/* ── ERA 6 ── */}
      <H2>Comunidade e Conteúdo</H2>
      <P>
        Se a ferramenta é boa, o conteúdo a torna indispensável. Publicamos 14
        posts de blog &mdash; tutoriais, guias, comparativos, builds de
        personagem. SEO otimizado pra quem busca &ldquo;como mestrar
        D&D&rdquo;, &ldquo;combat tracker D&D 5e&rdquo;, &ldquo;condições D&D
        5e&rdquo;. Tudo bilíngue, tudo com links internos, tudo com
        screenshots reais.
      </P>
      <P>
        Mas o blog é só uma parte. A{" "}
        <ProdLink href="/methodology">página de Metodologia</ProdLink> é onde a
        comunidade vota em tiers de magias (S/A/B/C/D, estilo tier list de jogo
        competitivo). Cada voto conta, cada mago tem opinião. O Pocket DM não é
        só uma ferramenta &mdash; é um lugar onde a comunidade de D&D constrói
        conhecimento junto.
      </P>
      <H3>Conteúdo público e gratuito</H3>
      <Ul>
        <Li>
          30+ páginas públicas com SEO &mdash; incluindo{" "}
          <ProdLink href="/monstros">compêndio de monstros</ProdLink> e{" "}
          <ProdLink href="/magias">oráculo de magias</ProdLink>
        </Li>
        <Li>
          Spell tier voting &mdash; sistema S/A/B/C/D/E de ranking comunitário
        </Li>
        <Li>
          Blog bilíngue com categorias: tutorial, guia, lista, comparativo,
          build
        </Li>
        <Li>
          Referência rápida de regras, condições e dice roller integrado
        </Li>
      </Ul>

      {/* ── ERA 7 ── */}
      <H2>Campaign Hub e Mapa Mental</H2>
      <P>
        Sua campanha merece mais que uma pasta no Google Drive. O Campaign Hub
        foi redesenhado do zero: cards visuais com capas de fantasia épica,
        sidebar wiki-style, ações rápidas, integração com encontros e presets.
      </P>
      <P>
        O{" "}
        <strong>mind map de campanha</strong> permite ao mestre visualizar NPCs,
        locais, quests e conexões &mdash; com fog of war pra jogadores (eles só
        veem o que o mestre revela). E sim: tem um &ldquo;Bag of
        Holding&rdquo; &mdash; a seção de itens e notas da campanha. Porque
        todo mestre precisa de um lugar pra guardar loot que os jogadores vão
        esquecer que têm.
      </P>
      <H3>Destaques do Campaign Hub</H3>
      <Ul>
        <Li>
          Encounter presets &mdash; monte encontros prontos e reutilize
          (&ldquo;Goblin Ambush&rdquo; uma vez, use pra sempre)
        </Li>
        <Li>
          Mind map com fog of war &mdash; jogadores descobrem a campanha no
          ritmo do mestre
        </Li>
        <Li>
          Convites por email &mdash; jogadores entram na campanha com um clique
        </Li>
        <Li>
          Player HQ &mdash; cada jogador tem seu espaço com personagem, notas
          e histórico
        </Li>
      </Ul>

      {/* ── ERA 8 ── */}
      <H2>User Journey e Onboarding</H2>
      <P>
        O melhor produto do mundo não serve se ninguém entende como usar. Essa
        fase focou em suavizar cada ponto de fricção: token de sessão que
        sobrevive refresh, CTA contextual quando o mestre não tem campanha,
        tour guiado pro mestre e pro jogador, checklist de ativação.
      </P>
      <P>
        E o sistema de{" "}
        <strong>reconexão resiliente</strong>: o jogador pode fechar o celular,
        trocar de aba, perder sinal, e quando voltar, tudo estará lá. Sem pedir
        aprovação do mestre, sem tela branca, sem formulário. O sistema tem 4
        camadas de fallback &mdash; sessionStorage, localStorage, cookie auth, e
        lista de nomes no servidor. Se todas falharem, aí sim aparece o
        formulário. Mas pra isso, o universo inteiro precisa conspirar contra o
        jogador.
      </P>
      <H3>Melhorias de experiência</H3>
      <Ul>
        <Li>
          Reconexão automática em 4 camadas &mdash; o jogador nunca perde
          conexão de forma perceptível
        </Li>
        <Li>
          Tour guiado &mdash; mestre e jogador aprendem a ferramenta sem manual
        </Li>
        <Li>
          Reaction tracker &mdash; rastreia reações usadas por turno
        </Li>
        <Li>
          Poll de dificuldade ao vivo &mdash; resultados aparecem conforme cada
          jogador vota
        </Li>
      </Ul>

      {/* ── PRÓXIMAS QUESTS ── */}
      <H2>Próximas Quests &mdash; O que Vem por Aí</H2>
      <P>
        O backlog não para de crescer. E isso é bom. Aqui estão algumas das
        áreas que estamos explorando:
      </P>
      <Ul>
        <Li>
          <strong>Áudio avançado</strong> &mdash; efeitos sonoros por turno,
          biblioteca de sons, áudio remoto no PC do mestre
        </Li>
        <Li>
          <strong>IA integrada</strong> &mdash; NPC generator, encounter
          builder inteligente, assistente narrativo
        </Li>
        <Li>
          <strong>Analytics expandido</strong> &mdash; dashboard de métricas
          pra o mestre entender o ritmo dos combates
        </Li>
        <Li>
          <strong>Modelo freemium</strong> &mdash; tiers de acesso com Stripe,
          mantendo o core gratuito
        </Li>
        <Li>
          <strong>Demo presencial</strong> &mdash; levar o Pocket DM pra bares
          de RPG e mesas reais em Belo Horizonte
        </Li>
        <Li>
          <strong>Multi-sistema</strong> &mdash; suporte a Pathfinder 2e e
          outros sistemas além de D&D 5e
        </Li>
        <Li>
          <strong>Marketplace</strong> &mdash; compartilhar e trocar campanhas,
          NPCs, mapas e presets entre mestres
        </Li>
      </Ul>
      <P>
        Não prometemos datas. Prometemos que cada atualização vai ser anunciada
        aqui primeiro. Se quiser acompanhar de perto, crie uma conta gratuita
        e fique de olho.
      </P>

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
