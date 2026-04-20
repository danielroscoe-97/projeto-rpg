// Uses jest globals (describe, it, expect) — no import needed.

import { isE2eMode } from "@/lib/e2e/is-e2e-mode";

describe("isE2eMode — strict flag check", () => {
  const ORIGINAL = process.env.NEXT_PUBLIC_E2E_MODE;

  afterEach(() => {
    if (ORIGINAL === undefined) {
      delete process.env.NEXT_PUBLIC_E2E_MODE;
    } else {
      process.env.NEXT_PUBLIC_E2E_MODE = ORIGINAL;
    }
  });

  it("returns true ONLY when the env var is exactly 'true'", () => {
    process.env.NEXT_PUBLIC_E2E_MODE = "true";
    expect(isE2eMode()).toBe(true);
  });

  it("returns false when unset", () => {
    delete process.env.NEXT_PUBLIC_E2E_MODE;
    expect(isE2eMode()).toBe(false);
  });

  it("returns false for 'false'", () => {
    process.env.NEXT_PUBLIC_E2E_MODE = "false";
    expect(isE2eMode()).toBe(false);
  });

  it("returns false for truthy-looking values that are NOT exactly 'true'", () => {
    for (const v of ["1", "yes", "TRUE", "True", " true", "true ", "on"]) {
      process.env.NEXT_PUBLIC_E2E_MODE = v;
      expect(isE2eMode()).toBe(false);
    }
  });
});
