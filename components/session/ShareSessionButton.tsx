"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { createSessionToken } from "@/lib/supabase/session-token";

interface ShareSessionButtonProps {
  sessionId: string;
}

export function ShareSessionButton({ sessionId }: ShareSessionButtonProps) {
  const t = useTranslations("session");
  const tc = useTranslations("common");
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
      setError(t("share_error"));
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
      setError(t("share_copy_error"));
    }
  };

  return (
    <div className="flex items-center gap-2" data-testid="share-session">
      {!joinUrl ? (
        <button
          type="button"
          onClick={handleGenerateLink}
          disabled={isLoading}
          className="px-3 py-2 text-sm font-medium rounded-md bg-gold text-foreground transition-all duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)] disabled:opacity-50 min-h-[44px]"
          aria-label={t("share_button")}
          data-testid="share-session-generate"
        >
          {isLoading ? t("share_generating") : t("share_button")}
        </button>
      ) : (
        <div className="flex items-center gap-2">
          <input
            type="text"
            readOnly
            value={joinUrl}
            className="bg-background border border-border rounded-md px-3 py-2 text-foreground text-xs font-mono w-[220px] truncate"
            aria-label={t("share_link_label")}
            data-testid="share-session-url"
          />
          <button
            type="button"
            onClick={handleCopy}
            className="px-3 py-2 text-sm font-medium rounded-md bg-white/[0.06] text-foreground hover:bg-white/[0.1] transition-all duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)] min-h-[44px]"
            aria-label={t("share_copy_aria")}
            data-testid="share-session-copy"
          >
            {copied ? tc("copied") : tc("copy")}
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
