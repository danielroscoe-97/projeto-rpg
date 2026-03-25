"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
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
  const [resendStatus, setResendStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");

  const handleResend = async () => {
    if (!email) return;
    setResendStatus("loading");
    const supabase = createClient();
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/confirm`,
      },
    });
    setResendStatus(error ? "error" : "sent");
  };

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
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
              {email && (
                <div className="flex flex-col gap-2">
                  <Button
                    variant="outline"
                    className="w-full min-h-[44px]"
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
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
