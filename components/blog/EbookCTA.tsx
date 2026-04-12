"use client";

import { useState } from "react";
import Link from "next/link";

interface EbookCTAProps {
  variant?: "inline" | "banner";
}

export function EbookCTA({ variant = "inline" }: EbookCTAProps) {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || loading) return;

    setLoading(true);
    try {
      const res = await fetch("/api/ebook-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, ebook: "guia-mestre-eficaz" }),
      });
      if (res.ok) {
        setSubmitted(true);
      }
    } catch {
      // Fallback: direct download anyway
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="my-10 p-8 rounded-xl border border-gold/30 bg-gradient-to-br from-gold/[0.08] to-transparent text-center relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[300px] h-[150px] bg-gold/[0.06] rounded-full blur-[80px]" aria-hidden="true" />
        <div className="relative">
          <p className="font-display text-xl text-gold mb-3">Download pronto!</p>
          <p className="text-muted-foreground text-sm mb-6">
            Clique abaixo para baixar o Guia do Mestre Eficaz no Combate.
          </p>
          <Link
            href="/ebooks/guia-mestre-eficaz-no-combate.pdf"
            target="_blank"
            className="inline-flex items-center gap-2 bg-gold text-surface-primary font-semibold px-6 py-3 rounded-lg hover:shadow-gold-glow hover:-translate-y-[1px] transition-all duration-200 text-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Baixar PDF
          </Link>
        </div>
      </div>
    );
  }

  if (variant === "banner") {
    return (
      <div className="my-12 p-8 sm:p-10 rounded-xl border border-gold/25 bg-gradient-to-br from-gold/[0.06] via-purple-500/[0.02] to-transparent relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[200px] bg-gold/[0.06] rounded-full blur-[100px]" aria-hidden="true" />
        <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-gold/50 via-gold/20 to-transparent rounded-l-xl" />

        <div className="relative flex flex-col lg:flex-row lg:items-center gap-8">
          <div className="flex-1">
            <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-gold/70 bg-gold/[0.08] px-3 py-1 rounded-full mb-4">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
              </svg>
              E-book Gratuito
            </span>
            <h3 className="font-display text-xl sm:text-2xl text-gold mb-2">
              Guia do Mestre Eficaz no Combate
            </h3>
            <p className="text-foreground/60 text-sm leading-relaxed max-w-lg">
              5 capitulos praticos para transformar seus combates de D&D 5e.
              Da iniciativa automatica ao HP em tempo real — tudo correlacionado
              com ferramentas que funcionam na mesa.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 shrink-0 lg:w-auto w-full">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
              className="h-11 px-4 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-gold/30 transition-colors w-full sm:w-64"
            />
            <button
              type="submit"
              disabled={loading}
              className="h-11 bg-gold text-surface-primary font-semibold px-6 rounded-lg hover:shadow-gold-glow hover:-translate-y-[1px] transition-all duration-200 text-sm whitespace-nowrap disabled:opacity-50"
            >
              {loading ? "Enviando..." : "Baixar Gratis"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Inline variant (compact, inside post content)
  return (
    <div className="my-10 p-6 rounded-xl border border-gold/20 bg-gold/[0.04] relative overflow-hidden">
      <div className="absolute top-0 left-0 w-1 h-full bg-gold/40 rounded-l-xl" />
      <div className="pl-3">
        <div className="flex items-center gap-2 mb-2">
          <svg className="w-4 h-4 text-gold/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
          </svg>
          <span className="text-xs font-bold uppercase tracking-wider text-gold/80">E-book Gratuito</span>
        </div>
        <p className="text-sm text-foreground/80 mb-4 leading-relaxed">
          Quer um guia completo? Baixe o <strong className="text-gold">Guia do Mestre Eficaz no Combate</strong> — 5 capitulos praticos com tudo que voce precisa pra transformar seus combates.
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com"
            required
            className="h-9 px-3 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-gold/30 transition-colors flex-1"
          />
          <button
            type="submit"
            disabled={loading}
            className="h-9 bg-gold text-surface-primary font-semibold px-5 rounded-lg hover:shadow-gold-glow transition-all duration-200 text-xs whitespace-nowrap disabled:opacity-50"
          >
            {loading ? "..." : "Baixar PDF"}
          </button>
        </form>
      </div>
    </div>
  );
}
