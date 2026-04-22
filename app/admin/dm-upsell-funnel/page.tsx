import type { Metadata } from "next";
import { DmUpsellFunnelClient } from "./DmUpsellFunnelClient";

/**
 * /admin/dm-upsell-funnel — Epic 04 Sprint 2 Story 04-I (F6).
 *
 * Focused deep-link into the DM-upsell funnel. The same surface is
 * rendered inside the main `/admin` metrics dashboard as a section
 * (F7 choice b — no tab container); this route exists so PMs +
 * product can share a narrow URL when debugging a specific stage
 * without pulling the full dashboard context.
 *
 * Auth is enforced by the parent `app/admin/layout.tsx` (redirects
 * non-admin + unauthenticated users). SEO: `noindex` + `nofollow`
 * so the admin surface never reaches Google's index (matches the
 * wider `/admin/*` posture; docs/seo-architecture.md).
 */

export const metadata: Metadata = {
  title: "DM Upsell Funnel",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

export default function DmUpsellFunnelPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-4" data-testid="admin.dm-upsell-funnel-page">
      <div>
        <h1 className="text-2xl font-semibold">DM Upsell Funnel</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Player → DM conversion stages for the last 30 days. See the main
          metrics dashboard for acquisition + combat surfaces.
        </p>
      </div>
      <DmUpsellFunnelClient />
    </div>
  );
}
