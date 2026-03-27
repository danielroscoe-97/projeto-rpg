import * as Sentry from "@sentry/nextjs";

/**
 * Error categories for structured Sentry tracking.
 * Each error gets tagged with a category for filtering in the Sentry dashboard.
 */
export type ErrorCategory =
  | "validation"
  | "database"
  | "network"
  | "realtime"
  | "auth"
  | "payment"
  | "analytics"
  | "unknown";

interface CaptureContext {
  /** Which component/module originated the error */
  component: string;
  /** What action was being performed */
  action: string;
  /** Error category for Sentry filtering */
  category?: ErrorCategory;
  /** Authenticated user ID (never send email/PII) */
  userId?: string;
  /** Combat/game session ID */
  sessionId?: string;
  /** Additional structured metadata */
  extra?: Record<string, unknown>;
}

/**
 * Capture an exception to Sentry with structured context.
 * In development, also logs to console for DX.
 */
export function captureError(error: unknown, ctx: CaptureContext): void {
  const category = ctx.category ?? "unknown";

  if (process.env.NODE_ENV === "development") {
    console.error(`[${ctx.component}:${ctx.action}]`, error);
  }

  Sentry.captureException(error, {
    tags: {
      component: ctx.component,
      action: ctx.action,
      category,
    },
    contexts: {
      app: {
        component: ctx.component,
        action: ctx.action,
        ...(ctx.sessionId ? { sessionId: ctx.sessionId } : {}),
      },
    },
    ...(ctx.userId ? { user: { id: ctx.userId } } : {}),
    extra: ctx.extra,
  });
}

/**
 * Capture a warning-level message to Sentry as a breadcrumb.
 * Use for non-critical issues that should be tracked but don't need alerting.
 */
export function captureWarning(message: string, ctx: Omit<CaptureContext, "action"> & { action?: string }): void {
  if (process.env.NODE_ENV === "development") {
    console.warn(`[${ctx.component}${ctx.action ? `:${ctx.action}` : ""}] ${message}`);
  }

  Sentry.addBreadcrumb({
    category: ctx.category ?? "unknown",
    message: `[${ctx.component}] ${message}`,
    level: "warning",
    data: {
      component: ctx.component,
      ...(ctx.action ? { action: ctx.action } : {}),
      ...(ctx.sessionId ? { sessionId: ctx.sessionId } : {}),
      ...ctx.extra,
    },
  });
}
