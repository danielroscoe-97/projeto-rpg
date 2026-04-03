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

const FAQ_ITEMS = [
  // ── Geral ──
  {
    q: "O que é o Pocket DM?",
    a: "Pocket DM é um rastreador de combate (combat tracker) gratuito para D&D 5e, projetado para mesas presenciais de RPG. O mestre gerencia iniciativa, HP, condições e turnos na tela enquanto cada jogador acompanha em tempo real no próprio celular — sem instalar nada.",
  },
  {
    q: "O Pocket DM é gratuito?",
    a: "Sim. O Pocket DM tem um plano gratuito completo que inclui gerenciamento de combate, bestiário com 3.000+ monstros, catálogo de 900+ magias, dados virtuais e música ambiente. Não precisa de cartão de crédito para começar. O plano Pro adiciona campanhas ilimitadas e features exclusivas.",
  },
  {
    q: "Preciso criar conta para usar?",
    a: "Não. O modo visitante (/try) permite experimentar todas as funcionalidades de combate sem cadastro. Criar conta é opcional e serve para salvar campanhas, convidar jogadores por link e manter histórico entre sessões.",
  },
  // ── Funcionalidades ──
  {
    q: "O que é um combat tracker para D&D 5e?",
    a: "Um combat tracker (rastreador de combate) é uma ferramenta digital que ajuda o mestre de RPG a gerenciar encontros de combate — rastreando a ordem de iniciativa, pontos de vida (HP), condições ativas (envenenado, atordoado, etc.) e turnos de cada personagem e monstro. Substitui fichas de papel e agiliza a sessão.",
  },
  {
    q: "Quais funcionalidades o Pocket DM oferece?",
    a: "Rastreador de iniciativa em tempo real, gerenciamento de HP com barras visuais por tier (leve/moderado/pesado/crítico), condições D&D 5e com regras integradas, bestiário com 3.000+ monstros SRD, catálogo de 900+ magias com busca inteligente (oráculo de magias), dados virtuais (d4, d6, d8, d10, d12, d20), música ambiente com 12+ presets temáticos, e convite de jogadores por link.",
  },
  {
    q: "O Pocket DM tem bestiário de monstros?",
    a: "Sim. O Pocket DM inclui um bestiário completo com mais de 3.000 monstros do SRD (System Reference Document) do D&D 5e. Cada monstro tem stat block completo com HP, AC, ataques, habilidades e Challenge Rating. Você pode adicionar qualquer monstro ao combate com um clique.",
  },
  {
    q: "O Pocket DM tem lista de magias?",
    a: "Sim. O catálogo inclui mais de 900 magias SRD do D&D 5e, com busca por nome, escola de magia, nível e classe. O oráculo de magias permite consultar rapidamente qualquer magia durante o combate sem interromper o jogo.",
  },
  {
    q: "O Pocket DM tem dados virtuais (dice roller)?",
    a: "Sim. O Pocket DM inclui dados virtuais integrados — d4, d6, d8, d10, d12 e d20 — acessíveis tanto pelo mestre quanto pelos jogadores durante o combate.",
  },
  {
    q: "O Pocket DM tem música ambiente?",
    a: "Sim. O Pocket DM oferece música ambiente integrada com mais de 12 presets temáticos (taverna, dungeon, floresta, batalha, etc.). O mestre controla a trilha sonora direto da interface de combate.",
  },
  // ── Uso na mesa ──
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
  // ── Compatibilidade ──
  {
    q: "Quais sistemas de RPG são suportados?",
    a: "Atualmente o Pocket DM é otimizado para D&D 5e (Dungeons & Dragons 5ª Edição), incluindo todo o conteúdo SRD (System Reference Document) — monstros, magias e regras de condições. Suporte a outros sistemas como Pathfinder 2e está no roadmap futuro.",
  },
  {
    q: "O Pocket DM funciona com o D&D 2024 (One D&D)?",
    a: "Sim. O D&D 2024 é retrocompatível com o D&D 5e, então todo o conteúdo SRD e as mecânicas de combate do Pocket DM funcionam perfeitamente com as novas regras.",
  },
  // ── Comparativo ──
  {
    q: "Qual a diferença entre Pocket DM e Roll20/Foundry VTT?",
    a: "Roll20 e Foundry VTT são Virtual Tabletops (VTTs) completos, projetados para jogar RPG online com mapas, tokens e grid. O Pocket DM é um combat tracker focado em mesas presenciais — mais simples, mais rápido, sem curva de aprendizado. Se você joga presencialmente, o Pocket DM é a ferramenta certa.",
  },
  {
    q: "Qual a diferença entre Pocket DM e D&D Beyond?",
    a: "D&D Beyond é um ecossistema completo (fichas, livros, regras). O Pocket DM é focado em uma coisa: gerenciar combate de forma rápida e simples. Não precisa de assinatura premium para o combat tracker, e os jogadores entram sem criar conta.",
  },
  // ── Idioma ──
  {
    q: "O Pocket DM está disponível em português?",
    a: "Sim. O Pocket DM tem interface completa em Português Brasileiro (PT-BR) e Inglês (EN). O idioma é detectado automaticamente pelo navegador, mas pode ser alterado manualmente.",
  },
];

export default function FaqPage() {
  const jsonLdFaq = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_ITEMS.map((item) => ({
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
      <Navbar brand="Pocket DM" brandHref="/" />

      <main className="flex-1 pt-[72px]">
        <div className="max-w-3xl mx-auto px-6 py-16">
          <h1 className="font-display text-3xl md:text-4xl text-gold mb-3">
            Perguntas Frequentes
          </h1>
          <p className="text-muted-foreground mb-12">
            Tudo que você precisa saber sobre o Pocket DM — combat tracker
            gratuito para D&D 5e.
          </p>

          <div className="space-y-8">
            {FAQ_ITEMS.map((item, i) => (
              <section key={i} className="group">
                <h2 className="font-display text-lg text-foreground mb-2">
                  {item.q}
                </h2>
                <p className="text-foreground/75 leading-relaxed">{item.a}</p>
                {i < FAQ_ITEMS.length - 1 && (
                  <div className="mt-8 border-b border-white/[0.05]" />
                )}
              </section>
            ))}
          </div>

          {/* CTA */}
          <div className="mt-16 p-8 rounded-xl border border-white/[0.08] bg-white/[0.02] text-center">
            <p className="font-display text-xl text-gold mb-2">
              Pronto para testar?
            </p>
            <p className="text-muted-foreground text-sm mb-6">
              Experimente o Pocket DM agora — sem cadastro, sem download.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                href="/try"
                className="bg-gold text-surface-primary font-semibold px-6 py-3 rounded-lg hover:shadow-gold-glow hover:-translate-y-[1px] transition-all duration-200 text-sm"
              >
                Testar Grátis →
              </Link>
              <Link
                href="/about"
                className="border border-white/10 text-foreground/80 font-medium px-6 py-3 rounded-lg hover:border-white/20 hover:text-foreground transition-all duration-200 text-sm"
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
