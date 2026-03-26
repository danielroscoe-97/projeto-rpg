"use client";

import { useEffect, useRef } from "react";
import {
  useDiceHistoryStore,
  initDiceHistoryListener,
  type HistoryEntry,
} from "@/lib/stores/dice-history-store";
import type { RollResult } from "@/lib/dice/roll";

// ---------------------------------------------------------------------------
// DiceHistoryPanel — floating bottom-right panel showing all dice rolls
// from the current session. Collapsible pill when closed.
// ---------------------------------------------------------------------------

export function DiceHistoryPanel() {
  const { entries, isOpen, unreadCount, togglePanel, clear, markRead } =
    useDiceHistoryStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Init the CustomEvent listener for roll results
  useEffect(() => {
    return initDiceHistoryListener();
  }, []);

  // Auto-scroll to bottom on new entry when panel is open
  useEffect(() => {
    if (isOpen && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries.length, isOpen]);

  // Mark as read when panel opens (only react to isOpen changes)
  useEffect(() => {
    if (isOpen) {
      markRead();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) {
    return (
      <button
        type="button"
        className="dice-history-pill"
        onClick={togglePanel}
        title="Histórico de rolls"
        aria-label={`Histórico de rolls${unreadCount > 0 ? ` (${unreadCount} novos)` : ""}`}
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
        {unreadCount > 0 && (
          <span className="dice-history-badge">{unreadCount > 99 ? "99+" : unreadCount}</span>
        )}
      </button>
    );
  }

  return (
    <div className="dice-history-panel">
      <div className="dice-history-header">
        <span className="dice-history-title">Histórico de Rolls</span>
        <div className="dice-history-actions">
          {entries.length > 0 && (
            <button
              type="button"
              className="dice-history-clear"
              onClick={clear}
              title="Limpar histórico"
            >
              Limpar
            </button>
          )}
          <button
            type="button"
            className="dice-history-close"
            onClick={togglePanel}
            title="Fechar histórico"
            aria-label="Fechar histórico"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="dice-history-scroll" ref={scrollRef}>
        {entries.length === 0 ? (
          <div className="dice-history-empty">Nenhum roll ainda.</div>
        ) : (
          entries.map((entry) => (
            <HistoryEntryRow key={entry.id} entry={entry} />
          ))
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Individual history entry
// ---------------------------------------------------------------------------

function HistoryEntryRow({ entry }: { entry: HistoryEntry }) {
  const { result, timestamp } = entry;
  const time = new Date(timestamp).toLocaleTimeString("pt-BR", {
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
        {result.label && (
          <span className="dice-history-label">{result.label}</span>
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

function EntryBreakdown({ result }: { result: RollResult }) {
  const { mode, dice, discardedDice, modifier } = result;

  if ((mode === "advantage" || mode === "disadvantage") && discardedDice.length > 0 && dice.length > 0) {
    const kept = dice[0].value;
    const discarded = discardedDice[0].value;
    const modStr = modifier !== 0
      ? ` ${modifier >= 0 ? "+" : "−"} ${Math.abs(modifier)}`
      : "";
    return (
      <>
        {result.notation}{" "}
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
        {result.notation} {diceStr}{modStr} → {result.total} ÷ 2
      </>
    );
  }

  const diceStr = dice.length > 0 ? `[${dice.map((d) => d.value).join(", ")}]` : "";
  const modStr = modifier !== 0
    ? ` ${modifier >= 0 ? "+" : "−"} ${Math.abs(modifier)}`
    : "";

  return (
    <>
      {result.notation} {diceStr}{modStr}
    </>
  );
}
