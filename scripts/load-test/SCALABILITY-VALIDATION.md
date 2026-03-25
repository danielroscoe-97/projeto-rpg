# Scalability Validation Report — Story 7.3

## NFR17: No Single-Server State Dependencies

### Architecture Audit

| Component | Stateless? | Evidence |
|-----------|-----------|---------|
| Next.js App Router | Yes | No in-process session state; all state in Supabase DB |
| Zustand stores | Yes | Client-side only; each browser tab has its own store instance |
| SRD search indices | Yes | Built from static JSON bundles per client; no shared server memory |
| IndexedDB cache | Yes | Per-browser; no server-side cache dependency |
| Realtime channels | Yes | Supabase Realtime manages connections; no app-server sticky sessions |
| Session tokens | Yes | Stored in Supabase DB (session_tokens table); validated via RLS |
| Auth (JWT) | Yes | Supabase Auth issues stateless JWTs; no server-side session store |

**Verdict: PASS** — No single-server state dependencies. The app can scale horizontally across multiple Vercel serverless instances without coordination.

### State Flow Diagram

```
Browser (Zustand) ──broadcast──→ Supabase Realtime ──→ Other Browsers
                  ──persist───→ Supabase PostgreSQL
```

All durable state lives in Supabase PostgreSQL. Realtime channels are managed by Supabase infrastructure, not the app server.

---

## NFR18: ≥1,000 Concurrent Active Sessions

### Load Test Configuration

- **Tool:** k6 (https://k6.io)
- **Script:** `scripts/load-test/k6-session-load.js`
- **Profile:** Ramp 0→100→500→1,000 VUs, hold 3 minutes, ramp down
- **Each VU simulates:** HTTP polling + WebSocket connection

### Thresholds

| Metric | Target | k6 Threshold |
|--------|--------|-------------|
| WS message latency | ≤500ms (NFR3) | p95 < 500ms |
| HTTP response time | Acceptable under load | p95 < 2s, p99 < 5s |
| Error rate | Minimal | < 1% |

### How to Run

```bash
# Install k6
# macOS: brew install k6
# Windows: choco install k6
# Linux: https://k6.io/docs/get-started/installation/

# Quick smoke test (10 concurrent users, 30 seconds)
k6 run --vus 10 --duration 30s scripts/load-test/k6-session-load.js

# Full load test (1,000 concurrent sessions)
K6_BASE_URL=https://projeto-rpg.vercel.app \
K6_SUPABASE_URL=https://your-project.supabase.co \
K6_SUPABASE_ANON_KEY=your-anon-key \
k6 run scripts/load-test/k6-session-load.js
```

---

## Supabase Connection Pool Configuration

### Realtime Connections

Supabase Realtime uses a separate connection pool from the REST API. Key limits:

| Plan | Max Realtime Connections | Max DB Connections |
|------|------------------------|--------------------|
| Free | 200 | 60 |
| Pro | 500 | 120 |
| Team | 1,000+ | 300+ |

### Recommendations for 1,000 Concurrent Sessions

1. **Supabase Plan:** Team plan required for ≥1,000 Realtime connections
2. **Connection Pooling:** Use Supabase's built-in PgBouncer (transaction mode) for REST API queries
3. **Realtime Channel Design:** One channel per session (`session:{id}`) — already implemented. No fan-out to global channels.
4. **Polling Fallback:** When Realtime drops, clients poll `/api/session/[id]/state` every 2s — this hits the REST API, not Realtime. Connection pool must handle burst polling.

### Vercel Serverless Scaling

- Vercel auto-scales serverless functions horizontally
- No cold-start concerns for Next.js App Router (Edge Runtime available if needed)
- Static assets (SRD bundles) served from Vercel CDN — zero server load

---

## Checklist

- [x] No single-server state dependencies (NFR17)
- [x] k6 load test script created for 1,000 concurrent sessions
- [x] Thresholds configured: WS latency p95 < 500ms, HTTP p95 < 2s
- [x] Supabase connection pool recommendations documented
- [x] Polling fallback validated under Realtime disconnection
- [ ] Full load test execution against staging environment (requires deployment)
- [ ] Supabase plan upgrade to Team for production (requires ops decision)
