"use client";

import { useState, useEffect, useRef } from "react";

interface SimilarResult {
  match_count: number;
  avg_dm_rating: number | null;
  avg_player_rating: number | null;
  has_enough_data: boolean;
}

interface SimilarEncounterPreviewProps {
  translations: {
    title: string;
    subtitle: string;
    party_size: string;
    creature_count: string;
    result_text: string;
    no_data_text: string;
    loading: string;
  };
}

export function SimilarEncounterPreview({ translations: t }: SimilarEncounterPreviewProps) {
  const [partySize, setPartySize] = useState(4);
  const [creatureCount, setCreatureCount] = useState(3);
  const [result, setResult] = useState<SimilarResult | null>(null);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (abortRef.current) abortRef.current.abort();

    debounceRef.current = setTimeout(() => {
      const controller = new AbortController();
      abortRef.current = controller;
      setLoading(true);
      fetch(
        `/api/methodology/similar?party_size=${partySize}&creature_count=${creatureCount}`,
        { signal: controller.signal }
      )
        .then((r) => r.json())
        .then((data: SimilarResult) => setResult(data))
        .catch((err) => {
          if (err instanceof DOMException && err.name === "AbortError") return;
          setResult(null);
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, [partySize, creatureCount]);

  const hasData = result !== null && result.has_enough_data && result.match_count > 0;

  return (
    <div className="rounded-xl border border-gold/15 bg-white/[0.015] p-6 space-y-5">
      {/* Header */}
      <div className="text-center">
        <p className="text-foreground/80 text-sm font-medium">{t.title}</p>
        <p className="text-foreground/40 text-xs mt-0.5">{t.subtitle}</p>
      </div>

      {/* Sliders */}
      <div className="space-y-4">
        {/* Party Size */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label
              htmlFor="party-size-slider"
              className="text-xs text-foreground/50 font-medium"
            >
              {t.party_size}
            </label>
            <span className="text-xs font-semibold text-gold tabular-nums w-4 text-right">
              {partySize}
            </span>
          </div>
          <input
            id="party-size-slider"
            type="range"
            min={1}
            max={8}
            value={partySize}
            onChange={(e) => setPartySize(Number(e.target.value))}
            className="w-full h-1.5 rounded-full appearance-none cursor-pointer
              bg-white/10
              [&::-webkit-slider-thumb]:appearance-none
              [&::-webkit-slider-thumb]:w-4
              [&::-webkit-slider-thumb]:h-4
              [&::-webkit-slider-thumb]:rounded-full
              [&::-webkit-slider-thumb]:bg-gold
              [&::-webkit-slider-thumb]:cursor-pointer
              [&::-webkit-slider-thumb]:shadow-[0_0_8px_rgba(212,168,83,0.4)]
              [&::-moz-range-thumb]:w-4
              [&::-moz-range-thumb]:h-4
              [&::-moz-range-thumb]:rounded-full
              [&::-moz-range-thumb]:bg-gold
              [&::-moz-range-thumb]:border-0
              [&::-moz-range-thumb]:cursor-pointer"
            aria-label={t.party_size}
          />
          <div className="flex justify-between mt-1">
            <span className="text-[10px] text-foreground/20">1</span>
            <span className="text-[10px] text-foreground/20">8</span>
          </div>
        </div>

        {/* Creature Count */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label
              htmlFor="creature-count-slider"
              className="text-xs text-foreground/50 font-medium"
            >
              {t.creature_count}
            </label>
            <span className="text-xs font-semibold text-gold tabular-nums w-4 text-right">
              {creatureCount}
            </span>
          </div>
          <input
            id="creature-count-slider"
            type="range"
            min={1}
            max={10}
            value={creatureCount}
            onChange={(e) => setCreatureCount(Number(e.target.value))}
            className="w-full h-1.5 rounded-full appearance-none cursor-pointer
              bg-white/10
              [&::-webkit-slider-thumb]:appearance-none
              [&::-webkit-slider-thumb]:w-4
              [&::-webkit-slider-thumb]:h-4
              [&::-webkit-slider-thumb]:rounded-full
              [&::-webkit-slider-thumb]:bg-gold
              [&::-webkit-slider-thumb]:cursor-pointer
              [&::-webkit-slider-thumb]:shadow-[0_0_8px_rgba(212,168,83,0.4)]
              [&::-moz-range-thumb]:w-4
              [&::-moz-range-thumb]:h-4
              [&::-moz-range-thumb]:rounded-full
              [&::-moz-range-thumb]:bg-gold
              [&::-moz-range-thumb]:border-0
              [&::-moz-range-thumb]:cursor-pointer"
            aria-label={t.creature_count}
          />
          <div className="flex justify-between mt-1">
            <span className="text-[10px] text-foreground/20">1</span>
            <span className="text-[10px] text-foreground/20">10</span>
          </div>
        </div>
      </div>

      {/* Result */}
      <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] px-4 py-3 text-center min-h-[52px] flex items-center justify-center">
        {loading ? (
          <span className="text-xs text-foreground/30 animate-pulse">{t.loading}</span>
        ) : hasData ? (
          <p className="text-sm text-foreground/70">
            <span className="text-gold font-semibold tabular-nums">
              {result!.match_count.toLocaleString()}
            </span>{" "}
            {t.result_text.replace(
              "{difficulty}",
              result!.avg_dm_rating != null
                ? result!.avg_dm_rating.toFixed(1)
                : "—"
            )}
          </p>
        ) : (
          <p className="text-xs text-foreground/30">{t.no_data_text}</p>
        )}
      </div>
    </div>
  );
}
