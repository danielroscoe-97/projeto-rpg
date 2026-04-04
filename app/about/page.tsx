import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/marketing/Footer";

export const metadata: Metadata = {
  title: "Sobre — Combat Tracker Gratuito para D&D 5e",
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
        "Bestiário SRD completo + monstros do compêndio Monster a Day",
        "Catálogo completo de magias SRD",
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
        {/* Hero section */}
        <div className="relative overflow-hidden">
          {/* Decorative background glow */}
          <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gold/[0.04] rounded-full blur-[100px]" />
          </div>

          <article className="relative max-w-3xl mx-auto px-6 pt-16 pb-8">
            {/* Logo + title */}
            <div className="flex items-center gap-3 mb-8">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/art/brand/logo-icon.svg"
                alt=""
                width={40}
                height={40}
                className="opacity-90 drop-shadow-[0_0_10px_rgba(212,168,83,0.4)]"
                aria-hidden="true"
              />
              <h1 className="font-display text-3xl md:text-4xl text-gold">
                Sobre o Pocket DM
              </h1>
            </div>

            <p className="text-lg text-foreground/90 mb-4 leading-relaxed max-w-2xl">
              <strong>Pocket DM é o rastreador de combate gratuito para D&D 5e</strong>,
              projetado especificamente para mesas presenciais de RPG. O mestre gerencia
              iniciativa, HP, condições e turnos na tela — e cada jogador acompanha em
              tempo real no próprio celular, sem instalar nada.
            </p>

            {/* Decorative divider */}
            <div className="flex items-center gap-3 my-10">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gold/20 to-transparent" />
              <span className="text-gold/40 text-xs">&#9670; &#9670; &#9670;</span>
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gold/20 to-transparent" />
            </div>
          </article>
        </div>

        {/* Content sections */}
        <div className="max-w-3xl mx-auto px-6 pb-16">
          <div className="space-y-10">
            {/* O que é */}
            <section className="rounded-xl border border-white/[0.06] bg-white/[0.015] p-6 md:p-8">
              <h2 className="font-display text-xl text-gold/90 mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-gold/10 flex items-center justify-center text-gold text-sm">
                  &#9733;
                </span>
                O que é o Pocket DM?
              </h2>
              <p className="text-foreground/75 leading-relaxed">
                Pocket DM é uma ferramenta web (PWA) que resolve o problema mais comum
                de mestres de D&D 5e: gerenciar combate sem perder o ritmo da sessão.
                Em vez de fichas de papel, planilhas ou apps complexos, o Pocket DM
                oferece uma interface simples e rápida que funciona direto no navegador.
              </p>
              <p className="mt-3 text-foreground/75 leading-relaxed">
                Com o <strong className="text-foreground/90">bestiário SRD completo</strong> e monstros do{" "}
                <strong className="text-foreground/90">compêndio Monster a Day</strong>, catálogo completo de{" "}
                <strong className="text-foreground/90">magias SRD</strong>, música ambiente integrada e dados
                virtuais (d4 ao d20), o Pocket DM tem tudo que um mestre precisa na
                mesa — sem a complexidade de um VTT (Virtual Tabletop).
              </p>
            </section>

            {/* Para quem é */}
            <section className="rounded-xl border border-white/[0.06] bg-white/[0.015] p-6 md:p-8">
              <h2 className="font-display text-xl text-gold/90 mb-5 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-gold/10 flex items-center justify-center text-gold text-sm">
                  &#9812;
                </span>
                Para quem é?
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  { title: "Mestres de D&D 5e", desc: "Jogam presencialmente e querem gerenciar combate sem papel" },
                  { title: "Jogadores", desc: "Acompanham o combate no celular em tempo real, sem instalar app" },
                  { title: "Mestres iniciantes", desc: "Precisam de uma ferramenta simples para começar a mestrar" },
                  { title: "Mestres profissionais", desc: "Querem uma interface premium para suas sessões pagas" },
                ].map((item) => (
                  <div key={item.title} className="rounded-lg border border-white/[0.05] bg-white/[0.02] p-4 hover:border-gold/20 transition-colors duration-300">
                    <div className="flex items-start gap-2">
                      <span className="text-gold text-xs mt-0.5">&#9670;</span>
                      <div>
                        <p className="text-foreground/90 font-medium text-sm">{item.title}</p>
                        <p className="text-foreground/60 text-sm mt-0.5">{item.desc}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Diferencial */}
            <section className="rounded-xl border border-white/[0.06] bg-white/[0.015] p-6 md:p-8">
              <h2 className="font-display text-xl text-gold/90 mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-gold/10 flex items-center justify-center text-gold text-sm">
                  &#9889;
                </span>
                O que diferencia o Pocket DM?
              </h2>
              <p className="text-foreground/75 leading-relaxed mb-5">
                Enquanto a maioria das ferramentas de RPG digital foca em mesas
                remotas (VTTs como Roll20 e Foundry VTT), o Pocket DM foi construído
                para <strong className="text-foreground/90">mesas presenciais</strong>. Não é um substituto do
                tabuleiro — é o complemento digital que faltava na sua mesa.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  { title: "Zero fricção", desc: "Jogadores entram pelo link, sem cadastro, sem download" },
                  { title: "Tempo real", desc: "Tudo sincroniza via WebSocket entre mestre e jogadores" },
                  { title: "Gratuito de verdade", desc: "Modo visitante completo sem cartão de crédito" },
                  { title: "Bilíngue", desc: "Interface em Português e Inglês" },
                ].map((item) => (
                  <div key={item.title} className="flex items-start gap-2.5 p-3 rounded-lg bg-white/[0.02]">
                    <span className="text-gold text-xs mt-0.5">&#9670;</span>
                    <div>
                      <p className="text-foreground/90 font-medium text-sm">{item.title}</p>
                      <p className="text-foreground/55 text-sm mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Feito no Brasil */}
            <section className="rounded-xl border border-gold/10 bg-gradient-to-br from-gold/[0.03] to-transparent p-6 md:p-8">
              <h2 className="font-display text-xl text-gold/90 mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-gold/10 flex items-center justify-center text-gold text-sm">
                  &#9829;
                </span>
                Feito no Brasil
              </h2>
              <p className="text-foreground/75 leading-relaxed">
                Pocket DM nasceu da frustração de um mestre de RPG brasileiro que
                queria uma ferramenta simples para suas sessões presenciais de D&D 5e.
                Nenhuma das ferramentas disponíveis focava no que realmente importa na
                mesa: velocidade, simplicidade e zero barreiras de entrada para os
                jogadores.
              </p>
              <p className="mt-3 text-foreground/60 text-sm">
                Disponível em <strong className="text-foreground/80">pocketdm.com.br</strong>
              </p>
            </section>

            {/* CTA */}
            <div className="flex flex-wrap gap-4 pt-2 justify-center">
              <Link
                href="/try"
                className="bg-gold text-surface-primary font-semibold px-8 py-3.5 rounded-lg hover:shadow-gold-glow hover:-translate-y-[1px] transition-all duration-200 text-sm"
              >
                Testar Grátis →
              </Link>
              <Link
                href="/faq"
                className="border border-white/10 text-foreground/80 font-medium px-8 py-3.5 rounded-lg hover:border-white/20 hover:text-foreground transition-all duration-200 text-sm"
              >
                Perguntas Frequentes
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
