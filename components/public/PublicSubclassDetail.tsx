"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { SubclassEntry, ClassFeature } from "@/lib/types/srd-class";
import { SrdClassIcon } from "./SrdIcons";

// ── Labels ─────────────────────────────────────────────────────────
const LABELS: Record<string, Record<string, string>> = {
  en: {
    levelPrefix: "Level",
    levelSuffix: "+",
    features: "Subclass Features",
    backToClass: "Back to",
    srdNote:
      "This page contains content from the Systems Reference Document 5.1 (SRD), licensed under the Creative Commons Attribution 4.0 International License.",
    showMore: "Show more",
    showLess: "Show less",
    alsoAvailable: "Also available in Portugu\u00eas",
  },
  "pt-BR": {
    levelPrefix: "N\u00edvel",
    levelSuffix: "+",
    features: "Caracter\u00edsticas da Subclasse",
    backToClass: "Voltar para",
    srdNote:
      "Esta p\u00e1gina cont\u00e9m conte\u00fado do Systems Reference Document 5.1 (SRD), licenciado sob a Licen\u00e7a Creative Commons Attribution 4.0 Internacional.",
    showMore: "Mostrar mais",
    showLess: "Mostrar menos",
    alsoAvailable: "Also available in English",
  },
};

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

// ── Shared sub-components ──────────────────────────────────────────

/** Card with the stat-block texture background */
function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-xl border border-white/[0.06] bg-[#1A1A28] shadow-[0_4px_20px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.3),0_0_8px_rgba(146,38,16,0.1)] transition-shadow duration-200 p-6 md:p-8"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4'%3E%3Crect width='4' height='4' fill='%231A1A28'/%3E%3Crect width='1' height='1' x='1' y='1' fill='%231e1e2a' fill-opacity='0.4'/%3E%3C/svg%3E")`,
      }}
    >
      {children}
    </div>
  );
}

/** The decorative gold/red gradient divider */
function GoldDivider({ className: cn }: { className?: string }) {
  return (
    <div
      className={`h-[2px] my-4 ${cn ?? ""}`}
      style={{
        background:
          "linear-gradient(to right, transparent, #922610, #c9a959, #922610, transparent)",
      }}
    />
  );
}

/** Gold circular level badge */
function LevelBadge({ level }: { level: number }) {
  return (
    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#D4A853]/15 text-[#D4A853] text-sm font-bold font-mono border border-[#D4A853]/20 shrink-0">
      {level}
    </span>
  );
}

