"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

function ErrorContent() {
  const t = useTranslations("auth");
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  return (
    <div className="space-y-4">
      {error ? (
        <p className="text-sm text-white/60">
          {t("error_code", { code: error })}
        </p>
      ) : (
        <p className="text-sm text-white/60">
          {t("error_unspecified")}
        </p>
      )}
      <p className="text-sm text-muted-foreground">
        {t("error_help")}
      </p>
      <Button
        asChild
        className="w-full min-h-[44px] bg-gold text-surface-primary font-semibold hover:shadow-gold-glow transition-all duration-[250ms]"
      >
        <Link href="/auth/login">
          {t("error_back_to_login")}
        </Link>
      </Button>
    </div>
  );
}

export default function Page() {
  const t = useTranslations("auth");

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <Card className="bg-[#16213e] border-white/10">
            <CardHeader>
              <CardTitle className="text-2xl text-white">
                {t("error_title")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Suspense>
                <ErrorContent />
              </Suspense>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
