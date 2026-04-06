import { locales, defaultLocale, type Locale } from "./i18n/config";
import { updateSession } from "@/lib/supabase/proxy";
import { type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  // Run Supabase session refresh + auth guards first
  const response = await updateSession(request);

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
