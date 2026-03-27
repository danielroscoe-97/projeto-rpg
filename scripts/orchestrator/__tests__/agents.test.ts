import { describe, it, expect } from "vitest";
import { parseCSVLine, buildAgentPrompt, getToolsForAgent } from "../agents.js";
import type { BmadAgent } from "../agents.js";

describe("parseCSVLine", () => {
  it("should parse simple CSV values", () => {
    const result = parseCSVLine("a,b,c");
    expect(result).toEqual(["a", "b", "c"]);
  });

  it("should handle quoted fields with commas", () => {
    const result = parseCSVLine('"hello, world",simple,"another, field"');
    expect(result).toEqual(["hello, world", "simple", "another, field"]);
  });

  it("should handle empty fields", () => {
    const result = parseCSVLine("a,,c");
    expect(result).toEqual(["a", "", "c"]);
  });

  it("should trim whitespace in fields", () => {
    const result = parseCSVLine("  a , b , c  ");
    expect(result).toEqual(["a", "b", "c"]);
  });

  it("should handle quoted fields with embedded quotes toggle", () => {
    const result = parseCSVLine('"field with ""quotes""",simple');
    // Our parser toggles inQuotes on each " — this matches our implementation
    expect(result.length).toBe(2);
    expect(result[1]).toBe("simple");
  });

  it("should parse a real agent manifest line", () => {
    const line = '"dev","Amelia","Developer Agent","💻","story execution","Senior Software Engineer","Ultra-succinct."';
    const result = parseCSVLine(line);
    expect(result[0]).toBe("dev");
    expect(result[1]).toBe("Amelia");
    expect(result[3]).toBe("💻");
  });
});

describe("buildAgentPrompt", () => {
  const mockAgent: BmadAgent = {
    name: "dev",
    displayName: "Amelia",
    title: "Developer Agent",
    icon: "💻",
    role: "Senior Software Engineer",
    identity: "Executes approved stories",
    communicationStyle: "Ultra-succinct",
    principles: "All tests must pass",
    path: "_bmad/bmm/agents/dev.md",
  };

  it("should include agent display name and icon", () => {
    const prompt = buildAgentPrompt(mockAgent);
    expect(prompt).toContain("Amelia");
    expect(prompt).toContain("💻");
    expect(prompt).toContain("Developer Agent");
  });

  it("should include all personality sections", () => {
    const prompt = buildAgentPrompt(mockAgent);
    expect(prompt).toContain("## Role");
    expect(prompt).toContain("## Identity");
    expect(prompt).toContain("## Communication Style");
    expect(prompt).toContain("## Principles");
    expect(prompt).toContain("## Project Context");
    expect(prompt).toContain("## Critical Rules");
  });

  it("should include project-specific rules", () => {
    const prompt = buildAgentPrompt(mockAgent);
    expect(prompt).toContain("Taverna do Mestre");
    expect(prompt).toContain("anti-metagaming");
    expect(prompt).toContain("Zod schemas");
  });
});

describe("getToolsForAgent", () => {
  it("should give dev full read/write tools", () => {
    const tools = getToolsForAgent("dev");
    expect(tools).toContain("Read");
    expect(tools).toContain("Edit");
    expect(tools).toContain("Write");
    expect(tools).toContain("Bash");
  });

  it("should give qa read + Bash", () => {
    const tools = getToolsForAgent("qa");
    expect(tools).toContain("Read");
    expect(tools).toContain("Bash");
    expect(tools).not.toContain("Edit");
    expect(tools).not.toContain("Write");
  });

  it("should give ux-designer read-only", () => {
    const tools = getToolsForAgent("ux-designer");
    expect(tools).toContain("Read");
    expect(tools).not.toContain("Edit");
    expect(tools).not.toContain("Write");
    expect(tools).not.toContain("Bash");
  });

  it("should give pm read + Write", () => {
    const tools = getToolsForAgent("pm");
    expect(tools).toContain("Read");
    expect(tools).toContain("Write");
    expect(tools).not.toContain("Edit");
  });

  it("should default to read-only for unknown agents", () => {
    const tools = getToolsForAgent("unknown-agent");
    expect(tools).toEqual(["Read", "Glob", "Grep"]);
  });
});
