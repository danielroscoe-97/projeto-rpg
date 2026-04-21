"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";

/**
 * Client-side auto-redirect used by /join-campaign/[code]/page.tsx when the
 * authenticated user is already a campaign_members row for that invite.
 *
 * Why not `redirect("/app/dashboard")` directly in the server component?
 * Because the page is re-rendered as part of every server action response
 * for this route, and throwing `NEXT_REDIRECT` from inside that post-action
 * re-render stream is the exact failure mode that logged "An error occurred
 * in the Server Components render" (Sentry: 0696f2bacc... / 7ad26bac... /
 * b4f11144...). Returning a plain client component keeps the server render
 * purely declarative — no throws during re-render — and the client handles
 * navigation via `router.replace`, which is unaffected by the bug.
 *
 * Falls back to a visible link if JavaScript is disabled.
 */
export function AlreadyMemberRedirect() {
  const router = useRouter();
  const t = useTranslations("joinCampaign");

  useEffect(() => {
    router.replace("/app/dashboard");
  }, [router]);

  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <div className="text-center space-y-4 max-w-sm">
        <h1 className="text-foreground text-xl font-semibold">
          {t("already_member_title")}
        </h1>
        <p className="text-muted-foreground text-sm">
          {t("already_member_body")}
        </p>
        <Link
          href="/app/dashboard"
          className="inline-block text-gold hover:underline text-sm"
        >
          {t("already_member_cta")}
        </Link>
      </div>
    </div>
  );
}
