import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/marketing/Footer";
import { AnimatedCounter } from "@/components/marketing/AnimatedCounter";
import { HeroParticles } from "@/components/marketing/HeroParticles";
import { LandingPageTracker } from "@/components/analytics/LandingPageTracker";
import { LpPricingSection } from "@/components/marketing/LpPricingSection";
import { Button } from "@/components/ui/button";

// ── Inline SVG primitives ────────────────────────────────────────────────────
function ArrowRight({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function UserIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <circle cx="8" cy="5.5" r="2.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M2.5 13.5c0-2.485 2.462-4.5 5.5-4.5s5.5 2.015 5.5 4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function SparkleIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
      <path d="M12 2L13.5 9.5L21 12L13.5 14.5L12 22L10.5 14.5L3 12L10.5 9.5L12 2Z" stroke="currentColor" strokeWidth="1.5" fill="none" />
    </svg>
  );
}

// D4 — tetrahedron (triangle)
function D4Icon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
      <polygon points="24,6 44,42 4,42" stroke="currentColor" strokeWidth="1.8" fill="none" opacity="0.6" />
      <line x1="24" y1="6" x2="24" y2="42" stroke="currentColor" strokeWidth="1.2" opacity="0.3" />
      <text x="24" y="34" textAnchor="middle" fill="currentColor" fontSize="11" fontWeight="700" fontFamily="monospace" opacity="0.7">4</text>
    </svg>
  );
}

// D6 — isometric cube
function D6Icon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
      {/* Top face */}
      <polygon points="24,6 40,16 24,26 8,16" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.5" />
      {/* Left face */}
      <polygon points="8,16 24,26 24,42 8,32" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.6" />
      {/* Right face */}
      <polygon points="40,16 24,26 24,42 40,32" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.4" />
    </svg>
  );
}

// D8 — octahedron (diamond)
function D8Icon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
      <polygon points="24,4 44,24 24,44 4,24" stroke="currentColor" strokeWidth="1.8" fill="none" opacity="0.6" />
      <line x1="4" y1="24" x2="44" y2="24" stroke="currentColor" strokeWidth="1.2" opacity="0.3" />
      <line x1="24" y1="4" x2="24" y2="44" stroke="currentColor" strokeWidth="1.2" opacity="0.3" />
      <text x="24" y="28" textAnchor="middle" fill="currentColor" fontSize="11" fontWeight="700" fontFamily="monospace" opacity="0.7">8</text>
    </svg>
  );
}

// D10 — trapezohedron (elongated diamond with facets)
function D10Icon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
      {/* Outer diamond */}
      <polygon points="24,2 44,22 24,46 4,22" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.6" />
      {/* Upper facet lines */}
      <line x1="24" y1="2" x2="14" y2="22" stroke="currentColor" strokeWidth="1" opacity="0.3" />
      <line x1="24" y1="2" x2="34" y2="22" stroke="currentColor" strokeWidth="1" opacity="0.3" />
      {/* Mid belt */}
      <polyline points="4,22 14,22 24,26 34,22 44,22" stroke="currentColor" strokeWidth="1" fill="none" opacity="0.35" />
      {/* Lower facet lines */}
      <line x1="24" y1="46" x2="14" y2="22" stroke="currentColor" strokeWidth="1" opacity="0.25" />
      <line x1="24" y1="46" x2="34" y2="22" stroke="currentColor" strokeWidth="1" opacity="0.25" />
    </svg>
  );
}


function D20Icon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
      {/* Outer silhouette — irregular pentagon (3D perspective) */}
      <polygon points="32,2 58,18 52,56 12,56 6,18" stroke="currentColor" strokeWidth="1.8" fill="none" opacity="0.6" />
      {/* Top face — front triangle */}
      <polygon points="32,2 6,18 58,18" stroke="currentColor" strokeWidth="1.2" fill="none" opacity="0.35" />
      {/* Upper-left facet */}
      <line x1="6" y1="18" x2="32" y2="34" stroke="currentColor" strokeWidth="1.2" opacity="0.3" />
      {/* Upper-right facet */}
      <line x1="58" y1="18" x2="32" y2="34" stroke="currentColor" strokeWidth="1.2" opacity="0.3" />
      {/* Lower-left facet */}
      <line x1="12" y1="56" x2="32" y2="34" stroke="currentColor" strokeWidth="1.2" opacity="0.3" />
      {/* Lower-right facet */}
      <line x1="52" y1="56" x2="32" y2="34" stroke="currentColor" strokeWidth="1.2" opacity="0.3" />
      {/* Bottom edge to center */}
      <line x1="6" y1="18" x2="12" y2="56" stroke="currentColor" strokeWidth="1.2" opacity="0.25" />
      <line x1="58" y1="18" x2="52" y2="56" stroke="currentColor" strokeWidth="1.2" opacity="0.25" />
    </svg>
  );
}


