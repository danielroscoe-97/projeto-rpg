import { describe, it, expect, vi, beforeEach } from "vitest";
import { readdirSync, existsSync, writeFileSync, readFileSync, unlinkSync, renameSync } from "fs";

// Mock fs for buildQueue tests
vi.mock("fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("fs")>();
  return {
    ...actual,
    readdirSync: vi.fn(actual.readdirSync),
    existsSync: vi.fn(actual.existsSync),
    writeFileSync: vi.fn(actual.writeFileSync),
    readFileSync: vi.fn(actual.readFileSync),
    unlinkSync: vi.fn(actual.unlinkSync),
    renameSync: vi.fn(actual.renameSync),
  };
});

import { getQueueStatus, isQueueRunning, buildQueue } from "../story-queue.js";

const mockReaddirSync = vi.mocked(readdirSync);
const mockExistsSync = vi.mocked(existsSync);
const mockWriteFileSync = vi.mocked(writeFileSync);
const mockReadFileSync = vi.mocked(readFileSync);
const mockUnlinkSync = vi.mocked(unlinkSync);

describe("story-queue", () => {
  describe("getQueueStatus", () => {
    it("should return empty message when no queue exists", () => {
      const status = getQueueStatus();
      expect(typeof status).toBe("string");
      expect(status.length).toBeGreaterThan(0);
    });
  });

  describe("isQueueRunning", () => {
    it("should return false when queue is not running", () => {
      expect(isQueueRunning()).toBe(false);
    });
  });

  describe("buildQueue", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("should include bmad- prefixed files in auto-discovery", () => {
      // Setup mocks for buildQueue
      mockExistsSync.mockReturnValue(false as any);
      mockReaddirSync.mockReturnValue(["bmad-feat-1.md", "a0-1.md", "other.txt", "b1-1.md"] as any);
      mockWriteFileSync.mockImplementation(() => {});
      mockReadFileSync.mockReturnValue("{}" as any);
      mockUnlinkSync.mockImplementation(() => {});

      const state = buildQueue();
      const ids = state.stories.map((s) => s.id);
      expect(ids).toContain("a0-1");
      expect(ids).toContain("b1-1");
      expect(ids).toContain("bmad-feat-1");
      expect(ids).not.toContain("other");
    });
  });
});
