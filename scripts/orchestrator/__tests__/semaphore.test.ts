import { describe, it, expect } from "vitest";
import { Semaphore, Mutex } from "../semaphore.js";

describe("Semaphore", () => {
  it("should allow up to max concurrent acquisitions", async () => {
    const sem = new Semaphore(3);
    expect(sem.available).toBe(3);
    expect(sem.running).toBe(0);

    await sem.acquire();
    await sem.acquire();
    await sem.acquire();

    expect(sem.running).toBe(3);
    expect(sem.available).toBe(0);
  });

  it("should queue when max is reached", async () => {
    const sem = new Semaphore(1);
    await sem.acquire();

    let acquired = false;
    const pending = sem.acquire().then(() => { acquired = true; });

    // Should not have acquired yet
    await new Promise((r) => setTimeout(r, 10));
    expect(acquired).toBe(false);
    expect(sem.waiting).toBe(1);

    sem.release();
    await pending;
    expect(acquired).toBe(true);
  });

  it("should timeout on acquire if slot not available", async () => {
    const sem = new Semaphore(1);
    await sem.acquire();

    await expect(sem.acquire(50)).rejects.toThrow("timed out");
  });

  it("should run functions with acquire/release lifecycle", async () => {
    const sem = new Semaphore(2);
    const results: number[] = [];

    const tasks = [1, 2, 3, 4].map((n) =>
      sem.run(async () => {
        results.push(n);
        await new Promise((r) => setTimeout(r, 10));
        return n * 2;
      })
    );

    const outputs = await Promise.all(tasks);
    expect(outputs).toEqual([2, 4, 6, 8]);
    expect(results).toHaveLength(4);
  });

  it("should release slot even if function throws", async () => {
    const sem = new Semaphore(1);

    await expect(
      sem.run(async () => { throw new Error("boom"); })
    ).rejects.toThrow("boom");

    // Should be able to acquire again
    expect(sem.available).toBe(1);
  });

  it("should simulate concurrent story execution", async () => {
    const sem = new Semaphore(2);
    const running: string[] = [];
    const maxConcurrent: number[] = [];

    const runStory = (id: string) =>
      sem.run(async () => {
        running.push(id);
        maxConcurrent.push(running.length);
        await new Promise((r) => setTimeout(r, 20));
        running.splice(running.indexOf(id), 1);
      });

    await Promise.all([
      runStory("a0-1"),
      runStory("a0-2"),
      runStory("b1-1"),
      runStory("b1-2"),
    ]);

    // Never more than 2 running at once
    expect(Math.max(...maxConcurrent)).toBeLessThanOrEqual(2);
  });

  it("should reject max < 1", () => {
    expect(() => new Semaphore(0)).toThrow("max must be >= 1");
    expect(() => new Semaphore(-1)).toThrow("max must be >= 1");
  });
});

describe("Mutex", () => {
  it("should serialize access", async () => {
    const mutex = new Mutex();
    const order: number[] = [];

    const task = (n: number) =>
      mutex.run(async () => {
        order.push(n);
        await new Promise((r) => setTimeout(r, 10));
      });

    await Promise.all([task(1), task(2), task(3)]);
    // All executed in order since Mutex is Semaphore(1)
    expect(order).toEqual([1, 2, 3]);
  });
});
