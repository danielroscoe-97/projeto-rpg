import * as Sentry from "@sentry/nextjs";

const isProd = process.env.NODE_ENV === "production";

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
    // Scrub potential PII from error messages and extra data
    if (event.exception?.values) {
      for (const ex of event.exception.values) {
        if (ex.value) {
          // Remove email-like patterns
          ex.value = ex.value.replace(/[^\s@]+@[^\s@]+\.[^\s@]+/g, "[email]");
          // Remove JWT tokens
          ex.value = ex.value.replace(/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*/g, "[token]");
        }
      }
    }
    return event;
  },
});
