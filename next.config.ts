import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // SRD JSON bundles are versioned by content (2014/2024 suffix) and never change in-place.
        // Serve with immutable CDN caching — satisfies NFR19.
        source: "/srd/:path*",
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

export default nextConfig;
