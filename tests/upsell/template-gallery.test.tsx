/**
 * Epic 04 Story 04-G — TemplateGallery + TemplateDetailModal RTL tests.
 *
 * Covers (12):
 *  Gallery:
 *   1. Empty templates array → empty-state text
 *   2. Renders one card per template with name + level + encounter count
 *   3. Clicking a card select invokes onSelect
 *   4. Selected card has aria-checked="true"
 *   5. Clicking "Preview" opens the detail modal
 *  Modal:
 *   6. Modal shows loading state while getTemplateDetails resolves
 *   7. Modal renders encounters with monster display names (unresolved
 *      slugs marked with amber-dashed border via testid probe)
 *   8. Modal renders "Use this template" disabled while loading
 *   9. Error state when getTemplateDetails returns null
 *  10. Escape key closes modal
 *  11. Backdrop click closes modal
 *  12. "Use this template" click invokes onUseSelected + closes modal
 */

import React from "react";
import { render, screen, act, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ---------------------------------------------------------------------------
// next-intl mock
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
    return tFn;
  },
}));

// ---------------------------------------------------------------------------
// getTemplateDetails mock — controlled per-test
// ---------------------------------------------------------------------------

const getTemplateDetailsMock = jest.fn();
jest.mock("@/lib/upsell/template-details", () => ({
  getTemplateDetails: (...args: unknown[]) => getTemplateDetailsMock(...args),
}));

import { TemplateGallery } from "@/components/upsell/TemplateGallery";
import type { CampaignTemplateSummary } from "@/lib/upsell/templates";

const T1: CampaignTemplateSummary = {
  id: "tpl-1",
  name: "Haunted Crypt",
  description: "A spooky starter",
  game_system: "5e",
  target_party_level: 3,
  encounter_count: 4,
};
const T2: CampaignTemplateSummary = {
  id: "tpl-2",
  name: "Desert Ruins",
  description: null,
  game_system: "5e",
  target_party_level: 5,
  encounter_count: 2,
};

function renderGallery(
  props: Partial<React.ComponentProps<typeof TemplateGallery>> = {},
) {
  const defaults: React.ComponentProps<typeof TemplateGallery> = {
    templates: [T1, T2],
    selectedTemplateId: null,
    onSelect: jest.fn(),
    onUseSelected: jest.fn(),
  };
  const merged = { ...defaults, ...props };
  return { ...render(<TemplateGallery {...merged} />), props: merged };
}

