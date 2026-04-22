"use client";

/**
 * BecomeDmCta — Epic 04 Story 04-E, Área 1.
 *
 * Inline `Card` rendered on the player dashboard when the server-side gate
 * (`shouldShowDmCta`) says the user is eligible AND the client-side
 * dismissal gate hasn't hushed it. Primary click navigates to the
 * BecomeDmWizard flow (Story 04-F — route currently a stub at
 * `/app/become-dm`); secondary records a dismissal.
 *
 * Visibility precedence (two gates must BOTH say "show"):
 *
 *   Server gate (`lib/upsell/should-show-dm-cta.ts`)
 *     └─ role + sessions_played + first_campaign_created_at + M12 self-heal
 *
 *   Client gate (`lib/stores/dm-upsell-dismissal.ts`)
 *     └─ localStorage record: count + cooldown (7d) + cap (3) + TTL (90d)
 *
 * We cannot render the card purely server-side because the dismissal store
 * lives in browser localStorage (SSR has no access). The parent RSC passes
 * `role` + `sessionsPlayed` so this component can pick the copy variant
 * and format the rich-text session count without a client round-trip.
 *
 * Analytics (D14 namespace `dm_upsell:*`):
 *   - `cta_shown`     — on mount, once per mount (React StrictMode's double
 *                        invoke in dev is tolerable; prod renders once).
 *   - `cta_clicked`   — on primary click.
 *   - `cta_dismissed` — on secondary click (includes post-increment
 *                        dismissalCount for funnel).
 *
 * Copy variants (i18n dmUpsell namespace, shipped in Story 04-K):
 *   - role='player' → `cta_title_player` + `cta_description_player`
 *   - role='both'   → `cta_title_both`   + `cta_description_both`
 */

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  readDismissalRecord,
  recordDismissal,
  shouldShowCta,
} from "@/lib/stores/dm-upsell-dismissal";
import { trackEvent } from "@/lib/analytics/track";

export type BecomeDmCtaProps = {
  /** Caller's role — drives the copy variant. 'dm' never reaches here
   *  because the server gate short-circuits, so the type intentionally
   *  excludes it. */
  role: "player" | "both";
  /** From `shouldShowDmCta.sessionsPlayed`. Injected into the rich-text
   *  description as `{sessionsPlayed} sessions`. */
  sessionsPlayed: number;
};

export function BecomeDmCta({ role, sessionsPlayed }: BecomeDmCtaProps) {
  const t = useTranslations("dmUpsell");
  const router = useRouter();
  const [hidden, setHidden] = useState(false);
  // Prevent double-firing `cta_shown` when React StrictMode double-invokes
  // effects in dev. Analytics-safe in prod (single render anyway).
  const shownFiredRef = useRef(false);

  // On mount: honor the dismissal gate. If hushed, self-unmount. Otherwise
  // fire `cta_shown` exactly once.
  useEffect(() => {
    if (!shouldShowCta()) {
      setHidden(true);
      return;
    }
    if (shownFiredRef.current) return;
    shownFiredRef.current = true;
    trackEvent("dm_upsell:cta_shown", { role, sessionsPlayed });
  }, [role, sessionsPlayed]);

  if (hidden) return null;

  const handlePrimary = () => {
    trackEvent("dm_upsell:cta_clicked", { role, sessionsPlayed });
    // Stub target — Story 04-F replaces this with the wizard launcher.
    // Using router.push so the back button returns to the dashboard
    // without a reload; matches the conversion CTA pattern.
    router.push("/app/become-dm");
  };

  const handleDismiss = () => {
    try {
      recordDismissal();
    } catch {
      /* swallow — UI still closes */
    }
    // Read the post-increment count for analytics. Best-effort — if storage
    // is unavailable we default to 1 (the action happened, just not
    // persisted).
    let dismissalCount = 1;
    try {
      dismissalCount = readDismissalRecord()?.count ?? 1;
    } catch {
      /* swallow */
    }
    trackEvent("dm_upsell:cta_dismissed", {
      role,
      sessionsPlayed,
      dismissalCount,
    });
    setHidden(true);
  };

  const titleKey = role === "player" ? "cta_title_player" : "cta_title_both";
  const descKey =
    role === "player" ? "cta_description_player" : "cta_description_both";

  return (
    <Card
      role="region"
      aria-labelledby="become-dm-cta-title"
      data-testid="upsell.become-dm-cta"
      className="mx-auto mt-6 w-full max-w-5xl border-gold/30 bg-gold/[0.04] sm:mt-8"
    >
      <CardHeader className="space-y-2 p-5 sm:p-6">
        <CardTitle
          id="become-dm-cta-title"
          className="text-base text-gold sm:text-lg"
        >
          {t(titleKey)}
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground/90">
          {t.rich(descKey, {
            sessionsPlayed,
            em: (chunks) => (
              <strong className="text-gold">{chunks}</strong>
            ),
          })}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-5 pt-0 sm:p-6 sm:pt-0" />
      <CardFooter className="flex flex-col gap-2 p-5 pt-0 sm:flex-row sm:justify-end sm:p-6 sm:pt-0">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          data-testid="upsell.become-dm-cta.dismiss"
          aria-label={t("cta_dismiss")}
          onClick={handleDismiss}
          className="min-h-[40px]"
        >
          {t("cta_dismiss")}
        </Button>
        <Button
          type="button"
          variant="gold"
          size="sm"
          data-testid="upsell.become-dm-cta.primary"
          onClick={handlePrimary}
          className="min-h-[40px]"
        >
          {t("cta_primary")}
        </Button>
      </CardFooter>
    </Card>
  );
}
