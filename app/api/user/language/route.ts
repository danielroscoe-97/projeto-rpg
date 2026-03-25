import {
  getUserLanguagePreference,
  updateUserLanguagePreference,
} from "@/lib/supabase/user";
import { NextResponse } from "next/server";

// GET: Fetch user's stored language preference (used after login to sync cookie)
export async function GET() {
  try {
    const locale = await getUserLanguagePreference();
    return NextResponse.json({ locale });
  } catch {
    return NextResponse.json({ locale: "pt-BR" });
  }
}

export async function POST(request: Request) {
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
}