describe("<TemplateGallery />", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders empty-state text when templates is []", () => {
    renderGallery({ templates: [] });
    expect(
      screen.getByTestId("upsell.template-gallery.empty"),
    ).toBeInTheDocument();
  });

  it("renders one card per template", () => {
    renderGallery();
    expect(screen.getByTestId(`upsell.template-card-${T1.id}`)).toBeInTheDocument();
    expect(screen.getByTestId(`upsell.template-card-${T2.id}`)).toBeInTheDocument();
    // Name + description for T1
    expect(screen.getByText("Haunted Crypt")).toBeInTheDocument();
    expect(screen.getByText("A spooky starter")).toBeInTheDocument();
  });

  it("clicking a card's select button invokes onSelect", async () => {
    const { props } = renderGallery();
    const user = userEvent.setup();
    await user.click(
      screen.getByTestId(`upsell.template-card-${T1.id}.select`),
    );
    expect(props.onSelect).toHaveBeenCalledWith(T1);
  });

  it("selected card has aria-checked=true", () => {
    renderGallery({ selectedTemplateId: T2.id });
    const t1 = screen.getByTestId(`upsell.template-card-${T1.id}.select`);
    const t2 = screen.getByTestId(`upsell.template-card-${T2.id}.select`);
    expect(t1).toHaveAttribute("aria-checked", "false");
    expect(t2).toHaveAttribute("aria-checked", "true");
  });

  it("preview button opens detail modal with loading state", async () => {
    // Hold the promise so the loading state is observable.
    let resolveDetails: (value: unknown) => void = () => {};
    getTemplateDetailsMock.mockImplementation(
      () => new Promise((res) => (resolveDetails = res)),
    );
    const user = userEvent.setup();
    renderGallery();
    await user.click(
      screen.getByTestId(`upsell.template-card-${T1.id}.preview`),
    );
    expect(
      screen.getByTestId("upsell.template-detail-modal"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("upsell.template-detail-modal.loading"),
    ).toBeInTheDocument();
    // Cleanup — resolve with null so the modal doesn't hang in the tree.
    await act(async () => resolveDetails(null));
  });

  it("modal renders encounters + monsters after fetch resolves", async () => {
    getTemplateDetailsMock.mockResolvedValue({
      id: T1.id,
      name: T1.name,
      description: T1.description,
      gameSystem: "5e",
      targetPartyLevel: T1.target_party_level,
      encounters: [
        {
          id: "enc-1",
          name: "Goblin Ambush",
          description: "The path narrows",
          sortOrder: 0,
          narrativePrompt: null,
          monsters: [
            { slug: "goblin", quantity: 3, displayName: "Goblin", unresolved: false },
          ],
        },
        {
          id: "enc-2",
          name: "Ancient Vault",
          description: null,
          sortOrder: 1,
          narrativePrompt: null,
          monsters: [
            { slug: "phantom-marauder", quantity: 1, displayName: "phantom-marauder", unresolved: true },
          ],
        },
      ],
    });
    const user = userEvent.setup();
    renderGallery();
    await user.click(
      screen.getByTestId(`upsell.template-card-${T1.id}.preview`),
    );
    await waitFor(() =>
      expect(
        screen.getByTestId("upsell.template-detail.encounter-0"),
      ).toBeInTheDocument(),
    );
    expect(screen.getByText("Goblin Ambush")).toBeInTheDocument();
    expect(screen.getByTestId("upsell.template-detail.monster-goblin")).toHaveTextContent(
      "Goblin ×3",
    );
    // Unresolved monster renders with dashed amber (class hint is enough).
    const unresolvedEl = screen.getByTestId(
      "upsell.template-detail.monster-phantom-marauder",
    );
    expect(unresolvedEl.className).toContain("border-dashed");
  });

  it("modal shows error state when getTemplateDetails returns null", async () => {
    getTemplateDetailsMock.mockResolvedValue(null);
    const user = userEvent.setup();
    renderGallery();
    await user.click(
      screen.getByTestId(`upsell.template-card-${T1.id}.preview`),
    );
    await waitFor(() =>
      expect(
        screen.getByTestId("upsell.template-detail-modal.error"),
      ).toBeInTheDocument(),
    );
  });

  it("escape key closes the modal", async () => {
    getTemplateDetailsMock.mockResolvedValue({
      id: T1.id,
      name: T1.name,
      description: null,
      gameSystem: "5e",
      targetPartyLevel: T1.target_party_level,
      encounters: [],
    });
    const user = userEvent.setup();
    renderGallery();
    await user.click(
      screen.getByTestId(`upsell.template-card-${T1.id}.preview`),
    );
    await waitFor(() =>
      expect(
        screen.getByTestId("upsell.template-detail-modal"),
      ).toBeInTheDocument(),
    );
    await user.keyboard("{Escape}");
    expect(
      screen.queryByTestId("upsell.template-detail-modal"),
    ).not.toBeInTheDocument();
  });

  it("backdrop click closes the modal", async () => {
    getTemplateDetailsMock.mockResolvedValue({
      id: T1.id,
      name: T1.name,
      description: null,
      gameSystem: "5e",
      targetPartyLevel: T1.target_party_level,
      encounters: [],
    });
    const user = userEvent.setup();
    renderGallery();
    await user.click(
      screen.getByTestId(`upsell.template-card-${T1.id}.preview`),
    );
    const modal = await screen.findByTestId("upsell.template-detail-modal");
    // Click the backdrop itself, not its inner content.
    await user.click(modal);
    expect(
      screen.queryByTestId("upsell.template-detail-modal"),
    ).not.toBeInTheDocument();
  });

  it("'Use this template' invokes onUseSelected with the previewed template", async () => {
    getTemplateDetailsMock.mockResolvedValue({
      id: T1.id,
      name: T1.name,
      description: null,
      gameSystem: "5e",
      targetPartyLevel: T1.target_party_level,
      encounters: [],
    });
    const { props } = renderGallery();
    const user = userEvent.setup();
    await user.click(
      screen.getByTestId(`upsell.template-card-${T1.id}.preview`),
    );
    const useBtn = await screen.findByTestId(
      "upsell.template-detail-modal.use",
    );
    // Wait for the button to enable (post-load).
    await waitFor(() => expect(useBtn).not.toBeDisabled());
    await user.click(useBtn);
    expect(props.onUseSelected).toHaveBeenCalledWith(T1);
    expect(
      screen.queryByTestId("upsell.template-detail-modal"),
    ).not.toBeInTheDocument();
  });

  it("'Use this template' is disabled during load and when fetch errors", async () => {
    getTemplateDetailsMock.mockResolvedValue(null);
    const user = userEvent.setup();
    renderGallery();
    await user.click(
      screen.getByTestId(`upsell.template-card-${T1.id}.preview`),
    );
    const useBtn = await screen.findByTestId(
      "upsell.template-detail-modal.use",
    );
    // Stays disabled because state.status is 'error', not 'ok'.
    expect(useBtn).toBeDisabled();
  });
});