/** Prose renderer with paragraph splitting and list detection */
function Prose({ text }: { text: string }) {
  if (!text) return null;
  const paragraphs = text.split(/\n\n+/);
  return (
    <div className="mt-4 space-y-4 max-w-prose">
      {paragraphs.map((p, i) => {
        const lines = p.split("\n");
        const isList = lines.every(
          (l) => l.startsWith("- ") || l.startsWith("* ") || l.trim() === ""
        );

        if (isList) {
          return (
            <ul
              key={i}
              className="space-y-1.5 text-[#E8E6E0]/80 text-base leading-relaxed ml-4"
            >
              {lines
                .filter((l) => l.trim())
                .map((l, j) => (
                  <li key={j} className="flex items-start gap-2">
                    <span className="text-[#D4A853] mt-1.5 text-xs">
                      &#9670;
                    </span>
                    <span>{l.replace(/^[-*]\s*/, "")}</span>
                  </li>
                ))}
            </ul>
          );
        }

        return (
          <p key={i} className="text-[#E8E6E0]/80 text-base leading-relaxed">
            {p.split("\n").map((line, j, arr) => (
              <span key={j}>
                {line}
                {j < arr.length - 1 && <br />}
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}

// ── Component ──────────────────────────────────────────────────────
export function PublicSubclassDetail({
  subclass,
  parentClass,
  locale = "en",
}: Props) {
  const [currentLocale, setCurrentLocale] = useState(locale);
  const L = LABELS[currentLocale];
  const isPt = currentLocale === "pt-BR";

  const subclassName = isPt ? subclass.name_pt : subclass.name;
  const subclassDesc = isPt ? subclass.description_pt : subclass.description_en;
  const className = isPt ? parentClass.name_pt : parentClass.name;
  const subclassTypeName = isPt
    ? parentClass.subclass_name_pt
    : parentClass.subclass_name;

  const sortedFeatures = [...subclass.features].sort(
    (a, b) => a.level - b.level
  );

  const classHref = `/classes/${parentClass.id}`;
  const altLocaleHref = isPt
    ? `/classes/${parentClass.id}/${subclass.id}`
    : `/pt-BR/classes/${parentClass.id}/${subclass.id}`;

  return (
    <article className="relative">
      {/* ── EN/PT Language Toggle ─────────────────────────────── */}
      <div className="flex justify-end mb-4">
        <div className="flex items-center rounded-md border border-white/[0.08] overflow-hidden">
          <button
            onClick={() => setCurrentLocale("en")}
            className={`px-3 py-1.5 text-xs font-semibold tracking-wide transition-colors ${
              !isPt
                ? "bg-[#D4A853] text-gray-950"
                : "bg-white/[0.04] text-gray-500 hover:text-gray-300"
            }`}
          >
            EN
          </button>
          <button
            onClick={() => setCurrentLocale("pt-BR")}
            className={`px-3 py-1.5 text-xs font-semibold tracking-wide transition-colors ${
              isPt
                ? "bg-[#D4A853] text-gray-950"
                : "bg-white/[0.04] text-gray-500 hover:text-gray-300"
            }`}
          >
            PT
          </button>
        </div>
      </div>

      <div className="space-y-8">
        {/* ── Hero Section ──────────────────────────────────────── */}
        <div className="relative rounded-xl border border-white/[0.06] bg-[#1A1A28] overflow-hidden">
          {/* Left gold accent bar */}
          <div
            className="absolute left-0 top-0 bottom-0 w-1"
            style={{
              background:
                "linear-gradient(to bottom, #D4A853, #B8903D, #D4A853)",
            }}
          />

          <div
            className="p-6 md:p-8 pl-8 md:pl-10"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4'%3E%3Crect width='4' height='4' fill='%231A1A28'/%3E%3Crect width='1' height='1' x='1' y='1' fill='%231e1e2a' fill-opacity='0.4'/%3E%3C/svg%3E")`,
            }}
          >
            <div className="flex items-start gap-5">
              {/* Icon with subtle glow */}
              <div className="shrink-0 relative">
                <div className="absolute inset-0 bg-[#D4A853]/10 rounded-xl blur-xl" />
                <span className="relative text-[#D4A853]" aria-hidden="true">
                  <SrdClassIcon
                    iconName={parentClass.icon}
                    className="w-14 h-14 md:w-16 md:h-16"
                  />
                </span>
              </div>

              <div className="min-w-0 flex-1">
                <h1 className="text-3xl md:text-4xl font-bold text-[#E8E6E0] font-[family-name:var(--font-cinzel)] leading-tight tracking-wide">
                  {subclassName}
                </h1>
                {isPt && (
                  <p className="text-sm text-[#9896A0] italic mt-1">
                    {subclass.name}
                  </p>
                )}

                {/* Parent class subtitle */}
                <p className="text-[#E8E6E0]/70 text-lg mt-3">
                  <Link
                    href={classHref}
                    className="text-[#D4A853] hover:text-[#E8C87A] transition-colors underline underline-offset-2"
                  >
                    {className}
                  </Link>
                  {" \u2014 "}
                  {subclassTypeName}
                </p>

                {/* Badges row */}
                <div className="flex flex-wrap items-center gap-2 mt-5">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-[#13131E] border border-[#D4A853]/20 text-sm font-mono text-[#D4A853] font-bold">
                    {L.levelPrefix} {parentClass.subclass_level}
                    {L.levelSuffix}
                  </span>
                  {subclass.source && (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-[#13131E] text-xs font-medium text-[#9896A0] border border-white/[0.06]">
                      {subclass.source}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Gold divider ─────────────────────────────────────── */}
        <GoldDivider />

        {/* ── Subclass description ─────────────────────────────── */}
        {subclassDesc && (
          <SectionCard>
            <h2 className="text-xl md:text-2xl font-bold text-[#E8E6E0] font-[family-name:var(--font-cinzel)] tracking-wide">
              {isPt ? "Descri\u00e7\u00e3o" : "Description"}
            </h2>
            <GoldDivider />
            <Prose text={subclassDesc} />
          </SectionCard>
        )}

        {/* ── Gold divider ─────────────────────────────────────── */}
        <GoldDivider />

        {/* ── Subclass features ────────────────────────────────── */}
        {sortedFeatures.length > 0 && (
          <div>
            <div className="mb-6">
              <h2 className="text-xl md:text-2xl font-bold text-[#E8E6E0] font-[family-name:var(--font-cinzel)] tracking-wide">
                {L.features}
              </h2>
              <GoldDivider className="mt-2" />
            </div>

            <div className="space-y-4">
              {sortedFeatures.map((feature, i) => (
                <FeatureCard
                  key={`${feature.level}-${feature.name}-${i}`}
                  feature={feature}
                  isPt={isPt}
                  L={L}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── Gold divider ─────────────────────────────────────── */}
        <GoldDivider />

        {/* ── Back to class + Also available ────────────────────── */}
        <div className="flex flex-col items-center gap-4">
          <Link
            href={classHref}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-[#D4A853]/30 text-[#D4A853] hover:bg-[#D4A853]/10 transition-colors text-sm font-medium"
          >
            <ArrowLeftIcon />
            {L.backToClass} {className}
          </Link>

          <Link
            href={altLocaleHref}
            className="text-xs text-[#9896A0] hover:text-[#D4A853] transition-colors"
          >
            {L.alsoAvailable}
          </Link>
        </div>

        {/* ── SRD Attribution ──────────────────────────────────── */}
        <p className="text-xs text-[#9896A0]/60 text-center leading-relaxed px-4 pb-8">
          {L.srdNote}
        </p>
      </div>
    </article>
  );
}

// ── Feature Card ──────────────────────────────────────────────────
function FeatureCard({
  feature,
  isPt,
  L,
}: {
  feature: ClassFeature;
  isPt: boolean;
  L: (typeof LABELS)["en"];
}) {
  const name = isPt ? feature.name_pt : feature.name;
  const desc = isPt ? feature.description_pt : feature.description_en;
  const isLong = desc.length > 500;
  const [expanded, setExpanded] = useState(!isLong);

  return (
    <div
      className="rounded-lg border border-white/[0.04] bg-[#1A1A28]/80 hover:border-white/[0.08] transition-all duration-200 overflow-hidden"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4'%3E%3Crect width='4' height='4' fill='%231A1A28'/%3E%3Crect width='1' height='1' x='1' y='1' fill='%231e1e2a' fill-opacity='0.3'/%3E%3C/svg%3E")`,
      }}
    >
      <div className="p-5 md:p-6">
        <div className="flex items-start gap-3">
          <LevelBadge level={feature.level} />
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-bold text-[#E8C87A] font-[family-name:var(--font-cinzel)] leading-tight">
              {name}
            </h3>
            {isPt && feature.name !== feature.name_pt && (
              <p className="text-xs text-[#9896A0] italic mt-0.5">
                {feature.name}
              </p>
            )}
          </div>
        </div>

        {/* Thin gold divider */}
        <div
          className="h-px mt-3 mb-3"
          style={{
            background:
              "linear-gradient(to right, transparent, rgba(146,38,16,0.2), rgba(201,169,89,0.2), rgba(146,38,16,0.2), transparent)",
          }}
        />

        {/* Description with collapse */}
        <div
          className={`relative ${
            !expanded ? "max-h-[120px] overflow-hidden" : ""
          }`}
        >
          <Prose text={desc} />
          {!expanded && (
            <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[#1A1A28] to-transparent" />
          )}
        </div>

        {isLong && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-2 text-xs font-medium text-[#D4A853] hover:text-[#E8C87A] transition-colors flex items-center gap-1"
          >
            {expanded ? (
              <>
                <ChevronUp className="w-3 h-3" /> {L.showLess}
              </>
            ) : (
              <>
                <ChevronDown className="w-3 h-3" /> {L.showMore}
              </>
            )}
          </button>
        )}
      </div>
    </div>
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
