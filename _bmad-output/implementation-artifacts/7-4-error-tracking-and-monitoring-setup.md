# Story 7.4: Error Tracking & Monitoring Setup

Status: done

## Summary
- Installed @sentry/nextjs and @vercel/analytics
- sentry.client.config.ts: Sentry.init with replay integration, enabled via NEXT_PUBLIC_SENTRY_DSN env
- sentry.server.config.ts: Sentry.init with tracing, enabled via SENTRY_DSN env
- app/global-error.tsx: Global error boundary capturing errors to Sentry
- app/layout.tsx: Added Vercel Analytics component for Web Vitals tracking

## Files
- sentry.client.config.ts (modified)
- sentry.server.config.ts (modified)
- app/global-error.tsx (new)
- app/layout.tsx (modified)
- package.json (modified — added @sentry/nextjs, @vercel/analytics)
