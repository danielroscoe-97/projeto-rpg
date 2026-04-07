import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

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
            // CSP — primary XSS mitigation (NFR11).
            // 'unsafe-inline' required for Tailwind/Next.js inline styles; nonce-based CSP
            // would be the ideal upgrade but requires middleware changes.
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.vercel-scripts.com https://js.stripe.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https:",
              "font-src 'self' data:",
              "connect-src 'self' https://*.supabase.co https://*.supabase.in wss://*.supabase.co wss://*.supabase.in https://*.ingest.sentry.io https://sentry.io https://*.vercel-scripts.com https://va.vercel-scripts.com https://vitals.vercel-insights.com https://api.stripe.com",
              "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "object-src 'none'",
              // upgrade-insecure-requests only in production; in dev (HTTP localhost)
              // this directive causes WebKit to upgrade static asset requests to HTTPS
              // which fails with SSL connect errors (no cert on dev server).
              ...(isDev ? [] : ["upgrade-insecure-requests"]),
            ].join("; "),
          },
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

export default withNextIntl(nextConfig);
