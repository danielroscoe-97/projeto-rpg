/**
 * Epic 12, Story 12.10 — CombatRevisitModal focus + CR=0 + HP=0 + exit anim.
 *
 * Wave 3 review caught:
 * - Focus trap was a lie (commit said "focus-trapped", no actual trap)
 * - Focus didn't return to the opener on close
 * - Initial focus never moved into the dialog
 * - HP display showed "X/0" when max_hp=0
 * - CR 0 creatures lost their CR badge (`c.cr &&` drops falsy-zero)
 * - ResultHero masqueraded unknown enum values as `dm_ended`
 *
 * These tests pin the fixes.
 */
import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import type { Combatant } from "@/lib/types/combat";
import { CombatTimelineEntry } from "@/components/campaign/CombatTimelineEntry";
import type { RevisitEntry } from "@/components/campaign/CombatRevisitModal";

jest.mock("next-intl", () => ({
  useTranslations: () => (key: string, values?: Record<string, unknown>) => {
    if (!values) return key;
    return `${key}:${JSON.stringify(values)}`;
  },
}));

// framer-motion's AnimatePresence waits for exit animations in real browsers;
// in jsdom we render children without the motion choreography.
jest.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: new Proxy({}, {
    get: () => (props: Record<string, unknown>) => <div {...(props as object)} />,
  }),
}));

function makeEntry(overrides: Partial<RevisitEntry> = {}): RevisitEntry {
  return {
    id: "enc-1",
    name: "Batalha do Portão Sul",
    ended_at: new Date().toISOString(),
    duration_seconds: 124,
    round_number: 4,
    combat_result: "victory",
    party_snapshot: [],
    creatures_snapshot: [],
    dm_difficulty_rating: null,
    dm_notes: null,
    ...overrides,
  };
}

describe("CombatTimelineEntry + CombatRevisitModal (Story 12.10)", () => {
  it("opens the modal on click and returns focus to the trigger on close", async () => {
    render(
      <ol>
        <CombatTimelineEntry
          id="enc-1"
          header={<span>Batalha</span>}
          meta={["hoje"]}
          endedAt={new Date().toISOString()}
          absoluteTitle="2026-04-21 18:00"
          revisit={makeEntry()}
        />
      </ol>,
    );

    const trigger = screen.getByTestId("timeline-entry-open");
    trigger.focus();
    expect(document.activeElement).toBe(trigger);

    fireEvent.click(trigger);
    const closeBtn = await screen.findByTestId("revisit-modal-close");
    expect(closeBtn).toBeInTheDocument();

    // Initial focus moves INTO the dialog (onto the close button).
    await act(async () => {
      await Promise.resolve();
    });
    expect(document.activeElement).toBe(closeBtn);

    // Close + focus returns to the opener. queueMicrotask defers focus return;
    // flush microtasks to make sure it runs before the assertion.
    fireEvent.click(closeBtn);
    await act(async () => {
      await Promise.resolve();
    });
    expect(document.activeElement).toBe(trigger);
  });

  it("closes when Escape is pressed", async () => {
    render(
      <ol>
        <CombatTimelineEntry
          id="enc-2"
          header={<span>X</span>}
          meta={["hoje"]}
          endedAt={new Date().toISOString()}
          absoluteTitle="x"
          revisit={makeEntry({ id: "enc-2" })}
        />
      </ol>,
    );

    fireEvent.click(screen.getByTestId("timeline-entry-open"));
    expect(await screen.findByTestId("revisit-modal")).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByTestId("revisit-modal")).not.toBeInTheDocument();
  });

  it("does not render HP bar when max_hp is 0 (division-by-zero guard)", async () => {
    render(
      <ol>
        <CombatTimelineEntry
          id="enc-3"
          header={<span>X</span>}
          meta={["hoje"]}
          endedAt={new Date().toISOString()}
          absoluteTitle="x"
          revisit={makeEntry({
            id: "enc-3",
            party_snapshot: [{ member_id: "p1", name: "Kael", level: 5, class: null, race: null, max_hp: 0, current_hp: 15 } as unknown as RevisitEntry["party_snapshot"][number]],
          })}
        />
      </ol>,
    );

    fireEvent.click(screen.getByTestId("timeline-entry-open"));
    const row = await screen.findByTestId("revisit-party-row");
    // "X/0" must NOT appear — the HP block is suppressed when max_hp is 0.
    expect(row.textContent).not.toMatch(/15\/0/);
  });

  it("renders CR tag for creatures with CR 0 (commoners, rats)", async () => {
    render(
      <ol>
        <CombatTimelineEntry
          id="enc-4"
          header={<span>X</span>}
          meta={["hoje"]}
          endedAt={new Date().toISOString()}
          absoluteTitle="x"
          revisit={makeEntry({
            id: "enc-4",
            creatures_snapshot: [{
              name: "Commoner",
              cr: "0",
              slug: "commoner",
              source: "srd",
              quantity: 2,
              was_defeated: false,
            } as unknown as RevisitEntry["creatures_snapshot"][number]],
          })}
        />
      </ol>,
    );

    fireEvent.click(screen.getByTestId("timeline-entry-open"));
    const row = await screen.findByTestId("revisit-creature-row");
    // CR 0 must surface as "CR 0" — Wave 3 review #5 fix.
    expect(row.textContent).toMatch(/CR 0/);
  });

  it("renders the 'unknown' variant when combat_result is outside the enum", async () => {
    render(
      <ol>
        <CombatTimelineEntry
          id="enc-5"
          header={<span>X</span>}
          meta={["hoje"]}
          endedAt={new Date().toISOString()}
          absoluteTitle="x"
          revisit={makeEntry({
            id: "enc-5",
            combat_result: "surrender" as unknown as RevisitEntry["combat_result"],
          })}
        />
      </ol>,
    );

    fireEvent.click(screen.getByTestId("timeline-entry-open"));
    const modal = await screen.findByTestId("revisit-modal");
    // Heading area contains the translation key "result_unknown" — our mock
    // returns the key verbatim, so we check for that string.
    expect(modal.textContent).toMatch(/result_unknown/);
    // Must NOT masquerade as dm_ended
    expect(modal.textContent).not.toMatch(/^result_dm_ended$/m);
  });
});

// Throwaway reference so the Combatant type import isn't pruned by ts-jest.
type _Keep = Combatant;
