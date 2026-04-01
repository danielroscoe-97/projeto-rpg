# Story: Player Combat Sounds & Audio Polish

Status: ready-for-dev

## Story

As a **player** in combat,
I want audio cues during critical combat moments (upcoming turn, death saves, soundboard improvements),
so that I have immersive feedback that enhances the tabletop experience.

## Context

The DM soundboard received a full treatment with categorized presets, volume controls, and "Now Playing" indicators. The player side has several audio gaps: no sound on "Você é o próximo!", no death save audio feedback, signed URLs that expire silently after 1 hour, and no loading state while audio URLs resolve. This story addresses all player-side audio gaps.

**Design note:** Player soundboard plays on the DM's PC (DM has the speaker connected). This is correct by design. The player broadcasts → DM plays. No local playback needed on player device for the soundboard.

## Acceptance Criteria

### S1: Sound on "Você é o próximo!" (TurnUpcomingBanner)
1. When `TurnUpcomingBanner` appears, a subtle notification sound plays on the player's device.
2. Sound file: `/sounds/turn-upcoming.mp3` (new asset, softer/shorter than turn-notification.mp3).
3. Volume: 0.3 (lower than "É sua vez!" at 0.5 to differentiate urgency).
4. Haptic feedback: `navigator.vibrate?.([100])` — single short pulse (vs [200,100,200] for full turn).
5. Respects the same localStorage notification toggle as TurnNotificationOverlay.
6. Plays only once per upcoming-turn event (no repeat if component re-renders).

### S2: Sound on Death Save (success/failure click)
7. When player clicks "Success" death save button, play `/sounds/death-save-success.mp3` locally on player device.
8. When player clicks "Failure" death save button, play `/sounds/death-save-failure.mp3` locally on player device.
9. Volume: 0.5. These sounds play locally (not broadcast to DM) — they are UI feedback.
10. Haptic feedback: Success = `vibrate?.([100])`, Failure = `vibrate?.([200, 50, 200])`.

### S3: Dramatic Death Save Resolution
11. When death saves reach 3 successes (stabilized): play `/sounds/death-save-stabilized.mp3` with volume 0.6.
12. When death saves reach 3 failures (death): play `/sounds/death-save-death.mp3` with volume 0.6.
13. Both play locally on player device only (not broadcast).
14. Haptic: Stabilized = `vibrate?.([100, 50, 100, 50, 100])`, Death = `vibrate?.([500])`.

### S4: Signed URL Auto-Refresh (1h expiry fix)
15. Custom audio signed URLs must auto-refresh before expiration.
16. Store the generation timestamp when URLs are created.
17. Set a refresh timer at 50 minutes (10 min before 1h expiry).
18. On refresh: regenerate all signed URLs silently in background, update `playerAudioUrls` state and `preloadedAudio` in audio-store.
19. If refresh fails (network error): retry after 60 seconds, max 3 retries.
20. Deduplicate signed URL generation — remove the dual-path (PlayerJoinClient useEffect + audio-store preloadPlayerAudio). Use only ONE path: PlayerJoinClient generates URLs → passes to audio-store.

### S5: Loading Indicator for Audio URLs
21. While signed URLs are being generated, show a subtle loading state on the PlayerSoundboard FAB button.
22. FAB icon changes from 🔊 to a spinner while `playerAudioUrls` is empty but `playerAudioFiles` has items.
23. Custom sound buttons show skeleton/shimmer instead of disabled state while URL is loading.
24. Once all URLs resolve, FAB returns to 🔊 and buttons become interactive.

## Tasks / Subtasks

