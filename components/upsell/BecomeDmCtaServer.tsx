/**
 * BecomeDmCtaServer — Epic 04 Story 04-E, Área 1.
 *
 * RSC wrapper around `BecomeDmCta` (client). Owns the server-side gate:
 * calls `shouldShowDmCta(userId)` and short-circuits to `null` when the
 * decision is "hidden" (role=dm, already_dm, below_threshold, error).
 *
 * Streamed behind a Suspense boundary in `app/app/dashboard/page.tsx` so
 * the dashboard's first paint isn't blocked on the sessions-played lookup.
 * Fallback is `null` — the CTA is ambient, not critical UI; a late resolve
 * slotting in a card 200ms after first paint is acceptable and the
 * skeleton-less pattern matches the conversion CTAs.
 *
 * Parity with CLAUDE.md §Combat Parity: this component is dashboard-only
 * (auth gate upstream in `/app`). Guest (`/try`) and anon (`/join`) flows
 * never render a dashboard, so the CTA never reaches those modes.
 */

import { getAuthUser } from "@/lib/supabase/server";
import { shouldShowDmCta } from "@/lib/upsell/should-show-dm-cta";
import type { UserRole } from "@/lib/stores/role-store";
import { BecomeDmCta } from "./BecomeDmCta";

export type BecomeDmCtaServerProps = {
  /** Caller's role — required to select the copy variant. Pulled from
   *  the dashboard page's existing `users.role` query so we don't duplicate
   *  it here. The server gate double-checks role internally (role='dm'
   *  short-circuits), so passing it as a prop is purely a copy-variant
   *  hint, not a trust boundary. */
  userRole: UserRole;
};

export async function BecomeDmCtaServer({ userRole }: BecomeDmCtaServerProps) {
  // Server gate short-circuits role='dm' before running any sessions query,
  // so we can too.
  if (userRole === "dm") return null;

  // Adversarial-review fix: any throw from `getAuthUser()` (cookie decode
  // errors, transient Supabase outages) would bubble through this RSC
  // and the dashboard's Suspense boundary would surface an error state
  // instead of silently hiding the CTA. Defensive try/catch keeps the
  // dashboard resilient: when the upsell signal is unreachable, we
  // simply don't show the card. `shouldShowDmCta` itself returns
  // `{ reason: "error", show: false }` on internal failure, but the
  // two awaits here are external boundaries worth hardening.
  try {
    const user = await getAuthUser();
    if (!user) return null;

    const decision = await shouldShowDmCta(user.id);
    if (!decision.show) return null;

    // `userRole` is narrowed to "player" | "both" by the short-circuit above.
    return (
      <BecomeDmCta role={userRole} sessionsPlayed={decision.sessionsPlayed} />
    );
  } catch {
    return null;
  }
}
