---
story_key: 5-6-connection-resilience-and-state-reconnect
epic: 5
story_id: 5.6
status: done
created: 2026-03-24
updated: 2026-03-24
---

# Story 5.6: Connection Resilience & State Reconnect

- SyncIndicator: green/amber/red connection status
- Polling fallback: DB poll every 2s if Realtime drops >3s (NFR9)
- Auto-recovery: polling stops when Realtime reconnects
- fetchSessionSnapshot() for DB state reconciliation
- DM browser close: state restored via SSR hydration (FR38)