- [ ] Task 1: TurnUpcomingBanner sound + haptic (AC: #1-6)
  - [ ] Add audio ref and playback logic to `components/player/TurnUpcomingBanner.tsx`
  - [ ] Use same pattern as TurnNotificationOverlay: `new Audio("/sounds/turn-upcoming.mp3")`
  - [ ] Read notification toggle from localStorage before playing
  - [ ] Add `useRef` guard to prevent double-play on re-render
  - [ ] Add haptic `navigator.vibrate?.([100])`
  - [ ] Create/source audio asset `/sounds/turn-upcoming.mp3`

- [ ] Task 2: Death save click sounds + haptic (AC: #7-10)
  - [ ] Modify `DeathSaveTracker.tsx` or the `onDeathSave` handler in `PlayerInitiativeBoard.tsx`
  - [ ] Play local sound on button click (before broadcast)
  - [ ] Add haptic patterns per result type
  - [ ] Sounds are LOCAL only — do NOT broadcast these

- [ ] Task 3: Death save resolution drama (AC: #11-14)
  - [ ] In `PlayerJoinClient.tsx` `combat:hp_update` handler (line ~370), detect when `death_saves.successes === 3` or `death_saves.failures === 3`
  - [ ] Compare prev vs new death_saves to detect transition moment
  - [ ] Play appropriate resolution sound with haptic
  - [ ] Consider showing a brief visual overlay (optional, coordinate with UX story)

- [ ] Task 4: Signed URL auto-refresh (AC: #15-20)
  - [ ] In `PlayerJoinClient.tsx`, store `urlGeneratedAt` timestamp in ref
  - [ ] Set `setTimeout` at 50 minutes to regenerate URLs
  - [ ] On regeneration: call Supabase `createSignedUrl` for all files
  - [ ] Update both `playerAudioUrls` state and call `useAudioStore.getState().updatePlayerAudioUrls(newUrls)` (new store method)
  - [ ] Remove the `preloadPlayerAudio` call from PlayerJoinClient — consolidate to single URL generation path
  - [ ] Add retry logic: on failure, retry after 60s, max 3 attempts
  - [ ] Cleanup timer on unmount

- [ ] Task 5: Audio loading indicator (AC: #21-24)
  - [ ] In `PlayerSoundboard.tsx`, accept `isLoadingAudio` prop
  - [ ] Show spinner on FAB when loading
  - [ ] Show skeleton on custom sound buttons while their URL is not yet available
  - [ ] Derive loading state: `playerAudioFiles.length > 0 && Object.keys(playerAudioUrls).length === 0`

## Dev Notes

### Files to Create/Modify
- Modify: `components/player/TurnUpcomingBanner.tsx` (add audio + haptic)
- Modify: `components/combat/DeathSaveTracker.tsx` (add sound on click)
- Modify: `components/player/PlayerJoinClient.tsx` (URL refresh timer, death save resolution detection, remove dual URL path)
- Modify: `lib/stores/audio-store.ts` (add `updatePlayerAudioUrls` method)
- Modify: `components/audio/PlayerSoundboard.tsx` (loading indicator)
- New assets: `/sounds/turn-upcoming.mp3`, `/sounds/death-save-success.mp3`, `/sounds/death-save-failure.mp3`, `/sounds/death-save-stabilized.mp3`, `/sounds/death-save-death.mp3`

### Audio Asset Guidelines
- All new sounds should be ≤100KB, ≤2 seconds duration
- Format: MP3, 128kbps
- turn-upcoming: soft chime or bell, subtle (not alarming)
- death-save-success: positive confirmation (short ding)
- death-save-failure: negative feedback (low thud or descending tone)
- death-save-stabilized: triumphant short fanfare
- death-save-death: somber tone, dramatic but brief

### Key References
- TurnNotificationOverlay pattern: `components/player/TurnNotificationOverlay.tsx:25-52`
- Current URL generation: `components/player/PlayerJoinClient.tsx:150-177`
- Duplicate URL path: `lib/stores/audio-store.ts:230-268` (preloadPlayerAudio)
- Death save broadcast: `components/player/PlayerJoinClient.tsx:1084-1113`
- HP update with death_saves: `components/player/PlayerJoinClient.tsx:370-387`

### Testing Notes
- Test with localStorage notification toggle ON and OFF
- Test URL refresh by setting shorter timeout (e.g., 10s) during dev
- Test death save sounds don't broadcast to DM channel
- Test haptic on mobile (Chrome Android) and verify silent fail on desktop/iOS
- Test audio autoplay unlock flow still works with new sounds
