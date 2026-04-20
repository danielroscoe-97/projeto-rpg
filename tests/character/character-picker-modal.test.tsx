import React from "react";
import { render, screen, within, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  CharacterPickerModal,
  type CharacterPickerResult,
  type PickerExistingCharacter,
  type PickerUnlinkedCharacter,
} from "@/components/character/CharacterPickerModal";

// Mock radix dialog so DialogContent renders inline + we can assert on
// descendants without worrying about portal/focus-trap lifecycle issues in
// jsdom. Radix still owns focus-trapping in production; here we just assert
// the modal surface (testid) exists when open and disappears when closed.
jest.mock("@radix-ui/react-dialog", () => {
  const actual = jest.requireActual("@radix-ui/react-dialog");
  return {
    ...actual,
    Root: ({
      children,
      open,
      onOpenChange,
    }: {
      children: React.ReactNode;
      open: boolean;
      onOpenChange?: (open: boolean) => void;
    }) => {
      // Expose onOpenChange so tests can simulate Escape -> onOpenChange(false).
      (globalThis as unknown as Record<string, unknown>).__dialogOnOpenChange =
        onOpenChange;
      return open ? <div data-testid="mock-dialog-root">{children}</div> : null;
    },
    Portal: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    Overlay: () => null,
    Content: ({
      children,
      ...props
    }: {
      children: React.ReactNode;
      [key: string]: unknown;
    }) => (
      <div role="dialog" aria-modal="true" {...props}>
        {children}
      </div>
    ),
    Title: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
    Close: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});

const unlinked: PickerUnlinkedCharacter[] = [
  { id: "u1", name: "Grok the Barbarian", max_hp: 45, ac: 16 },
  { id: "u2", name: "Sylria the Mage", max_hp: 30, ac: 12 },
];

const existing: PickerExistingCharacter[] = [
  {
    id: "e1",
    name: "Aragorn",
    race: "Human",
    class: "Ranger",
    level: 10,
    max_hp: 85,
    ac: 18,
    token_url: null,
  },
];

const baseProps = {
  campaignId: "camp-1",
  playerIdentity: { userId: "user-1" },
  open: true,
  onOpenChange: jest.fn(),
  onSelect: jest.fn<Promise<void>, [CharacterPickerResult]>(),
  unlinkedCharacters: unlinked,
  existingCharacters: existing,
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("CharacterPickerModal", () => {
  describe("rendering", () => {
    it("renders nothing when open=false", () => {
      const { container } = render(
        <CharacterPickerModal {...baseProps} open={false} />,
      );
      expect(container).toBeEmptyDOMElement();
      expect(
        screen.queryByTestId("character-picker-modal"),
      ).not.toBeInTheDocument();
    });

    it("renders the modal with dialog role when open=true", () => {
      render(<CharacterPickerModal {...baseProps} />);
      expect(screen.getByTestId("character-picker-modal")).toBeInTheDocument();
      expect(screen.getByRole("dialog")).toHaveAttribute("aria-modal", "true");
    });

    it("renders all 3 tabs by default (claim + pick + create)", () => {
      render(<CharacterPickerModal {...baseProps} />);
      expect(screen.getByTestId("picker-tab-claim")).toBeInTheDocument();
      expect(screen.getByTestId("picker-tab-pick")).toBeInTheDocument();
      expect(screen.getByTestId("picker-tab-create")).toBeInTheDocument();
    });

    it("hides claim tab when allowModes excludes it", () => {
      render(
        <CharacterPickerModal
          {...baseProps}
          allowModes={["pick", "create"]}
        />,
      );
      expect(screen.queryByTestId("picker-tab-claim")).not.toBeInTheDocument();
      expect(screen.getByTestId("picker-tab-pick")).toBeInTheDocument();
      expect(screen.getByTestId("picker-tab-create")).toBeInTheDocument();
    });

    it("hides pick tab when allowModes excludes it", () => {
      render(
        <CharacterPickerModal
          {...baseProps}
          allowModes={["claim", "create"]}
        />,
      );
      expect(screen.queryByTestId("picker-tab-pick")).not.toBeInTheDocument();
      expect(screen.getByTestId("picker-tab-claim")).toBeInTheDocument();
    });

    it("hides claim tab when there are no unlinked characters", () => {
      render(
        <CharacterPickerModal {...baseProps} unlinkedCharacters={[]} />,
      );
      expect(screen.queryByTestId("picker-tab-claim")).not.toBeInTheDocument();
    });

    it("hides pick tab when there are no existing characters", () => {
      render(
        <CharacterPickerModal {...baseProps} existingCharacters={[]} />,
      );
      expect(screen.queryByTestId("picker-tab-pick")).not.toBeInTheDocument();
    });

    it("renders stats badges on unlinked character cards", () => {
      render(<CharacterPickerModal {...baseProps} />);
      const claimBtn = screen.getByTestId("picker-claim-u1");
      expect(within(claimBtn).getByText(/HP 45/)).toBeInTheDocument();
      expect(within(claimBtn).getByText(/AC 16/)).toBeInTheDocument();
    });
  });

  describe("initial mode", () => {
    it("defaults to claim when unlinked characters exist", () => {
      render(<CharacterPickerModal {...baseProps} />);
      expect(screen.getByTestId("picker-tab-claim")).toHaveAttribute(
        "aria-selected",
        "true",
      );
      expect(screen.getByTestId("picker-panel-claim")).toBeInTheDocument();
    });

    it("defaults to pick when no unlinked but existing", () => {
      render(
        <CharacterPickerModal {...baseProps} unlinkedCharacters={[]} />,
      );
      expect(screen.getByTestId("picker-tab-pick")).toHaveAttribute(
        "aria-selected",
        "true",
      );
    });

    it("defaults to create when no unlinked and no existing", () => {
      render(
        <CharacterPickerModal
          {...baseProps}
          unlinkedCharacters={[]}
          existingCharacters={[]}
        />,
      );
      expect(screen.getByTestId("picker-panel-create")).toBeInTheDocument();
    });
  });

  describe("onSelect callback", () => {
    it("calls onSelect with claimed + characterId", async () => {
      const user = userEvent.setup();
      render(<CharacterPickerModal {...baseProps} />);
      await user.click(screen.getByTestId("picker-claim-u2"));
      await user.click(screen.getByTestId("picker-submit"));
      expect(baseProps.onSelect).toHaveBeenCalledTimes(1);
      expect(baseProps.onSelect).toHaveBeenCalledWith({
        mode: "claimed",
        characterId: "u2",
      });
    });

    it("calls onSelect with picked + characterId after tab switch", async () => {
      const user = userEvent.setup();
      render(<CharacterPickerModal {...baseProps} />);
      await user.click(screen.getByTestId("picker-tab-pick"));
      await user.click(screen.getByTestId("picker-pick-e1"));
      await user.click(screen.getByTestId("picker-submit"));
      expect(baseProps.onSelect).toHaveBeenCalledWith({
        mode: "picked",
        characterId: "e1",
      });
    });

    it("calls onSelect with created + characterData on create mode", async () => {
      const user = userEvent.setup();
      render(<CharacterPickerModal {...baseProps} />);
      await user.click(screen.getByTestId("picker-tab-create"));
      await user.type(screen.getByTestId("invite-char-name"), "Legolas");
      await user.type(screen.getByLabelText("HP"), "55");
      await user.type(screen.getByLabelText("AC"), "15");
      await user.click(screen.getByTestId("picker-submit"));
      expect(baseProps.onSelect).toHaveBeenCalledWith({
        mode: "created",
        characterData: {
          name: "Legolas",
          maxHp: 55,
          currentHp: 55,
          ac: 15,
          spellSaveDc: null,
        },
      });
    });

    it("does not call onSelect when claim mode has no selection", async () => {
      const user = userEvent.setup();
      render(<CharacterPickerModal {...baseProps} />);
      const submit = screen.getByTestId("picker-submit");
      expect(submit).toBeDisabled();
      // Force click even though disabled — handler should short-circuit.
      await user.click(submit);
      expect(baseProps.onSelect).not.toHaveBeenCalled();
    });

    it("does not call onSelect when create mode has empty name", async () => {
      const user = userEvent.setup();
      render(
        <CharacterPickerModal
          {...baseProps}
          unlinkedCharacters={[]}
          existingCharacters={[]}
        />,
      );
      expect(screen.getByTestId("picker-submit")).toBeDisabled();
      await user.click(screen.getByTestId("picker-submit"));
      expect(baseProps.onSelect).not.toHaveBeenCalled();
    });
  });

  describe("open / close lifecycle", () => {
    it("invokes onOpenChange(false) when parent-controlled close is triggered", () => {
      render(<CharacterPickerModal {...baseProps} />);
      // In the mock above we expose the Root's onOpenChange on globalThis;
      // this is what Radix calls on Escape/overlay click in production.
      const onOpenChange = (
        globalThis as unknown as Record<
          string,
          (open: boolean) => void | undefined
        >
      ).__dialogOnOpenChange;
      expect(typeof onOpenChange).toBe("function");
      act(() => {
        onOpenChange?.(false);
      });
      expect(baseProps.onOpenChange).toHaveBeenCalledWith(false);
    });

    it("resets internal selection state on reopen", async () => {
      const user = userEvent.setup();
      const { rerender } = render(
        <CharacterPickerModal {...baseProps} open={true} />,
      );
      await user.click(screen.getByTestId("picker-claim-u1"));
      // Close and reopen
      rerender(<CharacterPickerModal {...baseProps} open={false} />);
      rerender(<CharacterPickerModal {...baseProps} open={true} />);
      // After reopen, selection is cleared — submit stays disabled.
      expect(screen.getByTestId("picker-submit")).toBeDisabled();
    });
  });

  describe("focus management", () => {
    // Radix handles the real focus trap; here we verify the modal surface is
    // rendered inside a [role=dialog][aria-modal=true] container, which is what
    // assistive tech relies on + what the e2e a11y suite will validate end-to-end.
    it("renders content inside an aria-modal dialog region", () => {
      render(<CharacterPickerModal {...baseProps} />);
      const dialog = screen.getByRole("dialog");
      expect(dialog).toHaveAttribute("aria-modal", "true");
      // Tabs and submit live inside it.
      expect(within(dialog).getByTestId("picker-tab-claim")).toBeInTheDocument();
      expect(within(dialog).getByTestId("picker-submit")).toBeInTheDocument();
    });

    it("all interactive controls live inside the dialog region (no stray trigger outside)", () => {
      render(<CharacterPickerModal {...baseProps} />);
      const dialog = screen.getByRole("dialog");
      const allButtons = screen.getAllByRole("button");
      // Every rendered button must be a descendant of the dialog — nothing
      // outside it should steal focus.
      for (const btn of allButtons) {
        expect(dialog).toContainElement(btn);
      }
    });
  });

  describe("axe-core accessibility", () => {
    // We load axe-core lazily so the suite still runs in environments where
    // it's not available (e.g. a fresh worktree with no deps yet). When
    // present, we assert zero violations on both the initial open state and
    // after a tab switch.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let axe: any;
    beforeAll(async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        axe = require("axe-core");
      } catch {
        axe = null;
      }
    });

    const runAxe = async (node: HTMLElement) => {
      if (!axe) return { violations: [] };
      const result = await axe.run(node, {
        // Color contrast requires computed styles which jsdom doesn't render;
        // we cover that in the e2e/a11y Playwright suite.
        rules: { "color-contrast": { enabled: false } },
      });
      return result;
    };

    it("has zero axe violations on initial open", async () => {
      const { container } = render(<CharacterPickerModal {...baseProps} />);
      const result = await runAxe(container);
      if (!axe) {
        // Soft-skip with a note so missing dep is visible but doesn't fail CI.
        console.warn(
          "[character-picker-modal.test] axe-core not installed — skipping axe assertions.",
        );
        return;
      }
      expect(result.violations).toEqual([]);
    });

    it("has zero axe violations after switching to create tab", async () => {
      const user = userEvent.setup();
      const { container } = render(<CharacterPickerModal {...baseProps} />);
      await user.click(screen.getByTestId("picker-tab-create"));
      const result = await runAxe(container);
      if (!axe) return;
      expect(result.violations).toEqual([]);
    });
  });
});
