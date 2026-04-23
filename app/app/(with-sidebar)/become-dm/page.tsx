export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/supabase/server";
import { listPublicTemplates } from "@/lib/upsell/templates";
import { BecomeDmWizard } from "@/components/upsell/BecomeDmWizard";

/**
 * /app/become-dm — Epic 04 Story 04-F.
 *
 * Landing page for the BecomeDmWizard. Story 04-E's CTA routes here; the
 * wizard mounts client-side and walks the user through the 5-step flow
 * (welcome → template → (name+level) → role flip → success + tour).
 *
 * Server responsibilities:
 *   - Auth gate with returnTo on failure
 *   - Fetch public campaign templates ONCE on the server so the picker
 *     renders without a spinner on first paint. Story 04-G expands this
 *     into a richer gallery; the MVP picker lives inside the wizard
 *     itself.
 */

export default async function BecomeDmPage() {
  const user = await getAuthUser();
  if (!user) redirect("/auth/login?returnTo=/app/become-dm");

  const templates = await listPublicTemplates();

  return (
    <main className="mx-auto max-w-3xl px-4" data-testid="become-dm.page">
      <BecomeDmWizard userId={user.id} templates={templates} />
    </main>
  );
}
