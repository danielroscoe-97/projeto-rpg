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
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { getAuthErrorKey } from "@/lib/auth/translate-error";

export function UpdatePasswordForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const t = useTranslations("auth");
  const tc = useTranslations("common");
  const te = useTranslations("auth_errors");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      // Update this route to redirect to an authenticated route. The user already has an active session.
      router.push("/app/dashboard");
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "";
      const key = getAuthErrorKey(msg);
      setError(key ? te(key) : tc("error_generic"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl text-foreground">{t("update_password_title")}</CardTitle>
          <CardDescription className="text-muted-foreground">
            {t("update_password_description")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleForgotPassword}>
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="password" className="text-foreground/80">{t("new_password_label")}</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder={t("new_password_placeholder")}
                  required
                  minLength={6}
                  aria-required="true"
                  aria-describedby={error ? "update-pw-error" : undefined}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-background border-border text-foreground placeholder:text-muted-foreground/60 min-h-[44px]"
                />
              </div>
              {error && (
                <p id="update-pw-error" className="text-sm text-gold" role="alert" aria-live="polite">
                  {error}
                </p>
              )}
              <Button
                type="submit"
                variant="gold"
                className="w-full min-h-[44px]"
                disabled={isLoading}
              >
                {isLoading ? t("save_password_saving") : t("save_password")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
