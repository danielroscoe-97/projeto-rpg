"use client";

import { useState } from "react";
import { createSessionToken } from "@/lib/supabase/session-token";

interface ShareSessionButtonProps {
  sessionId: string;
}

export function ShareSessionButton({ sessionId }: ShareSessionButtonProps) {
  const [joinUrl, setJoinUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateLink = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { joinUrl: url } = await createSessionToken(sessionId);
      setJoinUrl(url);
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      setError("Failed to generate link");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!joinUrl) return;
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      setError("Failed to copy");
    }
  };

  return (
    <div className="flex items-center gap-2" data-testid="share-session">
      {!joinUrl ? (
        <button
          type="button"
          onClick={handleGenerateLink}
          disabled={isLoading}
          className="px-3 py-2 text-sm font-medium rounded-md bg-[#e94560] text-white hover:bg-[#e94560]/80 transition-colors disabled:opacity-50 min-h-[44px]"
          aria-label="Generate session link"
          data-testid="share-session-generate"
        >
          {isLoading ? "Generating..." : "Share Session"}
        </button>
      ) : (
        <div className="flex items-center gap-2">
          <input
            type="text"
            readOnly
            value={joinUrl}
            className="bg-[#1a1a2e] border border-white/10 rounded-md px-3 py-2 text-white text-xs font-mono w-[220px] truncate"
            aria-label="Session join link"
            data-testid="share-session-url"
          />
          <button
            type="button"
            onClick={handleCopy}
            className="px-3 py-2 text-sm font-medium rounded-md bg-white/10 text-white hover:bg-white/20 transition-colors min-h-[44px]"
            aria-label="Copy session link"
            data-testid="share-session-copy"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      )}
      {error && (
        <span className="text-red-400 text-xs" data-testid="share-session-error">
          {error}
        </span>
      )}
    </div>
  );
}
