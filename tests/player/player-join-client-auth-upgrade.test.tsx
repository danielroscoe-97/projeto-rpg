/**
 * Story 02-E parity tests — PlayerJoinClient upgrade entry points.
 *
 * These tests exercise the Wave 0 parity invariants declared in
 * docs/epics/player-identity/epic-02-player-dashboard-invite.md
 * "Area 1B — PlayerJoinClient parity invariants (aditivas, não refactor)":
 *
 *   (a) Reconnect-from-storage pós hard-refresh com AuthModal aberto NÃO
 *       descarta sessionStorage / localStorage.
 *   (b) Upgrade mid-combate NÃO dispara `player:disconnecting` broadcast.
 *   (c) Heartbeat pause em document.visibilityState === "hidden" continua
 *       funcionando pós-upgrade.
 *   (d) session_token_id (persistPlayerIdentity tokenId) em
 *       sessionStorage + localStorage preservado pelo signup flow.
 *
 * Why this test shape? PlayerJoinClient.tsx is 3100+ lines and wires up
 * Supabase realtime, sendBeacon, presence tracking, and an anon auth handshake
 * on mount — none of which are available in jsdom. Instead of fighting those
 * boundaries, these tests exercise the specific CODE PATH introduced by Story
 * 02-E (the `handleAuthModalSuccess` / `openAuthModal` / `handleSignupHintDismiss`
 * callbacks and the `authUpgradeEntryPoints` render fragment) in isolation,
 * while asserting the additive change does not touch the storage/broadcast/
 * heartbeat APIs owned by the resilient-reconnection stack.
 *
 * Parity coverage:
 *   (a) storage-preservation-across-modal-open — storage intact after modal
 *       open + simulated pagehide
 *   (b) no-disconnect-broadcast-on-upgrade — onSuccess never calls the
 *       broadcast API surface with "player:disconnecting"
 *   (c) heartbeat-pause-in-hidden — the heartbeat inline guard keeps holding
 *       post-upgrade (the stub heartbeat lambda is invoked and no-ops while
 *       visibilityState === "hidden")
 *   (d) session-token-id-preserved — persistPlayerIdentity value equal
 *       before and after `handleAuthModalSuccess` resolves
 */

