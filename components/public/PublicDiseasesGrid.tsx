"use client";

import { useState, useMemo } from "react";

// -- Types --------------------------------------------------------------------
interface DiseaseEntry {
  id: string;
  name: string;
  description: string;
  source?: string;
  ruleset_version: "2014" | "2024";
  category: "condition" | "status" | "disease";
}

interface PublicDiseasesGridProps {
  diseases: DiseaseEntry[];
  locale?: "en" | "pt-BR";
}

// -- Source labels -------------------------------------------------------------
const SOURCE_LABELS: Record<string, string> = {
  PHB: "Player's Handbook",
  DMG: "Dungeon Master's Guide",
  XDMG: "2024 DMG",
  ToA: "Tomb of Annihilation",
  IDRotF: "Icewind Dale",
  GoS: "Ghosts of Saltmarsh",
  EGW: "Explorer's Guide to Wildemount",
  OoW: "Out of the Abyss",
  OotA: "Out of the Abyss",
  FRAiF: "From Ashes",
  CM: "Candlekeep Mysteries",
  WDMM: "Waterdeep: Dungeon of the Mad Mage",
  TftYP: "Tales from the Yawning Portal",
  VRGR: "Van Richten's Guide to Ravenloft",
};

// -- Disease icons ------------------------------------------------------------
const DISEASE_ICONS: Record<string, string> = {
  "arcane blight": "\u{1F52E}",
  "blinding sickness": "\u{1F441}\u{FE0F}",
  "blue mist fever": "\u{1F32B}\u{FE0F}",
  "bluerot": "\u{1F9EB}",
  "cackle fever": "\u{1F923}",
  "filth fever": "\u{1F922}",
  "flesh rot": "\u{1FA78}",
  "frigid woe": "\u{2744}\u{FE0F}",
  "ghoul gut": "\u{1F47B}",
  "grackle-lung": "\u{1FAB1}",
  "lichen plague": "\u{1F33F}",
  "mindfire": "\u{1F525}",
  "mudpox": "\u{1F4A9}",
  "redface": "\u{1F534}",
  "saprophytic plague": "\u{1F344}",
  "seizure": "\u{26A1}",
  "sewer plague": "\u{1F400}",
  "shaking plague": "\u{1F630}",
  "shivering sickness": "\u{1F976}",
  "sight rot": "\u{1F440}",
  "slimy doom": "\u{1F9EA}",
  "spider eggs": "\u{1F577}\u{FE0F}",
  "super-tetanus": "\u{1FA79}",
  "the gnawing plague": "\u{1F9DF}",
  "the rusting": "\u{2699}\u{FE0F}",
  "throat leeches": "\u{1F40D}",
};

// -- PT-BR translations -------------------------------------------------------
const DISEASE_NAMES_PT: Record<string, string> = {
  "arcane blight": "Praga Arcana",
  "blinding sickness": "Doenca Cegante",
  "blue mist fever": "Febre da Nevoa Azul",
  "bluerot": "Podridao Azul",
  "cackle fever": "Febre da Gargalhada",
  "filth fever": "Febre da Imundice",
  "flesh rot": "Podridao da Carne",
  "frigid woe": "Tormento Gelido",
  "ghoul gut": "Intestino Carniceiro",
  "grackle-lung": "Pulmao de Gralha",
  "lichen plague": "Praga do Liquen",
  "mindfire": "Fogo Mental",
  "mudpox": "Varicela Lamacenta",
  "redface": "Face Vermelha",
  "saprophytic plague": "Praga Saprofita",
  "seizure": "Convulsao",
  "sewer plague": "Praga do Esgoto",
  "shaking plague": "Praga Tremula",
  "shivering sickness": "Doenca dos Tremores",
  "sight rot": "Podridao da Visao",
  "slimy doom": "Perdiao Viscosa",
  "spider eggs": "Ovos de Aranha",
  "super-tetanus": "Super-Tetano",
  "the gnawing plague": "A Praga Roedora",
  "the rusting": "A Ferrugem",
  "throat leeches": "Sanguessugas de Garganta",
};

