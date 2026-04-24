import { coalesce, invalidate, invalidatePrefix, __resetForTests } from "./request-coalesce";

describe("request-coalesce", () => {
  beforeEach(() => {
    __resetForTests();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("calls producer on first miss and caches the result", async () => {
    const producer = jest.fn().mockResolvedValue({ id: "A" });
    const v1 = await coalesce("k1", 1_000, producer);
    const v2 = await coalesce("k1", 1_000, producer);

    expect(v1).toEqual({ id: "A" });
    expect(v2).toEqual({ id: "A" });
    expect(producer).toHaveBeenCalledTimes(1);
  });

  it("re-fires producer after TTL expires", async () => {
    const producer = jest
      .fn()
      .mockResolvedValueOnce({ id: "A" })
      .mockResolvedValueOnce({ id: "B" });

    const v1 = await coalesce("k1", 1_000, producer);
    expect(v1).toEqual({ id: "A" });

    jest.advanceTimersByTime(1_500);

    const v2 = await coalesce("k1", 1_000, producer);
    expect(v2).toEqual({ id: "B" });
    expect(producer).toHaveBeenCalledTimes(2);
  });

  it("invalidate() forces the next call to re-fire producer", async () => {
    const producer = jest
      .fn()
      .mockResolvedValueOnce("v1")
      .mockResolvedValueOnce("v2");

    await coalesce("k1", 60_000, producer);
    invalidate("k1");
    const v2 = await coalesce("k1", 60_000, producer);

    expect(v2).toBe("v2");
    expect(producer).toHaveBeenCalledTimes(2);
  });

  it("invalidatePrefix() clears all keys with prefix", async () => {
    const producer1 = jest.fn().mockResolvedValueOnce("a").mockResolvedValueOnce("a2");
    const producer2 = jest.fn().mockResolvedValueOnce("b").mockResolvedValueOnce("b2");
    const producer3 = jest.fn().mockResolvedValueOnce("c");

    await coalesce("ses:123:a", 60_000, producer1);
    await coalesce("ses:123:b", 60_000, producer2);
    await coalesce("tok:456:c", 60_000, producer3);

    invalidatePrefix("ses:123:");

    await coalesce("ses:123:a", 60_000, producer1);
    await coalesce("ses:123:b", 60_000, producer2);
    await coalesce("tok:456:c", 60_000, producer3);

    expect(producer1).toHaveBeenCalledTimes(2);
    expect(producer2).toHaveBeenCalledTimes(2);
    expect(producer3).toHaveBeenCalledTimes(1); // untouched
  });

  it("does not swallow producer rejections", async () => {
    const boom = new Error("db down");
    const producer = jest.fn().mockRejectedValue(boom);

    await expect(coalesce("k1", 1_000, producer)).rejects.toBe(boom);
    expect(producer).toHaveBeenCalledTimes(1);
  });
});
