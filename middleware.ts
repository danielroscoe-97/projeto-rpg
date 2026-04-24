import { locales, defaultLocale, type Locale } from "./i18n/config";
import { updateSession } from "@/lib/supabase/proxy";
import { type NextRequest, NextRequest as NR } from "next/server";

// ---------------------------------------------------------------------------
// CSP with per-request nonce (NFR11)
// ---------------------------------------------------------------------------
// 'nonce-xxx'       → replaces 'unsafe-inline' for scripts — only nonced scripts execute.
// 'strict-dynamic'  → scripts loaded by a nonced script are automatically trusted
//                     (needed for Next.js chunk loading). Ignores 'self' + URL allowlists
//                     in modern browsers — those are kept only as CSP L1/L2 fallbacks.
// 'unsafe-inline'   → CSP Level 1 fallback: ignored by browsers that see a nonce.
// https:            → CSP Level 2 fallback: ignored by browsers that support strict-dynamic.
// style-src keeps 'unsafe-inline' because Tailwind/next-themes inject inline styles
// that cannot practically be nonced.
// ---------------------------------------------------------------------------
function buildCsp(nonce: string): string {
  const isDev = process.env.NODE_ENV !== "production";
  return [
    "default-src 'self'",
    // `blob:` in script-src is required because webkit (mobile-safari / iOS
    // Safari) falls through to script-src when resolving Worker blob URLs —
    // it does not honor `worker-src 'self' blob:` the way Chromium does. Beta
    // #4 R1 enabled `worker: true` on the Supabase realtime client
    // (lib/supabase/client.ts), which creates a blob-URL worker; without
    // `blob:` here every webkit auth attempt crashed with "Refused to execute
    // a script because it does not appear in the script-src directive",
    // breaking 12 mobile-safari e2e specs (login + combat + journeys) on
    // 2026-04-24.
    `script-src 'nonce-${nonce}' 'strict-dynamic' 'unsafe-eval' 'unsafe-inline' blob: https:`,
    "worker-src 'self' blob:",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://*.supabase.co https://*.supabase.in wss://*.supabase.co wss://*.supabase.in https://*.ingest.sentry.io https://*.ingest.us.sentry.io https://sentry.io https://*.vercel-scripts.com https://va.vercel-scripts.com https://vitals.vercel-insights.com https://api.stripe.com",
    "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

export async function middleware(request: NextRequest) {
  // Generate a unique nonce per request for CSP script-src
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = buildCsp(nonce);

  // Inject nonce + CSP into request headers so Next.js can auto-apply
  // the nonce to its own inline hydration/router scripts during SSR.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);
  const nonceRequest = new NR(request, { headers: requestHeaders });

  // Run Supabase session refresh + auth guards
  const response = await updateSession(nonceRequest);

  // Set CSP on response for browser enforcement
  response.headers.set("Content-Security-Policy", csp);

  // If no NEXT_LOCALE cookie, detect from Accept-Language and set it
  if (!request.cookies.get("NEXT_LOCALE")?.value) {
    const acceptLang = request.headers.get("accept-language") || "";
    const langs = acceptLang
      .split(",")
      .map((part) => part.split(";")[0].trim());

    // Match exact ("pt-BR") or prefix ("pt" → "pt-BR")
    const detected = langs.find((lang) => locales.includes(lang as Locale))
      ?? langs
        .map((lang) => locales.find((l) => l.startsWith(lang + "-") || l === lang))
        .find(Boolean);

    const locale = detected || defaultLocale;
    response.cookies.set("NEXT_LOCALE", locale, {
      path: "/",
      maxAge: 31536000,
      sameSite: "lax",
    });
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)"],
};
