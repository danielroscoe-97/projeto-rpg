import { createClient } from "@/lib/supabase/server";
import { getUserLanguagePreference } from "@/lib/supabase/user";
import { type EmailOtpType } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";

async function syncLocaleAndRedirect(next: string) {
  const locale = await getUserLanguagePreference();
  const cookieStore = await cookies();
  cookieStore.set("NEXT_LOCALE", locale, {
    path: "/",
    maxAge: 31536000,
    sameSite: "lax",
  });
  redirect(next);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/app/dashboard";

  const supabase = await createClient();

  // PKCE flow: Supabase redirects with ?code=... after email verification
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      await syncLocaleAndRedirect(next);
    } else {
      redirect(`/auth/error?error=${encodeURIComponent(error.message)}`);
    }
  }

  // Legacy OTP flow: Supabase redirects with ?token_hash=...&type=...
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    });
    if (!error) {
      await syncLocaleAndRedirect(next);
    } else {
      redirect(`/auth/error?error=${encodeURIComponent(error.message)}`);
    }
  }

  // No valid parameters found
  redirect(`/auth/error?error=${encodeURIComponent("No token hash or type")}`);
}
