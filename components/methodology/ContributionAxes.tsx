export function ContributionAxes() {
  return (
    <div className="max-w-3xl mx-auto px-6 pb-12">
      <h2 className="font-display text-xl text-gold/90 mb-2 text-center">
        Laboratório — Eixos de Contribuição
      </h2>
      <p className="text-foreground/50 text-sm text-center mb-8">
        Dois projetos ativos para enriquecer os dados da comunidade
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Combat difficulty — ACTIVE */}
        <div className="group rounded-xl border border-gold/20 bg-gradient-to-br from-gold/[0.04] to-transparent p-6 hover:border-gold/35 hover:shadow-[0_4px_24px_rgba(212,168,83,0.1)] hover:-translate-y-0.5 transition-all duration-300">
          <div className="flex items-start justify-between mb-4">
            <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center group-hover:bg-gold/20 group-hover:shadow-[0_0_20px_rgba(212,168,83,0.2)] transition-all duration-300">
              <svg
                className="w-5 h-5 text-gold"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M14.5 17.5L3 6V3h3l11.5 11.5" />
                <path d="M13 19l6-6" />
                <path d="M16 16l4 4" />
                <path d="M19 21l2-2" />
                <path d="M9.5 6.5L21 18v3h-3L6.5 9.5" />
                <path d="M11 5l-6 6" />
                <path d="M8 8L4 4" />
                <path d="M5 3L3 5" />
              </svg>
            </div>
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-400 bg-green-400/10 px-2.5 py-1 rounded-full border border-green-400/20">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" aria-hidden="true" />
              Ativo
            </span>
          </div>
          <h3 className="font-display text-foreground/90 text-base mb-2 group-hover:text-gold transition-colors duration-300">
            Dificuldade de Combate
          </h3>
          <p className="text-foreground/50 text-sm leading-relaxed">
            Vote na dificuldade real dos seus combates. Seu rating calibra o modelo para toda a
            comunidade.
          </p>
        </div>

        {/* Spell tiers — COMING SOON */}
        <div className="relative rounded-xl border border-white/[0.06] bg-white/[0.015] p-6 overflow-hidden">
          {/* Subtle lock overlay */}
          <div
            className="absolute inset-0 bg-gradient-to-br from-transparent to-background/30 pointer-events-none"
            aria-hidden="true"
          />

          <div className="flex items-start justify-between mb-4">
            <div className="w-10 h-10 rounded-lg bg-white/[0.05] flex items-center justify-center">
              <svg
                className="w-5 h-5 text-foreground/30"
                viewBox="0 0 24 24"
                fill="currentColor"
                stroke="currentColor"
                strokeWidth="0.5"
                aria-hidden="true"
              >
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            </div>
            <span className="inline-flex items-center gap-1 text-xs font-medium text-foreground/30 bg-white/[0.05] px-2.5 py-1 rounded-full border border-white/[0.06]">
              🔜 Em breve
            </span>
          </div>
          <h3 className="font-display text-foreground/40 text-base mb-2">Tier de Magias</h3>
          <p className="text-foreground/25 text-sm leading-relaxed">
            Fireball é tier S? Vote e descubra junto com a comunidade o ranking real de cada magia.
          </p>
        </div>
      </div>
    </div>
  );
}
