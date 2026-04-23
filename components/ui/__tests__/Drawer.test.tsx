/**
 * @jest-environment jsdom
 *
 * Drawer unit tests — EP-0 C0.4.
 *
 * Covers:
 * - render gating via `open`
 * - header (title, icon, iconColor, close button)
 * - ESC-to-close
 * - backdrop click closes
 * - focus trap (initial focus + Tab cycling + restore on close)
 * - side presets do not throw
 */
import React from "react";
import {
  render,
  screen,
  fireEvent,
  act,
} from "@testing-library/react";
import { Drawer } from "../Drawer";

describe("Drawer", () => {
  describe("open prop", () => {
    it("renders nothing when open=false", () => {
      const { container } = render(
        <Drawer open={false} onClose={() => {}} title="Hidden">
          <span>content</span>
        </Drawer>
      );
      expect(container).toBeEmptyDOMElement();
    });

    it("renders when open=true", () => {
      render(
        <Drawer open onClose={() => {}} title="Visible">
          <span>content</span>
        </Drawer>
      );
      expect(screen.getByRole("dialog", { name: "Visible" })).toBeInTheDocument();
      expect(screen.getByText("content")).toBeInTheDocument();
    });

    it("defaults open to true so conditional-render callers keep working", () => {
      render(
        <Drawer onClose={() => {}} title="Default open">
          <span>content</span>
        </Drawer>
      );
      expect(screen.getByRole("dialog", { name: "Default open" })).toBeInTheDocument();
    });
  });

  describe("header", () => {
    it("renders the title in a heading", () => {
      render(
        <Drawer onClose={() => {}} title="Faction X">
          <span>inner</span>
        </Drawer>
      );
      expect(screen.getByRole("heading", { name: "Faction X" })).toBeInTheDocument();
    });

    it("renders the icon when provided and applies iconColor to its wrapper", () => {
      const { container } = render(
        <Drawer
          onClose={() => {}}
          title="NPC"
          icon={<svg data-testid="npc-icon" />}
          iconColor="text-purple-400"
        >
          <span>inner</span>
        </Drawer>
      );
      expect(screen.getByTestId("npc-icon")).toBeInTheDocument();
      // The iconColor should appear on the <span> wrapping the icon.
      const wrappers = container.querySelectorAll("span.text-purple-400");
      expect(wrappers.length).toBeGreaterThan(0);
    });

    it("renders a close button with the default aria-label", () => {
      render(
        <Drawer onClose={() => {}} title="T">
          <span>inner</span>
        </Drawer>
      );
      expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
    });

    it("overrides the close aria-label when closeAriaLabel is passed", () => {
      render(
        <Drawer onClose={() => {}} title="T" closeAriaLabel="Fechar">
          <span>inner</span>
        </Drawer>
      );
      expect(screen.getByRole("button", { name: "Fechar" })).toBeInTheDocument();
    });
  });

  describe("close interactions", () => {
    it("fires onClose when the close button is clicked", () => {
      const onClose = jest.fn();
      render(
        <Drawer onClose={onClose} title="T">
          <span>inner</span>
        </Drawer>
      );
      fireEvent.click(screen.getByRole("button", { name: "Close" }));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("fires onClose when ESC is pressed", () => {
      const onClose = jest.fn();
      render(
        <Drawer onClose={onClose} title="T">
          <span>inner</span>
        </Drawer>
      );
      fireEvent.keyDown(document, { key: "Escape" });
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("does NOT fire onClose for ESC when open=false", () => {
      const onClose = jest.fn();
      render(
        <Drawer open={false} onClose={onClose} title="T">
          <span>inner</span>
        </Drawer>
      );
      fireEvent.keyDown(document, { key: "Escape" });
      expect(onClose).not.toHaveBeenCalled();
    });

    it("fires onClose when the backdrop is clicked", () => {
      const onClose = jest.fn();
      const { container } = render(
        <Drawer onClose={onClose} title="T">
          <span>inner</span>
        </Drawer>
      );
      const backdrop = container.querySelector('[aria-hidden="true"]');
      expect(backdrop).not.toBeNull();
      fireEvent.click(backdrop!);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe("focus trap", () => {
    it("moves focus into the panel on mount (to the first focusable, which is the close button)", async () => {
      // Focus trap design note: the close button appears in the DOM before
      // content children, so by document order it is the first focusable
      // element. That is the expected behavior — the close button is a
      // common escape hatch for keyboard users.
      render(
        <Drawer onClose={() => {}} title="T">
          <button data-testid="first-inside">first</button>
          <button data-testid="second-inside">second</button>
        </Drawer>
      );
      // The focus move is rAF-scheduled, flush it.
      await act(async () => {
        await new Promise((r) => requestAnimationFrame(() => r(null)));
      });
      expect(document.activeElement).toBe(
        screen.getByRole("button", { name: "Close" })
      );
    });

    it("Tab from the last focusable wraps to the first (the close button)", async () => {
      render(
        <Drawer onClose={() => {}} title="T">
          <button data-testid="first-inside">first</button>
          <button data-testid="second-inside">second</button>
        </Drawer>
      );
      await act(async () => {
        await new Promise((r) => requestAnimationFrame(() => r(null)));
      });
      const last = screen.getByTestId("second-inside");
      last.focus();
      expect(document.activeElement).toBe(last);
      fireEvent.keyDown(document, { key: "Tab" });
      expect(document.activeElement).toBe(
        screen.getByRole("button", { name: "Close" })
      );
    });

    it("Shift+Tab from the first focusable (close button) wraps to the last", async () => {
      render(
        <Drawer onClose={() => {}} title="T">
          <button data-testid="first-inside">first</button>
          <button data-testid="second-inside">second</button>
        </Drawer>
      );
      await act(async () => {
        await new Promise((r) => requestAnimationFrame(() => r(null)));
      });
      const closeBtn = screen.getByRole("button", { name: "Close" });
      closeBtn.focus();
      expect(document.activeElement).toBe(closeBtn);
      fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
      expect(document.activeElement).toBe(screen.getByTestId("second-inside"));
    });

    it("restores focus to the previously-focused element on unmount", async () => {
      const Host = ({ open }: { open: boolean }) => {
        return (
          <div>
            <button data-testid="trigger">trigger</button>
            {open && (
              <Drawer onClose={() => {}} title="T">
                <button data-testid="inside">inside</button>
              </Drawer>
            )}
          </div>
        );
      };
      const { rerender } = render(<Host open={false} />);
      const trigger = screen.getByTestId("trigger");
      trigger.focus();
      expect(document.activeElement).toBe(trigger);
      rerender(<Host open />);
      await act(async () => {
        await new Promise((r) => requestAnimationFrame(() => r(null)));
      });
      // Focus has moved into the drawer (first focusable is the close button).
      expect(document.activeElement).toBe(
        screen.getByRole("button", { name: "Close" })
      );
      // Closing unmounts the drawer — focus should return to the trigger.
      rerender(<Host open={false} />);
      expect(document.activeElement).toBe(trigger);
    });
  });

  describe("side presets", () => {
    it.each(["right", "left", "bottom"] as const)(
      "renders with side=%s without throwing",
      (side) => {
        render(
          <Drawer onClose={() => {}} title="T" side={side}>
            <span>inner</span>
          </Drawer>
        );
        expect(screen.getByRole("dialog", { name: "T" })).toBeInTheDocument();
      }
    );
  });
});
