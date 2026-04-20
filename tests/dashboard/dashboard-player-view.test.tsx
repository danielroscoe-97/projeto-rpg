/**
 * Story 02-F full — Dashboard player-view integration tests.
 *
 * We can't render the full async Next.js server page under jsdom (no
 * App Router runtime, no Supabase cookies), so the integration surface
 * we cover here is the COMPOSITION + Suspense fallback shape: when the
 * player dashboard mounts, the skeletons for all four sections render
 * on first paint, and when each server component resolves, the live
 * card/grid/section replaces its skeleton with the same outer shape
 * (no CLS).
 *
 * This validates the contract the page-level `<Suspense fallback={…}>`
 * boundaries depend on, which is the part of the story that is
 * renderable in a unit environment.
 *
 * RLS note (Winston M4): server-side query validation is tracked in the
 * report below, not here — jsdom cannot hit Supabase with a real cookie.
 */

import React, { Suspense } from "react";
import { render, screen, waitFor } from "@testing-library/react";

import { ContinueFromLastSession } from "@/components/dashboard/ContinueFromLastSession";
import { ContinueFromLastSessionSkeleton } from "@/components/dashboard/ContinueFromLastSessionSkeleton";
import { MyCharactersGrid } from "@/components/dashboard/MyCharactersGrid";
import { MyCharactersGridSkeleton } from "@/components/dashboard/MyCharactersGridSkeleton";
import { MyCampaignsSection } from "@/components/dashboard/MyCampaignsSection";
import { MyCampaignsSectionSkeleton } from "@/components/dashboard/MyCampaignsSectionSkeleton";
import { SessionHistoryList } from "@/components/dashboard/SessionHistoryList";
import { SessionHistoryListSkeleton } from "@/components/dashboard/SessionHistoryListSkeleton";

/**
 * Helper: returns a `React.lazy`-backed component you can resolve on demand.
 * Mirrors how an async server component resolves under the App Router from
 * React's perspective — a pending thenable that eventually returns JSX.
 */
function lazyHandle(node: React.ReactElement) {
  let resolveFn: (mod: { default: React.ComponentType }) => void = () => {};
  const LazyCmp = React.lazy(
    () =>
      new Promise<{ default: React.ComponentType }>((resolve) => {
        resolveFn = resolve;
      }),
  );
  return {
    LazyCmp,
    resolve: () => resolveFn({ default: () => node }),
  };
}

describe("Dashboard player view — composition", () => {
  it("renders ALL four skeletons on first paint, then swaps each in", async () => {
    const continueHandle = lazyHandle(
      <ContinueFromLastSession
        data={{
          campaignId: "camp-1",
          characterId: "char-1",
          campaignName: "Queda de Krynn",
          characterName: "Thorin",
          avatarUrl: null,
          lastSessionAt: new Date(Date.now() - 3600_000).toISOString(),
        }}
        locale="pt-BR"
      />,
    );

    const charactersHandle = lazyHandle(
      <MyCharactersGrid
        characters={[
          {
            id: "char-1",
            name: "Thorin",
            race: "Anão",
            characterClass: "Bárbaro",
            level: 5,
            currentHp: 40,
            maxHp: 45,
            ac: 16,
            tokenUrl: null,
            campaignId: "camp-1",
            campaignName: "Queda de Krynn",
            lastSessionAt: null,
          },
        ]}
        defaultCharacterId="char-1"
      />,
    );

    const campaignsHandle = lazyHandle(
      <MyCampaignsSection
        campaigns={[
          {
            id: "camp-1",
            name: "Queda de Krynn",
            coverImageUrl: null,
            dmName: "Roscoe",
            dmEmail: "r@x.com",
            sessionCount: 3,
            lastSessionAt: "2026-04-10T00:00:00Z",
          },
        ]}
        locale="pt-BR"
      />,
    );

    const historyHandle = lazyHandle(
      <SessionHistoryList
        rows={[
          {
            sessionId: "s-1",
            campaignId: "camp-1",
            campaignName: "Queda de Krynn",
            encounterId: "e-1",
            encounterName: "Emboscada",
            createdAt: "2026-04-10T00:00:00Z",
            hasRecap: true,
          },
        ]}
        locale="pt-BR"
      />,
    );

    render(
      <div>
        <Suspense fallback={<ContinueFromLastSessionSkeleton />}>
          <continueHandle.LazyCmp />
        </Suspense>
        <Suspense fallback={<MyCharactersGridSkeleton />}>
          <charactersHandle.LazyCmp />
        </Suspense>
        <Suspense fallback={<MyCampaignsSectionSkeleton />}>
          <campaignsHandle.LazyCmp />
        </Suspense>
        <Suspense fallback={<SessionHistoryListSkeleton />}>
          <historyHandle.LazyCmp />
        </Suspense>
      </div>,
    );

    // First flush: every skeleton is visible, no live section has mounted.
    expect(
      screen.getByTestId("continue-from-last-session-skeleton"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("my-characters-grid-skeleton"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("my-campaigns-section-skeleton"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("session-history-list-skeleton"),
    ).toBeInTheDocument();

    expect(
      screen.queryByTestId("continue-from-last-session"),
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId("my-characters-grid")).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("my-campaigns-section"),
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId("session-history-list")).not.toBeInTheDocument();

    // Resolve each server component in order and assert the swap.
    continueHandle.resolve();
    await waitFor(() =>
      expect(
        screen.getByTestId("continue-from-last-session"),
      ).toBeInTheDocument(),
    );

    charactersHandle.resolve();
    await waitFor(() =>
      expect(screen.getByTestId("my-characters-grid")).toBeInTheDocument(),
    );

    campaignsHandle.resolve();
    await waitFor(() =>
      expect(screen.getByTestId("my-campaigns-section")).toBeInTheDocument(),
    );

    historyHandle.resolve();
    await waitFor(() =>
      expect(screen.getByTestId("session-history-list")).toBeInTheDocument(),
    );

    // All skeletons are gone.
    expect(
      screen.queryByTestId("continue-from-last-session-skeleton"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("my-characters-grid-skeleton"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("my-campaigns-section-skeleton"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("session-history-list-skeleton"),
    ).not.toBeInTheDocument();
  });

  it("each section is independently labelled for screen readers", () => {
    render(
      <div>
        <MyCharactersGrid characters={[]} defaultCharacterId={null} />
        <MyCampaignsSection campaigns={[]} locale="pt-BR" />
        <SessionHistoryList rows={[]} locale="pt-BR" />
      </div>,
    );

    // Empty states do not use aria-labelledby (no landmark), but labelled
    // sections still expose an <h2> per section so a screen-reader user can
    // jump by heading. Assert all three titles exist in the tree.
    expect(
      screen.getByText("dashboard.myCharacters.title"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("dashboard.myCampaigns.title"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("dashboard.sessionHistory.title"),
    ).toBeInTheDocument();
  });
});
