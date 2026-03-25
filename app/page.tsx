import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/marketing/Footer";

// ── Inline SVG icons ────────────────────────────────────────────────────────
function D20Icon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <polygon points="32,4 60,20 60,44 32,60 4,44 4,20" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.6"/>
      <polygon points="32,4 60,20 32,28" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.4"/>
      <polygon points="32,4 4,20 32,28" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.4"/>
      <polygon points="60,20 60,44 32,28" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.4"/>
      <polygon points="4,20 4,44 32,28" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.4"/>
      <polygon points="60,44 32,60 32,28" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.4"/>
      <polygon points="4,44 32,60 32,28" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.4"/>
      <text x="32" y="37" textAnchor="middle" fill="currentColor" fontSize="13" fontWeight="700" fontFamily="monospace" opacity="0.8">20</text>
    </svg>
  );
}

function SparkleIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
      <path d="M12 2L13.5 9.5L21 12L13.5 14.5L12 22L10.5 14.5L3 12L10.5 9.5L12 2Z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
    </svg>
  );
}

export const metadata = {
  title: "Taverna do Mestre — D&D 5e Combat Tracker",
  description:
    "O combat tracker definitivo para mestres de D&D 5e. Iniciativa, HP, condições, oráculo de magias — tudo em tempo real com seus jogadores. Grátis.",
};

