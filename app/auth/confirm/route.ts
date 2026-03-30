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

  // Save role from signup form if provided
  async function saveRoleFromParams(): Promise<void> {
    const role = searchParams.get("role");
    if (!role || !["player", "dm", "both"].includes(role)) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from("users")
      .update({ role })
      .eq("id", user.id);
  }

  // Update onboarding source from ?from= param (e.g. guest-combat → 'guest_combat')
  async function updateOnboardingSource(): Promise<void> {
    const from = searchParams.get("from");
    if (!from) return;
    const sourceMap: Record<string, string> = {
      "guest-combat": "guest_combat",
      "guest-browse": "guest_browse",
    };
    const source = sourceMap[from];
    if (!source) return;
    // Reuse authenticated user from outer scope (session already exchanged)
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return;
    await supabase
      .from("user_onboarding")
      .upsert({ user_id: authUser.id, source }, { onConflict: "user_id" });
  }

  // Determine redirect: new signups go to onboarding, otherwise to specified next
  async function getRedirectTarget(): Promise<string> {
    // If invite params present, preserve them
    const invite = searchParams.get("invite");
    const campaign = searchParams.get("campaign");
    if (invite && campaign) {
      return `/auth/sign-up?invite=${invite}&campaign=${campaign}`;
    }
    // Check if user has campaigns — if not, go to onboarding
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { count } = await supabase.from("campaigns").select("id", { count: "exact", head: true }).eq("owner_id", user.id);
      if (count === 0) {
        return "/app/onboarding";
      }
    }
    return next;
  }

  // PKCE flow: Supabase redirects with ?code=... after email verification
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      await saveRoleFromParams();
      await updateOnboardingSource();
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
      await saveRoleFromParams();
      await updateOnboardingSource();
      const target = await getRedirectTarget();
      await syncLocaleAndRedirect(target);
    } else {
      redirect(`/auth/error?error=${encodeURIComponent(error.message)}`);
    }
  }

  // No valid parameters found
  redirect(`/auth/error?error=${encodeURIComponent("No token hash or type")}`);
}
