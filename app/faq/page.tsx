import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/marketing/Footer";

export const metadata: Metadata = {
  title:
    "Perguntas Frequentes — Pocket DM | Combat Tracker D&D 5e",
  description:
    "Respostas para as perguntas mais comuns sobre o Pocket DM — combat tracker gratuito para D&D 5e. Como funciona, preços, funcionalidades, compatibilidade e mais. FAQ for D&D 5e combat tracker.",
  keywords: [
    "pocket dm faq",
    "combat tracker D&D perguntas",
    "rastreador de combate RPG",
    "como usar combat tracker",
    "ferramentas mestre RPG",
    "D&D 5e combat tracker free",
  ],
  alternates: {
    canonical: "/faq",
    languages: { "pt-BR": "/faq", en: "/faq" },
  },
};

const FAQ_CATEGORIES = [
  {
    label: "Geral",
    icon: "&#9733;",
    items: [
      {
        q: "O que é o Pocket DM?",
        a: "Pocket DM é um rastreador de combate (combat tracker) gratuito para D&D 5e, projetado para mesas presenciais de RPG. O mestre gerencia iniciativa, HP, condições e turnos na tela enquanto cada jogador acompanha em tempo real no próprio celular — sem instalar nada.",
      },
      {
        q: "O Pocket DM é gratuito?",
        a: "Sim. O Pocket DM tem um plano gratuito completo que inclui gerenciamento de combate, bestiário SRD completo (incluindo monstros do compêndio Monster a Day), catálogo completo de magias SRD, dados virtuais e música ambiente. Não precisa de cartão de crédito para começar. O plano Pro adiciona campanhas ilimitadas e features exclusivas.",
      },
      {
        q: "Preciso criar conta para usar?",
        a: "Não. O modo visitante (/try) permite experimentar todas as funcionalidades de combate sem cadastro. Criar conta é opcional e serve para salvar campanhas, convidar jogadores por link e manter histórico entre sessões.",
      },
    ],
  },
  {
    label: "Funcionalidades",
    icon: "&#9881;",
    items: [
      {
        q: "O que é um combat tracker para D&D 5e?",
        a: "Um combat tracker (rastreador de combate) é uma ferramenta digital que ajuda o mestre de RPG a gerenciar encontros de combate — rastreando a ordem de iniciativa, pontos de vida (HP), condições ativas (envenenado, atordoado, etc.) e turnos de cada personagem e monstro. Substitui fichas de papel e agiliza a sessão.",
      },
      {
        q: "Quais funcionalidades o Pocket DM oferece?",
        a: "Rastreador de iniciativa em tempo real, gerenciamento de HP com barras visuais por tier (leve/moderado/pesado/crítico), condições D&D 5e com regras integradas, bestiário SRD completo + monstros do compêndio Monster a Day com stat blocks, catálogo completo de magias SRD com busca inteligente (oráculo de magias), dados virtuais (d4, d6, d8, d10, d12, d20), música ambiente com 12+ presets temáticos, e convite de jogadores por link.",
      },
      {
        q: "O Pocket DM tem bestiário de monstros?",
        a: "Sim. O Pocket DM inclui o bestiário SRD completo do D&D 5e (System Reference Document), além de monstros do compêndio Monster a Day (r/monsteraday) com fichas já implementadas. Cada monstro tem stat block completo com HP, AC, ataques, habilidades e Challenge Rating. Você pode adicionar qualquer monstro ao combate com um clique.",
      },
      {
        q: "O Pocket DM tem lista de magias?",
        a: "Sim. O catálogo inclui todas as magias SRD do D&D 5e, com busca por nome, escola de magia, nível e classe. O oráculo de magias permite consultar rapidamente qualquer magia durante o combate sem interromper o jogo.",
      },
      {
        q: "O Pocket DM tem dados virtuais (dice roller)?",
        a: "Sim. O Pocket DM inclui dados virtuais integrados — d4, d6, d8, d10, d12 e d20 — acessíveis tanto pelo mestre quanto pelos jogadores durante o combate.",
      },
      {
        q: "O Pocket DM tem música ambiente?",
        a: "Sim. O Pocket DM oferece música ambiente integrada com mais de 12 presets temáticos (taverna, dungeon, floresta, batalha, etc.). O mestre controla a trilha sonora direto da interface de combate.",
      },
    ],
  },
  {
    label: "Uso na mesa",
    icon: "&#127922;",
    items: [
      {
        q: "O Pocket DM funciona para mesa presencial?",
        a: "Sim — esse é o foco principal. O Pocket DM foi projetado para mesas presenciais de D&D. O mestre gerencia o combate na tela (notebook, tablet ou celular) e cada jogador acompanha no próprio celular em tempo real via link, sem precisar ver a tela do mestre.",
      },
      {
        q: "Como os jogadores entram no combate?",
        a: "O mestre compartilha um link de convite. Os jogadores abrem o link no celular e entram instantaneamente — sem criar conta, sem baixar app, sem instalar nada. Funciona em qualquer navegador moderno (Chrome, Safari, Firefox).",
      },
      {
        q: "Funciona no celular?",
        a: "Sim. O Pocket DM é mobile-first — a interface foi projetada para funcionar perfeitamente em telas de celular. Também funciona em tablets e computadores. É um PWA (Progressive Web App), então pode ser adicionado à tela inicial do celular como se fosse um app nativo.",
      },
      {
        q: "Preciso de internet para usar?",
        a: "Sim, o Pocket DM precisa de conexão com internet para sincronizar o combate em tempo real entre mestre e jogadores. As páginas de referência (bestiário e magias) usam cache para carregamento rápido.",
      },
    ],
  },
  {
    label: "Compatibilidade",
    icon: "&#128279;",
    items: [
      {
        q: "Quais sistemas de RPG são suportados?",
        a: "Atualmente o Pocket DM é otimizado para D&D 5e (Dungeons & Dragons 5ª Edição), incluindo todo o conteúdo SRD (System Reference Document) — monstros, magias e regras de condições. Suporte a outros sistemas como Pathfinder 2e está no roadmap futuro.",
      },
      {
        q: "O Pocket DM funciona com o D&D 2024 (One D&D)?",
        a: "Sim. O D&D 2024 é retrocompatível com o D&D 5e, então todo o conteúdo SRD e as mecânicas de combate do Pocket DM funcionam perfeitamente com as novas regras.",
      },
    ],
  },
  {
    label: "Comparativo",
    icon: "&#9878;",
    items: [
      {
        q: "Qual a diferença entre Pocket DM e Roll20/Foundry VTT?",
        a: "Roll20 e Foundry VTT são Virtual Tabletops (VTTs) completos, projetados para jogar RPG online com mapas, tokens e grid. O Pocket DM é um combat tracker focado em mesas presenciais — mais simples, mais rápido, sem curva de aprendizado. Se você joga presencialmente, o Pocket DM é a ferramenta certa.",
      },
      {
        q: "Qual a diferença entre Pocket DM e D&D Beyond?",
        a: "D&D Beyond é um ecossistema completo (fichas, livros, regras). O Pocket DM é focado em uma coisa: gerenciar combate de forma rápida e simples. Não precisa de assinatura premium para o combat tracker, e os jogadores entram sem criar conta.",
      },
    ],
  },
  {
    label: "Idioma",
    icon: "&#127760;",
    items: [
      {
        q: "O Pocket DM está disponível em português?",
        a: "Sim. O Pocket DM tem interface completa em Português Brasileiro (PT-BR) e Inglês (EN). O idioma é detectado automaticamente pelo navegador, mas pode ser alterado manualmente.",
      },
    ],
  },
];

