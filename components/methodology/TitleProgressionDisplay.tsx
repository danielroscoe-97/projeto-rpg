interface ContribData {
  total_combats: number;
  rated_combats: number;
  is_researcher: boolean;
}

interface TitleDef {
  emoji: string;
  name: string;
  criterion: string;
  colorClass: string;
  borderClass: string;
  bgFromClass: string;
  glowClass: string;
  isReached: (c: ContribData | undefined) => boolean;
}

const TITLES: TitleDef[] = [
  {
    emoji: "🥉",
    name: "Explorador",
    criterion: "1 combate contribuído",
    colorClass: "text-amber-500",
    borderClass: "border-amber-500/20",
    bgFromClass: "from-amber-500/[0.04]",
    glowClass: "shadow-[0_4px_20px_rgba(245,158,11,0.08)]",
    isReached: (c) => (c?.total_combats ?? 0) >= 1,
  },
  {
    emoji: "🥈",
    name: "Caçador de Dados",
    criterion: "10 combates com rating do DM",
    colorClass: "text-slate-300",
    borderClass: "border-slate-400/20",
    bgFromClass: "from-slate-400/[0.04]",
    glowClass: "shadow-[0_4px_20px_rgba(148,163,184,0.08)]",
    isReached: (c) => (c?.rated_combats ?? 0) >= 10,
  },
  {
    emoji: "🥇",
    name: "Pesquisador Pocket DM",
    criterion: "50 combates com rating",
    colorClass: "text-gold",
    borderClass: "border-gold/25",
    bgFromClass: "from-gold/[0.06]",
    glowClass: "shadow-[0_4px_24px_rgba(212,168,83,0.12)]",
    isReached: (c) => (c?.rated_combats ?? 0) >= 50,
  },
  {
    emoji: "⚗️",
    name: "Arquiteto do Meta",
    // NOTE: Spec requires 100+ combats AND 20+ spell votes, but spell voting not yet active
    criterion: "100+ combates com rating",
    colorClass: "text-purple-400",
    borderClass: "border-purple-500/20",
    bgFromClass: "from-purple-500/[0.05]",
    glowClass: "shadow-[0_4px_24px_rgba(168,85,247,0.12)]",
    isReached: (c) => (c?.rated_combats ?? 0) >= 100,
  },
];

interface Props {
  contrib?: ContribData;
}

export function TitleProgressionDisplay({ contrib }: Props) {
  // Find the highest reached title index
  let currentTitleIndex = -1;
  for (let i = TITLES.length - 1; i >= 0; i--) {
    if (TITLES[i].isReached(contrib)) {
      currentTitleIndex = i;
      break;
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-6 pb-12">
      <h2 className="font-display text-xl text-gold/90 mb-2 text-center">
        Títulos Progressivos
      </h2>
      <p className="text-foreground/50 text-sm text-center mb-8">
        Contribua mais e suba de nível na comunidade
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {TITLES.map((title, index) => {
          const isReached = title.isReached(contrib);
          const isCurrent = index === currentTitleIndex;
          const isLoggedInContext = contrib !== undefined;
          const isFuture = isLoggedInContext && !isReached;

          return (
            <div
              key={title.name}
              className={`rounded-xl border p-5 transition-all duration-300 ${
                isCurrent
                  ? `bg-gradient-to-br ${title.bgFromClass} to-transparent ${title.borderClass} ${title.glowClass}`
                  : isReached
                  ? `bg-gradient-to-br ${title.bgFromClass} to-transparent ${title.borderClass} opacity-65`
                  : isFuture
                  ? "border-white/[0.06] bg-white/[0.015] opacity-45"
                  : "border-white/[0.06] bg-white/[0.015]"
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="text-3xl shrink-0 leading-none mt-0.5" aria-hidden="true">
                  {title.emoji}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3
                      className={`font-display text-sm font-bold ${
                        isCurrent || isReached ? title.colorClass : "text-foreground/40"
                      }`}
                    >
                      {title.name}
                    </h3>
                    {isCurrent && (
                      <span className="text-[10px] font-medium text-foreground/60 bg-white/[0.08] px-1.5 py-0.5 rounded-full border border-white/[0.08] leading-none">
                        atual
                      </span>
                    )}
                    {isReached && !isCurrent && (
                      <span className="text-[10px] text-green-400/60" aria-label="alcançado">
                        ✓
                      </span>
                    )}
                  </div>
                  <p
                    className={`text-xs leading-relaxed ${
                      isCurrent || isReached ? "text-foreground/50" : "text-foreground/25"
                    }`}
                  >
                    {title.criterion}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {!contrib && (
        <p className="text-center text-foreground/30 text-xs mt-6 italic">
          Crie uma conta para acompanhar seu progresso nos títulos
        </p>
      )}
    </div>
  );
}
