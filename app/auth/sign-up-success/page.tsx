"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Page() {
  const t = useTranslations("auth");
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";
  const role = searchParams.get("role") ?? "both";
  const inviteToken = searchParams.get("invite");
  const inviteCampaignId = searchParams.get("campaign");
  const [resendStatus, setResendStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");

  const handleResend = async () => {
    if (!email) return;
    setResendStatus("loading");
    const supabase = createClient();
    let redirectUrl = `${window.location.origin}/auth/confirm?role=${encodeURIComponent(role)}`;
    if (inviteToken && inviteCampaignId) {
      redirectUrl += `&invite=${encodeURIComponent(inviteToken)}&campaign=${encodeURIComponent(inviteCampaignId)}`;
    }
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: {
        emailRedirectTo: redirectUrl,
      },
    });
    setResendStatus(error ? "error" : "sent");
  };

  return (
    <div className="flex flex-1 w-full items-center justify-center p-4 md:p-6">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl text-foreground">
                {t("signup_success_title")}
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                {t("signup_success_subtitle")}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <p className="text-sm text-muted-foreground">
                {t("signup_success_description")}
              </p>

              {/* Visual checklist */}
              <div className="space-y-2 rounded-lg bg-white/[0.04] border border-border p-4">
                <div className="flex items-center gap-3 text-sm text-foreground">
                  <span className="text-lg leading-none">📧</span>
                  <span>{t("checklist_open_email")}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-foreground">
                  <span className="text-lg leading-none">📁</span>
                  <span>{t("checklist_check_spam")}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-foreground">
                  <span className="text-lg leading-none">🔗</span>
                  <span>{t("checklist_click_link")}</span>
                </div>
              </div>

              <p className="text-xs text-muted-foreground/70 text-center">
                {t("email_delay_notice")}
              </p>

              {email && (
                <div className="flex flex-col gap-2">
                  <Button
                    className="w-full min-h-[44px] bg-gold text-surface-primary font-semibold hover:shadow-gold-glow transition-all duration-[250ms]"
                    onClick={handleResend}
                    disabled={resendStatus === "loading" || resendStatus === "sent"}
                  >
                    {resendStatus === "loading"
                      ? t("resending")
                      : resendStatus === "sent"
                      ? t("resend_success")
                      : t("resend_email")}
                  </Button>
                  {resendStatus === "error" && (
                    <p className="text-sm text-gold text-center" role="alert">
                      {t("resend_error")}
                    </p>
                  )}
                </div>
              )}

              <Link
                href="/auth/login"
                className="text-sm text-muted-foreground hover:text-gold text-center underline-offset-4 hover:underline transition-colors min-h-[44px] flex items-center justify-center"
              >
                {t("back_to_login")}
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
