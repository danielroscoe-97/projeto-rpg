import React from "react";
import { render, screen } from "@testing-library/react";
import { PlanBadge } from "../PlanBadge";

describe("PlanBadge", () => {
  it("renders free badge for free plan", () => {
    render(<PlanBadge plan="free" status={null} trialEndsAt={null} />);
    expect(screen.getByTestId("plan-badge-free")).toBeInTheDocument();
    expect(screen.getByTestId("plan-badge-free")).toHaveTextContent("profile.plan_free");
  });

  it("renders trial badge with days remaining", () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);
    render(
      <PlanBadge plan="pro" status="trialing" trialEndsAt={futureDate.toISOString()} />
    );
    // trialing status shows trial badge even if plan is pro
    expect(screen.getByTestId("plan-badge-trial")).toBeInTheDocument();
    expect(screen.getByTestId("plan-badge-trial")).toHaveTextContent("profile.plan_trial");
    expect(screen.getByTestId("plan-badge-trial")).toHaveTextContent("profile.days_remaining");
  });

  it("renders pro badge for active pro plan", () => {
    render(<PlanBadge plan="pro" status="active" trialEndsAt={null} />);
    expect(screen.getByTestId("plan-badge-pro")).toBeInTheDocument();
    expect(screen.getByTestId("plan-badge-pro")).toHaveTextContent("profile.plan_pro");
  });

  it("renders pro badge for mesa plan", () => {
    render(<PlanBadge plan="mesa" status="active" trialEndsAt={null} />);
    expect(screen.getByTestId("plan-badge-pro")).toBeInTheDocument();
  });

  it("renders free badge when no status", () => {
    render(<PlanBadge plan="free" status={null} trialEndsAt={null} />);
    expect(screen.getByTestId("plan-badge-free")).toBeInTheDocument();
  });
});
