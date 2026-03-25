# Story 7.3: Load Testing & Scalability Validation

Status: done

## Summary

- k6 load test script simulating 1,000 concurrent sessions (ramp profile: 0→100→500→1000, hold 3min)
- Each VU: HTTP polling (/join, /api/session/[id]/state) + WebSocket Realtime connection
- k6 thresholds: WS latency p95 < 500ms (NFR3), HTTP p95 < 2s (NFR18), error rate < 1%
- Scalability validation report: architecture audit confirms no single-server state deps (NFR17)
- Supabase connection pool recommendations: Team plan for ≥1,000 Realtime connections
- Full load test execution deferred to staging deployment (requires live Supabase + Vercel)

## Files

- scripts/load-test/k6-session-load.js (new — k6 load test script)
- scripts/load-test/SCALABILITY-VALIDATION.md (new — validation report + runbook)
