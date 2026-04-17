export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import type { Metadata } from "next";
import type { CombatReport } from "@/lib/types/combat-report";
import { formatDuration } from "@/lib/utils/combat-stats";
import {
  Swords,
  Trophy,
  Skull,
  Shield,
  Heart,
  Target,
  Frown,
  Zap,
  Timer,
  Star,
  BookOpen,
  HeartCrack,
  Dices,
  Rocket,
} from "lucide-react";
import type { ComponentType, SVGProps } from "react";

const STRINGS = {
  pt: { cta: "Rode seu próprio combate — é grátis", button: "Testar agora", ogMvp: "foi MVP com" },
  en: { cta: "Run your own combat — it's free", button: "Try now", ogMvp: "was MVP with" },
} as const;

function detectLocale(acceptLanguage: string | null): "pt" | "en" {
  if (!acceptLanguage) return "pt";
  return acceptLanguage.toLowerCase().includes("pt") ? "pt" : "en";
}

interface PageProps {
  params: Promise<{ code: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { code } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("combat_reports")
    .select("encounter_name, report_data")
    .eq("short_code", code)
    .maybeSingle();

  if (!data) return { title: "Report Not Found" };

  const report = data.report_data as CombatReport;
  const mvp = report.awards?.find((a) => a.type === "mvp");
  const h = await headers();
  const lang = detectLocale(h.get("accept-language"));
  const s = STRINGS[lang];
  const title = mvp
    ? `${mvp.combatantName} ${s.ogMvp} ${mvp.displayValue}!`
    : data.encounter_name;
  const description = `${data.encounter_name} — ${report.summary.matchup}, ${report.summary.totalRounds} rounds, ${formatDuration(report.summary.totalDuration)}. Rode seu combate grátis no Pocket DM.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      url: `/r/${code}`,
    },
    twitter: { card: "summary_large_image" },
  };
}

type IconComponent = ComponentType<SVGProps<SVGSVGElement> & { className?: string }>;

// S5.7: "assassin" retained as legacy alias -> renders as "First Blood".
const AWARD_ICONS: Record<string, IconComponent> = {
  mvp: Trophy,
  first_blood: Skull,
  assassin: Skull, // legacy alias
  tank: Shield,
  healer: Heart,
  crit_king: Target,
  unlucky: Frown,
  speedster: Zap,
  slowpoke: Timer,
};

const AWARD_LABELS: Record<string, string> = {
  mvp: "MVP",
  first_blood: "First Blood",
  assassin: "First Blood", // legacy alias
  tank: "Tank",
  healer: "Healer",
  crit_king: "Crit King",
  unlucky: "Unlucky",
  speedster: "Speedster",
  slowpoke: "Slowpoke",
};

export default async function ReportPage({ params }: PageProps) {
  const { code } = await params;
  const supabase = await createClient();

  const { data } = await supabase
    .from("combat_reports")
    .select("encounter_name, report_data, expires_at, created_at")
    .eq("short_code", code)
    .maybeSingle();

  if (!data) notFound();

  // Check expiry
  if (data.expires_at && new Date(data.expires_at) < new Date()) notFound();

  const report = data.report_data as CombatReport;
  const { awards, narratives, summary } = report;
  const h = await headers();
  const lang = detectLocale(h.get("accept-language"));
  const s = STRINGS[lang];

  return (
    <div className="w-full max-w-md">
      {/* Card */}
      <div className="rounded-2xl border border-gold/30 bg-[#12121a] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="border-b border-white/10 px-5 py-4 text-center">
          <p className="text-xs text-gold/60 uppercase tracking-[0.2em] font-semibold inline-flex items-center justify-center gap-1">
            <Swords className="size-3.5" /> Combat Recap
          </p>
          <h1 className="text-xl font-bold text-white mt-1">
            {data.encounter_name}
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            {summary.matchup} {"·"} {summary.totalRounds} rounds {"·"} {formatDuration(summary.totalDuration)}
          </p>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Awards grid — 2 col on mobile for screenshot fit */}
          {awards.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {awards.map((award) => (
                <div
                  key={award.type}
                  className="rounded-lg bg-white/[0.04] border border-white/[0.08] p-2.5 text-center"
                >
                  <p className="text-lg leading-none flex justify-center text-gold">
                    {(() => { const Icon = AWARD_ICONS[award.type] ?? Star; return <Icon className="size-5" />; })()}
                  </p>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">
                    {AWARD_LABELS[award.type] ?? award.type}
                  </p>
                  <p className="text-sm font-semibold text-white mt-0.5 truncate">
                    {award.combatantName}
                  </p>
                  <p className="text-xs text-gray-400 font-mono">{award.displayValue}</p>
                </div>
              ))}
            </div>
          )}

          {/* Narratives */}
          {narratives.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs text-gold/60 uppercase tracking-wider font-semibold inline-flex items-center gap-1">
                <BookOpen className="size-3" /> Epic Moments
              </p>
              {narratives.slice(0, 2).map((n, i) => (
                <p key={i} className="text-sm text-gray-300 leading-snug">
                  {"•"} {n.text}
                </p>
              ))}
            </div>
          )}

          {/* Stats row */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
            {summary.pcsDown > 0 && <span className="inline-flex items-center gap-0.5"><HeartCrack className="size-3" /> {summary.pcsDown} PCs down</span>}
            {summary.monstersDefeated > 0 && <span className="inline-flex items-center gap-0.5"><Skull className="size-3" /> {summary.monstersDefeated} monsters slain</span>}
            {summary.totalCrits > 0 && <span className="inline-flex items-center gap-0.5"><Dices className="size-3" /> {summary.totalCrits} crits</span>}
            {summary.totalFumbles > 0 && <span className="inline-flex items-center gap-0.5"><Frown className="size-3" /> {summary.totalFumbles} fumbles</span>}
          </div>
        </div>

        {/* CTA footer */}
        <div className="border-t border-white/10 px-5 py-4 text-center bg-white/[0.02]">
          <p className="text-xs text-gray-500 mb-2">
            {s.cta}
          </p>
          <Link
            href="/try"
            className="inline-flex items-center justify-center gap-2 bg-gold text-black font-bold px-6 py-2.5 rounded-lg text-sm hover:bg-gold/90 transition-colors min-h-[44px]"
          >
            <Rocket className="size-4" /> {s.button}
          </Link>
          <p className="text-[10px] text-gray-600 mt-2">pocketdm.com.br</p>
        </div>
      </div>
    </div>
  );
}
