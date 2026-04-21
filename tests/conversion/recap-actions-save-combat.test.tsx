/**
 * Epic 03, Story 03-D (F6) — regression unit tests for the
 * "Salvar Combate" render rule extracted in `RecapActions.shouldShowSaveCombat`.
 *
 * The rule went from a one-liner (`!onSaveAndSignup`) to a helper that
 * inspects the new `saveSignupContext` prop. These tests pin the truth
 * table documented in the epic (§D4, §Story 03-D AC) so accidental
 * regressions surface loudly — especially the first case, which covers
 * the existing auth-DM path that must keep seeing the button.
 *
 * Cluster α W#3 extends this with a render-level test verifying the legacy
 * "Salvar e criar conta" button is suppressed when the new guest conversion
 * flow is active (`saveSignupContext.mode === "guest"`), since
 * `RecapCtaCard` already renders the guest signup CTA above.
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import type { Combatant } from "@/lib/types/combat";
import type { CombatReport } from "@/lib/types/combat-report";
import type { SaveSignupContext } from "@/components/conversion/types";

// Module-level mocks needed to render RecapActions without blowing up.
jest.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));
jest.mock("framer-motion", () => ({
  motion: { div: (props: Record<string, unknown>) => <div {...props} /> },
}));
jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() },
}));
// Avoid pulling RecapCtaCard's own tree (AuthModal, GuestRecapFlow, supabase).
// We only need to verify the legacy "recap-save-signup-btn" button behavior.
jest.mock("@/components/conversion/RecapCtaCard", () => ({
  RecapCtaCard: () => <div data-testid="mock-recap-cta-card" />,
}));

import { shouldShowSaveCombat, RecapActions } from "@/components/combat/RecapActions";

const ANON_CTX: SaveSignupContext = {
  mode: "anon",
  sessionTokenId: "tok-abc",
  campaignId: "camp-1",
  characterId: "char-1",
  characterName: "Thorin",
};

const GUEST_NO_CAMP: SaveSignupContext = {
  mode: "guest",
  characterName: "Thorin",
  guestCombatants: [{ id: "c-1" } as unknown as Combatant],
};

const GUEST_WITH_CAMP: SaveSignupContext = {
  mode: "guest",
  characterName: "Thorin",
  guestCombatants: [{ id: "c-1" } as unknown as Combatant],
  campaignId: "camp-x",
};

const noop = () => {};

describe("shouldShowSaveCombat (Story 03-D, F6)", () => {
  it("returns true when neither saveSignupContext nor onSaveAndSignup are set (auth/DM legacy path — REGRESSION CRITICAL)", () => {
    expect(shouldShowSaveCombat(undefined, undefined)).toBe(true);
  });

  it("returns false when only onSaveAndSignup is set (guest legacy path — pre-03-E)", () => {
    expect(shouldShowSaveCombat(undefined, noop)).toBe(false);
  });

  it("returns true for anon context even without onSaveAndSignup", () => {
    expect(shouldShowSaveCombat(ANON_CTX, undefined)).toBe(true);
  });

  it("returns true for anon context with onSaveAndSignup set", () => {
    expect(shouldShowSaveCombat(ANON_CTX, noop)).toBe(true);
  });

  it("returns false for guest context without a campaignId (03-E baseline)", () => {
    expect(shouldShowSaveCombat(GUEST_NO_CAMP, undefined)).toBe(false);
    expect(shouldShowSaveCombat(GUEST_NO_CAMP, noop)).toBe(false);
  });

  it("returns true for guest context with a campaignId (edge case, full matrix completeness)", () => {
    expect(shouldShowSaveCombat(GUEST_WITH_CAMP, undefined)).toBe(true);
    expect(shouldShowSaveCombat(GUEST_WITH_CAMP, noop)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Cluster α W#3 — suppress the legacy "recap-save-signup-btn" when the new
// saveSignupContext.mode === "guest" branch is active. `RecapCtaCard` already
// renders the guest signup CTA; rendering both creates duplicate CTAs.
// ---------------------------------------------------------------------------

function makeReport(): CombatReport {
  return {
    sessionId: "sess-1",
    durationSeconds: 10,
    rounds: 1,
    combatants: [],
    mvp: null,
    outcome: "party_victory",
    xpTotal: 0,
    createdAt: new Date().toISOString(),
  } as unknown as CombatReport;
}

describe("RecapActions W#3 — duplicate CTA suppression (Cluster α)", () => {
  it("suppresses legacy recap-save-signup-btn when saveSignupContext.mode === 'guest' AND onSaveAndSignup is present", () => {
    render(
      <RecapActions
        report={makeReport()}
        onNewCombat={() => {}}
        onSaveAndSignup={() => {}}
        saveSignupContext={GUEST_NO_CAMP}
      />,
    );

    // RecapCtaCard renders the new guest conversion CTA above.
    expect(screen.getByTestId("mock-recap-cta-card")).toBeInTheDocument();
    // Legacy button must NOT render — duplicate CTAs otherwise.
    expect(
      screen.queryByTestId("recap-save-signup-btn"),
    ).not.toBeInTheDocument();
  });

  it("still renders legacy recap-save-signup-btn when onSaveAndSignup is set without saveSignupContext (guest legacy path)", () => {
    render(
      <RecapActions
        report={makeReport()}
        onNewCombat={() => {}}
        onSaveAndSignup={() => {}}
      />,
    );
    // Pre-03-E path — no card, legacy button visible.
    expect(
      screen.queryByTestId("mock-recap-cta-card"),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId("recap-save-signup-btn")).toBeInTheDocument();
  });

  it("does not render legacy recap-save-signup-btn when only saveSignupContext is set (no onSaveAndSignup)", () => {
    render(
      <RecapActions
        report={makeReport()}
        onNewCombat={() => {}}
        saveSignupContext={GUEST_NO_CAMP}
      />,
    );
    expect(screen.getByTestId("mock-recap-cta-card")).toBeInTheDocument();
    expect(
      screen.queryByTestId("recap-save-signup-btn"),
    ).not.toBeInTheDocument();
  });
});
