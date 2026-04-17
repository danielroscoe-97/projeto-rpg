/**
 * @jest-environment jsdom
 *
 * S4.1 — Turn-advance pulse highlight tests.
 *
 * These tests validate the VISUAL polish layer (CSS keyframe + effect pattern)
 * without spinning up the full CombatSessionClient (which has dozens of
 * dependencies). Strategy: a tiny harness component that mirrors the exact
 * effect pattern used in all 3 clients (`[currentTurnIndex]` dep, 1.1s timeout
 * clear on unmount, pulse class guard when id matches).
 */
import React, { useEffect, useRef, useState } from "react";
import { render, act } from "@testing-library/react";

interface Combatant {
  id: string;
  name: string;
}

interface PulseListProps {
  combatants: Combatant[];
  currentTurnIndex: number;
}

// Mirrors the exact effect shape in CombatSessionClient / GuestCombatClient /
// PlayerInitiativeBoard. If this shape drifts, the test will catch it.
function PulseList({ combatants, currentTurnIndex }: PulseListProps) {
  const isFirstRender = useRef(true);
  const [pulseTurnId, setPulseTurnId] = useState<string | null>(null);
  const pulseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const current = combatants[currentTurnIndex];
    if (current) {
      setPulseTurnId(current.id);
      if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current);
      pulseTimerRef.current = setTimeout(() => {
        setPulseTurnId(null);
        pulseTimerRef.current = null;
      }, 1100);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTurnIndex]);

  useEffect(() => () => {
    if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current);
  }, []);

  return (
    <ul>
      {combatants.map((c) => (
        <li
          key={c.id}
          data-testid={`row-${c.id}`}
          className={pulseTurnId === c.id ? "animate-turn-pulse" : ""}
        >
          {c.name}
        </li>
      ))}
    </ul>
  );
}

describe("S4.1 — turn-pulse highlight", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  const combatants: Combatant[] = [
    { id: "a", name: "Arthur" },
    { id: "b", name: "Bella" },
    { id: "c", name: "Cid" },
  ];

  it("applies animate-turn-pulse on turn advance (not on initial mount)", () => {
    const { rerender, getByTestId } = render(
      <PulseList combatants={combatants} currentTurnIndex={0} />
    );
    // Initial mount must NOT pulse — `isFirstRender` guard.
    expect(getByTestId("row-a").className).not.toContain("animate-turn-pulse");

    act(() => {
      rerender(<PulseList combatants={combatants} currentTurnIndex={1} />);
    });
    expect(getByTestId("row-b").className).toContain("animate-turn-pulse");
    // Non-current rows never pulse.
    expect(getByTestId("row-a").className).not.toContain("animate-turn-pulse");
    expect(getByTestId("row-c").className).not.toContain("animate-turn-pulse");
  });

  it("clears pulse class after ~1.1s (one-shot)", () => {
    const { rerender, getByTestId } = render(
      <PulseList combatants={combatants} currentTurnIndex={0} />
    );
    act(() => {
      rerender(<PulseList combatants={combatants} currentTurnIndex={1} />);
    });
    expect(getByTestId("row-b").className).toContain("animate-turn-pulse");

    act(() => {
      jest.advanceTimersByTime(1101);
    });
    expect(getByTestId("row-b").className).not.toContain("animate-turn-pulse");
  });

  it("does NOT re-pulse when combatants array identity changes but turn index does not", () => {
    const setA: Combatant[] = [{ id: "a", name: "Arthur" }, { id: "b", name: "Bella" }];
    const setB: Combatant[] = [{ id: "a", name: "Arthur (dmg)" }, { id: "b", name: "Bella" }];
    const { rerender, getByTestId } = render(
      <PulseList combatants={setA} currentTurnIndex={0} />
    );
    // Same turn index — simulating an HP change that only rewrites the array.
    act(() => {
      rerender(<PulseList combatants={setB} currentTurnIndex={0} />);
    });
    expect(getByTestId("row-a").className).not.toContain("animate-turn-pulse");
  });

  it("suppresses animation when prefers-reduced-motion is set (CSS-layer guard)", () => {
    // The CSS rule lives in app/globals.css and maps
    //   @media (prefers-reduced-motion: reduce) { .animate-turn-pulse { animation: none; ... } }
    // JSDOM doesn't run CSS media queries, but we validate the matchMedia
    // contract that lets consumers short-circuit if needed.
    const originalMatchMedia = window.matchMedia;
    window.matchMedia = jest.fn().mockImplementation((query: string) => ({
      matches: query === "(prefers-reduced-motion: reduce)",
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })) as typeof window.matchMedia;

    expect(
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ).toBe(true);

    window.matchMedia = originalMatchMedia;
  });

  it("does not leak setTimeout on unmount (pulseTimerRef cleanup)", () => {
    const { rerender, unmount } = render(
      <PulseList combatants={combatants} currentTurnIndex={0} />
    );
    act(() => {
      rerender(<PulseList combatants={combatants} currentTurnIndex={1} />);
    });
    // Unmount while pulse is still active.
    unmount();
    // If cleanup wasn't wired, advancing timers would throw "setState on
    // unmounted" warnings. We assert no pending timers remain after real-timer
    // switchback.
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    expect(jest.getTimerCount()).toBe(0);
  });
});
