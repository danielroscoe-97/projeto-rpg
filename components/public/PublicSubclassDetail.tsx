"use client";

import Link from "next/link";
import type { SubclassEntry, ClassFeature } from "@/lib/types/srd-class";
import { SrdClassIcon } from "./SrdIcons";

// ── Labels ─────────────────────────────────────────────────────────
const LABELS = {
  en: {
    levelPrefix: "Level",
    levelSuffix: "+",
    features: "Subclass Features",
    backToClass: "Back to",
    srdNote:
      "This page contains content from the Systems Reference Document 5.1 (SRD), licensed under the Creative Commons Attribution 4.0 International License.",
  },
  "pt-BR": {
    levelPrefix: "Nível",
    levelSuffix: "+",
    features: "Características da Subclasse",
    backToClass: "Voltar para",
    srdNote:
      "Esta página contém conteúdo do Systems Reference Document 5.1 (SRD), licenciado sob a Licença Creative Commons Attribution 4.0 Internacional.",
  },
} as const;

// ── Props ──────────────────────────────────────────────────────────
interface Props {
  subclass: SubclassEntry;
  parentClass: {
    id: string;
    name: string;
    name_pt: string;
    icon: string;
    subclass_name: string;
    subclass_name_pt: string;
    subclass_level: number;
  };
  locale?: "en" | "pt-BR";
}

// ── Component ──────────────────────────────────────────────────────
export function PublicSubclassDetail({
  subclass,
  parentClass,
  locale = "en",
}: Props) {
  const L = LABELS[locale];
  const pt = locale === "pt-BR";

  const subclassName = pt ? subclass.name_pt : subclass.name;
  const subclassDesc = pt ? subclass.description_pt : subclass.description_en;
  const className = pt ? parentClass.name_pt : parentClass.name;
  const subclassTypeName = pt
    ? parentClass.subclass_name_pt
    : parentClass.subclass_name;

  const sortedFeatures = [...subclass.features].sort(
    (a, b) => a.level - b.level,
  );

  const classHref = `/classes/${parentClass.id}`;

  return (
    <article className="space-y-6">
      {/* ── Hero section ──────────────────────────────────────── */}
      <div className="rounded-xl border border-[#D4A853]/15 bg-gray-900/60 p-6 md:p-8">
        <div className="flex items-start gap-4">
          <span className="shrink-0 text-[#D4A853]" aria-hidden="true">
            <SrdClassIcon iconName={parentClass.icon} className="w-12 h-12" />
          </span>

          <div className="min-w-0 flex-1">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-100 font-[family-name:var(--font-cinzel)] leading-tight">
              {subclassName}
            </h1>
            {pt && (
              <p className="text-sm text-gray-500 italic mt-0.5">
                {subclass.name}
              </p>
            )}

            {/* Parent class subtitle */}
            <p className="text-gray-400 text-lg mt-2">
              <Link
                href={classHref}
                className="text-[#D4A853] hover:text-[#e2be76] transition-colors underline underline-offset-2"
              >
                {className}
              </Link>
              {" — "}
              {subclassTypeName}
            </p>

            {/* Badges row */}
            <div className="flex flex-wrap items-center gap-2 mt-4">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#D4A853]/10 text-[#D4A853] border border-[#D4A853]/20">
                {L.levelPrefix} {parentClass.subclass_level}
                {L.levelSuffix}
              </span>
              {subclass.source && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-800 text-gray-300 border border-gray-700">
                  {subclass.source}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Subclass description ──────────────────────────────── */}
      {subclassDesc && (
        <div className="rounded-xl border border-white/[0.06] bg-gray-900/60 p-6 md:p-8">
          <p className="max-w-prose text-gray-300 leading-relaxed whitespace-pre-line">
            {subclassDesc}
          </p>
        </div>
      )}

      {/* ── Subclass features ─────────────────────────────────── */}
      {sortedFeatures.length > 0 && (
        <div className="rounded-xl border border-white/[0.06] bg-gray-900/60 p-6 md:p-8">
          <h2 className="text-xl font-bold text-gray-100 font-[family-name:var(--font-cinzel)] mb-6">
            {L.features}
          </h2>

          <div className="space-y-0">
            {sortedFeatures.map((feature, idx) => (
              <FeatureSection
                key={`${feature.level}-${feature.name}`}
                feature={feature}
                locale={locale}
                isLast={idx === sortedFeatures.length - 1}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Back to class ─────────────────────────────────────── */}
      <div className="flex justify-center">
        <Link
          href={classHref}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gray-800 border border-white/[0.06] text-gray-300 hover:text-[#D4A853] hover:border-[#D4A853]/20 transition-colors text-sm font-medium"
        >
          <ArrowLeftIcon />
          {L.backToClass} {className}
        </Link>
      </div>

      {/* ── SRD attribution ───────────────────────────────────── */}
      <p className="text-xs text-gray-600 text-center leading-relaxed">
        {L.srdNote}
      </p>
    </article>
  );
}

// ── Feature Section ────────────────────────────────────────────────
function FeatureSection({
  feature,
  locale,
  isLast,
}: {
  feature: ClassFeature;
  locale: "en" | "pt-BR";
  isLast: boolean;
}) {
  const pt = locale === "pt-BR";
  const name = pt ? feature.name_pt : feature.name;
  const description = pt ? feature.description_pt : feature.description_en;
  const levelLabel = pt ? "Nível" : "Level";

  return (
    <>
      <div className="py-5">
        <div className="flex flex-wrap items-center gap-3 mb-3">
          {/* Level badge */}
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#D4A853]/10 text-[#D4A853] border border-[#D4A853]/20">
            {levelLabel} {feature.level}
          </span>

          {/* Feature name */}
          <h3 className="text-lg font-bold text-gray-100 font-[family-name:var(--font-cinzel)]">
            {name}
          </h3>
        </div>

        {pt && feature.name !== feature.name_pt && (
          <p className="text-xs text-gray-500 italic mb-2">{feature.name}</p>
        )}

        <p className="text-gray-300 leading-relaxed whitespace-pre-line">
          {description}
        </p>
      </div>

      {!isLast && <hr className="border-white/[0.06]" />}
    </>
  );
}

// ── Arrow Left Icon ────────────────────────────────────────────────
function ArrowLeftIcon() {
  return (
    <svg
      className="w-4 h-4 shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 12H5" />
      <path d="M12 19l-7-7 7-7" />
    </svg>
  );
}
