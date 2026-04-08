"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, Eraser } from "lucide-react";

const MAX_CHARS = 2000;
const DEBOUNCE_MS = 500;

interface ScratchPadProps {
  characterId: string;
  readOnly?: boolean;
}

function getStorageKey(characterId: string) {
  return `scratch-pad-${characterId}`;
}

export function ScratchPad({ characterId, readOnly }: ScratchPadProps) {
  const t = useTranslations("player_hq.notes");
  const [text, setText] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(getStorageKey(characterId));
      if (stored) {
        setText(stored);
        setExpanded(true);
      }
    } catch {
      // localStorage unavailable
    }
  }, [characterId]);

  // Auto-resize textarea
  const autoResize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, []);

  useEffect(() => {
    autoResize();
  }, [text, expanded, autoResize]);

  // Debounced save to localStorage
  const saveToStorage = useCallback(
    (value: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        try {
          if (value) {
            localStorage.setItem(getStorageKey(characterId), value);
          } else {
            localStorage.removeItem(getStorageKey(characterId));
          }
        } catch {
          // localStorage unavailable
        }
      }, DEBOUNCE_MS);
    },
    [characterId]
  );

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value.slice(0, MAX_CHARS);
    setText(value);
    saveToStorage(value);
  };

  const handleClear = () => {
    if (!confirmClear) {
      setConfirmClear(true);
      return;
    }
    setText("");
    setConfirmClear(false);
    try {
      localStorage.removeItem(getStorageKey(characterId));
    } catch {
      // localStorage unavailable
    }
  };

  // Reset confirm when clicking elsewhere
  useEffect(() => {
    if (!confirmClear) return;
    const timer = setTimeout(() => setConfirmClear(false), 3000);
    return () => clearTimeout(timer);
  }, [confirmClear]);

  return (
    <div className="bg-rpg-parchment border border-amber-400/10 rounded-xl p-3">
      {/* Header row */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="flex items-center gap-1.5 flex-1 min-h-[44px] text-left"
          aria-expanded={expanded}
        >
          <ChevronDown
            className={`w-4 h-4 text-amber-400 transition-transform ${
              expanded ? "" : "-rotate-90"
            }`}
          />
          <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
            {t("scratch_pad_label")}
          </span>
        </button>

        {text.length > 0 && !readOnly && (
          <button
            type="button"
            onClick={handleClear}
            className={`flex items-center gap-1 min-h-[44px] min-w-[44px] justify-center px-2 text-xs transition-colors ${
              confirmClear ? "text-red-400" : "text-muted-foreground hover:text-red-400"
            }`}
          >
            <Eraser className="w-3.5 h-3.5" />
            <span>{confirmClear ? t("scratch_pad_clear_confirm") : t("scratch_pad_clear")}</span>
          </button>
        )}
      </div>

      {/* Content — animated expand/collapse via grid-rows */}
      <div
        className="grid transition-[grid-template-rows] duration-200 ease-out"
        style={{ gridTemplateRows: expanded ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <div className="mt-2 space-y-1">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={handleChange}
              readOnly={readOnly}
              placeholder={t("scratch_pad_placeholder")}
              maxLength={MAX_CHARS}
              className="w-full bg-transparent text-sm text-foreground/90 placeholder:text-amber-400/20 placeholder:italic resize-none focus:outline-none min-h-[40px]"
              style={{ maxHeight: 200 }}
              rows={1}
            />
            {text.length > 0 && (
              <div className={`text-right text-[10px] tabular-nums transition-colors ${
                text.length > MAX_CHARS * 0.8 ? "text-amber-400" : "text-muted-foreground/50"
              }`}>
                {text.length}/{MAX_CHARS}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
