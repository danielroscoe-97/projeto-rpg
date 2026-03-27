import { describe, it, expect } from "vitest";

// Test the config schema validation by importing the config
// If validation fails, the import itself will throw
describe("config", () => {
  it("should export a valid config object", async () => {
    const { config } = await import("../config.js");

    expect(config).toBeDefined();
    expect(config.projectRoot).toBeDefined();
    expect(typeof config.projectRoot).toBe("string");
  });

  it("should have valid agent settings", async () => {
    const { config } = await import("../config.js");

    expect(config.agent.maxTurnsPerStory).toBeGreaterThan(0);
    expect(config.agent.maxTurnsPerQuickFix).toBeGreaterThan(0);
    expect(config.agent.maxTurnsPerSpec).toBeGreaterThan(0);
    expect(config.agent.maxTurnsPerQA).toBeGreaterThan(0);
    expect(config.agent.maxTurnsPerChat).toBeGreaterThan(0);
    expect(config.agent.timeoutMs).toBeGreaterThan(0);
    expect(config.agent.permissionMode).toBe("bypassPermissions");
  });

  it("should have valid model names", async () => {
    const { config } = await import("../config.js");
    const validModels = ["opus", "sonnet", "haiku"];

    for (const [key, model] of Object.entries(config.agent.models)) {
      expect(validModels).toContain(model);
    }
  });

  it("should have valid git settings", async () => {
    const { config } = await import("../config.js");

    expect(config.git.baseBranch).toBe("master");
    expect(config.git.branchPrefix).toBe("feat/");
    expect(typeof config.git.autoCommit).toBe("boolean");
    expect(typeof config.git.autoPush).toBe("boolean");
    expect(typeof config.git.autoCreatePR).toBe("boolean");
  });

  it("should have escalation rules defined", async () => {
    const { config } = await import("../config.js");

    expect(config.escalation.criticalPaths.length).toBeGreaterThan(0);
    expect(config.escalation.alwaysEscalate.length).toBeGreaterThan(0);
    expect(config.escalation.autoApprove.length).toBeGreaterThan(0);
    expect(config.escalation.criticalPaths).toContain("supabase/migrations");
    expect(config.escalation.criticalPaths).toContain(".env");
  });

  it("should have valid path settings", async () => {
    const { config } = await import("../config.js");

    expect(config.paths.agentManifest).toContain("agent-manifest");
    expect(config.paths.sprintSpec).toContain("epics-and-sprints");
    expect(config.paths.projectContext).toContain("project-context");
  });
});
