import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/marketing/Footer";

// ── Inline SVG primitives ────────────────────────────────────────────────────
function ArrowRight({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function UserIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <circle cx="8" cy="5.5" r="2.5" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M2.5 13.5c0-2.485 2.462-4.5 5.5-4.5s5.5 2.015 5.5 4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
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


export const metadata = {
  title: "Taverna do Mestre — D&D 5e Combat Tracker",
  description:
    "O combat tracker definitivo para mestres de D&D 5e. Iniciativa, HP, condições, oráculo de magias — tudo em tempo real com seus jogadores. Grátis.",
};

// ── Hero ─────────────────────────────────────────────────────────────────────
function HeroSection() {
  return (
    <section className="relative min-h-dvh flex items-center justify-center px-6 pt-[72px] overflow-hidden">
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

      {/* Radial glows */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-gold/[0.07] rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-cool/[0.05] rounded-full blur-[100px]" />
      </div>

      <div className="relative max-w-3xl mx-auto text-center space-y-8">
        {/* Live badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.06] border border-white/[0.08] text-xs text-muted-foreground animate-fade-in">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          SRD 5.1 + 5.2 — 2014 &amp; 2024 Rules
        </div>

        {/* Headline */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-display text-foreground leading-[1.1] tracking-tight animate-fade-in-up">
          Domine o combate.{" "}
          <span className="text-gold drop-shadow-[0_0_20px_rgba(212,168,83,0.3)]">
            Abandone o papel.
          </span>
        </h1>

        {/* Subheading */}
        <p className="text-lg sm:text-xl text-muted-foreground max-w-xl mx-auto leading-relaxed animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
          Tracker de combate D&amp;D 5e com iniciativa, HP, condições e oráculo de
          magias — tudo em tempo real no celular dos seus jogadores.
        </p>

        {/* CTAs */}
        <div className="flex flex-col items-center gap-3 pt-4 animate-fade-in-up w-full max-w-md mx-auto" style={{ animationDelay: "0.2s" }}>
          {/* Primary escape-hatch — elongated, full width */}
          <Link
            href="/try"
            className="group w-full py-3 bg-white/[0.06] text-foreground font-medium text-base rounded-lg border border-white/[0.10] hover:bg-white/[0.10] hover:border-gold/30 hover:text-gold transition-all duration-[200ms] min-h-[48px] inline-flex items-center justify-center gap-2"
          >
            Experimentar agora (Grátis)
            <ArrowRight className="w-4 h-4 opacity-60 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-200" />
          </Link>

          {/* Secondary row */}
          <div className="flex items-center gap-3 w-full">
            <Link
              href="/auth/sign-up"
              className="group flex-1 px-6 py-3 bg-gold text-surface-primary font-semibold text-sm rounded-lg hover:shadow-gold-glow hover:-translate-y-[2px] active:translate-y-0 transition-all duration-[200ms] min-h-[44px] inline-flex items-center justify-center gap-1.5"
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
            { value: "334", label: "monstros SRD" },
            { value: "319", label: "magias SRD" },
            { value: "∞", label: "gratis para sempre" },
          ].map((stat, i) => (
            <React.Fragment key={stat.label}>
              {i > 0 && <div className="w-px h-7 bg-white/[0.08] mx-5" />}
              <div className="text-center">
                <div className="text-gold font-mono font-bold text-sm leading-none">{stat.value}</div>
                <div className="text-muted-foreground text-[10px] mt-0.5 tracking-wide uppercase">{stat.label}</div>
              </div>
            </React.Fragment>
          ))}
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
        <path d="M8 1L15 8L8 15L1 8L8 1Z" stroke="currentColor" strokeWidth="1" fill="rgba(212,168,83,0.08)"/>
        <circle cx="8" cy="8" r="1.5" fill="currentColor" opacity="0.6"/>
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
        "Busca instantânea no SRD 5.1 e 5.2. Stat blocks inline, descrições de magia em modal. Funciona offline.",
    },
    {
      emoji: "📖",
      tag: "Único",
      title: "2014 & 2024 Side-by-Side",
      description:
        "Troque a versão de regras por monstro, no meio do combate. Sem reiniciar o encontro.",
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
    <section className="py-24 px-6 relative overflow-hidden" id="features">
      {/* Decorative layer */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[500px] h-[500px] bg-gold/[0.04] rounded-full blur-[120px]" />
        <D20Icon className="absolute top-10 right-10 w-28 h-28 text-gold/[0.06] animate-spin-slow" />
        <SparkleIcon className="absolute bottom-16 left-16 w-10 h-10 text-gold/[0.10] float-gentle" />
      </div>

      <div className="relative max-w-5xl mx-auto">
        <div className="text-center mb-16 animate-fade-in">
          <h2 className="text-3xl sm:text-4xl font-display text-foreground mb-4">
            Tudo que o Mestre precisa
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            De iniciativa a temp HP, de condições a oráculo de magias.
            Uma ferramenta, zero distração.
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

// ── How It Works ──────────────────────────────────────────────────────────────
function StepCircle({ number }: { number: string }) {
  return (
    <div className="relative w-14 h-14 shrink-0">
      <svg width="56" height="56" viewBox="0 0 56 56" className="overflow-visible" aria-hidden="true">
        <circle cx="28" cy="28" r="26" fill="rgba(212,168,83,0.07)" stroke="rgba(212,168,83,0.3)" strokeWidth="1.5"/>
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
      description: "Busque monstros do SRD, adicione NPCs custom, carregue sua campanha salva.",
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
      description: "Avance turnos, aplique dano/cura, adicione condições. Jogadores veem tudo ao vivo.",
      time: "ao vivo",
    },
  ];

  return (
    <section id="como-funciona" className="py-24 px-6 bg-surface-secondary/50 relative overflow-hidden">
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
        <div className="hidden md:flex items-start gap-0">
          {steps.map((s, i) => (
            <React.Fragment key={s.number}>
              <div
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

              {/* Arrow connector between steps */}
              {i < steps.length - 1 && (
                <div className="flex items-start pt-6 shrink-0" aria-hidden="true">
                  <svg width="40" height="20" viewBox="0 0 40 20" fill="none">
                    <path
                      d="M2 10 Q10 10 20 10 Q30 10 36 10M32 6l4 4-4 4"
                      stroke="rgba(212,168,83,0.25)"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeDasharray="4 3"
                    />
                  </svg>
                </div>
              )}
            </React.Fragment>
          ))}
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
    : "text-white/25 text-sm leading-snug";

  return (
    <div className="flex items-center gap-2.5 py-[18px]">
      {val.type === "check" && (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="shrink-0">
          <circle cx="9" cy="9" r="8.25" stroke={iconColor} strokeWidth="1.5"/>
          <path d="M5.5 9l2.5 2.5 4.5-5" stroke={iconColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )}
      {val.type === "cross" && (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="shrink-0">
          <circle cx="9" cy="9" r="8.25" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5"/>
          <path d="M6.5 6.5l5 5M11.5 6.5l-5 5" stroke="rgba(255,255,255,0.10)" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      )}
      {val.type === "partial" && (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="shrink-0">
          <circle cx="9" cy="9" r="8.25" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5"/>
          <path d="M5.5 9h7" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" strokeLinecap="round"/>
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
    taverna: CellValue;
  }[] = [
    {
      icon: "⚔️",
      feature: "Combat tracker",
      roll20: { type: "partial", label: "VTT completo, mas pesado" },
      beyond: { type: "partial", label: "Básico, limitado" },
      taverna: { type: "check", label: "Otimizado para mestrar" },
    },
    {
      icon: "📱",
      feature: "Player view no celular",
      roll20: { type: "cross", label: "App obrigatorio + conta" },
      beyond: { type: "cross", label: "Nao disponivel" },
      taverna: { type: "check", label: "Link direto, zero conta" },
    },
    {
      icon: "🎯",
      feature: "Mesa fisica first",
      roll20: { type: "cross", label: "Feito para VTT online" },
      beyond: { type: "cross", label: "Digital first" },
      taverna: { type: "check", label: "E o foco principal" },
    },
    {
      icon: "📚",
      feature: "SRD 2014 + 2024",
      roll20: { type: "partial", label: "Depende de módulo pago" },
      beyond: { type: "partial", label: "Disponível (pago)" },
      taverna: { type: "check", label: "Grátis, sempre" },
    },
    {
      icon: "💰",
      feature: "Preço",
      roll20: { type: "cross", label: "$5–50/mês" },
      beyond: { type: "cross", label: "$6/mês" },
      taverna: { type: "check", label: "Grátis para sempre" },
    },
  ];

  return (
    // Darker "stage" bg — breaks visual monotony from the rest of the page
    <section id="comparativo" className="py-24 px-6 relative overflow-hidden bg-[#0c0c16]">
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-gold/[0.025] rounded-full blur-[140px]" />
      </div>

      <div className="relative max-w-4xl mx-auto">
        <div className="text-center mb-14 animate-fade-in">
          <h2 className="text-3xl sm:text-4xl font-display text-foreground mb-4">
            Por que não usar o que já existe?
          </h2>
          <p className="text-muted-foreground text-sm max-w-md mx-auto leading-relaxed">
            Roll20 e Foundry são VTTs poderosos. D&amp;D Beyond é uma enciclopédia digital.
            Nenhum foi feito para a{" "}
            <span className="text-foreground font-medium">mesa física</span>.
          </p>
        </div>

        {/* Table card — its own surface, contrasting with the section bg */}
        <div
          className="overflow-hidden rounded-2xl animate-fade-in-up"
          style={{
            background: "#13131f",
            border: "1px solid rgba(255,255,255,0.07)",
            boxShadow: "0 0 0 1px rgba(212,168,83,0.05), 0 32px 80px rgba(0,0,0,0.6)",
            animationDelay: "0.1s",
          }}
        >
          {/* Column headers */}
          <div className="grid grid-cols-[1.3fr_1fr_1fr_1.15fr]">
            <div className="px-7 py-5 border-b border-white/[0.06]" />
            <div className="px-6 py-5 text-center border-b border-l border-white/[0.06]">
              <span className="text-[11px] font-semibold text-white/20 uppercase tracking-widest">
                Roll20 / Foundry
              </span>
            </div>
            <div className="px-6 py-5 text-center border-b border-l border-white/[0.06]">
              <span className="text-[11px] font-semibold text-white/20 uppercase tracking-widest">
                D&amp;D Beyond
              </span>
            </div>
            {/* TdM header: 3 signals — top border gradient + tinted bg + badge */}
            <div
              className="px-6 py-4 text-center border-b border-l border-l-gold/20 border-b-gold/15 flex flex-col items-center gap-2"
              style={{
                background: "rgba(212,168,83,0.09)",
                borderTop: "2px solid rgba(212,168,83,0.65)",
              }}
            >
              <span className="text-[11px] font-bold text-gold uppercase tracking-widest">
                🏆 Taverna do Mestre
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
                className="grid grid-cols-[1.3fr_1fr_1fr_1.15fr] group transition-colors duration-150"
                style={{ background: isEven ? "transparent" : "rgba(255,255,255,0.016)" }}
              >
                <div className={`px-7 flex items-center gap-3 group-hover:bg-white/[0.02] transition-colors duration-150 ${isLast ? "" : "border-b border-white/[0.04]"}`}>
                  <span className="text-xl leading-none shrink-0">{row.icon}</span>
                  <span className="text-sm font-semibold text-white/70">{row.feature}</span>
                </div>
                <div className={`px-6 border-l border-white/[0.04] group-hover:bg-white/[0.02] transition-colors duration-150 ${isLast ? "" : "border-b"}`}>
                  <CompCell val={row.roll20} />
                </div>
                <div className={`px-6 border-l border-white/[0.04] group-hover:bg-white/[0.02] transition-colors duration-150 ${isLast ? "" : "border-b"}`}>
                  <CompCell val={row.beyond} />
                </div>
                <div
                  className={`px-6 border-l border-l-gold/15 group-hover:brightness-110 transition-all duration-150 ${isLast ? "" : "border-b border-b-gold/10"}`}
                  style={{ background: "rgba(212,168,83,0.07)" }}
                >
                  <CompCell val={row.taverna} highlight />
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-7 text-center">
          <p className="text-xs text-white/20 italic">
            Construído para mestres de mesa física. Não precisamos competir com VTTs — somos outra coisa.
          </p>
        </div>
      </div>
    </section>
  );
}

// ── Final CTA ─────────────────────────────────────────────────────────────────
function FinalCtaSection() {
  return (
    <section className="py-24 px-6 relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-gold/[0.06] rounded-full blur-[100px]" />
      </div>

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

      <div className="relative max-w-2xl mx-auto text-center space-y-6 animate-fade-in-up">
        {/* Ornament */}
        <div className="flex justify-center mb-2">
          <svg width="48" height="24" viewBox="0 0 48 24" fill="none" aria-hidden="true">
            <path d="M4 12h40M20 4l4 8-4 8M28 4l4 8-4 8" stroke="rgba(212,168,83,0.3)" strokeWidth="1" strokeLinecap="round"/>
          </svg>
        </div>

        <h2 className="text-3xl sm:text-4xl font-display text-foreground">
          Pronto para mestrar{" "}
          <span className="text-gold drop-shadow-[0_0_16px_rgba(212,168,83,0.4)]">melhor</span>?
        </h2>
        <p className="text-muted-foreground text-lg">
          Crie sua conta em 30 segundos. Seu próximo combate vai ser diferente.
        </p>

        <div className="flex flex-col items-center gap-3 pt-2">
          <Link
            href="/auth/sign-up"
            className="group inline-flex items-center gap-2.5 px-10 py-4 bg-gold text-surface-primary font-semibold text-lg rounded-lg hover:shadow-gold-glow-lg hover:-translate-y-[2px] active:translate-y-0 transition-all duration-[200ms] min-h-[52px]"
          >
            <SparkleIcon className="w-5 h-5 opacity-70 group-hover:opacity-100 group-hover:scale-125 transition-all duration-200" />
            Começar Agora — é Grátis
            <ArrowRight className="w-5 h-5 opacity-70 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-200" />
          </Link>
          <Link
            href="/try"
            className="text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline transition-colors inline-flex items-center gap-1"
          >
            Ou teste agora sem criar conta
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
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
        brand="Taverna do Mestre"
        brandHref="/"
        links={[
          { href: "#features", label: "Features" },
          { href: "#como-funciona", label: "Como Funciona" },
          { href: "#comparativo", label: "Comparativo" },
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
