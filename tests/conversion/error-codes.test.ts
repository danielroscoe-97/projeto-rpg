/**
 * Tests for the conversion error-code allowlist normalizer
 * (Cluster ε — Winston #7).
 *
 * Purpose: keep analytics cardinality bounded. All `conversion:failed`
 * events route the raw server/browser error through
 * {@link normalizeConversionErrorCode} before firing `trackEvent`. Any code
 * not on the allowlist collapses to `"unknown"` so a backend that evolves
 * and starts returning dynamic codes (UUIDs, request-ids, i18n strings)
 * never explodes the metric.
 */

import {
  CONVERSION_ERROR_CODES,
  normalizeConversionErrorCode,
} from "@/lib/conversion/error-codes";

describe("normalizeConversionErrorCode", () => {
  describe("allowlisted codes pass through verbatim", () => {
    it.each([
      "invalid_input",
      "already_authenticated",
      "unauthorized",
      "internal",
      "network",
      "unknown",
      "http_400",
      "http_401",
      "http_403",
      "http_409",
      "http_429",
      "http_500",
      "rate_limited",
      "dup_id_dedupe",
      "storage_write_failed",
      "user_dismissed",
      "invalid_character_id",
      "TypeError",
    ])("%s → same string", (code) => {
      expect(normalizeConversionErrorCode(code)).toBe(code);
      expect(CONVERSION_ERROR_CODES.has(code)).toBe(true);
    });
  });

  describe("off-allowlist codes collapse to 'unknown'", () => {
    it("dynamic backend code (UUID in name) → unknown", () => {
      expect(
        normalizeConversionErrorCode(
          "internal_db_error_7a9f34d2-12b3-4a00-9ddf-c9c20201aa11",
        ),
      ).toBe("unknown");
    });

    it("i18n-ified server message → unknown", () => {
      expect(normalizeConversionErrorCode("Erro interno do servidor")).toBe(
        "unknown",
      );
    });

    it("unknown HTTP bucket (eg. http_418 not allowlisted) → unknown", () => {
      // http_418 not on the list (no one's deliberately tracking teapots)
      expect(normalizeConversionErrorCode("http_418")).toBe("unknown");
    });

    it("`HTTP 500` legacy string (space form) → unknown; only `http_500` is allowlisted", () => {
      expect(normalizeConversionErrorCode("HTTP 500")).toBe("unknown");
    });

    it("an ad-hoc Error subclass name → unknown", () => {
      expect(normalizeConversionErrorCode("MySupabaseCustomError")).toBe(
        "unknown",
      );
    });
  });

  describe("edge inputs", () => {
    it("undefined → unknown", () => {
      expect(normalizeConversionErrorCode(undefined)).toBe("unknown");
    });

    it("null → unknown", () => {
      expect(normalizeConversionErrorCode(null)).toBe("unknown");
    });

    it("empty string → unknown", () => {
      expect(normalizeConversionErrorCode("")).toBe("unknown");
    });

    it("allows `unknown` to idempotently normalize", () => {
      expect(normalizeConversionErrorCode("unknown")).toBe("unknown");
    });
  });
});
