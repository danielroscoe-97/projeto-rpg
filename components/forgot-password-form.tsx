"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";

export function ForgotPasswordForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const t = useTranslations("auth");
  const tc = useTranslations("common");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    try {
      // The url which will be included in the email. This URL needs to be configured in your redirect URLs in the Supabase dashboard at https://supabase.com/dashboard/project/_/auth/url-configuration
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/update-password`,
      });
      if (error) throw error;
      setSuccess(true);
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : tc("error_generic"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      {success ? (
        <Card className="">
          <CardHeader>
            <CardTitle className="text-2xl text-foreground">{t("check_email")}</CardTitle>
            <CardDescription className="text-muted-foreground">{t("reset_sent")}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {t("reset_sent_description")}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="">
          <CardHeader>
            <CardTitle className="text-2xl text-foreground">{t("reset_title")}</CardTitle>
            <CardDescription className="text-muted-foreground">
              {t("reset_description")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleForgotPassword}>
              <div className="flex flex-col gap-6">
                <div className="grid gap-2">
                  <Label htmlFor="email" className="text-foreground/80">{t("email_label")}</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder={t("email_placeholder")}
                    required
                    aria-required="true"
                    aria-describedby={error ? "forgot-error" : undefined}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-background border-border text-foreground placeholder:text-muted-foreground/60 min-h-[44px]"
                  />
                </div>
                {error && (
                  <p id="forgot-error" className="text-sm text-gold" role="alert" aria-live="polite">
                    {error}
                  </p>
                )}
                <Button
                  type="submit"
                  variant="gold"
                  className="w-full min-h-[44px]"
                  disabled={isLoading}
                >
                  {isLoading ? t("sending") : t("send_reset")}
                </Button>
              </div>
              <div className="mt-4 text-center text-sm text-muted-foreground">
                {t("already_have_account")}{" "}
                <Link
                  href="/auth/login"
                  className="text-gold underline underline-offset-4"
                >
                  {t("login_link")}
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
