/**
 * @jest-environment jsdom
 */
import React from "react";
import { render } from "@testing-library/react";
import { CampaignCardSkeleton } from "../CampaignCardSkeleton";
import { NpcCardSkeleton } from "../NpcCardSkeleton";
import { MembersListSkeleton } from "../MembersListSkeleton";
import { NotesListSkeleton } from "../NotesListSkeleton";

describe("Skeleton components", () => {
  it("CampaignCardSkeleton renders correct number of items", () => {
    const { container } = render(<CampaignCardSkeleton count={2} />);
    const items = container.querySelectorAll(".animate-pulse");
    expect(items.length).toBe(2);
  });

  it("NpcCardSkeleton renders correct number of items", () => {
    const { container } = render(<NpcCardSkeleton count={4} />);
    const items = container.querySelectorAll(".animate-pulse");
    expect(items.length).toBe(4);
  });

  it("MembersListSkeleton renders correct number of items", () => {
    const { container } = render(<MembersListSkeleton count={3} />);
    const items = container.querySelectorAll(".animate-pulse");
    expect(items.length).toBe(3);
  });

  it("NotesListSkeleton renders aria-hidden", () => {
    const { container } = render(<NotesListSkeleton />);
    expect(container.querySelector("[aria-hidden='true']")).toBeTruthy();
  });
});
