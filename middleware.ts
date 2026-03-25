import { locales, defaultLocale, type Locale } from "./i18n/config";
import { updateSession } from "@/lib/supabase/proxy";
import { type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  // Run Supabase session refresh + auth guards first
  const response = await updateSession(request);

  // If no NEXT_LOCALE cookie, detect from Accept-Language and set it
  if (!request.cookies.get("NEXT_LOCALE")?.value) {
    const acceptLang = request.headers.get("accept-language") || "";
    const detected = acceptLang
      .split(",")
      .map((part) => part.split(";")[0].trim())
      .find((lang) => locales.includes(lang as Locale));

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
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
