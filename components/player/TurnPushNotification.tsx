"use client";

/**
 * TurnPushNotification
 *
 * Button that lets the player opt in/out of native push notifications
 * for turn advances. Requests permission, subscribes via PushManager,
 * and saves the subscription to /api/push/subscribe.
 *
 * Renders null when:
 * - Push/ServiceWorker is not supported (desktop without HTTPS, some browsers)
 * - VAPID public key env var is not set
 */
import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";

interface TurnPushNotificationProps {
  sessionId: string;
  playerName: string;
}

type PushState = "idle" | "requesting" | "subscribed" | "denied" | "unsupported" | "error";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

/** Convert VAPID public key from base64url to ArrayBuffer for PushManager. */
function urlBase64ToArrayBuffer(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const buf = new ArrayBuffer(rawData.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < rawData.length; i++) {
    view[i] = rawData.charCodeAt(i);
  }
  return buf;
}

export function TurnPushNotification({ sessionId, playerName }: TurnPushNotificationProps) {
  const t = useTranslations("player");
  const [pushState, setPushState] = useState<PushState>("idle");
  const [currentEndpoint, setCurrentEndpoint] = useState<string | null>(null);

  // Check initial push state on mount
  useEffect(() => {
    if (!VAPID_PUBLIC_KEY) {
      setPushState("unsupported");
      return;
    }
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setPushState("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setPushState("denied");
      return;
    }

    // Check if already subscribed for this session
    navigator.serviceWorker.ready.then((reg) => {
      reg.pushManager.getSubscription().then((sub) => {
        if (sub) {
          const savedSession = localStorage.getItem("push_session_id");
          const savedPlayer = localStorage.getItem("push_player_name");
          if (savedSession === sessionId && savedPlayer === playerName) {
            setPushState("subscribed");
            setCurrentEndpoint(sub.endpoint);
          }
        }
      });
    });
  }, [sessionId, playerName]);

  const handleSubscribe = useCallback(async () => {
    if (!VAPID_PUBLIC_KEY) return;
    setPushState("requesting");

    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setPushState("denied");
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToArrayBuffer(VAPID_PUBLIC_KEY),
      });

      const subJson = subscription.toJSON();
      const keys = subJson.keys as { p256dh: string; auth: string } | undefined;

      if (!keys?.p256dh || !keys?.auth) {
        throw new Error("Push subscription missing keys");
      }

      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          playerName,
          subscription: {
            endpoint: subscription.endpoint,
            keys,
          },
        }),
      });

      if (!res.ok) throw new Error("Failed to save subscription");

      localStorage.setItem("push_session_id", sessionId);
      localStorage.setItem("push_player_name", playerName);
      setPushState("subscribed");
      setCurrentEndpoint(subscription.endpoint);
    } catch (err) {
      console.error("[TurnPushNotification] subscribe error:", err);
      setPushState("error");
    }
  }, [sessionId, playerName]);

  const handleUnsubscribe = useCallback(async () => {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await sub.unsubscribe();
        if (currentEndpoint) {
          await fetch("/api/push/subscribe", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionId, endpoint: currentEndpoint }),
          });
        }
      }
      localStorage.removeItem("push_session_id");
      localStorage.removeItem("push_player_name");
      setPushState("idle");
      setCurrentEndpoint(null);
    } catch (err) {
      console.error("[TurnPushNotification] unsubscribe error:", err);
    }
  }, [sessionId, currentEndpoint]);

  // Don't render if push is not supported or VAPID key not configured
  if (pushState === "unsupported") return null;
  if (!VAPID_PUBLIC_KEY) return null;

  if (pushState === "denied") {
    return (
      <div className="flex justify-center py-2">
        <span className="text-xs text-muted-foreground/60">
          {t("push_notifications_denied")}
        </span>
      </div>
    );
  }

  if (pushState === "subscribed") {
    return (
      <div className="flex justify-center py-2">
        <button
          type="button"
          onClick={handleUnsubscribe}
          className="text-xs text-green-400/80 hover:text-muted-foreground transition-colors"
          data-testid="push-notification-toggle"
          aria-label={t("push_notifications_disable_aria")}
        >
          {t("push_notifications_on")}
        </button>
      </div>
    );
  }

  if (pushState === "requesting") {
    return (
      <div className="flex justify-center py-2">
        <span className="text-xs text-muted-foreground/60 animate-pulse">
          {t("push_notifications_requesting")}
        </span>
      </div>
    );
  }

  return (
    <div className="flex justify-center py-2">
      <button
        type="button"
        onClick={handleSubscribe}
        className="text-xs text-gold/70 hover:text-gold transition-colors"
        data-testid="push-notification-toggle"
        aria-label={t("push_notifications_enable_aria")}
      >
        {pushState === "error" ? t("push_notifications_retry") : t("push_notifications_enable")}
      </button>
    </div>
  );
}
