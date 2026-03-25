import createIntlMiddleware from "next-intl/middleware";
import { locales, defaultLocale } from "./i18n/request";
import { updateSession } from "@/lib/supabase/proxy";
import { type NextRequest } from "next/server";

const intlMiddleware = createIntlMiddleware({
  locales,
  defaultLocale,
  localePrefix: "never",
  localeDetection: true,
});

export async function middleware(request: NextRequest) {
  // Run Supabase session refresh + auth guards first
  const supabaseResponse = await updateSession(request);

  // If Supabase returned a redirect or error, use that
  if (supabaseResponse.status !== 200) {
    return supabaseResponse;
  }

  // Then run i18n middleware for locale detection
  const intlResponse = intlMiddleware(request);

  // Merge Supabase cookies into the intl response
  supabaseResponse.cookies.getAll().forEach((cookie) => {
    intlResponse.cookies.set(cookie.name, cookie.value);
  });

  return intlResponse;
}

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
