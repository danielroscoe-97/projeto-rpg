"use client";

import { useState, useEffect, useCallback, useRef } from "react";

const LS_AUDIO_UNLOCKED_KEY = "audio_autoplay_unlocked";

/**
 * Hook to manage mobile autoplay restrictions.
 *
 * On iOS/Android, browsers block Audio.play() until a user gesture occurs.
 * This hook:
 * 1. Checks if AudioContext is suspended
 * 2. Exposes `needsUnlock` — true when user must tap to enable audio
 * 3. Provides `unlock()` — call on user gesture to resume AudioContext
 * 4. Persists preference in localStorage
 *
 * Fallback: if autoplay fails silently, logs a warning but does not crash.
 */
export function useAudioAutoplay() {
  const [needsUnlock, setNeedsUnlock] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    // Check if previously unlocked in this browser
    const wasUnlocked = localStorage.getItem(LS_AUDIO_UNLOCKED_KEY) === "true";

    // Create an AudioContext to test the state
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) {
        // No AudioContext support — assume autoplay works
        setIsUnlocked(true);
        return;
      }

      const ctx = new AudioCtx();
      audioContextRef.current = ctx;

      if (ctx.state === "suspended") {
        if (wasUnlocked) {
          // User previously unlocked — try to resume silently
          ctx.resume().then(() => {
            setIsUnlocked(true);
            setNeedsUnlock(false);
          }).catch(() => {
            // Still blocked — need user gesture
            setNeedsUnlock(true);
          });
        } else {
          setNeedsUnlock(true);
        }
      } else {
        // AudioContext is running — autoplay should work
        setIsUnlocked(true);
        localStorage.setItem(LS_AUDIO_UNLOCKED_KEY, "true");
      }

      // Listen for state changes
      ctx.onstatechange = () => {
        if (ctx.state === "running") {
          setIsUnlocked(true);
          setNeedsUnlock(false);
          localStorage.setItem(LS_AUDIO_UNLOCKED_KEY, "true");
        }
      };
    } catch (err) {
      console.warn("[useAudioAutoplay] AudioContext creation failed:", err);
      // Assume autoplay works if we can't create AudioContext
      setIsUnlocked(true);
    }

    return () => {
      // Don't close the AudioContext on cleanup — it may be reused
    };
  }, []);

  const unlock = useCallback(() => {
    const ctx = audioContextRef.current;
    if (ctx && ctx.state === "suspended") {
      ctx.resume().then(() => {
        setIsUnlocked(true);
        setNeedsUnlock(false);
        localStorage.setItem(LS_AUDIO_UNLOCKED_KEY, "true");
      }).catch((err) => {
        console.warn("[useAudioAutoplay] Failed to resume AudioContext:", err);
      });
    }

    // Also play a silent audio element to unlock HTMLAudioElement.play()
    // This is necessary because some browsers (Safari) require a user-gesture-initiated
    // Audio.play() before allowing programmatic playback.
    try {
      const silentAudio = new Audio();
      // Tiny silent WAV (44 bytes) as a data URI
      silentAudio.src = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=";
      silentAudio.volume = 0;
      silentAudio.play().then(() => {
        silentAudio.pause();
        setIsUnlocked(true);
        setNeedsUnlock(false);
        localStorage.setItem(LS_AUDIO_UNLOCKED_KEY, "true");
      }).catch((err) => {
        console.warn("[useAudioAutoplay] Silent audio play failed:", err);
      });
    } catch (err) {
      console.warn("[useAudioAutoplay] Silent audio fallback failed:", err);
    }
  }, []);

  return { needsUnlock, isUnlocked, unlock };
}
