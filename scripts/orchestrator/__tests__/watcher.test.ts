import { describe, it, expect } from "vitest";
import { parseWatchCommand } from "../watcher.js";

describe("parseWatchCommand", () => {
  it("should parse spec readiness commands with sprint number", () => {
    const result = parseWatchCommand("quando as specs ficarem prontas, comece o sprint 2");
    expect(result).not.toBeNull();
    expect(result!.condition.type).toBe("specs_ready");
    if (result!.condition.type === "specs_ready") {
      expect(result!.condition.sprint).toBe("2");
    }
    expect(result!.action).toBe("sprint 2");
  });

  it("should default sprint to 1 when not specified", () => {
    const result = parseWatchCommand("quando as specs ficarem prontas comece a codar");
    expect(result).not.toBeNull();
    if (result!.condition.type === "specs_ready") {
      expect(result!.condition.sprint).toBe("1");
    }
  });

  it("should parse English spec ready commands", () => {
    const result = parseWatchCommand("when specs are ready, start sprint 1");
    expect(result).not.toBeNull();
    expect(result!.condition.type).toBe("specs_ready");
  });

  it("should parse test pass commands", () => {
    const result = parseWatchCommand("quando os testes passarem, crie o PR");
    expect(result).not.toBeNull();
    expect(result!.condition.type).toBe("tests_pass");
  });

  it("should parse English test pass commands", () => {
    const result = parseWatchCommand("when tests pass, create PR");
    expect(result).not.toBeNull();
    expect(result!.condition.type).toBe("tests_pass");
  });

  it("should parse no open PRs commands", () => {
    const result = parseWatchCommand("quando não tiver PR aberto, comece a próxima story");
    expect(result).not.toBeNull();
    expect(result!.condition.type).toBe("no_open_prs");
  });

  it("should parse open PR check in English", () => {
    const result = parseWatchCommand("when no open PRs, start next story");
    expect(result).not.toBeNull();
    expect(result!.condition.type).toBe("no_open_prs");
  });

  it("should return null for unrecognized commands", () => {
    expect(parseWatchCommand("faça café")).toBeNull();
    expect(parseWatchCommand("oi")).toBeNull();
    expect(parseWatchCommand("implementa a story 1.1")).toBeNull();
  });
});
