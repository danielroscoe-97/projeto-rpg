"use client";

import { useEffect } from "react";
import { captureError } from "@/lib/errors/capture";

/**
 * Global error tracking provider.
 * Captures unhandled errors and promise rejections and sends them to Supabase.
 * Sentry's own GlobalHandlers integration already captures these for Sentry,
 * so we pass skipSentry: true to avoid duplicate Sentry events.
 * Mount once in the root layout.
 */
export function ErrorTrackingProvider() {
  useEffect(() => {
    function handleError(event: ErrorEvent) {
      // Ignore errors from browser extensions or cross-origin scripts
      if (event.filename && !event.filename.includes(window.location.origin)) return;

      captureError(event.error ?? event.message, {
        component: "GlobalErrorHandler",
        action: "window.onerror",
        category: "unknown",
        skipSentry: true, // Sentry GlobalHandlers already captures window.onerror
        extra: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        },
      });
    }

    function handleUnhandledRejection(event: PromiseRejectionEvent) {
      const error = event.reason;
      captureError(error, {
        component: "GlobalErrorHandler",
        action: "unhandledrejection",
        category: "unknown",
        skipSentry: true, // Sentry GlobalHandlers already captures unhandledrejection
        extra: {
          type: typeof error,
          message: error?.message ?? String(error),
        },
      });
    }

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, []);

  return null;
}