// -- Labels -------------------------------------------------------------------
const LABELS = {
  en: {
    title: "D&D 5e Diseases",
    subtitle: "Reference for diseases, plagues, and afflictions in D&D 5th Edition",
    version2014: "2014",
    version2024: "2024",
    search: "Search diseases...",
    clickToExpand: "Click to expand",
    source: "Source",
    noResults: "No diseases found matching your search.",
    diseaseCount: (n: number) => `${n} disease${n !== 1 ? "s" : ""}`,
  },
  "pt-BR": {
    title: "Doencas D&D 5e",
    subtitle: "Referencia de doencas, pragas e aflicoes do D&D 5a Edicao",
    version2014: "2014",
    version2024: "2024",
    search: "Buscar doencas...",
    clickToExpand: "Clique para expandir",
    source: "Fonte",
    noResults: "Nenhuma doenca encontrada.",
    diseaseCount: (n: number) => `${n} doenca${n !== 1 ? "s" : ""}`,
  },
} as const;

// -- Component ----------------------------------------------------------------
export function PublicDiseasesGrid({ diseases, locale = "en" }: PublicDiseasesGridProps) {
  const [version, setVersion] = useState<"2014" | "2024">("2014");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const L = LABELS[locale];

  const filtered = useMemo(() => {
    const byVersion = diseases
      .filter((d) => d.category === "disease" && d.ruleset_version === version)
      .sort((a, b) => a.name.localeCompare(b.name));

    if (!search.trim()) return byVersion;

    const q = search.toLowerCase();
    return byVersion.filter((d) => {
      const baseName = d.name.toLowerCase();
      const ptName = DISEASE_NAMES_PT[baseName]?.toLowerCase() ?? "";
      return baseName.includes(q) || ptName.includes(q);
    });
  }, [diseases, version, search]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-[var(--5e-text,#F5F0E8)] font-[family-name:var(--font-cinzel)]">
          {L.title}
        </h1>
        <p className="text-[var(--5e-text-muted,#9C8E7C)] mt-1">{L.subtitle}</p>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        {/* Version toggle */}
        <div className="flex items-center gap-1 bg-gray-900/50 rounded-lg p-1 border border-gray-800">
          <button
            onClick={() => setVersion("2014")}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              version === "2014"
                ? "bg-[#D4A853] text-white"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            {L.version2014}
          </button>
          <button
            onClick={() => setVersion("2024")}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              version === "2024"
                ? "bg-[#D4A853] text-white"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            {L.version2024}
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={L.search}
            className="w-full sm:w-64 bg-gray-900/50 border border-gray-800 rounded-lg px-3 py-1.5 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-[#D4A853]/50 transition-colors"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 text-xs"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Disease count */}
      <p className="text-xs text-gray-500">{L.diseaseCount(filtered.length)}</p>

      {/* Diseases grid */}
      {filtered.length === 0 ? (
        <p className="text-gray-500 text-sm py-8 text-center">{L.noResults}</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((disease) => {
            const baseName = disease.name.toLowerCase();
            const icon = DISEASE_ICONS[baseName] ?? "\u{1F9EA}";
            const displayName =
              locale === "pt-BR"
                ? (DISEASE_NAMES_PT[baseName] ?? disease.name)
                : disease.name;
            const isExpanded = expanded === disease.id;
            const sourceLabel = disease.source
              ? SOURCE_LABELS[disease.source] ?? disease.source
              : null;

            return (
              <button
                key={disease.id}
                onClick={() => setExpanded(isExpanded ? null : disease.id)}
                className={`text-left rounded-xl border border-emerald-900/40 bg-gray-900/50 hover:bg-gray-900/80 transition-all p-4 group cursor-pointer ${
                  isExpanded ? "ring-1 ring-[#D4A853]/30" : ""
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl shrink-0" role="img" aria-hidden>
                    {icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-[#F5F0E8] font-[family-name:var(--font-cinzel)] text-base">
                        {displayName}
                      </h3>
                      {sourceLabel && (
                        <span className="shrink-0 text-[10px] leading-tight px-1.5 py-0.5 rounded-full border border-gray-700 text-gray-500">
                          {disease.source}
                        </span>
                      )}
                    </div>
                    {locale === "pt-BR" && baseName !== displayName.toLowerCase() && (
                      <p className="text-xs text-gray-500 italic">{disease.name}</p>
                    )}
                    <p
                      className={`text-sm text-gray-400 mt-1.5 whitespace-pre-line ${
                        isExpanded ? "" : "line-clamp-2"
                      }`}
                    >
                      {disease.description}
                    </p>
                    {!isExpanded && disease.description.length > 120 && (
                      <span className="text-xs text-[#D4A853] mt-1 inline-block opacity-0 group-hover:opacity-100 transition-opacity">
                        {L.clickToExpand}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
