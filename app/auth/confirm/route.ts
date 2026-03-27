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

  // Determine redirect: new signups go to role selection, otherwise to specified next
  async function getRedirectTarget(): Promise<string> {
    // If invite params present, preserve them
    const invite = searchParams.get("invite");
    const campaign = searchParams.get("campaign");
    if (invite && campaign) {
      return `/auth/sign-up?invite=${invite}&campaign=${campaign}`;
    }
    // Check if user has selected a role yet — if not, redirect to role selection
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      // New user heuristic: no campaigns created yet → show role selection
      const { count } = await supabase.from("campaigns").select("id", { count: "exact", head: true }).eq("owner_id", user.id);
      if (count === 0) {
        return "/app/onboarding/role";
      }
    }
    return next;
  }

  // PKCE flow: Supabase redirects with ?code=... after email verification
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const target = await getRedirectTarget();
      await syncLocaleAndRedirect(target);
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
      const target = await getRedirectTarget();
      await syncLocaleAndRedirect(target);
    } else {
      redirect(`/auth/error?error=${encodeURIComponent(error.message)}`);
    }
  }

  // No valid parameters found
  redirect(`/auth/error?error=${encodeURIComponent("No token hash or type")}`);
}