function HeroSection() {
  return (
    <section className="relative min-h-dvh flex items-center justify-center px-6 pt-[72px] overflow-hidden">
      {/* Full-bleed RPG hero photo background */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <Image
          src="/art/decorations/hero-figurines-map.jpg"
          alt=""
          fill
          className="object-cover object-center opacity-[0.18]"
          priority
          unoptimized
        />
        {/* Dark gradient overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/60 to-background" />
      </div>

      {/* Decorative radials on top of hero image */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-gold/[0.07] rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-cool/[0.05] rounded-full blur-[100px]" />
      </div>

      <div className="relative max-w-3xl mx-auto text-center space-y-8">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.06] border border-white/[0.08] text-xs text-muted-foreground">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          SRD 5.1 + 5.2 — 2014 & 2024 Rules
        </div>

        {/* Heading */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-display text-foreground leading-[1.1] tracking-tight">
          Mestre seu combate.{" "}
          <span className="text-gold drop-shadow-[0_0_20px_rgba(212,168,83,0.3)]">
            Nao o papel.
          </span>
        </h1>

        {/* Subheading */}
        <p className="text-lg sm:text-xl text-muted-foreground max-w-xl mx-auto leading-relaxed">
          Tracker de combate D&D 5e com iniciativa, HP, condicoes e oraculo de
          magias — tudo em tempo real no celular dos seus jogadores.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Link
            href="/auth/sign-up"
            className="px-8 py-3 bg-gold text-surface-primary font-semibold text-base rounded-lg hover:shadow-gold-glow hover:-translate-y-[1px] transition-all duration-[250ms] min-h-[48px] inline-flex items-center"
          >
            Criar Conta Gratis
          </Link>
          <Link
            href="/auth/login"
            className="px-8 py-3 bg-white/[0.06] text-foreground font-medium text-base rounded-lg border border-white/[0.08] hover:bg-white/[0.1] transition-all duration-[250ms] min-h-[48px] inline-flex items-center"
          >
            Ja tenho conta
          </Link>
        </div>

        {/* Social proof */}
        <p className="text-xs text-muted-foreground pt-4">
          334 monstros + 319 magias do SRD. Gratis para sempre.
        </p>
      </div>
    </section>
  );
}

function SectionDivider() {
  return (
    <div className="flex justify-center items-center gap-4 py-4" aria-hidden="true">
      <div className="h-px w-16 bg-gradient-to-r from-transparent to-gold/20" />
      <Image
        src="/art/icons/mvp-crown.png"
        alt=""
        width={24}
        height={24}
        className="pixel-art opacity-30"
        unoptimized
      />
      <div className="h-px w-16 bg-gradient-to-l from-transparent to-gold/20" />
    </div>
  );
}

function FeaturesSection() {
  const features = [
    {
      emoji: "⚔️",
      title: "Combat Tracker Completo",
      description:
        "Iniciativa automatica, HP com temp HP, 13 condicoes D&D, derrota, adicionar/remover combatentes no meio do combate.",
    },
    {
      emoji: "📱",
      title: "Player View em Tempo Real",
      description:
        "Gere um link. Jogadores abrem no celular. Sem conta, sem app, sem friccao. Tudo atualiza ao vivo.",
    },
    {
      emoji: "🔮",
      title: "Oraculo de Magias & Monstros",
      description:
        "Busca instantanea no SRD 5.1 e 5.2. Stat blocks inline, descricoes de magia em modal. Funciona offline.",
    },
    {
      emoji: "📖",
      title: "2014 & 2024 Side-by-Side",
      description:
        "Troque a versao de regras por monstro, no meio do combate. Sem reiniciar o encontro.",
    },
    {
      emoji: "💾",
      title: "Salvar & Retomar",
      description:
        "Fechou o navegador? Sem problema. O encontro persiste automaticamente. Retome de onde parou.",
    },
    {
      emoji: "🌙",
      title: "Dark Mode RPG",
      description:
        "Interface escura com toques dourados. Feita para sessoes noturnas sem cansar a vista.",
    },
  ];

  return (
    <section className="py-24 px-6 relative overflow-hidden" id="features">
      {/* Decorative background SVG blobs */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[500px] h-[500px] bg-gold/[0.04] rounded-full blur-[120px]" />
        <D20Icon className="absolute top-12 right-12 w-32 h-32 text-gold/[0.06] animate-spin-slow" />
        <SparkleIcon className="absolute bottom-16 left-16 w-10 h-10 text-gold/[0.12] float-gentle" />
        <SparkleIcon className="absolute top-24 left-1/3 w-6 h-6 text-gold/[0.08] float-gentle" style={{ animationDelay: "1.5s" }} />
      </div>

      <div className="relative max-w-5xl mx-auto">
        <div className="text-center mb-16 animate-fade-in">
          <h2 className="text-3xl sm:text-4xl font-display text-foreground mb-4">
            Tudo que o Mestre precisa
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            De iniciativa a temp HP, de condicoes a oraculo de magias.
            Uma ferramenta, zero distracao.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <div
              key={f.title}
              className="bg-card border border-border rounded-xl p-6 hover:border-gold/30 hover:shadow-card transition-all duration-[250ms] group animate-fade-in-up"
              style={{ animationDelay: `${i * 0.08}s` }}
            >
              {/* Emoji icon in styled container */}
              <div className="w-14 h-14 mb-4 rounded-xl bg-gradient-to-br from-gold/15 to-gold/5 border border-gold/20 flex items-center justify-center text-2xl group-hover:border-gold/45 group-hover:from-gold/25 group-hover:scale-110 transition-all duration-[250ms]">
                {f.emoji}
              </div>
              <h3 className="font-display text-foreground text-lg mb-2">{f.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function StepCircle({ number, delay }: { number: string; delay: number }) {
  return (
    <div className="shrink-0 relative w-14 h-14" style={{ animationDelay: `${delay}s` }}>
      <svg width="56" height="56" viewBox="0 0 56 56" className="overflow-visible" aria-hidden="true">
        {/* Solid ring */}
        <circle cx="28" cy="28" r="26" fill="rgba(212,168,83,0.07)" stroke="rgba(212,168,83,0.25)" strokeWidth="1.5" />
        {/* Animated dashed ring */}
        <circle
          cx="28" cy="28" r="26"
          fill="none"
          stroke="rgba(212,168,83,0.18)"
          strokeWidth="1"
          strokeDasharray="6 8"
          className="animate-spin-slow"
          style={{ transformOrigin: "28px 28px" }}
        />
        {/* Number */}
        <text
          x="28" y="35"
          textAnchor="middle"
          fill="#D4A853"
          fontSize="15"
          fontFamily="'Courier New', monospace"
          fontWeight="700"
        >
          {number}
        </text>
      </svg>
    </div>
  );
}

function HowItWorksSection() {
  const steps = [
    {
      number: "01",
      title: "Crie o Encontro",
      description: "Busque monstros do SRD, adicione NPCs custom, carregue sua campanha salva.",
    },
    {
      number: "02",
      title: "Role Iniciativa",
      description: "Insira os valores, ordene automaticamente, resolva empates com drag-and-drop.",
    },
    {
      number: "03",
      title: "Compartilhe o Link",
      description: "Gere o link da sessao. Jogadores abrem no celular — sem conta necessaria.",
    },
    {
      number: "04",
      title: "Mestre o Combate",
      description: "Avance turnos, aplique dano/cura, adicione condicoes. Jogadores veem tudo ao vivo.",
    },
  ];

  return (
    <section className="py-24 px-6 bg-surface-secondary/50 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-cool/[0.04] rounded-full blur-[100px]" />
        <SparkleIcon className="absolute bottom-12 right-1/4 w-8 h-8 text-gold/[0.10] float-gentle" style={{ animationDelay: "0.8s" }} />
      </div>

      <div className="relative max-w-4xl mx-auto">
        <div className="text-center mb-16 animate-fade-in">
          <h2 className="text-3xl sm:text-4xl font-display text-foreground mb-4">
            Como funciona
          </h2>
          <p className="text-muted-foreground">4 passos. 3 minutos. Zero setup.</p>
        </div>

        <div className="grid sm:grid-cols-2 gap-x-12 gap-y-10">
          {steps.map((s, i) => (
            <div
              key={s.number}
              className="flex gap-5 group animate-fade-in-up"
              style={{ animationDelay: `${0.1 + i * 0.12}s` }}
            >
              <StepCircle number={s.number} delay={i * 0.15} />
              <div className="pt-2">
                <h3 className="font-display text-foreground text-lg mb-1 group-hover:text-gold transition-colors duration-[250ms]">
                  {s.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{s.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ComparisonSection() {
  return (
    <section className="py-24 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-display text-foreground mb-4">
            Por que nao usar o que ja existe?
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="pb-3 pr-6 text-muted-foreground font-medium">Feature</th>
                <th className="pb-3 pr-6 text-muted-foreground font-medium">Roll20 / Foundry</th>
                <th className="pb-3 pr-6 text-muted-foreground font-medium">D&D Beyond</th>
                <th className="pb-3 text-gold font-semibold">Taverna do Mestre</th>
              </tr>
            </thead>
            <tbody className="text-muted-foreground">
              <tr className="border-b border-white/[0.04]">
                <td className="py-3 pr-6 text-foreground">Combat tracker tempo real</td>
                <td className="py-3 pr-6">Sim (VTT completo)</td>
                <td className="py-3 pr-6">Basico</td>
                <td className="py-3 text-gold">Sim, otimizado</td>
              </tr>
              <tr className="border-b border-white/[0.04]">
                <td className="py-3 pr-6 text-foreground">Player view no celular</td>
                <td className="py-3 pr-6">Precisa conta + app</td>
                <td className="py-3 pr-6">Nao</td>
                <td className="py-3 text-gold">Link direto, zero conta</td>
              </tr>
              <tr className="border-b border-white/[0.04]">
                <td className="py-3 pr-6 text-foreground">Otimizado para mesa fisica</td>
                <td className="py-3 pr-6">Nao (feito para online)</td>
                <td className="py-3 pr-6">Parcial</td>
                <td className="py-3 text-gold">Sim, e o foco</td>
              </tr>
              <tr className="border-b border-white/[0.04]">
                <td className="py-3 pr-6 text-foreground">SRD 2014 + 2024</td>
                <td className="py-3 pr-6">Depende do modulo</td>
                <td className="py-3 pr-6">Sim (pago)</td>
                <td className="py-3 text-gold">Sim, gratis</td>
              </tr>
              <tr>
                <td className="py-3 pr-6 text-foreground">Preco</td>
                <td className="py-3 pr-6">$5-50/mes</td>
                <td className="py-3 pr-6">$6/mes</td>
                <td className="py-3 text-gold font-semibold">Gratis</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function FinalCtaSection() {
  return (
    <section className="py-24 px-6 relative overflow-hidden">
      {/* Decorative chibi */}
      <div className="absolute right-8 bottom-8 hidden lg:block opacity-10" aria-hidden="true">
        <Image
          src="/art/decorations/chibi-rogue.png"
          alt=""
          width={120}
          height={160}
          className="pixel-art"
          unoptimized
        />
      </div>

      <div className="relative max-w-2xl mx-auto text-center space-y-6">
        <h2 className="text-3xl sm:text-4xl font-display text-foreground">
          Pronto para mestrar{" "}
          <span className="text-gold">melhor</span>?
        </h2>
        <p className="text-muted-foreground text-lg">
          Crie sua conta em 30 segundos. Seu proximo combate vai ser diferente.
        </p>
        <Link
          href="/auth/sign-up"
          className="inline-flex items-center px-10 py-4 bg-gold text-surface-primary font-semibold text-lg rounded-lg hover:shadow-gold-glow-lg hover:-translate-y-[1px] transition-all duration-[250ms] min-h-[52px]"
        >
          Comecar Agora — e Gratis
        </Link>
      </div>
    </section>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar
        brand="Taverna do Mestre"
        brandHref="/"
        links={[
          { href: "#features", label: "Features" },
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
              href="/auth/sign-up"
              className="bg-gold text-surface-primary font-semibold px-4 rounded-lg min-h-[44px] inline-flex items-center text-sm hover:shadow-gold-glow hover:-translate-y-[1px] transition-all duration-[250ms]"
            >
              Criar Conta
            </Link>
          </>
        }
      />

      <HeroSection />
      <SectionDivider />
      <FeaturesSection />
      <SectionDivider />
      <HowItWorksSection />
      <SectionDivider />
      <ComparisonSection />
      <FinalCtaSection />

      <Footer />
    </div>
  );
}
