import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
import createNextIntlPlugin from "next-intl/plugin";
import bundleAnalyzer from "@next/bundle-analyzer";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");
const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const isDev = process.env.NODE_ENV !== "production";

const nextConfig: NextConfig = {
  // Ensure data/srd/ JSON bundles are included in serverless function bundles.
  // readFileSync with dynamic paths isn't always traced by Vercel NFT.
  outputFileTracingIncludes: {
    "/api/srd/full/**": ["./data/srd/**/*"],
  },
  async headers() {
    return [
      {
        // Security headers for all routes (NFR11)
        source: "/(.*)",
        headers: [
          {
            // HSTS: only in production. Dev server is HTTP-only; WebKit (Safari) unlike Chrome
            // does NOT exempt localhost from HSTS and will upgrade all requests to HTTPS,
            // causing SSL connect errors that break useEffect / React hydration.
            key: "Strict-Transport-Security",
            value: isDev ? "max-age=0" : "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Content-Language",
            value: "pt-BR, en",
          },
          // CSP is set dynamically in middleware.ts with a per-request nonce (NFR11).
        ],
      },
      {
        // SRD JSON bundles — SRD-only filtered content, safe for public access.
        // Cache for 1 day (content may be regenerated). Block search indexing.
        source: "/srd/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=604800",
          },
          {
            key: "X-Robots-Tag",
            value: "noindex, nofollow",
          },
        ],
      },
      {
        // RPG art assets — pixel art icons, decorations, sprites.
        // Static assets that rarely change. Immutable CDN caching.
        source: "/art/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

export default withSentryConfig(withBundleAnalyzer(withNextIntl(nextConfig)), {
  // Suppress Sentry CLI source map upload warnings in dev
  silent: !process.env.CI,
  // Disable automatic instrumentation for specific routes (performance)
  disableLogger: true,
});
