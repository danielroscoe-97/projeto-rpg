import * as Sentry from "@sentry/nextjs";

// BUG-007/008: Guard duplicate init + safe PII scrubbing (server-side mirror)
if (!Sentry.getClient()) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    enabled: !!process.env.SENTRY_DSN,
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
    beforeSend(event) {
      try {
        if (event.exception?.values) {
          for (const ex of event.exception.values) {
            if (typeof ex.value === "string") {
              ex.value = ex.value.replace(/\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g, "[email]");
              ex.value = ex.value.replace(/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*/g, "[token]");
            }
          }
        }
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
