"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { OracleAIData } from "@/lib/stores/pinned-cards-store";
import "@/styles/stat-card-5e.css";

export interface OracleAICardProps {
  data: OracleAIData;
  variant?: "inline" | "card";
  onClose?: () => void;
  /** @deprecated Use onFocus instead */
  onPin?: () => void;
  onFocus?: () => void;
  onLock?: () => void;
  isLocked?: boolean;
  onMinimize?: () => void;
}

/** Section IDs that the Oracle AI response is split into */
const SECTION_HEADERS = [
  { id: "raw", emoji: "📜", pattern: /^## 📜\s*RAW/m },
  { id: "rai", emoji: "⚖️", pattern: /^## ⚖️\s*RAI/m },
  { id: "consensus", emoji: "🗣️", pattern: /^## 🗣️\s*Consenso/m },
  { id: "divergent", emoji: "🔀", pattern: /^## 🔀\s*Interpreta/m },
  { id: "recommendation", emoji: "🎯", pattern: /^## 🎯\s*Recomenda/m },
] as const;

interface Section {
  id: string;
  emoji: string;
  title: string;
  content: string;
}

function parseSections(markdown: string): { preamble: string; sections: Section[] } {
  const sections: Section[] = [];
  let preamble = "";

  // Find all section header positions
  const matches: { id: string; emoji: string; index: number; headerEnd: number; title: string }[] = [];

  for (const header of SECTION_HEADERS) {
    const match = header.pattern.exec(markdown);
    if (match) {
      const lineEnd = markdown.indexOf("\n", match.index);
      const title = match[0].replace(/^##\s*/, "").trim();
      matches.push({
        id: header.id,
        emoji: header.emoji,
        index: match.index,
        headerEnd: lineEnd === -1 ? match.index + match[0].length : lineEnd + 1,
        title,
      });
    }
  }

  matches.sort((a, b) => a.index - b.index);

  if (matches.length === 0) {
    return { preamble: markdown, sections: [] };
  }

  preamble = markdown.slice(0, matches[0].index).trim();

  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].headerEnd;
    const end = i + 1 < matches.length ? matches[i + 1].index : markdown.length;
    sections.push({
      id: matches[i].id,
      emoji: matches[i].emoji,
      title: matches[i].title,
      content: markdown.slice(start, end).trim(),
    });
  }

  return { preamble, sections };
}

export function OracleAICard({
  data,
  variant = "inline",
  onClose,
  onPin,
  onFocus,
  onLock,
  isLocked = false,
  onMinimize,
}: OracleAICardProps) {
  const t = useTranslations("oracle_ai");
  const isCard = variant === "card";
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

  const { preamble, sections } = parseSections(data.answer);

  const toggleSection = (id: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div
      className={`stat-card-5e card-type-oracle-ai${isCard ? " card-floating card-transition" : ""}`}
      data-testid="oracle-ai-card"
    >
      {isCard && (
        <div className="card-toolbar">
          {onLock && (
            <button type="button" onClick={onLock} aria-label={isLocked ? "Unlock card position" : "Lock card position"} title={isLocked ? "Desbloquear posição" : "Travar posição"} data-testid="oracle-ai-lock-btn">
              {isLocked ? "🔒" : "🔓"}
            </button>
          )}
          {(onFocus ?? onPin) && (
            <button type="button" onClick={(onFocus ?? onPin)!} aria-label="Bring card to front" title="Trazer para frente" data-testid="oracle-ai-focus-btn">
              ⬆️
            </button>
          )}
          {onMinimize && (
            <button type="button" onClick={onMinimize} aria-label={t("minimize")} data-testid="oracle-ai-minimize-btn">
              −
            </button>
          )}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label={t("close")}
              data-testid="oracle-ai-close-btn"
              className="toolbar-close"
            >
              ×
            </button>
          )}
        </div>
      )}

      <div className="card-body">
        {/* Header with Oracle AI branding */}
        <div className="oracle-ai-header">
          <span className="oracle-ai-icon">✨</span>
          <h3 className="card-name">{t("title")}</h3>
        </div>

        {/* Question */}
        <p className="oracle-ai-question">&ldquo;{data.question}&rdquo;</p>

        <hr className="card-divider" />

        {/* Preamble (if any text before first section) */}
        {preamble && (
          <div className="trait-block">
            <p className="trait-desc">{preamble}</p>
          </div>
        )}

        {/* Structured sections */}
        {sections.map((section) => {
          const isCollapsed = collapsedSections.has(section.id);
          return (
            <div key={section.id} className="oracle-ai-section" data-testid={`oracle-section-${section.id}`}>
              <button
                type="button"
                className="oracle-ai-section-header"
                onClick={() => toggleSection(section.id)}
                aria-expanded={!isCollapsed}
              >
                <span className="section-header" style={{ margin: 0, paddingBottom: 0, borderBottom: "none" }}>
                  {section.title}
                </span>
                <span className="oracle-ai-chevron" data-collapsed={isCollapsed}>
                  ▾
                </span>
              </button>
              {!isCollapsed && (
                <div className="trait-block oracle-ai-section-content">
                  {section.content.split("\n\n").map((p, i) => (
                    <p key={i} className="trait-desc" style={{ marginBottom: "0.5em" }}>
                      {p}
                    </p>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* If no sections parsed, show raw answer */}
        {sections.length === 0 && !preamble && (
          <div className="trait-block">
            {data.answer.split("\n\n").map((p, i) => (
              <p key={i} className="trait-desc" style={{ marginBottom: "0.5em" }}>
                {p}
              </p>
            ))}
          </div>
        )}

        {/* Sources from Google Search grounding */}
        {data.sources && data.sources.length > 0 && (
          <>
            <hr className="card-divider" />
            <div className="oracle-ai-sources">
              <span className="oracle-ai-sources-label">{t("sources")}</span>
              <ul>
                {data.sources.map((src, i) => (
                  <li key={i}>
                    <a href={src.uri} target="_blank" rel="noopener noreferrer">
                      {src.title || src.uri}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