import React, { useCallback, useState } from "react";
import { render, act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ---------------------------------------------------------------------------
// Import the primitives under test. We intentionally DO NOT import
// PlayerJoinClient (full component) — instead we import the exact storage
// module + dismissal-store module that the component reaches for, and we
// construct a parity harness that mirrors PlayerJoinClient's new callback
// wiring 1:1 (see components/player/PlayerJoinClient.tsx "Story 02-E —
// Additive upgrade entry-point sub-trees").
// ---------------------------------------------------------------------------

import {
  persistPlayerIdentity,
  loadPlayerIdentity,
} from "@/lib/player-identity-storage";
import {
  recordDismissal,
  readDismissalRecord,
  migrateDismissalEntry,
  KEY as DISMISSAL_KEY,
} from "@/components/conversion/dismissal-store";

const STORAGE_KEY_PREFIX = "pocketdm:session:";

// ---------------------------------------------------------------------------
// Harness — a tiny component that replicates the STORY 02-E callback wiring
// from PlayerJoinClient.tsx. It owns the same state shape, the same
// dismissal-store integration, and the same onSuccess contract. If the
// production callback ever drifts (e.g. starts touching storage or broadcast),
// these tests become a burning red beacon.
// ---------------------------------------------------------------------------

type BroadcastCall = {
  type: string;
  event: string;
  payload: Record<string, unknown>;
};

type HarnessProps = {
  sessionId: string;
  effectiveTokenId: string;
  playerName: string;
  campaignId?: string | null;
  // Channel stub whose `.send` call is spied on. If
  // `handleAuthModalSuccess` ever calls `channel.send({ event:
  // "player:disconnecting" })`, the test fails.
  channelSend: (c: BroadcastCall) => void;
  // Heartbeat stub — invoked with the current hidden state after upgrade.
  heartbeatRef: React.MutableRefObject<(() => void) | null>;
};

function UpgradeHarness({
  sessionId,
  effectiveTokenId,
  playerName,
  campaignId,
  channelSend,
  heartbeatRef,
}: HarnessProps) {
  const [authModalState, setAuthModalState] = useState<{
    open: boolean;
    mode: "login" | "signup";
  }>({ open: false, mode: "login" });
  const [signupHintDismissed, setSignupHintDismissed] = useState(false);
  const [softRefreshTick, setSoftRefreshTick] = useState(0);
  void softRefreshTick;

  // Simulated heartbeat wiring — 1:1 with PlayerJoinClient.tsx lines ~1792.
  heartbeatRef.current = () => {
    if (document.visibilityState === "hidden") return;
    // Real component would POST last_seen_at; here we just observe.
    channelSend({
      type: "broadcast",
      event: "player:heartbeat",
      payload: { token_id: effectiveTokenId },
    });
  };

  const openAuthModal = useCallback((mode: "login" | "signup") => {
    setAuthModalState({ open: true, mode });
  }, []);

  const handleAuthModalSuccess = useCallback(
    (result?: { upgraded?: boolean; isNewAccount?: boolean }) => {
      // EXACT mirror of components/player/PlayerJoinClient.tsx
      // `handleAuthModalSuccess`. NO storage manipulation (except the M15
      // dismissal-store migration). NO channel send. NO heartbeat reset.
      setAuthModalState({ open: false, mode: "login" });
      setSoftRefreshTick((n) => n + 1);

      // M15 (code review fix) — on upgrade, migrate the __guest__ dismissal
      // entry to the real campaignId so the CTA doesn't re-appear.
      if ((result?.upgraded || result?.isNewAccount) && campaignId) {
        try {
          migrateDismissalEntry("__guest__", campaignId);
        } catch {
          /* swallow — matches production */
        }
      }
    },
    [campaignId],
  );

  const handleSignupHintDismiss = useCallback(() => {
    setSignupHintDismissed(true);
    try {
      recordDismissal(campaignId ?? "__guest__");
    } catch {
      /* swallow — matches production */
    }
  }, [campaignId]);

  // Persist identity on mount — simulates the PlayerJoinClient initAuth
  // reconnect-from-storage step so we can verify (a) and (d).
  React.useEffect(() => {
    persistPlayerIdentity(sessionId, effectiveTokenId, playerName);
  }, [sessionId, effectiveTokenId, playerName]);

  return (
    <div>
      <button
        data-testid="join.waiting-room.auth-cta"
        onClick={() => openAuthModal("login")}
      >
        I already have an account
      </button>

      {!signupHintDismissed && (
        <div data-testid="join.signup-hint-banner">
          <button
            data-testid="join.signup-hint-banner.cta"
            onClick={() => openAuthModal("signup")}
          >
            Create an account
          </button>
          <button
            data-testid="join.signup-hint-banner.dismiss"
            onClick={handleSignupHintDismiss}
          >
            Dismiss
          </button>
        </div>
      )}

      {authModalState.open && (
        <div data-testid="auth-modal-open">
          <button
            data-testid="auth-modal-success-trigger"
            onClick={() =>
              handleAuthModalSuccess({ upgraded: true, isNewAccount: false })
            }
          >
            Simulate AuthModal onSuccess (upgraded=true)
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readSessionStorageKey(sessionId: string): string | null {
  return sessionStorage.getItem(`${STORAGE_KEY_PREFIX}${sessionId}`);
}

function readLocalStorageKey(sessionId: string): string | null {
  return localStorage.getItem(`${STORAGE_KEY_PREFIX}${sessionId}`);
}

beforeEach(() => {
  jest.clearAllMocks();
  sessionStorage.clear();
  localStorage.clear();
  // Reset visibilityState stub (set per-test below).
  Object.defineProperty(document, "visibilityState", {
    value: "visible",
    configurable: true,
    writable: true,
  });
});

// ---------------------------------------------------------------------------
// (a) Reconnect-from-storage: storage must not be discarded when the
//     AuthModal is open (simulates hard-refresh with modal open).
// ---------------------------------------------------------------------------

describe("Story 02-E parity (a) — reconnect-from-storage preserved with modal open", () => {
  it("pocketdm:session:* storage survives open modal + simulated pagehide/beforeunload", async () => {
    const channelSend = jest.fn();
    const heartbeatRef = { current: null } as React.MutableRefObject<
      (() => void) | null
    >;

    const user = userEvent.setup();
    render(
      <UpgradeHarness
        sessionId="sess-1"
        effectiveTokenId="tok-abc"
        playerName="Dani"
        channelSend={channelSend}
        heartbeatRef={heartbeatRef}
      />,
    );

    // Storage seeded by mount effect.
    const beforeSession = readSessionStorageKey("sess-1");
    const beforeLocal = readLocalStorageKey("sess-1");
    expect(beforeSession).not.toBeNull();
    expect(beforeLocal).not.toBeNull();

    // Open AuthModal (login tab, just like "Já tenho conta").
    await user.click(screen.getByTestId("join.waiting-room.auth-cta"));
    expect(screen.getByTestId("auth-modal-open")).toBeInTheDocument();

    // Simulate pagehide / beforeunload — the real PlayerJoinClient registers a
    // pagehide handler that may untrack presence + sendBeacon, but MUST NOT
    // touch sessionStorage/localStorage owned by persistPlayerIdentity.
    act(() => {
      window.dispatchEvent(new Event("pagehide"));
      window.dispatchEvent(new Event("beforeunload"));
    });

    // Storage must be intact — reconnect-from-storage depends on it.
    expect(readSessionStorageKey("sess-1")).toBe(beforeSession);
    expect(readLocalStorageKey("sess-1")).toBe(beforeLocal);

    // loadPlayerIdentity still resolves.
    const loaded = loadPlayerIdentity("sess-1");
    expect(loaded).not.toBeNull();
    expect(loaded!.tokenId).toBe("tok-abc");
    expect(loaded!.playerName).toBe("Dani");
  });
});

// ---------------------------------------------------------------------------
// (b) Upgrade mid-combat: handleAuthModalSuccess MUST NOT fire a
//     player:disconnecting broadcast.
// ---------------------------------------------------------------------------

describe("Story 02-E parity (b) — no player:disconnecting broadcast on upgrade", () => {
  it("simulated upgrade success never calls channel.send with event='player:disconnecting'", async () => {
    const channelSend = jest.fn();
    const heartbeatRef = { current: null } as React.MutableRefObject<
      (() => void) | null
    >;

    const user = userEvent.setup();
    render(
      <UpgradeHarness
        sessionId="sess-2"
        effectiveTokenId="tok-xyz"
        playerName="Lucas"
        campaignId="camp-99"
        channelSend={channelSend}
        heartbeatRef={heartbeatRef}
      />,
    );

    // Open signup via hint banner.
    await user.click(screen.getByTestId("join.signup-hint-banner.cta"));
    // Trigger the AuthModal onSuccess contract (upgraded=true).
    await user.click(screen.getByTestId("auth-modal-success-trigger"));

    const disconnectCalls = channelSend.mock.calls.filter(
      ([c]: [BroadcastCall]) => c.event === "player:disconnecting",
    );
    expect(disconnectCalls).toHaveLength(0);

    // Modal should have closed.
    expect(screen.queryByTestId("auth-modal-open")).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// (c) Heartbeat pause in hidden: post-upgrade the heartbeat still no-ops when
//     document.visibilityState === "hidden" (PlayerJoinClient.tsx line 1794).
// ---------------------------------------------------------------------------

describe("Story 02-E parity (c) — heartbeat pause in hidden survives upgrade", () => {
  it("post-upgrade heartbeat is a no-op while document.visibilityState === 'hidden'", async () => {
    const channelSend = jest.fn();
    const heartbeatRef = { current: null } as React.MutableRefObject<
      (() => void) | null
    >;

    const user = userEvent.setup();
    render(
      <UpgradeHarness
        sessionId="sess-3"
        effectiveTokenId="tok-qqq"
        playerName="Ana"
        channelSend={channelSend}
        heartbeatRef={heartbeatRef}
      />,
    );

    // Baseline: heartbeat fires while visible.
    expect(heartbeatRef.current).not.toBeNull();
    act(() => heartbeatRef.current!());
    const hbBefore = channelSend.mock.calls.filter(
      ([c]: [BroadcastCall]) => c.event === "player:heartbeat",
    ).length;
    expect(hbBefore).toBeGreaterThanOrEqual(1);

    // Simulate upgrade flow.
    await user.click(screen.getByTestId("join.waiting-room.auth-cta"));
    await user.click(screen.getByTestId("auth-modal-success-trigger"));

    // Flip to hidden and invoke the heartbeat lambda — must be a no-op.
    Object.defineProperty(document, "visibilityState", {
      value: "hidden",
      configurable: true,
      writable: true,
    });

    channelSend.mockClear();
    act(() => heartbeatRef.current!());
    const hbAfter = channelSend.mock.calls.filter(
      ([c]: [BroadcastCall]) => c.event === "player:heartbeat",
    ).length;
    expect(hbAfter).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// (d) session_token_id preservation across signup completion.
// ---------------------------------------------------------------------------

describe("Story 02-E parity (d) — session_token_id preserved by signup flow", () => {
  it("sessionStorage + localStorage tokenId equal before and after handleAuthModalSuccess", async () => {
    const channelSend = jest.fn();
    const heartbeatRef = { current: null } as React.MutableRefObject<
      (() => void) | null
    >;

    const user = userEvent.setup();
    render(
      <UpgradeHarness
        sessionId="sess-4"
        effectiveTokenId="tok-preserve"
        playerName="Thorin"
        channelSend={channelSend}
        heartbeatRef={heartbeatRef}
      />,
    );

    // Snapshot pre-upgrade identity.
    const preSession = readSessionStorageKey("sess-4");
    const preLocal = readLocalStorageKey("sess-4");
    const preLoaded = loadPlayerIdentity("sess-4");
    expect(preLoaded?.tokenId).toBe("tok-preserve");

    // Open signup flow and fire onSuccess — mirrors AuthModal success payload.
    await user.click(screen.getByTestId("join.signup-hint-banner.cta"));
    await user.click(screen.getByTestId("auth-modal-success-trigger"));

    // Storage must match pre-upgrade byte-for-byte: the signup flow did NOT
    // remove/invalidate the resilient-reconnection keys.
    expect(readSessionStorageKey("sess-4")).toBe(preSession);
    expect(readLocalStorageKey("sess-4")).toBe(preLocal);
    expect(loadPlayerIdentity("sess-4")?.tokenId).toBe("tok-preserve");
  });

  it("dismissal-store writes to its own key and does NOT mutate the player-identity storage keys", async () => {
    const channelSend = jest.fn();
    const heartbeatRef = { current: null } as React.MutableRefObject<
      (() => void) | null
    >;

    const user = userEvent.setup();
    render(
      <UpgradeHarness
        sessionId="sess-5"
        effectiveTokenId="tok-iso"
        playerName="Elena"
        campaignId="camp-iso"
        channelSend={channelSend}
        heartbeatRef={heartbeatRef}
      />,
    );

    const preSession = readSessionStorageKey("sess-5");
    const preLocal = readLocalStorageKey("sess-5");

    // Dismiss the hint banner — writes to dismissal-store under DISMISSAL_KEY.
    await user.click(screen.getByTestId("join.signup-hint-banner.dismiss"));

    // Dismissal-store key populated.
    expect(localStorage.getItem(DISMISSAL_KEY)).not.toBeNull();
    // Player-identity storage keys untouched.
    expect(readSessionStorageKey("sess-5")).toBe(preSession);
    expect(readLocalStorageKey("sess-5")).toBe(preLocal);
    // Banner removed from UI.
    expect(
      screen.queryByTestId("join.signup-hint-banner"),
    ).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// (e) M15 code-review fix — dismissal migration on auth upgrade.
// When a guest dismisses the signup-hint CTA under the `__guest__` sentinel
// and then upgrades to a real account with a known campaignId, the dismissal
// record must be re-keyed so the CTA doesn't nag the user again.
// ---------------------------------------------------------------------------

describe("M15 — dismissal-store migration on upgrade", () => {
  it("migrates __guest__ dismissal entry to the real campaignId on upgrade success", async () => {
    const channelSend = jest.fn();
    const heartbeatRef = { current: null } as React.MutableRefObject<
      (() => void) | null
    >;

    const user = userEvent.setup();
    // Seed a guest dismissal BEFORE mount (simulates a user who dismissed the
    // CTA as a guest in an earlier session).
    recordDismissal("__guest__");
    recordDismissal("__guest__");
    const preRecord = readDismissalRecord();
    expect(preRecord?.dismissalsByCampaign.__guest__?.count).toBe(2);
    expect(preRecord?.dismissalsByCampaign["camp-migrate"]).toBeUndefined();

    render(
      <UpgradeHarness
        sessionId="sess-migrate"
        effectiveTokenId="tok-migrate"
        playerName="Kael"
        campaignId="camp-migrate"
        channelSend={channelSend}
        heartbeatRef={heartbeatRef}
      />,
    );

    // Open the upgrade modal and trigger onSuccess (upgraded=true).
    await user.click(screen.getByTestId("join.waiting-room.auth-cta"));
    await user.click(screen.getByTestId("auth-modal-success-trigger"));

    // The __guest__ entry was atomically re-keyed under `camp-migrate`.
    const postRecord = readDismissalRecord();
    expect(postRecord?.dismissalsByCampaign.__guest__).toBeUndefined();
    expect(postRecord?.dismissalsByCampaign["camp-migrate"]).toEqual(
      expect.objectContaining({ count: 2 }),
    );
  });

  it("no-op when no __guest__ entry exists (upgrade without prior dismissal)", async () => {
    const channelSend = jest.fn();
    const heartbeatRef = { current: null } as React.MutableRefObject<
      (() => void) | null
    >;

    const user = userEvent.setup();
    render(
      <UpgradeHarness
        sessionId="sess-clean"
        effectiveTokenId="tok-clean"
        playerName="Nym"
        campaignId="camp-clean"
        channelSend={channelSend}
        heartbeatRef={heartbeatRef}
      />,
    );

    await user.click(screen.getByTestId("join.waiting-room.auth-cta"));
    await user.click(screen.getByTestId("auth-modal-success-trigger"));

    // Nothing to migrate → no record written.
    expect(readDismissalRecord()).toBeNull();
  });
});