// Flat list for JSON-LD
const ALL_FAQ_ITEMS = FAQ_CATEGORIES.flatMap((c) => c.items);

export default function FaqPage() {
  const jsonLdFaq = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: ALL_FAQ_ITEMS.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    })),
  };

  return (
    <div className="min-h-screen flex flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdFaq) }}
      />
      <Navbar
        brand="Pocket DM"
        brandHref="/"
        links={[
          { href: "/blog", label: "Blog" },
          { href: "/monsters", label: "Monstros" },
          { href: "/spells", label: "Magias" },
          { href: "/pricing", label: "Preços" },
        ]}
        rightSlot={
          <>
            <Link
              href="/auth/login"
              className="text-muted-foreground hover:text-foreground transition-all duration-[250ms] min-h-[44px] inline-flex items-center text-sm"
            >
              Login
            </Link>
            <Link
              href="/try"
              className="bg-gold text-surface-primary font-semibold px-4 rounded-lg min-h-[44px] inline-flex items-center text-sm hover:shadow-gold-glow hover:-translate-y-[1px] transition-all duration-[250ms]"
            >
              Testar Grátis
            </Link>
          </>
        }
      />

      <main className="flex-1 pt-[72px]">
        {/* Hero */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gold/[0.04] rounded-full blur-[100px]" />
          </div>

          <div className="relative max-w-3xl mx-auto px-6 pt-16 pb-8">
            <div className="flex items-center gap-3 mb-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/art/brand/logo-icon.svg"
                alt=""
                width={36}
                height={36}
                className="opacity-90 drop-shadow-[0_0_10px_rgba(212,168,83,0.4)]"
                aria-hidden="true"
              />
              <h1 className="font-display text-3xl md:text-4xl text-gold">
                Perguntas Frequentes
              </h1>
            </div>
            <p className="text-muted-foreground max-w-xl">
              Tudo que você precisa saber sobre o Pocket DM — combat tracker
              gratuito para D&D 5e.
            </p>

            {/* Decorative divider */}
            <div className="flex items-center gap-3 mt-10">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gold/20 to-transparent" />
              <span className="text-gold/40 text-xs">&#9670; &#9670; &#9670;</span>
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gold/20 to-transparent" />
            </div>
          </div>
        </div>

        {/* FAQ Categories */}
        <div className="max-w-3xl mx-auto px-6 pb-16">
          <div className="space-y-8">
            {FAQ_CATEGORIES.map((category) => (
              <section key={category.label}>
                {/* Category header */}
                <div className="flex items-center gap-2 mb-4">
                  <span
                    className="w-7 h-7 rounded-md bg-gold/10 flex items-center justify-center text-gold text-xs"
                    dangerouslySetInnerHTML={{ __html: category.icon }}
                  />
                  <h2 className="font-display text-sm tracking-wider uppercase text-gold/70">
                    {category.label}
                  </h2>
                </div>

                {/* Questions */}
                <div className="space-y-3">
                  {category.items.map((item, i) => (
                    <details
                      key={i}
                      className="group rounded-xl border border-white/[0.06] bg-white/[0.015] overflow-hidden transition-colors hover:border-white/[0.1]"
                    >
                      <summary className="flex items-center justify-between gap-4 cursor-pointer px-5 py-4 text-foreground/90 font-medium text-sm select-none [&::-webkit-details-marker]:hidden list-none">
                        <span>{item.q}</span>
                        <span className="text-gold/50 text-xs shrink-0 transition-transform duration-200 group-open:rotate-45">
                          &#10010;
                        </span>
                      </summary>
                      <div className="px-5 pb-5 pt-0">
                        <p className="text-foreground/65 text-sm leading-relaxed">
                          {item.a}
                        </p>
                      </div>
                    </details>
                  ))}
                </div>
              </section>
            ))}
          </div>

          {/* CTA */}
          <div className="mt-14 p-8 rounded-xl border border-gold/10 bg-gradient-to-br from-gold/[0.03] to-transparent text-center">
            <p className="font-display text-xl text-gold mb-2">
              Pronto para testar?
            </p>
            <p className="text-muted-foreground text-sm mb-6">
              Experimente o Pocket DM agora — sem cadastro, sem download.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                href="/try"
                className="bg-gold text-surface-primary font-semibold px-8 py-3.5 rounded-lg hover:shadow-gold-glow hover:-translate-y-[1px] transition-all duration-200 text-sm"
              >
                Testar Grátis →
              </Link>
              <Link
                href="/about"
                className="border border-white/10 text-foreground/80 font-medium px-8 py-3.5 rounded-lg hover:border-white/20 hover:text-foreground transition-all duration-200 text-sm"
              >
                Sobre o Pocket DM
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
