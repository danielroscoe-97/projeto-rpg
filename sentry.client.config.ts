import * as Sentry from "@sentry/nextjs";

const isProd = process.env.NODE_ENV === "production";

// BUG-007: Guard against duplicate Sentry init (e.g. HMR in dev, double-load in prod).
// Replay integration added only once to prevent "Session Replay is already active" warning.
if (!Sentry.getClient()) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
    // 100% in dev for debugging, 10% in prod to avoid quota exhaustion
    tracesSampleRate: isProd ? 0.1 : 1.0,
    // Session replay: minimal in prod to limit PII exposure
    replaysSessionSampleRate: isProd ? 0.01 : 0.1,
    replaysOnErrorSampleRate: isProd ? 0.1 : 1.0,
    integrations: [
      Sentry.replayIntegration({
        // Mask all text and block all media to prevent PII capture
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    beforeSend(event) {
      // Drop noisy errors that are expected during normal multi-tab / reconnect operation
      try {
        const msg = event.exception?.values?.[0]?.value ?? "";
        const type = event.exception?.values?.[0]?.type ?? "";
        if (
          /lock.*stolen|lock.*released|Lock broken/i.test(msg) ||
          /AbortError/i.test(type) ||
          /CHANNEL_ERROR/i.test(msg)
        ) {
          return null; // Drop event entirely
        }
        // Google Translate / browser extensions mutate the DOM under React,
        // causing NotFoundError on insertBefore/removeChild. Not a real bug.
        if (
          type === "NotFoundError" &&
          /insertBefore|removeChild|appendChild/i.test(msg) &&
          /not a child of this node|to be (?:inserted|removed)/i.test(msg)
        ) {
          return null;
        }
      } catch { /* never let filtering crash the pipeline */ }

      // BUG-008: Scrub PII with safe regex — guard against null/non-string values
      try {
        if (event.exception?.values) {
          for (const ex of event.exception.values) {
            if (typeof ex.value === "string") {
              // Remove email-like patterns
              ex.value = ex.value.replace(/\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g, "[email]");
              // Remove JWT tokens
              ex.value = ex.value.replace(/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*/g, "[token]");
            }
          }
        }
        // Also scrub breadcrumb messages
        if (event.breadcrumbs) {
          for (const bc of event.breadcrumbs) {
            if (typeof bc.message === "string") {
              bc.message = bc.message.replace(/\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g, "[email]");
            }
          }
        }
      } catch {
        // Never let scrubbing crash the event pipeline
      }
      return event;
    },
  });
}
