import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo/site-url";

const BASE_URL = SITE_URL;

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/app/",
          "/admin/",
          "/auth/",
          "/api/",
          "/join/",
          "/invite/",
          "/try/combat/",
          "/r/",
          "/srd/",
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}
