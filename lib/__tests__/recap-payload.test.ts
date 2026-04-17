import {
  MAX_RECAP_PAYLOAD_SIZE,
  serializeRecapSafely,
} from "@/lib/combat/recap-payload";

describe("serializeRecapSafely", () => {
  const minimalRecap = {
    summary: { totalRounds: 3 },
    awards: [],
    rankings: [],
  };

  it("returns ok for a well-formed recap payload", () => {
    const result = serializeRecapSafely(minimalRecap);
    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.payload).toEqual(minimalRecap);
      expect(result.bytes).toBe(result.serialized.length);
      expect(result.bytes).toBeLessThan(MAX_RECAP_PAYLOAD_SIZE);
    }
  });

  it("rejects payloads above MAX_RECAP_PAYLOAD_SIZE with status 'too_large'", () => {
    // Build a payload just above the cap by packing a long string into a field.
    const bloat = "a".repeat(MAX_RECAP_PAYLOAD_SIZE + 10);
    const oversized = { ...minimalRecap, awards: [{ combatantName: bloat }] };
    const result = serializeRecapSafely(oversized);
    expect(result.status).toBe("too_large");
    if (result.status === "too_large") {
      expect(result.bytes).toBeGreaterThan(MAX_RECAP_PAYLOAD_SIZE);
    }
  });

  it("rejects payloads containing NULL bytes with status 'null_bytes'", () => {
    const withNull = {
      ...minimalRecap,
      encounterName: "Fight\u0000Club",
    };
    const result = serializeRecapSafely(withNull);
    expect(result.status).toBe("null_bytes");
  });

  it("rejects non-serializable payloads (circular refs) with status 'null_bytes'", () => {
    const circular: Record<string, unknown> = { ...minimalRecap };
    circular.self = circular;
    const result = serializeRecapSafely(circular);
    expect(result.status).toBe("null_bytes");
  });

  it("accepts a payload exactly at the boundary (< MAX)", () => {
    // Serialize a small recap and pad a field so serialization lands just
    // under the cap. We aim for MAX - 100 bytes to stay comfortably below.
    const target = MAX_RECAP_PAYLOAD_SIZE - 200;
    const baseLen = JSON.stringify(minimalRecap).length;
    const padLen = Math.max(target - baseLen, 0);
    const padded = { ...minimalRecap, encounterName: "x".repeat(padLen) };
    const result = serializeRecapSafely(padded);
    expect(result.status).toBe("ok");
  });

  it("treats exceeding MAX by 1 byte as too_large (off-by-one)", () => {
    const base = JSON.stringify(minimalRecap);
    const extra = MAX_RECAP_PAYLOAD_SIZE - base.length + 1;
    const oversized = { ...minimalRecap, encounterName: "y".repeat(extra + 10) };
    const result = serializeRecapSafely(oversized);
    expect(result.status).toBe("too_large");
  });
});
