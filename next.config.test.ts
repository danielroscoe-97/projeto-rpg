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

  it("does not add catch-all headers to non-SRD routes", async () => {
    const headers = await nextConfig.headers!();

    // Verify no header rule uses a wildcard that would accidentally cover all routes.
    // Individual route-specific rules (e.g., /api/*) are allowed in future stories.
    const catchAllRule = headers.find(
      (rule) => rule.source === "/(.*)" || rule.source === "/:path*"
    );
    expect(catchAllRule).toBeUndefined();
  });
});
