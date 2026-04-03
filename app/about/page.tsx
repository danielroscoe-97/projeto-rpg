import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/marketing/Footer";

export const metadata: Metadata = {
  title: "Sobre o Pocket DM — Combat Tracker Gratuito para D&D 5e",
  description:
    "O Pocket DM é um rastreador de combate gratuito para D&D 5e, projetado para mesas presenciais. Gerencie iniciativa, HP, condições e magias em tempo real no celular dos seus jogadores. Criado no Brasil.",
  alternates: {
    canonical: "/about",
    languages: { "pt-BR": "/about", en: "/about" },
  },
};

export default function AboutPage() {
  const jsonLdOrganization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Pocket DM",
    url: "https://pocketdm.com.br",
    logo: "https://pocketdm.com.br/icons/icon-512x512.png",
    foundingDate: "2026",
    description:
      "Pocket DM é o combat tracker gratuito para D&D 5e focado em mesas presenciais. Criado no Brasil para mestres e jogadores de RPG de todo o mundo.",
    knowsAbout: [
      "Dungeons & Dragons 5th Edition",
      "TTRPG Combat Management",
      "RPG Digital Tools",
      "Initiative Tracking",
      "D&D 5e Monsters",
      "D&D 5e Spells",
    ],
    sameAs: [],
  };

  const jsonLdWebPage = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    name: "Sobre o Pocket DM",
    url: "https://pocketdm.com.br/about",
    description:
      "O Pocket DM é um rastreador de combate gratuito para D&D 5e, projetado para mesas presenciais.",
    mainEntity: {
      "@type": "SoftwareApplication",
      name: "Pocket DM",
      applicationCategory: "GameApplication",
      applicationSubCategory: "D&D 5e Combat Tracker",
      operatingSystem: "Web, iOS, Android (PWA)",
      url: "https://pocketdm.com.br",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "BRL",
        description: "Plano gratuito com funcionalidades completas de combate",
      },
      featureList: [
        "Rastreador de iniciativa em tempo real",
        "Gerenciamento de HP com barras visuais",
        "Condições D&D 5e com regras integradas",
        "Bestiário com 3000+ monstros SRD",
        "Catálogo de 900+ magias SRD",
        "Oráculo de magias com busca inteligente",
        "Música ambiente integrada com 12+ presets",
        "Modo visitante sem cadastro",
        "Jogadores acompanham pelo celular em tempo real",
        "Dados D&D (d4, d6, d8, d10, d12, d20) integrados",
        "Convite por link para jogadores",
        "Interface dark mode otimizada para mesa",
      ],
      availableOnDevice: "Web Browser, Mobile Browser",
      softwareVersion: "1.0",
      inLanguage: ["pt-BR", "en"],
    },
  };

  return (
    <div className="min-h-screen flex flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdOrganization) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdWebPage) }}
      />
      <Navbar brand="Pocket DM" brandHref="/" />

      <main className="flex-1 pt-[72px]">
        <article className="max-w-3xl mx-auto px-6 py-16">
          {/* Answer-first: IAs extraem dos primeiros 30% */}
          <h1 className="font-display text-3xl md:text-4xl text-gold mb-6">
            Sobre o Pocket DM
          </h1>

          <p className="text-lg text-foreground/90 mb-8 leading-relaxed">
            <strong>Pocket DM é o rastreador de combate gratuito para D&D 5e</strong>,
            projetado especificamente para mesas presenciais de RPG. O mestre gerencia
            iniciativa, HP, condições e turnos na tela — e cada jogador acompanha em
            tempo real no próprio celular, sem instalar nada.
          </p>

          <div className="space-y-12 text-foreground/80 leading-relaxed">
            {/* Seção: O que é */}
            <section>
              <h2 className="font-display text-xl text-gold/90 mb-3">
                O que é o Pocket DM?
              </h2>
              <p>
                Pocket DM é uma ferramenta web (PWA) que resolve o problema mais comum
                de mestres de D&D 5e: gerenciar combate sem perder o ritmo da sessão.
                Em vez de fichas de papel, planilhas ou apps complexos, o Pocket DM
                oferece uma interface simples e rápida que funciona direto no navegador.
              </p>
              <p className="mt-3">
                Com um bestiário de <strong>3.000+ monstros</strong>, catálogo de{" "}
                <strong>900+ magias</strong>, música ambiente integrada e dados
                virtuais (d4 ao d20), o Pocket DM tem tudo que um mestre precisa na
                mesa — sem a complexidade de um VTT (Virtual Tabletop).
              </p>
            </section>

            {/* Seção: Para quem */}
            <section>
              <h2 className="font-display text-xl text-gold/90 mb-3">
                Para quem é?
              </h2>
              <ul className="space-y-2 ml-4">
                <li className="flex items-start gap-2">
                  <span className="text-gold mt-1">&#9670;</span>
                  <span>
                    <strong>Mestres de D&D 5e</strong> que jogam presencialmente e
                    querem gerenciar combate sem papel
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-gold mt-1">&#9670;</span>
                  <span>
                    <strong>Jogadores</strong> que querem acompanhar o combate no
                    celular em tempo real, sem instalar app
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-gold mt-1">&#9670;</span>
                  <span>
                    <strong>Mestres iniciantes</strong> que precisam de uma ferramenta
                    simples para começar a mestrar
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-gold mt-1">&#9670;</span>
                  <span>
                    <strong>Mestres profissionais</strong> que querem uma interface
                    premium para suas sessões pagas
                  </span>
                </li>
              </ul>
            </section>

            {/* Seção: Diferencial */}
            <section>
              <h2 className="font-display text-xl text-gold/90 mb-3">
                O que diferencia o Pocket DM?
              </h2>
              <p>
                Enquanto a maioria das ferramentas de RPG digital foca em mesas
                remotas (VTTs como Roll20 e Foundry VTT), o Pocket DM foi construído
                para <strong>mesas presenciais</strong>. Não é um substituto do
                tabuleiro — é o complemento digital que faltava na sua mesa.
              </p>
              <ul className="mt-4 space-y-2 ml-4">
                <li className="flex items-start gap-2">
                  <span className="text-gold mt-1">&#9670;</span>
                  <span>
                    <strong>Zero fricção</strong> — jogadores entram pelo link, sem
                    cadastro, sem download
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-gold mt-1">&#9670;</span>
                  <span>
                    <strong>Tempo real</strong> — tudo sincroniza via WebSocket entre
                    mestre e jogadores
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-gold mt-1">&#9670;</span>
                  <span>
                    <strong>Gratuito de verdade</strong> — modo visitante completo sem
                    cartão de crédito
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-gold mt-1">&#9670;</span>
                  <span>
                    <strong>Bilíngue</strong> — interface em Português e Inglês
                  </span>
                </li>
              </ul>
            </section>

            {/* Seção: Tecnologia */}
            <section>
              <h2 className="font-display text-xl text-gold/90 mb-3">
                Tecnologia
              </h2>
              <p>
                Pocket DM é construído com Next.js 15, Supabase (Postgres + Realtime),
                TypeScript e Tailwind CSS. A arquitetura é otimizada para performance
                mobile e sincronização em tempo real, com ISR (Incremental Static
                Regeneration) para páginas de conteúdo como o bestiário e catálogo de
                magias.
              </p>
            </section>

            {/* Seção: Origem */}
            <section>
              <h2 className="font-display text-xl text-gold/90 mb-3">
                Feito no Brasil
              </h2>
              <p>
                Pocket DM nasceu da frustração de um mestre de RPG brasileiro que
                queria uma ferramenta simples para suas sessões presenciais de D&D 5e.
                Nenhuma das ferramentas disponíveis focava no que realmente importa na
                mesa: velocidade, simplicidade e zero barreiras de entrada para os
                jogadores.
              </p>
              <p className="mt-3">
                Disponível em <strong>pocketdm.com.br</strong> e{" "}
                <strong>pocketdm.app</strong>.
              </p>
            </section>

            {/* CTA */}
            <div className="flex flex-wrap gap-4 pt-4">
              <Link
                href="/try"
                className="bg-gold text-surface-primary font-semibold px-6 py-3 rounded-lg hover:shadow-gold-glow hover:-translate-y-[1px] transition-all duration-200 text-sm"
              >
                Testar Grátis →
              </Link>
              <Link
                href="/faq"
                className="border border-white/10 text-foreground/80 font-medium px-6 py-3 rounded-lg hover:border-white/20 hover:text-foreground transition-all duration-200 text-sm"
              >
                Perguntas Frequentes
              </Link>
            </div>
          </div>
        </article>
      </main>

      <Footer />
    </div>
  );
}
