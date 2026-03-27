"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { createSessionToken } from "@/lib/supabase/session-token";
import { Button } from "@/components/ui/button";
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
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
    };
  }, []);

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
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
      copiedTimerRef.current = setTimeout(() => {
        copiedTimerRef.current = null;
        setCopied(false);
      }, 3000);
    } catch (_err) {
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
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
      copiedTimerRef.current = setTimeout(() => {
        copiedTimerRef.current = null;
        setCopied(false);
      }, 3000);
    } catch {
      setError(t("share_copy_error"));
    }
  };

  return (
    <div className="relative" data-testid="share-session">
      {!joinUrl ? (
        <Button
          variant="gold"
          size="sm"
          onClick={handleGenerateLink}
          disabled={isLoading}
          className="min-h-[44px]"
          aria-label={t("share_button")}
          data-testid="share-session-generate"
        >
          {isLoading ? t("share_generating") : t("share_button")}
        </Button>
      ) : (
        <div className="flex items-center gap-2">
          <Button
            variant="gold"
            size="sm"
            onClick={() => setShowQr((v) => !v)}
            className="min-h-[44px]"
            aria-label={t("share_qr_toggle")}
            data-testid="share-session-qr-toggle"
          >
            {t("share_qr_label")}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="min-h-[44px] bg-white/[0.06] hover:bg-white/[0.1]"
            aria-label={t("share_copy_aria")}
            data-testid="share-session-copy"
          >
            {copied ? tc("copied") : tc("copy")}
          </Button>
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
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowQr(false)}
              className="text-muted-foreground hover:text-foreground h-8 w-8"
              aria-label={tc("close")}
            >
              ✕
            </Button>
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
