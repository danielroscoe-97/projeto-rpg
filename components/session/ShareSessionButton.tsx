"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { createSessionToken } from "@/lib/supabase/session-token";
import QRCode from "qrcode";

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
  const [showQr, setShowQr] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Render QR code to canvas when URL is ready and QR panel is open
  useEffect(() => {
    if (!joinUrl || !showQr || !canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, joinUrl, {
      width: 200,
      margin: 2,
      color: { dark: "#D4A853", light: "#13131E" },
    }).catch(() => {
      // silent — the URL text is still available as fallback
    });
  }, [joinUrl, showQr]);

  const handleGenerateLink = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { joinUrl: url } = await createSessionToken(sessionId);
      setJoinUrl(url);
      setShowQr(true);
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
    <div className="relative" data-testid="share-session">
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
          <button
            type="button"
            onClick={() => setShowQr((v) => !v)}
            className="px-3 py-2 text-sm font-medium rounded-md bg-gold text-foreground transition-all duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)] min-h-[44px]"
            aria-label={t("share_qr_toggle")}
            data-testid="share-session-qr-toggle"
          >
            {t("share_qr_label")}
          </button>
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

      {/* QR Code popover */}
      {showQr && joinUrl && (
        <div
          className="absolute top-full right-0 mt-2 z-50 bg-surface-secondary border border-border rounded-lg p-4 shadow-xl min-w-[260px] max-w-[calc(100vw-2rem)]"
          data-testid="share-session-qr"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-foreground text-sm font-medium">{t("share_qr_title")}</span>
            <button
              type="button"
              onClick={() => setShowQr(false)}
              className="text-muted-foreground hover:text-foreground text-sm min-h-[32px] min-w-[32px] flex items-center justify-center"
              aria-label={tc("close")}
            >
              ✕
            </button>
          </div>
          <div className="flex justify-center mb-3">
            <canvas ref={canvasRef} className="rounded-md" data-testid="qr-canvas" />
          </div>
          <p className="text-muted-foreground text-xs text-center mb-2">
            {t("share_qr_hint")}
          </p>
          <input
            type="text"
            readOnly
            value={joinUrl}
            className="bg-background border border-border rounded-md px-3 py-2 text-foreground text-xs font-mono w-full truncate"
            aria-label={t("share_link_label")}
            data-testid="share-session-url"
          />
        </div>
      )}

      {error && (
        <span className="text-red-400 text-xs mt-1 block" data-testid="share-session-error">
          {error}
        </span>
      )}
    </div>
  );
}