export const metadata = {
  title: "Pocket DM — D&D 5e Combat Tracker",
  description:
    "O combat tracker definitivo para mestres de D&D 5e. Iniciativa, HP, condições e oráculo de magias — tudo em tempo real para você e seus jogadores. Grátis.",
};

// ── Hero ─────────────────────────────────────────────────────────────────────
function HeroSection() {
  return (
    <section data-section="hero" className="relative min-h-dvh flex items-center justify-center px-6 pt-[72px] overflow-hidden">
      {/* Background photo */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <Image
          src="/art/decorations/hero-figurines-map.jpg"
          alt=""
          fill
          className="object-cover object-center opacity-[0.18]"
          priority
          unoptimized
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/60 to-background" />
      </div>

      {/* Floating particles */}
      <HeroParticles />

      {/* Radial glows */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-gold/[0.07] rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-cool/[0.05] rounded-full blur-[100px]" />
      </div>

      <div className="relative max-w-3xl mx-auto text-center space-y-5">
        {/* Crown d20 Logo */}
        <div className="animate-fade-in flex flex-col items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/art/brand/logo-icon.svg"
            alt="Pocket DM"
            className="w-20 h-20 sm:w-24 sm:h-24 drop-shadow-[0_0_24px_rgba(212,168,83,0.35)] glow-pulse"
            width={96}
            height={96}
          />
          <span className="font-display text-gold text-lg sm:text-xl tracking-[0.15em] uppercase font-bold">Pocket DM</span>
          <span className="text-gold/40 text-xs sm:text-sm italic font-light tracking-[0.15em] -mt-1">Master your table.</span>
        </div>

        {/* Live badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.06] border border-white/[0.08] text-xs text-muted-foreground animate-fade-in">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          SRD 5.1 &amp; 5.2 Compendium — 2014 &amp; 2024 Rules
        </div>

        {/* Headline */}
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-display text-foreground leading-[1.1] tracking-tight animate-fade-in-up">
          Domine o combate.
          <br />
          <span className="text-gold drop-shadow-[0_0_20px_rgba(212,168,83,0.3)]">
            Abandone o papel.
          </span>
        </h1>

        {/* Subheading */}
        <p className="text-base sm:text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
          O combat tracker definitivo para D&D 5e. Iniciativa, HP e condições em tempo real — tudo no celular dos seus jogadores.
        </p>

        {/* CTAs */}
        <div className="flex flex-col items-center gap-3 pt-4 animate-fade-in-up w-full max-w-md mx-auto" style={{ animationDelay: "0.2s" }}>
          {/* Primary escape-hatch — elongated, full width */}
          <Link
            href="/try"
            className="group relative overflow-hidden w-full py-3 bg-white/[0.06] text-foreground font-medium text-base rounded-lg border border-white/[0.10] hover:bg-white/[0.10] hover:border-gold/30 hover:text-gold transition-all duration-[200ms] min-h-[48px] inline-flex items-center justify-center gap-2 btn-shimmer"
          >
            Começar Agora (Grátis)
            <ArrowRight className="w-4 h-4 opacity-60 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-200" />
          </Link>

          {/* Secondary row */}
          <div className="flex items-center gap-3 w-full">
            <Link
              href="/auth/sign-up"
              className="group relative overflow-hidden flex-1 px-6 py-3 bg-gold text-surface-primary font-semibold text-sm rounded-lg hover:shadow-gold-glow hover:-translate-y-[2px] active:translate-y-0 transition-all duration-[200ms] min-h-[44px] inline-flex items-center justify-center gap-1.5 btn-shimmer"
            >
              <SparkleIcon className="w-3.5 h-3.5 opacity-70 group-hover:opacity-100 group-hover:scale-125 transition-all duration-200" />
              Salvar minhas campanhas
            </Link>
            <Link
              href="/auth/login"
              className="group px-6 py-3 bg-white/[0.04] text-muted-foreground font-medium text-sm rounded-lg border border-white/[0.07] hover:bg-white/[0.08] hover:text-foreground transition-all duration-[200ms] min-h-[44px] inline-flex items-center gap-1.5"
            >
              <UserIcon className="w-3.5 h-3.5 opacity-60 group-hover:opacity-90 transition-opacity duration-200" />
              Já tenho conta
            </Link>
          </div>
        </div>

        {/* Stats strip */}
        <div className="flex items-center justify-center gap-0 pt-2 animate-fade-in" style={{ animationDelay: "0.35s" }}>
          {[
            { value: 3037, label: "monstros" },
            { value: 935, label: "magias" },
          ].map((stat, i) => (
            <React.Fragment key={stat.label}>
              {i > 0 && <div className="w-px h-7 bg-white/[0.08] mx-5" />}
              <div className="text-center">
                <div className="text-gold font-mono font-bold text-sm leading-none">
                  <AnimatedCounter target={stat.value} duration={2200} />
                </div>
                <div className="text-muted-foreground text-[10px] mt-0.5 tracking-wide uppercase">{stat.label}</div>
              </div>
            </React.Fragment>
          ))}
          <div className="w-px h-7 bg-white/[0.08] mx-5" />
          <div className="text-center">
            <div className="text-gold font-mono font-bold text-sm leading-none">∞</div>
            <div className="text-muted-foreground text-[10px] mt-0.5 tracking-wide uppercase">comece grátis</div>
          </div>
        </div>


      </div>
    </section>
  );
}

// ── Section Divider ───────────────────────────────────────────────────────────
function SectionDivider() {
  return (
    <div className="flex justify-center items-center gap-4 py-4" aria-hidden="true">
      <div className="h-px w-24 bg-gradient-to-r from-transparent via-gold/20 to-gold/20" />
      {/* SVG d6 diamond ornament */}
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-gold/30">
        <path d="M8 1L15 8L8 15L1 8L8 1Z" stroke="currentColor" strokeWidth="1" fill="rgba(212,168,83,0.08)" />
        <circle cx="8" cy="8" r="1.5" fill="currentColor" opacity="0.6" />
      </svg>
      <div className="h-px w-24 bg-gradient-to-l from-transparent via-gold/20 to-gold/20" />
    </div>
  );
}

// ── Features ─────────────────────────────────────────────────────────────────
function FeaturesSection() {
  const features = [
    {
      emoji: "⚔️",
      tag: null,
      title: "Combat Tracker Completo",
      description:
        "Iniciativa automática, HP com temp HP, 13 condições D&D, derrota, adicionar/remover combatentes no meio do combate.",
    },
    {
      emoji: "📱",
      tag: "Popular",
      title: "Player View em Tempo Real",
      description:
        "Gere um link. Jogadores abrem no celular. Sem conta, sem app, sem fricção. Tudo atualiza ao vivo.",
    },
    {
      emoji: "🔮",
      tag: null,
      title: "Oráculo de Magias & Monstros",
      description:
        "Busca instantânea em 3000+ monstros e 900+ magias. Stat blocks inline, descrições de magia em modal. Funciona offline.",
    },
    {
      emoji: "📖",
      tag: "Único",
      title: "Regras 2014 & 2024",
      description:
        "Alterne entre as versões de regras por monstro instantaneamente, no meio do combate, sem reiniciar o encontro.",
    },
    {
      emoji: "💾",
      tag: null,
      title: "Salvar & Retomar",
      description:
        "Fechou o navegador? Sem problema. O encontro persiste automaticamente. Retome de onde parou.",
    },
    {
      emoji: "🌙",
      tag: null,
      title: "Dark Mode RPG",
      description:
        "Interface escura com toques dourados. Feita para sessões noturnas sem cansar a vista.",
    },
  ];

  return (
    <section data-section="features" className="py-24 px-6 relative overflow-hidden" id="features">
      {/* Decorative layer — floating RPG dice */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[500px] h-[500px] bg-gold/[0.04] rounded-full blur-[120px]" />

        {/* d20 — top-right */}
        <D20Icon className="absolute top-10 right-10 w-24 h-24 text-gold/20 float-drift-3" style={{ animationDelay: "-1s" }} />
        <SparkleIcon className="absolute bottom-16 left-16 w-10 h-10 text-gold/20 float-gentle" />

        {/* d4 — top-left */}
        <D4Icon className="absolute top-8 left-[8%] w-16 h-16 text-gold/15 float-drift-1" />

        {/* d6 — mid-right */}
        <D6Icon className="absolute top-1/3 right-[5%] w-14 h-14 text-gold/12 float-drift-2" />

        {/* d8 — bottom-right */}
        <D8Icon className="absolute bottom-12 right-[12%] w-16 h-16 text-gold/15 float-drift-3" />

        {/* d10 — mid-left */}
        <D10Icon className="absolute top-[55%] left-[3%] w-14 h-14 text-gold/12 float-drift-4" />

        {/* Extra sparkles */}
        <SparkleIcon className="absolute top-[20%] right-[25%] w-7 h-7 text-gold/15 float-drift-1" style={{ animationDelay: "-1.5s" }} />
        <SparkleIcon className="absolute bottom-[30%] left-[20%] w-8 h-8 text-gold/12 float-drift-3" style={{ animationDelay: "-3s" }} />
      </div>

      <div className="relative max-w-5xl mx-auto">
        <div className="text-center mb-16 animate-fade-in">
          <h2 className="text-3xl sm:text-4xl font-display text-foreground mb-4">
            Tudo o que o Mestre precisa
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            De iniciativa a pontos de vida, de condições a oráculo de magias.
            Uma ferramenta focada no que importa.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <div
              key={f.title}
              className="relative bg-card border border-border rounded-xl p-6 hover:border-gold/30 hover:shadow-card transition-all duration-[200ms] group animate-fade-in-up"
              style={{ animationDelay: `${i * 0.07}s` }}
            >
              {f.tag && (
                <span className="absolute top-4 right-4 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-gold/10 text-gold border border-gold/20">
                  {f.tag}
                </span>
              )}
              <div className="w-14 h-14 mb-4 rounded-xl bg-gradient-to-br from-gold/15 to-gold/5 border border-gold/20 flex items-center justify-center text-2xl group-hover:border-gold/50 group-hover:from-gold/25 group-hover:scale-110 transition-all duration-[200ms]">
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

// ── Social Proof ─────────────────────────────────────────────────────────────
function SocialProofSection() {
  const testimonials = [
    {
      quote: "Finalmente algo feito para quem mestra na mesa, não num monitor. Meus jogadores adoram acompanhar pelo celular.",
      author: "Mestre há 8 anos",
      role: "Campanha semanal, 5 jogadores",
    },
    {
      quote: "Eu usava Roll20 só pelo tracker e odiava a lentidão. Pocket DM resolve em 30 segundos o que demorava 5 minutos.",
      author: "DM veterano",
      role: "Migrou do Roll20",
    },
    {
      quote: "O oráculo de magias salvou minha vida. Consultar magia no meio do combate sem perder o ritmo é game changer.",
      author: "Mestra iniciante",
      role: "Primeira campanha DMando",
    },
  ];

  return (
    <section data-section="social-proof" className="py-24 px-6 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-1/3 right-1/4 w-[400px] h-[400px] bg-cool/[0.03] rounded-full blur-[120px]" />
      </div>

      <div className="relative max-w-5xl mx-auto">
        <div className="text-center mb-14 animate-fade-in">
          <h2 className="text-3xl sm:text-4xl font-display text-foreground mb-4">
            O que mestres estão dizendo
          </h2>
          <p className="text-muted-foreground text-sm">
            Feedback real de quem usa na mesa toda semana.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <div
              key={i}
              className="relative bg-card border border-border rounded-xl p-6 h-full flex flex-col animate-fade-in-up"
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              {/* Quote mark */}
              <svg width="28" height="21" viewBox="0 0 32 24" fill="none" className="text-gold/20 mb-4 shrink-0" aria-hidden="true">
                <path d="M0 24V14.4C0 5.33 5.33 1.07 12 0l1.33 3.73C8.53 5.07 7.07 8.53 6.93 12H12v12H0zm18 0V14.4C18 5.33 23.33 1.07 30 0l1.33 3.73C26.53 5.07 25.07 8.53 24.93 12H30v12H18z" fill="currentColor" />
              </svg>
              <p className="text-foreground/80 text-sm leading-relaxed flex-1 italic">
                &ldquo;{t.quote}&rdquo;
              </p>
              <div className="mt-4 pt-4 border-t border-white/[0.06]">
                <p className="text-sm font-medium text-foreground">{t.author}</p>
                <p className="text-xs text-muted-foreground">{t.role}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── How It Works ──────────────────────────────────────────────────────────────
function StepCircle({ number }: { number: string }) {
  return (
    <div className="relative w-14 h-14 shrink-0">
      <svg width="56" height="56" viewBox="0 0 56 56" className="overflow-visible" aria-hidden="true">
        <circle cx="28" cy="28" r="26" fill="#161622" />
        <circle cx="28" cy="28" r="26" fill="rgba(212,168,83,0.07)" stroke="rgba(212,168,83,0.3)" strokeWidth="1.5" />
        <circle
          cx="28" cy="28" r="26"
          fill="none"
          stroke="rgba(212,168,83,0.15)"
          strokeWidth="1"
          strokeDasharray="5 7"
          className="animate-spin-slow"
          style={{ transformOrigin: "28px 28px" }}
        />
        <text x="28" y="35" textAnchor="middle" fill="#D4A853" fontSize="14" fontFamily="'JetBrains Mono', monospace" fontWeight="700">
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
      emoji: "🗺️",
      title: "Crie o Encontro",
      description: "Busque no compendium completo, adicione NPCs custom, carregue sua campanha salva.",
      time: "~1 min",
    },
    {
      number: "02",
      emoji: "🎲",
      title: "Role Iniciativa",
      description: "Insira os valores, ordene automaticamente, resolva empates com dragndrop.",
      time: "~30 seg",
    },
    {
      number: "03",
      emoji: "🔗",
      title: "Compartilhe o Link",
      description: "Gere o link da sessão. Jogadores abrem no celular — sem conta necessária.",
      time: "~10 seg",
    },
    {
      number: "04",
      emoji: "⚔️",
      title: "Mestre o Combate",
      description:
        "Avance turnos, aplique dano e gerencie condições. Seus jogadores veem as atualizações ao vivo.",
      time: "ao vivo",
    },
  ];

  return (
    <section data-section="how-it-works" id="como-funciona" className="py-24 px-6 bg-surface-secondary/50 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-cool/[0.04] rounded-full blur-[100px]" />
        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: "linear-gradient(rgba(212,168,83,1) 1px, transparent 1px), linear-gradient(90deg, rgba(212,168,83,1) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
      </div>

      <div className="relative max-w-5xl mx-auto">
        <div className="text-center mb-16 animate-fade-in">
          <h2 className="text-3xl sm:text-4xl font-display text-foreground mb-4">
            Como funciona
          </h2>
          <p className="text-muted-foreground">4 passos. 3 minutos. Zero setup.</p>
        </div>

        {/* Desktop: horizontal flow */}
        <div className="hidden md:block relative">
          {/* ── Flowing SVG connector between all steps ── */}
          <svg
            className="absolute top-0 left-0 w-full h-14 pointer-events-none z-10"
            viewBox="0 0 1000 56"
            preserveAspectRatio="none"
            fill="none"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="flow-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#D4A853" stopOpacity="0.08" />
                <stop offset="12%" stopColor="#D4A853" stopOpacity="0.5" />
                <stop offset="50%" stopColor="#D4A853" stopOpacity="0.65" />
                <stop offset="88%" stopColor="#D4A853" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#D4A853" stopOpacity="0.08" />
              </linearGradient>
              <filter id="particle-glow">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="trail-glow">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Background path — faint static guide */}
            <path
              d="M 125,28 C 208,10 292,46 375,28 C 458,10 542,46 625,28 C 708,10 792,46 875,28"
              stroke="rgba(212,168,83,0.15)"
              strokeWidth="2"
            />

            {/* Animated dashed path — flowing energy */}
            <path
              d="M 125,28 C 208,10 292,46 375,28 C 458,10 542,46 625,28 C 708,10 792,46 875,28"
              stroke="url(#flow-grad)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray="14 14"
              className="animate-flow-dash"
            />

            {/* Glow trail — wider, softer duplicate for ambient glow */}
            <path
              d="M 125,28 C 208,10 292,46 375,28 C 458,10 542,46 625,28 C 708,10 792,46 875,28"
              stroke="rgba(212,168,83,0.1)"
              strokeWidth="10"
              strokeLinecap="round"
              filter="url(#trail-glow)"
            />

            {/* Particle 1 — large, bright */}
            <circle r="4" fill="#D4A853" opacity="0.9" filter="url(#particle-glow)">
              <animateMotion
                dur="3s"
                repeatCount="indefinite"
                path="M 125,28 C 208,10 292,46 375,28 C 458,10 542,46 625,28 C 708,10 792,46 875,28"
              />
            </circle>

            {/* Particle 2 — medium, offset */}
            <circle r="3" fill="#D4A853" opacity="0.65" filter="url(#particle-glow)">
              <animateMotion
                dur="3s"
                begin="1s"
                repeatCount="indefinite"
                path="M 125,28 C 208,10 292,46 375,28 C 458,10 542,46 625,28 C 708,10 792,46 875,28"
              />
            </circle>

            {/* Particle 3 — small, subtle */}
            <circle r="2.5" fill="#D4A853" opacity="0.45" filter="url(#particle-glow)">
              <animateMotion
                dur="3s"
                begin="2s"
                repeatCount="indefinite"
                path="M 125,28 C 208,10 292,46 375,28 C 458,10 542,46 625,28 C 708,10 792,46 875,28"
              />
            </circle>

            {/* Arrow chevrons at each destination step */}
            {[375, 625, 875].map((x) => (
              <path
                key={x}
                d={`M ${x - 8},22 L ${x},28 L ${x - 8},34`}
                stroke="rgba(212,168,83,0.3)"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            ))}
          </svg>

          {/* Step cards */}
          <div className="relative z-20 flex items-start gap-0">
            {steps.map((s, i) => (
              <div
                key={s.number}
                className="flex-1 flex flex-col items-center text-center group animate-fade-in-up px-4"
                style={{ animationDelay: `${i * 0.12}s` }}
              >
                {/* Step circle + emoji */}
                <div className="relative mb-3">
                  <StepCircle number={s.number} />
                  <span className="absolute -bottom-2 -right-2 text-lg leading-none">{s.emoji}</span>
                </div>
                {/* Time badge */}
                <span className="text-[10px] font-mono text-gold/60 uppercase tracking-widest mb-2">
                  {s.time}
                </span>
                <h3 className="font-display text-foreground text-base mb-1 group-hover:text-gold transition-colors duration-200">
                  {s.title}
                </h3>
                <p className="text-muted-foreground text-xs leading-relaxed max-w-[160px]">
                  {s.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Mobile: vertical cards */}
        <div className="md:hidden grid grid-cols-1 gap-6">
          {steps.map((s, i) => (
            <div
              key={s.number}
              className="flex gap-5 group animate-fade-in-up"
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              <div className="relative shrink-0">
                <StepCircle number={s.number} />
                <span className="absolute -bottom-1 -right-1 text-base leading-none">{s.emoji}</span>
              </div>
              <div className="pt-2">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-display text-foreground text-lg group-hover:text-gold transition-colors duration-200">
                    {s.title}
                  </h3>
                  <span className="text-[10px] font-mono text-gold/50 uppercase tracking-wider">
                    {s.time}
                  </span>
                </div>
                <p className="text-muted-foreground text-sm leading-relaxed">{s.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA after steps */}
        <div className="text-center mt-12">
          <Button variant="gold" size="lg" asChild>
            <Link href="/try">
              Começar Agora — é Grátis
            </Link>
          </Button>
          <p className="text-muted-foreground text-sm mt-3">
            Sem cadastro necessário
          </p>
        </div>
      </div>
    </section>
  );
}

// ── Comparison ────────────────────────────────────────────────────────────────
type CellValue =
  | { type: "check"; label: string }
  | { type: "cross"; label: string }
  | { type: "partial"; label: string };

function CompCell({ val, highlight }: { val: CellValue; highlight?: boolean }) {
  const iconColor = highlight ? "#D4A853" : "rgba(255,255,255,0.16)";
  const textClass = highlight && val.type === "check"
    ? "text-white font-medium text-sm leading-snug"
    : "text-white/45 text-sm leading-snug";

  return (
    <div className="flex items-center gap-2.5 py-5">
      {val.type === "check" && (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="shrink-0">
          <circle cx="9" cy="9" r="8.25" stroke={iconColor} strokeWidth="1.5" />
          <path d="M5.5 9l2.5 2.5 4.5-5" stroke={iconColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
      {val.type === "cross" && (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="shrink-0">
          <circle cx="9" cy="9" r="8.25" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />
          <path d="M6.5 6.5l5 5M11.5 6.5l-5 5" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      )}
      {val.type === "partial" && (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="shrink-0">
          <circle cx="9" cy="9" r="8.25" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />
          <path d="M5.5 9h7" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      )}
      <span className={textClass}>{val.label}</span>
    </div>
  );
}

function ComparisonSection() {
  const rows: {
    icon: string;
    feature: string;
    roll20: CellValue;
    beyond: CellValue;
    pocketdm: CellValue;
    knockout?: boolean;
  }[] = [
      {
        icon: "⚔️",
        feature: "Combat tracker",
        roll20: { type: "partial", label: "Pesado" },
        beyond: { type: "partial", label: "Básico" },
        pocketdm: { type: "check", label: "Otimizado para mestrar" },
      },
      {
        icon: "📱",
        feature: "Player view no celular",
        roll20: { type: "cross", label: "Requer app + conta" },
        beyond: { type: "cross", label: "Indisponível" },
        pocketdm: { type: "check", label: "Link direto, zero conta" },
      },
      {
        icon: "🎯",
        feature: "Foco na Mesa Física",
        roll20: { type: "cross", label: "Online-first" },
        beyond: { type: "cross", label: "Digital-first" },
        pocketdm: { type: "check", label: "Pensado para a mesa real" },
      },
      {
        icon: "📚",
        feature: "Compendium 2014 + 2024",
        roll20: { type: "partial", label: "Módulo pago" },
        beyond: { type: "partial", label: "Pago" },
        pocketdm: { type: "check", label: "Grátis, sempre atualizado" },
      },
      {
        icon: "💰",
        feature: "Preço",
        roll20: { type: "cross", label: "$5–50/mês" },
        beyond: { type: "cross", label: "$6/mês" },
        pocketdm: { type: "check", label: "Comece grátis" },
        knockout: true,
      },
    ];

  return (
    // Darker "stage" bg — breaks visual monotony from the rest of the page
    <section data-section="comparison" id="comparativo" className="py-24 px-6 relative overflow-hidden bg-[#0c0c16]">
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-gold/[0.025] rounded-full blur-[140px]" />
      </div>

      <div className="relative max-w-4xl mx-auto">
        <div className="text-center mb-14 animate-fade-in">
          <h2 className="text-3xl sm:text-4xl font-display text-foreground mb-4">
            Feito para a mesa, não para a tela
          </h2>
          <p className="text-muted-foreground text-sm max-w-lg mx-auto leading-relaxed">
            VTTs são para o online. Quem mestra <span className="text-foreground font-medium">presencialmente</span> merece algo pensado pra isso.
          </p>
        </div>

        {/* ── Desktop table (hidden on mobile) ── */}
        <div
          className="hidden md:block overflow-hidden rounded-2xl animate-fade-in-up"
          style={{
            background: "#181825",
            border: "1px solid rgba(255,255,255,0.12)",
            boxShadow: "0 0 0 1px rgba(212,168,83,0.08), 0 32px 80px rgba(0,0,0,0.5)",
            animationDelay: "0.1s",
          }}
        >
          {/* Column headers */}
          <div className="grid grid-cols-[1.3fr_1fr_1fr_1.15fr]">
            <div className="px-7 py-6 border-b border-white/[0.10]" />
            <div className="px-6 py-6 text-center border-b border-l border-white/[0.10]">
              <span className="text-[11px] font-semibold text-white/50 uppercase tracking-widest">
                Roll20 / Foundry
              </span>
            </div>
            <div className="px-6 py-6 text-center border-b border-l border-white/[0.10]">
              <span className="text-[11px] font-semibold text-white/50 uppercase tracking-widest">
                D&amp;D Beyond
              </span>
            </div>
            {/* TdM header */}
            <div
              className="px-6 py-5 text-center border-b border-l border-l-gold/20 border-b-gold/15 flex flex-col items-center gap-2"
              style={{
                background: "rgba(212,168,83,0.09)",
                borderTop: "2px solid rgba(212,168,83,0.65)",
              }}
            >
              <span className="text-[11px] font-bold text-gold uppercase tracking-widest">
                🏆 Pocket DM
              </span>
              <span className="text-[9px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-gold/15 text-gold/80 border border-gold/25">
                Recomendado
              </span>
            </div>
          </div>

          {/* Data rows */}
          {rows.map((row, i) => {
            const isLast = i === rows.length - 1;
            const isEven = i % 2 === 0;
            return (
              <div
                key={row.feature}
                className={`grid grid-cols-[1.3fr_1fr_1fr_1.15fr] group transition-all duration-200 hover:bg-white/[0.05] ${row.knockout ? "border-t-2 border-t-gold/25" : ""}`}
                style={{ background: row.knockout ? "rgba(212,168,83,0.06)" : isEven ? "transparent" : "rgba(255,255,255,0.025)" }}
              >
                <div className={`px-7 py-1 flex items-center gap-3 transition-colors duration-200 ${isLast ? "" : "border-b border-white/[0.07]"}`}>
                  <span className="text-xl leading-none shrink-0">{row.icon}</span>
                  <span className="text-[15px] font-semibold text-white/90">{row.feature}</span>
                </div>
                <div className={`px-6 border-l border-white/[0.07] transition-colors duration-200 ${isLast ? "" : "border-b"}`}>
                  <CompCell val={row.roll20} />
                </div>
                <div className={`px-6 border-l border-white/[0.07] transition-colors duration-200 ${isLast ? "" : "border-b"}`}>
                  <CompCell val={row.beyond} />
                </div>
                <div
                  className={`px-6 border-l border-l-gold/20 group-hover:brightness-125 transition-all duration-200 ${isLast ? "" : "border-b border-b-gold/15"}`}
                  style={{ background: row.knockout ? "rgba(212,168,83,0.14)" : "rgba(212,168,83,0.09)" }}
                >
                  <CompCell val={row.pocketdm} highlight />
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Mobile cards (hidden on desktop) ── */}
        <div className="md:hidden flex flex-col gap-3 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
          {rows.map((row) => (
            <div
              key={row.feature}
              className={`rounded-xl overflow-hidden ${row.knockout ? "ring-1 ring-gold/30" : ""}`}
              style={{
                background: "#13131f",
                border: "1px solid rgba(255,255,255,0.07)",
              }}
            >
              {/* Feature header */}
              <div className={`px-5 py-4 flex items-center gap-3 ${row.knockout ? "bg-gold/[0.06]" : "bg-white/[0.02]"}`}>
                <span className="text-xl leading-none shrink-0">{row.icon}</span>
                <span className="text-[15px] font-semibold text-white/90">{row.feature}</span>
              </div>
              {/* Competitor rows */}
              <div className="divide-y divide-white/[0.04]">
                <div className="px-5 py-3 flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-white/30 uppercase tracking-wider">Roll20</span>
                  <CompCell val={row.roll20} />
                </div>
                <div className="px-5 py-3 flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-white/30 uppercase tracking-wider">D&amp;D Beyond</span>
                  <CompCell val={row.beyond} />
                </div>
                <div
                  className="px-5 py-3 flex items-center justify-between"
                  style={{
                    background: row.knockout ? "rgba(212,168,83,0.12)" : "rgba(212,168,83,0.07)",
                    borderTop: "1px solid rgba(212,168,83,0.15)",
                  }}
                >
                  <span className="text-[11px] font-bold text-gold/80 uppercase tracking-wider">Pocket DM</span>
                  <CompCell val={row.pocketdm} highlight />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-7 text-center">
          <p className="text-xs text-white/20 italic">
            Desenvolvido por mestres para mestres. Não viemos para substituir o seu VTT, mas para libertar sua mesa.
          </p>
        </div>
      </div>
    </section>
  );
}

// ── Social Proof ─────────────────────────────────────────────────────────────
// ── Final CTA ─────────────────────────────────────────────────────────────────
function FinalCtaSection() {
  return (
    <section data-section="final-cta" className="py-24 px-6 relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-gold/[0.06] rounded-full blur-[100px]" />
      </div>



      <div className="relative max-w-2xl mx-auto text-center space-y-6 animate-fade-in-up">
        {/* Ornament */}
        <div className="flex justify-center mb-2">
          <svg width="48" height="24" viewBox="0 0 48 24" fill="none" aria-hidden="true">
            <path d="M4 12h40M20 4l4 8-4 8M28 4l4 8-4 8" stroke="rgba(212,168,83,0.3)" strokeWidth="1" strokeLinecap="round" />
          </svg>
        </div>

        <h2 className="text-3xl sm:text-4xl font-display text-foreground">
          Pronto para mestrar{" "}
          <span className="text-gold drop-shadow-[0_0_16px_rgba(212,168,83,0.4)]">melhor</span>?
        </h2>
        <p className="text-muted-foreground text-lg">
          Crie sua conta em segundos e transforme sua próxima sessão.
        </p>

        <div className="flex flex-col items-center gap-3 pt-2">
          <Link
            href="/auth/sign-up"
            className="group relative overflow-hidden inline-flex items-center gap-2.5 px-10 py-4 bg-gold text-surface-primary font-semibold text-lg rounded-lg hover:shadow-gold-glow-lg hover:-translate-y-[2px] active:translate-y-0 transition-all duration-[200ms] min-h-[52px] btn-shimmer"
          >
            <SparkleIcon className="w-5 h-5 opacity-70 group-hover:opacity-100 group-hover:scale-125 transition-all duration-200" />
            Começar Agora — é Grátis
            <ArrowRight className="w-5 h-5 opacity-70 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-200" />
          </Link>
          <div className="flex items-center justify-center gap-4 text-sm">
            <Link
              href="/try"
              className="text-muted-foreground hover:text-foreground underline-offset-4 hover:underline transition-colors inline-flex items-center gap-1"
            >
              Testar sem conta
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <span className="text-white/20">|</span>
            <Link
              href="/pricing"
              className="text-gold hover:text-gold/80 underline-offset-4 hover:underline transition-colors inline-flex items-center gap-1"
            >
              Ver planos Pro
            </Link>
            <span className="text-white/20">|</span>
            <Link
              href="/auth/login"
              className="text-muted-foreground hover:text-foreground underline-offset-4 hover:underline transition-colors inline-flex items-center gap-1"
            >
              Já tenho conta
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar
        brand="Pocket DM"
        brandHref="/"
        links={[
          { href: "#features", label: "Features" },
          { href: "#como-funciona", label: "Como Funciona" },
          { href: "#comparativo", label: "Comparativo" },
          { href: "#precos", label: "Preços" },
        ]}
        rightSlot={
          <>
            <Link
              href="/auth/login"
              className="group text-muted-foreground hover:text-foreground transition-all duration-[200ms] min-h-[44px] inline-flex items-center gap-1.5 text-sm"
            >
              <UserIcon className="w-3.5 h-3.5 opacity-60 group-hover:opacity-90 transition-opacity duration-200" />
              Login
            </Link>
            <Link
              href="/auth/sign-up"
              className="group bg-gold text-surface-primary font-semibold px-4 rounded-lg min-h-[44px] inline-flex items-center gap-1.5 text-sm hover:shadow-gold-glow hover:-translate-y-[1px] active:translate-y-0 transition-all duration-[200ms]"
            >
              <SparkleIcon className="w-3.5 h-3.5 opacity-70 group-hover:opacity-100 group-hover:scale-125 transition-all duration-200" />
              Começar Grátis
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
      <SocialProofSection />
      <SectionDivider />
      <LpPricingSection />
      <SectionDivider />
      <FinalCtaSection />

      <LandingPageTracker />
      <Footer />
    </div>
  );
}
