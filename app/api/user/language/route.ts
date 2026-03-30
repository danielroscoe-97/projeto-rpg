import {
  getUserLanguagePreference,
  updateUserLanguagePreference,
} from "@/lib/supabase/user";
import { NextResponse } from "next/server";
import { withRateLimit } from "@/lib/rate-limit";

// GET: Fetch user's stored language preference (used after login to sync cookie)
const getHandler: Parameters<typeof withRateLimit>[0] = async function getHandler() {
  try {
    const locale = await getUserLanguagePreference();
    return NextResponse.json({ locale });
  } catch {
    return NextResponse.json({ locale: "pt-BR" });
  }
};

const postHandler: Parameters<typeof withRateLimit>[0] = async function postHandler(request) {
  try {
    const { locale } = await request.json();
    if (!locale || !["pt-BR", "en"].includes(locale)) {
      return NextResponse.json({ error: "Invalid locale" }, { status: 400 });
    }
    await updateUserLanguagePreference(locale);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to update language" },
      { status: 500 },
    );
  }
};

const rateLimitConfig = { max: 10, window: "15 m" } as const;
export const GET = withRateLimit(getHandler, rateLimitConfig);
export const POST = withRateLimit(postHandler, rateLimitConfig);
