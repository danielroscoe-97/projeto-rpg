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

export default function BlogPost15() {
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
