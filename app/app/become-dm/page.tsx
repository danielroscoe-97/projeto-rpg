export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";

/**
 * /app/become-dm — Epic 04 Story 04-E landing stub.
 *
 * The BecomeDmCta primary CTA routes here. Story 04-F replaces this page
 * with the BecomeDmWizard mount. Until then, we:
 *
 *   1. Require auth (any unauthed hit redirects to login with returnTo).
 *   2. Render a minimal landing card so a user who clicked through doesn't
 *      land on 404 / empty screen if they refresh mid-rollout.
 *
 * Rationale for a stub (vs. gating the primary button): the stub preserves
 * the analytics funnel (`dm_upsell:cta_clicked` fires on any primary click)
 * and gives E2E coverage a stable navigation target to assert against
 * before the wizard exists.
 */

export default async function BecomeDmLandingPage() {
  const user = await getAuthUser();
  if (!user) redirect("/auth/login?returnTo=/app/become-dm");
  const t = await getTranslations("dmUpsell");

  // Story 04-F will replace this page with the mounted <BecomeDmWizard />.
  // Until then, render a clean holding page so the primary CTA click lands
  // on 200 (not 404) and the back button returns to the dashboard cleanly.
  return (
    <main
      className="mx-auto max-w-xl px-4 py-12 sm:py-20"
      data-testid="become-dm.stub"
    >
      <h1 className="mb-4 text-2xl font-semibold text-gold">
        {t("wizard_title")}
      </h1>
      <p className="text-sm text-muted-foreground">
        {t("wizard_step1_body")}
      </p>
    </main>
  );
}
