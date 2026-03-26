"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import ReactMarkdown from "react-markdown";
import { RefreshCw } from "lucide-react";
import { usePinnedCardsStore } from "@/lib/stores/pinned-cards-store";
import type { OracleAIData } from "@/lib/stores/pinned-cards-store";

export function OracleAIModal() {
  const t = useTranslations("oracle_ai");
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // AI streaming state
  const [streaming, setStreaming] = useState(false);
  const [response, setResponse] = useState("");
  const [sources, setSources] = useState<{ title: string; uri: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  const pinOracleAI = usePinnedCardsStore((s) => s.pinOracleAI);
  const streamingRef = useRef(false);

  // Abort in-flight request on unmount
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  // Listen for custom event from OracleAITrigger
  useEffect(() => {
    function handleOpen() {
      setOpen(true);
    }
    window.addEventListener("open-oracle-ai", handleOpen);
    return () => window.removeEventListener("open-oracle-ai", handleOpen);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const resetState = useCallback(() => {
    if (abortRef.current) abortRef.current.abort();
    setStreaming(false);
    setResponse("");
    setSources([]);
    setError(null);
    setQuestion("");
  }, []);

  // Soft dismiss — backdrop click preserves query + response for quick reopen
  const handleDismiss = useCallback(() => {
    setOpen(false);
  }, []);

  // Full close — ESC clears everything
  const handleClose = useCallback(() => {
    setOpen(false);
    setQuery("");
    resetState();
  }, [resetState]);

  // ESC to close
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        handleClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, handleClose]);

  // Ask Oracle AI
  const handleAsk = useCallback(async (overrideQuery?: string) => {
    const q = (overrideQuery ?? query).trim();
    if (!q || streamingRef.current) return;

    streamingRef.current = true;
    setStreaming(true);
    setResponse("");
    setSources([]);
    setError(null);
    setQuestion(q);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/oracle-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Request failed" }));
        setError(err.error || `Error ${res.status}`);
        setStreaming(false);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        setError("No response stream");
        setStreaming(false);
        return;
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        let lineEnd: number;
        while ((lineEnd = buffer.indexOf("\n")) !== -1) {
          const line = buffer.slice(0, lineEnd).replace(/\r$/, "");
          buffer = buffer.slice(lineEnd + 1);

          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (!data || data === "[DONE]") continue;

          try {
            const parsed = JSON.parse(data);
            if (parsed.text) {
              setResponse((prev) => prev + parsed.text);
            }
            if (parsed.sources) {
              setSources(parsed.sources);
            }
            if (parsed.error) {
              setError(parsed.error);
            }
          } catch {
            // Skip malformed
          }
        }
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      streamingRef.current = false;
      setStreaming(false);
    }
  }, [query]);

  const handlePin = useCallback(() => {
    if (!response || !question) return;
    const data: OracleAIData = {
      question,
      answer: response,
      sources: sources.length > 0 ? sources : undefined,
    };
    pinOracleAI(data);
    handleClose();
  }, [response, question, sources, pinOracleAI, handleClose]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && query.trim() && !streaming) {
      e.preventDefault();
      handleAsk();
    }
  }, [handleAsk, query, streaming]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm animate-in fade-in-0 duration-150"
        onClick={handleDismiss}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[61] flex items-start justify-center pt-[15vh] md:pt-[20vh] px-4">
        <div className="w-full max-w-[640px] rounded-xl border border-[#c9a959]/30 bg-[#1a1a28] shadow-2xl shadow-black/40 overflow-hidden animate-in zoom-in-95 fade-in-0 duration-150">
          {/* Input */}
          <div className="flex items-center border-b border-[#c9a959]/20 px-4">
            <span className="shrink-0 mr-3 text-[#c9a959] text-sm" aria-hidden="true">✨</span>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t("placeholder")}
              className="flex-1 h-12 bg-transparent text-[#c9a959] text-base placeholder:text-[#c9a959]/40 outline-none"
              disabled={streaming}
            />
            {query.trim() && !streaming && (
              <button
                type="button"
                onClick={() => handleAsk()}
                className="mr-2 px-2 py-1 text-xs font-medium text-[#1a1a28] bg-[#c9a959] rounded hover:bg-[#c9a959]/80 transition-colors"
              >
                {t("ask")}
              </button>
            )}
            <button
              type="button"
              onClick={handleClose}
              className="hidden md:inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground bg-white/[0.06] rounded border border-white/[0.08] hover:bg-white/[0.12] hover:text-foreground transition-colors cursor-pointer"
            >
              ESC
            </button>
          </div>

          {/* Content */}
          <div className="max-h-[min(400px,50vh)] overflow-y-auto p-4">
            {/* Empty state */}
            {!question && !streaming && (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                {t("hint")}
              </div>
            )}

            {/* Response */}
            {(streaming || response) && (
              <div className="space-y-3">
                {/* Question echo */}
                <p className="text-sm italic text-muted-foreground border-l-2 border-[#c9a959]/30 pl-3">
                  &ldquo;{question}&rdquo;
                </p>

                {/* Response text */}
                <div className="oracle-ai-markdown text-sm text-[#e8e4d0] leading-relaxed">
                  <ReactMarkdown>{response}</ReactMarkdown>
                </div>

                {/* Streaming dots */}
                {streaming && (
                  <div className="oracle-ai-streaming">
                    <span className="oracle-ai-streaming-dot" />
                    <span className="oracle-ai-streaming-dot" />
                    <span className="oracle-ai-streaming-dot" />
                  </div>
                )}

                {/* Sources */}
                {sources.length > 0 && !streaming && (
                  <div className="mt-3 pt-3 border-t border-[#c9a959]/20">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{t("sources")}</span>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {sources.map((src, i) => (
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

                {/* Actions */}
                {!streaming && response && (
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/[0.08]">
                    <button
                      type="button"
                      onClick={handlePin}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#c9a959] bg-[#c9a959]/10 rounded-lg border border-[#c9a959]/20 hover:bg-[#c9a959]/20 transition-colors"
                    >
                      📌 {t("pin")}
                    </button>
                    <button
                      type="button"
                      onClick={() => navigator.clipboard.writeText(response)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-muted-foreground bg-white/[0.04] rounded-lg border border-white/[0.08] hover:bg-white/[0.08] transition-colors"
                    >
                      📋 {t("copy")}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="px-4 py-4 text-center text-sm text-red-400 space-y-3">
                <p>{error}</p>
                {!streaming && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setQuery(question);
                        handleAsk(question);
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-[#c9a959] border border-[#c9a959]/40 rounded-lg hover:bg-[#c9a959]/10 transition-colors min-h-[44px]"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      {t("retry")}
                    </button>
                    <p className="text-xs text-muted-foreground">
                      <a
                        href="/app/compendium"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#c9a959]/70 hover:text-[#c9a959] transition-colors"
                      >
                        {t("compendium_fallback")}
                      </a>
                    </p>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-white/[0.08] px-4 py-2 flex items-center gap-4 text-[11px] text-muted-foreground">
            {query.trim() && (
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 bg-[#c9a959]/15 text-[#c9a959] rounded text-[10px] font-mono border border-[#c9a959]/20">↵</kbd>
                {t("ask")}
              </span>
            )}
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-white/[0.06] rounded text-[10px] font-mono">esc</kbd>
              {t("close")}
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
