/**
 * @jest-environment jsdom
 *
 * Dot unit tests — EP-0 C0.3.
 *
 * The primitive is deliberately dumb: it only renders what the caller
 * passes via `filled`. These tests lock that contract plus the interactive
 * vs presentational split (onClick vs no onClick).
 *
 * NOTE: no tests assert on the dot-semantic "inversion". That is a
 * Sprint 5 concern gated on `NEXT_PUBLIC_PLAYER_HQ_V2`. The `variant` prop
 * here is documentation + analytics hook, nothing more.
 */
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { Dot } from "../Dot";

describe("Dot", () => {
  describe("interactive mode (onClick provided)", () => {
    it("renders as a checkbox button with aria-checked tied to filled", () => {
      const onClick = jest.fn();
      const { rerender } = render(
        <Dot filled variant="transient" onClick={onClick} ariaLabel="Slot 1" />
      );
      const btn = screen.getByRole("checkbox", { name: "Slot 1" });
      expect(btn).toHaveAttribute("aria-checked", "true");
      expect(btn.tagName).toBe("BUTTON");

      rerender(
        <Dot filled={false} variant="transient" onClick={onClick} ariaLabel="Slot 1" />
      );
      expect(screen.getByRole("checkbox", { name: "Slot 1" })).toHaveAttribute(
        "aria-checked",
        "false"
      );
    });

    it("invokes onClick when the user clicks", () => {
      const onClick = jest.fn();
      render(
        <Dot
          filled={false}
          variant="permanent"
          onClick={onClick}
          ariaLabel="Feat acquired"
        />
      );
      fireEvent.click(screen.getByRole("checkbox"));
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it("does not invoke onClick when disabled", () => {
      const onClick = jest.fn();
      render(
        <Dot
          filled={false}
          variant="transient"
          onClick={onClick}
          disabled
          ariaLabel="Slot 1"
        />
      );
      fireEvent.click(screen.getByRole("checkbox"));
      expect(onClick).not.toHaveBeenCalled();
    });

    it("carries the data-variant attribute for analytics / visual regression", () => {
      render(
        <Dot
          filled
          variant="permanent"
          onClick={() => {}}
          ariaLabel="Language known"
        />
      );
      expect(screen.getByRole("checkbox")).toHaveAttribute(
        "data-variant",
        "permanent"
      );
    });
  });

  describe("presentational mode (no onClick)", () => {
    it("renders a non-interactive span when onClick is omitted", () => {
      const { container } = render(
        <Dot filled variant="transient" ariaLabel="Slot 1" />
      );
      // No button, no role="checkbox" — just a span.
      expect(container.querySelector("button")).toBeNull();
      const span = container.querySelector("span");
      expect(span).not.toBeNull();
      expect(span).toHaveAttribute("aria-label", "Slot 1");
      expect(span).toHaveAttribute("data-variant", "transient");
    });
  });

  describe("palette overrides", () => {
    it("applies filledClassName when filled is true", () => {
      const { container } = render(
        <Dot
          filled
          variant="transient"
          filledClassName="bg-red-500 border-red-400/60"
          emptyClassName="bg-transparent border-emerald-500"
          ariaLabel="reaction used"
        />
      );
      const span = container.querySelector("span");
      expect(span?.className).toContain("bg-red-500");
      expect(span?.className).toContain("border-red-400/60");
      expect(span?.className).not.toContain("bg-transparent");
    });

    it("applies emptyClassName when filled is false", () => {
      const { container } = render(
        <Dot
          filled={false}
          variant="transient"
          filledClassName="bg-red-500 border-red-400/60"
          emptyClassName="bg-transparent border-emerald-500"
          ariaLabel="reaction available"
        />
      );
      const span = container.querySelector("span");
      expect(span?.className).toContain("bg-transparent");
      expect(span?.className).toContain("border-emerald-500");
      expect(span?.className).not.toContain("bg-red-500");
    });

    it("falls back to the HQ amber default filled palette when not overridden", () => {
      const { container } = render(
        <Dot filled variant="permanent" ariaLabel="Slot" />
      );
      expect(container.querySelector("span")?.className).toContain("bg-amber-400");
    });
  });

  describe("size", () => {
    it("defaults to md (w-3.5 h-3.5) — matches ResourceDots legacy md", () => {
      const { container } = render(
        <Dot filled variant="permanent" ariaLabel="Slot" />
      );
      expect(container.querySelector("span")?.className).toContain("w-3.5");
    });

    it("maps sm → w-2.5 (matches ResourceDots legacy sm)", () => {
      const { container } = render(
        <Dot filled variant="permanent" size="sm" ariaLabel="Slot" />
      );
      expect(container.querySelector("span")?.className).toContain("w-2.5");
    });

    it("maps lg → w-5 (matches ResourceDots legacy lg)", () => {
      const { container } = render(
        <Dot filled variant="permanent" size="lg" ariaLabel="Slot" />
      );
      expect(container.querySelector("span")?.className).toContain("w-5");
    });
  });

  describe("className escape hatch", () => {
    it("merges extra classes without dropping base styles", () => {
      const { container } = render(
        <Dot
          filled
          variant="transient"
          ariaLabel="Slot"
          className="scale-125 custom-hook"
        />
      );
      const span = container.querySelector("span");
      expect(span?.className).toContain("rounded-full");
      expect(span?.className).toContain("scale-125");
      expect(span?.className).toContain("custom-hook");
    });
  });

  describe("variant semantic documentation (no behavior change)", () => {
    it("renders the same visual regardless of variant, given same filled", () => {
      const { container: permContainer } = render(
        <Dot
          filled
          variant="permanent"
          filledClassName="bg-green-500 border-green-500"
          ariaLabel="Slot"
        />
      );
      const { container: transContainer } = render(
        <Dot
          filled
          variant="transient"
          filledClassName="bg-green-500 border-green-500"
          ariaLabel="Slot"
        />
      );
      // Both render the filled palette. The variant is documentation, not
      // a behavior switch. The only difference is the data-variant attr.
      expect(permContainer.querySelector("span")?.className).toContain(
        "bg-green-500"
      );
      expect(transContainer.querySelector("span")?.className).toContain(
        "bg-green-500"
      );
      expect(permContainer.querySelector("span")).toHaveAttribute(
        "data-variant",
        "permanent"
      );
      expect(transContainer.querySelector("span")).toHaveAttribute(
        "data-variant",
        "transient"
      );
    });
  });
});
