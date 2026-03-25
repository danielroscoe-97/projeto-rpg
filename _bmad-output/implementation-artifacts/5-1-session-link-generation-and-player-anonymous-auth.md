---
story_key: 5-1-session-link-generation-and-player-anonymous-auth
epic: 5
story_id: 5.1
status: done
created: 2026-03-24
updated: 2026-03-24
---

# Story 5.1: Session Link Generation & Player Anonymous Auth

- ShareSessionButton generates /join/{token} link and copies to clipboard
- createSessionToken() creates cryptographic token in session_tokens table
- /join/[token] SSR page validates token + session activity
- PlayerJoinClient performs anonymous auth via signInAnonymously() and links UID to token
- expireSessionTokens() deactivates tokens when DM ends session
