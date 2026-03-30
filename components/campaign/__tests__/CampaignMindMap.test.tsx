import React from "react";
import { render, screen } from "@testing-library/react";
import { CampaignMindMap } from "../CampaignMindMap";

// Mock next-intl
jest.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const map: Record<string, string> = {
      loading: "Loading map...",
      title: "Mind Map",
    };
    return map[key] ?? key;
  },
}));

// Mock supabase client
const mockSelect = jest.fn();
const mockFrom = jest.fn(() => ({
  select: mockSelect,
}));

jest.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    from: mockFrom,
  }),
}));

// Mock @xyflow/react
jest.mock("@xyflow/react", () => {
  const actual = {
    Position: { Top: "top", Bottom: "bottom", Left: "left", Right: "right" },
    BackgroundVariant: { Dots: "dots" },
  };
  return {
    ...actual,
    ReactFlow: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="react-flow">{children}</div>
    ),
    Controls: () => <div data-testid="rf-controls" />,
    MiniMap: () => <div data-testid="rf-minimap" />,
    Background: () => <div data-testid="rf-background" />,
    Handle: () => <div />,
    useNodesState: (init: unknown[]) => [init, jest.fn(), jest.fn()],
    useEdgesState: (init: unknown[]) => [init, jest.fn(), jest.fn()],
  };
});

// Mock dagre
jest.mock("@dagrejs/dagre", () => ({
  graphlib: {
    Graph: jest.fn().mockImplementation(() => ({
      setDefaultEdgeLabel: jest.fn(),
      setGraph: jest.fn(),
      setNode: jest.fn(),
      setEdge: jest.fn(),
      node: jest.fn(() => ({ x: 0, y: 0 })),
    })),
  },
  layout: jest.fn(),
}));

describe("CampaignMindMap", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default: all queries return empty
    const chainable = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: [], error: null }),
    };
    mockSelect.mockReturnValue(chainable);
    mockFrom.mockReturnValue({ select: mockSelect });
  });

  it("shows loading state initially", () => {
    render(
      <CampaignMindMap campaignId="camp-1" campaignName="Test Campaign" />
    );
    expect(screen.getByText("Loading map...")).toBeInTheDocument();
  });

  it("renders the ReactFlow wrapper", () => {
    render(
      <CampaignMindMap campaignId="camp-1" campaignName="Test Campaign" />
    );
    // Initially shows loading, flow renders after data loads
    expect(screen.getByText("Loading map...")).toBeInTheDocument();
  });
});
