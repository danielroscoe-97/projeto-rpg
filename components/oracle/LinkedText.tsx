"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { getAllSpells, getAllConditions } from "@/lib/srd/srd-search";
import { usePinnedCardsStore } from "@/lib/stores/pinned-cards-store";
import type { RulesetVersion } from "@/lib/types/database";

export interface LinkedTextProps {
  text: string;
  rulesetVersion: RulesetVersion;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function spellLevelLabel(level: number): string {
  if (level === 0) return "Cantrip";
  // Teens (11–13) always use "th"; others use st/nd/rd/th based on last digit
  const lastTwo = level % 100;
  const lastOne = level % 10;
  const suffix =
    lastTwo >= 11 && lastTwo <= 13
      ? "th"
      : lastOne === 1
        ? "st"
        : lastOne === 2
          ? "nd"
          : lastOne === 3
            ? "rd"
            : "th";
  return `${level}${suffix}-level`;
}

type MatchEntry =
  | { kind: "spell"; id: string; name: string; tooltipText: string }
  | { kind: "condition"; id: string; name: string; tooltipText: string };

interface Segment {
  kind: "text" | "link";
  content: string;
  entry?: MatchEntry;
}

export function LinkedText({ text, rulesetVersion }: LinkedTextProps) {
  const pinCard = usePinnedCardsStore((s) => s.pinCard);
  const [tooltip, setTooltip] = useState<string | null>(null);
  const [tooltipAnchor, setTooltipAnchor] = useState<{ x: number; y: number } | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Build name→entry map and regex once per rulesetVersion
  const { regex, nameToEntry } = useMemo(() => {
    const spells = getAllSpells().filter((s) => s.ruleset_version === rulesetVersion);
    const conditions = getAllConditions();

    const entries: MatchEntry[] = [
      ...spells.map(
        (s): MatchEntry => ({
          kind: "spell",
          id: s.id,
          name: s.name,
          tooltipText: `${s.name} — ${spellLevelLabel(s.level)} ${s.school}`,
        }),
      ),
      ...conditions.map(
        (c): MatchEntry => ({
          kind: "condition",
          id: c.id,
          name: c.name,
          tooltipText: (() => {
            const desc = c.description ?? "";
            const first = desc.split(/\.\s/)[0] ?? desc;
            return first.endsWith(".") ? first : first + ".";
          })(),
        }),
      ),
    ];

    // Longest-first: prevents "Light" matching inside "Lightning Bolt"
    entries.sort((a, b) => b.name.length - a.name.length);

    if (entries.length === 0) {
      return { regex: null, nameToEntry: new Map<string, MatchEntry>() };
    }

    const nameToEntry = new Map<string, MatchEntry>(
      entries.map((e) => [e.name.toLowerCase(), e]),
    );

    const pattern = entries.map((e) => escapeRegex(e.name)).join("|");
    const regex = new RegExp(`\\b(${pattern})\\b`, "gi");

    return { regex, nameToEntry };
  }, [rulesetVersion]);

  // Split text into plain and linked segments — memoized
  const segments = useMemo((): Segment[] => {
    if (!regex || !text) return [{ kind: "text", content: text ?? "" }];

    const parts: Segment[] = [];
    let lastIndex = 0;
    regex.lastIndex = 0;

    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ kind: "text", content: text.slice(lastIndex, match.index) });
      }
      const entry = nameToEntry.get(match[0].toLowerCase());
      if (entry) {
        parts.push({ kind: "link", content: match[0], entry });
      } else {
        parts.push({ kind: "text", content: match[0] });
      }
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
      parts.push({ kind: "text", content: text.slice(lastIndex) });
    }

    return parts;
  }, [text, regex, nameToEntry]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const showTooltip = (e: React.SyntheticEvent<HTMLButtonElement>, content: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const target = e.currentTarget;
    timerRef.current = setTimeout(() => {
      const rect = target.getBoundingClientRect();
      setTooltip(content);
      setTooltipAnchor({ x: rect.left, y: rect.bottom + 6 });
    }, 300);
  };

  const hideTooltip = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setTooltip(null);
    setTooltipAnchor(null);
  };

  return (
    <>
      {segments.map((seg, i) => {
        if (seg.kind === "text" || !seg.entry) {
          return <span key={i}>{seg.content}</span>;
        }

        const entry = seg.entry;

        return (
          <button
            key={i}
            type="button"
            aria-haspopup="dialog"
            className="linked-ref"
            style={{
              background: "none",
              border: "none",
              padding: 0,
              margin: 0,
              font: "inherit",
              cursor: "pointer",
              display: "inline",
            }}
            onClick={() => {
              pinCard(entry.kind, entry.id, rulesetVersion);
            }}
            onMouseEnter={(e) => showTooltip(e, entry.tooltipText)}
            onMouseLeave={hideTooltip}
            onFocus={(e) => showTooltip(e, entry.tooltipText)}
            onBlur={hideTooltip}
          >
            {seg.content}
          </button>
        );
      })}

      {tooltip && tooltipAnchor && (
        <div
          role="tooltip"
          style={{
            position: "fixed",
            left: tooltipAnchor.x,
            top: tooltipAnchor.y,
            background: "var(--5e-bg, #1a1a1e)",
            border: "1px solid var(--5e-accent-red, #922610)",
            color: "var(--5e-text, #e8e4d0)",
            padding: "6px 10px",
            borderRadius: 4,
            fontSize: "0.8em",
            zIndex: 9999,
            maxWidth: 260,
            pointerEvents: "none",
            lineHeight: 1.4,
          }}
        >
          {tooltip}
        </div>
      )}
    </>
  );
}
