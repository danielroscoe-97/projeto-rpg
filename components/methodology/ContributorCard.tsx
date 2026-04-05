interface ContribData {
  total_combats: number;
  rated_combats: number;
  is_researcher: boolean;
  spell_votes?: number;
}

interface NextTitleInfo {
  emoji: string;
  name: string;
  threshold: number;
  metric: "total" | "rated";
}

function getNextTitle(contrib: ContribData): NextTitleInfo | null {
  const { total_combats, rated_combats } = contrib;
  if (total_combats < 1)
    return { emoji: "🥉", name: "Explorador", threshold: 1, metric: "total" };
  if (rated_combats < 10)
    return { emoji: "🥈", name: "Caçador de Dados", threshold: 10, metric: "rated" };
  if (rated_combats < 50)
    return { emoji: "🥇", name: "Pesquisador Pocket DM", threshold: 50, metric: "rated" };
  // NOTE: Spec requires 100+ combats AND 20+ spell votes for Arquiteto do Meta,
  // but spell voting is not yet active. Using rated_combats only until then.
  if (rated_combats < 100)
    return { emoji: "⚗️", name: "Arquiteto do Meta", threshold: 100, metric: "rated" };
  return null;
}

interface Props {
  contrib: ContribData;
}

export function ContributorCard({ contrib }: Props) {
  const { total_combats, rated_combats } = contrib;
  const nextTitle = getNextTitle(contrib);

  const progressCurrent =
    nextTitle?.metric === "rated" ? rated_combats : total_combats;
  const progressTarget = nextTitle?.threshold ?? 1;
  const percentage = nextTitle
    ? Math.min((progressCurrent / progressTarget) * 100, 100)
    : 100;
  const progressLabel = nextTitle
    ? `${progressCurrent}/${progressTarget} combates${
        nextTitle.metric === "rated" ? " com rating" : ""
      }`
    : "";

  return (
    <div className="max-w-3xl mx-auto px-6 pb-8">
      <div className="rounded-xl border border-gold/20 bg-gradient-to-br from-gold/[0.04] to-transparent p-6 shadow-[0_4px_24px_rgba(212,168,83,0.06)]">
        <h2 className="font-display text-gold/90 text-xs mb-5 tracking-wide uppercase">
          Suas Contribuições
        </h2>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4 text-center">
            <div className="font-display text-3xl text-gold tabular-nums">
              {total_combats}
            </div>
            <div className="text-foreground/50 text-xs mt-1">combates total</div>
          </div>
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4 text-center">
            <div className="font-display text-3xl text-gold tabular-nums">
              {rated_combats}
            </div>
            <div className="text-foreground/50 text-xs mt-1">com rating do Mestre</div>
          </div>
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4 text-center">
            <div className="font-display text-3xl text-gold tabular-nums">
              {contrib.spell_votes ?? 0}
            </div>
            <div className="text-foreground/50 text-xs mt-1">spell votes</div>
          </div>
        </div>

        {/* Progress to next title */}
        {nextTitle ? (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-foreground/50 text-xs">Próximo título</span>
              <span className="text-foreground/80 text-sm font-medium flex items-center gap-1.5">
                <span aria-hidden="true">{nextTitle.emoji}</span>
                <span>{nextTitle.name}</span>
              </span>
            </div>
            <div
              className="relative h-2.5 rounded-full bg-white/[0.08] overflow-hidden"
              role="progressbar"
              aria-valuenow={Math.round(percentage)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Progresso para ${nextTitle.name}`}
            >
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-gold-dark via-gold to-gold-light transition-all duration-700"
                style={{ width: `${Math.max(percentage, 2)}%` }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.15] to-transparent animate-[shimmer-sweep_2.5s_ease-in-out_infinite]" />
              </div>
            </div>
            <div className="text-foreground/40 text-xs text-right">{progressLabel}</div>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2 py-2 text-gold/70 text-sm">
            <span aria-hidden="true">⚗️</span>
            <span>Título máximo alcançado! Arquiteto do Meta.</span>
          </div>
        )}
      </div>
    </div>
  );
}
