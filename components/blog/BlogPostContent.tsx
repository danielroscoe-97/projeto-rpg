import Link from "next/link";

/* ─── Shared styling helpers ───────────────────────────────────── */
function H2({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-display text-xl text-gold/90 mt-10 mb-4">{children}</h2>
  );
}
function H3({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="font-display text-lg text-foreground/90 mt-8 mb-3">{children}</h3>
  );
}
function P({ children }: { children: React.ReactNode }) {
  return <p className="text-foreground/75 leading-relaxed mb-4">{children}</p>;
}
function Li({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-foreground/75 leading-relaxed">
      <span className="text-gold mt-1 shrink-0">&#9670;</span>
      <span>{children}</span>
    </li>
  );
}
function Ul({ children }: { children: React.ReactNode }) {
  return <ul className="space-y-2 mb-4 ml-1">{children}</ul>;
}
function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-gold/20 bg-gold/[0.04] p-4 mb-6">
      <p className="text-sm text-foreground/80 leading-relaxed">
        <strong className="text-gold">Dica:</strong> {children}
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
        Experimentar o Pocket DM &rarr;
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
        Um combat tracker é uma ferramenta digital que ajuda o mestre de D&D 5e
        a gerenciar encontros de combate de forma rápida e organizada. Em vez de
        anotar tudo em papel, você rastreia iniciativa, HP, condições e turnos em
        uma interface visual — e seus jogadores podem acompanhar em tempo real.
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
        plataformas complexas como Roll20 e Foundry VTT. Mas para mesas
        presenciais, a maioria dessas ferramentas é complexa demais. O ideal é
        algo rápido, que funcione no celular e não exija que seus jogadores
        criem conta.
      </P>

      <H2>5 Coisas que Todo Combat Tracker Deve Rastrear</H2>
      <P>
        Segundo o guia do{" "}
        <strong>Sly Flourish</strong>, um dos maiores blogs de D&D do mundo,
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
          mudar completamente o rumo do combate.
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
        um clique. No Pocket DM, por exemplo, são mais de 3.000 monstros SRD
        disponíveis.
      </P>

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
        como o Pocket DM, não há desculpa para não experimentar.
      </P>

      <CTA />

      <H2>Conclusão</H2>
      <P>
        Usar um combat tracker transforma a experiência na mesa. Combates
        ficam mais rápidos, organizados e imersivos. Se você mestra D&D 5e
        presencialmente, experimentar um tracker é o upgrade mais impactante
        que você pode fazer na sua sessão — especialmente se for gratuito e
        sem barreiras de entrada.
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
        O combat tracker é a ferramenta #1 porque combate é o momento em que o
        mestre mais precisa de organização. Rastrear iniciativa, HP e condições
        de 5+ criaturas simultaneamente em papel é caótico — especialmente com
        jogadores impacientes esperando seu turno.
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
      <P>
        O conteúdo SRD (System Reference Document) do D&D 5e inclui centenas de
        monstros gratuitos. Ferramentas como o Pocket DM disponibilizam mais de
        3.000 monstros com stat blocks completos, todos pesquisáveis.
      </P>

      <H2>3. Catálogo de Magias</H2>
      <P>
        &ldquo;O que essa magia faz mesmo?&rdquo; — essa pergunta aparece em toda sessão.
        Ter um catálogo de magias com busca por nome, escola, nível e classe
        evita pausas desnecessárias.
      </P>
      <P>
        O Pocket DM inclui o que chamamos de &ldquo;oráculo de magias&rdquo; — uma busca
        inteligente em mais de 900 magias SRD, acessível durante o combate sem
        interromper o fluxo do jogo.
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
          <strong>VTT completo (Roll20, Foundry)</strong> — ótimo para mesas
          online, mas overkill para presencial
        </Li>
        <Li>
          <strong>Gerador de mapas</strong> — útil para dungeon crawls, mas a
          maioria dos combates funciona com teatro da mente
        </Li>
        <Li>
          <strong>Ficha de personagem digital</strong> — legal, mas os jogadores
          geralmente preferem a própria ficha (física ou D&D Beyond)
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
        complexa que o problema que ela resolve.
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
        computador. Exemplos populares incluem Roll20, Foundry VTT e Fantasy
        Grounds. Eles oferecem:
      </P>
      <Ul>
        <Li>Mapas interativos com grid e fog of war</Li>
        <Li>Tokens movíveis representando personagens e monstros</Li>
        <Li>Fichas de personagem integradas</Li>
        <Li>Chat de texto e voz</Li>
        <Li>Automação de regras (rolagem, dano, condições)</Li>
        <Li>Marketplace de conteúdo (mapas, aventuras, tokens)</Li>
      </Ul>

      <H2>O que é um Combat Tracker?</H2>
      <P>
        Um combat tracker é uma ferramenta focada exclusivamente em gerenciar o
        momento do combate. Ele faz menos coisas, mas faz melhor e mais rápido:
      </P>
      <Ul>
        <Li>Ordem de iniciativa automática</Li>
        <Li>Gerenciamento de HP com barras visuais</Li>
        <Li>Condições ativas (blinded, stunned, etc.)</Li>
        <Li>Avanço de turnos</Li>
        <Li>Bestiário integrado (stat blocks)</Li>
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
        presencial, um combat tracker leve e gratuito como o Pocket DM é a
        escolha certa — menos setup, menos complexidade, mais foco no jogo.
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
      </P>

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
        No Pocket DM, todas as 15 condições vêm com as regras integradas. Ao
        marcar uma condição em um combatente, a descrição completa aparece para
        consulta rápida — sem precisar abrir o livro.
      </Tip>

      <H2>Condições que Combinam</H2>
      <P>
        Algumas condições são &ldquo;pré-requisitos&rdquo; de outras. <strong>Paralyzed</strong>,{" "}
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
        Isso elimina dezenas de rolagens por combate. Segundo o Sly Flourish,
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
        tempo. Um combat tracker digital com barras de HP visuais e avanço
        automático de turno elimina essa fricção. Com o Pocket DM, você
        adiciona monstros do bestiário, rola iniciativa e começa — em menos de
        2 minutos.
      </P>

      <H2>4. Role Iniciativa em Grupo</H2>
      <P>
        Em vez de rolar iniciativa individual para cada goblin, role uma vez e
        use para todos os goblins. Isso corta drasticamente o tempo de setup
        e simplifica a ordem de turnos.
      </P>

      <H2>5. Timer de Turno (Suave)</H2>
      <P>
        Não precisa ser rígido, mas combinar que cada jogador tem ~60 segundos
        para decidir sua ação mantém o ritmo. A regra: &ldquo;se não decidiu,
        seu personagem usa o turno se defendendo (Dodge).&rdquo;
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
        rodadas de &ldquo;acabamento&rdquo;.
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
        sem o tédio. Seus jogadores vão agradecer.
      </P>
    </>
  );
}
