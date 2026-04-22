/**
 * Epic 04 Story 04-F — BecomeDmWizard RTL tests.
 *
 * Covers (11):
 *   1. Renders step 1 on mount with step_indicator "1 of 5"
 *   2. `dm_upsell:wizard_started` fires exactly once on mount
 *   3. Step 1 "Maybe later" navigates back to dashboard
 *   4. Step 1 "Let's go" advances to step 2
 *   5. Template path: pick template → advances to step 4 (step 3 skipped)
 *   6. Blank path: pick blank → advances to step 3 → fill form → step 4
 *   7. Step 3 "next" disabled when name empty or level out of range
 *   8. Step 4 submit ok → server action called with shape → step 5 renders
 *   9. Step 4 submit fail (missing_monsters) → error box shown, stays on 4
 *  10. Step 5 "Show me around" → router.push('/app/dashboard')
 *  11. Step 5 "Skip tour" → router.push('/app/campaigns/{id}')
 *
 * D9 broadcast assertion: after a successful submit, we assert
 * `broadcastRoleUpdated` was invoked with {userId, {from, to}} — the
 * full round-trip (listener → other tab's role update) is covered in
 * tests/upsell/user-role-listener.test.tsx.
 */

import React from "react";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ---------------------------------------------------------------------------
// Mocks — next-intl
// ---------------------------------------------------------------------------

jest.mock("next-intl", () => ({
  useTranslations: (namespace?: string) => {
    const tFn = (key: string, params?: Record<string, unknown>) => {
      const fullKey = namespace ? `${namespace}.${key}` : key;
      if (!params) return fullKey;
      return Object.entries(params).reduce(
        (str, [k, v]) => str.replace(`{${k}}`, String(v)),
        fullKey,
      );
    };
    (tFn as unknown as { rich: (...a: unknown[]) => React.ReactNode }).rich = (
      key: string,
      params: Record<string, unknown>,
    ) => {
      const fullKey = namespace ? `${namespace}.${key}` : key;
      const strong = params?.strong as
        | ((chunks: React.ReactNode) => React.ReactNode)
        | undefined;
      const campaignName = params?.campaignName as string | undefined;
      return (
        <>
          <span data-testid="rich-key">{fullKey}</span>
          {campaignName && strong ? strong(campaignName) : null}
        </>
      );
    };
    return tFn;
  },
}));

// ---------------------------------------------------------------------------
// Mocks — navigation
// ---------------------------------------------------------------------------

const pushMock = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

// ---------------------------------------------------------------------------
// Mocks — analytics
// ---------------------------------------------------------------------------

const trackMock = jest.fn();
jest.mock("@/lib/analytics/track", () => ({
  trackEvent: (...args: unknown[]) => trackMock(...args),
}));

// ---------------------------------------------------------------------------
// Mocks — server action + broadcast
// ---------------------------------------------------------------------------

const roleFlipMock = jest.fn();
jest.mock("@/lib/upsell/role-flip-and-create", () => ({
  roleFlipAndCreateCampaign: (...args: unknown[]) => roleFlipMock(...args),
}));

const broadcastMock = jest.fn();
jest.mock("@/lib/realtime/user-broadcast", () => ({
  broadcastRoleUpdated: (...args: unknown[]) => broadcastMock(...args),
}));

// ---------------------------------------------------------------------------
// Mocks — role store (optimistic local update)
// ---------------------------------------------------------------------------

