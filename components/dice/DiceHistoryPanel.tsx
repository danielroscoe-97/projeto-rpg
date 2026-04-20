"use client";

import { useEffect, useRef } from "react";
import { useTranslations, useLocale } from "next-intl";
import { usePathname } from "next/navigation";
import {
  useDiceHistoryStore,
  initDiceHistoryListener,
  type HistoryEntry,
} from "@/lib/stores/dice-history-store";
import { type RollResult, parseNotation } from "@/lib/dice/roll";

// ---------------------------------------------------------------------------
// DiceHistoryPanel — floating bottom-right panel showing all dice rolls
// from the current session. Collapsible pill when closed.
// ---------------------------------------------------------------------------

export function DiceHistoryPanel() {
  const t = useTranslations("dice");
  const locale = useLocale();
  const pathname = usePathname();
  const { entries, isOpen, unreadCount, togglePanel, clear, markRead } =
    useDiceHistoryStore();

  // Only show on routes where dice rolling is relevant
  // (not on campaign hub — only combat/compendium)
  const showPanel =
    pathname.startsWith("/app/combat") ||
    pathname.startsWith("/app/compendium") ||
    pathname.startsWith("/try");

  // Init the CustomEvent listener for roll results
  useEffect(() => {
    return initDiceHistoryListener();
  }, []);

  // Newest-first: no auto-scroll needed — new entries appear at the top

  // Mark as read when panel opens (only react to isOpen changes)
  const markReadRef = useRef(markRead);
  markReadRef.current = markRead;
  useEffect(() => {
    if (isOpen) {
      markReadRef.current();
    }
  }, [isOpen]);

  if (!showPanel) return null;

  if (!isOpen) {
    const lastEntry = entries[0]; // First = newest (prepend order)
    const lastLabel = lastEntry
      ? `${lastEntry.result.total}${lastEntry.result.label ? ` — ${lastEntry.result.label}` : ""}${lastEntry.result.mode === "advantage" ? " (ADV)" : lastEntry.result.mode === "disadvantage" ? " (DIS)" : ""}`
      : null;
    return (
      <button
        type="button"
        className="dice-history-pill"
        onClick={togglePanel}
        title={lastLabel ?? t("history_title")}
        aria-label={`${t("history_title")}${unreadCount > 0 ? ` (${unreadCount} ${t("history_new")})` : ""}`}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="2" y="2" width="20" height="20" rx="3" />
          <circle cx="8" cy="8" r="1.5" fill="currentColor" />
          <circle cx="16" cy="8" r="1.5" fill="currentColor" />
          <circle cx="8" cy="16" r="1.5" fill="currentColor" />
          <circle cx="16" cy="16" r="1.5" fill="currentColor" />
          <circle cx="12" cy="12" r="1.5" fill="currentColor" />
        </svg>
        <span className="dice-history-pill-label">{t("history_title")}</span>
        {unreadCount > 0 && (
          <span className="dice-history-badge">{unreadCount > 99 ? "99+" : unreadCount}</span>
        )}
      </button>
    );
  }

  return (
    <div className="dice-history-panel">
      <div className="dice-history-header">
        <span className="dice-history-title">{t("history_title")}</span>
        <div className="dice-history-actions">
          {entries.length > 0 && (
            <button
              type="button"
              className="dice-history-clear"
              onClick={clear}
              title={t("clear_tooltip")}
            >
              {t("clear_button")}
            </button>
          )}
          <button
            type="button"
            className="dice-history-close"
            onClick={togglePanel}
            title={t("close_tooltip")}
            aria-label={t("close_tooltip")}
          >
            ✕
          </button>
        </div>
      </div>

      <div className="dice-history-scroll">
        {entries.length === 0 ? (
          <div className="dice-history-empty">{t("empty_message")}</div>
        ) : (
          entries.map((entry) => (
            <HistoryEntryRow key={entry.id} entry={entry} locale={locale} />
          ))
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Individual history entry
// ---------------------------------------------------------------------------

function HistoryEntryRow({ entry, locale }: { entry: HistoryEntry; locale: string }) {
  const { result, timestamp } = entry;
  const time = new Date(timestamp).toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const natClass = result.isNat20
    ? "dice-history-nat20"
    : result.isNat1
      ? "dice-history-nat1"
      : "";

  const displayTotal =
    result.mode === "resistance" && result.resistanceTotal !== undefined
      ? result.resistanceTotal
      : result.total;

  return (
    <div className={`dice-history-entry ${natClass}`}>
      <div className="dice-history-entry-top">
        <span className="dice-history-time">{time}</span>
        {result.source && (
          <span className="dice-history-source">{result.source}</span>
        )}
        {result.label && (
          <span className="dice-history-label">
            {result.label}
            {result.mode === "advantage" ? " — Advantage" : result.mode === "disadvantage" ? " — Disadvantage" : ""}
          </span>
        )}
        <ModeBadge mode={result.mode} />
      </div>
      <div className="dice-history-entry-bottom">
        <span className="dice-history-breakdown">
          <EntryBreakdown result={result} />
        </span>
        <span className={`dice-history-total ${natClass}`}>
          {displayTotal}
        </span>
      </div>
    </div>
  );
}

function ModeBadge({ mode }: { mode: RollResult["mode"] }) {
  switch (mode) {
    case "advantage":
      return <span className="dice-adv-badge">ADV</span>;
    case "disadvantage":
      return <span className="dice-dis-badge">DIS</span>;
    case "critical":
      return <span className="dice-crit-badge">CRIT</span>;
    case "resistance":
      return <span className="dice-resist-badge">RESIST</span>;
    default:
      return null;
  }
}

function diceOnlyNotation(notation: string): string {
  const { count, sides } = parseNotation(notation);
  return sides > 0 ? `${count}d${sides}` : notation;
}

function EntryBreakdown({ result }: { result: RollResult }) {
  const { mode, dice, discardedDice, modifier } = result;
  const base = diceOnlyNotation(result.notation);

  if ((mode === "advantage" || mode === "disadvantage") && discardedDice.length > 0 && dice.length > 0) {
    const kept = dice[0].value;
    const discarded = discardedDice[0].value;
    const modStr = modifier !== 0
      ? ` ${modifier >= 0 ? "+" : "−"} ${Math.abs(modifier)}`
      : "";
    return (
      <>
        {base}{" "}
        [{kept}, <span className="dice-discarded">{discarded}</span>]{modStr}
      </>
    );
  }

  if (mode === "resistance" && result.resistanceTotal !== undefined) {
    const diceStr = dice.length > 0 ? `[${dice.map((d) => d.value).join(", ")}]` : "";
    const modStr = modifier !== 0
      ? ` ${modifier >= 0 ? "+" : "−"} ${Math.abs(modifier)}`
      : "";
    return (
      <>
        {base} {diceStr}{modStr} → {result.total} ÷ 2
      </>
    );
  }

  const diceStr = dice.length > 0 ? `[${dice.map((d) => d.value).join(", ")}]` : "";
  const modStr = modifier !== 0
    ? ` ${modifier >= 0 ? "+" : "−"} ${Math.abs(modifier)}`
    : "";

  return (
    <>
      {base} {diceStr}{modStr}
    </>
  );
}
