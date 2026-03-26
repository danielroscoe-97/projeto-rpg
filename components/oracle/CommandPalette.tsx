"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Command } from "cmdk";
import { searchMonsters, searchSpells, getAllConditions } from "@/lib/srd/srd-search";
import { usePinnedCardsStore } from "@/lib/stores/pinned-cards-store";
import { useSrdStore } from "@/lib/stores/srd-store";
import { SpellDescriptionModal } from "@/components/oracle/SpellDescriptionModal";
import { ConditionRulesModal } from "@/components/oracle/ConditionRulesModal";
import type { SrdMonster, SrdSpell } from "@/lib/srd/srd-loader";
import type { SrdCondition } from "@/lib/srd/srd-loader";
import type { OracleAIData } from "@/lib/stores/pinned-cards-store";
import { Skull, Sparkles, HeartPulse } from "lucide-react";

const MAX_RESULTS_PER_GROUP = 5;
const DEBOUNCE_MS = 150;

type PaletteMode = "search" | "ai";

export function CommandPalette() {
  const t = useTranslations("command_palette");
  const tAI = useTranslations("oracle_ai");
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Mode toggle: search vs AI
  const [mode, setMode] = useState<PaletteMode>("search");

  // AI streaming state
  const [aiStreaming, setAiStreaming] = useState(false);
  const [aiResponse, setAiResponse] = useState("");
  const [aiSources, setAiSources] = useState<{ title: string; uri: string }[]>([]);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiQuestion, setAiQuestion] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  // Modal state for detail views
  const [selectedSpell, setSelectedSpell] = useState<SrdSpell | null>(null);
  const [selectedCondition, setSelectedCondition] = useState<SrdCondition | null>(null);

  const pinCard = usePinnedCardsStore((s) => s.pinCard);
  const pinOracleAI = usePinnedCardsStore((s) => s.pinOracleAI);
  const isLoading = useSrdStore((s) => s.is_loading);

  // Debounce query (only for search mode)
  useEffect(() => {
    if (mode !== "search") return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setDebouncedQuery(query), DEBOUNCE_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query, mode]);

  // Search results (only in search mode)
  const monsterResults = mode === "search" && debouncedQuery
    ? searchMonsters(debouncedQuery).slice(0, MAX_RESULTS_PER_GROUP)
    : [];
  const spellResults = mode === "search" && debouncedQuery
    ? searchSpells(debouncedQuery).slice(0, MAX_RESULTS_PER_GROUP)
    : [];
  const conditionResults = mode === "search" && debouncedQuery
    ? getAllConditions().filter((c) =>
        c.name.toLowerCase().includes(debouncedQuery.toLowerCase()),
      ).slice(0, MAX_RESULTS_PER_GROUP)
    : [];

  const hasResults = monsterResults.length > 0 || spellResults.length > 0 || conditionResults.length > 0;

  const resetAIState = useCallback(() => {
    if (abortRef.current) abortRef.current.abort();
    setAiStreaming(false);
    setAiResponse("");
    setAiSources([]);
    setAiError(null);
    setAiQuestion("");
  }, []);

  const handleClose = useCallback(() => {
    setOpen(false);
    setQuery("");
    setDebouncedQuery("");
    resetAIState();
  }, [resetAIState]);

  // Toggle mode
  const toggleMode = useCallback(() => {
    setMode((prev) => (prev === "search" ? "ai" : "search"));
    resetAIState();
    setQuery("");
    setDebouncedQuery("");
  }, [resetAIState]);

  // Global keyboard shortcuts (Ctrl+K to toggle, ESC to close)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape" && open) {
        e.preventDefault();
        handleClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, handleClose]);

  // Tab to toggle mode (when palette is open)
  const handleInputKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Tab") {
      e.preventDefault();
      toggleMode();
    }
    // Enter in AI mode triggers the query
    if (e.key === "Enter" && mode === "ai" && query.trim() && !aiStreaming) {
      e.preventDefault();
      handleAskOracle();
    }
  }, [toggleMode, mode, query, aiStreaming]); // eslint-disable-line react-hooks/exhaustive-deps

  // Ask Oracle AI
  const handleAskOracle = useCallback(async () => {
    const question = query.trim();
    if (!question || aiStreaming) return;

    setAiStreaming(true);
    setAiResponse("");
    setAiSources([]);
    setAiError(null);
    setAiQuestion(question);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/oracle-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Request failed" }));
        setAiError(err.error || `Error ${res.status}`);
        setAiStreaming(false);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        setAiError("No response stream");
        setAiStreaming(false);
        return;
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const data = line.replace(/^data: /, "").trim();
          if (!data || data === "[DONE]") continue;

          try {
            const parsed = JSON.parse(data);
            if (parsed.text) {
              setAiResponse((prev) => prev + parsed.text);
            }
            if (parsed.sources) {
              setAiSources(parsed.sources);
            }
            if (parsed.error) {
              setAiError(parsed.error);
            }
          } catch {
            // Skip malformed chunks
          }
        }
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setAiError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setAiStreaming(false);
    }
  }, [query, aiStreaming]);

  // Pin the AI response as a floating card
  const handlePinAIResponse = useCallback(() => {
    if (!aiResponse || !aiQuestion) return;
    const data: OracleAIData = {
      question: aiQuestion,
      answer: aiResponse,
      sources: aiSources.length > 0 ? aiSources : undefined,
    };
    pinOracleAI(data);
    handleClose();
  }, [aiResponse, aiQuestion, aiSources, pinOracleAI, handleClose]);

  const handlePinMonster = useCallback((monster: SrdMonster) => {
    pinCard("monster", monster.id, monster.ruleset_version);
    handleClose();
  }, [pinCard, handleClose]);

  const handlePinSpell = useCallback((spell: SrdSpell) => {
    pinCard("spell", spell.id, spell.ruleset_version);
    handleClose();
  }, [pinCard, handleClose]);

  const handleViewSpell = useCallback((spell: SrdSpell) => {
    setSelectedSpell(spell);
    handleClose();
  }, [handleClose]);

  const handlePinCondition = useCallback((condition: SrdCondition) => {
    pinCard("condition", condition.id, "2014");
    handleClose();
  }, [pinCard, handleClose]);

  const handleViewCondition = useCallback((condition: SrdCondition) => {
    setSelectedCondition(condition);
    handleClose();
  }, [handleClose]);

  function formatCR(cr: string) {
    return cr === "0.125" ? "1/8" : cr === "0.25" ? "1/4" : cr === "0.5" ? "1/2" : cr;
  }

  function formatSpellLevel(level: number) {
    if (level === 0) return t("cantrip");
    return t("level_n", { level });
  }

  const isAIMode = mode === "ai";

  if (!open) return (
    <>
      <SpellDescriptionModal
        spell={selectedSpell}
        open={!!selectedSpell}
        onOpenChange={(v) => !v && setSelectedSpell(null)}
        onPin={selectedSpell ? () => {
          pinCard("spell", selectedSpell.id, selectedSpell.ruleset_version);
          setSelectedSpell(null);
        } : undefined}
      />
      <ConditionRulesModal
        condition={selectedCondition}
        open={!!selectedCondition}
        onOpenChange={(v) => !v && setSelectedCondition(null)}
      />
    </>
  );

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm animate-in fade-in-0 duration-150"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Command Palette */}
      <div className="fixed inset-0 z-[61] flex items-start justify-center pt-[15vh] md:pt-[20vh] px-4">
        <Command
          className={`w-full max-w-[640px] rounded-xl border bg-[#1a1a28] shadow-2xl shadow-black/40 overflow-hidden animate-in zoom-in-95 fade-in-0 duration-150 ${
            isAIMode ? "border-[#c9a959]/30" : "border-white/10"
          }`}
          label={isAIMode ? tAI("title") : t("label")}
          shouldFilter={false}
        >
          {/* Input area */}
          <div className={`flex items-center border-b px-4 ${
            isAIMode ? "border-[#c9a959]/20" : "border-white/[0.08]"
          }`}>
            {/* Mode icon */}
            {isAIMode ? (
              <span className="shrink-0 mr-3 text-[#c9a959] text-sm" aria-hidden="true">✨</span>
            ) : (
              <svg
                className="w-4 h-4 text-muted-foreground shrink-0 mr-3"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
            )}
            <Command.Input
              value={query}
              onValueChange={setQuery}
              placeholder={isAIMode ? tAI("placeholder") : t("placeholder")}
              className={`flex-1 h-12 bg-transparent text-base outline-none ${
                isAIMode ? "text-[#c9a959] placeholder:text-[#c9a959]/40" : "text-foreground placeholder:text-muted-foreground"
              }`}
              onKeyDown={handleInputKeyDown}
            />
            {/* AI send button (only in AI mode when there's a query) */}
            {isAIMode && query.trim() && !aiStreaming && (
              <button
                type="button"
                onClick={handleAskOracle}
                className="mr-2 px-2 py-1 text-xs font-medium text-[#1a1a28] bg-[#c9a959] rounded hover:bg-[#c9a959]/80 transition-colors"
                aria-label={tAI("ask")}
              >
                {tAI("ask")}
              </button>
            )}
            <button
              type="button"
              onClick={handleClose}
              className="hidden md:inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground bg-white/[0.06] rounded border border-white/[0.08] hover:bg-white/[0.12] hover:text-foreground transition-colors cursor-pointer"
              aria-label={t("hint_close")}
            >
              ESC
            </button>
          </div>

          {/* Content area */}
          {isAIMode ? (
            /* ---- AI MODE ---- */
            <div className="max-h-[min(400px,50vh)] overflow-y-auto p-4">
              {/* No query yet */}
              {!aiQuestion && !aiStreaming && (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                  {tAI("hint")}
                </div>
              )}

              {/* Streaming response */}
              {(aiStreaming || aiResponse) && (
                <div className="space-y-3">
                  {/* Question echo */}
                  <p className="text-sm italic text-muted-foreground border-l-2 border-[#c9a959]/30 pl-3">
                    &ldquo;{aiQuestion}&rdquo;
                  </p>

                  {/* Response text */}
                  <div className="text-sm text-[#e8e4d0] leading-relaxed whitespace-pre-wrap">
                    {aiResponse}
                  </div>

                  {/* Streaming indicator */}
                  {aiStreaming && (
                    <div className="oracle-ai-streaming">
                      <span className="oracle-ai-streaming-dot" />
                      <span className="oracle-ai-streaming-dot" />
                      <span className="oracle-ai-streaming-dot" />
                    </div>
                  )}

                  {/* Sources */}
                  {aiSources.length > 0 && !aiStreaming && (
                    <div className="mt-3 pt-3 border-t border-[#c9a959]/20">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{tAI("sources")}</span>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {aiSources.map((src, i) => (
                          <a
                            key={i}
                            href={src.uri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-[#c9a959] hover:text-[#e8e4d0] border-b border-dotted border-[#c9a959]/40 transition-colors"
                          >
                            {src.title || src.uri}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Pin button (when streaming is done) */}
                  {!aiStreaming && aiResponse && (
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/[0.08]">
                      <button
                        type="button"
                        onClick={handlePinAIResponse}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#c9a959] bg-[#c9a959]/10 rounded-lg border border-[#c9a959]/20 hover:bg-[#c9a959]/20 transition-colors"
                      >
                        📌 {tAI("pin")}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(aiResponse);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-muted-foreground bg-white/[0.04] rounded-lg border border-white/[0.08] hover:bg-white/[0.08] transition-colors"
                      >
                        📋 {tAI("copy")}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Error */}
              {aiError && (
                <div className="px-4 py-4 text-center text-sm text-red-400">
                  {aiError}
                </div>
              )}
            </div>
          ) : (
            /* ---- SEARCH MODE ---- */
            <Command.List className="max-h-[min(400px,50vh)] overflow-y-auto p-2">
              {isLoading && (
                <Command.Loading>
                  <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                    {t("loading")}
                  </div>
                </Command.Loading>
              )}

              {!isLoading && debouncedQuery && !hasResults && (
                <Command.Empty className="px-4 py-8 text-center text-sm text-muted-foreground">
                  {t("no_results")}
                </Command.Empty>
              )}

              {!debouncedQuery && !isLoading && (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                  {t("hint")}
                </div>
              )}

              {/* Monsters */}
              {monsterResults.length > 0 && (
                <Command.Group heading={t("group_monsters")}>
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <Skull className="inline-block w-3.5 h-3.5 -mt-0.5" aria-hidden="true" /> {t("group_monsters")}
                  </div>
                  {monsterResults.map((r) => (
                    <Command.Item
                      key={`m:${r.item.id}:${r.item.ruleset_version}`}
                      value={`monster:${r.item.id}:${r.item.ruleset_version}`}
                      onSelect={() => handlePinMonster(r.item)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer text-sm text-foreground hover:bg-white/[0.06] aria-selected:bg-white/[0.10] transition-colors min-h-[44px]"
                    >
                      <div className="flex-1 min-w-0">
                        <span className="font-medium">{r.item.name}</span>
                        <span className="ml-2 text-xs text-muted-foreground">
                          CR {formatCR(r.item.cr)} · {r.item.type}
                        </span>
                      </div>
                      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                        r.item.ruleset_version === "2024" ? "bg-blue-900/40 text-blue-400" : "bg-white/[0.06] text-muted-foreground"
                      }`}>
                        {r.item.ruleset_version}
                      </span>
                    </Command.Item>
                  ))}
                </Command.Group>
              )}

              {/* Spells */}
              {spellResults.length > 0 && (
                <Command.Group heading={t("group_spells")}>
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <Sparkles className="inline-block w-3.5 h-3.5 -mt-0.5" aria-hidden="true" /> {t("group_spells")}
                  </div>
                  {spellResults.map((r) => (
                    <Command.Item
                      key={`s:${r.item.id}:${r.item.ruleset_version}`}
                      value={`spell:${r.item.id}:${r.item.ruleset_version}`}
                      onSelect={() => handleViewSpell(r.item)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer text-sm text-foreground hover:bg-white/[0.06] aria-selected:bg-white/[0.10] transition-colors min-h-[44px]"
                    >
                      <div className="flex-1 min-w-0">
                        <span className="font-medium">{r.item.name}</span>
                        <span className="ml-2 text-xs text-muted-foreground">
                          {formatSpellLevel(r.item.level)} · {r.item.school}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {r.item.concentration && (
                          <span className="text-[10px] text-amber-400" title="Concentration">◉</span>
                        )}
                        {r.item.ritual && (
                          <span className="text-[10px] text-teal-400" title="Ritual">®</span>
                        )}
                        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                          r.item.ruleset_version === "2024" ? "bg-blue-900/40 text-blue-400" : "bg-white/[0.06] text-muted-foreground"
                        }`}>
                          {r.item.ruleset_version}
                        </span>
                      </div>
                    </Command.Item>
                  ))}
                </Command.Group>
              )}

              {/* Conditions */}
              {conditionResults.length > 0 && (
                <Command.Group heading={t("group_conditions")}>
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <HeartPulse className="inline-block w-3.5 h-3.5 -mt-0.5" aria-hidden="true" /> {t("group_conditions")}
                  </div>
                  {conditionResults.map((c) => (
                    <Command.Item
                      key={`c:${c.id}`}
                      value={`condition:${c.id}`}
                      onSelect={() => handleViewCondition(c)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer text-sm text-foreground hover:bg-white/[0.06] aria-selected:bg-white/[0.10] transition-colors min-h-[44px]"
                    >
                      <span className="font-medium">{c.name}</span>
                      <span className="text-xs text-muted-foreground truncate flex-1">
                        {c.description.split("\n")[0].slice(0, 60)}…
                      </span>
                    </Command.Item>
                  ))}
                </Command.Group>
              )}
            </Command.List>
          )}

          {/* Footer hints */}
          <div className="border-t border-white/[0.08] px-4 py-2 flex items-center gap-4 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <kbd className={`px-1 py-0.5 rounded text-[10px] font-mono ${
                isAIMode ? "bg-[#c9a959]/15 text-[#c9a959] border border-[#c9a959]/20" : "bg-white/[0.06]"
              }`}>Tab</kbd>
              {isAIMode ? tAI("switch_search") : tAI("switch_ai")}
            </span>
            {!isAIMode && (
              <>
                <span className="flex items-center gap-1">
                  <kbd className="px-1 py-0.5 bg-white/[0.06] rounded text-[10px] font-mono">↑↓</kbd>
                  {t("hint_navigate")}
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1 py-0.5 bg-white/[0.06] rounded text-[10px] font-mono">↵</kbd>
                  {t("hint_select")}
                </span>
              </>
            )}
            {isAIMode && query.trim() && (
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 bg-[#c9a959]/15 text-[#c9a959] rounded text-[10px] font-mono border border-[#c9a959]/20">↵</kbd>
                {tAI("ask")}
              </span>
            )}
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-white/[0.06] rounded text-[10px] font-mono">esc</kbd>
              {t("hint_close")}
            </span>
          </div>
        </Command>
      </div>

      {/* Detail modals (rendered when palette is open too, in case user navigates back) */}
      <SpellDescriptionModal
        spell={selectedSpell}
        open={!!selectedSpell}
        onOpenChange={(v) => !v && setSelectedSpell(null)}
        onPin={selectedSpell ? () => {
          pinCard("spell", selectedSpell.id, selectedSpell.ruleset_version);
          setSelectedSpell(null);
        } : undefined}
      />
      <ConditionRulesModal
        condition={selectedCondition}
        open={!!selectedCondition}
        onOpenChange={(v) => !v && setSelectedCondition(null)}
      />
    </>
  );
}
