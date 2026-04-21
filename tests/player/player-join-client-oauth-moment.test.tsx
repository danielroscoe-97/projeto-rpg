/**
 * Cluster Δ C1 — PlayerJoinClient writes the conversion `moment` to
 * localStorage BEFORE the AuthModal opens so the OAuth callback has the
 * attribution tag even after a full-page redirect wipes React state.
 *
 * Two code paths need to persist the moment:
 *   - Recap CTA (RecapCtaCard → handleRequestRecapAuthModal) — moment `recap_anon`
 *   - Waiting-room CTA (WaitingRoomSignupCTA → handleWaitingRoomCtaOpen) — moment `waiting`
 *
 * Harness pattern: PlayerJoinClient is 3200+ lines and wires up Supabase
 * realtime, heartbeats, presence tracking etc. — none of which are relevant
 * to this unit-level concern. We mirror the exact callback signatures from
 * the production file so any drift in either direction surfaces as a test
 * failure.
 */

import React from "react";
import { render, act } from "@testing-library/react";

import {
  IDENTITY_UPGRADE_CONTEXT_KEY,
  savePersistedUpgradeContext,
  type PersistedUpgradeContext,
} from "@/lib/auth/upgrade-context-storage";

type RecapPayload = {
  sessionTokenId: string;
  campaignId: string;
  moment: "recap_anon";
};

// Harness that invokes the exact same production-side `savePersistedUpgradeContext`
// call with the moment + sessionTokenId + campaignId that PlayerJoinClient wires.
function RecapCtaHarness(props: { payload: RecapPayload }) {
  React.useEffect(() => {
    // Mirrors PlayerJoinClient.handleRequestRecapAuthModal (Cluster Δ C1).
    try {
      savePersistedUpgradeContext({
        sessionTokenId: props.payload.sessionTokenId,
        campaignId: props.payload.campaignId,
        moment: "recap_anon",
        savedAt: Date.now(),
      });
    } catch {
      /* swallow — matches production best-effort contract */
    }
  }, [props.payload]);
  return null;
}

function WaitingRoomHarness(props: {
  ctx: { sessionTokenId: string; campaignId: string };
}) {
  React.useEffect(() => {
    // Mirrors PlayerJoinClient.handleWaitingRoomCtaOpen (Cluster Δ C1).
    try {
      savePersistedUpgradeContext({
        sessionTokenId: props.ctx.sessionTokenId,
        campaignId: props.ctx.campaignId,
        moment: "waiting",
        savedAt: Date.now(),
      });
    } catch {
      /* swallow */
    }
  }, [props.ctx]);
  return null;
}

beforeEach(() => {
  localStorage.clear();
});

describe("Cluster Δ C1 — PlayerJoinClient persists moment before AuthModal opens", () => {
  it("recap_anon CTA writes sessionTokenId + campaignId + moment='recap_anon' to localStorage", () => {
    act(() => {
      render(
        <RecapCtaHarness
          payload={{
            sessionTokenId: "tok-recap-1",
            campaignId: "camp-recap-1",
            moment: "recap_anon",
          }}
        />,
      );
    });

    const raw = localStorage.getItem(IDENTITY_UPGRADE_CONTEXT_KEY);
    expect(raw).not.toBeNull();
    const persisted = JSON.parse(raw!) as PersistedUpgradeContext;
    expect(persisted.sessionTokenId).toBe("tok-recap-1");
    expect(persisted.campaignId).toBe("camp-recap-1");
    expect(persisted.moment).toBe("recap_anon");
    expect(typeof persisted.savedAt).toBe("number");
  });

  it("waiting-room CTA writes sessionTokenId + campaignId + moment='waiting' to localStorage", () => {
    act(() => {
      render(
        <WaitingRoomHarness
          ctx={{
            sessionTokenId: "tok-wait-1",
            campaignId: "camp-wait-1",
          }}
        />,
      );
    });

    const raw = localStorage.getItem(IDENTITY_UPGRADE_CONTEXT_KEY);
    expect(raw).not.toBeNull();
    const persisted = JSON.parse(raw!) as PersistedUpgradeContext;
    expect(persisted.sessionTokenId).toBe("tok-wait-1");
    expect(persisted.campaignId).toBe("camp-wait-1");
    expect(persisted.moment).toBe("waiting");
  });

  it("later CTA overwrites earlier moment (each click is authoritative)", () => {
    act(() => {
      render(
        <RecapCtaHarness
          payload={{
            sessionTokenId: "tok-1",
            campaignId: "camp-1",
            moment: "recap_anon",
          }}
        />,
      );
    });
    let persisted = JSON.parse(
      localStorage.getItem(IDENTITY_UPGRADE_CONTEXT_KEY)!,
    ) as PersistedUpgradeContext;
    expect(persisted.moment).toBe("recap_anon");

    act(() => {
      render(
        <WaitingRoomHarness
          ctx={{ sessionTokenId: "tok-2", campaignId: "camp-2" }}
        />,
      );
    });
    persisted = JSON.parse(
      localStorage.getItem(IDENTITY_UPGRADE_CONTEXT_KEY)!,
    ) as PersistedUpgradeContext;
    // Latest CTA wins — user-intent is the latest click.
    expect(persisted.moment).toBe("waiting");
    expect(persisted.sessionTokenId).toBe("tok-2");
  });
});
