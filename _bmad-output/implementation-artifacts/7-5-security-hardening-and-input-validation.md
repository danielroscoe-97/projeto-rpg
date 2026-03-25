# Story 7.5: Security Hardening & Input Validation

Status: done

## Summary
- Security headers in next.config.ts: HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy
- lib/utils/sanitize.ts: sanitizeText strips HTML tags/entities, sanitizeRecord for object sanitization
- lib/validation/schemas.ts: Zod schemas for playerCharacter, campaign, combatantStats, hpAdjustment, sessionId, adminContentEdit
- Installed zod for runtime validation
- HTTPS enforced via HSTS header + Vercel default
- JWT token expiry configured via Supabase Auth (no code change needed)

## Files
- next.config.ts (modified — security headers)
- lib/utils/sanitize.ts (new)
- lib/utils/sanitize.test.ts (new)
- lib/validation/schemas.ts (new)
- lib/validation/schemas.test.ts (new)
- next.config.test.ts (modified)
- package.json (modified — added zod)
