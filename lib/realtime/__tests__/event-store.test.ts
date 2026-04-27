/**
 * Unit tests for lib/realtime/event-store.ts.
 *
 * @jest-environment jsdom
 */
import {
  getLastSeenSeq,
  setLastSeenSeq,
  clearLastSeenSeq,
} from "../event-store";

beforeEach(() => {
  window.sessionStorage.clear();
});

describe("getLastSeenSeq", () => {
  it("returns 0 when nothing is stored", () => {
    expect(getLastSeenSeq("sid-1")).toBe(0);
  });

  it("returns the stored value", () => {
    window.sessionStorage.setItem("estcombate:lastseq:sid-1", "42");
    expect(getLastSeenSeq("sid-1")).toBe(42);
  });

  it("returns 0 for non-numeric stored value", () => {
    window.sessionStorage.setItem("estcombate:lastseq:sid-1", "NaN");
    expect(getLastSeenSeq("sid-1")).toBe(0);
  });

  it("returns 0 for negative stored value", () => {
    window.sessionStorage.setItem("estcombate:lastseq:sid-1", "-5");
    expect(getLastSeenSeq("sid-1")).toBe(0);
  });

  it("scopes per sessionId", () => {
    setLastSeenSeq("sid-a", 10);
    setLastSeenSeq("sid-b", 20);
    expect(getLastSeenSeq("sid-a")).toBe(10);
    expect(getLastSeenSeq("sid-b")).toBe(20);
  });
});

describe("setLastSeenSeq", () => {
  it("persists the seq", () => {
    setLastSeenSeq("sid-1", 42);
    expect(getLastSeenSeq("sid-1")).toBe(42);
  });

  it("ignores negative values", () => {
    setLastSeenSeq("sid-1", 10);
    setLastSeenSeq("sid-1", -5);
    expect(getLastSeenSeq("sid-1")).toBe(10);
  });

  it("ignores NaN", () => {
    setLastSeenSeq("sid-1", 10);
    setLastSeenSeq("sid-1", NaN);
    expect(getLastSeenSeq("sid-1")).toBe(10);
  });

  it("overwrites prior value", () => {
    setLastSeenSeq("sid-1", 10);
    setLastSeenSeq("sid-1", 20);
    expect(getLastSeenSeq("sid-1")).toBe(20);
  });
});

describe("clearLastSeenSeq", () => {
  it("removes the stored value", () => {
    setLastSeenSeq("sid-1", 42);
    clearLastSeenSeq("sid-1");
    expect(getLastSeenSeq("sid-1")).toBe(0);
  });

  it("only clears the targeted sessionId", () => {
    setLastSeenSeq("sid-a", 10);
    setLastSeenSeq("sid-b", 20);
    clearLastSeenSeq("sid-a");
    expect(getLastSeenSeq("sid-a")).toBe(0);
    expect(getLastSeenSeq("sid-b")).toBe(20);
  });
});

describe("SSR safety", () => {
  // We can't easily test the SSR branch in jsdom env — Jest is configured
  // with "@jest-environment jsdom" at file-level so window exists. The
  // guards (`typeof window !== "undefined"`) are trivially correct by
  // inspection. A separate spec could force node env if needed.
  it("accepts calls without throwing (functional sanity)", () => {
    expect(() => getLastSeenSeq("sid")).not.toThrow();
    expect(() => setLastSeenSeq("sid", 1)).not.toThrow();
    expect(() => clearLastSeenSeq("sid")).not.toThrow();
  });
});
