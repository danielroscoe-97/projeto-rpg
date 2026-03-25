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
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

export function LoginForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const t = useTranslations("auth");
  const tc = useTranslations("common");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      // Sync language preference from DB to cookie
      try {
        const res = await fetch("/api/user/language");
        const { locale } = await res.json();
        if (locale) {
          document.cookie = `NEXT_LOCALE=${locale};path=/;max-age=31536000;SameSite=Lax`;
        }
      } catch {
        // Non-critical — middleware fallback handles locale
      }
      router.push("/app/dashboard");
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : tc("error_generic"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl text-foreground">{t("login_title")}</CardTitle>
          <CardDescription className="text-muted-foreground">
            {t("login_description")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin}>
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="email" className="text-foreground/80">{t("email_label")}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={t("email_placeholder")}
                  required
                  aria-required="true"
                  aria-describedby={error ? "login-error" : undefined}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-background border-border text-foreground placeholder:text-muted-foreground/60 min-h-[44px]"
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="password" className="text-foreground/80">{t("password_label")}</Label>
                  <Link
                    href="/auth/forgot-password"
                    className="ml-auto inline-block text-sm text-gold underline-offset-4 hover:underline min-h-[44px] inline-flex items-center"
                  >
                    {t("forgot_password")}
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  required
                  aria-required="true"
                  aria-describedby={error ? "login-error" : undefined}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-background border-border text-foreground placeholder:text-muted-foreground/60 min-h-[44px]"
                />
              </div>
              {error && (
                <p id="login-error" className="text-sm text-gold" role="alert" aria-live="polite">
                  {error}
                </p>
              )}
              <Button
                type="submit"
                variant="gold"
                className="w-full min-h-[44px]"
                disabled={isLoading}
              >
                {isLoading ? t("login_submitting") : t("login_submit")}
              </Button>
            </div>
            <div className="mt-4 text-center text-sm text-muted-foreground">
              {t("no_account")}{" "}
              <Link
                href="/auth/sign-up"
                className="text-gold underline underline-offset-4"
              >
                {t("signup_link")}
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
