import nextConfig from "./next.config";

describe("next.config — headers()", () => {
  it("exports a headers() function", () => {
    expect(typeof nextConfig.headers).toBe("function");
  });

  it("returns Cache-Control: immutable for /srd/:path*", async () => {
    const headers = await nextConfig.headers!();

    const srdRule = headers.find((rule) => rule.source === "/srd/:path*");
    if (!srdRule) throw new Error("No SRD header rule found in next.config headers()");

    const cacheHeader = srdRule.headers.find((h) => h.key === "Cache-Control");
    if (!cacheHeader) throw new Error("No Cache-Control header found in SRD rule");

    expect(cacheHeader.value).toBe("public, max-age=31536000, immutable");
  });

  it("includes security headers on all routes", async () => {
    const headers = await nextConfig.headers!();

    const globalRule = headers.find((rule) => rule.source === "/(.*)");
    expect(globalRule).toBeDefined();

    const headerKeys = globalRule!.headers.map((h) => h.key);
    expect(headerKeys).toContain("Strict-Transport-Security");
    expect(headerKeys).toContain("X-Content-Type-Options");
    expect(headerKeys).toContain("X-Frame-Options");
    expect(headerKeys).toContain("Referrer-Policy");
    expect(headerKeys).toContain("Permissions-Policy");
  });
});
