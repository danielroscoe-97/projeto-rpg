import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock fetch globally to prevent real API calls
vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
  ok: true,
  json: () => Promise.resolve({ ok: true }),
  statusText: "OK",
}));

describe("slack", () => {
  beforeEach(() => {
    vi.mocked(fetch).mockClear();
  });

  describe("notify", () => {
    it("should call fetch or console.log depending on config", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      const consoleErrSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const { notify } = await import("../slack.js");
      await notify("Test notification message");

      // Either logged to console (slack disabled) or sent via fetch (slack enabled)
      const wasCalled = consoleSpy.mock.calls.length > 0 || vi.mocked(fetch).mock.calls.length > 0;
      expect(wasCalled).toBe(true);

      consoleSpy.mockRestore();
      consoleErrSpy.mockRestore();
    });
  });

  describe("notifyComplete", () => {
    it("should send completion data without throwing", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      const consoleErrSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const { notifyComplete } = await import("../slack.js");

      // Should not throw
      await expect(notifyComplete({
        task: "Story 1.1",
        duration: "5m 30s",
        filesChanged: 8,
        testsStatus: "Passed",
      })).resolves.toBeUndefined();

      consoleSpy.mockRestore();
      consoleErrSpy.mockRestore();
    });
  });

  describe("notifyError", () => {
    it("should send error data without throwing", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      const consoleErrSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const { notifyError } = await import("../slack.js");

      await expect(notifyError({
        task: "Story 1.1",
        message: "npm test failed",
        recoverable: true,
      })).resolves.toBeUndefined();

      consoleSpy.mockRestore();
      consoleErrSpy.mockRestore();
    });
  });

  describe("notifyPRReady", () => {
    it("should send PR notification without throwing", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      const consoleErrSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const { notifyPRReady } = await import("../slack.js");

      await expect(notifyPRReady({
        number: 42,
        title: "feat(story-1.1): implement story",
        url: "https://github.com/test/repo/pull/42",
        story: "1.1",
        summary: "Implemented story 1.1",
      })).resolves.toBeUndefined();

      consoleSpy.mockRestore();
      consoleErrSpy.mockRestore();
    });
  });

  describe("notifyStatus", () => {
    it("should send status notification without throwing", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      const consoleErrSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const { notifyStatus } = await import("../slack.js");

      await expect(notifyStatus({
        mode: "story",
        currentTask: "1.1",
        progress: "5m 30s",
      })).resolves.toBeUndefined();

      consoleSpy.mockRestore();
      consoleErrSpy.mockRestore();
    });
  });

  describe("notifyEscalation", () => {
    it("should send escalation notification without throwing", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      const consoleErrSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const { notifyEscalation } = await import("../slack.js");

      await expect(notifyEscalation({
        type: "new_dependency",
        description: "Need to add lodash",
        options: ["Approve", "Deny"],
      })).resolves.toBeUndefined();

      consoleSpy.mockRestore();
      consoleErrSpy.mockRestore();
    });
  });
});