const roleStoreSetState = jest.fn();
jest.mock("@/lib/stores/role-store", () => ({
  useRoleStore: { setState: (...args: unknown[]) => roleStoreSetState(...args) },
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { BecomeDmWizard } from "@/components/upsell/BecomeDmWizard";

const USER_ID = "user-abc";
const TEMPLATE = {
  id: "tpl-1",
  name: "Haunted Crypt",
  description: "A spooky starter",
  game_system: "5e",
  target_party_level: 3,
  encounter_count: 4,
};

function renderWizard(
  props: Partial<React.ComponentProps<typeof BecomeDmWizard>> = {},
) {
  return render(
    <BecomeDmWizard userId={USER_ID} templates={[TEMPLATE]} {...props} />,
  );
}

describe("<BecomeDmWizard />", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders step 1 on mount — wizard-step1-primary present", () => {
    renderWizard();
    expect(screen.getByTestId("upsell.become-dm-wizard")).toBeInTheDocument();
    expect(screen.getByTestId("wizard-step-indicator")).toBeInTheDocument();
    expect(screen.getByTestId("wizard-step1-primary")).toBeInTheDocument();
    expect(screen.getByTestId("wizard-maybe-later")).toBeInTheDocument();
  });

  it("fires dm_upsell:wizard_started exactly once on mount", () => {
    renderWizard();
    const startedCalls = trackMock.mock.calls.filter(
      ([name]) => name === "dm_upsell:wizard_started",
    );
    expect(startedCalls).toHaveLength(1);
  });

  it("Step 1 'maybe later' navigates to dashboard without flipping role", async () => {
    const user = userEvent.setup();
    renderWizard();
    await user.click(screen.getByTestId("wizard-maybe-later"));
    expect(pushMock).toHaveBeenCalledWith("/app/dashboard");
    expect(roleFlipMock).not.toHaveBeenCalled();
  });

  it("Step 1 primary advances to step 2 (template picker visible)", async () => {
    const user = userEvent.setup();
    renderWizard();
    await user.click(screen.getByTestId("wizard-step1-primary"));
    expect(screen.getByTestId("wizard-template-picker")).toBeInTheDocument();
    expect(screen.getByTestId(`wizard-template-${TEMPLATE.id}`)).toBeInTheDocument();
  });

  it("template path skips step 3 (advance 2 → 4)", async () => {
    const user = userEvent.setup();
    renderWizard();
    await user.click(screen.getByTestId("wizard-step1-primary")); // → 2
    await user.click(screen.getByTestId(`wizard-template-${TEMPLATE.id}`));
    await user.click(screen.getByTestId("wizard-step2-primary"));
    // Step 4 content present (privacy toggle + step4-primary); step 3 skipped
    // (step3-name input would be in the DOM otherwise).
    expect(screen.getByTestId("wizard-share-past-toggle")).toBeInTheDocument();
    expect(screen.getByTestId("wizard-step4-primary")).toBeInTheDocument();
    expect(screen.queryByTestId("wizard-step3-name")).not.toBeInTheDocument();
  });

  it("blank path walks through step 3 (name + level required)", async () => {
    const user = userEvent.setup();
    renderWizard();
    await user.click(screen.getByTestId("wizard-step1-primary"));
    await user.click(screen.getByTestId("wizard-blank-mode"));
    await user.click(screen.getByTestId("wizard-step2-primary"));
    // On step 3.
    expect(screen.getByTestId("wizard-step3-name")).toBeInTheDocument();
    // Advance button disabled when empty.
    expect(screen.getByTestId("wizard-step3-primary")).toBeDisabled();
    await user.type(
      screen.getByTestId("wizard-step3-name"),
      "My Blank Table",
    );
    expect(screen.getByTestId("wizard-step3-primary")).not.toBeDisabled();
    await user.click(screen.getByTestId("wizard-step3-primary"));
    expect(screen.getByTestId("wizard-share-past-toggle")).toBeInTheDocument();
  });

  it("Step 3 rejects out-of-range party level", async () => {
    const user = userEvent.setup();
    renderWizard();
    await user.click(screen.getByTestId("wizard-step1-primary"));
    await user.click(screen.getByTestId("wizard-blank-mode"));
    await user.click(screen.getByTestId("wizard-step2-primary"));
    await user.type(screen.getByTestId("wizard-step3-name"), "Test");
    const levelInput = screen.getByTestId(
      "wizard-step3-level",
    ) as HTMLInputElement;
    await user.clear(levelInput);
    await user.type(levelInput, "50");
    // HTML max=20 but JS value accepts 50; our `canAdvanceFromStep3` check
    // gates the primary button. Assert disabled.
    expect(screen.getByTestId("wizard-step3-primary")).toBeDisabled();
  });

  it("Step 4 submit ok: server action called, broadcast fired, step 5 renders", async () => {
    roleFlipMock.mockResolvedValue({
      ok: true,
      campaignId: "camp-1",
      joinCode: "JC",
      sessionId: "sess-1",
      prevRole: "player",
      newRole: "both",
    });
    const user = userEvent.setup();
    renderWizard();
    // Navigate template path.
    await user.click(screen.getByTestId("wizard-step1-primary"));
    await user.click(screen.getByTestId(`wizard-template-${TEMPLATE.id}`));
    await user.click(screen.getByTestId("wizard-step2-primary"));
    // Toggle privacy off for variety.
    await user.click(screen.getByTestId("wizard-share-past-toggle"));
    await user.click(screen.getByTestId("wizard-step4-primary"));

    expect(roleFlipMock).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: "template",
        templateId: TEMPLATE.id,
        sharePastCompanions: false,
      }),
    );
    expect(broadcastMock).toHaveBeenCalledWith(
      USER_ID,
      expect.objectContaining({ from: "player", to: "both" }),
    );
    expect(roleStoreSetState).toHaveBeenCalledWith(
      expect.objectContaining({ role: "both", activeView: "dm" }),
    );
    // Step 5 rendered.
    expect(screen.getByTestId("wizard-step5-primary")).toBeInTheDocument();
    expect(screen.getByTestId("wizard-step5-body")).toBeInTheDocument();
  });

  it("Step 4 submit fail with missing_monsters: error visible, stays on step 4", async () => {
    roleFlipMock.mockResolvedValue({
      ok: false,
      code: "missing_monsters",
      missingMonsters: [{ encounter_id: "e-1", missing_slugs: ["tiamat"] }],
    });
    const user = userEvent.setup();
    renderWizard();
    await user.click(screen.getByTestId("wizard-step1-primary"));
    await user.click(screen.getByTestId(`wizard-template-${TEMPLATE.id}`));
    await user.click(screen.getByTestId("wizard-step2-primary"));
    await user.click(screen.getByTestId("wizard-step4-primary"));
    expect(screen.getByTestId("wizard-error")).toBeInTheDocument();
    // Still on step 4 (no step 5 primary yet).
    expect(
      screen.queryByTestId("wizard-step5-primary"),
    ).not.toBeInTheDocument();
    // No broadcast or role store mutation on failure.
    expect(broadcastMock).not.toHaveBeenCalled();
    expect(roleStoreSetState).not.toHaveBeenCalled();
    const failedCalls = trackMock.mock.calls.filter(
      ([name]) => name === "dm_upsell:wizard_failed",
    );
    expect(failedCalls).toHaveLength(1);
  });

  it("Step 5 primary navigates to dashboard (tour auto-starts there)", async () => {
    roleFlipMock.mockResolvedValue({
      ok: true,
      campaignId: "camp-1",
      joinCode: "JC",
      sessionId: "sess-1",
      prevRole: "player",
      newRole: "both",
    });
    const user = userEvent.setup();
    renderWizard();
    await user.click(screen.getByTestId("wizard-step1-primary"));
    await user.click(screen.getByTestId(`wizard-template-${TEMPLATE.id}`));
    await user.click(screen.getByTestId("wizard-step2-primary"));
    await user.click(screen.getByTestId("wizard-step4-primary"));
    await user.click(screen.getByTestId("wizard-step5-primary"));
    expect(pushMock).toHaveBeenCalledWith("/app/dashboard");
  });

  it("Step 5 skip tour navigates to the created campaign page", async () => {
    roleFlipMock.mockResolvedValue({
      ok: true,
      campaignId: "camp-1",
      joinCode: "JC",
      sessionId: "sess-1",
      prevRole: "player",
      newRole: "both",
    });
    const user = userEvent.setup();
    renderWizard();
    await user.click(screen.getByTestId("wizard-step1-primary"));
    await user.click(screen.getByTestId(`wizard-template-${TEMPLATE.id}`));
    await user.click(screen.getByTestId("wizard-step2-primary"));
    await user.click(screen.getByTestId("wizard-step4-primary"));
    await user.click(screen.getByTestId("wizard-step5-skip-tour"));
    expect(pushMock).toHaveBeenCalledWith("/app/campaigns/camp-1");
  });
});
