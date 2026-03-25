---
story_key: 5-5-realtime-dual-write-and-channel-subscription
epic: 5
story_id: 5.5
status: done
created: 2026-03-24
updated: 2026-03-24
---

# Story 5.5: Realtime Dual-Write & Channel Subscription

- Dual-write: Zustand update -> broadcastEvent() -> persist*() (async DB)
- DM channel: singleton session:{id} via lib/realtime/broadcast.ts
- Player subscription: all event types on session:{id}
- Typed payloads: lib/types/realtime.ts discriminated union
