import * as Sentry from "@sentry/nextjs";

/**
 * Error categories for structured tracking.
 * Each error gets tagged with a category for filtering in Sentry + Supabase dashboards.
 */
export type ErrorCategory =
  | "validation"
  | "database"
  | "network"
  | "realtime"
  | "auth"
  | "payment"
  | "analytics"
  | "combat"
  | "unknown";

export type SessionMode = "guest" | "anon" | "auth";

export interface CaptureContext {
  /** Which component/module originated the error */
  component: string;
  /** What action was being performed */
  action: string;
  /** Error category for filtering */
  category?: ErrorCategory;
  /** Authenticated user ID (never send email/PII) */
  userId?: string;
  /** Combat/game session ID */
  sessionId?: string;
  /** Session mode for parity tracking */
  sessionMode?: SessionMode;
  /** Additional structured metadata */
  extra?: Record<string, unknown>;
  /** Skip Sentry reporting (use when Sentry's own GlobalHandlers already caught it) */
  skipSentry?: boolean;
}

/**
 * Client-side dedup: suppress identical errors within a 5-second window.
 * Keyed by message+component, stores the timestamp of the last send.
 */
const recentErrors = new Map<string, number>();
const DEDUP_WINDOW_MS = 5_000;

function isDuplicate(message: string, component: string): boolean {
  if (typeof window === "undefined") return false;
  const key = `${component}|${message}`;
  const now = Date.now();
  const last = recentErrors.get(key);
  if (last && now - last < DEDUP_WINDOW_MS) return true;
  recentErrors.set(key, now);
  // Prune old entries to prevent memory growth
  if (recentErrors.size > 100) {
    for (const [k, t] of recentErrors) {
      if (now - t > DEDUP_WINDOW_MS) recentErrors.delete(k);
    }
  }
  return false;
}

/**
 * Send error to Supabase via /api/error-log (fire-and-forget).
 * Uses fetch as primary, sendBeacon as fallback during page unload.
 */
function sendToSupabase(payload: Record<string, unknown>): void {
  // Server-side: skip client-side Supabase logging (Sentry handles server errors)
  if (typeof window === "undefined") return;

  const url = "/api/error-log";
  const body = JSON.stringify(payload);

  fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {
    // Fetch failed (offline?) — try sendBeacon as last resort
    try {
      if (navigator.sendBeacon) {
        navigator.sendBeacon(url, new Blob([body], { type: "application/json" }));
      }
    } catch {
      // Silently fail — error tracking should never break the app
    }
  });
}

function getAppVersion(): string {
  return process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA?.slice(0, 7)
    ?? process.env.NEXT_PUBLIC_APP_VERSION
    ?? "dev";
}

/**
 * Capture an exception to Sentry + Supabase with structured context.
 * In development, also logs to console for DX.
 */
export function captureError(error: unknown, ctx: CaptureContext): void {
  const category = ctx.category ?? "unknown";
  const message = error instanceof Error
    ? error.message
    : typeof error === "string" ? error : "Unknown error";
  const stack = error instanceof Error ? error.stack : undefined;

  // Client-side dedup: suppress rapid-fire identical errors
  if (isDuplicate(message, ctx.component)) return;

  if (process.env.NODE_ENV === "development") {
    console.error(`[${ctx.component}:${ctx.action}]`, error);
  }

  // 1. Sentry (primary triaging tool) — skip if caller says Sentry already caught it
  if (!ctx.skipSentry) {
    Sentry.captureException(error, {
      tags: {
        component: ctx.component,
        action: ctx.action,
        category,
        ...(ctx.sessionMode ? { session_mode: ctx.sessionMode } : {}),
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

  // 2. Supabase (owned data, dashboards)
  sendToSupabase({
    level: "error",
    message,
    stack,
    component: ctx.component,
    action: ctx.action,
    category,
    url: typeof window !== "undefined" ? window.location.href : undefined,
    user_id: ctx.userId,
    session_mode: ctx.sessionMode,
    metadata: {
      ...ctx.extra,
      sessionId: ctx.sessionId,
      app_version: getAppVersion(),
    },
  });
}

/**
 * Capture a warning-level message to Sentry as a breadcrumb + Supabase.
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

  // Also log warnings to Supabase for dashboard visibility
  sendToSupabase({
    level: "warning",
    message,
    component: ctx.component,
    action: ctx.action,
    category: ctx.category ?? "unknown",
    url: typeof window !== "undefined" ? window.location.href : undefined,
    user_id: ctx.userId,
    session_mode: ctx.sessionMode,
    metadata: {
      ...ctx.extra,
      app_version: getAppVersion(),
    },
  });
}
