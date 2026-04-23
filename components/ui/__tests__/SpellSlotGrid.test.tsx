/**
 * @jest-environment jsdom
 *
 * SpellSlotGrid unit tests — EP-0 C0.2.
 *
 * Ensures the consolidation primitive reproduces the exact behavior of the
 * legacy ResourceDots + combat SpellSlotTracker implementations without
 * flipping any visual semantic (the semantic flip is a Sprint 5 concern
 * behind NEXT_PUBLIC_PLAYER_HQ_V2).
 */
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { SpellSlotGrid } from "../SpellSlotGrid";

describe("SpellSlotGrid", () => {
  describe("rendering", () => {
    it("renders exactly `max` checkboxes", () => {
      render(
        <SpellSlotGrid used={0} max={4} variant="transient" ariaLabel="Level 1" />
      );
      expect(screen.getAllByRole("checkbox")).toHaveLength(4);
    });

    it("wraps the whole row in a group with the supplied ariaLabel", () => {
      render(
        <SpellSlotGrid used={1} max={3} variant="transient" ariaLabel="Level 2" />
      );
      expect(screen.getByRole("group", { name: "Level 2" })).toBeInTheDocument();
    });

    it("generates a default per-dot label when dotAriaLabel is omitted", () => {
      render(
        <SpellSlotGrid used={0} max={2} variant="transient" ariaLabel="Slots" />
      );
      expect(screen.getByRole("checkbox", { name: "Slots 1/2" })).toBeInTheDocument();
      expect(screen.getByRole("checkbox", { name: "Slots 2/2" })).toBeInTheDocument();
    });

    it("routes each dot through the custom dotAriaLabel formatter when provided", () => {
      render(
        <SpellSlotGrid
          used={1}
          max={3}
          variant="transient"
          ariaLabel="Level 3"
          dotAriaLabel={(i, filled) => `dot ${i} ${filled ? "ON" : "OFF"}`}
        />
      );
      // variant=transient, used=1, max=3 → filled indices 0,1 (remaining=2)
      expect(screen.getByRole("checkbox", { name: "dot 0 ON" })).toBeInTheDocument();
      expect(screen.getByRole("checkbox", { name: "dot 1 ON" })).toBeInTheDocument();
      expect(screen.getByRole("checkbox", { name: "dot 2 OFF" })).toBeInTheDocument();
    });
  });

  describe("variant=transient (legacy-identical behavior)", () => {
    it("marks the first `max - used` dots as checked", () => {
      render(
        <SpellSlotGrid used={1} max={4} variant="transient" ariaLabel="Slots" />
      );
      const dots = screen.getAllByRole("checkbox");
      // remaining = 3 → indices 0,1,2 filled, index 3 empty
      expect(dots[0]).toHaveAttribute("aria-checked", "true");
      expect(dots[1]).toHaveAttribute("aria-checked", "true");
      expect(dots[2]).toHaveAttribute("aria-checked", "true");
      expect(dots[3]).toHaveAttribute("aria-checked", "false");
    });

    it("marks every dot as empty when used === max", () => {
      render(
        <SpellSlotGrid used={3} max={3} variant="transient" ariaLabel="Slots" />
      );
      const dots = screen.getAllByRole("checkbox");
      for (const dot of dots) {
        expect(dot).toHaveAttribute("aria-checked", "false");
      }
    });

    it("marks every dot as filled when used === 0", () => {
      render(
        <SpellSlotGrid used={0} max={3} variant="transient" ariaLabel="Slots" />
      );
      const dots = screen.getAllByRole("checkbox");
      for (const dot of dots) {
        expect(dot).toHaveAttribute("aria-checked", "true");
      }
    });

    it("clamps negative filledCount when used > max (defensive)", () => {
      // Shouldn't happen in practice, but the primitive must not crash.
      render(
        <SpellSlotGrid used={99} max={2} variant="transient" ariaLabel="Slots" />
      );
      const dots = screen.getAllByRole("checkbox");
      expect(dots[0]).toHaveAttribute("aria-checked", "false");
      expect(dots[1]).toHaveAttribute("aria-checked", "false");
    });
  });

  describe("variant=permanent", () => {
    it("marks the first `used` dots as checked (acquired)", () => {
      render(
        <SpellSlotGrid used={2} max={4} variant="permanent" ariaLabel="Feats" />
      );
      const dots = screen.getAllByRole("checkbox");
      // used = 2 acquired → indices 0,1 filled
      expect(dots[0]).toHaveAttribute("aria-checked", "true");
      expect(dots[1]).toHaveAttribute("aria-checked", "true");
      expect(dots[2]).toHaveAttribute("aria-checked", "false");
      expect(dots[3]).toHaveAttribute("aria-checked", "false");
    });

    it("marks every dot as empty when used === 0", () => {
      render(
        <SpellSlotGrid used={0} max={3} variant="permanent" ariaLabel="Feats" />
      );
      const dots = screen.getAllByRole("checkbox");
      for (const dot of dots) {
        expect(dot).toHaveAttribute("aria-checked", "false");
      }
    });
  });

  describe("onToggle", () => {
    it("fires onToggle with the clicked dot index", () => {
      const onToggle = jest.fn();
      render(
        <SpellSlotGrid
          used={0}
          max={3}
          variant="transient"
          onToggle={onToggle}
          ariaLabel="Slots"
        />
      );
      fireEvent.click(screen.getAllByRole("checkbox")[1]);
      expect(onToggle).toHaveBeenCalledWith(1);
    });

    it("does not fire onToggle when readOnly is true", () => {
      const onToggle = jest.fn();
      render(
        <SpellSlotGrid
          used={0}
          max={2}
          variant="transient"
          readOnly
          onToggle={onToggle}
          ariaLabel="Slots"
        />
      );
      fireEvent.click(screen.getAllByRole("checkbox")[0]);
      expect(onToggle).not.toHaveBeenCalled();
    });

    it("does not throw when onToggle is undefined", () => {
      render(
        <SpellSlotGrid used={0} max={2} variant="transient" ariaLabel="Slots" />
      );
      expect(() => fireEvent.click(screen.getAllByRole("checkbox")[0])).not.toThrow();
    });
  });

  describe("density presets", () => {
    it("comfortable density wraps dots in a 44×44 invisible touch target", () => {
      const { container } = render(
        <SpellSlotGrid
          used={0}
          max={1}
          variant="transient"
          density="comfortable"
          ariaLabel="Slots"
        />
      );
      const button = container.querySelector("button");
      expect(button?.className).toContain("min-w-[44px]");
      expect(button?.className).toContain("min-h-[44px]");
    });

    it("compact density renders without the 44×44 touch target", () => {
      const { container } = render(
        <SpellSlotGrid
          used={0}
          max={1}
          variant="transient"
          density="compact"
          ariaLabel="Slots"
        />
      );
      const button = container.querySelector("button");
      expect(button?.className).not.toContain("min-w-[44px]");
      expect(button?.className).not.toContain("min-h-[44px]");
    });
  });
});
