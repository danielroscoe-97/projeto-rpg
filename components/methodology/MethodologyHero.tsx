import React from "react";
import Image from "next/image";
import Link from "next/link";
import { HeroParticles } from "@/components/marketing/HeroParticles";
import { AnimatedCounter } from "@/components/marketing/AnimatedCounter";
import { BronzeBadge, SilverBadge, GoldBadge, SpecialBadge } from "@/components/methodology/TitleBadges";

interface ContribData {
  total_combats: number;
  rated_combats: number;
  is_researcher: boolean;
}

interface Props {
  variant: "publico" | "logado";
  displayName?: string;
  contrib?: ContribData;
  uniqueDms?: number;
  children?: React.ReactNode;
}

interface TitleInfo {
  badge: React.ComponentType<{ className?: string }>;
  name: string;
  colorClass: string;
  glowClass: string;
}

function getCurrentTitle(contrib: ContribData | undefined): TitleInfo | null {
  if (!contrib) return null;
  const { total_combats, rated_combats } = contrib;
  // NOTE: Spec requires 100+ combats AND 20+ spell votes for Arquiteto do Meta,
  // but spell voting is not yet active ("Em breve"). Using rated_combats only until then.
  if (rated_combats >= 100)
    return {
      badge: SpecialBadge,
      name: "Arquiteto do Meta",
      colorClass: "text-purple-400",
      glowClass: "shadow-[0_0_24px_rgba(168,85,247,0.25)]",
    };
  if (rated_combats >= 50)
    return {
      badge: GoldBadge,
      name: "Pesquisador Pocket DM",
      colorClass: "text-gold",
      glowClass: "shadow-[0_0_24px_rgba(212,168,83,0.25)]",
    };
  if (rated_combats >= 10)
    return {
      badge: SilverBadge,
      name: "Caçador de Dados",
      colorClass: "text-slate-300",
      glowClass: "shadow-[0_0_16px_rgba(148,163,184,0.2)]",
    };
  if (total_combats >= 1)
    return {
      badge: BronzeBadge,
      name: "Explorador",
      colorClass: "text-amber-500",
      glowClass: "shadow-[0_0_16px_rgba(245,158,11,0.2)]",
    };
  return null;
}

function getMotivation(contrib: ContribData | undefined): string {
  if (!contrib) return "Comece hoje e molde o futuro do RPG.";
  const { total_combats, rated_combats } = contrib;
  if (rated_combats >= 100) return "Você está moldando o futuro do RPG.";
  if (rated_combats >= 50) return "Você é um dos pilares da comunidade.";
  if (rated_combats >= 10) return "Seus dados estão calibrando o sistema.";
  if (total_combats >= 1) return "Cada jornada começa com um único passo.";
  return "Rode seu primeiro combate e entre para a história.";
}

export function MethodologyHero({ variant, displayName, contrib, uniqueDms = 0, children }: Props) {
  const title = getCurrentTitle(contrib);
  const motivation = getMotivation(contrib);
  const isLoggedIn = variant === "logado";

  return (
    <section className="relative overflow-hidden">
      {/* Background photo — extends behind children (progress bar) */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <Image
          src="/art/decorations/hero-figurines-map.jpg"
          alt=""
          fill
          className="object-cover object-center opacity-[0.15]"
          priority
          unoptimized
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/50 to-background/95" />
      </div>

      {/* Floating particles */}
      <HeroParticles />

      {/* Radial glow */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-gold/[0.06] rounded-full blur-[120px]" />
        {!isLoggedIn && (
          <div className="absolute bottom-0 left-0 w-[400px] h-[300px] bg-cool/[0.04] rounded-full blur-[100px]" />
        )}
      </div>

      <div
        className={`relative max-w-2xl mx-auto text-center space-y-5 px-6 pt-[72px] ${
          isLoggedIn ? "pb-8" : "pb-10"
        }`}
      >
        {isLoggedIn ? (
          <>
            {/* Logo mark */}
            <div className="flex justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/art/brand/logo-icon.svg"
                alt="Pocket DM"
                className="w-14 h-14 drop-shadow-[0_0_20px_rgba(212,168,83,0.3)]"
                width={56}
                height={56}
              />
            </div>

            {/* Welcome */}
            <h1 className="font-display text-3xl md:text-4xl text-foreground leading-tight">
              Bem-vindo de volta,{" "}
              <span className="text-gold">{displayName}</span>
            </h1>

            {/* Title badge */}
            {title ? (
              <div className="flex flex-col items-center gap-3">
                <div
                  className={`inline-flex items-center gap-3 px-6 py-3 rounded-full bg-gold/[0.08] border border-gold/20 ${title.glowClass}`}
                >
                  <title.badge className="w-8 h-8" />
                  <span className={`font-display text-base font-bold ${title.colorClass}`}>
                    {title.name}
                  </span>
                </div>
                <p className="text-foreground/50 text-sm italic max-w-xs">{motivation}</p>
              </div>
            ) : (
              <p className="text-foreground/60 text-base">
                Rode seu primeiro combate e conquiste seu título.
              </p>
            )}
          </>
        ) : (
          <>
            {/* Logo + brand */}
            <div className="flex flex-col items-center gap-2 animate-fade-in">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/art/brand/logo-icon.svg"
                alt="Pocket DM"
                className="w-20 h-20 sm:w-24 sm:h-24 drop-shadow-[0_0_24px_rgba(212,168,83,0.35)] glow-pulse"
                width={96}
                height={96}
              />
              <span className="font-display text-gold text-lg sm:text-xl tracking-[0.15em] uppercase font-bold">
                Pocket DM
              </span>
            </div>

            {/* Headline */}
            <h1
              className="text-2xl sm:text-3xl md:text-4xl font-display text-foreground leading-[1.15] tracking-tight animate-fade-in-up"
            >
              {uniqueDms > 0 ? (
                <>
                  <AnimatedCounter
                    target={uniqueDms}
                    duration={1800}
                    className="text-gold tabular-nums"
                  />{" "}
                  DMs estão construindo
                </>
              ) : (
                "DMs estão construindo"
              )}
              <br />
              <span className="text-gold drop-shadow-[0_0_20px_rgba(212,168,83,0.3)]">
                o D&D mais justo
              </span>
            </h1>

            {/* Subheadline */}
            <p
              className="text-base sm:text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed animate-fade-in-up"
              style={{ animationDelay: "0.1s" }}
            >
              Baseado em dados reais de combates, não tabelas estáticas
            </p>

            {/* CTAs */}
            <div
              className="flex flex-col sm:flex-row gap-3 justify-center pt-2 animate-fade-in-up"
              style={{ animationDelay: "0.2s" }}
            >
              <Link
                href="/auth/sign-up"
                className="bg-gold text-surface-primary font-semibold px-8 py-3.5 rounded-lg hover:shadow-gold-glow hover:-translate-y-[1px] transition-all duration-200 text-sm inline-flex items-center justify-center"
              >
                Criar conta gratuita
              </Link>
              <Link
                href="/try"
                className="border border-white/10 text-foreground/80 font-medium px-8 py-3.5 rounded-lg hover:border-white/20 hover:text-foreground transition-all duration-200 text-sm inline-flex items-center justify-center"
              >
                Testar Combat Tracker
              </Link>
            </div>
          </>
        )}
      </div>

      {/* Children (progress bar) — renders within the hero background */}
      {children && (
        <div className="relative pb-16">
          {children}
        </div>
      )}

      {/* Bottom fade — smooth transition to next section */}
      <div
        className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-b from-transparent to-background pointer-events-none"
        aria-hidden="true"
      />
    </section>
  );
}
