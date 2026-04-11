"use client";

import Link from "next/link";

type Locale = "en" | "pt-BR";

const LABELS = {
  en: {
    prerequisite: "Prerequisite",
    source: "Source",
    version: "Version",
    backToFeats: "← All Feats",
    backHref: "/feats",
  },
  "pt-BR": {
    prerequisite: "Pré-requisito",
    source: "Fonte",
    version: "Versão",
    backToFeats: "← Todos os Talentos",
    backHref: "/talentos",
  },
};

interface FeatDetailProps {
  feat: {
    id: string;
    name: string;
    description: string;
    prerequisite: string | null;
    source: string;
    ruleset_version: string;
  };
  locale?: Locale;
}

export function PublicFeatDetail({ feat, locale = "en" }: FeatDetailProps) {
  const l = LABELS[locale];

  return (
    <div>
      {/* Back link */}
      <Link
        href={l.backHref}
        className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gold transition-colors mb-6"
      >
        {l.backToFeats}
      </Link>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl md:text-4xl font-bold text-foreground font-[family-name:var(--font-cinzel)] mb-3">
          {feat.name}
        </h1>

        <div className="flex flex-wrap gap-2">
          <span className="text-[10px] font-medium bg-white/[0.06] text-gray-300 rounded px-2 py-0.5">
            {feat.source} {feat.ruleset_version}
          </span>
          {feat.prerequisite && (
            <span className="text-[10px] font-medium bg-amber-900/30 text-amber-400 rounded px-2 py-0.5">
              {l.prerequisite}: {feat.prerequisite}
            </span>
          )}
        </div>
      </div>

      {/* Description */}
      <div className="rounded-xl bg-card/80 border border-white/[0.06] p-5 md:p-6">
        <div className="text-sm text-gray-300 leading-relaxed whitespace-pre-line">
          {feat.description}
        </div>
      </div>
    </div>
  );
}
