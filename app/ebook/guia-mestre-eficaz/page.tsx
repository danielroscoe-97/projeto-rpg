import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/marketing/Footer";
import { BlogNavAuthSlot } from "@/components/blog/BlogNavAuthSlot";
import { EbookCTA } from "@/components/blog/EbookCTA";

export const metadata: Metadata = {
  title: "Guia do Mestre Eficaz no Combate — E-book Gratuito",
  description:
    "E-book gratuito com 5 capitulos praticos para transformar seus combates de D&D 5e. Iniciativa automatica, HP em tempo real e mais.",
  keywords: [
    "guia mestre D&D",
    "e-book D&D 5e",
    "combat tracker guia",
    "como mestrar combate D&D",
    "Pocket DM guia",
  ],
};

const CHAPTERS = [
  {
    number: "01",
    title: "Pare de Anotar Iniciativa",
    description:
      "Gere o QR Code, mande no WhatsApp ou Discord. Cada jogador coloca a propria iniciativa — zero papel, zero 'quanto voce tirou?'.",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 3.75 9.375v-4.5ZM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5ZM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 13.5 9.375v-4.5Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75ZM6.75 16.5h.75v.75h-.75v-.75ZM16.5 6.75h.75v.75h-.75v-.75ZM13.5 13.5h.75v.75h-.75v-.75ZM13.5 19.5h.75v.75h-.75v-.75ZM19.5 13.5h.75v.75h-.75v-.75ZM19.5 19.5h.75v.75h-.75v-.75ZM16.5 16.5h.75v.75h-.75v-.75Z" />
      </svg>
    ),
  },
  {
    number: "02",
    title: "HP em Tempo Real = Decisoes Taticas",
    description:
      "O mestre ve o HP de todo mundo na tela. Vai soltar Fireball no grupo? Olha os numeros e decide. Jogadores veem suas proprias condicoes em tempo real.",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
      </svg>
    ),
  },
  {
    number: "03",
    title: "Combate Rapido, Nao Combate Lento",
    description:
      "Turno automatico, ordem de iniciativa visual, indicador de turno claro. Sem ficar perguntando 'de quem e a vez?'. O ritmo nao para.",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
      </svg>
    ),
  },
  {
    number: "04",
    title: "Transparencia Gera Imersao",
    description:
      "Quando o jogador VE que ta com 8 HP e Poisoned, ele SENTE o perigo. Nao precisa o mestre narrar — a tensao e visual e imediata.",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
      </svg>
    ),
  },
  {
    number: "05",
    title: "Do Zero ao Combate em 60 Segundos",
    description:
      "Busca o monstro no compendium, adiciona ao combate, rola iniciativa, comeca. Sem preparacao de 30 minutos. Improvisar encontros nunca foi tao facil.",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    ),
  },
];

export default function EbookPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar
        brand="Pocket DM"
        brandHref="/"
        links={[
          { href: "/blog", label: "Blog" },
          { href: "/monstros", label: "Monstros" },
          { href: "/magias", label: "Magias" },
          { href: "/pricing", label: "Precos" },
        ]}
        rightSlot={<BlogNavAuthSlot />}
      />

      <main className="flex-1 pt-[72px]">
        {/* Hero */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gold/[0.04] rounded-full blur-[120px]" />
          </div>

          <div className="relative max-w-3xl mx-auto px-6 pt-16 pb-12 text-center">
            <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-gold/70 bg-gold/[0.08] px-3 py-1.5 rounded-full mb-6">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
              </svg>
              E-book Gratuito
            </span>

            <h1 className="font-display text-3xl md:text-4xl lg:text-5xl text-gold leading-tight tracking-tight mb-6">
              Guia do Mestre Eficaz no Combate
            </h1>
            <p className="text-foreground/60 text-lg leading-relaxed max-w-xl mx-auto">
              5 capitulos praticos para transformar seus combates de D&D 5e —
              da iniciativa automatica ao HP em tempo real.
            </p>
          </div>
        </div>

        {/* Lead capture */}
        <div className="max-w-2xl mx-auto px-6 -mt-2 mb-16">
          <EbookCTA variant="banner" />
        </div>

        {/* Chapters preview */}
        <div className="max-w-3xl mx-auto px-6 pb-16">
          <div className="flex items-center gap-3 mb-8">
            <div className="flex-1 h-px bg-gradient-to-r from-white/[0.06] to-transparent" />
            <span className="text-[10px] text-muted-foreground/50 uppercase tracking-widest">
              O que voce vai aprender
            </span>
            <div className="flex-1 h-px bg-gradient-to-l from-white/[0.06] to-transparent" />
          </div>

          <div className="space-y-4">
            {CHAPTERS.map((ch) => (
              <div
                key={ch.number}
                className="flex gap-5 p-5 rounded-xl border border-white/[0.06] bg-white/[0.015] hover:border-gold/15 transition-colors"
              >
                <div className="shrink-0 w-12 h-12 rounded-lg bg-gold/[0.08] border border-gold/15 flex items-center justify-center text-gold/70">
                  {ch.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-mono text-gold/40">Cap. {ch.number}</span>
                  </div>
                  <h3 className="font-display text-base text-foreground mb-1.5">
                    {ch.title}
                  </h3>
                  <p className="text-sm text-foreground/50 leading-relaxed">
                    {ch.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="max-w-2xl mx-auto px-6 pb-20">
          <EbookCTA variant="banner" />

          <div className="text-center mt-8">
            <Link
              href="/blog"
              className="text-sm text-muted-foreground hover:text-gold transition-colors"
            >
              Voltar para o Blog
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
