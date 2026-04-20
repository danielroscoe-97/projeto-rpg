import React from "react";
import { render, act, screen } from "@testing-library/react";
import { InviteAcceptClient } from "@/components/campaign/InviteAcceptClient";

// Mock the child modal so we can assert on the `open` + `onOpenChange`
// plumbing the wrapper passes down. We ALSO expose a ref to the last-seen
// `open` prop + a callback to simulate a Radix close event.
jest.mock("@/components/character/CharacterPickerModal", () => {
  const state: { open?: boolean; onOpenChange?: (open: boolean) => void } = {};
  (globalThis as unknown as Record<string, unknown>).__pickerModalState = state;
  return {
    CharacterPickerModal: (props: {
      open: boolean;
      onOpenChange: (open: boolean) => void;
    }) => {
      state.open = props.open;
      state.onOpenChange = props.onOpenChange;
      return (
        <div
          data-testid="mock-picker-modal"
          data-open={String(props.open)}
        />
      );
    },
  };
});

// next/navigation — router.push is a no-op here.
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

// Sonner toast — no-op.
jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

// Error capture — no-op.
jest.mock("@/lib/errors/capture", () => ({
  captureError: jest.fn(),
}));

// Server action — no-op.
jest.mock("@/app/invite/actions", () => ({
  acceptInviteAction: jest.fn(),
}));

const getState = () =>
  (globalThis as unknown as {
    __pickerModalState: {
      open?: boolean;
      onOpenChange?: (open: boolean) => void;
    };
  }).__pickerModalState;

const baseProps = {
  inviteId: "inv-1",
  campaignId: "camp-1",
  campaignName: "Campaign 1",
  dmName: "DM 1",
  userId: "user-1",
  token: "token-1",
  existingCharacters: [],
  unlinkedCharacters: [],
};

describe("InviteAcceptClient — dead-end prevention (C2)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("auto-opens the picker on mount", () => {
    render(<InviteAcceptClient {...baseProps} />);
    const modal = screen.getByTestId("mock-picker-modal");
    expect(modal).toHaveAttribute("data-open", "true");
  });

  it("ignores close attempts from the child modal (open stays true)", () => {
    const { rerender } = render(<InviteAcceptClient {...baseProps} />);
    expect(getState().open).toBe(true);

    // Simulate Radix invoking onOpenChange(false) — e.g. Escape, overlay
    // click, or the X button inside DialogContent.
    act(() => {
      getState().onOpenChange?.(false);
    });

    // The wrapper should ignore this: `open` stays `true` on the next render.
    rerender(<InviteAcceptClient {...baseProps} />);
    expect(getState().open).toBe(true);
  });

  it("honors explicit re-open (open=true) calls", () => {
    const { rerender } = render(<InviteAcceptClient {...baseProps} />);

    // Set open to true again (no-op but must not throw + must stay open).
    act(() => {
      getState().onOpenChange?.(true);
    });
    rerender(<InviteAcceptClient {...baseProps} />);
    expect(getState().open).toBe(true);
  });
});
