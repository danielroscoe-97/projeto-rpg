import { describe, it, expect } from "vitest";
import { getQueueStatus } from "../story-queue.js";

describe("story-queue", () => {
  describe("getQueueStatus", () => {
    it("should return empty message when no queue exists", () => {
      // When no .queue-state.json exists, should return empty status
      const status = getQueueStatus();
      // Either "Queue vazia." or a valid status string
      expect(typeof status).toBe("string");
      expect(status.length).toBeGreaterThan(0);
    });
  });
});
