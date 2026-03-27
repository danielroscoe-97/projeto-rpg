import { describe, it, expect, vi } from "vitest";
import { logger } from "../logger.js";

describe("logger", () => {
  it("should have all log level methods", () => {
    expect(typeof logger.debug).toBe("function");
    expect(typeof logger.info).toBe("function");
    expect(typeof logger.warn).toBe("function");
    expect(typeof logger.error).toBe("function");
  });

  it("should log info messages to console", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    logger.info("test message");
    expect(spy).toHaveBeenCalled();
    const output = spy.mock.calls[0][0] as string;
    expect(output).toContain("INFO");
    expect(output).toContain("test message");
    spy.mockRestore();
  });

  it("should log warn messages to console.warn", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    logger.warn("warning test");
    expect(spy).toHaveBeenCalled();
    const output = spy.mock.calls[0][0] as string;
    expect(output).toContain("WARN");
    spy.mockRestore();
  });

  it("should log error messages to console.error", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    logger.error("error test");
    expect(spy).toHaveBeenCalled();
    const output = spy.mock.calls[0][0] as string;
    expect(output).toContain("ERROR");
    spy.mockRestore();
  });

  it("should log task completion metrics", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    logger.taskComplete({
      task: "story-1.1",
      model: "opus",
      maxTurns: 80,
      durationMs: 300_000,
      exitCode: 0,
      outputLength: 5000,
    });
    expect(spy).toHaveBeenCalled();
    const output = spy.mock.calls[0][0] as string;
    expect(output).toContain("story-1.1");
    spy.mockRestore();
  });

  it("should handle extra data in log calls", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    logger.info("with data", { key: "value", count: 42 });
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it("should have git and claude helper methods", () => {
    expect(typeof logger.git).toBe("function");
    expect(typeof logger.claude).toBe("function");

    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    logger.git("checkout master");
    logger.claude("spawning model=opus");
    expect(spy).toHaveBeenCalledTimes(2);
    spy.mockRestore();
  });
});
