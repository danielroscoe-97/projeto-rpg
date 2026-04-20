"use client";

import { useEffect, useRef } from "react";

interface KeyboardShortcutOptions {
  /** When false, the handler is not registered. Default true. */
  enabled?: boolean;
  /** Require Ctrl (or Cmd on mac) to be pressed. Default false. */
  ctrlOrMeta?: boolean;
  /** Require Shift to be pressed. Default false. */
  shift?: boolean;
  /** Require Alt to be pressed. Default false. */
  alt?: boolean;
  /** Skip if the active element is an input/textarea/contenteditable. Default true. */
  respectInputs?: boolean;
  /** If set, treat keys as a chord (multi-key sequence). Default false. */
  chord?: boolean;
  /** Chord window in ms. Default 800. */
  chordWindowMs?: number;
  /** Call preventDefault when matched. Default true. */
  preventDefault?: boolean;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select") return true;
  if (target.isContentEditable) return true;
  if (target.closest(".ProseMirror")) return true;
  return false;
}

/**
 * Generic global keyboard shortcut hook.
 *
 * - Single key: `useKeyboardShortcut("k", handler, { ctrlOrMeta: true })` → Ctrl/Cmd+K.
 * - Chord: `useKeyboardShortcut(["g", "d"], handler, { chord: true })` → "g" then "d".
 *
 * Respects input focus by default (handler only fires outside of text inputs).
 */
export function useKeyboardShortcut(
  keys: string | string[],
  handler: (e: KeyboardEvent) => void,
  options: KeyboardShortcutOptions = {},
) {
  const {
    enabled = true,
    ctrlOrMeta = false,
    shift = false,
    alt = false,
    respectInputs = true,
    chord = false,
    chordWindowMs = 800,
    preventDefault = true,
  } = options;

  const handlerRef = useRef(handler);
  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  const chordBufferRef = useRef<{ key: string; time: number } | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const keyArr = Array.isArray(keys) ? keys : [keys];
    const normalized = keyArr.map((k) => k.toLowerCase());

    function onKeyDown(e: KeyboardEvent) {
      if (respectInputs && isEditableTarget(e.target)) return;

      const pressedKey = e.key.toLowerCase();

      // Modifier checks
      const ctrlMatched = !ctrlOrMeta || e.ctrlKey || e.metaKey;
      const shiftMatched = shift ? e.shiftKey : !e.shiftKey || shift === false;
      // shift handling: require exact match when explicitly specified
      const shiftOk = shift ? e.shiftKey : true;
      const altOk = alt ? e.altKey : true;

      if (chord && normalized.length === 2) {
        const [first, second] = normalized;
        const now = Date.now();
        const buf = chordBufferRef.current;

        // No buffer yet — check if first key matches (no modifiers unless explicit)
        if (!buf || now - buf.time > chordWindowMs) {
          if (pressedKey === first && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
            chordBufferRef.current = { key: first, time: now };
            // Don't preventDefault on first key — user might still be typing elsewhere
          } else {
            chordBufferRef.current = null;
          }
          return;
        }

        // We have a buffered first key — check for second
        if (buf.key === first && pressedKey === second && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
          if (preventDefault) e.preventDefault();
          chordBufferRef.current = null;
          handlerRef.current(e);
          return;
        }

        // Any other key breaks the chord
        chordBufferRef.current = null;
        return;
      }

      // Non-chord: match any of the keys
      if (!normalized.includes(pressedKey)) return;
      if (!ctrlMatched) return;
      if (!shiftOk) return;
      if (!altOk) return;
      // if ctrlOrMeta is false, require that ctrl/meta are NOT pressed (otherwise
      // every browser shortcut triggers the handler)
      if (!ctrlOrMeta && (e.ctrlKey || e.metaKey)) return;

      // Unused reference to satisfy eslint no-unused-vars
      void shiftMatched;

      if (preventDefault) e.preventDefault();
      handlerRef.current(e);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled, JSON.stringify(keys), ctrlOrMeta, shift, alt, respectInputs, chord, chordWindowMs, preventDefault]); // eslint-disable-line react-hooks/exhaustive-deps
}
