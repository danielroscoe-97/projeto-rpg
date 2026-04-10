import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getUserLanguagePreference } from "@/lib/supabase/user";
import { sendWelcomeEmail } from "@/lib/notifications/welcome-email";
import { trackServerEvent } from "@/lib/analytics/track-server";
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
  const rawNext = searchParams.get("next") ?? "/app/dashboard";
  // A1: Prevent open redirect — only allow relative paths
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/app/dashboard";

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

  // Fire-and-forget welcome email for new signups (dedup via welcome_email_sent flag)
  async function maybeSendWelcomeEmail(): Promise<void> {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser?.email) return;

      const service = createServiceClient();
      const { data: onboarding } = await service
        .from("user_onboarding")
        .select("welcome_email_sent")
        .eq("user_id", authUser.id)
        .single();

      if (onboarding?.welcome_email_sent) return;

      const { data: profile } = await service
        .from("users")
        .select("display_name")
        .eq("id", authUser.id)
        .single();

      const sent = await sendWelcomeEmail({
        email: authUser.email,
        displayName: profile?.display_name ?? authUser.email.split("@")[0],
      });

      if (sent) {
        await service
          .from("user_onboarding")
          .update({ welcome_email_sent: true })
          .eq("user_id", authUser.id);

        trackServerEvent("email:welcome_sent", {
          userId: authUser.id,
        });
      }
    } catch {
      // Welcome email failure must never block auth flow
    }
  }

  // Determine redirect: new signups go to onboarding, otherwise to specified next
  async function getRedirectTarget(): Promise<string> {
    // If join_code param present, redirect back to join flow
    const joinCode = searchParams.get("join_code");
    if (joinCode && /^[A-Z2-9]{8}$/.test(joinCode)) {
      return `/join-campaign/${joinCode}`;
    }
    // If invite params present, go straight to invite page (user is now authenticated)
    const invite = searchParams.get("invite");
    if (invite && /^[a-f0-9-]{36}$/i.test(invite)) {
      return `/invite/${invite}`;
    }
    // P2-05: post-combat campaign join — skip onboarding, go to dashboard
    // where the pendingCampaignJoin localStorage entry will be consumed.
    const context = searchParams.get("context");
    if (context === "campaign_join") {
      return "/app/dashboard?welcome=1";
    }
    // Check if user has an active session token (mid-combat signup) — send them back to combat
    // CR-1: Query by token value (not anon_user_id) since Supabase assigns a new user ID on signup
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      // CR-2: Validate join_token against DB (not just regex) to prevent session fixation
      const joinToken = searchParams.get("join_token");
      if (joinToken) {
        const service = createServiceClient();
        const { data: validToken } = await service
          .from("session_tokens")
          .select("token")
          .eq("token", joinToken)
          .eq("is_active", true)
          .maybeSingle();

        if (validToken?.token) {
          return `/join/${validToken.token}`;
        }
      }

      // CR-1: Also check by anon_user_id as fallback for same-device reconnect
      const service = createServiceClient();
      const { data: activeToken, error: tokenError } = await service
        .from("session_tokens")
        .select("token")
        .eq("anon_user_id", user.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      // CR-6: Only redirect if query succeeded (not on DB error)
      if (!tokenError && activeToken?.token) {
        return `/join/${activeToken.token}`;
      }

      // Check if user has campaigns — if not, go to onboarding
      const { count } = await supabase.from("campaigns").select("id", { count: "exact", head: true }).eq("owner_id", user.id);
      if (count === 0) {
        return "/app/onboarding";
      }
    }
    // Add welcome loading screen for dashboard redirects
    const target = next.startsWith("/app/dashboard") ? "/app/dashboard?welcome=1" : next;
    return target;
  }

  // PKCE flow: Supabase redirects with ?code=... after email verification
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      await saveRoleFromParams();
      await updateOnboardingSource();
      void maybeSendWelcomeEmail();
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
      void maybeSendWelcomeEmail();
      const target = await getRedirectTarget();
      await syncLocaleAndRedirect(target);
    } else {
      redirect(`/auth/error?error=${encodeURIComponent(error.message)}`);
    }
  }

  // No valid parameters found
  redirect(`/auth/error?error=${encodeURIComponent("No token hash or type")}`);
}
